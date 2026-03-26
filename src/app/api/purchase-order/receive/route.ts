// ============================================
// PURCHASE ORDER RECEIVE API - DISABLED
// Tables (delivery_discrepancy_alerts, supplier_performance) not in current schema
// TODO: Re-enable when procurement system is fully implemented
// ============================================

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Purchase order receiving disabled - tables not configured",
    has_discrepancies: false,
    discrepancy_pct: 0,
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    alerts: [],
    count: 0,
    message: "Discrepancy alerts disabled - tables not configured",
  });
}
