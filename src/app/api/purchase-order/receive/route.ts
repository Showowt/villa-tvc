import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

interface ReceivedItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  notes?: string;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      purchase_order_id,
      received_items,
      received_by,
      discrepancy_notes,
    }: {
      purchase_order_id: string;
      received_items: ReceivedItem[];
      received_by: string;
      discrepancy_notes?: string;
    } = body;

    if (!purchase_order_id || !received_items || !received_by) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Check for discrepancies
    const hasDiscrepancies = received_items.some(
      (item) => item.ordered_qty !== item.received_qty,
    );

    // Update purchase order with receiving info
    const { error: poError } = await supabase
      .from("purchase_orders")
      .update({
        status: "received",
        received_at: new Date().toISOString(),
        received_by,
        received_items: received_items,
        has_discrepancies: hasDiscrepancies,
        discrepancy_notes: discrepancy_notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase_order_id);

    if (poError) {
      console.error("[receive PO]", poError);
      return NextResponse.json(
        { error: "Failed to update purchase order" },
        { status: 500 },
      );
    }

    // Update inventory with RECEIVED quantities (not ordered)
    for (const item of received_items) {
      if (item.received_qty > 0) {
        // Get current stock
        const { data: ingredient } = await supabase
          .from("ingredients")
          .select("current_stock")
          .eq("id", item.ingredient_id)
          .single();

        const currentStock = ingredient?.current_stock || 0;
        const newStock = currentStock + item.received_qty;

        // Update ingredient stock
        await supabase
          .from("ingredients")
          .update({
            current_stock: newStock,
            last_updated: new Date().toISOString(),
            updated_by: received_by,
          })
          .eq("id", item.ingredient_id);

        // Log inventory change
        await supabase.from("inventory_logs").insert({
          ingredient_id: item.ingredient_id,
          quantity_counted: newStock,
          previous_quantity: currentStock,
          variance: item.received_qty,
          counted_by: received_by,
          notes: `PO Delivery: +${item.received_qty} (ordered: ${item.ordered_qty})${
            item.notes ? ` - ${item.notes}` : ""
          }`,
        });
      }
    }

    return NextResponse.json({
      success: true,
      has_discrepancies: hasDiscrepancies,
      message: hasDiscrepancies
        ? "Delivery received with discrepancies flagged"
        : "Delivery received successfully",
    });
  } catch (error) {
    console.error("[receive PO]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
