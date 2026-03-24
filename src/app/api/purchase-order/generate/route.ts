import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type IngredientCategory = Database["public"]["Enums"]["ingredient_category"];

interface POLineItem {
  ingredient_id: string;
  name_es: string;
  current_stock: number;
  min_stock: number;
  suggested_quantity: number;
  unit: string;
  cost_per_unit: number;
  estimated_cost: number;
  supplier: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      requested_by,
      include_below_minimum_only = true,
      category,
    } = body as {
      requested_by: string;
      include_below_minimum_only?: boolean;
      category?: string;
    };

    if (!requested_by) {
      return NextResponse.json(
        { error: "requested_by (user_id) is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Build query for low stock items
    let query = supabase.from("ingredients").select("*").eq("is_active", true);

    if (category) {
      query = query.eq("category", category as IngredientCategory);
    }

    const { data: ingredients, error } = await query;

    if (error) {
      throw error;
    }

    // Filter items that need reordering
    const itemsToOrder: POLineItem[] = [];
    let totalEstimatedCost = 0;

    for (const ing of ingredients || []) {
      const currentStock = ing.current_stock || 0;
      const minStock = ing.min_stock || 0;

      // Skip if above minimum and we only want below minimum
      if (include_below_minimum_only && currentStock >= minStock) {
        continue;
      }

      // Calculate suggested order quantity (bring to 2x min stock)
      const targetStock = minStock * 2;
      const suggestedQuantity = Math.max(0, targetStock - currentStock);

      if (suggestedQuantity <= 0) continue;

      const estimatedCost = suggestedQuantity * (ing.cost_per_unit || 0);
      totalEstimatedCost += estimatedCost;

      itemsToOrder.push({
        ingredient_id: ing.id,
        name_es: ing.name_es,
        current_stock: currentStock,
        min_stock: minStock,
        suggested_quantity: suggestedQuantity,
        unit: ing.unit,
        cost_per_unit: ing.cost_per_unit || 0,
        estimated_cost: estimatedCost,
        supplier: ing.supplier,
      });
    }

    // Group by supplier
    const bySupplier = itemsToOrder.reduce(
      (acc, item) => {
        const supplier = item.supplier || "Sin proveedor";
        if (!acc[supplier]) {
          acc[supplier] = { items: [], total: 0 };
        }
        acc[supplier].items.push(item);
        acc[supplier].total += item.estimated_cost;
        return acc;
      },
      {} as Record<string, { items: POLineItem[]; total: number }>,
    );

    // Generate formatted purchase order text
    const poDate = new Date().toLocaleDateString("es-CO", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    let poText = `# ORDEN DE COMPRA - TVC\n`;
    poText += `Fecha: ${poDate}\n\n`;

    for (const [supplier, data] of Object.entries(bySupplier)) {
      poText += `## ${supplier}\n`;
      poText += `| Producto | Cantidad | Unidad | Precio Unit. | Subtotal |\n`;
      poText += `|----------|----------|--------|--------------|----------|\n`;

      for (const item of data.items) {
        poText += `| ${item.name_es} | ${item.suggested_quantity} | ${item.unit} | $${item.cost_per_unit.toLocaleString()} | $${item.estimated_cost.toLocaleString()} |\n`;
      }

      poText += `\n**Subtotal ${supplier}:** $${data.total.toLocaleString()} COP\n\n`;
    }

    poText += `---\n`;
    poText += `**TOTAL ESTIMADO:** $${totalEstimatedCost.toLocaleString()} COP\n`;

    return NextResponse.json({
      success: true,
      purchase_order: {
        generated_at: new Date().toISOString(),
        requested_by,
        items_count: itemsToOrder.length,
        estimated_total: totalEstimatedCost,
        by_supplier: bySupplier,
        formatted_text: poText,
      },
      items: itemsToOrder,
    });
  } catch (error) {
    console.error("[purchase-order/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate purchase order" },
      { status: 500 },
    );
  }
}

// GET - Get current low stock items for preview
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get("category");

    const supabase = createServerClient();

    let query = supabase
      .from("ingredients")
      .select(
        "id, name_es, current_stock, min_stock, unit, cost_per_unit, supplier, category",
      )
      .eq("is_active", true);

    if (category) {
      query = query.eq("category", category as IngredientCategory);
    }

    const { data: ingredients, error } = await query;

    if (error) {
      throw error;
    }

    // Filter to low stock only
    const lowStock = (ingredients || []).filter(
      (i) =>
        i.min_stock !== null &&
        i.current_stock !== null &&
        i.current_stock < i.min_stock,
    );

    // Group by category with deficit calculation
    type LowStockItem = (typeof lowStock)[number] & { deficit: number };
    const byCategory = lowStock.reduce(
      (acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push({
          ...item,
          deficit: (item.min_stock || 0) - (item.current_stock || 0),
        } as LowStockItem);
        return acc;
      },
      {} as Record<string, LowStockItem[]>,
    );

    return NextResponse.json({
      success: true,
      low_stock_count: lowStock.length,
      by_category: byCategory,
      items: lowStock,
    });
  } catch (error) {
    console.error("[purchase-order/generate GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch low stock items" },
      { status: 500 },
    );
  }
}
