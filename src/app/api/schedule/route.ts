// ============================================
// SCHEDULE API - DISABLED
// Table (staff_schedules) not in current schema
// Uses staff_schedule instead (different structure)
// TODO: Re-enable when schedule system is migrated
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const startDate = searchParams.get("start");
  const endDate = searchParams.get("end");

  return NextResponse.json({
    success: true,
    schedules: [],
    staff: [],
    date_range: { start: startDate, end: endDate },
    message: "Staff schedules disabled - table not configured",
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Schedule management disabled - table not configured",
    action: body.action,
  });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "Schedule deletion disabled - table not configured",
  });
}
