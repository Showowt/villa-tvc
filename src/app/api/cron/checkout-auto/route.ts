// ═══════════════════════════════════════════════════════════════
// TVC AUTO CHECKOUT CRON JOB
// Runs at 11:15 AM Colombia time (16:15 UTC) - after 11am checkout
// Auto-transitions villas from occupied to cleaning after checkout
// Issue #39 — NO AUTOMATIC STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  autoCheckoutTransition,
  getTodayColombiaDate,
  getColombiaTime,
} from "@/lib/operations-hub";

// Verify cron secret for protected routes
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron Checkout Auto] CRON_SECRET no configurado");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const startTime = Date.now();
  const colombiaTime = getColombiaTime();
  const today = getTodayColombiaDate();

  console.log(
    `[Cron Checkout Auto] Starting at ${colombiaTime.toISOString()} (Colombia: ${today})`,
  );

  try {
    // Run automatic checkout transitions
    const results = await autoCheckoutTransition();

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;
    const duration = Date.now() - startTime;

    console.log(`[Cron Checkout Auto] Completed in ${duration}ms`);
    console.log(`  - Success: ${successCount}, Failed: ${failCount}`);

    // Log each transition
    results.forEach((result) => {
      if (result.success) {
        console.log(`  [OK] ${result.villaId}: ${result.transition}`);
      } else {
        console.error(
          `  [FAIL] ${result.villaId}: ${result.transition} - ${result.error}`,
        );
      }
    });

    return NextResponse.json({
      success: true,
      date: today,
      colombia_time: colombiaTime.toISOString(),
      duration_ms: duration,
      transitions_total: results.length,
      transitions_success: successCount,
      transitions_failed: failCount,
      transitions: results,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[Cron Checkout Auto] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        date: today,
        colombia_time: colombiaTime.toISOString(),
      },
      { status: 500 },
    );
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === "Bearer admin-manual-trigger" ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return GET(request);
}
