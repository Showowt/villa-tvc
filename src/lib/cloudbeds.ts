// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS INTEGRATION — OAuth & Reservation Sync
// TVC Villa Management System
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

interface CloudbedsTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope?: string;
  property_id?: string;
}

interface CloudbedsReservation {
  reservationID: string;
  propertyID: string;
  status: string;
  guestFirstName: string;
  guestLastName: string;
  guestEmail: string;
  guestPhone?: string;
  startDate: string;
  endDate: string;
  roomTypeName: string;
  roomName: string;
  adults: number;
  children: number;
  total: number;
  balance: number;
  notes?: string;
  source?: string;
  created?: string;
  modified?: string;
}

// Villa name mapping from Cloudbeds room names to TVC villa IDs
const VILLA_MAPPING: Record<string, string> = {
  "Villa ADUANA (Azul/Blue)": "villa_aduana",
  "Villa Coches": "villa_coches",
  "Villa Merced (Morada/Purple)": "villa_merced",
  "Villa PAZ (Limón/ Keylime)": "villa_paz",
  "Villa Pozo (Azulverde/Teal)": "villa_pozo",
  "Villa San Pedro (Magenta)": "villa_san_pedro",
  "Villa Santo Domingo (Mint/Menta)": "villa_santo_domingo",
  "Villa TERESA (Amarilla/Yellow)": "villa_teresa",
  "Villa TRINIDAD (Durazno/Peach)": "villa_trinidad",
  "FUL(1)": "full_house",
};

// ─────────────────────────────────────────────────────────────────
// SERVICE ROLE CLIENT
// ─────────────────────────────────────────────────────────────────

function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase credentials for service client");
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey);
}

// ─────────────────────────────────────────────────────────────────
// OAUTH CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const CLOUDBEDS_API_BASE = "https://api.cloudbeds.com";
const CLOUDBEDS_AUTH_URL = "https://hotels.cloudbeds.com/api/v1.1/oauth";

function getClientId(): string {
  const clientId = process.env.CLOUDBEDS_CLIENT_ID;
  if (!clientId) throw new Error("CLOUDBEDS_CLIENT_ID not configured");
  return clientId;
}

function getClientSecret(): string {
  const clientSecret = process.env.CLOUDBEDS_CLIENT_SECRET;
  if (!clientSecret) throw new Error("CLOUDBEDS_CLIENT_SECRET not configured");
  return clientSecret;
}

function getRedirectUri(): string {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://villa-tvc.vercel.app";
  return `${appUrl}/api/cloudbeds/callback`;
}

// ─────────────────────────────────────────────────────────────────
// AUTHORIZATION URL
// ─────────────────────────────────────────────────────────────────

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: "code",
    scope: "read:reservation write:reservation read:room read:guest",
    state,
  });

  return `${CLOUDBEDS_AUTH_URL}?${params.toString()}`;
}

