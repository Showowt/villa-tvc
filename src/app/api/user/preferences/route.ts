// ═══════════════════════════════════════════════════════════════
// TVC USER PREFERENCES API - STUBBED
// The `preferences` column doesn't exist in the users table
// TODO: Add preferences column or separate user_preferences table
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase/client";
import { NextRequest, NextResponse } from "next/server";

interface UserPreferences {
  default_landing_page: string | null;
  quick_actions: string[];
  theme: "light" | "dark" | "system";
  language: "es" | "en";
  notifications_enabled: boolean;
}

// Default quick actions by department
function getDefaultQuickActions(department: string | null): string[] {
  switch (department) {
    case "kitchen":
      return ["/staff/pos", "/staff/inventory", "/staff/kitchen"];
    case "housekeeping":
      return ["/staff/checklist", "/staff/tasks", "/staff/linen"];
    case "maintenance":
      return [
        "/staff/tasks",
        "/staff/checklist",
        "/ops/preventive-maintenance",
      ];
    case "pool":
      return ["/staff/checklist", "/staff/tasks", "/staff/services"];
    case "front_desk":
      return ["/staff/tasks", "/staff/services", "/ops/booking-bot"];
    default:
      return ["/staff/tasks", "/staff/checklist", "/staff/inventory"];
  }
}

// GET - Obtener preferencias del usuario
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Obtener usuario autenticado
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado", data: null },
        { status: 401 },
      );
    }

    // Extraer token
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token invalido", data: null },
        { status: 401 },
      );
    }

    // Obtener perfil básico (sin campo preferences que no existe)
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, name, email, role, department")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado", data: null },
        { status: 404 },
      );
    }

    // Return default preferences since the preferences column doesn't exist
    const preferences: UserPreferences = {
      default_landing_page: null,
      quick_actions: getDefaultQuickActions(profile.department),
      theme: "dark",
      language: "es",
      notifications_enabled: true,
    };

    return NextResponse.json({
      data: {
        user: {
          id: profile.id,
          name: profile.name,
          email: profile.email,
          role: profile.role,
          department: profile.department,
        },
        preferences,
      },
      error: null,
      message: "Preferences returned from defaults - column not configured",
    });
  } catch (error) {
    console.error("[UserPreferences] GET error:", error);
    return NextResponse.json(
      { error: "Error interno", data: null },
      { status: 500 },
    );
  }
}

// PATCH - Actualizar preferencias (stubbed - no-op)
export async function PATCH(request: NextRequest) {
  try {
    const supabase = createServerClient();

    // Obtener usuario autenticado
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json(
        { error: "No autorizado", data: null },
        { status: 401 },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Token invalido", data: null },
        { status: 401 },
      );
    }

    // Parse body but don't save (preferences column doesn't exist)
    await request.json();

    return NextResponse.json({
      data: { message: "Preferencias no guardadas - columna no configurada" },
      error: null,
      warning:
        "Preferences column not in schema - changes not persisted. Add 'preferences JSONB' to users table.",
    });
  } catch (error) {
    console.error("[UserPreferences] PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno", data: null },
      { status: 500 },
    );
  }
}
