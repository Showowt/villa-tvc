// ============================================
// GUEST PROFILE API - DISABLED
// Table (guest_profiles) not in current schema
// TODO: Re-enable when guest profile system is implemented
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  return NextResponse.json({
    success: true,
    profiles: [],
    message: "Guest profiles feature disabled - table not configured",
    action,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const { action } = body;

  return NextResponse.json({
    success: true,
    message: "Guest profile creation disabled - table not configured",
    action,
  });
}
