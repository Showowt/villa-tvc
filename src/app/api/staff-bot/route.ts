// ═══════════════════════════════════════════════════════════════
// TVC STAFF BOT API - REDIRECT
// Redirects to /api/ops/staff-bot for consistency
// Issue #58 — WHATSAPP STAFF BOT NOT CONNECTED
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

// This endpoint exists for backwards compatibility
// All staff bot logic is in /api/ops/staff-bot

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Forward to the ops staff-bot endpoint
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://villa-tvc.vercel.app";

    const response = await fetch(`${baseUrl}/api/ops/staff-bot`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error("[staff-bot] Redirect error:", error);
    return NextResponse.json(
      {
        error: "Failed to process request",
        response: "Error de conexion. Contacta a Akil: +57 316 055 1387",
        success: false,
      },
      { status: 500 },
    );
  }
}
