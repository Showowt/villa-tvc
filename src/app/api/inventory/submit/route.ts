// ============================================
// INVENTORY SUBMIT - DISABLED
// Tables (idempotency_keys) not configured
// TODO: Re-enable when inventory system is implemented
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "Inventory submission disabled - tables not configured",
    errors: [],
    updated: [],
  });
}
