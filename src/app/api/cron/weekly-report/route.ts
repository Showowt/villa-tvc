// ═══════════════════════════════════════════════════════════════
// WEEKLY REPORT CRON JOB - Issue #69
// Ejecuta cada domingo a medianoche
// Genera reporte semanal y envia a Akil via WhatsApp
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";
import {
  getWeekBounds,
  formatWeeklyReportMessage,
  calculateComparison,
  type WeeklyReport,
} from "@/lib/ops/financial";

// Verificar que es un cron job autorizado
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Si no hay secreto configurado, permitir en desarrollo
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verificar autorizacion
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const { start: weekStart, end: weekEnd } = getWeekBounds();

    // Get previous week bounds for comparison
    const prevWeekEnd = new Date(weekStart);
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1);
    const prevWeekStart = new Date(prevWeekEnd);
    prevWeekStart.setDate(prevWeekStart.getDate() - 6);

    // Get previous month bounds for comparison
    const prevMonthEnd = new Date(weekEnd);
    prevMonthEnd.setDate(prevMonthEnd.getDate() - 30);
    const prevMonthStart = new Date(prevMonthEnd);
    prevMonthStart.setDate(prevMonthStart.getDate() - 6);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

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

    // Fetch daily metrics for same week last month
    const { data: prevMonthMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", formatDate(prevMonthStart))
      .lte("date", formatDate(prevMonthEnd));

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
    const prevMonth = sumMetrics(prevMonthMetrics);

    // Get top dishes from order_logs
    const { data: topDishesData } = await supabase
      .from("order_logs")
      .select(
        `
        quantity,
        total_price,
        menu_items(name)
      `,
      )
      .gte("order_date", formatDate(weekStart))
      .lte("order_date", formatDate(weekEnd));

    // Aggregate top dishes
    const dishMap = new Map<string, { quantity: number; revenue: number }>();
    (topDishesData || []).forEach((order) => {
      const name =
        (order.menu_items as { name: string } | null)?.name || "Unknown";
      const existing = dishMap.get(name) || { quantity: 0, revenue: 0 };
      existing.quantity += order.quantity;
      existing.revenue += order.total_price;
      dishMap.set(name, existing);
    });

    const topDishes = Array.from(dishMap.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

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

    // Get maintenance issues
    const { count: maintenanceOpened } = await supabase
      .from("maintenance_issues")
      .select("*", { count: "exact", head: true })
      .gte("created_at", formatDate(weekStart));

    const { count: maintenanceClosed } = await supabase
      .from("maintenance_issues")
      .select("*", { count: "exact", head: true })
      .gte("resolved_at", formatDate(weekStart))
      .eq("status", "completed");

    const { count: maintenancePending } = await supabase
      .from("maintenance_issues")
      .select("*", { count: "exact", head: true })
      .in("status", ["pending", "in_progress"]);

    // Get bookings count
    const { count: totalBookings } = await supabase
      .from("villa_bookings")
      .select("*", { count: "exact", head: true })
      .gte("check_in", formatDate(weekStart))
      .lte("check_in", formatDate(weekEnd));

    // Get low stock alerts
    const { data: lowStockItems } = await supabase
      .from("ingredients")
      .select("name_es, current_stock, min_stock")
      .eq("is_active", true);

    const lowStockAlerts = (lowStockItems || [])
      .filter(
        (i) =>
          i.min_stock !== null &&
          i.current_stock !== null &&
          i.current_stock < i.min_stock,
      )
      .map((i) => i.name_es)
      .slice(0, 5);

    // Calculate RevPAR and ADR
    const availableNights = 7 * 10; // 7 days * 10 villas
    const revpar = current.room / availableNights;
    const adr = current.occupied > 0 ? current.room / current.occupied : 0;
    const occupancyPct = (current.occupied / availableNights) * 100;
    const fbMarginPct =
      current.fb > 0 ? ((current.fb - current.foodCost) / current.fb) * 100 : 0;

    // Create comparisons
    const vsLastWeek: Record<string, ReturnType<typeof calculateComparison>> = {
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

    const vsLastMonth: Record<
      string,
      ReturnType<typeof calculateComparison>
    > = {
      revenue: calculateComparison(current.total, prevMonth.total),
      occupancy: calculateComparison(
        current.occupied / availableNights,
        prevMonth.occupied / availableNights,
      ),
      revpar: calculateComparison(
        current.room / availableNights,
        prevMonth.room / availableNights,
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
      top_dishes: topDishes,
      total_orders: current.orders,
      fb_margin_pct: fbMarginPct,
      staff_leaderboard: staffLeaderboard,
      checklists_completed: checklistsCompleted || 0,
      avg_qc_score:
        staffLeaderboard.length > 0
          ? staffLeaderboard.reduce((s, staff) => s + staff.qc_score, 0) /
            staffLeaderboard.length
          : 0,
      maintenance_issues_opened: maintenanceOpened || 0,
      maintenance_issues_closed: maintenanceClosed || 0,
      maintenance_pending: maintenancePending || 0,
      vs_last_week: vsLastWeek,
      vs_last_month: vsLastMonth,
    };

    // Save to database
    const { data: savedReport, error: saveError } = await supabase
      .from("weekly_reports")
      .insert({
        week_start: report.week_start,
        week_end: report.week_end,
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
      })
      .select()
      .single();

    if (saveError) {
      console.error("[WeeklyReport Cron] Save error:", saveError);
      return NextResponse.json(
        { error: "Error al guardar reporte" },
        { status: 500 },
      );
    }

    // Generate WhatsApp message
    let whatsappMessage = formatWeeklyReportMessage(report);

    // Add low stock alerts if any
    if (lowStockAlerts.length > 0) {
      whatsappMessage += `\n\n*Alertas Bajo Stock*\n${lowStockAlerts.map((item) => `- ${item}`).join("\n")}`;
    }

    // Send to Akil via WhatsApp
    const akilPhone = process.env.TVC_OWNER_WHATSAPP;
    let whatsappResult = { success: false, error: "No phone configured" };

    if (akilPhone) {
      whatsappResult = await sendWhatsAppMessage(akilPhone, whatsappMessage);
      console.log(
        `[WeeklyReport Cron] WhatsApp sent to ${akilPhone}:`,
        whatsappResult,
      );
    } else {
      console.warn(
        "[WeeklyReport Cron] TVC_OWNER_WHATSAPP not configured, skipping notification",
      );
    }

    // Log the cron execution
    await supabase.from("audit_log").insert({
      action: "weekly_report_generated",
      entity_type: "weekly_report",
      entity_id: savedReport?.id,
      details: {
        week_start: report.week_start,
        week_end: report.week_end,
        total_revenue: report.total_revenue,
        whatsapp_sent: whatsappResult.success,
        whatsapp_error: whatsappResult.error,
        low_stock_count: lowStockAlerts.length,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Reporte semanal generado y enviado",
      report: {
        id: savedReport?.id,
        week_start: report.week_start,
        week_end: report.week_end,
        total_revenue: report.total_revenue,
      },
      whatsapp: {
        sent: whatsappResult.success,
        recipient: akilPhone ? "****" + akilPhone.slice(-4) : null,
      },
      low_stock_alerts: lowStockAlerts,
    });
  } catch (error) {
    console.error("[WeeklyReport Cron] Error:", error);
    return NextResponse.json(
      { error: "Error al generar reporte semanal" },
      { status: 500 },
    );
  }
}

// Tambien permitir POST para pruebas manuales
export async function POST(request: NextRequest) {
  return GET(request);
}
