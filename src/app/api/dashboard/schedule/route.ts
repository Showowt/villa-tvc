import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #42 & #64: Staff Schedule - Who's working today
 * Also used for task generator to assign only on-shift staff
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Get today's schedule with user details
    const { data: schedules, error } = await supabase
      .from("staff_schedule")
      .select(
        `
        id,
        user_id,
        date,
        shift,
        shift_start,
        shift_end,
        is_day_off,
        notes,
        users!staff_schedule_user_id_fkey (
          id,
          name,
          department,
          role,
          phone
        )
      `,
      )
      .eq("date", today)
      .neq("is_day_off", true);

    if (error) {
      throw error;
    }

    // Group by department
    const byDepartment: Record<
      string,
      Array<{
        userId: string;
        name: string;
        shift: string | null;
        shiftStart: string | null;
        shiftEnd: string | null;
      }>
    > = {};

    const onShiftStaff: string[] = [];

    for (const schedule of schedules || []) {
      const user = schedule.users as {
        id: string;
        name: string;
        department: string | null;
        role: string;
      } | null;

      if (!user) continue;

      const dept = user.department || "other";
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }

      byDepartment[dept].push({
        userId: user.id,
        name: user.name,
        shift: schedule.shift,
        shiftStart: schedule.shift_start,
        shiftEnd: schedule.shift_end,
      });

      onShiftStaff.push(user.id);
    }

    // Also get staff without schedule (default to working)
    const { data: allStaff } = await supabase
      .from("users")
      .select("id, name, department, role")
      .in("role", ["staff", "manager"])
      .eq("is_active", true);

    const unscheduledStaff = (allStaff || []).filter(
      (staff) => !onShiftStaff.includes(staff.id),
    );

    return NextResponse.json({
      success: true,
      date: today,
      scheduled: {
        total: onShiftStaff.length,
        byDepartment,
        staffIds: onShiftStaff,
      },
      unscheduled: unscheduledStaff.map((s) => ({
        userId: s.id,
        name: s.name,
        department: s.department,
      })),
    });
  } catch (error) {
    console.error("[dashboard/schedule]", error);
    return NextResponse.json(
      { error: "Failed to fetch schedule" },
      { status: 500 },
    );
  }
}
