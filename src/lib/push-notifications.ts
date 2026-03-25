// ============================================
// TVC PUSH NOTIFICATIONS - Web Push API Integration
// Delivers real-time alerts to staff devices
// ============================================

import webpush from "web-push";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";

// ─── TYPES ───
export type NotificationPriority = "urgent" | "high" | "normal" | "low";

export type NotificationType =
  | "low_stock"
  | "cleaning_deadline"
  | "checklist_submitted"
  | "task_assigned"
  | "escalation"
  | "order_placed"
  | "maintenance_alert"
  | "system";

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  is_active: boolean;
}

export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  url?: string;
  priority?: NotificationPriority;
  tag?: string;
  data?: Record<string, unknown>;
  userId?: string;
  userIds?: string[];
  role?: "owner" | "manager" | "staff";
  department?: string;
}

export interface DeliveryResult {
  success: boolean;
  channel: "push" | "whatsapp";
  userId: string;
  error?: string;
}

// ─── VAPID CONFIGURATION ───
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_EMAIL = process.env.VAPID_EMAIL || "mailto:ops@tvc.com";

// Configure web-push if keys are available
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

// ─── PRIORITY TO TTL MAPPING ───
const PRIORITY_TTL: Record<NotificationPriority, number> = {
  urgent: 60, // 1 minute - must be seen immediately
  high: 3600, // 1 hour
  normal: 86400, // 24 hours
  low: 604800, // 7 days
};

// ─── NOTIFICATION TYPE TO SPANISH TEXT ───
const NOTIFICATION_TITLES: Record<NotificationType, string> = {
  low_stock: "Inventario Bajo",
  cleaning_deadline: "Deadline Limpieza",
  checklist_submitted: "Checklist Completado",
  task_assigned: "Nueva Tarea Asignada",
  escalation: "Escalacion Urgente",
  order_placed: "Nuevo Pedido",
  maintenance_alert: "Alerta Mantenimiento",
  system: "TVC Operaciones",
};

// ─── CHECK IF IN QUIET HOURS ───
async function isInQuietHours(userId: string): Promise<boolean> {
  const supabase = createServerClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
    .eq("user_id", userId)
    .single();

  if (!prefs?.quiet_hours_enabled) return false;

  const now = new Date();
  const currentTime = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

  const start = prefs.quiet_hours_start;
  const end = prefs.quiet_hours_end;

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (start > end) {
    return currentTime >= start || currentTime < end;
  }

  return currentTime >= start && currentTime < end;
}

// ─── CHECK IF NOTIFICATION TYPE IS ENABLED ───
async function isNotificationEnabled(
  userId: string,
  type: NotificationType,
): Promise<boolean> {
  const supabase = createServerClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (!prefs) return true; // Default to enabled if no preferences

  const typeToField: Record<NotificationType, keyof typeof prefs> = {
    low_stock: "low_stock_enabled",
    cleaning_deadline: "cleaning_deadline_enabled",
    checklist_submitted: "checklist_submitted_enabled",
    task_assigned: "task_assigned_enabled",
    escalation: "escalation_enabled",
    order_placed: "order_placed_enabled",
    maintenance_alert: "maintenance_alert_enabled",
    system: "escalation_enabled", // System notifications always use escalation setting
  };

  const field = typeToField[type];
  return field ? Boolean(prefs[field]) : true;
}

