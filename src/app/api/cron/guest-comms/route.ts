import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// ============================================
// GUEST COMMUNICATIONS CRON JOB
// Runs every 5-15 minutes via Vercel Cron
// Sends scheduled WhatsApp messages to guests
// ============================================

// Types for communication records
interface GuestCommunication {
  id: string;
  booking_id: string | null;
  reservation_id: string | null;
  communication_type: string;
  status: string;
  scheduled_for: string;
  message_template: string;
  guest_phone: string;
  guest_name: string | null;
  guest_language: string;
}

interface VillaBooking {
  villa_id: string;
  check_in: string;
  check_out: string;
  guest_name: string;
}

// Variable replacements for templates
function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | null>,
): string {
  let result = template;
  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, "g"), String(value ?? ""));
  }
  return result;
}

// Get nights between two dates
function getNights(checkIn: string, checkOut: string): number {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export async function GET(request: Request) {
  // Verify cron secret for security
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // In development, allow without secret
  if (
    process.env.NODE_ENV === "production" &&
    cronSecret &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServerClient() as SupabaseAny;
  const results = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [] as string[],
  };

  try {
    // Get all scheduled communications that are due
    const now = new Date().toISOString();
    const { data: communications, error: fetchError } = await supabase
      .from("guest_communications")
      .select("*")
      .eq("status", "scheduled")
      .lte("scheduled_for", now)
      .order("scheduled_for", { ascending: true })
      .limit(50); // Process max 50 per run to avoid timeout

    if (fetchError) {
      console.error("[GuestComms] Error fetching communications:", fetchError);
      return NextResponse.json(
        {
          error: "Failed to fetch communications",
          details: fetchError.message,
        },
        { status: 500 },
      );
    }

    if (!communications || communications.length === 0) {
      return NextResponse.json({
        message: "No scheduled communications to process",
        ...results,
      });
    }

    console.log(
      `[GuestComms] Processing ${communications.length} scheduled communications`,
    );

    // Process each communication
    for (const comm of communications as GuestCommunication[]) {
      results.processed++;

      // Skip if no phone number
      if (!comm.guest_phone) {
        results.skipped++;
        await supabase
          .from("guest_communications")
          .update({
            status: "skipped",
            error_message: "No phone number provided",
          })
          .eq("id", comm.id);
        continue;
      }

      try {
        // Get booking details for variable replacement
        let booking: VillaBooking | null = null;
        if (comm.booking_id) {
          const { data } = await supabase
            .from("villa_bookings")
            .select("villa_id, check_in, check_out, guest_name")
            .eq("id", comm.booking_id)
            .single();
          booking = data;
        }

        // Build variables for template
        const variables: Record<string, string | number | null> = {
          guest_name: comm.guest_name || "Guest",
          villa_name: booking?.villa_id || "your villa",
          check_in: booking?.check_in
            ? new Date(booking.check_in).toLocaleDateString()
            : "",
          check_out: booking?.check_out
            ? new Date(booking.check_out).toLocaleDateString()
            : "",
          nights:
            booking?.check_in && booking?.check_out
              ? getNights(booking.check_in, booking.check_out)
              : "",
          review_link: "https://g.page/r/CfE5x-TinyVillageCartagena/review",
          rebooking_link: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
          loyalty_discount: "10", // Default, can be customized
        };

        // Replace variables in template
        const message = replaceTemplateVariables(
          comm.message_template,
          variables,
        );

        // Send WhatsApp message
        const messageSid = await sendWhatsAppMessage(comm.guest_phone, message);

        // Update communication as sent
        await supabase
          .from("guest_communications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_sent: message,
            twilio_sid: messageSid,
          })
          .eq("id", comm.id);

        results.sent++;
        console.log(
          `[GuestComms] Sent ${comm.communication_type} to ${comm.guest_phone}`,
        );
      } catch (sendError) {
        results.failed++;
        const errorMessage =
          sendError instanceof Error ? sendError.message : "Unknown error";
        results.errors.push(
          `Failed to send ${comm.communication_type} to ${comm.guest_phone}: ${errorMessage}`,
        );

        // Update communication as failed
        await supabase
          .from("guest_communications")
          .update({
            status: "failed",
            error_message: errorMessage,
          })
          .eq("id", comm.id);

        console.error(
          `[GuestComms] Failed to send to ${comm.guest_phone}:`,
          sendError,
        );
      }
    }

    // Also check for mid-stay check-in responses that need follow-up
    await processMidStayResponses(supabase);

    return NextResponse.json({
      message: `Processed ${results.processed} communications`,
      ...results,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[GuestComms] Cron job error:", error);
    return NextResponse.json(
      {
        error: "Cron job failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

// Process responses to mid-stay check-ins that need staff attention
async function processMidStayResponses(supabase: SupabaseAny) {
  // Find mid-stay check-ins with responses that haven't been handled
  const { data: pendingResponses } = await supabase
    .from("guest_communications")
    .select("*")
    .eq("communication_type", "mid_stay_checkin")
    .eq("requires_followup", true)
    .eq("followup_handled", false)
    .not("response_received", "is", null);

  if (!pendingResponses || pendingResponses.length === 0) {
    return;
  }

  // Notify staff about pending responses
  const staffPhone = process.env.TVC_STAFF_WHATSAPP;
  if (!staffPhone) {
    console.error("[GuestComms] TVC_STAFF_WHATSAPP not configured");
    return;
  }

  for (const response of pendingResponses) {
    const notification = `📬 GUEST RESPONSE - Mid-Stay Check-in

Guest: ${response.guest_name || "Unknown"}
Phone: ${response.guest_phone}

Their response:
"${response.response_received}"

Please follow up with this guest.`;

    try {
      await sendWhatsAppMessage(staffPhone, notification);

      // Mark as handled (staff has been notified)
      await supabase
        .from("guest_communications")
        .update({ followup_handled: true })
        .eq("id", response.id);

      console.log(
        `[GuestComms] Notified staff about response from ${response.guest_phone}`,
      );
    } catch (error) {
      console.error("[GuestComms] Failed to notify staff:", error);
    }
  }
}

// POST endpoint for manual trigger or webhook from Twilio for responses
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, phone, message } = body;

    const supabase = createServerClient() as SupabaseAny;

    if (action === "record_response") {
      // Record a guest's response to a communication
      const { data: latestComm } = await supabase
        .from("guest_communications")
        .select("*")
        .eq("guest_phone", phone)
        .eq("status", "sent")
        .order("sent_at", { ascending: false })
        .limit(1)
        .single();

      if (latestComm) {
        await supabase
          .from("guest_communications")
          .update({
            response_received: message,
            response_at: new Date().toISOString(),
            requires_followup: true,
          })
          .eq("id", latestComm.id);

        return NextResponse.json({
          success: true,
          communication_id: latestComm.id,
        });
      }
    }

    if (action === "schedule_for_booking") {
      // Manually schedule communications for a booking
      const { booking_id } = body;

      const { data } = await supabase.rpc("schedule_guest_communications", {
        p_booking_id: booking_id,
      });

      return NextResponse.json({
        success: true,
        communications_scheduled: data,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("[GuestComms] POST error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 },
    );
  }
}
