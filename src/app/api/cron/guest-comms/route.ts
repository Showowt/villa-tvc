// ============================================
// GUEST COMMUNICATIONS CRON JOB
// Issues #13, #14, #15 — Complete Guest Journey
// Pre-arrival, Mid-stay, Post-checkout Flow
// ============================================
// Runs daily at 9 AM via Vercel Cron
// Schedules and sends WhatsApp messages to guests
// ============================================

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage } from "@/lib/twilio/client";
import {
  MESSAGE_TEMPLATES,
  replaceTemplateVariables,
  getLocalizedMessage,
  formatWeatherForMessage,
  getDefaultBoatTime,
  formatOccasionType,
} from "@/lib/guest-messaging";
import type { Database } from "@/types/database";

type CommunicationType = Database["public"]["Enums"]["communication_type"];
type CommunicationStatus = Database["public"]["Enums"]["communication_status"];
type OccasionType = Database["public"]["Enums"]["occasion_type"];
type Language = "en" | "es" | "fr";

// ============================================
// TYPES
// ============================================

interface GuestCommunication {
  id: string;
  booking_id: string | null;
  reservation_id: string | null;
  communication_type: CommunicationType;
  status: CommunicationStatus;
  scheduled_for: string;
  message_template: string;
  guest_phone: string;
  guest_name: string | null;
  guest_language: string;
}

interface Reservation {
  id: string;
  guest_name: string;
  guest_phone: string | null;
  guest_email: string | null;
  check_in: string;
  check_out: string;
  guests_count: number;
  language: string | null;
  villas: unknown;
  status: string | null;
}

interface SpecialOccasion {
  id: string;
  reservation_id: string | null;
  guest_name: string;
  occasion_type: OccasionType;
  occasion_date: string | null;
}

interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  description: string;
  description_es: string;
  rain_probability: number;
}

interface CronResults {
  scheduled: number;
  sent: number;
  failed: number;
  skipped: number;
  errors: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function parseLanguage(lang: string | null): Language {
  if (lang === "es" || lang === "spanish") return "es";
  if (lang === "fr" || lang === "french") return "fr";
  return "en";
}

function getDaysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getVillaName(villas: unknown): string {
  if (!villas) return "your villa";
  if (Array.isArray(villas) && villas.length > 0) {
    return villas.join(", ");
  }
  if (typeof villas === "object") {
    const villaObj = villas as Record<string, unknown>;
    return Object.keys(villaObj).join(", ") || "your villa";
  }
  return String(villas);
}

// ============================================
// MAIN CRON HANDLER
// ============================================

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

  const supabase = createServerClient();
  const results: CronResults = {
    scheduled: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    errors: [],
  };

  const now = new Date();
  const today = now.toISOString().split("T")[0];

