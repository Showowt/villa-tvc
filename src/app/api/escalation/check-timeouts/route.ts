// ============================================
// ESCALATION CHECK TIMEOUTS - DISABLED
// Escalation tables not configured
// TODO: Re-enable when escalation system is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Escalation timeouts check disabled - tables not configured",
    checked: 0,
    timed_out: 0,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
