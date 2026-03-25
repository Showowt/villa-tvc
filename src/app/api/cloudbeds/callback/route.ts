// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS OAUTH — Callback Handler
// Handles the OAuth callback and stores tokens
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import {
  exchangeCodeForTokens,
  storeTokens,
  syncReservations,
} from "@/lib/cloudbeds";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get("code");
    const error = searchParams.get("error");
    const errorDescription = searchParams.get("error_description");

    // Handle errors from Cloudbeds
    if (error) {
      console.error("[Cloudbeds] OAuth error:", error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/ops?error=${encodeURIComponent(errorDescription || error)}`,
          request.url,
        ),
      );
    }

    // Validate code
    if (!code) {
      console.error("[Cloudbeds] No authorization code received");
      return NextResponse.redirect(
        new URL("/ops?error=No+authorization+code+received", request.url),
      );
    }

    console.log(
      "[Cloudbeds] Received authorization code, exchanging for tokens...",
    );

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);

    console.log("[Cloudbeds] Token exchange successful, storing...");

    // Store tokens in Supabase
    await storeTokens(tokens);

    console.log("[Cloudbeds] Tokens stored, starting initial sync...");

    // Trigger initial sync
    try {
      const syncResult = await syncReservations();
      console.log("[Cloudbeds] Initial sync complete:", syncResult);
    } catch (syncError) {
      console.error(
        "[Cloudbeds] Initial sync failed (non-blocking):",
        syncError,
      );
    }

    // Redirect to success page
    return NextResponse.redirect(
      new URL("/ops?success=cloudbeds_connected", request.url),
    );
  } catch (error) {
    console.error("[Cloudbeds] Callback error:", error);
    return NextResponse.redirect(
      new URL(
        `/ops?error=${encodeURIComponent("Failed to complete authorization")}`,
        request.url,
      ),
    );
  }
}
