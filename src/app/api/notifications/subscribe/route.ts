// ============================================
// PUSH NOTIFICATIONS SUBSCRIBE API - DISABLED
// Tables (push_subscriptions, notification_preferences) not in current schema
// TODO: Re-enable when push notification system is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: false,
    message: "Push notifications not configured - tables not available",
    message_es: "Notificaciones push no configuradas",
  });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Push subscription disabled - tables not configured",
    message_es: "Suscripción push deshabilitada",
  });
}

export async function DELETE(request: Request) {
  return NextResponse.json({
    success: true,
    message: "Notificaciones desactivadas (stub)",
  });
}
