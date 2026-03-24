import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Json } from "@/types/database";

// Cloudbeds API types (simplified)
interface CloudbedsReservation {
  reservationID: string;
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  startDate: string;
  endDate: string;
  adults: number;
  children: number;
  status: string;
  totalAmount: number;
  roomTypes: { roomTypeName: string }[];
  notes?: string;
}

interface CloudbedsResponse {
  success: boolean;
  data: CloudbedsReservation[];
  total: number;
}

// POST - Sync reservations from Cloudbeds
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      start_date,
      end_date,
      sync_type = "incremental",
    } = body as {
      start_date?: string;
      end_date?: string;
      sync_type?: "full" | "incremental";
    };

    // Check for Cloudbeds API credentials
    const cloudbedsApiKey = process.env.CLOUDBEDS_API_KEY;
    const cloudbedsPropertyId = process.env.CLOUDBEDS_PROPERTY_ID;

    if (!cloudbedsApiKey || !cloudbedsPropertyId) {
      return NextResponse.json(
        {
          error: "Cloudbeds API not configured",
          message:
            "Set CLOUDBEDS_API_KEY and CLOUDBEDS_PROPERTY_ID environment variables",
          demo_mode: true,
        },
        { status: 200 }, // Return 200 with demo_mode flag
      );
    }

    const supabase = createServerClient();

    // Calculate date range
    const today = new Date();
    const startDate = start_date || today.toISOString().split("T")[0];
    const endDateDefault = new Date(today);
    endDateDefault.setDate(endDateDefault.getDate() + 30);
    const endDate = end_date || endDateDefault.toISOString().split("T")[0];

    // Fetch from Cloudbeds API
    const cloudbedsUrl = `https://api.cloudbeds.com/api/v1.2/getReservations?propertyID=${cloudbedsPropertyId}&checkInFrom=${startDate}&checkInTo=${endDate}`;

    const cloudbedsResponse = await fetch(cloudbedsUrl, {
      headers: {
        Authorization: `Bearer ${cloudbedsApiKey}`,
        "Content-Type": "application/json",
      },
    });

    if (!cloudbedsResponse.ok) {
      const errorText = await cloudbedsResponse.text();
      console.error("[cloudbeds/sync] API error:", errorText);
      return NextResponse.json(
        { error: "Cloudbeds API error", details: errorText },
        { status: 500 },
      );
    }

    const cloudbedsData: CloudbedsResponse = await cloudbedsResponse.json();

    if (!cloudbedsData.success) {
      return NextResponse.json(
        { error: "Cloudbeds returned unsuccessful response" },
        { status: 500 },
      );
    }

    // Process and sync reservations
    const results = {
      created: 0,
      updated: 0,
      unchanged: 0,
      errors: [] as string[],
    };

    for (const cbRes of cloudbedsData.data) {
      try {
        // Map Cloudbeds status to our status
        const statusMap: Record<string, string> = {
          confirmed: "confirmed",
          checked_in: "checked_in",
          checked_out: "checked_out",
          cancelled: "cancelled",
          no_show: "no_show",
        };

        const mappedStatus =
          statusMap[cbRes.status.toLowerCase()] || "confirmed";

        // Map room types to villas
        const villas = cbRes.roomTypes.map((rt) => rt.roomTypeName);

        const reservationData = {
          cloudbeds_id: cbRes.reservationID,
          guest_name: cbRes.guestName,
          guest_email: cbRes.guestEmail || null,
          guest_phone: cbRes.guestPhone || null,
          check_in: cbRes.startDate,
          check_out: cbRes.endDate,
          guests_count: cbRes.adults + (cbRes.children || 0),
          status: mappedStatus as
            | "confirmed"
            | "checked_in"
            | "checked_out"
            | "cancelled"
            | "no_show",
          total_amount: cbRes.totalAmount,
          villas: villas as unknown as Json,
          notes: cbRes.notes || null,
          synced_at: new Date().toISOString(),
        };

        // Check if reservation exists
        const { data: existing } = await supabase
          .from("reservations")
          .select("id, synced_at")
          .eq("cloudbeds_id", cbRes.reservationID)
          .single();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from("reservations")
            .update(reservationData)
            .eq("id", existing.id);

          if (error) {
            results.errors.push(
              `Update failed for ${cbRes.reservationID}: ${error.message}`,
            );
          } else {
            results.updated++;
          }
        } else {
          // Create new
          const { error } = await supabase
            .from("reservations")
            .insert(reservationData);

          if (error) {
            results.errors.push(
              `Create failed for ${cbRes.reservationID}: ${error.message}`,
            );
          } else {
            results.created++;
          }
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Unknown error";
        results.errors.push(
          `Processing failed for ${cbRes.reservationID}: ${errorMsg}`,
        );
      }
    }

    // Update daily occupancy based on synced data
    await updateDailyOccupancy(supabase, startDate, endDate);

    return NextResponse.json({
      success: true,
      sync_type,
      date_range: { start: startDate, end: endDate },
      cloudbeds_total: cloudbedsData.total,
      results,
      message: `Synced ${results.created} new, ${results.updated} updated${results.errors.length > 0 ? `, ${results.errors.length} errors` : ""}`,
    });
  } catch (error) {
    console.error("[cloudbeds/sync]", error);
    return NextResponse.json(
      { error: "Failed to sync with Cloudbeds" },
      { status: 500 },
    );
  }
}

