import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// SCHEDULE API - Issues #42 & #43
// CRUD for staff schedules + absence handling
// ═══════════════════════════════════════════════════════════════

// Validation schemas
const scheduleSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  shift: z.enum([
    "morning",
    "evening",
    "night",
    "split",
    "off",
    "sick",
    "vacation",
    "personal",
  ]),
  shift_start: z.string().optional(),
  shift_end: z.string().optional(),
  notes: z.string().optional(),
});

const bulkScheduleSchema = z.object({
  schedules: z.array(scheduleSchema),
  created_by: z.string().uuid().optional(),
});

const markAbsentSchema = z.object({
  user_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.enum(["sick", "vacation", "personal", "no_show"]),
  notes: z.string().optional(),
  marked_by: z.string().uuid().optional(),
  redistribute_tasks: z.boolean().default(true),
});

const copyWeekSchema = z.object({
  source_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  target_week_start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  created_by: z.string().uuid().optional(),
});

// GET - Fetch schedules for a date range
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start");
    const endDate = searchParams.get("end");
    const department = searchParams.get("department");
    const userId = searchParams.get("user_id");

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: "Se requieren fechas de inicio y fin" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Build query
    let query = supabase
      .from("staff_schedules")
      .select(
        `
        *,
        users!staff_schedules_user_id_fkey (
          id,
          name,
          department,
          phone,
          avatar_url
        ),
        marked_by:users!staff_schedules_marked_absent_by_fkey (
          name
        )
      `,
      )
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (userId) {
      query = query.eq("user_id", userId);
    }

    const { data: schedules, error } = await query;

    if (error) {
      console.error("[schedule] Error fetching schedules:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If department filter, filter in memory (join doesn't support direct filter)
    let filteredSchedules = schedules || [];
    if (department) {
      filteredSchedules = filteredSchedules.filter(
        (s) =>
          (s.users as { department?: string } | null)?.department ===
          department,
      );
    }

    // Also get all staff for the date range to show unscheduled staff
    const { data: allStaff } = await supabase
      .from("users")
      .select("id, name, department, phone, avatar_url")
      .eq("is_active", true)
      .eq("role", "staff");

    // Filter by department if specified
    const filteredStaff = department
      ? allStaff?.filter((s) => s.department === department)
      : allStaff;

    return NextResponse.json({
      success: true,
      schedules: filteredSchedules,
      staff: filteredStaff || [],
      date_range: { start: startDate, end: endDate },
    });
  } catch (error) {
    console.error("[schedule] GET error:", error);
    return NextResponse.json(
      { error: "Error al obtener horarios" },
      { status: 500 },
    );
  }
}