  try {
    console.log("[GuestComms] Starting cron job...");

    // ============================================
    // STEP 1: SCHEDULE NEW COMMUNICATIONS
    // ============================================
    await scheduleNewCommunications(supabase, results, now, today);

    // ============================================
    // STEP 2: SEND SCHEDULED COMMUNICATIONS
    // ============================================
    await sendScheduledCommunications(supabase, results, now);

    // ============================================
    // STEP 3: PROCESS MID-STAY RESPONSES
    // ============================================
    await processMidStayResponses(supabase);

    // ============================================
    // STEP 4: CHECK FOR SPECIAL OCCASIONS
    // ============================================
    await scheduleSpecialOccasionMessages(supabase, results, today);

    console.log(
      `[GuestComms] Completed: scheduled=${results.scheduled}, sent=${results.sent}, failed=${results.failed}, skipped=${results.skipped}`,
    );

    return NextResponse.json({
      success: true,
      message: "Guest communications cron completed",
      ...results,
      timestamp: now.toISOString(),
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

// ============================================
// SCHEDULE NEW COMMUNICATIONS
// ============================================

async function scheduleNewCommunications(
  supabase: ReturnType<typeof createServerClient>,
  results: CronResults,
  now: Date,
  today: string,
): Promise<void> {
  // Get reservations that need communications scheduled
  const { data: reservations, error: resError } = await supabase
    .from("reservations")
    .select("*")
    .in("status", ["confirmed", "checked_in"])
    .not("guest_phone", "is", null);

  if (resError) {
    console.error("[GuestComms] Error fetching reservations:", resError);
    results.errors.push(`Reservation fetch error: ${resError.message}`);
    return;
  }

  if (!reservations || reservations.length === 0) {
    console.log("[GuestComms] No reservations to process");
    return;
  }

  console.log(`[GuestComms] Processing ${reservations.length} reservations`);

  // Fetch weather forecast for pre-arrival messages
  let weatherForecast: WeatherDay[] = [];
  try {
    const { data: weather } = await supabase
      .from("weather_cache")
      .select("data")
      .eq("location", "cartagena")
      .gte("forecast_date", today)
      .order("forecast_date")
      .limit(5);

    if (weather) {
      weatherForecast = weather.map((w) => w.data as WeatherDay);
    }
  } catch {
    console.log("[GuestComms] Weather data unavailable");
  }

  for (const reservation of reservations as Reservation[]) {
    const checkIn = new Date(reservation.check_in);
    const checkOut = new Date(reservation.check_out);
    const language = parseLanguage(reservation.language);
    const guestPhone = reservation.guest_phone;

    if (!guestPhone) continue;

    const daysUntilCheckIn = getDaysBetween(now, checkIn);
    const daysUntilCheckOut = getDaysBetween(now, checkOut);
    const daysSinceCheckIn = getDaysBetween(checkIn, now);
    const daysSinceCheckOut = getDaysBetween(checkOut, now);

    // Build variable map for this reservation
    const baseVariables: Record<string, string | number | null> = {
      guest_name: reservation.guest_name,
      check_in: checkIn.toLocaleDateString(),
      check_out: checkOut.toLocaleDateString(),
      villa_name: getVillaName(reservation.villas),
      guests_count: reservation.guests_count,
      boat_time: getDefaultBoatTime(true),
      weather_forecast: formatWeatherForMessage(weatherForecast, language),
      review_link: "https://g.page/r/CfE5x-TinyVillageCartagena/review",
      rebooking_link: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
      loyalty_discount: 10,
    };

    // Determine which communications to schedule based on timing
    const communicationsToSchedule: Array<{
      type: CommunicationType;
      scheduledFor: Date;
    }> = [];

    // PRE-ARRIVAL: 7 days before
    if (daysUntilCheckIn === 7) {
      communicationsToSchedule.push({
        type: "pre_arrival_7_days",
        scheduledFor: new Date(now.setHours(9, 0, 0, 0)),
      });
    }

    // PRE-ARRIVAL: 1 day before
    if (daysUntilCheckIn === 1) {
      communicationsToSchedule.push({
        type: "pre_arrival_1_day",
        scheduledFor: new Date(now.setHours(9, 0, 0, 0)),
      });
    }

    // DAY OF ARRIVAL
    if (daysUntilCheckIn === 0 && now.getHours() < 12) {
      communicationsToSchedule.push({
        type: "day_of_arrival",
        scheduledFor: new Date(now.setHours(7, 0, 0, 0)),
      });
    }

    // MID-STAY CHECK-IN: Day 2 of stay
    if (
      reservation.status === "checked_in" &&
      daysSinceCheckIn === 2 &&
      daysUntilCheckOut > 0
    ) {
      communicationsToSchedule.push({
        type: "mid_stay_checkin",
        scheduledFor: new Date(now.setHours(10, 0, 0, 0)),
      });
    }

    // CHECKOUT DAY
    if (daysUntilCheckOut === 0 && now.getHours() < 8) {
      baseVariables.boat_time = getDefaultBoatTime(false);
      communicationsToSchedule.push({
        type: "checkout_thank_you",
        scheduledFor: new Date(now.setHours(7, 0, 0, 0)),
      });
    }

    // POST-CHECKOUT: 1 day after (review request)
    if (daysSinceCheckOut === 1) {
      communicationsToSchedule.push({
        type: "post_checkout_photos",
        scheduledFor: new Date(now.setHours(10, 0, 0, 0)),
      });
    }

    // POST-CHECKOUT: 30 days after (rebooking offer)
    if (daysSinceCheckOut === 30) {
      communicationsToSchedule.push({
        type: "post_checkout_rebooking",
        scheduledFor: new Date(now.setHours(10, 0, 0, 0)),
      });
    }

    // POST-CHECKOUT: 45 days after (referral request)
    if (daysSinceCheckOut === 45) {
      communicationsToSchedule.push({
        type: "post_checkout_referral",
        scheduledFor: new Date(now.setHours(10, 0, 0, 0)),
      });
    }

    // Schedule each communication
    for (const comm of communicationsToSchedule) {
      try {
        // Check if already scheduled
        const { data: existing } = await supabase
          .from("guest_communications")
          .select("id")
          .eq("reservation_id", reservation.id)
          .eq("communication_type", comm.type)
          .in("status", ["scheduled", "sent"])
          .single();

        if (existing) {
          console.log(
            `[GuestComms] ${comm.type} already scheduled for ${reservation.guest_name}`,
          );
          continue;
        }

        // Get template
        const template = MESSAGE_TEMPLATES[comm.type];
        const messageTemplate = getLocalizedMessage(comm.type, language);

        // Insert scheduled communication
        const { error: insertError } = await supabase
          .from("guest_communications")
          .insert({
            reservation_id: reservation.id,
            communication_type: comm.type,
            status: "scheduled",
            scheduled_for: comm.scheduledFor.toISOString(),
            message_template: messageTemplate,
            guest_phone: guestPhone,
            guest_name: reservation.guest_name,
            guest_language: language,
          });

        if (insertError) {
          console.error(
            `[GuestComms] Error scheduling ${comm.type}:`,
            insertError,
          );
          results.errors.push(
            `Schedule error for ${reservation.guest_name}: ${insertError.message}`,
          );
        } else {
          results.scheduled++;
          console.log(
            `[GuestComms] Scheduled ${comm.type} for ${reservation.guest_name}`,
          );
        }
      } catch (error) {
        console.error(`[GuestComms] Error processing ${comm.type}:`, error);
      }
    }
  }
}

// ============================================
// SEND SCHEDULED COMMUNICATIONS
// ============================================

async function sendScheduledCommunications(
  supabase: ReturnType<typeof createServerClient>,
  results: CronResults,
  now: Date,
): Promise<void> {
  // Get all scheduled communications that are due
  const { data: communications, error: fetchError } = await supabase
    .from("guest_communications")
    .select("*")
    .eq("status", "scheduled")
    .lte("scheduled_for", now.toISOString())
    .order("scheduled_for", { ascending: true })
    .limit(50); // Process max 50 per run to avoid timeout

  if (fetchError) {
    console.error("[GuestComms] Error fetching communications:", fetchError);
    results.errors.push(`Fetch error: ${fetchError.message}`);
    return;
  }

  if (!communications || communications.length === 0) {
    console.log("[GuestComms] No scheduled communications to send");
    return;
  }

  console.log(
    `[GuestComms] Processing ${communications.length} scheduled communications`,
  );

  // Fetch weather for variable replacement
  let weatherForecast: WeatherDay[] = [];
  try {
    const today = now.toISOString().split("T")[0];
    const { data: weather } = await supabase
      .from("weather_cache")
      .select("data")
      .eq("location", "cartagena")
      .gte("forecast_date", today)
      .order("forecast_date")
      .limit(5);

    if (weather) {
      weatherForecast = weather.map((w) => w.data as WeatherDay);
    }
  } catch {
    console.log(
      "[GuestComms] Weather data unavailable for variable replacement",
    );
  }

  for (const comm of communications as GuestCommunication[]) {
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
      // Get reservation details for variable replacement
      let reservation: Reservation | null = null;
      if (comm.reservation_id) {
        const { data } = await supabase
          .from("reservations")
          .select("*")
          .eq("id", comm.reservation_id)
          .single();
        reservation = data as Reservation | null;
      }

      // Build variables for template
      const language = parseLanguage(comm.guest_language);
      const variables: Record<string, string | number | null> = {
        guest_name: comm.guest_name || "Guest",
        villa_name: reservation
          ? getVillaName(reservation.villas)
          : "your villa",
        check_in: reservation
          ? new Date(reservation.check_in).toLocaleDateString()
          : "",
        check_out: reservation
          ? new Date(reservation.check_out).toLocaleDateString()
          : "",
        guests_count: reservation?.guests_count || "",
        boat_time: comm.communication_type.includes("checkout")
          ? getDefaultBoatTime(false)
          : getDefaultBoatTime(true),
        weather_forecast: formatWeatherForMessage(weatherForecast, language),
        review_link: "https://g.page/r/CfE5x-TinyVillageCartagena/review",
        rebooking_link: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
        loyalty_discount: 10,
      };

      // Replace variables in template
      const message = replaceTemplateVariables(
        comm.message_template,
        variables,
      );

      // Send WhatsApp message
      const sendResult = await sendWhatsAppMessage(comm.guest_phone, message);

      if (sendResult.success) {
        // Update communication as sent
        await supabase
          .from("guest_communications")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            message_sent: message,
            twilio_sid: sendResult.sid,
          })
          .eq("id", comm.id);

        results.sent++;
        console.log(
          `[GuestComms] Sent ${comm.communication_type} to ${comm.guest_phone}`,
        );
      } else {
        throw new Error(sendResult.error || "Unknown send error");
      }
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
}

// ============================================
// PROCESS MID-STAY RESPONSES
// ============================================

async function processMidStayResponses(
  supabase: ReturnType<typeof createServerClient>,
): Promise<void> {
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

  console.log(
    `[GuestComms] Processing ${pendingResponses.length} mid-stay responses`,
  );

  // Notify staff about pending responses
  const staffPhone = process.env.TVC_STAFF_WHATSAPP;
  if (!staffPhone) {
    console.error("[GuestComms] TVC_STAFF_WHATSAPP not configured");
    return;
  }

  for (const response of pendingResponses) {
    const notification = `GUEST RESPONSE - Mid-Stay Check-in

Guest: ${response.guest_name || "Unknown"}
Phone: ${response.guest_phone}

Their response:
"${response.response_received}"

Please follow up with this guest directly.`;

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

// ============================================
// SCHEDULE SPECIAL OCCASION MESSAGES
// ============================================

async function scheduleSpecialOccasionMessages(
  supabase: ReturnType<typeof createServerClient>,
  results: CronResults,
  today: string,
): Promise<void> {
  // Find special occasions coming up in 3 days
  const threeDaysFromNow = new Date();
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);
  const targetDate = threeDaysFromNow.toISOString().split("T")[0];

  const { data: occasions } = await supabase
    .from("special_occasions")
    .select("*, reservations(guest_phone, language, guest_name)")
    .gte("occasion_date", today)
    .lte("occasion_date", targetDate);

  if (!occasions || occasions.length === 0) {
    return;
  }

  console.log(
    `[GuestComms] Found ${occasions.length} upcoming special occasions`,
  );

  for (const occasion of occasions as (SpecialOccasion & {
    reservations: {
      guest_phone: string | null;
      language: string | null;
      guest_name: string;
    } | null;
  })[]) {
    if (!occasion.reservations?.guest_phone) continue;

    // Check if already scheduled
    const { data: existing } = await supabase
      .from("guest_communications")
      .select("id")
      .eq("reservation_id", occasion.reservation_id)
      .eq("communication_type", "special_occasion")
      .in("status", ["scheduled", "sent"])
      .single();

    if (existing) continue;

    const language = parseLanguage(occasion.reservations.language);
    const messageTemplate = getLocalizedMessage("special_occasion", language);

    // Replace occasion type
    const variables: Record<string, string> = {
      guest_name: occasion.guest_name,
      occasion_type: formatOccasionType(occasion.occasion_type, language),
    };
    const template = replaceTemplateVariables(messageTemplate, variables);

    // Schedule for 10 AM
    const scheduledFor = new Date();
    scheduledFor.setHours(10, 0, 0, 0);

    const { error: insertError } = await supabase
      .from("guest_communications")
      .insert({
        reservation_id: occasion.reservation_id,
        communication_type: "special_occasion",
        status: "scheduled",
        scheduled_for: scheduledFor.toISOString(),
        message_template: template,
        guest_phone: occasion.reservations.guest_phone,
        guest_name: occasion.guest_name,
        guest_language: language,
      });

    if (!insertError) {
      results.scheduled++;
      console.log(
        `[GuestComms] Scheduled special occasion message for ${occasion.guest_name}`,
      );
    }
  }
}

// ============================================
// POST HANDLER - Manual Actions
// ============================================

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, phone, message, reservation_id } = body;

    const supabase = createServerClient();

    // Record a guest's response to a communication
    if (action === "record_response") {
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

      return NextResponse.json({
        success: false,
        error: "No recent communication found",
      });
    }

    // Manually schedule communications for a reservation
    if (action === "schedule_for_reservation" && reservation_id) {
      // Get reservation
      const { data: reservation, error: resError } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservation_id)
        .single();

      if (resError || !reservation) {
        return NextResponse.json(
          { error: "Reservation not found" },
          { status: 404 },
        );
      }

      if (!reservation.guest_phone) {
        return NextResponse.json(
          { error: "Reservation has no phone number" },
          { status: 400 },
        );
      }

      const language = parseLanguage(reservation.language);
      const checkIn = new Date(reservation.check_in);
      const checkOut = new Date(reservation.check_out);
      const now = new Date();

      const typesToSchedule: Array<{
        type: CommunicationType;
        scheduledFor: Date;
      }> = [];

      // Calculate which messages to schedule based on dates
      const daysUntilCheckIn = getDaysBetween(now, checkIn);
      const daysUntilCheckOut = getDaysBetween(now, checkOut);

      if (daysUntilCheckIn > 7) {
        const date = new Date(checkIn);
        date.setDate(date.getDate() - 7);
        date.setHours(9, 0, 0, 0);
        typesToSchedule.push({
          type: "pre_arrival_7_days",
          scheduledFor: date,
        });
      }

      if (daysUntilCheckIn > 1) {
        const date = new Date(checkIn);
        date.setDate(date.getDate() - 1);
        date.setHours(9, 0, 0, 0);
        typesToSchedule.push({ type: "pre_arrival_1_day", scheduledFor: date });
      }

      if (daysUntilCheckIn >= 0) {
        const date = new Date(checkIn);
        date.setHours(7, 0, 0, 0);
        typesToSchedule.push({ type: "day_of_arrival", scheduledFor: date });
      }

      // Mid-stay (day 2)
      const midStayDate = new Date(checkIn);
      midStayDate.setDate(midStayDate.getDate() + 2);
      midStayDate.setHours(10, 0, 0, 0);
      if (midStayDate < checkOut && midStayDate > now) {
        typesToSchedule.push({
          type: "mid_stay_checkin",
          scheduledFor: midStayDate,
        });
      }

      // Checkout day
      const checkoutDate = new Date(checkOut);
      checkoutDate.setHours(7, 0, 0, 0);
      typesToSchedule.push({
        type: "checkout_thank_you",
        scheduledFor: checkoutDate,
      });

      // Post-checkout
      const reviewDate = new Date(checkOut);
      reviewDate.setDate(reviewDate.getDate() + 1);
      reviewDate.setHours(10, 0, 0, 0);
      typesToSchedule.push({
        type: "post_checkout_photos",
        scheduledFor: reviewDate,
      });

      const rebookingDate = new Date(checkOut);
      rebookingDate.setDate(rebookingDate.getDate() + 30);
      rebookingDate.setHours(10, 0, 0, 0);
      typesToSchedule.push({
        type: "post_checkout_rebooking",
        scheduledFor: rebookingDate,
      });

      let scheduled = 0;

      for (const comm of typesToSchedule) {
        // Skip past dates
        if (comm.scheduledFor < now) continue;

        // Check if already exists
        const { data: existing } = await supabase
          .from("guest_communications")
          .select("id")
          .eq("reservation_id", reservation_id)
          .eq("communication_type", comm.type)
          .single();

        if (existing) continue;

        const messageTemplate = getLocalizedMessage(comm.type, language);

        await supabase.from("guest_communications").insert({
          reservation_id: reservation_id,
          communication_type: comm.type,
          status: "scheduled",
          scheduled_for: comm.scheduledFor.toISOString(),
          message_template: messageTemplate,
          guest_phone: reservation.guest_phone,
          guest_name: reservation.guest_name,
          guest_language: language,
        });

        scheduled++;
      }

      return NextResponse.json({
        success: true,
        communications_scheduled: scheduled,
        types: typesToSchedule
          .filter((t) => t.scheduledFor > now)
          .map((t) => t.type),
      });
    }

    // Send immediate communication
    if (action === "send_immediate" && reservation_id && body.type) {
      const { type } = body as { type: CommunicationType };

      const { data: reservation } = await supabase
        .from("reservations")
        .select("*")
        .eq("id", reservation_id)
        .single();

      if (!reservation?.guest_phone) {
        return NextResponse.json(
          { error: "Reservation not found or no phone" },
          { status: 400 },
        );
      }

      const language = parseLanguage(reservation.language);
      const template = MESSAGE_TEMPLATES[type];
      const messageTemplate = getLocalizedMessage(type, language);

      const variables: Record<string, string | number | null> = {
        guest_name: reservation.guest_name,
        check_in: new Date(reservation.check_in).toLocaleDateString(),
        check_out: new Date(reservation.check_out).toLocaleDateString(),
        villa_name: getVillaName(reservation.villas),
        guests_count: reservation.guests_count,
        boat_time: getDefaultBoatTime(true),
        review_link: "https://g.page/r/CfE5x-TinyVillageCartagena/review",
        rebooking_link: "https://hotels.cloudbeds.com/en/reservation/cNQMGh",
        loyalty_discount: 10,
      };

      const finalMessage = replaceTemplateVariables(messageTemplate, variables);

      const sendResult = await sendWhatsAppMessage(
        reservation.guest_phone,
        finalMessage,
      );

      if (sendResult.success) {
        // Log the communication
        await supabase.from("guest_communications").insert({
          reservation_id: reservation_id,
          communication_type: type,
          status: "sent",
          scheduled_for: new Date().toISOString(),
          sent_at: new Date().toISOString(),
          message_template: messageTemplate,
          message_sent: finalMessage,
          guest_phone: reservation.guest_phone,
          guest_name: reservation.guest_name,
          guest_language: language,
          twilio_sid: sendResult.sid,
        });

        return NextResponse.json({
          success: true,
          message_sid: sendResult.sid,
        });
      }

      return NextResponse.json({ error: sendResult.error }, { status: 500 });
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
