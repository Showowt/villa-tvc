import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #64: Dashboard Lazy Loading - Secondary Metrics
 * Counts and pending approvals (load after critical)
 * Cached for 2 minutes
 */

export const dynamic = "force-dynamic";

interface MetricsResponse {
  success: boolean;
  counts: {
    pendingPurchaseOrders: number;
    lowStockItems: number;
    conversationsToday: number;
    messagesTotal: number;
  };
  pendingApprovals: {
    checklists: number;
    purchaseOrders: number;
  };
  lastUpdated: string;
}

export async function GET(): Promise<
  NextResponse<MetricsResponse | { error: string }>
> {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Parallel fetch of all counts using head: true for efficiency
    const [
      pendingPOsResult,
      lowStockResult,
      todayConvosResult,
      pendingChecklistsResult,
    ] = await Promise.all([
      // Pending purchase orders count
      supabase
        .from("purchase_orders")
        .select("*", { count: "exact", head: true })
        .in("status", ["draft", "sent"]),

      // Low stock ingredients count - more efficient with raw count
      supabase
        .from("ingredients")
        .select("id, current_stock, min_stock")
        .eq("is_active", true)
        .not("current_stock", "is", null)
        .not("min_stock", "is", null),

      // Today's conversations count
      supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gte("started_at", `${today}T00:00:00`),

      // Checklists awaiting approval (complete status = ready for QC)
      supabase
        .from("checklists")
        .select("*", { count: "exact", head: true })
        .eq("date", today)
        .eq("status", "complete"),
    ]);

    // Calculate low stock count from fetched data
    const lowStockCount = (lowStockResult.data || []).filter(
      (i) =>
        i.min_stock !== null &&
        i.current_stock !== null &&
        i.current_stock < i.min_stock,
    ).length;

    return NextResponse.json({
      success: true,
      counts: {
        pendingPurchaseOrders: pendingPOsResult.count || 0,
        lowStockItems: lowStockCount,
        conversationsToday: todayConvosResult.count || 0,
        messagesTotal: 0, // Placeholder for future implementation
      },
      pendingApprovals: {
        checklists: pendingChecklistsResult.count || 0,
        purchaseOrders: pendingPOsResult.count || 0,
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[dashboard/metrics]", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 },
    );
  }
}
