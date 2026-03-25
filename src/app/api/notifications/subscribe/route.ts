// ============================================
// TVC PUSH NOTIFICATIONS - Subscribe API
// Register Web Push subscription for user
// ============================================

import { NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/client";
import { getVapidPublicKey } from "@/lib/push-notifications";

// ─── VALIDATION SCHEMA ───
const subscribeSchema = z.object({
  userId: z.string().uuid(),
  subscription: z.object({
    endpoint: z.string().url(),
    keys: z.object({
      p256dh: z.string().min(1),
      auth: z.string().min(1),
    }),
  }),
  deviceInfo: z
    .object({
      userAgent: z.string().optional(),
      platform: z.string().optional(),
      language: z.string().optional(),
    })
    .optional(),
});

const unsubscribeSchema = z.object({
  endpoint: z.string().url(),
});

// ─── GET: Return VAPID public key ───
export async function GET() {
  try {
    const vapidKey = getVapidPublicKey();

    if (!vapidKey) {
      return NextResponse.json(
        {
          error: true,
          message: "Push notifications not configured",
          message_es: "Notificaciones push no configuradas",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      vapidPublicKey: vapidKey,
    });
  } catch (error) {
    console.error("[Notifications/Subscribe] GET error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Failed to get VAPID key",
      },
      { status: 500 },
    );
  }
}

// ─── POST: Register new subscription ───
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validation = subscribeSchema.safeParse(body);

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

    const { userId, subscription, deviceInfo } = validation.data;
    const supabase = createServerClient();

    // Verify user exists
    const { data: user } = await supabase
      .from("users")
      .select("id, name")
      .eq("id", userId)
      .single();

    if (!user) {
      return NextResponse.json(
        {
          error: true,
          message: "Usuario no encontrado",
        },
        { status: 404 },
      );
    }

    // Check if subscription already exists
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("id, is_active")
      .eq("endpoint", subscription.endpoint)
      .single();

    if (existing) {
      // Reactivate if inactive
      if (!existing.is_active) {
        await supabase
          .from("push_subscriptions")
          .update({
            is_active: true,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            device_info: deviceInfo || {},
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }

      return NextResponse.json({
        success: true,
        subscriptionId: existing.id,
        message: "Suscripcion reactivada",
        reactivated: true,
      });
    }

    // Create new subscription
    const { data: newSub, error: insertError } = await supabase
      .from("push_subscriptions")
      .insert({
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        device_info: deviceInfo || {},
        is_active: true,
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("[Notifications/Subscribe] Insert error:", insertError);
      return NextResponse.json(
        {
          error: true,
          message: "Error al guardar suscripcion",
        },
        { status: 500 },
      );
    }

    // Ensure user has notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("id")
      .eq("user_id", userId)
      .single();

    if (!prefs) {
      await supabase.from("notification_preferences").insert({
        user_id: userId,
      });
    }

    console.log(
      `[Notifications/Subscribe] New subscription for user ${user.name}`,
    );

    return NextResponse.json({
      success: true,
      subscriptionId: newSub.id,
      message: "Notificaciones activadas",
      created: true,
    });
  } catch (error) {
    console.error("[Notifications/Subscribe] POST error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}

// ─── DELETE: Unsubscribe ───
export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const validation = unsubscribeSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: true,
          message: "Datos invalidos",
        },
        { status: 400 },
      );
    }

    const { endpoint } = validation.data;
    const supabase = createServerClient();

    // Mark subscription as inactive (don't delete for audit trail)
    const { error: updateError } = await supabase
      .from("push_subscriptions")
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq("endpoint", endpoint);

    if (updateError) {
      console.error(
        "[Notifications/Subscribe] Unsubscribe error:",
        updateError,
      );
      return NextResponse.json(
        {
          error: true,
          message: "Error al desactivar suscripcion",
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Notificaciones desactivadas",
    });
  } catch (error) {
    console.error("[Notifications/Subscribe] DELETE error:", error);
    return NextResponse.json(
      {
        error: true,
        message: "Error interno del servidor",
      },
      { status: 500 },
    );
  }
}
