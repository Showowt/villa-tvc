// ============================================
// FEEDBACK REQUESTS CRON - DISABLED
// Tables (feedback_automation_log, review_link_token) not configured
// TODO: Re-enable when feedback automation is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: "Feedback requests cron disabled - tables not configured",
    processed: 0,
    timestamp: new Date().toISOString(),
  });
}

export async function POST() {
  return GET();
}
