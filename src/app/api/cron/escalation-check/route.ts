import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";
import type { Tables } from "@/types/database";

type Escalation = Tables<"escalations">;
type DelegationSetting = Tables<"delegation_settings">;
type User = Tables<"users">;

interface EscalationWithManager extends Escalation {
  escalated_user?: User | null;
  backup_user?: User | null;
}

interface ProcessResult {
  checked: number;
  reminders_sent: number;
  backup_notified: number;
  critical_notified: number;
  auto_routed: number;
  errors: string[];
}

// Formatear minutos a texto legible
function formatMinutes(minutes: number): string {
  if (minutes < 60) {
    return `${minutes} minutos`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) {
    return hours === 1 ? "1 hora" : `${hours} horas`;
  }
  return `${hours}h ${mins}m`;
}

// Obtener prioridad como emoji
function getPriorityEmoji(priority: string): string {
  switch (priority) {
    case "critical":
      return "🔴";
    case "high":
      return "🟠";
    case "normal":
      return "🟡";
    default:
      return "⚪";
  }
}

// Enviar notificacion de escalacion
async function sendEscalationNotification(
  supabase: ReturnType<typeof createServerClient>,
  escalation: Escalation,
  recipientPhone: string,
  recipientId: string,
  notificationType:
    | "initial"
    | "reminder"
    | "backup_notify"
    | "critical"
    | "all_managers",
  minutesSinceEscalation: number,
): Promise<string | null> {
  const priorityEmoji = getPriorityEmoji(escalation.priority);
  const timeAgo = formatMinutes(Math.round(minutesSinceEscalation));

  let message = "";

  switch (notificationType) {
    case "initial":
      message = `${priorityEmoji} NUEVA ESCALACION

Razon: ${escalation.reason}
Departamento: ${escalation.department || "General"}
Prioridad: ${escalation.priority.toUpperCase()}

${escalation.original_message ? `Mensaje original:\n"${escalation.original_message.slice(0, 200)}${escalation.original_message.length > 200 ? "..." : ""}"` : ""}

Responde "ACK ${escalation.id.slice(0, 8)}" para confirmar que lo recibiste.`;
      break;

    case "reminder":
      message = `⏰ RECORDATORIO - Escalacion sin respuesta

Han pasado ${timeAgo} desde la escalacion.

${priorityEmoji} ${escalation.reason}

Por favor responde lo antes posible.
ACK ${escalation.id.slice(0, 8)}`;
      break;

    case "backup_notify":
      message = `🔄 ESCALACION RE-ASIGNADA

El manager principal no ha respondido en ${timeAgo}.
Esta escalacion ahora requiere tu atencion.

${priorityEmoji} ${escalation.reason}
Departamento: ${escalation.department || "General"}

${escalation.original_message ? `"${escalation.original_message.slice(0, 150)}..."` : ""}

ACK ${escalation.id.slice(0, 8)}`;
      break;

    case "critical":
      message = `🚨🚨 ESCALACION CRITICA - ${timeAgo} SIN RESPUESTA 🚨🚨

Ningún manager ha respondido a esta escalacion.

${priorityEmoji} ${escalation.reason}
Prioridad elevada a: CRITICA

Se requiere atencion INMEDIATA.
ACK ${escalation.id.slice(0, 8)}`;
      break;

    case "all_managers":
      message = `⚠️ ALERTA GENERAL - Escalacion sin resolver

Una escalacion lleva ${timeAgo} sin atencion.
Todos los managers han sido notificados.

${priorityEmoji} ${escalation.reason}

Cualquier manager disponible debe atender esto.
ACK ${escalation.id.slice(0, 8)}`;
      break;
  }

  try {
    const twilioSid = await sendWhatsAppMessage(recipientPhone, message);

    // Registrar la notificacion
    await supabase.from("escalation_notifications").insert({
      escalation_id: escalation.id,
      notification_type: notificationType,
      sent_to: recipientId,
      sent_to_phone: recipientPhone,
      channel: "whatsapp",
      twilio_sid: twilioSid,
      message_content: message,
      delivered_at: new Date().toISOString(),
    });

    console.log(
      `[escalation-check] ${notificationType} sent for ${escalation.id} to ${recipientPhone}`,
    );
    return twilioSid;
  } catch (error) {
    console.error(
      `[escalation-check] Failed to send ${notificationType}:`,
      error,
    );

    // Registrar el error
    await supabase.from("escalation_notifications").insert({
      escalation_id: escalation.id,
      notification_type: notificationType,
      sent_to: recipientId,
      sent_to_phone: recipientPhone,
      channel: "whatsapp",
      failed_at: new Date().toISOString(),
      error_message: error instanceof Error ? error.message : "Unknown error",
      message_content: message,
    });

    return null;
  }
}

