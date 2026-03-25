// Debug endpoint to see Cloudbeds room names
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const CLOUDBEDS_API_BASE = "https://api.cloudbeds.com";

async function getAccessToken() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data } = await supabase
    .from("integrations")
    .select("access_token")
    .eq("provider", "cloudbeds")
    .single();

  return data?.access_token;
}

export async function GET() {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return NextResponse.json({ error: "Not connected" }, { status: 400 });
    }

    // Get reservations
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const response = await fetch(
      `${CLOUDBEDS_API_BASE}/api/v1.2/getReservations?startDate=${startDate}&endDate=${endDate}&status=confirmed,checked_in,checked_out`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    const data = await response.json();

    // Need to fetch each reservation's detail to get room info
    const roomNames = new Set<string>();
    const reservations = data.data || [];

    // Get detail for ALL reservations to collect room names
    for (const res of reservations.slice(0, 20)) {
      // Sample first 20
      try {
        const detailRes = await fetch(
          `${CLOUDBEDS_API_BASE}/api/v1.2/getReservation?reservationID=${res.reservationID}`,
          { headers: { Authorization: `Bearer ${accessToken}` } },
        );
        const detail = await detailRes.json();
        if (detail.data?.assigned) {
          for (const room of detail.data.assigned) {
            if (room.roomName) roomNames.add(room.roomName);
            if (room.roomTypeName) roomNames.add(`TYPE: ${room.roomTypeName}`);
          }
        }
      } catch (e) {
        console.error("Failed to get detail for", res.reservationID);
      }
    }

    // Get full details for first reservation to see structure
    let detailedReservation = null;
    if (reservations.length > 0) {
      const detailRes = await fetch(
        `${CLOUDBEDS_API_BASE}/api/v1.2/getReservation?reservationID=${reservations[0].reservationID}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
      );
      detailedReservation = await detailRes.json();
    }

    return NextResponse.json({
      total_reservations: reservations.length,
      unique_room_names: Array.from(roomNames).sort(),
      sample_reservation: reservations[0] || null,
      detailed_reservation: detailedReservation,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
