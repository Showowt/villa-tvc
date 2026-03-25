// ============================================
// IN-VILLA MENU ORDERS API (Issue 67)
// Handle orders from QR menu in villas
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// Order item schema
const orderItemSchema = z.object({
  menu_item_id: z.string().uuid(),
  quantity: z.number().int().positive(),
  special_instructions: z.string().optional(),
});

// Full order schema
const orderSchema = z.object({
  villa_id: z.string().min(1, "Villa ID is required"),
  items: z.array(orderItemSchema).min(1, "At least one item is required"),
  guest_name: z.string().optional(),
  guest_phone: z.string().optional(),
  delivery_location: z.string().optional(),
  special_instructions: z.string().optional(),
});

// POST /api/menu/orders - Create new order from QR menu
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = orderSchema.parse(body);

    const supabase = createServerClient();

    // Get menu items to calculate prices
    const menuItemIds = validated.items.map((item) => item.menu_item_id);
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .select("id, name, name_es, price, is_available")
      .in("id", menuItemIds);

    if (menuError) {
      return NextResponse.json(
        { success: false, error: "Failed to fetch menu items" },
        { status: 500 },
      );
    }

    // Check all items are available
    const unavailable = menuItems?.filter((item) => !item.is_available);
    if (unavailable && unavailable.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Some items are unavailable",
          unavailable_items: unavailable.map((i) => i.name_es),
        },
        { status: 400 },
      );
    }

    // Create order logs for each item
    const orderLogs = validated.items.map((item) => {
      const menuItem = menuItems?.find((m) => m.id === item.menu_item_id);
      return {
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menuItem?.price || 0,
        total_price: (menuItem?.price || 0) * item.quantity,
        villa_id: validated.villa_id,
        delivery_location: validated.delivery_location || validated.villa_id,
        order_type: "villa_qr" as const,
        status: "pending" as const,
        special_instructions:
          item.special_instructions || validated.special_instructions,
        guest_name: validated.guest_name,
        guest_phone: validated.guest_phone,
        order_date: new Date().toISOString().split("T")[0],
        order_time: new Date().toTimeString().split(" ")[0],
      };
    });

    const { data: orders, error: orderError } = await supabase
      .from("order_logs")
      .insert(orderLogs)
      .select();

    if (orderError) {
      console.error("[Menu Orders API] Insert error:", orderError);
      return NextResponse.json(
        { success: false, error: "Failed to create order" },
        { status: 500 },
      );
    }

    // Calculate total
    const total = orderLogs.reduce((sum, item) => sum + item.total_price, 0);

    return NextResponse.json({
      success: true,
      data: {
        orders,
        total,
        villa_id: validated.villa_id,
        estimated_time: "15-20 minutos",
      },
      message: "Pedido recibido! La cocina lo preparará pronto.",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid order data", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[Menu Orders API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process order" },
      { status: 500 },
    );
  }
}

// GET /api/menu/orders - Get orders for kitchen display
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const villa_id = searchParams.get("villa_id");
    const limit = searchParams.get("limit");

    const supabase = createServerClient();

    let query = supabase
      .from("order_logs")
      .select(
        `
        *,
        menu_items!inner(name, name_es, category, prep_time_minutes)
      `,
      )
      .eq("order_type", "villa_qr")
      .order("created_at", { ascending: true });

    // Support comma-separated status values (e.g., "pending,preparing,ready")
    if (status !== "all") {
      const statuses = status.split(",").map((s) => s.trim());
      if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
      } else {
        query = query.in("status", statuses);
      }
    }

    if (villa_id) {
      query = query.eq("villa_id", villa_id);
    }

    // Limit results if specified (default: no limit for kitchen display)
    if (limit) {
      query = query.limit(parseInt(limit, 10));
    }

    // Only get orders from last 24 hours for performance
    const yesterday = new Date();
    yesterday.setHours(yesterday.getHours() - 24);
    query = query.gte("created_at", yesterday.toISOString());

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("[Menu Orders API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch orders" },
      { status: 500 },
    );
  }
}

// PATCH /api/menu/orders - Update order status
export async function PATCH(request: NextRequest) {
  try {
    const { order_id, status } = await request.json();

    if (!order_id || !status) {
      return NextResponse.json(
        { success: false, error: "order_id and status are required" },
        { status: 400 },
      );
    }

    const validStatuses = [
      "pending",
      "preparing",
      "ready",
      "delivered",
      "cancelled",
    ];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: "Invalid status" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("order_logs")
      .update({ status })
      .eq("id", order_id)
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message: `Order status updated to ${status}`,
    });
  } catch (error) {
    console.error("[Menu Orders API] PATCH error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update order" },
      { status: 500 },
    );
  }
}
