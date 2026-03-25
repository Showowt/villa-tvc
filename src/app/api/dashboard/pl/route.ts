import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #64: Dashboard Lazy Loading - P&L Data
 * This endpoint loads on demand (heavier data)
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    // Dish P&L summary
    const { data: dishPL } = await supabase
      .from("dish_pl")
      .select("*")
      .order("weekly_profit", { ascending: false });

    // Categorize items
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

    // Calculate metrics
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
      success: true,
      week: {
        foodProfit: weekFoodProfit,
        barProfit: weekBarProfit,
        totalProfit: weekFoodProfit + weekBarProfit,
        avgFoodMargin: Math.round(avgFoodMargin * 10) / 10,
        avgBarMargin: Math.round(avgBarMargin * 10) / 10,
        transportCost: Math.round(weekTransport),
      },
      topDishes: foodItems.slice(0, 5).map((d) => ({
        name: d.name,
        nameEs: d.name_es,
        margin: d.margin_pct,
        weeklyProfit: d.weekly_profit,
      })),
      topDrinks: drinkItems.slice(0, 5).map((d) => ({
        name: d.name,
        nameEs: d.name_es,
        margin: d.margin_pct,
        weeklyProfit: d.weekly_profit,
      })),
    });
  } catch (error) {
    console.error("[dashboard/pl]", error);
    return NextResponse.json(
      { error: "Failed to fetch P&L data" },
      { status: 500 },
    );
  }
}
