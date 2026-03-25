import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// MANTENIMIENTO PREVENTIVO - API
// Issue #55: Calendario de mantenimiento preventivo
// ═══════════════════════════════════════════════════════════════

// GET: Listar todas las tareas de mantenimiento recurrente
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // 'overdue', 'upcoming', 'all'
    const days = parseInt(searchParams.get("days") || "7");

    const supabase = createServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString();
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    const futureDateStr = futureDate.toISOString();

    let query = supabase
      .from("recurring_maintenance")
      .select(
        `
        *,
        villa:villas(name),
        assigned_user:users(name, department)
      `,
      )
      .eq("is_active", true)
      .order("next_due_at", { ascending: true });

    if (filter === "overdue") {
      query = query.lt("next_due_at", todayStr);
    } else if (filter === "upcoming") {
      query = query
        .gte("next_due_at", todayStr)
        .lte("next_due_at", futureDateStr);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[recurring maintenance]", error);
      return NextResponse.json(
        { error: "Error al obtener tareas", details: error.message },
        { status: 500 },
      );
    }

    // Calcular estados de vencimiento
    const tasksWithStatus = (data || []).map((task) => {
      const nextDueAt = task.next_due_at ? new Date(task.next_due_at) : null;
      const isOverdue = nextDueAt ? nextDueAt < today : false;
      const daysOverdue =
        nextDueAt && isOverdue
          ? Math.floor(
              (today.getTime() - nextDueAt.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;
      const daysUntilDue =
        nextDueAt && !isOverdue
          ? Math.floor(
              (nextDueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
            )
          : 0;

      return {
        ...task,
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        days_until_due: daysUntilDue,
      };
    });

    // Estadisticas de resumen
    const todayOnlyStr = today.toISOString().split("T")[0];
    const summary = {
      total: tasksWithStatus.length,
      overdue: tasksWithStatus.filter((t) => t.is_overdue).length,
      due_today: tasksWithStatus.filter((t) => {
        if (!t.next_due_at) return false;
        return t.next_due_at.split("T")[0] === todayOnlyStr;
      }).length,
      upcoming_7_days: tasksWithStatus.filter(
        (t) => !t.is_overdue && t.days_until_due <= 7,
      ).length,
    };

    return NextResponse.json({
      tasks: tasksWithStatus,
      summary,
    });
  } catch (error) {
    console.error("[recurring maintenance]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// POST: Completar una tarea de mantenimiento
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      task_id,
      completed_by,
      duration_minutes,
      notes,
      issues_found,
      issue_description,
      photos,
    }: {
      task_id: string;
      completed_by?: string;
      duration_minutes?: number;
      notes?: string;
      issues_found?: boolean;
      issue_description?: string;
      photos?: string[];
    } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id es requerido" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Verificar que la tarea existe
    const { data: task, error: taskError } = await supabase
      .from("recurring_maintenance")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json(
        { error: "Tarea no encontrada" },
        { status: 404 },
      );
    }

    // Registrar la completacion (el trigger actualizara next_due_at)
    const { data: completion, error: completionError } = await supabase
      .from("maintenance_completions")
      .insert({
        recurring_id: task_id,
        completed_at: new Date().toISOString(),
        completed_by: completed_by || null,
        duration_minutes: duration_minutes || null,
        notes: notes || null,
        issues_found: issues_found || false,
        issue_description: issues_found ? issue_description : null,
        photos: photos || null,
      })
      .select()
      .single();

    if (completionError) {
      console.error("[complete maintenance]", completionError);
      return NextResponse.json(
        {
          error: "Error al registrar completado",
          details: completionError.message,
        },
        { status: 500 },
      );
    }

    // Si se encontraron problemas, crear ticket de mantenimiento
    if (issues_found && issue_description) {
      try {
        await supabase.from("maintenance_issues").insert({
          title: `Problema durante: ${task.title}`,
          title_es: `Problema durante: ${task.title_es || task.title}`,
          description: issue_description,
          location: task.location,
          priority: "medium",
          status: "pending",
          reported_by: completed_by || null,
        });
      } catch (issueError) {
        console.warn("[create issue]", issueError);
        // No fallar si no se puede crear el ticket
      }
    }

    // Obtener tarea actualizada
    const { data: updatedTask } = await supabase
      .from("recurring_maintenance")
      .select("*")
      .eq("id", task_id)
      .single();

    return NextResponse.json({
      success: true,
      completion,
      next_due_at: updatedTask?.next_due_at,
      message: issues_found
        ? "Tarea completada. Se creo un ticket para los problemas encontrados."
        : "Tarea completada exitosamente",
    });
  } catch (error) {
    console.error("[complete maintenance]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// PATCH: Actualizar una tarea recurrente
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { task_id, ...updates } = body;

    if (!task_id) {
      return NextResponse.json(
        { error: "task_id es requerido" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Campos permitidos para actualizar
    const allowedFields = [
      "title",
      "title_es",
      "description",
      "description_es",
      "location",
      "villa_id",
      "frequency",
      "day_of_week",
      "day_of_month",
      "time_of_day",
      "estimated_duration_minutes",
      "assigned_to",
      "priority",
      "category",
      "is_active",
      "next_due_at",
    ];

    const sanitizedUpdates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        sanitizedUpdates[key] = value;
      }
    }

    if (Object.keys(sanitizedUpdates).length === 0) {
      return NextResponse.json(
        { error: "No hay campos validos para actualizar" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("recurring_maintenance")
      .update(sanitizedUpdates)
      .eq("id", task_id)
      .select()
      .single();

    if (error) {
      console.error("[update maintenance]", error);
      return NextResponse.json(
        { error: "Error al actualizar tarea", details: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      task: data,
    });
  } catch (error) {
    console.error("[update maintenance]", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
