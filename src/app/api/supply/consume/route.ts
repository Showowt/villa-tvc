import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

interface SupplyItem {
  name: string;
  name_es: string;
  quantity: number;
  unit: string;
  ingredient_id?: string;
  cost_per_unit?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { checklist_type, villa_id, user_id } = body as {
      checklist_type: string;
      villa_id?: string;
      user_id: string;
    };

    if (!checklist_type) {
      return NextResponse.json(
        { error: "checklist_type is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Get supply template for this checklist type
    const { data: template, error: templateError } = await supabase
      .from("supply_templates")
      .select("supplies")
      .eq("checklist_type", checklist_type)
      .single();

    if (templateError || !template) {
      // No supply template for this checklist type - that's ok
      return NextResponse.json({
        success: true,
        message: "No supply template for this checklist type",
        consumed: [],
      });
    }

    const supplies = template.supplies as unknown as SupplyItem[];

    if (!supplies || supplies.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No supplies to consume",
        consumed: [],
      });
    }

    const consumedItems: Array<{
      name: string;
      name_es: string;
      quantity: number;
      unit: string;
      cost: number;
    }> = [];
    const errors: string[] = [];
    let totalCost = 0;

    // For each supply item, decrement inventory
    for (const supply of supplies) {
      // Find matching ingredient by name (case-insensitive)
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("id, name_es, current_stock, unit")
        .or(`name.ilike.%${supply.name}%,name_es.ilike.%${supply.name_es}%`)
        .limit(1)
        .single();

      if (ingredient) {
        const newStock = Math.max(
          0,
          (ingredient.current_stock || 0) - supply.quantity,
        );

        const { error: updateError } = await supabase
          .from("ingredients")
          .update({
            current_stock: newStock,
            last_updated: new Date().toISOString(),
            updated_by: user_id,
          })
          .eq("id", ingredient.id);

        if (updateError) {
          errors.push(
            `Failed to update ${ingredient.name_es}: ${updateError.message}`,
          );
        } else {
          const itemCost = (supply.cost_per_unit || 0) * supply.quantity;
          totalCost += itemCost;

          consumedItems.push({
            name: supply.name,
            name_es: ingredient.name_es,
            quantity: supply.quantity,
            unit: ingredient.unit,
            cost: itemCost,
          });

          // Log the consumption
          await supabase.from("inventory_logs").insert({
            ingredient_id: ingredient.id,
            quantity_counted: newStock,
            previous_quantity: ingredient.current_stock || 0,
            variance: -supply.quantity,
            counted_by: user_id,
            notes: `Auto-consumed from ${checklist_type}${villa_id ? ` (${villa_id})` : ""}`,
          });
        }
      } else {
        // Still track the supply even if no matching ingredient
        const itemCost = (supply.cost_per_unit || 0) * supply.quantity;
        totalCost += itemCost;

        consumedItems.push({
          name: supply.name,
          name_es: supply.name_es,
          quantity: supply.quantity,
          unit: supply.unit,
          cost: itemCost,
        });

        errors.push(
          `Ingredient not found in inventory: ${supply.name_es || supply.name}`,
        );
      }
    }

    // Log the full consumption event to supply_consumption_logs
    if (consumedItems.length > 0) {
      await supabase.from("supply_consumption_logs").insert({
        checklist_type: checklist_type,
        villa_id: villa_id || null,
        supplies_consumed: consumedItems as unknown as Json,
        total_cost: totalCost,
        consumed_by: user_id,
        notes: `Consumed from ${checklist_type} completion`,
      });
    }

    return NextResponse.json({
      success: true,
      message: `Consumed ${consumedItems.length} supply items`,
      consumed: consumedItems,
      total_cost: totalCost,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error("[supply/consume]", error);
    return NextResponse.json(
      { error: "Failed to consume supplies" },
      { status: 500 },
    );
  }
}

// GET - Get supply template for a checklist type
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checklistType = searchParams.get("type");

    if (!checklistType) {
      return NextResponse.json(
        { error: "type parameter is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data: template, error } = await supabase
      .from("supply_templates")
      .select("*")
      .eq("checklist_type", checklistType)
      .single();

    if (error) {
      return NextResponse.json({
        success: true,
        template: null,
        supplies: [],
      });
    }

    return NextResponse.json({
      success: true,
      template,
      supplies: template.supplies || [],
    });
  } catch (error) {
    console.error("[supply/consume GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch supply template" },
      { status: 500 },
    );
  }
}
