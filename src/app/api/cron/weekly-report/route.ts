// ============================================
// WEEKLY REPORT CRON - DISABLED
// Schema mismatch with weekly_reports table
// TODO: Re-enable when schema is aligned
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Weekly report cron disabled - schema alignment needed",
    reports_generated: 0,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
