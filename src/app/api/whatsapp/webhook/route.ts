// Placeholder for WhatsApp webhook integration
// Will be implemented when Twilio WhatsApp is configured

import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "inactive",
    message: "WhatsApp integration pending configuration",
  });
}

export async function POST(request: NextRequest) {
  console.log("[WhatsApp Webhook] Received message (not configured)");
  return NextResponse.json({ received: true });
}
