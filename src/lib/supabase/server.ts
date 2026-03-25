// ═══════════════════════════════════════════════════════════════
// TVC SUPABASE SERVER CLIENT - P0 Day 1 Fix
// Issue #82 — Clear errors when env vars missing
// For Server Components with auth cookie handling
// ═══════════════════════════════════════════════════════════════

import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";
import { isConfigured } from "@/lib/env";

type User = Database["public"]["Tables"]["users"]["Row"];

// ─────────────────────────────────────────────────────────────────
// AUTH SERVER CLIENT
// For Server Components that need to read auth state
// ─────────────────────────────────────────────────────────────────
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

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
      "Missing NEXT_PUBLIC_SUPABASE_ANON_KEY\n\n" +
        "Fix: Add to .env.local or Vercel environment variables.\n" +
        "Get from: Supabase Dashboard > Project Settings > API > anon key\n\n" +
        "See /error-config for full diagnostic.",
    );
  }

  return createSupabaseServerClient<Database>(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[],
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Component - ignore cookie set errors
        }
      },
    },
  });
}

// ─────────────────────────────────────────────────────────────────
// GET CURRENT USER
// Returns user profile with role if authenticated
// ─────────────────────────────────────────────────────────────────
export async function getCurrentUser(): Promise<User | null> {
  // Check if Supabase is configured before attempting
  if (
    !isConfigured("NEXT_PUBLIC_SUPABASE_URL") ||
    !isConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  ) {
    console.warn(
      "[Auth] Supabase not configured - getCurrentUser returning null",
    );
    return null;
  }

  try {
    const supabase = await createAuthServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    // Get user profile with role
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", user.id)
      .single();

    return profile as User | null;
  } catch (error) {
    console.error("[Auth] Error getting current user:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// ROLE-BASED ACCESS CONTROL
// Check if user has required role
// ─────────────────────────────────────────────────────────────────
export async function requireRole(
  allowedRoles: ("owner" | "manager" | "staff" | "guest")[],
) {
  const user = await getCurrentUser();

  if (!user) {
    return {
      authorized: false,
      user: null,
      error: "Not authenticated",
    } as const;
  }

  const userRole = user.role as "owner" | "manager" | "staff" | "guest";
  if (!allowedRoles.includes(userRole)) {
    return {
      authorized: false,
      user,
      error: "Insufficient permissions",
    } as const;
  }

  return { authorized: true, user, error: null } as const;
}

// ─────────────────────────────────────────────────────────────────
// AVAILABILITY CHECK
// ─────────────────────────────────────────────────────────────────
export function isAuthAvailable(): boolean {
  return (
    isConfigured("NEXT_PUBLIC_SUPABASE_URL") &&
    isConfigured("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}