// ─────────────────────────────────────────────────────────────────
// TOKEN EXCHANGE
// ─────────────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(
  code: string,
): Promise<CloudbedsTokens> {
  const response = await fetch(`${CLOUDBEDS_API_BASE}/api/v1.2/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      redirect_uri: getRedirectUri(),
      code,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Cloudbeds] Token exchange failed:", error);
    throw new Error(`Token exchange failed: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────
// TOKEN REFRESH
// ─────────────────────────────────────────────────────────────────

export async function refreshAccessToken(
  refreshToken: string,
): Promise<CloudbedsTokens> {
  const response = await fetch(`${CLOUDBEDS_API_BASE}/api/v1.2/access_token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      client_id: getClientId(),
      client_secret: getClientSecret(),
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("[Cloudbeds] Token refresh failed:", error);
    throw new Error(`Token refresh failed: ${response.status}`);
  }

  return response.json();
}

// ─────────────────────────────────────────────────────────────────
// TOKEN STORAGE
// ─────────────────────────────────────────────────────────────────

export async function storeTokens(tokens: CloudbedsTokens): Promise<void> {
  const supabase = getServiceClient();
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  const { error } = await supabase.from("integrations").upsert(
    {
      provider: "cloudbeds",
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: expiresAt.toISOString(),
      token_type: tokens.token_type,
      scope: tokens.scope,
      property_id: tokens.property_id,
      metadata: {},
    },
    { onConflict: "provider" },
  );

  if (error) {
    console.error("[Cloudbeds] Failed to store tokens:", error);
    throw new Error("Failed to store Cloudbeds tokens");
  }

  console.log("[Cloudbeds] Tokens stored successfully, expires:", expiresAt);
}

// ─────────────────────────────────────────────────────────────────
// GET VALID ACCESS TOKEN
// ─────────────────────────────────────────────────────────────────

async function getValidAccessToken(): Promise<string> {
  const supabase = getServiceClient();

  const { data: integration, error } = await supabase
    .from("integrations")
    .select("*")
    .eq("provider", "cloudbeds")
    .single();

  if (error || !integration) {
    throw new Error("Cloudbeds not connected");
  }

  // Check if token is expired (with 5 minute buffer)
  const expiresAt = new Date(integration.expires_at as string);
  const now = new Date();
  const bufferMs = 5 * 60 * 1000;

  if (expiresAt.getTime() - bufferMs <= now.getTime()) {
    console.log("[Cloudbeds] Token expired or expiring soon, refreshing...");

    if (!integration.refresh_token) {
      throw new Error("No refresh token available");
    }

    const newTokens = await refreshAccessToken(integration.refresh_token);
    await storeTokens(newTokens);
    return newTokens.access_token;
  }

  return integration.access_token;
}

// ─────────────────────────────────────────────────────────────────
// CONNECTION CHECK
// ─────────────────────────────────────────────────────────────────

export async function isConnected(): Promise<boolean> {
  try {
    const supabase = getServiceClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("id, expires_at")
      .eq("provider", "cloudbeds")
      .single();

    if (error || !data) return false;

    // Also check if we can get a valid token
    await getValidAccessToken();
    return true;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// API CALL HELPER
// ─────────────────────────────────────────────────────────────────

async function cloudbedsApi<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const accessToken = await getValidAccessToken();

  const response = await fetch(`${CLOUDBEDS_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const error = await response.text();
    console.error(`[Cloudbeds] API error ${endpoint}:`, error);
    throw new Error(`Cloudbeds API error: ${response.status}`);
  }

  const data = await response.json();
  return data;
}

// ─────────────────────────────────────────────────────────────────
// SYNC RESERVATIONS
// ─────────────────────────────────────────────────────────────────

interface SyncResult {
  synced: number;
  created: number;
  updated: number;
  errors: number;
}

export async function syncReservations(batchSize = 20): Promise<SyncResult> {
  const supabase = getServiceClient();
  const result: SyncResult = { synced: 0, created: 0, updated: 0, errors: 0 };

  try {
    // Get reservations for next 60 days
    const startDate = new Date().toISOString().split("T")[0];
    const endDate = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    console.log(
      `[Cloudbeds] Fetching reservations from ${startDate} to ${endDate}`,
    );

    const data = await cloudbedsApi<{ data: CloudbedsReservation[] }>(
      `/api/v1.2/getReservations?startDate=${startDate}&endDate=${endDate}&status=confirmed,checked_in,checked_out`,
    );

    const allReservations = data.data || [];
    // Process only a batch to avoid timeout - prioritize most recent
    const reservations = allReservations.slice(0, batchSize);
    console.log(
      `[Cloudbeds] Found ${allReservations.length} reservations, processing ${reservations.length}`,
    );

    for (let i = 0; i < reservations.length; i++) {
      const res = reservations[i];
      try {
        // Small delay between API calls to avoid rate limiting
        if (i > 0) await new Promise((r) => setTimeout(r, 100));

        // Fetch reservation details to get room info
        const detailData = await cloudbedsApi<{
          data: {
            assigned?: Array<{
              roomName: string;
              roomTypeName: string;
              adults?: string;
              children?: string;
            }>;
          };
        }>(`/api/v1.2/getReservation?reservationID=${res.reservationID}`);

        const assigned = detailData.data?.assigned?.[0];
        const roomName = assigned?.roomName;
        const roomTypeName = assigned?.roomTypeName;

        // Map room name to villa ID
        const villaId = roomName ? VILLA_MAPPING[roomName] : undefined;

        if (!villaId) {
          console.warn(
            `[Cloudbeds] Unknown room: ${roomName} / ${roomTypeName}`,
          );
          result.errors++;
          continue;
        }

        // Get guest info from detail response
        const detail = detailData.data as Record<string, unknown>;
        const guestList = detail.guestList as
          | Record<
              string,
              {
                guestFirstName?: string;
                guestLastName?: string;
                guestEmail?: string;
                guestPhone?: string;
              }
            >
          | undefined;
        const mainGuest = guestList
          ? Object.values(guestList).find((g) => g)
          : undefined;

        // Map Cloudbeds status to TVC status
        let status: "confirmed" | "checked_in" | "checked_out" | "cancelled" =
          "confirmed";
        const detailStatus = detail.status as string;
        if (detailStatus === "checked_in") status = "checked_in";
        else if (detailStatus === "checked_out") status = "checked_out";
        else if (detailStatus === "cancelled" || detailStatus === "no_show")
          status = "cancelled";

        // Check if booking already exists
        const { data: existing } = await supabase
          .from("villa_bookings")
          .select("id, cloudbeds_reservation_id")
          .eq("cloudbeds_reservation_id", res.reservationID)
          .single();

        const bookingData = {
          villa_id: villaId,
          guest_name: mainGuest
            ? `${mainGuest.guestFirstName || ""} ${mainGuest.guestLastName || ""}`.trim()
            : (detail.guestName as string) || "Unknown",
          guest_email:
            mainGuest?.guestEmail && mainGuest.guestEmail !== "N/A"
              ? mainGuest.guestEmail
              : null,
          guest_phone: mainGuest?.guestPhone || null,
          check_in: (detail.startDate as string) || res.startDate,
          check_out: (detail.endDate as string) || res.endDate,
          status,
          num_adults: parseInt(String(assigned?.adults || res.adults || 1)),
          num_children: parseInt(
            String(assigned?.children || res.children || 0),
          ),
          booking_source: (detail.source as string) || "cloudbeds",
          notes: null,
          cloudbeds_reservation_id: res.reservationID,
          cloudbeds_synced_at: new Date().toISOString(),
        };

        if (existing) {
          // Update existing booking
          const { error: updateError } = await supabase
            .from("villa_bookings")
            .update(bookingData)
            .eq("id", existing.id);

          if (updateError) {
            console.error(
              `[Cloudbeds] Update error for ${res.reservationID}:`,
              updateError,
            );
            result.errors++;
          } else {
            result.updated++;
          }
        } else {
          // Create new booking
          const { error: insertError } = await supabase
            .from("villa_bookings")
            .insert(bookingData);

          if (insertError) {
            console.error(
              `[Cloudbeds] Insert error for ${res.reservationID}:`,
              insertError,
            );
            result.errors++;
          } else {
            result.created++;
          }
        }

        result.synced++;
      } catch (resError) {
        console.error(
          `[Cloudbeds] Error processing reservation ${res.reservationID}:`,
          resError,
        );
        result.errors++;
      }
    }

    console.log("[Cloudbeds] Sync complete:", result);
    return result;
  } catch (error) {
    console.error("[Cloudbeds] Sync failed:", error);
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────
// DISCONNECT
// ─────────────────────────────────────────────────────────────────

export async function disconnect(): Promise<void> {
  const supabase = getServiceClient();

  const { error } = await supabase
    .from("integrations")
    .delete()
    .eq("provider", "cloudbeds");

  if (error) {
    console.error("[Cloudbeds] Disconnect error:", error);
    throw new Error("Failed to disconnect Cloudbeds");
  }

  console.log("[Cloudbeds] Disconnected successfully");
}
