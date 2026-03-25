// ═══════════════════════════════════════════════════════════════
// TVC USER PREFERENCES API - Issue #10
// Guardar/cargar preferencias de usuario incluyendo shortcuts
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

    // Obtener perfil y preferencias
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(
        "id, name, email, role, department, default_landing_page, preferences",
      )
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Perfil no encontrado", data: null },
        { status: 404 },
      );
    }

    // Parsear preferencias (puede ser JSON o null)
    const preferences: UserPreferences = {
      default_landing_page: profile.default_landing_page,
      quick_actions:
        ((profile.preferences as Record<string, unknown>)
          ?.quick_actions as string[]) ||
        getDefaultQuickActions(profile.department),
      theme:
        ((profile.preferences as Record<string, unknown>)?.theme as
          | "light"
          | "dark"
          | "system") || "dark",
      language:
        ((profile.preferences as Record<string, unknown>)?.language as
          | "es"
          | "en") || "es",
      notifications_enabled:
        ((profile.preferences as Record<string, unknown>)
          ?.notifications_enabled as boolean) ?? true,
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
    });
  } catch (error) {
    console.error("[UserPreferences] GET error:", error);
    return NextResponse.json(
      { error: "Error interno", data: null },
      { status: 500 },
    );
  }
}

// PATCH - Actualizar preferencias
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

    // Parsear body
    const body = await request.json();
    const {
      default_landing_page,
      quick_actions,
      theme,
      language,
      notifications_enabled,
    } = body;

    // Obtener perfil actual
    const { data: currentProfile } = await supabase
      .from("users")
      .select("preferences")
      .eq("auth_id", user.id)
      .single();

    // Merge con preferencias existentes
    const currentPrefs =
      (currentProfile?.preferences as Record<string, unknown>) || {};
    const updatedPreferences = {
      ...currentPrefs,
      ...(quick_actions !== undefined && { quick_actions }),
      ...(theme !== undefined && { theme }),
      ...(language !== undefined && { language }),
      ...(notifications_enabled !== undefined && { notifications_enabled }),
    };

    // Actualizar usuario
    const updateData: Record<string, unknown> = {
      preferences: updatedPreferences,
      updated_at: new Date().toISOString(),
    };

    // Solo actualizar default_landing_page si se proporciona
    if (default_landing_page !== undefined) {
      updateData.default_landing_page = default_landing_page;
    }

    const { error: updateError } = await supabase
      .from("users")
      .update(updateData)
      .eq("auth_id", user.id);

    if (updateError) {
      console.error("[UserPreferences] Update error:", updateError);
      return NextResponse.json(
        { error: "Error al guardar preferencias", data: null },
        { status: 500 },
      );
    }

    return NextResponse.json({
      data: { message: "Preferencias actualizadas" },
      error: null,
    });
  } catch (error) {
    console.error("[UserPreferences] PATCH error:", error);
    return NextResponse.json(
      { error: "Error interno", data: null },
      { status: 500 },
    );
  }
}

// Acciones rapidas por defecto segun departamento
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
