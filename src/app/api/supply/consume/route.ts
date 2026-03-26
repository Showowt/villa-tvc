// ============================================
// SUPPLY CONSUME API - DISABLED
// Table (supply_consumption_logs) not in current schema
// TODO: Re-enable when supply consumption tracking is implemented
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Supply consumption logging disabled - table not configured",
  });
}

export async function GET() {
  return NextResponse.json({
    success: true,
    logs: [],
    message: "Supply consumption logs disabled - table not configured",
  });
}
