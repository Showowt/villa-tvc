import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ============================================
// 86 SYSTEM API ROUTE
// Toggle item availability, set reasons, auto-restore
// ============================================

interface Toggle86Request {
  item_type: "menu_item" | "service";
  item_id: string;
  action: "86" | "restore";
  reason?: string;
  restore_at?: string; // ISO timestamp for auto-restore
  changed_by?: string;
}

// POST: Toggle item availability (86 or restore)
export async function POST(request: NextRequest) {
  try {
    const body: Toggle86Request = await request.json();

    if (!body.item_type || !body.item_id || !body.action) {
      return NextResponse.json(
        { error: "Se requiere item_type, item_id y action" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Get item name for logging
    let itemName = "";
    if (body.item_type === "menu_item") {
      const { data: item } = await supabase
        .from("menu_items")
        .select("name_es")
        .eq("id", body.item_id)
        .single();
      itemName = item?.name_es || "Desconocido";
    } else {
      const { data: item } = await supabase
        .from("services")
        .select("name_es")
        .eq("id", body.item_id)
        .single();
      itemName = item?.name_es || "Desconocido";
    }

    // Calculate restore time (default: tomorrow at 6 AM local time)
    let restoreAt: string | null = null;
    if (body.action === "86") {
      if (body.restore_at) {
        restoreAt = body.restore_at;
      } else {
        // Default: tomorrow at 6 AM Colombia time (UTC-5)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(6, 0, 0, 0);
        restoreAt = tomorrow.toISOString();
      }
    }

    // Update the item
    if (body.item_type === "menu_item") {
      const { error } = await supabase
        .from("menu_items")
        .update({
          is_available: body.action === "restore",
          unavailable_reason: body.action === "86" ? body.reason || null : null,
          unavailable_until: body.action === "86" ? restoreAt : null,
        })
        .eq("id", body.item_id);

      if (error) {
        console.error("[86 API] Error updating menu_item:", error);
        return NextResponse.json(
          { error: "Error al actualizar item" },
          { status: 500 },
        );
      }
    } else {
      const { error } = await supabase
        .from("services")
        .update({
          is_available_today: body.action === "restore",
          unavailable_reason: body.action === "86" ? body.reason || null : null,
          unavailable_until: body.action === "86" ? restoreAt : null,
        })
        .eq("id", body.item_id);

      if (error) {
        console.error("[86 API] Error updating service:", error);
        return NextResponse.json(
          { error: "Error al actualizar servicio" },
          { status: 500 },
        );
      }
    }

    // Log the 86 action
    const { error: logError } = await supabase.from("item_86_logs").insert({
      item_type: body.item_type,
      item_id: body.item_id,
      item_name: itemName,
      action: body.action,
      reason: body.reason || null,
      changed_by: body.changed_by || null,
      restored_at: body.action === "restore" ? new Date().toISOString() : null,
    });

    if (logError) {
      console.error("[86 API] Error logging action:", logError);
    }

    return NextResponse.json({
      success: true,
      message:
        body.action === "86"
          ? `${itemName} marcado como no disponible`
          : `${itemName} restaurado como disponible`,
      restore_at: restoreAt,
    });
  } catch (error) {
    console.error("[86 API] Error:", error);
    return NextResponse.json({ error: "Error del servidor" }, { status: 500 });
  }
}

// GET: Get all 86'd items and recent history
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type"); // 'menu_item', 'service', or null for all

    const supabase = createServerClient();

    // Get 86'd menu items
    let menuItems: {
      id: string;
      name_es: string;
      category: string;
      unavailable_reason: string | null;
      unavailable_until: string | null;
    }[] = [];
    if (!type || type === "menu_item") {
      const { data } = await supabase
        .from("menu_items")
        .select("id, name_es, category, unavailable_reason, unavailable_until")
        .eq("is_available", false)
        .eq("is_active", true)
        .order("category")
        .order("name_es");

      menuItems = data || [];
    }

    // Get 86'd services
    let services: {
      id: string;
      name_es: string;
      category: string | null;
      unavailable_reason: string | null;
      unavailable_until: string | null;
    }[] = [];
    if (!type || type === "service") {
      const { data } = await supabase
        .from("services")
        .select("id, name_es, category, unavailable_reason, unavailable_until")
        .eq("is_available_today", false)
        .eq("is_active", true)
        .order("name_es");

      services = data || [];
    }

    // Get recent 86 log history (last 50 entries)
    const { data: history } = await supabase
      .from("item_86_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50);

    return NextResponse.json({
      menu_items: menuItems,
      services: services,
      total_86d: menuItems.length + services.length,
      history: history || [],
    });
  } catch (error) {
    console.error("[86 API] GET Error:", error);
    return NextResponse.json(
      { error: "Error al obtener items 86" },
      { status: 500 },
    );
  }
}