// Obtener managers por departamento
async function getDepartmentManagers(
  supabase: ReturnType<typeof createServerClient>,
  department: string | null,
): Promise<User[]> {
  const { data } = await supabase
    .from("users")
    .select("*")
    .in("role", ["owner", "manager"])
    .eq("is_active", true)
    .order("role", { ascending: true }); // owners first

  if (!data) return [];

  // Si hay departamento especifico, filtrar
  if (department) {
    return data.filter(
      (u) => u.department === department || u.role === "owner",
    );
  }

  return data;
}

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createServerClient();
    const now = new Date();

    const result: ProcessResult = {
      checked: 0,
      reminders_sent: 0,
      backup_notified: 0,
      critical_notified: 0,
      auto_routed: 0,
      errors: [],
    };

    // 1. Obtener configuraciones de delegacion
    const { data: delegationSettings } = await supabase
      .from("delegation_settings")
      .select("*")
      .eq("is_active", true);

    // Crear mapa de configuraciones por departamento
    const settingsMap = new Map<string | null, DelegationSetting>();
    let globalSettings: DelegationSetting | undefined;

    for (const setting of delegationSettings || []) {
      if (setting.department === null) {
        globalSettings = setting;
      } else {
        settingsMap.set(setting.department, setting);
      }
    }

    // 2. Obtener escalaciones pendientes o reconocidas
    const { data: escalations, error: escalationsError } = await supabase
      .from("escalations")
      .select(
        `
        *,
        escalated_user:users!escalations_escalated_to_fkey(id, name, phone, role, department),
        backup_user:users!escalations_backup_manager_id_fkey(id, name, phone, role, department)
      `,
      )
      .in("status", ["pending", "acknowledged"])
      .order("escalated_at", { ascending: true });

    if (escalationsError) {
      console.error(
        "[escalation-check] Error fetching escalations:",
        escalationsError,
      );
      return NextResponse.json(
        {
          error: "Error al obtener escalaciones",
          details: escalationsError.message,
        },
        { status: 500 },
      );
    }

    result.checked = escalations?.length || 0;

    // 3. Procesar cada escalacion
    for (const escalation of (escalations as EscalationWithManager[]) || []) {
      const escalatedAt = new Date(escalation.escalated_at);
      const minutesSinceEscalation =
        (now.getTime() - escalatedAt.getTime()) / (1000 * 60);

      // Obtener configuracion para este departamento
      const settings =
        settingsMap.get(escalation.department || "") || globalSettings;

      if (!settings) {
        result.errors.push(
          `Sin configuracion para departamento: ${escalation.department}`,
        );
        continue;
      }

      const lastReminderAt = escalation.last_reminder_at
        ? new Date(escalation.last_reminder_at)
        : null;
      const minutesSinceLastReminder = lastReminderAt
        ? (now.getTime() - lastReminderAt.getTime()) / (1000 * 60)
        : minutesSinceEscalation;

      // FASE 1: Primer recordatorio (default: 30 min)
      if (
        minutesSinceEscalation >= settings.first_reminder_minutes &&
        escalation.reminder_count === 0 &&
        escalation.status === "pending"
      ) {
        // Actualizar escalacion
        await supabase
          .from("escalations")
          .update({
            reminder_count: 1,
            last_reminder_at: now.toISOString(),
            priority:
              escalation.priority === "low" ? "normal" : escalation.priority,
            updated_at: now.toISOString(),
          })
          .eq("id", escalation.id);

        // Enviar recordatorio al manager asignado
        if (escalation.escalated_user?.phone) {
          await sendEscalationNotification(
            supabase,
            escalation,
            escalation.escalated_user.phone,
            escalation.escalated_user.id,
            "reminder",
            minutesSinceEscalation,
          );
          result.reminders_sent++;
        }
      }
      // FASE 2: Notificar backup manager (default: 60 min)
      else if (
        minutesSinceEscalation >= settings.backup_notify_minutes &&
        !escalation.backup_notified_at &&
        escalation.status === "pending"
      ) {
        // Buscar backup manager
        let backupManagerId = settings.backup_manager_id;
        let backupManagerPhone: string | null = null;

        if (backupManagerId) {
          const { data: backupManager } = await supabase
            .from("users")
            .select("id, phone")
            .eq("id", backupManagerId)
            .eq("is_active", true)
            .single();

          backupManagerPhone = backupManager?.phone || null;
        }

        // Si no hay backup configurado, buscar cualquier manager del departamento
        if (!backupManagerPhone) {
          const managers = await getDepartmentManagers(
            supabase,
            escalation.department,
          );
          const availableManager = managers.find(
            (m) => m.id !== escalation.escalated_to && m.phone && m.is_active,
          );
          if (availableManager) {
            backupManagerId = availableManager.id;
            backupManagerPhone = availableManager.phone;
          }
        }

        // Actualizar escalacion
        await supabase
          .from("escalations")
          .update({
            reminder_count: escalation.reminder_count + 1,
            backup_notified_at: now.toISOString(),
            backup_manager_id: backupManagerId,
            last_reminder_at: now.toISOString(),
            priority:
              escalation.priority === "normal" ? "high" : escalation.priority,
            updated_at: now.toISOString(),
          })
          .eq("id", escalation.id);

        // Enviar notificacion al backup
        if (backupManagerPhone && backupManagerId) {
          await sendEscalationNotification(
            supabase,
            escalation,
            backupManagerPhone,
            backupManagerId,
            "backup_notify",
            minutesSinceEscalation,
          );
          result.backup_notified++;
        }

        // Tambien re-notificar al primario
        if (escalation.escalated_user?.phone) {
          await sendEscalationNotification(
            supabase,
            escalation,
            escalation.escalated_user.phone,
            escalation.escalated_user.id,
            "reminder",
            minutesSinceEscalation,
          );
        }
      }
      // FASE 3: Marcar como critico y notificar a todos (default: 120 min)
      else if (
        minutesSinceEscalation >= settings.critical_escalation_minutes &&
        !escalation.all_managers_notified_at &&
        escalation.status === "pending"
      ) {
        // Actualizar a critico
        await supabase
          .from("escalations")
          .update({
            reminder_count: escalation.reminder_count + 1,
            priority: "critical",
            all_managers_notified_at: now.toISOString(),
            last_reminder_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", escalation.id);

        // Notificar a TODOS los managers
        const allManagers = await getDepartmentManagers(supabase, null);

        for (const manager of allManagers) {
          if (manager.phone) {
            await sendEscalationNotification(
              supabase,
              escalation,
              manager.phone,
              manager.id,
              "all_managers",
              minutesSinceEscalation,
            );
          }
        }

        result.critical_notified++;
      }
      // FASE 4: Auto-route despues de mucho tiempo (default: 180 min)
      else if (
        minutesSinceEscalation >= settings.auto_route_minutes &&
        escalation.status === "pending"
      ) {
        // Verificar si este tipo de checklist permite auto-aprobacion
        const sourceType = escalation.source_type;
        const autoApproveTypes = settings.auto_approve_types || [];

        if (
          settings.auto_approve_enabled &&
          sourceType &&
          autoApproveTypes.includes(sourceType)
        ) {
          // Auto-aprobar
          await supabase
            .from("escalations")
            .update({
              status: "resolved",
              resolved_at: now.toISOString(),
              auto_approved: true,
              auto_approve_reason: `Auto-aprobado despues de ${formatMinutes(Math.round(minutesSinceEscalation))} sin respuesta`,
              updated_at: now.toISOString(),
            })
            .eq("id", escalation.id);

          // Si es un checklist, tambien aprobarlo
          if (escalation.source === "checklist" && escalation.source_id) {
            await supabase
              .from("checklists")
              .update({
                status: "approved",
                approved_at: now.toISOString(),
                qc_notes: "Auto-aprobado por timeout de escalacion",
                updated_at: now.toISOString(),
              })
              .eq("id", escalation.source_id);
          }

          result.auto_routed++;
        } else {
          // Marcar como expired pero no resolver
          await supabase
            .from("escalations")
            .update({
              status: "auto_routed",
              updated_at: now.toISOString(),
            })
            .eq("id", escalation.id);

          result.auto_routed++;
        }
      }
      // RECORDATORIOS PERIODICOS (cada 30 min despues del primer recordatorio)
      else if (
        minutesSinceLastReminder >= 30 &&
        escalation.reminder_count > 0 &&
        escalation.status === "pending" &&
        !escalation.all_managers_notified_at
      ) {
        // Actualizar contador
        await supabase
          .from("escalations")
          .update({
            reminder_count: escalation.reminder_count + 1,
            last_reminder_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", escalation.id);

        // Enviar recordatorio
        if (escalation.escalated_user?.phone) {
          await sendEscalationNotification(
            supabase,
            escalation,
            escalation.escalated_user.phone,
            escalation.escalated_user.id,
            "reminder",
            minutesSinceEscalation,
          );
          result.reminders_sent++;
        }
      }
    }

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      ...result,
      duration_ms: duration,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[escalation-check] Fatal error:", error);
    return NextResponse.json(
      {
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Tambien soportar POST para trigger manual
export async function POST() {
  return GET();
}
