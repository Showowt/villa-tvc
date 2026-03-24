import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// GET /api/dashboard - Returns all dashboard metrics
export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const weekAhead = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Today's occupancy
    const { data: todayOcc } = await supabase
      .from("daily_occupancy")
      .select("*")
      .eq("date", today)
      .single();

    // Next 7 days occupancy
    const { data: weekOcc } = await supabase
      .from("daily_occupancy")
      .select("date, guests_count, check_ins, check_outs")
      .gte("date", today)
      .lte("date", weekAhead)
      .order("date");

    // Dish P&L summary
    const { data: dishPL } = await supabase
      .from("dish_pl")
      .select("*")
      .order("weekly_profit", { ascending: false });

    // Food items: breakfast, lunch, dinner, snack
    const drinkCategories = [
      "cocktail",
      "mocktail",
      "beer",
      "wine",
      "spirit",
      "soft_drink",
    ];
    const foodItems = (dishPL || []).filter(
      (d) => !drinkCategories.includes(d.category || ""),
    );
    const drinkItems = (dishPL || []).filter((d) =>
      drinkCategories.includes(d.category || ""),
    );

    // Low stock alerts
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("id, name, name_es, current_stock, min_stock, category")
      .eq("is_active", true)
      .not("current_stock", "is", null);

    const lowStockItems = (ingredients || []).filter(
      (i) =>
        i.min_stock !== null &&
        i.current_stock !== null &&
        i.current_stock < i.min_stock,
    );

    // Today's checklists
    const { data: checklists } = await supabase
      .from("checklists")
      .select("id, type, villa_id, status")
      .eq("date", today);

    // Pending approvals
    const pendingApprovals = (checklists || []).filter(
      (c) => c.status === "complete",
    );

    // Active escalations
    const { data: escalations } = await supabase
      .from("conversations")
      .select("id, contact_name, channel")
      .eq("status", "escalated");

    // Today's conversations
    const { data: todayConvos } = await supabase
      .from("conversations")
      .select("id")
      .gte("started_at", `${today}T00:00:00`);

    // Staff performance today
    const { data: staffPerf } = await supabase
      .from("daily_tasks")
      .select("user_id, total_count, completed_count, status, department")
      .eq("date", today);

    // Purchase orders pending
    const { data: pendingPOs } = await supabase
      .from("purchase_orders")
      .select("id, total_cost, transport_cost, status, forecast_person_nights")
      .in("status", ["draft", "sent"]);

    const weekPersonNights = (weekOcc || []).reduce(
      (s, d) => s + (d.guests_count || 0),
      0,
    );
    const weekFoodProfit = foodItems.reduce(
      (s, d) => s + (d.weekly_profit || 0),
      0,
    );
    const weekBarProfit = drinkItems.reduce(
      (s, d) => s + (d.weekly_profit || 0),
      0,
    );
    const avgFoodMargin =
      foodItems.length > 0
        ? foodItems.reduce((s, d) => s + (d.margin_pct || 0), 0) /
          foodItems.length
        : 0;
    const avgBarMargin =
      drinkItems.length > 0
        ? drinkItems.reduce((s, d) => s + (d.margin_pct || 0), 0) /
          drinkItems.length
        : 0;
    const weekTransport =
      dishPL?.reduce(
        (s, d) => s + (d.transport_cost || 0) * (d.avg_orders_per_week || 0),
        0,
      ) || 0;

    return NextResponse.json({
      today: {
        date: today,
        guests: todayOcc?.guests_count || 0,
        checkIns: todayOcc?.check_ins || 0,
        checkOuts: todayOcc?.check_outs || 0,
        villasOccupied: todayOcc?.villas_occupied || [],
        personNights: todayOcc?.person_nights || 0,
      },
      week: {
        personNights: weekPersonNights,
        occupancy: weekOcc || [],
        foodProfit: weekFoodProfit,
        barProfit: weekBarProfit,
        totalProfit: weekFoodProfit + weekBarProfit,
        avgFoodMargin: Math.round(avgFoodMargin * 10) / 10,
        avgBarMargin: Math.round(avgBarMargin * 10) / 10,
        transportCost: Math.round(weekTransport),
      },
      alerts: {
        lowStock: lowStockItems.map((i) => ({
          name: i.name_es || i.name,
          current: i.current_stock,
          minimum: i.min_stock,
          category: i.category,
        })),
        pendingApprovals: pendingApprovals.length,
        escalations: (escalations || []).length,
        pendingPurchaseOrders: (pendingPOs || []).length,
      },
      operations: {
        checklistsToday: (checklists || []).length,
        checklistsCompleted: (checklists || []).filter(
          (c) => c.status === "approved",
        ).length,
        staffTasks: (staffPerf || []).map((s) => ({
          department: s.department,
          completed: s.completed_count,
          total: s.total_count,
          pct:
            s.total_count > 0
              ? Math.round((s.completed_count / s.total_count) * 100)
              : 0,
        })),
        conversationsToday: (todayConvos || []).length,
      },
      topDishes: foodItems.slice(0, 5).map((d) => ({
        name: d.name,
        margin: d.margin_pct,
        weeklyProfit: d.weekly_profit,
      })),
      topDrinks: drinkItems.slice(0, 5).map((d) => ({
        name: d.name,
        margin: d.margin_pct,
        weeklyProfit: d.weekly_profit,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Dashboard error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
