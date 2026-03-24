import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/types/database";

type User = Database["public"]["Tables"]["users"]["Row"];

// Server component client with cookie handling (for auth)
export async function createAuthServerClient() {
  const cookieStore = await cookies();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

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
          // Server Component - ignore
        }
      },
    },
  });
}

// Get current user with role
export async function getCurrentUser(): Promise<User | null> {
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
}

// Check if user has required role
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
