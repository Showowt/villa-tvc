// ============================================
// TVC NOTIFICATIONS - Preferences API
// Get/update notification preferences per user
// ============================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";

// ─── VALIDATION SCHEMA ───
const updatePrefsSchema = z.object({
  userId: z.string().uuid(),
  preferences: z.object({
    low_stock_enabled: z.boolean().optional(),
    cleaning_deadline_enabled: z.boolean().optional(),
    checklist_submitted_enabled: z.boolean().optional(),
    task_assigned_enabled: z.boolean().optional(),
    escalation_enabled: z.boolean().optional(),
    order_placed_enabled: z.boolean().optional(),
    maintenance_alert_enabled: z.boolean().optional(),
    quiet_hours_enabled: z.boolean().optional(),
    quiet_hours_start: z.string().optional(),
    quiet_hours_end: z.string().optional(),
    prefer_push: z.boolean().optional(),
    fallback_to_whatsapp: z.boolean().optional(),
  }),
});

// ─── GET: Get user preferences ───
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        {
          error: true,
          message: "userId es requerido",
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Get preferences
    const { data: prefs, error } = await supabase
      .from("notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error && error.code !== "PGRST116") {
      console.error("[Notifications/Preferences] GET error:", error);
      return NextResponse.json(
        {
          error: true,
          message: "Error al obtener preferencias",
        },
        { status: 500 },
      );
    }

    // If no preferences exist, create defaults
    if (!prefs) {
      const { data: newPrefs, error: insertError } = await supabase
        .from("notification_preferences")
        .insert({ user_id: userId })
        .select("*")
        .single();

      if (insertError) {
        console.error("[Notifications/Preferences] Insert error:", insertError);
        return NextResponse.json(
          {
            error: true,
            message: "Error al crear preferencias",
          },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        preferences: newPrefs,
      });
    }

    // Get subscription count
    const { count: subscriptionCount } = await supabase
      .from("push_subscriptions")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("is_active", true);

    return NextResponse.json({
      success: true,
      preferences: prefs,
      activeSubscriptions: subscriptionCount || 0,
    });
  } catch (error) {
    console.error("[Notifications/Preferences] GET error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

// ─── PUT: Update user preferences ───
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const validation = updatePrefsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: true,
          message: "Datos invalidos",
          details: validation.error.flatten(),
        },
        { status: 400 },
      );
    }

    const { userId, preferences } = validation.data;
    const supabase = createServerClient();

    // Update preferences
    const { data: updated, error } = await supabase
      .from("notification_preferences")
      .upsert({
        user_id: userId,
        ...preferences,
        updated_at: new Date().toISOString(),
      })
      .select("*")
      .single();

    if (error) {
      console.error("[Notifications/Preferences] Update error:", error);
      return NextResponse.json(
        {
          error: true,
          message: "Error al actualizar preferencias",
        },
        { status: 500 },
      );
    }

    console.log(`[Notifications/Preferences] Updated for user ${userId}`);

    return NextResponse.json({
      success: true,
      preferences: updated,
      message: "Preferencias actualizadas",
    });
  } catch (error) {
    console.error("[Notifications/Preferences] PUT error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