// POST - Create or update schedules
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;

    const supabase = createServerClient();

    switch (action) {
      // ─── Single schedule upsert ───
      case "upsert": {
        const parsed = scheduleSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.errors },
            { status: 400 },
          );
        }

        const { data: schedule, error } = await supabase
          .from("staff_schedules")
          .upsert(
            {
              user_id: parsed.data.user_id,
              date: parsed.data.date,
              shift: parsed.data.shift,
              shift_start: parsed.data.shift_start || null,
              shift_end: parsed.data.shift_end || null,
              notes: parsed.data.notes || null,
              created_by: body.created_by || null,
            },
            { onConflict: "user_id,date" },
          )
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, schedule });
      }

      // ─── Bulk schedule creation ───
      case "bulk": {
        const parsed = bulkScheduleSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.errors },
            { status: 400 },
          );
        }

        const schedulesToInsert = parsed.data.schedules.map((s) => ({
          user_id: s.user_id,
          date: s.date,
          shift: s.shift,
          shift_start: s.shift_start || null,
          shift_end: s.shift_end || null,
          notes: s.notes || null,
          created_by: parsed.data.created_by || null,
        }));

        const { data: schedules, error } = await supabase
          .from("staff_schedules")
          .upsert(schedulesToInsert, { onConflict: "user_id,date" })
          .select();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          created: schedules?.length || 0,
          schedules,
        });
      }

      // ─── Mark staff absent (Issue #43) ───
      case "mark_absent": {
        const parsed = markAbsentSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.errors },
            { status: 400 },
          );
        }

        // Update or create schedule as absent
        const { data: schedule, error: scheduleError } = await supabase
          .from("staff_schedules")
          .upsert(
            {
              user_id: parsed.data.user_id,
              date: parsed.data.date,
              shift: parsed.data.reason,
              notes: parsed.data.notes || null,
              marked_absent_at: new Date().toISOString(),
              marked_absent_by: parsed.data.marked_by || null,
              absence_reason: parsed.data.reason,
            },
            { onConflict: "user_id,date" },
          )
          .select()
          .single();

        if (scheduleError) {
          return NextResponse.json(
            { error: scheduleError.message },
            { status: 500 },
          );
        }

        // Redistribute tasks if requested
        let redistribution = null;
        if (parsed.data.redistribute_tasks) {
          const { data, error: rpcError } = await supabase.rpc(
            "redistribute_staff_tasks",
            {
              p_absent_user_id: parsed.data.user_id,
              p_date: parsed.data.date,
              p_reason: parsed.data.reason,
              p_marked_by: parsed.data.marked_by || null,
            },
          );

          if (rpcError) {
            console.error("[schedule] Redistribution error:", rpcError);
            redistribution = {
              success: false,
              error: rpcError.message,
            };
          } else {
            redistribution = data;
          }
        }

        // Get user info for notification
        const { data: user } = await supabase
          .from("users")
          .select("name, department")
          .eq("id", parsed.data.user_id)
          .single();

        return NextResponse.json({
          success: true,
          schedule,
          redistribution,
          user,
          message: `${user?.name} marcado como ${getAbsenceLabel(parsed.data.reason)}`,
        });
      }

      // ─── Copy previous week ───
      case "copy_week": {
        const parsed = copyWeekSchema.safeParse(body);
        if (!parsed.success) {
          return NextResponse.json(
            { error: "Datos invalidos", details: parsed.error.errors },
            { status: 400 },
          );
        }

        // Get source week schedules
        const sourceStart = new Date(parsed.data.source_week_start);
        const sourceEnd = new Date(sourceStart);
        sourceEnd.setDate(sourceEnd.getDate() + 6);

        const { data: sourceSchedules, error: sourceError } = await supabase
          .from("staff_schedules")
          .select("user_id, shift, shift_start, shift_end, notes")
          .gte("date", sourceStart.toISOString().split("T")[0])
          .lte("date", sourceEnd.toISOString().split("T")[0]);

        if (sourceError) {
          return NextResponse.json(
            { error: sourceError.message },
            { status: 500 },
          );
        }

        if (!sourceSchedules?.length) {
          return NextResponse.json(
            { error: "No hay horarios en la semana origen" },
            { status: 400 },
          );
        }

        // Map schedules to target week
        const targetStart = new Date(parsed.data.target_week_start);
        const daysDiff = Math.round(
          (targetStart.getTime() - sourceStart.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        const targetSchedules = sourceSchedules.map((s) => {
          const originalDate = new Date(
            sourceStart.getTime() +
              (sourceSchedules.indexOf(s) % 7) * 24 * 60 * 60 * 1000,
          );
          const targetDate = new Date(originalDate);
          targetDate.setDate(targetDate.getDate() + daysDiff);

          return {
            user_id: s.user_id,
            date: targetDate.toISOString().split("T")[0],
            shift: s.shift,
            shift_start: s.shift_start,
            shift_end: s.shift_end,
            notes: s.notes,
            created_by: parsed.data.created_by || null,
          };
        });

        const { data: created, error: createError } = await supabase
          .from("staff_schedules")
          .upsert(targetSchedules, { onConflict: "user_id,date" })
          .select();

        if (createError) {
          return NextResponse.json(
            { error: createError.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          copied: created?.length || 0,
          message: `Copiados ${created?.length || 0} horarios de semana anterior`,
        });
      }

      default:
        return NextResponse.json(
          { error: "Accion no reconocida" },
          { status: 400 },
        );
    }
  } catch (error) {
    console.error("[schedule] POST error:", error);
    return NextResponse.json(
      { error: "Error al procesar horario" },
      { status: 500 },
    );
  }
}

// DELETE - Remove a schedule entry
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const scheduleId = searchParams.get("id");
    const userId = searchParams.get("user_id");
    const date = searchParams.get("date");

    const supabase = createServerClient();

    if (scheduleId) {
      const { error } = await supabase
        .from("staff_schedules")
        .delete()
        .eq("id", scheduleId);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else if (userId && date) {
      const { error } = await supabase
        .from("staff_schedules")
        .delete()
        .eq("user_id", userId)
        .eq("date", date);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    } else {
      return NextResponse.json(
        { error: "Se requiere id o user_id+date" },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[schedule] DELETE error:", error);
    return NextResponse.json(
      { error: "Error al eliminar horario" },
      { status: 500 },
    );
  }
}

// Helper function
function getAbsenceLabel(reason: string): string {
  const labels: Record<string, string> = {
    sick: "enfermo",
    vacation: "vacaciones",
    personal: "ausencia personal",
    no_show: "no se presento",
  };
  return labels[reason] || reason;
}
