// ============================================
// TVC PUSH NOTIFICATIONS - Send API
// Send push notification to users
// ============================================

import { NextResponse } from "next/server";
import { z } from "zod";
import {
  sendNotification,
  processNotificationQueue,
  type NotificationPriority,
  type NotificationType,
} from "@/lib/push-notifications";

// ─── VALIDATION SCHEMA ───
const sendSchema = z.object({
  type: z.enum([
    "low_stock",
    "cleaning_deadline",
    "checklist_submitted",
    "task_assigned",
    "escalation",
    "order_placed",
    "maintenance_alert",
    "system",
  ]),
  title: z.string().min(1).max(100),
  body: z.string().min(1).max(500),
  url: z.string().optional(),
  priority: z.enum(["urgent", "high", "normal", "low"]).optional(),
  tag: z.string().optional(),
  data: z.record(z.unknown()).optional(),
  // Target options (one of these)
  userId: z.string().uuid().optional(),
  userIds: z.array(z.string().uuid()).optional(),
  role: z.enum(["owner", "manager", "staff"]).optional(),
  department: z.string().optional(),
});

// ─── POST: Send notification ───
export async function POST(request: Request) {
  try {
    // Verify API key or internal call
    const authHeader = request.headers.get("authorization");
    const apiKey = process.env.NOTIFICATION_API_KEY;

    // Allow internal calls without API key (from same origin)
    const isInternal = request.headers.get("x-internal-call") === "true";

    if (!isInternal && apiKey && authHeader !== `Bearer ${apiKey}`) {
      return NextResponse.json(
        {
          error: true,
          message: "No autorizado",
        },
        { status: 401 },
      );
    }

    const body = await request.json();
    const validation = sendSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: true,
          message: "Datos invalidos",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const payload = validation.data;

    // Validate that at least one target is specified
    if (
      !payload.userId &&
      !payload.userIds?.length &&
      !payload.role &&
      !payload.department
    ) {
      return NextResponse.json(
        {
          error: true,
          message: "Debe especificar userId, userIds, role, o department",
        },
        { status: 400 },
      );
    }

    // Send notifications
    const results = await sendNotification({
      type: payload.type as NotificationType,
      title: payload.title,
      body: payload.body,
      url: payload.url,
      priority: (payload.priority as NotificationPriority) || "normal",
      tag: payload.tag,
      data: payload.data,
      userId: payload.userId,
      userIds: payload.userIds,
      role: payload.role,
      department: payload.department,
    });

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    console.log(
      `[Notifications/Send] ${payload.type}: ${successCount} sent, ${failCount} failed`,
    );

    return NextResponse.json({
      success: successCount > 0,
      sent: successCount,
      failed: failCount,
      results,
    });
  } catch (error) {
    console.error("[Notifications/Send] POST error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

// ─── GET: Process pending queue (cron endpoint) ───
export async function GET(request: Request) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        {
          error: true,
          message: "No autorizado",
        },
        { status: 401 },
      );
    }

    // Process pending notifications
    const processed = await processNotificationQueue();

    console.log(
      `[Notifications/Send] Processed ${processed} queued notifications`,
    );

    return NextResponse.json({
      success: true,
      processed,
    });
  } catch (error) {
    console.error("[Notifications/Send] GET error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
