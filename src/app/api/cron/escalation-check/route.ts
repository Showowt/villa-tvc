// ============================================
// ESCALATION CHECK CRON - DISABLED
// Tables (escalations, delegation_settings) not yet created
// TODO: Re-enable when escalation system is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Escalation check disabled - tables not configured",
    checked: 0,
    reminders_sent: 0,
    backup_notified: 0,
    critical_notified: 0,
    auto_routed: 0,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
