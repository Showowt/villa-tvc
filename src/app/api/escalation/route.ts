import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";
import { z } from "zod";

// Schema para crear una nueva escalacion
const createEscalationSchema = z.object({
  source: z.enum([
    "staff_bot",
    "guest_bot",
    "system",
    "checklist",
    "maintenance",
  ]),
  source_id: z.string().uuid().optional(),
  source_type: z.string().optional(),
  reason: z.string().min(1),
  original_message: z.string().optional(),
  priority: z.enum(["low", "normal", "high", "critical"]).default("normal"),
  department: z
    .enum([
      "housekeeping",
      "kitchen",
      "maintenance",
      "pool",
      "management",
      "front_desk",
    ])
    .optional(),
  escalate_to_user_id: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

// Schema para reconocer escalacion
const acknowledgeSchema = z.object({
  escalation_id: z.string().uuid(),
  acknowledged_by: z.string().uuid().optional(),
});

// Schema para resolver escalacion
const resolveSchema = z.object({
  escalation_id: z.string().uuid(),
  resolved_by: z.string().uuid().optional(),
  resolution_notes: z.string().optional(),
});

// POST - Crear nueva escalacion
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = createEscalationSchema.parse(body);

    const supabase = createServerClient();
    const now = new Date();

    // Determinar a quien escalar
    let escalatedTo = validatedData.escalate_to_user_id;

    if (!escalatedTo && validatedData.department) {
      // Buscar manager principal del departamento
      const { data: delegationSetting } = await supabase
        .from("delegation_settings")
        .select("primary_manager_id")
        .eq("department", validatedData.department)
        .eq("is_active", true)
        .single();

      escalatedTo = delegationSetting?.primary_manager_id || undefined;
    }

    // Si no hay manager de departamento, buscar global
    if (!escalatedTo) {
      const { data: globalSetting } = await supabase
        .from("delegation_settings")
        .select("primary_manager_id")
        .is("department", null)
        .eq("is_active", true)
        .single();

      escalatedTo = globalSetting?.primary_manager_id || undefined;
    }

    // Si aun no hay manager, buscar cualquier owner o manager activo
    if (!escalatedTo) {
      const { data: anyManager } = await supabase
        .from("users")
        .select("id")
        .in("role", ["owner", "manager"])
        .eq("is_active", true)
        .limit(1)
        .single();

      escalatedTo = anyManager?.id;
    }

    // Crear la escalacion
    const { data: escalation, error } = await supabase
      .from("escalations")
      .insert({
        source: validatedData.source,
        source_id: validatedData.source_id || null,
        source_type: validatedData.source_type || null,
        reason: validatedData.reason,
        original_message: validatedData.original_message || null,
        priority: validatedData.priority,
        department: validatedData.department || null,
        escalated_to: escalatedTo || null,
        escalated_at: now.toISOString(),
        status: "pending",
        metadata: validatedData.metadata || {},
      })
      .select()
      .single();

    if (error) {
      console.error("[escalation] Error creating:", error);
      return NextResponse.json(
        { error: "Error al crear escalacion", details: error.message },
        { status: 500 },
      );
    }

    // Enviar notificacion inicial al manager asignado
    if (escalatedTo) {
      const { data: manager } = await supabase
        .from("users")
        .select("id, name, phone")
        .eq("id", escalatedTo)
        .single();

      if (manager?.phone) {
        const priorityEmoji =
          validatedData.priority === "critical"
            ? "🔴"
            : validatedData.priority === "high"
              ? "🟠"
              : validatedData.priority === "normal"
                ? "🟡"
                : "⚪";

        const message = `${priorityEmoji} NUEVA ESCALACION

Razon: ${validatedData.reason}
${validatedData.department ? `Departamento: ${validatedData.department}` : ""}
Prioridad: ${validatedData.priority.toUpperCase()}

${validatedData.original_message ? `"${validatedData.original_message.slice(0, 200)}${validatedData.original_message.length > 200 ? "..." : ""}"` : ""}

Responde "ACK ${escalation.id.slice(0, 8)}" para confirmar.`;

        try {
          const twilioSid = await sendWhatsAppMessage(manager.phone, message);

          // Registrar notificacion
          await supabase.from("escalation_notifications").insert({
            escalation_id: escalation.id,
            notification_type: "initial",
            sent_to: manager.id,
            sent_to_phone: manager.phone,
            channel: "whatsapp",
            twilio_sid: twilioSid,
            message_content: message,
            delivered_at: now.toISOString(),
          });
        } catch (notifyError) {
          console.error(
            "[escalation] Failed to send notification:",
            notifyError,
          );

          await supabase.from("escalation_notifications").insert({
            escalation_id: escalation.id,
            notification_type: "initial",
            sent_to: manager.id,
            sent_to_phone: manager.phone,
            channel: "whatsapp",
            failed_at: now.toISOString(),
            error_message:
              notifyError instanceof Error
                ? notifyError.message
                : "Unknown error",
            message_content: message,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      escalation,
      message: "Escalacion creada exitosamente",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[escalation] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// PATCH - Reconocer o resolver escalacion
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const action = body.action as "acknowledge" | "resolve";

    const supabase = createServerClient();
    const now = new Date();

    if (action === "acknowledge") {
      const validatedData = acknowledgeSchema.parse(body);

      const { data: escalation, error } = await supabase
        .from("escalations")
        .update({
          status: "acknowledged",
          acknowledged_at: now.toISOString(),
          acknowledged_by: validatedData.acknowledged_by || null,
          updated_at: now.toISOString(),
        })
        .eq("id", validatedData.escalation_id)
        .eq("status", "pending")
        .select()
        .single();

      if (error) {
        console.error("[escalation] Error acknowledging:", error);
        return NextResponse.json(
          { error: "Error al reconocer escalacion", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        escalation,
        message: "Escalacion reconocida",
      });
    }

    if (action === "resolve") {
      const validatedData = resolveSchema.parse(body);

      const { data: escalation, error } = await supabase
        .from("escalations")
        .update({
          status: "resolved",
          resolved_at: now.toISOString(),
          resolved_by: validatedData.resolved_by || null,
          resolution_notes: validatedData.resolution_notes || null,
          updated_at: now.toISOString(),
        })
        .eq("id", validatedData.escalation_id)
        .in("status", ["pending", "acknowledged"])
        .select()
        .single();

      if (error) {
        console.error("[escalation] Error resolving:", error);
        return NextResponse.json(
          { error: "Error al resolver escalacion", details: error.message },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        escalation,
        message: "Escalacion resuelta",
      });
    }

    return NextResponse.json(
      { error: "Accion no valida. Use 'acknowledge' o 'resolve'" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Datos invalidos", details: error.errors },
        { status: 400 },
      );
    }

    console.error("[escalation] Fatal error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// GET - Obtener estadisticas de escalaciones
export async function GET() {
  try {
    const supabase = createServerClient();
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const { data: escalations, error } = await supabase
      .from("escalations")
      .select("id, status, priority, escalated_at, resolved_at, department");

    if (error) {
      return NextResponse.json(
        { error: "Error al obtener estadisticas" },
        { status: 500 },
      );
    }

    const pending = escalations?.filter((e) => e.status === "pending") || [];
    const acknowledged =
      escalations?.filter((e) => e.status === "acknowledged") || [];
    const resolvedToday =
      escalations?.filter(
        (e) =>
          e.status === "resolved" &&
          e.resolved_at &&
          new Date(e.resolved_at) >= todayStart,
      ) || [];
    const critical =
      escalations?.filter(
        (e) => e.priority === "critical" && e.status === "pending",
      ) || [];
    const overdue = pending.filter((e) => {
      const escalatedAt = new Date(e.escalated_at);
      return now.getTime() - escalatedAt.getTime() > 60 * 60 * 1000;
    });

    // Por departamento
    const byDepartment = pending.reduce(
      (acc, e) => {
        const dept = e.department || "general";
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return NextResponse.json({
      total_pending: pending.length,
      total_acknowledged: acknowledged.length,
      total_resolved_today: resolvedToday.length,
      critical_count: critical.length,
      overdue_count: overdue.length,
      by_department: byDepartment,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[escalation] Error getting stats:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
