// ============================================
// MAINTENANCE SYNC CRON - DISABLED
// Tables (system_notifications) not configured
// TODO: Re-enable when maintenance sync is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Maintenance sync cron disabled - tables not configured",
    tasks_synced: 0,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
