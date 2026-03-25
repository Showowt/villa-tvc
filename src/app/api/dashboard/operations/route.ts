import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #64 & #20: Operations metrics including cleaning time tracking
 * Loads secondary data for operations overview
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Parallel fetch of operations data
    const [
      lowStockResult,
      conversationsResult,
      checklistsResult,
      staffPerformanceResult,
    ] = await Promise.all([
      // Low stock alerts
      supabase
        .from("ingredients")
        .select("id, name, name_es, current_stock, min_stock, category")
        .eq("is_active", true)
        .not("current_stock", "is", null),

      // Today's conversations
      supabase
        .from("conversations")
        .select("id")
        .gte("started_at", `${today}T00:00:00`),

      // Week's checklists with duration for cleaning time tracking
      supabase
        .from("checklists")
        .select("id, type, villa_id, status, duration_minutes, completed_at")
        .gte("date", weekAgo)
        .not("duration_minutes", "is", null),

      // Staff tasks today
      supabase
        .from("daily_tasks")
        .select("user_id, total_count, completed_count, status, department")
        .eq("date", today),
    ]);

    const ingredients = lowStockResult.data || [];
    const todayConvos = conversationsResult.data || [];
    const checklists = checklistsResult.data || [];
    const staffPerf = staffPerformanceResult.data || [];

    // Calculate low stock items
    const lowStockItems = ingredients.filter(
      (i) =>
        i.min_stock !== null &&
        i.current_stock !== null &&
        i.current_stock < i.min_stock,
    );

    // Issue #20: Calculate average cleaning time by villa type
    const villaChecklists = checklists.filter(
      (c) => c.type && c.type.includes("villa") && c.duration_minutes,
    );

    const cleaningTimeByType: Record<
      string,
      { total: number; count: number; avg: number }
    > = {};

    for (const checklist of villaChecklists) {
      const type = checklist.type;
      if (!cleaningTimeByType[type]) {
        cleaningTimeByType[type] = { total: 0, count: 0, avg: 0 };
      }
      cleaningTimeByType[type].total += checklist.duration_minutes || 0;
      cleaningTimeByType[type].count += 1;
    }

    // Calculate averages
    for (const type in cleaningTimeByType) {
      const data = cleaningTimeByType[type];
      data.avg = data.count > 0 ? Math.round(data.total / data.count) : 0;
    }

    return NextResponse.json({
      success: true,
      alerts: {
        lowStock: lowStockItems.map((i) => ({
          id: i.id,
          name: i.name_es || i.name,
          current: i.current_stock,
          minimum: i.min_stock,
          category: i.category,
        })),
        lowStockCount: lowStockItems.length,
      },
      operations: {
        conversationsToday: todayConvos.length,
        staffTasks: staffPerf.map((s) => ({
          department: s.department,
          completed: s.completed_count,
          total: s.total_count,
          pct:
            s.total_count > 0
              ? Math.round((s.completed_count / s.total_count) * 100)
              : 0,
        })),
      },
      // Issue #20: Cleaning time metrics
      cleaningMetrics: {
        weekTotal: villaChecklists.length,
        byType: cleaningTimeByType,
        averageOverall:
          villaChecklists.length > 0
            ? Math.round(
                villaChecklists.reduce(
                  (sum, c) => sum + (c.duration_minutes || 0),
                  0,
                ) / villaChecklists.length,
              )
            : 0,
      },
    });
  } catch (error) {
    console.error("[dashboard/operations]", error);
    return NextResponse.json(
      { error: "Failed to fetch operations data" },
      { status: 500 },
    );
  }
}
