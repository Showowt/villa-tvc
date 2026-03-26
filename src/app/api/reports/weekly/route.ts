// ============================================
// WEEKLY REPORTS API - SIMPLIFIED
// Generates and retrieves weekly operational reports
// ============================================

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  getWeekBounds,
  formatWeeklyReportMessage,
  calculateComparison,
  type WeeklyReport,
} from "@/lib/ops/financial";

// Generate weekly report
export async function POST() {
  try {
    const supabase = createServerClient();
    const { start: weekStart, end: weekEnd } = getWeekBounds();

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Get previous week bounds for comparison
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6);

    // Fetch daily metrics for current week
    const { data: currentMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", formatDate(weekStart))
      .lte("date", formatDate(weekEnd));

    // Fetch daily metrics for previous week
    const { data: prevWeekMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", formatDate(prevWeekStart))
      .lte("date", formatDate(prevWeekEnd));

    // Calculate totals
    const sumMetrics = (
      metrics: typeof currentMetrics,
    ): {
      room: number;
      fb: number;
      service: number;
      total: number;
      occupied: number;
      foodCost: number;
      orders: number;
    } => {
      return (metrics || []).reduce(
        (acc, m) => ({
          room: acc.room + (m.room_revenue || 0),
          fb: acc.fb + (m.fb_revenue || 0),
          service: acc.service + (m.service_revenue || 0),
          total: acc.total + (m.total_revenue || 0),
          occupied: acc.occupied + (m.occupied_villas || 0),
          foodCost: acc.foodCost + (m.food_cost || 0),
          orders: acc.orders + (m.orders_count || 0),
        }),
        {
          room: 0,
          fb: 0,
          service: 0,
          total: 0,
          occupied: 0,
          foodCost: 0,
          orders: 0,
        },
      );
    };

    const current = sumMetrics(currentMetrics);
    const prevWeek = sumMetrics(prevWeekMetrics);

    // Get staff leaderboard
    const { data: staffData } = await supabase
      .from("staff_leaderboard")
      .select("*")
      .order("weekly_points", { ascending: false })
      .limit(5);

    const staffLeaderboard = (staffData || []).map((s) => ({
      name: s.name || "Unknown",
      department: s.department || "general",
      points: s.weekly_points || 0,
      qc_score: s.avg_qc_score || 0,
    }));

    // Get checklists completed
    const { count: checklistsCompleted } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .gte("completed_at", formatDate(weekStart))
      .lte("completed_at", formatDate(weekEnd))
      .eq("status", "approved");

    // Get bookings count
    const { count: totalBookings } = await supabase
      .from("villa_bookings")
      .select("*", { count: "exact", head: true })
      .gte("check_in", formatDate(weekStart))
      .lte("check_in", formatDate(weekEnd));

    // Calculate metrics
    const availableNights = 7 * 10; // 7 days * 10 villas
    const revpar = current.room / availableNights;
    const adr = current.occupied > 0 ? current.room / current.occupied : 0;
    const occupancyPct = (current.occupied / availableNights) * 100;
    const fbMarginPct =
      current.fb > 0 ? ((current.fb - current.foodCost) / current.fb) * 100 : 0;

    // Create comparisons
    const vsLastWeek = {
      revenue: calculateComparison(current.total, prevWeek.total),
      occupancy: calculateComparison(
        current.occupied / availableNights,
        prevWeek.occupied / availableNights,
      ),
      revpar: calculateComparison(
        current.room / availableNights,
        prevWeek.room / availableNights,
      ),
    };

    // Build report object
    const report: WeeklyReport = {
      id: "",
      week_start: formatDate(weekStart),
      week_end: formatDate(weekEnd),
      total_revenue: current.total,
      room_revenue: current.room,
      fb_revenue: current.fb,
      service_revenue: current.service,
      avg_occupancy_pct: occupancyPct,
      total_guest_nights: current.occupied,
      total_bookings: totalBookings || 0,
      weekly_revpar: revpar,
      weekly_adr: adr,
      top_dishes: [],
      total_orders: current.orders,
      fb_margin_pct: fbMarginPct,
      staff_leaderboard: staffLeaderboard,
      checklists_completed: checklistsCompleted || 0,
      avg_qc_score:
        staffLeaderboard.length > 0
          ? staffLeaderboard.reduce((s, staff) => s + staff.qc_score, 0) /
            staffLeaderboard.length
          : 0,
      maintenance_issues_opened: 0,
      maintenance_issues_closed: 0,
      maintenance_pending: 0,
      vs_last_week: vsLastWeek,
      vs_last_month: {},
    };

    // Save to database using type assertion to handle schema mismatch
    const insertData = {
      week_end: report.week_end,
      week_start: report.week_start,
      total_revenue: report.total_revenue,
      room_revenue: report.room_revenue,
      fb_revenue: report.fb_revenue,
      service_revenue: report.service_revenue,
      avg_occupancy_pct: report.avg_occupancy_pct,
      total_guest_nights: report.total_guest_nights,
      total_bookings: report.total_bookings,
      weekly_revpar: report.weekly_revpar,
      weekly_adr: report.weekly_adr,
      top_dishes: report.top_dishes,
      total_orders: report.total_orders,
      fb_margin_pct: report.fb_margin_pct,
      staff_leaderboard: report.staff_leaderboard,
      checklists_completed: report.checklists_completed,
      avg_qc_score: report.avg_qc_score,
      maintenance_issues_opened: report.maintenance_issues_opened,
      maintenance_issues_closed: report.maintenance_issues_closed,
      maintenance_pending: report.maintenance_pending,
      vs_last_week: report.vs_last_week,
      vs_last_month: report.vs_last_month,
      generated_at: new Date().toISOString(),
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: savedReport, error: saveError } = await supabase
      .from("weekly_reports")
      .insert(insertData as any)
      .select()
      .single();

    if (saveError) {
      console.error("[WeeklyReport] Save error:", saveError);
      // Return the report even if save fails
    }

    // Generate WhatsApp message
    const whatsappMessage = formatWeeklyReportMessage(report);

    return NextResponse.json({
      success: true,
      report: savedReport || report,
      whatsappMessage,
    });
  } catch (error) {
    console.error("[WeeklyReport] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate report" },
      { status: 500 },
    );
  }
}

// Get latest weekly report
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: reports, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .order("week_end", { ascending: false })
      .limit(10);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ reports });
  } catch (error) {
    console.error("[WeeklyReport GET] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch reports" },
      { status: 500 },
    );
  }
}
