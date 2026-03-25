// ============================================
// TVC NOTIFICATIONS - WhatsApp via Twilio
// Critical alerts: low stock, cleaning needed, escalation
// ============================================

import { sendWhatsAppMessage } from "@/lib/twilio/client";
import { createServerClient } from "@/lib/supabase/client";

// Manager/escalation phone numbers from env
const MANAGER_PHONE =
  process.env.TVC_MANAGER_PHONE || process.env.TVC_STAFF_WHATSAPP;

export type NotificationType =
  | "low_stock"
  | "cleaning_needed"
  | "cleaning_deadline"
  | "escalation"
  | "order_placed"
  | "checklist_overdue";

export interface NotificationPayload {
  type: NotificationType;
  recipientPhone?: string;
  message: string;
  relatedId?: string;
  relatedType?: string;
}

// Log notification to database
async function logNotification(
  payload: NotificationPayload,
  status: "sent" | "failed",
  errorMessage?: string,
): Promise<void> {
  try {
    const supabase = createServerClient();
    await supabase.from("notification_logs").insert({
      notification_type: payload.type,
      recipient_phone: payload.recipientPhone || MANAGER_PHONE || "unknown",
      message: payload.message,
      status,
      error_message: errorMessage,
      related_id: payload.relatedId,
      related_type: payload.relatedType,
    });
  } catch (error) {
    console.error("[Notifications] Failed to log notification:", error);
  }
}

// Send notification via WhatsApp
export async function sendNotification(
  payload: NotificationPayload,
): Promise<boolean> {
  const phone = payload.recipientPhone || MANAGER_PHONE;

  if (!phone) {
    console.error("[Notifications] No recipient phone configured");
    await logNotification(payload, "failed", "No recipient phone configured");
    return false;
  }

  try {
    await sendWhatsAppMessage(phone, payload.message);
    await logNotification(payload, "sent");
    console.log(`[Notifications] Sent ${payload.type} to ${phone}`);
    return true;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Notifications] Failed to send ${payload.type}:`, errorMsg);
    await logNotification(payload, "failed", errorMsg);
    return false;
  }
}

// ============================================
// SPECIFIC NOTIFICATION HELPERS
// ============================================

// Low stock alert
export async function notifyLowStock(
  ingredientName: string,
  currentStock: number,
  minStock: number,
  unit: string,
): Promise<boolean> {
  const message = `🚨 ALERTA INVENTARIO BAJO

📦 ${ingredientName}
📉 Stock actual: ${currentStock} ${unit}
⚠️ Mínimo requerido: ${minStock} ${unit}

Por favor, agregar al próximo pedido de compras.`;

  return sendNotification({
    type: "low_stock",
    message,
    relatedType: "ingredient",
  });
}

// Cleaning deadline warning (30 min before)
export async function notifyCleaningDeadline(
  villaName: string,
  villaId: string,
  deadlineTime: string,
  guestName: string,
): Promise<boolean> {
  const message = `⏰ ALERTA LIMPIEZA - 30 MIN

🏠 ${villaName}
👤 Huésped: ${guestName}
⏱️ Deadline: ${deadlineTime}

La limpieza debe completarse antes de la llegada del huésped.`;

  return sendNotification({
    type: "cleaning_deadline",
    message,
    relatedId: villaId,
    relatedType: "villa",
  });
}

// Cleaning deadline escalation (at deadline)
export async function escalateCleaningDeadline(
  villaName: string,
  villaId: string,
  guestName: string,
  arrivalTime: string,
): Promise<boolean> {
  const message = `🚨 ESCALACIÓN - LIMPIEZA NO COMPLETADA

🏠 ${villaName}
👤 Huésped llegando: ${guestName}
🕐 Hora de llegada: ${arrivalTime}

❌ El checklist de limpieza NO ha sido aprobado.
Se requiere acción inmediata.`;

  return sendNotification({
    type: "escalation",
    message,
    relatedId: villaId,
    relatedType: "villa_cleaning",
  });
}

// Checklist overdue alert
export async function notifyChecklistOverdue(
  checklistType: string,
  villaId: string | null,
  assignedTo: string,
): Promise<boolean> {
  const villaInfo = villaId ? ` - ${villaId}` : "";
  const message = `⚠️ CHECKLIST PENDIENTE

📋 ${checklistType}${villaInfo}
👤 Asignado a: ${assignedTo}

El checklist no ha sido completado a tiempo.`;

  return sendNotification({
    type: "checklist_overdue",
    message,
    relatedId: villaId || undefined,
    relatedType: "checklist",
  });
}

// General escalation notification
export async function notifyEscalation(
  reason: string,
  details: string,
  priority: "low" | "medium" | "high" | "critical" = "high",
): Promise<boolean> {
  const priorityEmoji = {
    low: "📝",
    medium: "⚠️",
    high: "🔴",
    critical: "🚨",
  };

  const message = `${priorityEmoji[priority]} ESCALACIÓN - ${priority.toUpperCase()}

📌 Razón: ${reason}

${details}

Se requiere atención inmediata.`;

  return sendNotification({
    type: "escalation",
    message,
    relatedType: "escalation",
  });
}

// Order placed notification (for kitchen)
export async function notifyOrderPlaced(
  villaId: string,
  items: { name: string; quantity: number }[],
  kitchenPhone?: string,
): Promise<boolean> {
  const itemsList = items.map((i) => `• ${i.quantity}x ${i.name}`).join("\n");

  const message = `🍽️ NUEVO PEDIDO

🏠 Villa: ${villaId}
📝 Items:
${itemsList}

Por favor preparar.`;

  return sendNotification({
    type: "order_placed",
    recipientPhone: kitchenPhone,
    message,
    relatedId: villaId,
    relatedType: "order",
  });
}

// Check cleaning deadlines and send alerts
export async function checkCleaningDeadlines(): Promise<void> {
  const supabase = createServerClient();
  const now = new Date();
  const thirtyMinFromNow = new Date(now.getTime() + 30 * 60 * 1000);

  // Get bookings with cleaning deadlines approaching
  const { data: bookings } = await supabase
    .from("villa_bookings")
    .select("*, villa_status:villa_id(cleaning_status)")
    .not("cleaning_deadline", "is", null)
    .gte("cleaning_deadline", now.toISOString())
    .lte("cleaning_deadline", thirtyMinFromNow.toISOString())
    .eq("status", "confirmed");

  if (!bookings || bookings.length === 0) return;

  for (const booking of bookings) {
    // Check if cleaning is not yet approved
    const villaStatus = booking.villa_status as {
      cleaning_status: string;
    } | null;
    if (
      villaStatus?.cleaning_status !== "inspected" &&
      villaStatus?.cleaning_status !== "clean"
    ) {
      const deadline = new Date(booking.cleaning_deadline);
      const minutesUntil = Math.round(
        (deadline.getTime() - now.getTime()) / 60000,
      );

      if (minutesUntil <= 30 && minutesUntil > 0) {
        // 30 min warning
        await notifyCleaningDeadline(
          booking.villa_id,
          booking.villa_id,
          deadline.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
          }),
          booking.guest_name,
        );
      } else if (minutesUntil <= 0) {
        // At deadline - escalate
        await escalateCleaningDeadline(
          booking.villa_id,
          booking.villa_id,
          booking.guest_name,
          booking.arrival_time || "Unknown",
        );
      }
    }
  }
}
