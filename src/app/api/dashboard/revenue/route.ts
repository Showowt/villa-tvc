import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ============================================
// TVC REVENUE API - Daily Revenue Calculations
// Real-time F&B revenue tracking
// ============================================

export const dynamic = "force-dynamic";

interface RevenueData {
  today: {
    food: number;
    bar: number;
    total: number;
    orderCount: number;
  };
  week: {
    food: number;
    bar: number;
    total: number;
  };
  month: {
    food: number;
    bar: number;
    total: number;
  };
  topItems: {
    name: string;
    quantity: number;
    revenue: number;
  }[];
}

// Food categories
const FOOD_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"];
// Bar categories
const BAR_CATEGORIES = [
  "cocktail",
  "mocktail",
  "beer",
  "wine",
  "spirit",
  "soft_drink",
];

export async function GET(request: Request) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    // Today's date range
    const today = date;

    // Week start (Monday)
    const weekStart = new Date(date);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    // Month start
    const monthStart = new Date(date);
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];

    // Fetch today's orders with menu item details
    const { data: todayOrders, error: todayError } = await supabase
      .from("order_logs")
      .select(
        `
        id,
        quantity,
        unit_price,
        total_price,
        menu_item_id,
        menu_items:menu_item_id (
          name_es,
          category
        )
      `,
      )
      .eq("order_date", today);

    if (todayError) {
      console.error("[Revenue API] Error fetching today orders:", todayError);
      return NextResponse.json(
        { error: "Failed to fetch revenue data" },
        { status: 500 },
      );
    }

    // Fetch week's orders
    const { data: weekOrders, error: weekError } = await supabase
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
      .gte("order_date", weekStartStr)
      .lte("order_date", today);

    if (weekError) {
      console.error("[Revenue API] Error fetching week orders:", weekError);
    }

    // Fetch month's orders
    const { data: monthOrders, error: monthError } = await supabase
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
      .gte("order_date", monthStartStr)
      .lte("order_date", today);

    if (monthError) {
      console.error("[Revenue API] Error fetching month orders:", monthError);
    }

    // Calculate today's revenue
    let todayFood = 0;
    let todayBar = 0;
    const itemCounts: Record<
      string,
      { name: string; quantity: number; revenue: number }
    > = {};

    if (todayOrders) {
      for (const order of todayOrders) {
        const menuItem = order.menu_items as unknown as {
          name_es: string;
          category: string;
        } | null;
        const price = Number(order.total_price) || 0;
        const category = menuItem?.category || "";

        if (FOOD_CATEGORIES.includes(category)) {
          todayFood += price;
        } else if (BAR_CATEGORIES.includes(category)) {
          todayBar += price;
        }

        // Track top items
        const itemName = menuItem?.name_es || "Unknown";
        if (!itemCounts[itemName]) {
          itemCounts[itemName] = { name: itemName, quantity: 0, revenue: 0 };
        }
        itemCounts[itemName].quantity += Number(order.quantity) || 0;
        itemCounts[itemName].revenue += price;
      }
    }

    // Calculate week revenue
    let weekFood = 0;
    let weekBar = 0;

    if (weekOrders) {
      for (const order of weekOrders) {
        const menuItem = order.menu_items as unknown as {
          category: string;
        } | null;
        const price = Number(order.total_price) || 0;
        const category = menuItem?.category || "";

        if (FOOD_CATEGORIES.includes(category)) {
          weekFood += price;
        } else if (BAR_CATEGORIES.includes(category)) {
          weekBar += price;
        }
      }
    }

    // Calculate month revenue
    let monthFood = 0;
    let monthBar = 0;

    if (monthOrders) {
      for (const order of monthOrders) {
        const menuItem = order.menu_items as unknown as {
          category: string;
        } | null;
        const price = Number(order.total_price) || 0;
        const category = menuItem?.category || "";

        if (FOOD_CATEGORIES.includes(category)) {
          monthFood += price;
        } else if (BAR_CATEGORIES.includes(category)) {
          monthBar += price;
        }
      }
    }

    // Top 5 items by revenue
    const topItems = Object.values(itemCounts)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    const revenueData: RevenueData = {
      today: {
        food: todayFood,
        bar: todayBar,
        total: todayFood + todayBar,
        orderCount: todayOrders?.length || 0,
      },
      week: {
        food: weekFood,
        bar: weekBar,
        total: weekFood + weekBar,
      },
      month: {
        food: monthFood,
        bar: monthBar,
        total: monthFood + monthBar,
      },
      topItems,
    };

    return NextResponse.json(revenueData);
  } catch (error) {
    console.error("[Revenue API] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
