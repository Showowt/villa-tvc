// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS SYNC — Manual/Cron Sync Endpoint
// Syncs reservations from Cloudbeds to TVC villa_bookings
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { syncReservations, isConnected } from "@/lib/cloudbeds";

// Allow cron jobs to run for up to 60 seconds
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret or admin access
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    // Allow if cron secret matches OR if no secret is set (dev mode)
    const isAuthorized = !cronSecret || authHeader === `Bearer ${cronSecret}`;

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if Cloudbeds is connected
    const connected = await isConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Cloudbeds not connected. Please authorize first at /api/cloudbeds/authorize" },
        { status: 400 }
      );
    }

    console.log("[Cloudbeds] Starting sync...");
    const startTime = Date.now();

    // Sync reservations
    const result = await syncReservations();

    const duration = Date.now() - startTime;
    console.log(`[Cloudbeds] Sync completed in ${duration}ms:`, result);

    return NextResponse.json({
      success: true,
      duration_ms: duration,
      ...result,
    });
  } catch (error) {
    console.error("[Cloudbeds] Sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}

// POST endpoint for manual sync from UI
export async function POST(request: NextRequest) {
  try {
    // Check if Cloudbeds is connected
    const connected = await isConnected();
    if (!connected) {
      return NextResponse.json(
        { error: "Cloudbeds not connected" },
        { status: 400 }
      );
    }

    console.log("[Cloudbeds] Manual sync triggered...");

    // Sync reservations
    const result = await syncReservations();

    return NextResponse.json({
      success: true,
      message: "Sync completed successfully",
      ...result,
    });
  } catch (error) {
    console.error("[Cloudbeds] Manual sync error:", error);
    return NextResponse.json(
      { error: "Sync failed", details: String(error) },
      { status: 500 }
    );
  }
}
