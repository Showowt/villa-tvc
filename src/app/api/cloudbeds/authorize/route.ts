// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS OAUTH — Authorization Start
// Redirects to Cloudbeds for user authorization
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";
import { getAuthorizationUrl } from "@/lib/cloudbeds";

export async function GET() {
  try {
    // Generate a random state for CSRF protection
    const state = crypto.randomUUID();

    // Get the authorization URL
    const authUrl = getAuthorizationUrl(state);

    console.log("[Cloudbeds] Starting OAuth flow, redirecting to:", authUrl);

    // Redirect to Cloudbeds authorization page
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error("[Cloudbeds] Authorization error:", error);
    return NextResponse.json(
      { error: "Failed to start authorization" },
      { status: 500 },
    );
  }
}
