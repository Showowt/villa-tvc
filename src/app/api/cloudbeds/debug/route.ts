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

    // Extract unique room names
    const roomNames = new Set<string>();
    const reservations = data.data || [];

    for (const res of reservations) {
      if (res.roomName) roomNames.add(res.roomName);
      if (res.roomTypeName) roomNames.add(`TYPE: ${res.roomTypeName}`);
    }

    return NextResponse.json({
      total_reservations: reservations.length,
      unique_room_names: Array.from(roomNames).sort(),
      sample_reservation: reservations[0] || null,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
