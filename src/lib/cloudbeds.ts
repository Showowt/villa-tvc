// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS INTEGRATION — OAuth 2.0 + Reservations Sync
// TVC Villa Management System
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase/server";

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const CLOUDBEDS_CONFIG = {
  authorizationUrl: "https://api.cloudbeds.com/auth/oauth/authorize",
  tokenUrl: "https://api.cloudbeds.com/auth/oauth/token",
  apiBase: "https://api.cloudbeds.com/api/v1.2",
  clientId: process.env.CLOUDBEDS_CLIENT_ID!,
  clientSecret: process.env.CLOUDBEDS_CLIENT_SECRET!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/cloudbeds/callback`,
  scopes: ["read:reservation", "read:guest", "read:room"],
};

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface CloudbedsTokens {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  token_type: string;
  scope?: string;
}

export interface CloudbedsReservation {
  reservationID: string;
  propertyID: string;
  status:
    | "not_confirmed"
    | "confirmed"
    | "canceled"
    | "checked_in"
    | "checked_out"
    | "no_show";
  guestFirstName: string;
  guestLastName: string;
  guestEmail?: string;
  guestPhone?: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  children: number;
  roomTypeName?: string;
  roomName?: string;
  total: number;
  balance: number;
  source?: string;
  dateCreated: string;
  dateModified: string;
}

export interface CloudbedsRoom {
  roomID: string;
  roomName: string;
  roomTypeName: string;
  roomTypeID: string;
  maxGuests: number;
}

// ═══════════════════════════════════════════════════════════════
// OAUTH FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Generate the OAuth authorization URL
 */
export function getAuthorizationUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: CLOUDBEDS_CONFIG.clientId,
    redirect_uri: CLOUDBEDS_CONFIG.redirectUri,
    response_type: "code",
    scope: CLOUDBEDS_CONFIG.scopes.join(" "),
  });

  if (state) {
    params.append("state", state);
  }

  return `${CLOUDBEDS_CONFIG.authorizationUrl}?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<CloudbedsTokens> {
  const response = await fetch(CLOUDBEDS_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLOUDBEDS_CONFIG.clientId,
      client_secret: CLOUDBEDS_CONFIG.clientSecret,
      redirect_uri: CLOUDBEDS_CONFIG.redirectUri,
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Cloudbeds] Token exchange failed:", error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };
}

/**
 * Refresh expired access token
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<CloudbedsTokens> {
  const response = await fetch(CLOUDBEDS_CONFIG.tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: CLOUDBEDS_CONFIG.clientId,
      client_secret: CLOUDBEDS_CONFIG.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Cloudbeds] Token refresh failed:", error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  const data = await response.json();

  return {
    access_token: data.access_token,
    refresh_token: data.refresh_token || refreshToken,
    expires_at: Date.now() + data.expires_in * 1000,
    token_type: data.token_type,
    scope: data.scope,
  };
}

// ═══════════════════════════════════════════════════════════════
// TOKEN STORAGE (Supabase)
// ═══════════════════════════════════════════════════════════════

/**
 * Store tokens in Supabase
 */
export async function storeTokens(tokens: CloudbedsTokens): Promise<void> {
  const supabase = await createServerClient();

  const { error } = await supabase.from("integrations").upsert(
    {
      provider: "cloudbeds",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: new Date(tokens.expires_at).toISOString(),
      token_type: tokens.token_type,
      scope: tokens.scope,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "provider" },
  );

  if (error) {
    console.error("[Cloudbeds] Failed to store tokens:", error);
    throw new Error("Failed to store tokens");
  }
}

/**
 * Get valid access token (refresh if needed)
 */
export async function getValidAccessToken(): Promise<string> {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("provider", "cloudbeds")
    .single();

  if (error || !data) {
    throw new Error("Cloudbeds not connected. Please authorize first.");
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(data.expires_at).getTime();
  const isExpired = Date.now() > expiresAt - 5 * 60 * 1000;

  if (isExpired) {
    console.log("[Cloudbeds] Token expired, refreshing...");
    const newTokens = await refreshAccessToken(data.refresh_token);
    await storeTokens(newTokens);
    return newTokens.access_token;
  }

  return data.access_token;
}

// ═══════════════════════════════════════════════════════════════
// API FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Make authenticated API request
 */
async function apiRequest<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const accessToken = await getValidAccessToken();

  const url = new URL(`${CLOUDBEDS_CONFIG.apiBase}${endpoint}`);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const response = await fetch(url.toString(), {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Cloudbeds] API error ${endpoint}:`, error);
    throw new Error(`API request failed: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

/**
 * Get reservations from Cloudbeds
 */
export async function getReservations(options?: {
  checkInFrom?: string;
  checkInTo?: string;
  status?: string;
  modifiedFrom?: string;
}): Promise<CloudbedsReservation[]> {
  const params: Record<string, string> = {};

  if (options?.checkInFrom) params.checkInFrom = options.checkInFrom;
  if (options?.checkInTo) params.checkInTo = options.checkInTo;
  if (options?.status) params.status = options.status;
  if (options?.modifiedFrom) params.modifiedFrom = options.modifiedFrom;

  const response = await apiRequest<{ data: CloudbedsReservation[] }>(
    "/getReservations",
    params,
  );
  return response.data || [];
}

/**
 * Get rooms from Cloudbeds
 */
export async function getRooms(): Promise<CloudbedsRoom[]> {
  const response = await apiRequest<{ data: CloudbedsRoom[] }>("/getRooms");
  return response.data || [];
}

// ═══════════════════════════════════════════════════════════════
// SYNC FUNCTIONS
// ═══════════════════════════════════════════════════════════════

// Villa mapping: Cloudbeds room names to TVC villa IDs
const ROOM_TO_VILLA_MAP: Record<string, string> = {
  Teresa: "villa_1",
  Aduana: "villa_2",
  Trinidad: "villa_3",
  Paz: "villa_4",
  "San Pedro": "villa_5",
  "San Diego": "villa_6",
  Coche: "villa_7",
  Pozo: "villa_8",
  "Santo Domingo": "villa_9",
  Merced: "villa_10",
};

/**
 * Sync reservations from Cloudbeds to TVC
 */
export async function syncReservations(): Promise<{
  synced: number;
  created: number;
  updated: number;
  errors: string[];
}> {
  const supabase = await createServerClient();
  const errors: string[] = [];
  let created = 0;
  let updated = 0;

  try {
    // Get reservations from last 30 days + next 90 days
    const today = new Date();
    const checkInFrom = new Date(today);
    checkInFrom.setDate(checkInFrom.getDate() - 30);
    const checkInTo = new Date(today);
    checkInTo.setDate(checkInTo.getDate() + 90);

    const reservations = await getReservations({
      checkInFrom: checkInFrom.toISOString().split("T")[0],
      checkInTo: checkInTo.toISOString().split("T")[0],
    });

    console.log(
      `[Cloudbeds] Found ${reservations.length} reservations to sync`,
    );

    for (const res of reservations) {
      try {
        // Map room to villa
        const villaId = ROOM_TO_VILLA_MAP[res.roomName || ""] || null;

        if (!villaId) {
          console.warn(`[Cloudbeds] Unknown room: ${res.roomName}`);
        }

        // Map status
        let tvcStatus: "confirmed" | "checked_in" | "completed" | "cancelled" =
          "confirmed";
        if (res.status === "checked_in") tvcStatus = "checked_in";
        else if (res.status === "checked_out") tvcStatus = "completed";
        else if (res.status === "canceled" || res.status === "no_show")
          tvcStatus = "cancelled";

        // Upsert to villa_bookings
        const bookingData = {
          cloudbeds_reservation_id: res.reservationID,
          villa_id: villaId,
          guest_name: `${res.guestFirstName} ${res.guestLastName}`.trim(),
          guest_email: res.guestEmail || null,
          guest_phone: res.guestPhone || null,
          check_in: res.checkInDate,
          check_out: res.checkOutDate,
          num_adults: res.adults || 1,
          num_children: res.children || 0,
          status: tvcStatus,
          total_amount: res.total || null,
          source: res.source || "cloudbeds",
          cloudbeds_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        // Check if exists
        const { data: existing } = await supabase
          .from("villa_bookings")
          .select("id")
          .eq("cloudbeds_reservation_id", res.reservationID)
          .single();

        if (existing) {
          // Update
          const { error } = await supabase
            .from("villa_bookings")
            .update(bookingData)
            .eq("cloudbeds_reservation_id", res.reservationID);

          if (error) throw error;
          updated++;
        } else {
          // Create
          const { error } = await supabase.from("villa_bookings").insert({
            ...bookingData,
            created_at: new Date().toISOString(),
          });

          if (error) throw error;
          created++;
        }
      } catch (err) {
        const msg = `Failed to sync reservation ${res.reservationID}: ${err}`;
        console.error(`[Cloudbeds] ${msg}`);
        errors.push(msg);
      }
    }

    return {
      synced: reservations.length,
      created,
      updated,
      errors,
    };
  } catch (err) {
    console.error("[Cloudbeds] Sync failed:", err);
    throw err;
  }
}

/**
 * Check if Cloudbeds is connected
 */
export async function isConnected(): Promise<boolean> {
  try {
    const supabase = await createServerClient();
    const { data } = await supabase
      .from("integrations")
      .select("id")
      .eq("provider", "cloudbeds")
      .single();
    return !!data;
  } catch {
    return false;
  }
}
