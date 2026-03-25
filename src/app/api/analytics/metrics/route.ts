import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ============================================
// TVC ANALYTICS METRICS API
// Historical metrics with period comparisons
// ============================================

export const dynamic = "force-dynamic";

interface DailyMetric {
  date: string;
  room_revenue: number;
  food_revenue: number;
  bar_revenue: number;
  service_revenue: number;
  total_revenue: number;
  rooms_occupied: number;
  rooms_available: number;
  occupancy_pct: number;
  person_nights: number;
  guests_count: number;
  revpar: number;
  adr: number;
  orders_count: number;
  avg_check: number;
  service_bookings: number;
}

interface PeriodComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePct: number;
  direction: "up" | "down" | "flat";
}

interface MetricsResponse {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    total_revenue: number;
    room_revenue: number;
    food_revenue: number;
    bar_revenue: number;
    service_revenue: number;
    orders_count: number;
    service_bookings: number;
  };
  averages: {
    occupancy_pct: number;
    revpar: number;
    adr: number;
    avg_check: number;
    daily_revenue: number;
  };
  comparison: PeriodComparison[];
  daily: DailyMetric[];
}

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Parse date range (default to last 30 days)
    const endDate =
      searchParams.get("end") || new Date().toISOString().split("T")[0];
    const startDate = searchParams.get("start") || getDateDaysAgo(endDate, 30);
    const comparePeriod = searchParams.get("compare") || "previous"; // 'previous' or 'yoy'

    // Fetch current period metrics
    const { data: currentMetrics, error: currentError } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });

    if (currentError) {
      console.error("[Metrics API] Error fetching metrics:", currentError);
      return NextResponse.json(
        { error: "Failed to fetch metrics" },
        { status: 500 },
      );
    }

    // Calculate period length
    const periodDays = getDaysBetween(startDate, endDate);

    // Get previous period dates
    const { previousStart, previousEnd } = getPreviousPeriodDates(
      startDate,
      endDate,
      comparePeriod,
    );

    // Fetch previous period metrics
    const { data: previousMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", previousStart)
      .lte("date", previousEnd)
      .order("date", { ascending: true });

    // Calculate totals
    const totals = calculateTotals(currentMetrics || []);
    const previousTotals = calculateTotals(previousMetrics || []);

    // Calculate averages
    const averages = calculateAverages(currentMetrics || []);

    // Build comparison data
    const comparison = buildComparison(totals, previousTotals, averages, {
      ...calculateAverages(previousMetrics || []),
    });

    const response: MetricsResponse = {
      period: {
        start: startDate,
        end: endDate,
        days: periodDays,
      },
      totals,
      averages,
      comparison,
      daily: (currentMetrics || []) as DailyMetric[],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Metrics API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getDateDaysAgo(fromDate: string, days: number): string {
  const date = new Date(fromDate);
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function getDaysBetween(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

function getPreviousPeriodDates(
  start: string,
  end: string,
  compareType: string,
): { previousStart: string; previousEnd: string } {
  const periodDays = getDaysBetween(start, end);

  if (compareType === "yoy") {
    // Year over year
    const startDate = new Date(start);
    const endDate = new Date(end);
    startDate.setFullYear(startDate.getFullYear() - 1);
    endDate.setFullYear(endDate.getFullYear() - 1);
    return {
      previousStart: startDate.toISOString().split("T")[0],
      previousEnd: endDate.toISOString().split("T")[0],
    };
  }

  // Default: previous period (same duration, immediately before)
  return {
    previousStart: getDateDaysAgo(start, periodDays),
    previousEnd: getDateDaysAgo(start, 1),
  };
}

function calculateTotals(metrics: DailyMetric[]): MetricsResponse["totals"] {
  return metrics.reduce(
    (acc, m) => ({
      total_revenue: acc.total_revenue + (Number(m.total_revenue) || 0),
      room_revenue: acc.room_revenue + (Number(m.room_revenue) || 0),
      food_revenue: acc.food_revenue + (Number(m.food_revenue) || 0),
      bar_revenue: acc.bar_revenue + (Number(m.bar_revenue) || 0),
      service_revenue: acc.service_revenue + (Number(m.service_revenue) || 0),
      orders_count: acc.orders_count + (Number(m.orders_count) || 0),
      service_bookings:
        acc.service_bookings + (Number(m.service_bookings) || 0),
    }),
    {
      total_revenue: 0,
      room_revenue: 0,
      food_revenue: 0,
      bar_revenue: 0,
      service_revenue: 0,
      orders_count: 0,
      service_bookings: 0,
    },
  );
}

function calculateAverages(
  metrics: DailyMetric[],
): MetricsResponse["averages"] {
  if (metrics.length === 0) {
    return {
      occupancy_pct: 0,
      revpar: 0,
      adr: 0,
      avg_check: 0,
      daily_revenue: 0,
    };
  }

  const totals = calculateTotals(metrics);
  const count = metrics.length;

  const occupancySum = metrics.reduce(
    (sum, m) => sum + (Number(m.occupancy_pct) || 0),
    0,
  );
  const revparSum = metrics.reduce(
    (sum, m) => sum + (Number(m.revpar) || 0),
    0,
  );
  const adrSum = metrics.reduce((sum, m) => sum + (Number(m.adr) || 0), 0);
  const avgCheckSum = metrics.reduce(
    (sum, m) => sum + (Number(m.avg_check) || 0),
    0,
  );

  return {
    occupancy_pct: Math.round((occupancySum / count) * 100) / 100,
    revpar: Math.round((revparSum / count) * 100) / 100,
    adr: Math.round((adrSum / count) * 100) / 100,
    avg_check: Math.round((avgCheckSum / count) * 100) / 100,
    daily_revenue: Math.round((totals.total_revenue / count) * 100) / 100,
  };
}

function buildComparison(
  currentTotals: MetricsResponse["totals"],
  previousTotals: MetricsResponse["totals"],
  currentAvg: MetricsResponse["averages"],
  previousAvg: MetricsResponse["averages"],
): PeriodComparison[] {
  const comparisons: PeriodComparison[] = [];

  const addComparison = (metric: string, current: number, previous: number) => {
    const change = current - previous;
    const changePct =
      previous > 0 ? Math.round((change / previous) * 10000) / 100 : 0;
    const direction: "up" | "down" | "flat" =
      change > 0 ? "up" : change < 0 ? "down" : "flat";

    comparisons.push({
      metric,
      current: Math.round(current * 100) / 100,
      previous: Math.round(previous * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct,
      direction,
    });
  };

  addComparison(
    "Total Revenue",
    currentTotals.total_revenue,
    previousTotals.total_revenue,
  );
  addComparison(
    "Room Revenue",
    currentTotals.room_revenue,
    previousTotals.room_revenue,
  );
  addComparison(
    "F&B Revenue",
    currentTotals.food_revenue + currentTotals.bar_revenue,
    previousTotals.food_revenue + previousTotals.bar_revenue,
  );
  addComparison(
    "Service Revenue",
    currentTotals.service_revenue,
    previousTotals.service_revenue,
  );
  addComparison(
    "Occupancy %",
    currentAvg.occupancy_pct,
    previousAvg.occupancy_pct,
  );
  addComparison("RevPAR", currentAvg.revpar, previousAvg.revpar);
  addComparison("ADR", currentAvg.adr, previousAvg.adr);
  addComparison(
    "Orders",
    currentTotals.orders_count,
    previousTotals.orders_count,
  );

  return comparisons;
}
