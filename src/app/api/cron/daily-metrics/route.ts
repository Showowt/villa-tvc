import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ============================================
// TVC DAILY METRICS CRON
// Runs at midnight to snapshot metrics
// Called by Vercel Cron or external scheduler
// ============================================

export const dynamic = "force-dynamic";
export const maxDuration = 30; // Allow up to 30 seconds

// Food categories for revenue classification
const FOOD_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"];
// Bar categories for revenue classification
const BAR_CATEGORIES = [
  "cocktail",
  "mocktail",
  "beer",
  "wine",
  "spirit",
  "soft_drink",
];

// TVC has 6 villas
const TOTAL_ROOMS = 6;

interface MetricsSnapshot {
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
  snapshot_type: "auto" | "manual";
}

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Allow specifying a date (for backfills), default to yesterday
    const dateParam = searchParams.get("date");
    const targetDate = dateParam || getYesterday();

    // Verify cron secret if provided
    const cronSecret = request.headers.get("x-cron-secret");
    const expectedSecret = process.env.CRON_SECRET;

    if (expectedSecret && cronSecret !== expectedSecret) {
      console.warn("[Daily Metrics] Invalid cron secret");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log(`[Daily Metrics] Calculating metrics for ${targetDate}`);

    // Calculate metrics
    const metrics = await calculateMetrics(supabase, targetDate);

    // Upsert into daily_metrics table
    const { data, error } = await supabase
      .from("daily_metrics")
      .upsert(metrics, { onConflict: "date" })
      .select()
      .single();

    if (error) {
      console.error("[Daily Metrics] Error saving metrics:", error);
      return NextResponse.json(
        { error: "Failed to save metrics", details: error.message },
        { status: 500 },
      );
    }

    console.log("[Daily Metrics] Snapshot saved:", {
      date: targetDate,
      total_revenue: metrics.total_revenue,
      occupancy_pct: metrics.occupancy_pct,
      revpar: metrics.revpar,
    });

    return NextResponse.json({
      success: true,
      date: targetDate,
      metrics: data,
    });
  } catch (error) {
    console.error("[Daily Metrics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST for manual triggers
export async function POST(request: Request) {
  try {
    const supabase = createServerClient();
    const body = await request.json();
    const targetDate = body.date || getYesterday();

    console.log(`[Daily Metrics] Manual snapshot for ${targetDate}`);

    const metrics = await calculateMetrics(supabase, targetDate);
    metrics.snapshot_type = "manual";

    const { data, error } = await supabase
      .from("daily_metrics")
      .upsert(metrics, { onConflict: "date" })
      .select()
      .single();

    if (error) {
      console.error("[Daily Metrics] Error:", error);
      return NextResponse.json(
        { error: "Failed to save metrics" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, metrics: data });
  } catch (error) {
    console.error("[Daily Metrics] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

function getYesterday(): string {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
}

async function calculateMetrics(
  supabase: ReturnType<typeof createServerClient>,
  targetDate: string,
): Promise<MetricsSnapshot> {
  // 1. Get occupancy data
  const { data: occupancy } = await supabase
    .from("daily_occupancy")
    .select("guests_count, person_nights, villas_occupied")
    .eq("date", targetDate)
    .single();

  const guestsCount = occupancy?.guests_count || 0;
  const personNights = occupancy?.person_nights || 0;
  const villasOccupied = occupancy?.villas_occupied as unknown[];
  const roomsOccupied = Array.isArray(villasOccupied)
    ? villasOccupied.length
    : 0;

  // 2. Calculate room revenue from reservations
  // For simplicity, we attribute full booking amount on check-in date
  const { data: reservations } = await supabase
    .from("reservations")
    .select("total_amount")
    .eq("check_in", targetDate)
    .in("status", ["confirmed", "checked_in", "checked_out"]);

  const roomRevenue =
    reservations?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) ||
    0;

  // 3. Get F&B orders
  const { data: orders } = await supabase
    .from("order_logs")
    .select(
      `
      quantity,
      total_price,
      menu_items:menu_item_id (
        category
      )
    `,
    )
    .eq("order_date", targetDate);

  let foodRevenue = 0;
  let barRevenue = 0;
  let ordersCount = 0;

  if (orders) {
    ordersCount = orders.length;
    for (const order of orders) {
      const menuItem = order.menu_items as unknown as {
        category: string;
      } | null;
      const price = Number(order.total_price) || 0;
      const category = menuItem?.category || "";

      if (FOOD_CATEGORIES.includes(category)) {
        foodRevenue += price;
      } else if (BAR_CATEGORIES.includes(category)) {
        barRevenue += price;
      }
    }
  }

  // 4. Get service bookings (if table exists)
  let serviceRevenue = 0;
  let serviceBookings = 0;

  try {
    const { data: services } = await supabase
      .from("service_bookings")
      .select(
        `
        services:service_id (
          price
        )
      `,
      )
      .eq("booking_date", targetDate)
      .in("status", ["confirmed", "completed"]);

    if (services) {
      serviceBookings = services.length;
      for (const booking of services) {
        const svc = booking.services as unknown as { price: number } | null;
        serviceRevenue += svc?.price || 0;
      }
    }
  } catch {
    // service_bookings table might not exist yet
    console.log("[Daily Metrics] service_bookings table not found, skipping");
  }

  // 5. Calculate KPIs
  const totalRevenue = roomRevenue + foodRevenue + barRevenue + serviceRevenue;
  const occupancyPct =
    TOTAL_ROOMS > 0
      ? Math.round((roomsOccupied / TOTAL_ROOMS) * 100 * 100) / 100
      : 0;

  // RevPAR = Total Room Revenue / Available Rooms
  const revpar =
    TOTAL_ROOMS > 0 ? Math.round((roomRevenue / TOTAL_ROOMS) * 100) / 100 : 0;

  // ADR = Room Revenue / Occupied Rooms
  const adr =
    roomsOccupied > 0
      ? Math.round((roomRevenue / roomsOccupied) * 100) / 100
      : 0;

  // Average check
  const avgCheck =
    ordersCount > 0
      ? Math.round(((foodRevenue + barRevenue) / ordersCount) * 100) / 100
      : 0;

  return {
    date: targetDate,
    room_revenue: roomRevenue,
    food_revenue: foodRevenue,
    bar_revenue: barRevenue,
    service_revenue: serviceRevenue,
    total_revenue: totalRevenue,
    rooms_occupied: roomsOccupied,
    rooms_available: TOTAL_ROOMS,
    occupancy_pct: occupancyPct,
    person_nights: personNights,
    guests_count: guestsCount,
    revpar,
    adr,
    orders_count: ordersCount,
    avg_check: avgCheck,
    service_bookings: serviceBookings,
    snapshot_type: "auto",
  };
}
