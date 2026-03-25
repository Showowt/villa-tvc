// ============================================
// VILLA TVC - Session API
// Issues #53 & #54 - Session Management Endpoints
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// ============================================
// SCHEMAS
// ============================================

const CreateSessionSchema = z.object({
  user_id: z.string().uuid(),
  device_fingerprint: z.string().optional(),
  device_name: z.string().optional(),
  remember_me: z.boolean().optional().default(false),
});

const UpdateActivitySchema = z.object({
  session_token: z.string().min(32),
});

const EndSessionSchema = z.object({
  session_token: z.string().min(32),
});

// Generate session token
function generateSessionToken(): string {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// ============================================
// POST - Create new session
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = CreateSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request data", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const { user_id, device_fingerprint, device_name, remember_me } =
      parsed.data;

    const supabase = createServerClient();

    // Get user role for timeout calculation
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", user_id)
      .single();

    if (userError || !user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get session config for role
    const { data: config } = await supabase
      .from("session_config")
      .select("*")
      .eq("role", user.role)
      .single();

    // Default timeouts
    const timeoutMinutes = remember_me
      ? (config?.remember_me_days ?? 7) * 24 * 60
      : (config?.timeout_minutes ?? 30);

    const maxSessions = config?.max_sessions ?? 3;

    // Check existing sessions
    const { data: existingSessions } = await supabase
      .from("user_sessions")
      .select("id, created_at")
      .eq("user_id", user_id)
      .eq("is_active", true)
      .order("created_at", { ascending: true });

    // Deactivate oldest sessions if at max
    if (existingSessions && existingSessions.length >= maxSessions) {
      const toDeactivate = existingSessions.slice(
        0,
        existingSessions.length - maxSessions + 1,
      );
      for (const session of toDeactivate) {
        await supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("id", session.id);

        // Log session ended
        await supabase.from("activity_log").insert({
          user_id,
          session_id: session.id,
          action_type: "session_expired",
          details: { reason: "max_sessions_reached" },
          ip_address: request.headers.get("x-forwarded-for"),
          user_agent: request.headers.get("user-agent"),
        });
      }
    }

    // Create new session
    const sessionToken = generateSessionToken();
    const expiresAt = new Date(
      Date.now() + timeoutMinutes * 60 * 1000,
    ).toISOString();

    const { data: newSession, error: createError } = await supabase
      .from("user_sessions")
      .insert({
        user_id,
        session_token: sessionToken,
        device_fingerprint: device_fingerprint ?? null,
        device_name: device_name ?? null,
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
        expires_at: expiresAt,
        is_remembered: remember_me,
        is_active: true,
      })
      .select()
      .single();

    if (createError) {
      console.error("[Session API] Create error:", createError);
      return NextResponse.json(
        { error: "Failed to create session" },
        { status: 500 },
      );
    }

    // Log login
    await supabase.from("activity_log").insert({
      user_id,
      session_id: newSession.id,
      action_type: "login",
      details: {
        device_name: device_name ?? "Unknown",
        remember_me,
        role: user.role,
      },
      ip_address: request.headers.get("x-forwarded-for"),
      user_agent: request.headers.get("user-agent"),
    });

    return NextResponse.json({
      session: newSession,
      timeout_minutes: remember_me ? null : (config?.timeout_minutes ?? 30),
    });
  } catch (error) {
    console.error("[Session API] POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// PATCH - Update session activity
// ============================================
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = UpdateActivitySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 400 },
      );
    }

    const { session_token } = parsed.data;
    const supabase = createServerClient();

    // Update last activity
    const { data: session, error } = await supabase
      .from("user_sessions")
      .update({ last_activity: new Date().toISOString() })
      .eq("session_token", session_token)
      .eq("is_active", true)
      .select()
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Session not found or expired" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      last_activity: session.last_activity,
    });
  } catch (error) {
    console.error("[Session API] PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// DELETE - End session (logout)
// ============================================
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = EndSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid session token" },
        { status: 400 },
      );
    }

    const { session_token } = parsed.data;
    const supabase = createServerClient();

    // Get session info for logging
    const { data: session } = await supabase
      .from("user_sessions")
      .select("id, user_id")
      .eq("session_token", session_token)
      .single();

    if (session) {
      // Log logout
      await supabase.from("activity_log").insert({
        user_id: session.user_id,
        session_id: session.id,
        action_type: "logout",
        ip_address: request.headers.get("x-forwarded-for"),
        user_agent: request.headers.get("user-agent"),
      });
    }

    // Deactivate session
    await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("session_token", session_token);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Session API] DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// ============================================
// GET - Validate session
// ============================================
export async function GET(request: NextRequest) {
  try {
    const sessionToken = request.headers.get("x-session-token");

    if (!sessionToken) {
      return NextResponse.json({ error: "No session token" }, { status: 401 });
    }

    const supabase = createServerClient();

    // Get session with user info
    const { data: session, error } = await supabase
      .from("user_sessions")
      .select(
        `
        *,
        user:users(id, name, email, role, department, avatar_url, is_active)
      `,
      )
      .eq("session_token", sessionToken)
      .eq("is_active", true)
      .single();

    if (error || !session) {
      return NextResponse.json(
        { error: "Invalid or expired session" },
        { status: 401 },
      );
    }

    // Check if session expired
    if (new Date(session.expires_at) < new Date()) {
      // Mark as expired
      await supabase
        .from("user_sessions")
        .update({ is_active: false })
        .eq("id", session.id);

      await supabase.from("activity_log").insert({
        user_id: session.user_id,
        session_id: session.id,
        action_type: "session_expired",
        details: { reason: "explicit_expiry" },
      });

      return NextResponse.json({ error: "Session expired" }, { status: 401 });
    }

    // Get timeout config
    const { data: config } = await supabase
      .from("session_config")
      .select("timeout_minutes")
      .eq("role", (session.user as unknown as { role: string }).role)
      .single();

    // Check activity timeout (if not remembered)
    if (!session.is_remembered) {
      const lastActivity = new Date(session.last_activity);
      const timeoutMs = (config?.timeout_minutes ?? 30) * 60 * 1000;

      if (Date.now() - lastActivity.getTime() > timeoutMs) {
        // Mark as timed out
        await supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("id", session.id);

        await supabase.from("activity_log").insert({
          user_id: session.user_id,
          session_id: session.id,
          action_type: "session_timeout",
          details: { timeout_minutes: config?.timeout_minutes ?? 30 },
        });

        return NextResponse.json(
          { error: "Session timed out" },
          { status: 401 },
        );
      }
    }

    return NextResponse.json({
      valid: true,
      session: {
        id: session.id,
        last_activity: session.last_activity,
        expires_at: session.expires_at,
        is_remembered: session.is_remembered,
      },
      user: session.user,
      timeout_minutes: session.is_remembered
        ? null
        : (config?.timeout_minutes ?? 30),
    });
  } catch (error) {
    console.error("[Session API] GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
