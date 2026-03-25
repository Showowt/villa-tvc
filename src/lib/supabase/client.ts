// ═══════════════════════════════════════════════════════════════
// TVC SUPABASE CLIENT - P0 Day 1 Fix
// Issue #82 — Clear errors when env vars missing
// ═══════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";
import { isConfigured } from "@/lib/env";

// ─────────────────────────────────────────────────────────────────
// SERVER CLIENT (Service Role - Full Access)
// Use in API routes and server actions
// ─────────────────────────────────────────────────────────────────
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL\n\n" +
        "Fix: Add to .env.local or Vercel environment variables.\n" +
        "Get from: Supabase Dashboard > Project Settings > API\n\n" +
        "See /error-config for full diagnostic.",
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY\n\n" +
        "Fix: Add to .env.local or Vercel environment variables.\n" +
        "Get from: Supabase Dashboard > Project Settings > API > service_role key\n" +
        "WARNING: This key bypasses RLS - never expose to client.\n\n" +
        "See /error-config for full diagnostic.",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// BROWSER CLIENT (Anon Key - RLS Protected)
// Use in client components
// ─────────────────────────────────────────────────────────────────
export function createBrowserClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL\n\n" +
        "This error should not appear in production. " +
        "The app should have failed to build without this variable.\n\n" +
        "Fix: Add to .env.local and rebuild.\n" +
        "Get from: Supabase Dashboard > Project Settings > API",
    );
  }

  if (!supabaseKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
        "This error should not appear in production. " +
        "The app should have failed to build without this variable.\n\n" +
        "Fix: Add to .env.local and rebuild.\n" +
        "Get from: Supabase Dashboard > Project Settings > API > anon key",
    );
  }

  return createClient<Database>(supabaseUrl, supabaseKey);
}

// ─────────────────────────────────────────────────────────────────
// AVAILABILITY CHECKS
// Use for graceful UI degradation
// ─────────────────────────────────────────────────────────────────

/**
 * Check if browser client can be created
 * Use before attempting database operations in client components
 */
export function isBrowserClientAvailable(): boolean {
  return (
    isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
    isConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

/**
 * Check if server client can be created
 * Use before attempting admin operations
 */
export function isServerClientAvailable(): boolean {
  return (
    isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
    isConfigured("SUPABASE_SERVICE_ROLE_KEY")
  );
}

/**
 * Get browser client if available, otherwise return null
 * Useful for optional features that shouldn't crash the app
 */
export function getBrowserClientSafe() {
  if (!isBrowserClientAvailable()) {
    console.warn("[Supabase] Browser client not available - missing env vars");
    return null;
  }

  try {
    return createBrowserClient();
  } catch (error) {
    console.error("[Supabase] Failed to create browser client:", error);
    return null;
  }
}

/**
 * Get server client if available, otherwise return null
 * Useful for optional server features
 */
export function getServerClientSafe() {
  if (!isServerClientAvailable()) {
    console.warn("[Supabase] Server client not available - missing env vars");
    return null;
  }

  try {
    return createServerClient();
  } catch (error) {
    console.error("[Supabase] Failed to create server client:", error);
    return null;
  }
}
