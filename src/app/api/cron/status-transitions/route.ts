// ═══════════════════════════════════════════════════════════════
// TVC STATUS TRANSITIONS CRON JOB
// Runs at 11:15 AM daily to auto-transition villa statuses
// Issue #39 — NO AUTOMATIC STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// Villa status types (must match database constraint)
// CHECK ((status = ANY (ARRAY['vacant', 'occupied', 'cleaning', 'maintenance', 'blocked'])))
type VillaStatus =
  | "occupied"
  | "vacant"
  | "cleaning"
  | "maintenance"
  | "blocked";

interface VillaStatusRecord {
  id: string;
  villa_id: string;
  status: VillaStatus;
  cleaning_status: string;
  maintenance_status: string;
  updated_at: string;
}

interface BookingRecord {
  id: string;
  villa_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  status: string;
}

interface ChecklistRecord {
  id: string;
  villa_id: string;
  status: string;
  date: string;
  approved_at: string | null;
}

// Verify cron secret for protected routes
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron] CRON_SECRET no configurado");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];
    const transitions: string[] = [];

    // ═══════════════════════════════════════════════════════════════
    // 1. CHECKOUT TRANSITIONS (11:15 AM)
    // Find occupied villas with checkout=today → mark as cleaning (needs clean)
    // ═══════════════════════════════════════════════════════════════

    // Get all bookings with checkout today that are still checked_in
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: checkoutsToday, error: checkoutError } = await (
      supabase as any
    )
      .from("villa_bookings")
      .select("*")
      .eq("check_out", today)
      .eq("status", "checked_in");

    if (checkoutError) {
      console.error("[Cron] Error fetching checkouts:", checkoutError);
    }

    if (checkoutsToday && checkoutsToday.length > 0) {
      for (const booking of checkoutsToday as BookingRecord[]) {
        // Update villa status to 'cleaning' (needs to be cleaned after checkout)
        const { error: updateError } = await supabase
          .from("villa_status")
          .update({
            status: "cleaning",
            cleaning_status: "dirty",
            notes: `Checkout today: ${booking.guest_name}`,
            updated_at: new Date().toISOString(),
          })
          .eq("villa_id", booking.villa_id);

        if (!updateError) {
          transitions.push(
            `Villa ${booking.villa_id} → cleaning (checkout: ${booking.guest_name})`,
          );
        } else {
          console.error(
            `[Cron] Error updating villa ${booking.villa_id}:`,
            updateError,
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 2. ARRIVING TRANSITIONS
    // Find villas with check-in today → mark as occupied if ready
    // ═══════════════════════════════════════════════════════════════

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: arrivalsToday, error: arrivalError } = await (supabase as any)
      .from("villa_bookings")
      .select("*")
      .eq("check_in", today)
      .eq("status", "confirmed");

    if (arrivalError) {
      console.error("[Cron] Error fetching arrivals:", arrivalError);
    }

    if (arrivalsToday && arrivalsToday.length > 0) {
      for (const booking of arrivalsToday as BookingRecord[]) {
        // Only set to occupied if villa is vacant and clean
        const { data: villaStatus } = await supabase
          .from("villa_status")
          .select("*")
          .eq("villa_id", booking.villa_id)
          .single();

        const vs = villaStatus as VillaStatusRecord | null;
        if (vs && vs.status === "vacant" && vs.cleaning_status === "clean") {
          const { error: updateError } = await supabase
            .from("villa_status")
            .update({
              status: "occupied",
              notes: `Arrival: ${booking.guest_name}`,
              updated_at: new Date().toISOString(),
            })
            .eq("villa_id", booking.villa_id);

          if (!updateError) {
            transitions.push(
              `Villa ${booking.villa_id} → occupied (arrival: ${booking.guest_name})`,
            );
          }
        } else if (vs && vs.cleaning_status !== "clean") {
          transitions.push(
            `⚠️ Villa ${booking.villa_id} NOT READY for ${booking.guest_name} (cleaning_status: ${vs.cleaning_status})`,
          );
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 3. CHECKLIST APPROVED → VACANT
    // When cleaning checklist is approved, transition villa to vacant
    // ═══════════════════════════════════════════════════════════════

    const { data: approvedChecklists, error: checklistError } = await supabase
      .from("checklists")
      .select("*")
      .eq("date", today)
      .eq("status", "approved")
      .not("approved_at", "is", null);

    if (checklistError) {
      console.error("[Cron] Error fetching checklists:", checklistError);
    }

    if (approvedChecklists && approvedChecklists.length > 0) {
      for (const checklist of approvedChecklists as ChecklistRecord[]) {
        if (!checklist.villa_id) continue;

        // Get current villa status
        const { data: currentStatus } = await supabase
          .from("villa_status")
          .select("status, cleaning_status")
          .eq("villa_id", checklist.villa_id)
          .single();

        const cs = currentStatus as {
          status: VillaStatus;
          cleaning_status: string;
        } | null;

        // Only transition if currently in cleaning status and cleaning not yet marked clean
        if (cs && cs.status === "cleaning" && cs.cleaning_status !== "clean") {
          // Check if there's an arrival for this villa today
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: arrivalBooking } = await (supabase as any)
            .from("villa_bookings")
            .select("id, guest_name")
            .eq("villa_id", checklist.villa_id)
            .eq("check_in", today)
            .eq("status", "confirmed")
            .single();

          const newStatus: VillaStatus = arrivalBooking ? "occupied" : "vacant";

          const { error: updateError } = await supabase
            .from("villa_status")
            .update({
              status: newStatus,
              cleaning_status: "clean",
              last_cleaned_at: new Date().toISOString(),
              last_inspected_at: checklist.approved_at,
              notes: arrivalBooking
                ? `Ready for arrival: ${(arrivalBooking as { guest_name: string }).guest_name}`
                : "Cleaned and ready",
              updated_at: new Date().toISOString(),
            })
            .eq("villa_id", checklist.villa_id);

          if (!updateError) {
            transitions.push(
              `Villa ${checklist.villa_id} → ${newStatus} (checklist approved)`,
            );
          }
        }
      }
    }

    // ═══════════════════════════════════════════════════════════════
    // 4. LOG RESULTS
    // ═══════════════════════════════════════════════════════════════

    console.log(
      `[Cron Status Transitions] ${transitions.length} transiciones ejecutadas`,
    );
    transitions.forEach((t) => console.log(`  - ${t}`));

    return NextResponse.json({
      success: true,
      date: today,
      time: new Date().toISOString(),
      transitions_count: transitions.length,
      transitions,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[Cron Status Transitions] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 },
    );
  }
}

// POST endpoint for manual trigger (from dashboard)
export async function POST(request: NextRequest) {
  // Verify authorization - allow both cron secret and admin requests
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Check for admin token or cron secret
  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === "Bearer admin-manual-trigger" ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  // Delegate to GET handler
  return GET(request);
}
