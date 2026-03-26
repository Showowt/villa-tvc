import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #64: Dashboard Lazy Loading - Staff Performance
 * This endpoint loads on scroll/tab (deferred data)
 */

export const dynamic = "force-dynamic";

interface StaffPerformance {
  userId: string;
  name: string;
  department: string | null;
  tasksCompleted: number;
  tasksTotal: number;
  completionPct: number;
  checklistsCompleted: number;
}

interface StaffResponse {
  success: boolean;
  date: string;
  performance: StaffPerformance[];
  summary: {
    totalStaff: number;
    avgCompletion: number;
    topPerformer: string | null;
  };
  lastUpdated: string;
}

export async function GET(): Promise<
  NextResponse<StaffResponse | { error: string }>
> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Parallel fetch of staff data
    const [dailyTasksResult, checklistsResult, usersResult] = await Promise.all(
      [
        // Today's daily tasks by user
        supabase
          .from("daily_tasks")
          .select("user_id, total_count, completed_count, status, department")
          .eq("date", today),

        // Today's completed checklists by user
        supabase
          .from("checklists")
          .select("completed_by, status")
          .eq("date", today)
          .in("status", ["complete", "approved"]),

        // Active staff users
        supabase
          .from("users")
          .select("id, name, department")
          .in("role", ["staff", "manager"])
          .eq("is_active", true),
      ],
    );

    const dailyTasks = dailyTasksResult.data || [];
    const checklists = checklistsResult.data || [];
    const users = usersResult.data || [];

    // Create user lookup map
    const userMap = new Map(users.map((u) => [u.id, u]));

    // Count checklists per user
    const checklistCounts = new Map<string, number>();
    for (const checklist of checklists) {
      if (checklist.completed_by) {
        const count = checklistCounts.get(checklist.completed_by) || 0;
        checklistCounts.set(checklist.completed_by, count + 1);
      }
    }

    // Build performance array - filter out tasks without user_id
    const performance: StaffPerformance[] = dailyTasks
      .filter((task) => task.user_id !== null)
      .map((task) => {
        const userId = task.user_id as string;
        const user = userMap.get(userId);
        const totalCount = task.total_count ?? 0;
        const completedCount = task.completed_count ?? 0;
        const completionPct =
          totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return {
          userId,
          name: user?.name || "Unknown",
          department: task.department || user?.department || null,
          tasksCompleted: completedCount,
          tasksTotal: totalCount,
          completionPct,
          checklistsCompleted: checklistCounts.get(userId) || 0,
        };
      });

    // Sort by completion percentage
    performance.sort((a, b) => b.completionPct - a.completionPct);

    // Calculate summary
    const avgCompletion =
      performance.length > 0
        ? Math.round(
            performance.reduce((sum, p) => sum + p.completionPct, 0) /
              performance.length,
          )
        : 0;

    const topPerformer =
      performance.length > 0 && performance[0].completionPct > 0
        ? performance[0].name
        : null;

    return NextResponse.json({
      success: true,
      date: today,
      performance,
      summary: {
        totalStaff: performance.length,
        avgCompletion,
        topPerformer,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[dashboard/staff]", error);
    return NextResponse.json(
      { error: "Failed to fetch staff performance" },
      { status: 500 },
    );
  }
}
