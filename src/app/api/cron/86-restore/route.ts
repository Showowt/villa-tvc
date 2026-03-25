import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ============================================
// CRON: Auto-restore 86'd items
// Runs every hour to check for items that should be restored
// Configure in Vercel with: 0 * * * * (every hour)
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Restore menu items where unavailable_until has passed
    const { data: menuItems, error: menuError } = await supabase
      .from("menu_items")
      .update({
        is_available: true,
        unavailable_until: null,
        unavailable_reason: null,
      })
      .eq("is_available", false)
      .not("unavailable_until", "is", null)
      .lte("unavailable_until", now)
      .select("id, name_es");

    if (menuError) {
      console.error("[86 Cron] Error restoring menu items:", menuError);
    }

    // Restore services where unavailable_until has passed
    const { data: services, error: servicesError } = await supabase
      .from("services")
      .update({
        is_available_today: true,
        unavailable_until: null,
        unavailable_reason: null,
      })
      .eq("is_available_today", false)
      .not("unavailable_until", "is", null)
      .lte("unavailable_until", now)
      .select("id, name_es");

    if (servicesError) {
      console.error("[86 Cron] Error restoring services:", servicesError);
    }

    // Log restored items
    const restoredItems = [
      ...(menuItems || []).map((i) => ({
        item_type: "menu_item",
        item_id: i.id,
        item_name: i.name_es,
        action: "restore",
        reason: "Auto-restored by cron",
      })),
      ...(services || []).map((s) => ({
        item_type: "service",
        item_id: s.id,
        item_name: s.name_es,
        action: "restore",
        reason: "Auto-restored by cron",
      })),
    ];

    if (restoredItems.length > 0) {
      const { error: logError } = await supabase
        .from("item_86_logs")
        .insert(restoredItems);

      if (logError) {
        console.error("[86 Cron] Error logging restored items:", logError);
      }
    }

    const restoredCount = (menuItems?.length || 0) + (services?.length || 0);

    console.log(`[86 Cron] Restored ${restoredCount} items at ${now}`);

    return NextResponse.json({
      success: true,
      restored: restoredCount,
      menuItems: menuItems?.length || 0,
      services: services?.length || 0,
      timestamp: now,
    });
  } catch (error) {
    console.error("[86 Cron] Error:", error);
    return NextResponse.json(
      { error: "Failed to run 86 restore cron" },
      { status: 500 },
    );
  }
}
