// ============================================
// VILLA TVC - Session Manager
// Issues #53 & #54 - Session Timeout Management
// ============================================

import { createBrowserClient } from "@/lib/supabase/client";
import type {
  UserSession,
  CreateSessionInput,
  LogActivityInput,
  ActivityActionType,
  AuthUser,
  UserRole,
} from "@/types/security";
import {
  getSessionTimeout,
  getRememberMeDays,
  getMaxSessions,
  isSessionExpired,
  getTimeUntilTimeout,
  TIMEOUT_WARNING_THRESHOLD,
} from "@/types/security";

// Generate a unique session token
function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
}

// Get device fingerprint (simple version)
function getDeviceFingerprint(): string {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
  ];
  return btoa(components.join("|")).slice(0, 32);
}

// Get device name
function getDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows";
  if (/Linux/.test(ua)) return "Linux";
  return "Unknown Device";
}

// ============================================
// SESSION CRUD OPERATIONS
// ============================================

/**
 * Create a new session for the user
 */
export async function createSession(
  input: CreateSessionInput,
): Promise<UserSession | null> {
  try {
    const supabase = createBrowserClient();

    // Get user role for timeout calculation
    const { data: user } = await supabase
      .from("users")
      .select("role")
      .eq("id", input.user_id)
      .single();

    if (!user) return null;

    const role = user.role as UserRole;
    const rememberMe = input.remember_me ?? false;

    // Calculate expiration
    const timeoutMinutes = rememberMe
      ? getRememberMeDays(role) * 24 * 60
      : getSessionTimeout(role);

    const expiresAt = new Date(
      Date.now() + timeoutMinutes * 60 * 1000,
    ).toISOString();

    // Check max sessions
    const maxSessions = getMaxSessions(role);
    const { data: existingSessions } = await supabase
      .from("user_sessions")
      .select("id, created_at")
      .eq("user_id", input.user_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // If at max, deactivate oldest session
    if (existingSessions && existingSessions.length >= maxSessions) {
      const sessionsToDeactivate = existingSessions.slice(
        0,
        existingSessions.length - maxSessions + 1,
      );
      for (const session of sessionsToDeactivate) {
        await supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("id", session.id);
      }
    }

    // Create new session
    const sessionToken = generateSessionToken();
    const deviceFingerprint =
      input.device_fingerprint ?? getDeviceFingerprint();
    const deviceName = input.device_name ?? getDeviceName();

    const { data: newSession, error } = await supabase
      .from("user_sessions")
      .insert({
        user_id: input.user_id,
        session_token: sessionToken,
        device_fingerprint: deviceFingerprint,
        device_name: deviceName,
        ip_address: input.ip_address ?? null,
        user_agent: input.user_agent ?? navigator.userAgent,
        expires_at: expiresAt,
        is_remembered: rememberMe,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("[Session] Create error:", error);
      return null;
    }

    // Store session token in localStorage
    localStorage.setItem("tvc_session_token", sessionToken);
    if (rememberMe) {
      localStorage.setItem("tvc_remember_device", deviceFingerprint);
    }

    // Log the login
    await logActivity({
      action_type: "login",
      details: {
        device_name: deviceName,
        remember_me: rememberMe,
      },
    });

    return newSession as UserSession;
  } catch (error) {
    console.error("[Session] Create error:", error);
    return null;
  }
}

/**
 * Get current session
 */
export async function getCurrentSession(): Promise<UserSession | null> {
  try {
    const sessionToken = localStorage.getItem("tvc_session_token");
    if (!sessionToken) return null;

    const supabase = createBrowserClient();

    const { data: session, error } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .single();

    if (error || !session) {
      localStorage.removeItem("tvc_session_token");
      return null;
    }

    return session as UserSession;
  } catch {
    return null;
  }
}

/**
 * Update session last activity
 */
export async function updateSessionActivity(): Promise<boolean> {
  try {
    const sessionToken = localStorage.getItem("tvc_session_token");
    if (!sessionToken) return false;

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("user_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("session_token", sessionToken)
      .eq("is_active", true);

    return !error;
  } catch {
    return false;
  }
}

/**
 * End (logout) session
 */
export async function endSession(): Promise<boolean> {
  try {
    const sessionToken = localStorage.getItem("tvc_session_token");
    if (!sessionToken) return true;

    const supabase = createBrowserClient();

    // Log the logout
    await logActivity({
      action_type: "logout",
    });

    // Deactivate session
    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("session_token", sessionToken);

    // Sign out from Supabase auth
    await supabase.auth.signOut();

    // Clear local storage
    localStorage.removeItem("tvc_session_token");

    return true;
  } catch (error) {
    console.error("[Session] End error:", error);
    return false;
  }
}

/**
 * End all sessions for user (logout everywhere)
 */
export async function endAllSessions(userId: string): Promise<boolean> {
  try {
    const supabase = createBrowserClient();

    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", userId);

    localStorage.removeItem("tvc_session_token");
    localStorage.removeItem("tvc_remember_device");

    return true;
  } catch {
    return false;
  }
}

/**
 * Get all active sessions for user
 */
export async function getUserSessions(userId: string): Promise<UserSession[]> {
  try {
    const supabase = createBrowserClient();

    const { data: sessions } = await supabase
      .from("user_sessions")
      .select("*")
      .eq("user_id", userId)
      .eq("is_active", true)
      .order("last_activity", { ascending: false });

    return (sessions as UserSession[]) ?? [];
  } catch {
    return [];
  }
}

// ============================================
// ACTIVITY LOGGING
// ============================================

/**
 * Log user activity
 */
export async function logActivity(input: LogActivityInput): Promise<boolean> {
  try {
    const supabase = createBrowserClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) return false;

    // Get current session
    const session = await getCurrentSession();

    const { error } = await supabase.from("activity_log").insert({
      user_id: profile.id,
      session_id: session?.id ?? null,
      action_type: input.action_type,
      resource_type: input.resource_type ?? null,
      resource_id: input.resource_id ?? null,
      page_path: input.page_path ?? window.location.pathname,
      details: input.details ?? {},
      user_agent: navigator.userAgent,
    });

    return !error;
  } catch {
    return false;
  }
}

/**
 * Log page view
 */
export async function logPageView(path: string): Promise<void> {
  await logActivity({
    action_type: "page_view",
    page_path: path,
  });
}

/**
 * Log data access
 */
export async function logDataAccess(
  resourceType: string,
  resourceId?: string,
): Promise<void> {
  await logActivity({
    action_type: "data_access",
    resource_type: resourceType,
    resource_id: resourceId,
  });
}

/**
 * Log permission denied
 */
export async function logPermissionDenied(
  resourceType: string,
  action: string,
): Promise<void> {
  await logActivity({
    action_type: "permission_denied",
    resource_type: resourceType,
    details: { action },
  });
}

// ============================================
// SESSION TIMEOUT CHECKER
// ============================================

export interface SessionCheckResult {
  isValid: boolean;
  user: AuthUser | null;
  session: UserSession | null;
  timeUntilTimeout: number;
  showWarning: boolean;
}

/**
 * Check if current session is valid and get timeout info
 */
export async function checkSession(): Promise<SessionCheckResult> {
  const emptyResult: SessionCheckResult = {
    isValid: false,
    user: null,
    session: null,
    timeUntilTimeout: 0,
    showWarning: false,
  };

  try {
    const supabase = createBrowserClient();

    // Check Supabase auth
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) return emptyResult;

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", authUser.id)
      .single();

    if (!profile) return emptyResult;

    // Get current session
    const session = await getCurrentSession();
    if (!session) return emptyResult;

    const role = profile.role as UserRole;
    const lastActivity = new Date(session.last_activity);

    // Check if expired
    if (isSessionExpired(lastActivity, role, session.is_remembered)) {
      // Log timeout
      await logActivity({
        action_type: "session_timeout",
        details: { timeout_minutes: getSessionTimeout(role) },
      });

      // End session
      await endSession();
      return emptyResult;
    }

    // Calculate time until timeout
    const timeUntilTimeout = getTimeUntilTimeout(
      lastActivity,
      role,
      session.is_remembered,
    );
    const showWarning = timeUntilTimeout < TIMEOUT_WARNING_THRESHOLD;

    return {
      isValid: true,
      user: profile as AuthUser,
      session,
      timeUntilTimeout,
      showWarning,
    };
  } catch {
    return emptyResult;
  }
}

/**
 * Extend session (reset timeout)
 */
export async function extendSession(): Promise<boolean> {
  return updateSessionActivity();
}
