// ============================================
// SESSION API - DISABLED
// Tables (session_config, user_sessions, activity_log) not in current schema
// TODO: Re-enable when session management is implemented
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Session creation disabled - tables not configured",
  });
}

export async function PATCH(request: NextRequest) {
  return NextResponse.json({
    success: false,
    message: "Session update disabled - tables not configured",
  });
}

export async function DELETE(request: NextRequest) {
  return NextResponse.json({
    success: true,
    message: "Session ended (stub)",
  });
}

export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      valid: false,
      error: "Session validation disabled - tables not configured",
    },
    { status: 401 },
  );
}
