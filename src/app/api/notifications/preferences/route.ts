// ============================================
// NOTIFICATION PREFERENCES API - DISABLED
// Tables (notification_preferences, push_subscriptions) not in current schema
// TODO: Re-enable when notification system is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  return NextResponse.json({
    success: true,
    preferences: {
      user_id: userId,
      low_stock_enabled: true,
      cleaning_deadline_enabled: true,
      checklist_submitted_enabled: true,
      task_assigned_enabled: true,
      escalation_enabled: true,
      order_placed_enabled: false,
      maintenance_alert_enabled: true,
      quiet_hours_enabled: false,
      quiet_hours_start: "22:00",
      quiet_hours_end: "07:00",
      prefer_push: false,
      fallback_to_whatsapp: true,
    },
    activeSubscriptions: 0,
    message: "Notification preferences disabled - tables not configured",
  });
}

export async function PUT(request: Request) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: true,
    preferences: body.preferences || {},
    message: "Notification preferences disabled - tables not configured",
  });
}
