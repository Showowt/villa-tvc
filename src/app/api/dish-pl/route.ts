import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * GET /api/dish-pl
 * Fetch dish P&L data from the dish_pl view
 * Returns real margins calculated from recipes table
 */
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("dish_pl")
      .select("*")
      .order("weekly_profit", { ascending: false });

    if (error) {
      console.error("[dish-pl] Query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch dish P&L data" },
        { status: 500 },
      );
    }

    // Categorize items for summary stats
    const drinkCategories = [
      "cocktail",
      "mocktail",
      "beer",
      "wine",
      "spirit",
      "soft_drink",
    ];

    const foodItems = (data || []).filter(
      (d) => !drinkCategories.includes(d.category || ""),
    );
    const drinkItems = (data || []).filter((d) =>
      drinkCategories.includes(d.category || ""),
    );

    // Calculate summary metrics
    const weekFoodProfit = foodItems.reduce(
      (s, d) => s + Number(d.weekly_profit || 0),
      0,
    );
    const weekBarProfit = drinkItems.reduce(
      (s, d) => s + Number(d.weekly_profit || 0),
      0,
    );
    const avgFoodMargin =
      foodItems.length > 0
        ? foodItems.reduce((s, d) => s + Number(d.margin_pct || 0), 0) /
          foodItems.length
        : 0;
    const avgBarMargin =
      drinkItems.length > 0
        ? drinkItems.reduce((s, d) => s + Number(d.margin_pct || 0), 0) /
          drinkItems.length
        : 0;

    // Total weekly transport cost
    const weekTransport = (data || []).reduce(
      (s, d) =>
        s + Number(d.transport_cost || 0) * Number(d.orders_this_week || 0),
      0,
    );

    // Items with low margin (< 50%)
    const lowMarginItems = (data || []).filter(
      (d) => Number(d.margin_pct) < 50,
    );

    return NextResponse.json({
      success: true,
      items: data || [],
      summary: {
        totalItems: data?.length || 0,
        foodItems: foodItems.length,
        drinkItems: drinkItems.length,
        weekFoodProfit: Math.round(weekFoodProfit),
        weekBarProfit: Math.round(weekBarProfit),
        weekTotalProfit: Math.round(weekFoodProfit + weekBarProfit),
        avgFoodMargin: Math.round(avgFoodMargin * 10) / 10,
        avgBarMargin: Math.round(avgBarMargin * 10) / 10,
        weekTransportCost: Math.round(weekTransport),
        lowMarginCount: lowMarginItems.length,
      },
      lowMarginItems: lowMarginItems.map((d) => ({
        id: d.menu_item_id,
        name: d.name,
        nameEs: d.name_es,
        category: d.category,
        price: d.price,
        cost: Number(d.ingredient_cost || 0) + Number(d.transport_cost || 0),
        marginPct: d.margin_pct,
      })),
    });
  } catch (error) {
    console.error("[dish-pl] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
