// ============================================
// AUTOMATED REVIEW REQUEST CRON (Issue 60)
// Daily job to send review requests to guests who checked out
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// This endpoint is called by Vercel Cron or external scheduler
// Schedule: Daily at 10:00 AM Cartagena time (15:00 UTC)

const REVIEW_MESSAGE_ES = `Hola {guest_name}!

Esperamos que hayas disfrutado tu estancia en Tiny Village Cartagena.

Tu opinion es muy importante para nosotros. Si disfrutaste tu experiencia, nos encantaria que compartieras tus comentarios:

{google_link}

Como agradecimiento, en tu proxima visita tendras un 10% de descuento en nuestro restaurante.

Gracias por elegirnos!
El equipo de TVC`;

const REVIEW_MESSAGE_EN = `Hi {guest_name}!

We hope you enjoyed your stay at Tiny Village Cartagena.

Your feedback is very important to us. If you enjoyed your experience, we'd love for you to share your thoughts:

{google_link}

As a thank you, on your next visit you'll receive 10% off at our restaurant.

Thank you for choosing us!
The TVC Team`;

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createServerClient() as SupabaseAny;
    const googleReviewLink =
      process.env.GOOGLE_REVIEW_LINK ||
      "https://g.page/r/tiny-village-cartagena/review";

    // Get yesterday's date (guests who checked out yesterday)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const checkOutDate = yesterday.toISOString().split("T")[0];

    // Find guests who checked out yesterday and haven't received a review request
    const { data: checkouts, error: checkoutsError } = await supabase
      .from("villa_bookings")
      .select("*")
      .eq("check_out", checkOutDate)
      .eq("status", "checked_out")
      .not("guest_phone", "is", null);

    if (checkoutsError) {
      console.error("[Review Cron] Checkouts fetch error:", checkoutsError);
      return NextResponse.json(
        { success: false, error: "Failed to fetch checkouts" },
        { status: 500 },
      );
    }

    if (!checkouts || checkouts.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No checkouts to process",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
      details: [] as { guest: string; status: string; error?: string }[],
    };

    for (const booking of checkouts) {
      results.processed++;

      // Check if we already sent a request to this guest
      const { data: existing } = await supabase
        .from("review_requests")
        .select("id")
        .eq("guest_phone", booking.guest_phone)
        .gte(
          "sent_at",
          new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        )
        .single();

      if (existing) {
        results.skipped++;
        results.details.push({
          guest: booking.guest_name,
          status: "skipped",
          error: "Already sent within 30 days",
        });
        continue;
      }

      // Create review request record
      const { data: reviewRequest, error: createError } = await supabase
        .from("review_requests")
        .insert({
          villa_booking_id: booking.id,
          guest_name: booking.guest_name,
          guest_phone: booking.guest_phone,
          guest_language: "es", // Default to Spanish
          check_out_date: checkOutDate,
          feedback_link: googleReviewLink,
          status: "pending",
        })
        .select()
        .single();

      if (createError) {
        results.failed++;
        results.details.push({
          guest: booking.guest_name,
          status: "failed",
          error: "Failed to create request record",
        });
        continue;
      }

      // Prepare and send message
      const message = REVIEW_MESSAGE_ES.replace(
        "{guest_name}",
        booking.guest_name || "estimado huesped",
      ).replace("{google_link}", googleReviewLink);

      try {
        const messageSid = await sendWhatsAppMessage(
          booking.guest_phone!,
          message,
        );

        // Update request status
        await supabase
          .from("review_requests")
          .update({
            sent_at: new Date().toISOString(),
            sent_via: "whatsapp",
            message_sid: messageSid,
            status: "sent",
          })
          .eq("id", reviewRequest.id);

        results.sent++;
        results.details.push({
          guest: booking.guest_name,
          status: "sent",
        });
      } catch (twilioError) {
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

        results.failed++;
        results.details.push({
          guest: booking.guest_name,
          status: "failed",
          error:
            twilioError instanceof Error ? twilioError.message : "Twilio error",
        });
      }
    }

    console.log(
      `[Review Cron] Completed: ${results.sent} sent, ${results.skipped} skipped, ${results.failed} failed`,
    );

    return NextResponse.json({
      success: true,
      message: `Processed ${results.processed} checkouts`,
      results,
    });
  } catch (error) {
    console.error("[Review Cron] Error:", error);
    return NextResponse.json(
      { success: false, error: "Cron job failed" },
      { status: 500 },
    );
  }
}

// GET for health check
export async function GET() {
  return NextResponse.json({
    status: "ok",
    job: "review-requests",
    schedule: "Daily at 10:00 AM Cartagena time",
  });
}