// ─── GET USER SUBSCRIPTIONS ───
async function getUserSubscriptions(
  userId: string,
): Promise<PushSubscription[]> {
  const supabase = createServerClient();

  const { data } = await supabase
    .from("push_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true);

  return (data as PushSubscription[]) || [];
}

// ─── GET TARGET USER IDS ───
async function getTargetUserIds(
  payload: NotificationPayload,
): Promise<string[]> {
  const supabase = createServerClient();

  // Single user
  if (payload.userId) {
    return [payload.userId];
  }

  // Multiple specific users
  if (payload.userIds && payload.userIds.length > 0) {
    return payload.userIds;
  }

  // By role
  if (payload.role) {
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .eq("role", payload.role)
      .eq("is_active", true);

    return users?.map((u) => u.id) || [];
  }

  // By department
  if (payload.department) {
    const { data: users } = await supabase
      .from("users")
      .select("id")
      .eq("department", payload.department)
      .eq("is_active", true);

    return users?.map((u) => u.id) || [];
  }

  // Default: managers and owners
  const { data: users } = await supabase
    .from("users")
    .select("id")
    .in("role", ["manager", "owner"])
    .eq("is_active", true);

  return users?.map((u) => u.id) || [];
}

// ─── SEND PUSH NOTIFICATION ───
async function sendPushNotification(
  subscription: PushSubscription,
  payload: NotificationPayload,
): Promise<boolean> {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    console.warn("[PushNotifications] VAPID keys not configured");
    return false;
  }

  const pushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    },
  };

  const notificationPayload = JSON.stringify({
    title: payload.title || NOTIFICATION_TITLES[payload.type],
    body: payload.body,
    tag: payload.tag || `tvc-${payload.type}-${Date.now()}`,
    url: payload.url || "/staff/tasks",
    data: {
      type: payload.type,
      ...payload.data,
    },
  });

  const options = {
    TTL: PRIORITY_TTL[payload.priority || "normal"],
    urgency: payload.priority === "urgent" ? "high" : "normal",
  };

  try {
    await webpush.sendNotification(
      pushSubscription,
      notificationPayload,
      options,
    );
    return true;
  } catch (error) {
    const err = error as { statusCode?: number };

    // Handle expired/invalid subscriptions
    if (err.statusCode === 404 || err.statusCode === 410) {
      const supabase = createServerClient();
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .eq("id", subscription.id);
      console.log(
        `[PushNotifications] Subscription ${subscription.id} marked inactive`,
      );
    }

    console.error("[PushNotifications] Send error:", error);
    return false;
  }
}

// ─── SEND WHATSAPP FALLBACK ───
async function sendWhatsAppFallback(
  userId: string,
  payload: NotificationPayload,
): Promise<boolean> {
  const supabase = createServerClient();

  const { data: user } = await supabase
    .from("users")
    .select("phone")
    .eq("id", userId)
    .single();

  if (!user?.phone) {
    console.warn(`[PushNotifications] No phone for user ${userId}`);
    return false;
  }

  const message = `${NOTIFICATION_TITLES[payload.type]}

${payload.body}

${payload.url ? `Ver: ${process.env.NEXT_PUBLIC_APP_URL || ""}${payload.url}` : ""}`;

  try {
    await sendWhatsAppMessage(user.phone, message);
    return true;
  } catch (error) {
    console.error("[PushNotifications] WhatsApp fallback error:", error);
    return false;
  }
}

// ─── LOG DELIVERY ───
async function logDelivery(
  userId: string,
  type: NotificationType,
  channel: "push" | "whatsapp",
  status: "sent" | "failed",
  subscriptionId?: string,
  errorMessage?: string,
): Promise<void> {
  const supabase = createServerClient();

  await supabase.from("notification_delivery_log").insert({
    user_id: userId,
    notification_type: type,
    channel,
    status,
    subscription_id: subscriptionId,
    error_message: errorMessage,
  });
}

