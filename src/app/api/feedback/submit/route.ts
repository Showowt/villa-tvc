// ============================================
// FEEDBACK SUBMISSION API (Issue #77)
// Submit guest feedback and trigger automation
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";
import { sendWhatsAppMessage, isTwilioAvailable } from "@/lib/twilio/client";

// Validation schema
const submitSchema = z.object({
  token: z.string().min(1),
  overall_rating: z.number().int().min(1).max(5),
  nps_score: z.number().int().min(0).max(10).nullable().optional(),
  comment: z.string().nullable().optional(),
});

// Akil's WhatsApp for low-rating alerts
const AKIL_PHONE =
  process.env.TVC_OWNER_WHATSAPP || process.env.TVC_STAFF_WHATSAPP;
const GOOGLE_REVIEW_LINK =
  process.env.GOOGLE_REVIEW_LINK ||
  "https://g.page/r/tiny-village-cartagena/review";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = submitSchema.parse(body);

    const supabase = createServerClient();

    // Find feedback record by token
    const { data: feedback, error: lookupError } = await supabase
      .from("guest_feedback")
      .select("id, guest_name, guest_phone, booking_id, submitted_at")
      .eq("review_link_token", validated.token)
      .single();

    if (lookupError || !feedback) {
      return NextResponse.json(
        { success: false, error: "Token invalido o expirado" },
        { status: 404 },
      );
    }

    // Check if already submitted
    if (feedback.submitted_at) {
      return NextResponse.json(
        { success: false, error: "Este feedback ya fue enviado" },
        { status: 400 },
      );
    }

    // Update feedback with ratings
    const { error: updateError } = await supabase
      .from("guest_feedback")
      .update({
        overall_rating: validated.overall_rating,
        nps_score: validated.nps_score || null,
        comment: validated.comment || null,
        submitted_at: new Date().toISOString(),
        follow_up_sent: true,
      })
      .eq("id", feedback.id);

    if (updateError) {
      console.error("[Feedback Submit] Update error:", updateError);
      return NextResponse.json(
        { success: false, error: "Error al guardar feedback" },
        { status: 500 },
      );
    }

    // Log automation action
    await supabase.from("feedback_automation_log").insert({
      feedback_id: feedback.id,
      booking_id: feedback.booking_id,
      guest_name: feedback.guest_name,
      guest_phone: feedback.guest_phone,
      action_type: "feedback_received",
      action_details: {
        overall_rating: validated.overall_rating,
        nps_score: validated.nps_score,
        has_comment: !!validated.comment,
      },
      status: "success",
    });

    // ─────────────────────────────────────────────────────────────
    // AUTOMATION LOGIC
    // ─────────────────────────────────────────────────────────────

    let googleReviewRequested = false;
    let alertSentToAkil = false;

    // HIGH RATING (4-5 stars): Send Google Review request
    if (
      validated.overall_rating >= 4 &&
      feedback.guest_phone &&
      isTwilioAvailable()
    ) {
      const googleMessage = `Hola ${feedback.guest_name || ""}!

Nos alegra que haya disfrutado su estancia en Tiny Village Cartagena! 🏝️

Si tiene un momento, nos encantaria que compartiera su experiencia en Google. Su opinion ayuda a otros viajeros a descubrir nuestro paraiso:

${GOOGLE_REVIEW_LINK}

Gracias por elegirnos! Esperamos verle pronto.

El equipo de TVC`;

      const sendResult = await sendWhatsAppMessage(
        feedback.guest_phone,
        googleMessage,
      );

      if (sendResult.success) {
        googleReviewRequested = true;

        // Update feedback record
        await supabase
          .from("guest_feedback")
          .update({
            google_review_requested: true,
            google_review_requested_at: new Date().toISOString(),
          })
          .eq("id", feedback.id);

        // Log action
        await supabase.from("feedback_automation_log").insert({
          feedback_id: feedback.id,
          booking_id: feedback.booking_id,
          guest_name: feedback.guest_name,
          guest_phone: feedback.guest_phone,
          action_type: "google_review_sent",
          action_details: {
            message_sid: sendResult.sid,
            google_link: GOOGLE_REVIEW_LINK,
          },
          status: "success",
        });
      }
    }

    // LOW RATING (1-2 stars): Alert Akil for follow-up
    if (validated.overall_rating <= 2 && AKIL_PHONE && isTwilioAvailable()) {
      const alertMessage = `⚠️ ALERTA: FEEDBACK NEGATIVO

Huesped: ${feedback.guest_name || "Desconocido"}
Telefono: ${feedback.guest_phone || "No disponible"}
Calificacion: ${"⭐".repeat(validated.overall_rating)}
${validated.nps_score !== null && validated.nps_score !== undefined ? `NPS: ${validated.nps_score}/10` : ""}

${validated.comment ? `Comentario:\n"${validated.comment}"` : "Sin comentario"}

Por favor contacta al huesped para resolver cualquier problema.`;

      const sendResult = await sendWhatsAppMessage(AKIL_PHONE, alertMessage);

      if (sendResult.success) {
        alertSentToAkil = true;

        // Update feedback record
        await supabase
          .from("guest_feedback")
          .update({
            alert_sent_to_akil: true,
            alert_sent_at: new Date().toISOString(),
            follow_up_action: "pending_akil_contact",
          })
          .eq("id", feedback.id);

        // Log action
        await supabase.from("feedback_automation_log").insert({
          feedback_id: feedback.id,
          booking_id: feedback.booking_id,
          guest_name: feedback.guest_name,
          guest_phone: feedback.guest_phone,
          action_type: "akil_alert_sent",
          action_details: {
            rating: validated.overall_rating,
            message_sid: sendResult.sid,
            comment_preview: validated.comment?.substring(0, 100) || null,
          },
          status: "success",
        });
      }
    }

    // MEDIUM RATING (3 stars): Log for review, no immediate action
    if (validated.overall_rating === 3) {
      await supabase.from("feedback_automation_log").insert({
        feedback_id: feedback.id,
        booking_id: feedback.booking_id,
        guest_name: feedback.guest_name,
        guest_phone: feedback.guest_phone,
        action_type: "feedback_received",
        action_details: {
          rating: validated.overall_rating,
          action: "logged_for_review",
          reason: "Medium rating - no automated follow-up",
        },
        status: "success",
      });
    }

    return NextResponse.json({
      success: true,
      message:
        validated.overall_rating >= 4
          ? "Gracias por su excelente calificacion!"
          : "Gracias por su feedback. Lo tomaremos en cuenta.",
      google_review_link:
        validated.overall_rating >= 4 ? GOOGLE_REVIEW_LINK : null,
      actions: {
        google_review_requested: googleReviewRequested,
        alert_sent_to_akil: alertSentToAkil,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Datos invalidos", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[Feedback Submit] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar feedback" },
      { status: 500 },
    );
  }
}
