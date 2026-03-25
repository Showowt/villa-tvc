// ═══════════════════════════════════════════════════════════════
// API ENVIAR RESPUESTA - Issue #59
// Envía mensaje a contacto por el canal seleccionado
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { sendWhatsAppMessage, normalizePhoneNumber } from "@/lib/twilio/client";
import { isConfigured } from "@/lib/env";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body = await request.json();
    const { message, channel, conversationId } = body;

    // Validar entrada
    if (!message || !message.trim()) {
      return NextResponse.json(
        { error: "El mensaje es requerido" },
        { status: 400 }
      );
    }

    // Verificar configuración
    if (!isConfigured("NEXT_PUBLIC_SUPABASE_URL")) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 503 }
      );
    }

    const supabase = createServerClient();

    // Obtener información del contacto
    let contactPhone: string | null = null;

    // Intentar obtener de unified_contacts primero
    const { data: unifiedContact } = await supabase
      .from("unified_contacts")
      .select("phone, name")
      .eq("id", contactId)
      .single();

    if (unifiedContact) {
      contactPhone = unifiedContact.phone;
    } else {
      // Buscar en conversación
      const { data: conv } = await supabase
        .from("conversations")
        .select("contact_phone")
        .eq("id", conversationId || contactId)
        .single();

      if (conv) {
        contactPhone = conv.contact_phone;
      }
    }

    // Enviar mensaje según el canal
    if (channel === "whatsapp") {
      if (!contactPhone) {
        return NextResponse.json(
          { error: "No se encontró número de teléfono para WhatsApp" },
          { status: 400 }
        );
      }

      // Verificar configuración de Twilio
      if (!isConfigured("TWILIO_ACCOUNT_SID")) {
        return NextResponse.json(
          { error: "WhatsApp no configurado" },
          { status: 503 }
        );
      }

      // Enviar por WhatsApp
      const normalizedPhone = normalizePhoneNumber(contactPhone);
      const result = await sendWhatsAppMessage(normalizedPhone, message.trim());

      if (!result.success) {
        console.error("[Reply API] WhatsApp error:", result.error);
        return NextResponse.json(
          { error: `Error al enviar WhatsApp: ${result.error}` },
          { status: 500 }
        );
      }
    }

    // Guardar mensaje en la base de datos
    let targetConversationId = conversationId;

    // Si no hay conversación específica, buscar o crear una
    if (!targetConversationId) {
      // Buscar conversación activa del canal
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .eq("unified_contact_id", contactId)
        .eq("channel", channel)
        .eq("status", "active")
        .order("last_message_at", { ascending: false })
        .limit(1)
        .single();

      if (existingConv) {
        targetConversationId = existingConv.id;
      } else {
        // Crear nueva conversación
        const { data: newConv, error: convError } = await supabase
          .from("conversations")
          .insert({
            channel: channel,
            contact_type: "guest",
            contact_phone: contactPhone,
            status: "active",
            unified_contact_id: contactId,
          })
          .select("id")
          .single();

        if (convError) {
          console.error("[Reply API] Error creating conversation:", convError);
          return NextResponse.json(
            { error: "Error al crear conversación" },
            { status: 500 }
          );
        }

        targetConversationId = newConv.id;
      }
    }

    // Insertar mensaje
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: targetConversationId,
      role: "assistant",
      content: message.trim(),
    });

    if (msgError) {
      console.error("[Reply API] Error saving message:", msgError);
      // No fallar si el mensaje ya se envió por WhatsApp
    }

    // Actualizar conversación
    await supabase
      .from("conversations")
      .update({
        last_message_at: new Date().toISOString(),
        summary: message.trim().substring(0, 200),
      })
      .eq("id", targetConversationId);

    return NextResponse.json({
      success: true,
      channel,
      conversationId: targetConversationId,
    });
  } catch (error) {
    console.error("[Reply API] Error:", error);
    return NextResponse.json(
      { error: "Error al enviar mensaje" },
      { status: 500 }
    );
  }
}