// ─── MAIN SEND FUNCTION ───
export async function sendNotification(
  payload: NotificationPayload,
): Promise<DeliveryResult[]> {
  const results: DeliveryResult[] = [];
  const supabase = createServerClient();

  // Get target users
  const userIds = await getTargetUserIds(payload);

  for (const userId of userIds) {
    // Check if notification type is enabled for user
    const isEnabled = await isNotificationEnabled(userId, payload.type);
    if (!isEnabled) {
      results.push({
        success: false,
        channel: "push",
        userId,
        error: "Notification type disabled",
      });
      continue;
    }

    // Check quiet hours (skip for urgent notifications)
    if (payload.priority !== "urgent") {
      const inQuietHours = await isInQuietHours(userId);
      if (inQuietHours) {
        // Queue for later delivery
        await supabase.from("notification_queue").insert({
          user_id: userId,
          notification_type: payload.type,
          title: payload.title || NOTIFICATION_TITLES[payload.type],
          body: payload.body,
          url: payload.url,
          priority: payload.priority || "normal",
          data: payload.data,
          status: "pending",
          scheduled_for: getQuietHoursEndTime(userId),
        });

        results.push({
          success: true,
          channel: "push",
          userId,
          error: "Queued for quiet hours end",
        });
        continue;
      }
    }

    // Get user preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("prefer_push, fallback_to_whatsapp")
      .eq("user_id", userId)
      .single();

    const preferPush = prefs?.prefer_push !== false;
    const fallbackEnabled = prefs?.fallback_to_whatsapp !== false;

    let pushSuccess = false;

    // Try push notifications first (if preferred)
    if (preferPush) {
      const subscriptions = await getUserSubscriptions(userId);

      for (const sub of subscriptions) {
        const success = await sendPushNotification(sub, payload);

        if (success) {
          pushSuccess = true;
          await logDelivery(userId, payload.type, "push", "sent", sub.id);

          // Update last used
          await supabase
            .from("push_subscriptions")
            .update({ last_used_at: new Date().toISOString() })
            .eq("id", sub.id);
        }
      }
    }

    // If push failed and fallback enabled, try WhatsApp
    if (!pushSuccess && fallbackEnabled) {
      const whatsappSuccess = await sendWhatsAppFallback(userId, payload);

      if (whatsappSuccess) {
        await logDelivery(userId, payload.type, "whatsapp", "sent");
        results.push({ success: true, channel: "whatsapp", userId });
      } else {
        await logDelivery(
          userId,
          payload.type,
          "whatsapp",
          "failed",
          undefined,
          "WhatsApp send failed",
        );
        results.push({
          success: false,
          channel: "whatsapp",
          userId,
          error: "Both push and WhatsApp failed",
        });
      }
    } else if (pushSuccess) {
      results.push({ success: true, channel: "push", userId });
    } else {
      results.push({
        success: false,
        channel: "push",
        userId,
        error: "No active subscriptions",
      });
    }
  }

  return results;
}

// ─── HELPER: Get quiet hours end time ───
async function getQuietHoursEndTime(userId: string): Promise<string> {
  const supabase = createServerClient();

  const { data: prefs } = await supabase
    .from("notification_preferences")
    .select("quiet_hours_end")
    .eq("user_id", userId)
    .single();

  const endTime = prefs?.quiet_hours_end || "07:00";
  const [hours, minutes] = endTime.split(":").map(Number);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(hours, minutes, 0, 0);

  return tomorrow.toISOString();
}

// ─── CONVENIENCE FUNCTIONS ───

// Notify low stock
export async function notifyLowStock(
  ingredientName: string,
  currentStock: number,
  minStock: number,
  unit: string,
): Promise<DeliveryResult[]> {
  return sendNotification({
    type: "low_stock",
    title: "Inventario Bajo",
    body: `${ingredientName}: ${currentStock} ${unit} (minimo: ${minStock} ${unit})`,
    url: "/staff/inventory",
    priority: "high",
    role: "manager",
  });
}

// Notify cleaning deadline
export async function notifyCleaningDeadline(
  villaName: string,
  villaId: string,
  deadlineTime: string,
  guestName: string,
): Promise<DeliveryResult[]> {
  return sendNotification({
    type: "cleaning_deadline",
    title: "Deadline Limpieza - 30 min",
    body: `${villaName} - Huesped: ${guestName} llega a las ${deadlineTime}`,
    url: `/staff/checklist/villa_leaving?villa=${villaId}`,
    priority: "urgent",
    role: "manager",
  });
}

