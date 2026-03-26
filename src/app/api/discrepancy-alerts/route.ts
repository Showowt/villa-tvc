// ============================================
// DISCREPANCY ALERTS - DISABLED
// Table (delivery_discrepancy_alerts) not configured
// TODO: Re-enable when schema is aligned
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    alerts: [],
    message: "Discrepancy alerts disabled - table not configured",
  });
}

export async function POST() {
  return NextResponse.json({
    success: true,
    message: "Discrepancy alerts disabled - table not configured",
  });
}
