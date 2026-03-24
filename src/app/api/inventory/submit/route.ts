import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

interface InventoryItem {
  ingredient_id: string;
  quantity_counted: number;
  notes?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { items, counted_by } = (await request.json()) as {
      items: InventoryItem[];
      counted_by: string;
    };

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    if (!counted_by) {
      return NextResponse.json(
        { error: "counted_by (user_id) is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();
    const results: { success: number; errors: string[] } = {
      success: 0,
      errors: [],
    };

    for (const item of items) {
      // Get current stock to calculate variance
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock, name_es")
        .eq("id", item.ingredient_id)
        .single();

      if (!ingredient) {
        results.errors.push(`Ingredient ${item.ingredient_id} not found`);
        continue;
      }

      const previousQty = ingredient.current_stock || 0;
      const variance = item.quantity_counted - previousQty;

      // Insert inventory log
      const { error: logError } = await supabase.from("inventory_logs").insert({
        ingredient_id: item.ingredient_id,
        counted_by,
        quantity_counted: item.quantity_counted,
        previous_quantity: previousQty,
        variance,
        notes: item.notes || null,
        counted_at: now,
      });

      if (logError) {
        results.errors.push(
          `Failed to log ${ingredient.name_es}: ${logError.message}`,
        );
        continue;
      }

      // Update current stock on ingredient
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          current_stock: item.quantity_counted,
          last_updated: now,
          updated_by: counted_by,
        })
        .eq("id", item.ingredient_id);

      if (updateError) {
        results.errors.push(
          `Failed to update stock for ${ingredient.name_es}: ${updateError.message}`,
        );
        continue;
      }

      results.success++;
    }

    // Check for low stock alerts
    const { data: lowStockItems } = await supabase
      .from("ingredients")
      .select("name_es, current_stock, min_stock, unit")
      .lt("current_stock", supabase.rpc as unknown as number) // This won't work, need raw query
      .eq("is_active", true);

    // Alternative: Get all and filter
    const { data: allIngredients } = await supabase
      .from("ingredients")
      .select("name_es, current_stock, min_stock, unit")
      .eq("is_active", true);

    const lowStock =
      allIngredients?.filter(
        (i) =>
          i.min_stock !== null &&
          i.current_stock !== null &&
          i.current_stock < i.min_stock,
      ) || [];

    return NextResponse.json({
      success: true,
      results,
      lowStockAlerts: lowStock.map((i) => ({
        name: i.name_es,
        current: i.current_stock,
        minimum: i.min_stock,
        unit: i.unit,
      })),
      message: `${results.success} items updated successfully${
        results.errors.length > 0 ? `, ${results.errors.length} errors` : ""
      }`,
    });
  } catch (error) {
    console.error("[inventory/submit]", error);
    return NextResponse.json(
      { error: "Failed to submit inventory" },
      { status: 500 },
    );
  }
}

// GET - Retrieve current inventory with low stock flags
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: ingredients, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (error) {
      throw error;
    }

    type IngredientWithFlag = NonNullable<typeof ingredients>[number] & {
      is_low_stock: boolean;
    };
    const categorized = ingredients?.reduce(
      (acc, ing) => {
        const cat = ing.category;
        if (!acc[cat]) acc[cat] = [];
        acc[cat].push({
          ...ing,
          is_low_stock:
            ing.min_stock !== null &&
            ing.current_stock !== null &&
            ing.current_stock < ing.min_stock,
        });
        return acc;
      },
      {} as Record<string, IngredientWithFlag[]>,
    );

    return NextResponse.json({
      success: true,
      inventory: categorized,
      total_items: ingredients?.length || 0,
    });
  } catch (error) {
    console.error("[inventory/submit GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory" },
      { status: 500 },
    );
  }
}
