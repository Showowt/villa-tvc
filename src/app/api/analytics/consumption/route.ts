// ============================================
// CONSUMPTION ANALYTICS API (Issue 70)
// Weekly analytics job for consumption patterns
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface ConsumptionPattern {
  by_nationality: Record<string, { orders: number; revenue: number }>;
  by_day_of_week: Record<string, { orders: number; revenue: number }>;
  by_hour: Record<string, { orders: number; revenue: number }>;
  by_group_size: Record<string, { orders: number; revenue: number }>;
  by_category: Record<string, { orders: number; revenue: number }>;
}

// GET /api/analytics/consumption - Get consumption analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "weekly";
    const limit = parseInt(searchParams.get("limit") || "10");

    const supabase = createServerClient() as SupabaseAny;

    // Get stored analytics
    const { data, error } = await supabase
      .from("consumption_analytics")
      .select("*")
      .eq("period_type", period)
      .order("analysis_date", { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Consumption Analytics] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

// POST /api/analytics/consumption - Generate weekly analytics
export async function POST(request: NextRequest) {
  try {
    // Verify cron secret for automated calls
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if from cron (with secret) or if no secret configured (dev)
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient() as SupabaseAny;

    // Calculate date range (last 7 days)
    const today = new Date();
    const periodEnd = today.toISOString().split("T")[0];
    const periodStart = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get orders from the period with related data
    const { data: orders, error: ordersError } = await supabase
      .from("order_logs")
      .select(
        `
        *,
        menu_items!inner(name, name_es, category),
        reservations(guest_name, guests_count, language)
      `,
      )
      .gte("order_date", periodStart)
      .lte("order_date", periodEnd);

    if (ordersError) {
      console.error("[Consumption Analytics] Orders fetch error:", ordersError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch orders" },
        { status: 500 },
      );
    }

    // Get villa bookings for nationality data
    const { data: bookings } = await supabase
      .from("villa_bookings")
      .select("*")
      .gte("check_in", periodStart)
      .lte("check_out", periodEnd);

    // Initialize patterns
    const patterns: ConsumptionPattern = {
      by_nationality: {},
      by_day_of_week: {},
      by_hour: {},
      by_group_size: {},
      by_category: {},
    };

    // Day names
    const dayNames = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];

    // Process orders
    let totalOrders = 0;
    let totalRevenue = 0;
    const uniqueGuests = new Set<string>();
    const itemCounts: Record<string, number> = {};

    for (const order of orders || []) {
      totalOrders += order.quantity || 1;
      totalRevenue += order.total_price || 0;

      // Track unique guests
      if (order.guest_name) uniqueGuests.add(order.guest_name);

      // By category
      const category = order.menu_items?.category || "unknown";
      if (!patterns.by_category[category]) {
        patterns.by_category[category] = { orders: 0, revenue: 0 };
      }
      patterns.by_category[category].orders += order.quantity || 1;
      patterns.by_category[category].revenue += order.total_price || 0;

      // By day of week
      const orderDate = new Date(order.order_date);
      const dayName = dayNames[orderDate.getDay()];
      if (!patterns.by_day_of_week[dayName]) {
        patterns.by_day_of_week[dayName] = { orders: 0, revenue: 0 };
      }
      patterns.by_day_of_week[dayName].orders += order.quantity || 1;
      patterns.by_day_of_week[dayName].revenue += order.total_price || 0;

      // By hour
      if (order.order_time) {
        const hour = order.order_time.split(":")[0];
        const hourKey = `${hour}:00`;
        if (!patterns.by_hour[hourKey]) {
          patterns.by_hour[hourKey] = { orders: 0, revenue: 0 };
        }
        patterns.by_hour[hourKey].orders += order.quantity || 1;
        patterns.by_hour[hourKey].revenue += order.total_price || 0;
      }

      // By group size (from reservation)
      if (order.reservations?.guests_count) {
        const groupKey =
          order.reservations.guests_count <= 2
            ? "1-2"
            : order.reservations.guests_count <= 4
              ? "3-4"
              : order.reservations.guests_count <= 6
                ? "5-6"
                : "7+";
        if (!patterns.by_group_size[groupKey]) {
          patterns.by_group_size[groupKey] = { orders: 0, revenue: 0 };
        }
        patterns.by_group_size[groupKey].orders += order.quantity || 1;
        patterns.by_group_size[groupKey].revenue += order.total_price || 0;
      }

      // Track item counts
      const itemName = order.menu_items?.name_es || "Unknown";
      itemCounts[itemName] =
        (itemCounts[itemName] || 0) + (order.quantity || 1);
    }

    // Process bookings for nationality
    for (const booking of bookings || []) {
      if (booking.guest_country) {
        const country = booking.guest_country;
        if (!patterns.by_nationality[country]) {
          patterns.by_nationality[country] = { orders: 0, revenue: 0 };
        }
        patterns.by_nationality[country].orders += 1;
      }
    }

    // Calculate top items
    const topItems = Object.entries(itemCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([name, count]) => ({ name, count }));

    // Generate insights
    const insights: string[] = [];

    // Peak day insight
    const peakDay = Object.entries(patterns.by_day_of_week).sort(
      ([, a], [, b]) => b.orders - a.orders,
    )[0];
    if (peakDay) {
      insights.push(
        `Peak ordering day: ${peakDay[0]} with ${peakDay[1].orders} orders`,
      );
    }

    // Peak hour insight
    const peakHour = Object.entries(patterns.by_hour).sort(
      ([, a], [, b]) => b.orders - a.orders,
    )[0];
    if (peakHour) {
      insights.push(
        `Peak ordering hour: ${peakHour[0]} with ${peakHour[1].orders} orders`,
      );
    }

    // Top category
    const topCategory = Object.entries(patterns.by_category).sort(
      ([, a], [, b]) => b.revenue - a.revenue,
    )[0];
    if (topCategory) {
      insights.push(
        `Top revenue category: ${topCategory[0]} ($${topCategory[1].revenue.toFixed(0)})`,
      );
    }

    // Store analytics
    const { data: analytics, error: insertError } = await supabase
      .from("consumption_analytics")
      .insert({
        analysis_date: today.toISOString().split("T")[0],
        period_type: "weekly",
        period_start: periodStart,
        period_end: periodEnd,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        unique_guests: uniqueGuests.size,
        by_nationality: patterns.by_nationality,
        by_day_of_week: patterns.by_day_of_week,
        by_hour: patterns.by_hour,
        by_group_size: patterns.by_group_size,
        by_category: patterns.by_category,
        top_items: topItems,
        trending_items: [],
        declining_items: [],
        insights,
        recommendations: [],
      })
      .select()
      .single();

    if (insertError) {
      console.error("[Consumption Analytics] Insert error:", insertError);
      return NextResponse.json(
        { success: false, error: "Failed to store analytics" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: analytics,
      summary: {
        period: `${periodStart} to ${periodEnd}`,
        total_orders: totalOrders,
        total_revenue: totalRevenue,
        unique_guests: uniqueGuests.size,
        insights,
      },
    });
  } catch (error) {
    console.error("[Consumption Analytics] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate analytics" },
      { status: 500 },
    );
  }
}
