// ═══════════════════════════════════════════════════════════════
// TVC CLEANING DEADLINE CRON JOB
// Runs every 30 minutes to monitor cleaning progress
// Alerts managers at 30min before deadline, escalates at deadline
// Auto-transitions villas to ready when checklists are approved
// Issue #39 — NO AUTOMATIC STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  cleaningDeadlineCheck,
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
    console.error("[Cron Cleaning Deadline] CRON_SECRET no configurado");
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
    `[Cron Cleaning Deadline] Starting at ${colombiaTime.toISOString()} (Colombia: ${today})`,
  );

  try {
    // Run cleaning deadline check
    const results = await cleaningDeadlineCheck();

    const duration = Date.now() - startTime;

    console.log(`[Cron Cleaning Deadline] Completed in ${duration}ms`);
    console.log(`  - Checklists checked: ${results.checked}`);
    console.log(`  - Warnings sent: ${results.warningsSent}`);
    console.log(`  - Escalated: ${results.escalated}`);
    console.log(`  - Auto-transitioned: ${results.autoTransitioned}`);
    if (results.errors.length > 0) {
      console.log(`  - Errors: ${results.errors.join(", ")}`);
    }

    return NextResponse.json({
      success: true,
      date: today,
      colombia_time: colombiaTime.toISOString(),
      duration_ms: duration,
      checklists_checked: results.checked,
      warnings_sent: results.warningsSent,
      escalated: results.escalated,
      auto_transitioned: results.autoTransitioned,
      errors: results.errors,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[Cron Cleaning Deadline] Error:", error);

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