// Notify checklist submitted
export async function notifyChecklistSubmitted(
  checklistType: string,
  villaId: string | null,
  submittedBy: string,
  managerId?: string,
): Promise<DeliveryResult[]> {
  const villaInfo = villaId ? ` - ${villaId}` : "";

  return sendNotification({
    type: "checklist_submitted",
    title: "Checklist Completado",
    body: `${checklistType}${villaInfo} completado por ${submittedBy}`,
    url: `/ops/housekeeping?villa=${villaId || ""}`,
    priority: "normal",
    userId: managerId,
    role: managerId ? undefined : "manager",
  });
}

// Notify task assigned
export async function notifyTaskAssigned(
  taskTitle: string,
  taskDescription: string,
  assignedTo: string,
): Promise<DeliveryResult[]> {
  return sendNotification({
    type: "task_assigned",
    title: "Nueva Tarea Asignada",
    body: taskDescription || taskTitle,
    url: "/staff/tasks",
    priority: "high",
    userId: assignedTo,
  });
}

// Notify escalation
export async function notifyEscalation(
  reason: string,
  details: string,
  priority: NotificationPriority = "urgent",
): Promise<DeliveryResult[]> {
  // Always notify owner for escalations
  const supabase = createServerClient();
  const { data: owner } = await supabase
    .from("users")
    .select("id")
    .eq("role", "owner")
    .single();

  return sendNotification({
    type: "escalation",
    title: `Escalacion: ${reason}`,
    body: details,
    url: "/ops/management",
    priority,
    userId: owner?.id,
  });
}

// Notify order placed
export async function notifyOrderPlaced(
  villaId: string,
  items: { name: string; quantity: number }[],
  kitchenUserId?: string,
): Promise<DeliveryResult[]> {
  const itemsList = items.map((i) => `${i.quantity}x ${i.name}`).join(", ");

  return sendNotification({
    type: "order_placed",
    title: "Nuevo Pedido",
    body: `Villa ${villaId}: ${itemsList}`,
    url: "/staff/kitchen",
    priority: "high",
    userId: kitchenUserId,
    department: kitchenUserId ? undefined : "kitchen",
  });
}

// Notify maintenance alert
export async function notifyMaintenanceAlert(
  issue: string,
  location: string,
  reportedBy: string,
): Promise<DeliveryResult[]> {
  return sendNotification({
    type: "maintenance_alert",
    title: "Alerta Mantenimiento",
    body: `${issue} en ${location} - Reportado por ${reportedBy}`,
    url: "/ops/maintenance",
    priority: "high",
    department: "maintenance",
  });
}

// ─── PROCESS NOTIFICATION QUEUE ───
export async function processNotificationQueue(): Promise<number> {
  const supabase = createServerClient();
  let processed = 0;

  // Get pending notifications that are ready to send
  const { data: pending } = await supabase
    .from("notification_queue")
    .select("*")
    .eq("status", "pending")
    .lte("scheduled_for", new Date().toISOString())
    .lt("attempts", 3)
    .limit(50);

  if (!pending || pending.length === 0) return 0;

  for (const notification of pending) {
    const results = await sendNotification({
      type: notification.notification_type as NotificationType,
      title: notification.title,
      body: notification.body,
      url: notification.url,
      priority: notification.priority as NotificationPriority,
      data: notification.data as Record<string, unknown>,
      userId: notification.user_id,
    });

    const success = results.some((r) => r.success);

    await supabase
      .from("notification_queue")
      .update({
        status: success ? "sent" : "failed",
        attempts: notification.attempts + 1,
        last_attempt_at: new Date().toISOString(),
        sent_at: success ? new Date().toISOString() : null,
        error_message: success ? null : results.map((r) => r.error).join("; "),
      })
      .eq("id", notification.id);

    processed++;
  }

  return processed;
}

// ─── GET VAPID PUBLIC KEY (for client) ───
export function getVapidPublicKey(): string {
  return VAPID_PUBLIC_KEY;
}