// Helper to update daily occupancy from reservations
async function updateDailyOccupancy(
  supabase: ReturnType<typeof createServerClient>,
  startDate: string,
  endDate: string,
) {
  const start = new Date(startDate);
  const end = new Date(endDate);

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split("T")[0];

    // Count guests for this date
    const { data: reservations } = await supabase
      .from("reservations")
      .select("guests_count, villas, check_in, check_out")
      .lte("check_in", dateStr)
      .gt("check_out", dateStr)
      .in("status", ["confirmed", "checked_in"]);

    const totalGuests =
      reservations?.reduce((sum, r) => sum + r.guests_count, 0) || 0;
    const occupiedVillas =
      reservations?.flatMap((r) => (r.villas as string[]) || []) || [];

    // Count check-ins and check-outs for this date
    const { count: checkIns } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("check_in", dateStr)
      .in("status", ["confirmed", "checked_in"]);

    const { count: checkOuts } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .eq("check_out", dateStr)
      .in("status", ["checked_out", "confirmed"]);

    // Upsert daily occupancy
    await supabase.from("daily_occupancy").upsert(
      {
        date: dateStr,
        guests_count: totalGuests,
        villas_occupied: [...new Set(occupiedVillas)] as unknown as Json,
        check_ins: checkIns || 0,
        check_outs: checkOuts || 0,
        person_nights: totalGuests,
      },
      { onConflict: "date" },
    );
  }
}

// GET - Get sync status and last sync info
export async function GET() {
  try {
    const cloudbedsApiKey = process.env.CLOUDBEDS_API_KEY;
    const cloudbedsPropertyId = process.env.CLOUDBEDS_PROPERTY_ID;

    const supabase = createServerClient();

    // Get most recently synced reservation
    const { data: lastSync } = await supabase
      .from("reservations")
      .select("synced_at")
      .not("synced_at", "is", null)
      .order("synced_at", { ascending: false })
      .limit(1)
      .single();

    // Get reservation counts
    const { count: totalReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true });

    const { count: activeReservations } = await supabase
      .from("reservations")
      .select("*", { count: "exact", head: true })
      .in("status", ["confirmed", "checked_in"]);

    return NextResponse.json({
      success: true,
      cloudbeds_configured: !!(cloudbedsApiKey && cloudbedsPropertyId),
      last_sync: lastSync?.synced_at || null,
      stats: {
        total_reservations: totalReservations || 0,
        active_reservations: activeReservations || 0,
      },
    });
  } catch (error) {
    console.error("[cloudbeds/sync GET]", error);
    return NextResponse.json(
      { error: "Failed to get sync status" },
      { status: 500 },
    );
  }
}
