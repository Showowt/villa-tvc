// ============================================
// ESCALATION ROUTE - DISABLED
// Tables (escalations, delegation_settings, escalation_notifications) not configured
// TODO: Re-enable when escalation system is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    escalations: [],
    message: "Escalation system disabled - tables not configured",
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Escalation creation disabled - tables not configured",
  });
}
