// ═══════════════════════════════════════════════════════════════
// API DETALLE DE CONTACTO - Issue #59
// Obtiene toda la información de un contacto y sus conversaciones
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/env";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: contactId } = await params;

    // Verificar configuración
    if (!isConfigured("NEXT_PUBLIC_SUPABASE_URL")) {
      return NextResponse.json(
        { error: "Base de datos no configurada" },
        { status: 503 },
      );
    }

    const supabase = createServerClient();

    // Intentar buscar en unified_contacts primero
    let contact = null;
    let conversations: Array<{
      id: string;
      channel: string;
      status: string;
      started_at: string;
      last_message_at: string | null;
      unread_count: number;
      summary: string | null;
      escalation_reason: string | null;
    }> = [];
    let messages: Array<{
      id: string;
      conversation_id: string;
      role: string;
      content: string;
      created_at: string;
      channel: string;
    }> = [];

    // Primero intentar obtener de unified_contacts
    const { data: unifiedContact } = await supabase
      .from("unified_contacts")
      .select("*")
      .eq("id", contactId)
      .single();

    if (unifiedContact) {
      contact = {
        id: unifiedContact.id,
        phone: unifiedContact.phone,
        email: unifiedContact.email,
        name: unifiedContact.name,
        contact_type: unifiedContact.contact_type || "guest",
        preferred_language: unifiedContact.preferred_language || "es",
        preferred_channel: unifiedContact.preferred_channel || "whatsapp",
        tags: unifiedContact.tags || [],
        notes: unifiedContact.notes,
        total_conversations: unifiedContact.total_conversations || 0,
        total_messages: unifiedContact.total_messages || 0,
        last_contact_at: unifiedContact.last_contact_at,
        first_contact_at: unifiedContact.first_contact_at,
      };

      // Obtener conversaciones del contacto unificado
      const { data: convData } = await supabase
        .from("conversations")
        .select(
          "id, channel, status, started_at, last_message_at, unread_count, summary, escalation_reason",
        )
        .eq("unified_contact_id", contactId)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      conversations = convData || [];
    } else {
      // Buscar por ID de conversación (compatibilidad con datos sin unified_contacts)
      const { data: conv } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", contactId)
        .single();

      if (!conv) {
        // Intentar buscar por teléfono
        const { data: convsByPhone } = await supabase
          .from("conversations")
          .select("*")
          .eq("contact_phone", contactId)
          .order("last_message_at", { ascending: false });

        if (!convsByPhone || convsByPhone.length === 0) {
          return NextResponse.json(
            { error: "Contacto no encontrado" },
            { status: 404 },
          );
        }

        // Usar la primera conversación para construir el contacto
        const firstConv = convsByPhone[0];
        contact = {
          id: firstConv.contact_phone || firstConv.id,
          phone: firstConv.contact_phone,
          email: firstConv.contact_email,
          name: firstConv.contact_name,
          contact_type: firstConv.contact_type || "guest",
          preferred_language: firstConv.language || "es",
          preferred_channel: firstConv.channel || "whatsapp",
          tags: [],
          notes: null,
          total_conversations: convsByPhone.length,
          total_messages: 0,
          last_contact_at: firstConv.last_message_at,
          first_contact_at: firstConv.started_at,
        };

        conversations = convsByPhone.map((c) => ({
          id: c.id,
          channel: c.channel,
          status: c.status || "active",
          started_at: c.started_at,
          last_message_at: c.last_message_at,
          unread_count: c.unread_count || 0,
          summary: c.summary,
          escalation_reason: c.escalation_reason,
        }));
      } else {
        // Construir contacto desde la conversación
        contact = {
          id: conv.contact_phone || conv.id,
          phone: conv.contact_phone,
          email: conv.contact_email,
          name: conv.contact_name,
          contact_type: conv.contact_type || "guest",
          preferred_language: conv.language || "es",
          preferred_channel: conv.channel || "whatsapp",
          tags: [],
          notes: null,
          total_conversations: 1,
          total_messages: 0,
          last_contact_at: conv.last_message_at,
          first_contact_at: conv.started_at,
        };

        // Buscar todas las conversaciones con el mismo teléfono
        if (conv.contact_phone) {
          const { data: allConvs } = await supabase
            .from("conversations")
            .select(
              "id, channel, status, started_at, last_message_at, unread_count, summary, escalation_reason",
            )
            .eq("contact_phone", conv.contact_phone)
            .order("last_message_at", { ascending: false, nullsFirst: false });

          conversations = allConvs || [
            {
              id: conv.id,
              channel: conv.channel,
              status: conv.status || "active",
              started_at: conv.started_at,
              last_message_at: conv.last_message_at,
              unread_count: conv.unread_count || 0,
              summary: conv.summary,
              escalation_reason: conv.escalation_reason,
            },
          ];

          contact.total_conversations = conversations.length;
        } else {
          conversations = [
            {
              id: conv.id,
              channel: conv.channel,
              status: conv.status || "active",
              started_at: conv.started_at,
              last_message_at: conv.last_message_at,
              unread_count: conv.unread_count || 0,
              summary: conv.summary,
              escalation_reason: conv.escalation_reason,
            },
          ];
        }
      }
    }

    // Obtener mensajes de todas las conversaciones
    if (conversations.length > 0) {
      const conversationIds = conversations.map((c) => c.id);

      const { data: messagesData } = await supabase
        .from("messages")
        .select("id, conversation_id, role, content, created_at")
        .in("conversation_id", conversationIds)
        .order("created_at", { ascending: true });

      if (messagesData) {
        // Agregar canal a cada mensaje
        const channelMap = new Map(conversations.map((c) => [c.id, c.channel]));
        messages = messagesData.map((m) => ({
          ...m,
          channel: channelMap.get(m.conversation_id) || "unknown",
        }));

        // Actualizar total de mensajes
        contact.total_messages = messages.length;
      }
    }

    return NextResponse.json({
      contact,
      conversations,
      messages,
    });
  } catch (error) {
    console.error("[Contact API] Error:", error);
    return NextResponse.json(
      { error: "Error al cargar contacto" },
      { status: 500 },
    );
  }
}
