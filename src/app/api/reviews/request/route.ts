// ============================================
// AUTOMATED REVIEW REQUEST API (Issue 60)
// Post-checkout WhatsApp with Google review link
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";

// Review request templates in Spanish
const REVIEW_TEMPLATES = {
  es: {
    subject: "Gracias por hospedarte en Tiny Village Cartagena!",
    body: `Hola {guest_name}!

Esperamos que hayas disfrutado tu estancia en Tiny Village Cartagena.

Tu opinion es muy importante para nosotros. Si disfrutaste tu experiencia, nos encantaria que compartieras tus comentarios:

{google_link}

Como agradecimiento, en tu proxima visita tendras un 10% de descuento en nuestro restaurante.

Gracias por elegirnos!
El equipo de TVC`,
  },
  en: {
    subject: "Thank you for staying at Tiny Village Cartagena!",
    body: `Hi {guest_name}!

We hope you enjoyed your stay at Tiny Village Cartagena.

Your feedback is very important to us. If you enjoyed your experience, we'd love for you to share your thoughts:

{google_link}

As a thank you, on your next visit you'll receive 10% off at our restaurant.

Thank you for choosing us!
The TVC Team`,
  },
};

// POST /api/reviews/request - Send review request to a guest
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      villa_booking_id,
      reservation_id,
      guest_name,
      guest_phone,
      guest_language = "es",
      scheduled_for,
    } = body;

    if (!guest_phone) {
      return NextResponse.json(
        { success: false, error: "Guest phone is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const googleReviewLink =
      process.env.GOOGLE_REVIEW_LINK ||
      "https://g.page/r/tiny-village-cartagena/review";

    // Check if we already sent a request to this guest recently
    const { data: existing } = await supabase
      .from("review_requests")
      .select("*")
      .eq("guest_phone", guest_phone)
      .gte(
        "sent_at",
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      )
      .single();

    if (existing) {
      return NextResponse.json(
        {
          success: false,
          error: "Review request already sent to this guest within 30 days",
        },
        { status: 400 },
      );
    }

    // Create review request record
    const { data: reviewRequest, error: createError } = await supabase
      .from("review_requests")
      .insert({
        villa_booking_id,
        reservation_id,
        guest_name: guest_name || "Estimado huesped",
        guest_phone,
        guest_language,
        scheduled_for: scheduled_for || new Date().toISOString(),
        feedback_link: googleReviewLink,
        status: "pending",
      })
      .select()
      .single();

    if (createError) {
      console.error("[Review Request] Create error:", createError);
      return NextResponse.json(
        { success: false, error: "Failed to create review request" },
        { status: 500 },
      );
    }

    // Prepare message
    const template =
      REVIEW_TEMPLATES[guest_language as keyof typeof REVIEW_TEMPLATES] ||
      REVIEW_TEMPLATES.es;
    const message = template.body
      .replace("{guest_name}", guest_name || "estimado huesped")
      .replace("{google_link}", googleReviewLink);

    // Send WhatsApp message
    try {
      const result = await sendWhatsAppMessage(guest_phone, message);

      if (!result.success) {
        throw new Error(result.error || "Failed to send WhatsApp message");
      }

      // Update request status
      await supabase
        .from("review_requests")
        .update({
          sent_at: new Date().toISOString(),
          sent_via: "whatsapp",
          message_sid: result.sid || null,
          status: "sent",
        })
        .eq("id", reviewRequest.id);

      return NextResponse.json({
        success: true,
        data: {
          id: reviewRequest.id,
          message_sid: result.sid,
          sent_at: new Date().toISOString(),
        },
        message: "Review request sent successfully",
      });
    } catch (twilioError) {
      console.error("[Review Request] Twilio error:", twilioError);

      // Update request with error
      await supabase
        .from("review_requests")
        .update({
          status: "failed",
          error_message:
            twilioError instanceof Error
              ? twilioError.message
              : "Unknown Twilio error",
        })
        .eq("id", reviewRequest.id);

      return NextResponse.json(
        { success: false, error: "Failed to send WhatsApp message" },
        { status: 500 },
      );
    }
  } catch (error) {
    console.error("[Review Request] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process review request" },
      { status: 500 },
    );
  }
}

// GET /api/reviews/request - Get review request stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createServerClient();

    let query = supabase
      .from("review_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // Calculate stats
    const stats = {
      total: data?.length || 0,
      sent: data?.filter((r) => r.status === "sent").length || 0,
      clicked: data?.filter((r) => r.status === "clicked").length || 0,
      reviewed: data?.filter((r) => r.status === "reviewed").length || 0,
      failed: data?.filter((r) => r.status === "failed").length || 0,
      conversion_rate:
        data && data.length > 0
          ? Math.round(
              (data.filter((r) => r.status === "reviewed").length /
                data.filter((r) => r.status === "sent").length) *
                100,
            ) || 0
          : 0,
    };

    return NextResponse.json({ success: true, data, stats });
  } catch (error) {
    console.error("[Review Request] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch review requests" },
      { status: 500 },
    );
  }
}
