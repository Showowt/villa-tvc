// ═══════════════════════════════════════════════════════════════
// API BANDEJA DE ENTRADA UNIFICADA - Issue #59
// Lista todas las conversaciones ordenadas por último mensaje
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { isConfigured } from "@/lib/env";

export async function GET(request: NextRequest) {
  try {
    // Verificar configuración
    if (!isConfigured("NEXT_PUBLIC_SUPABASE_URL")) {
      return NextResponse.json(
        {
          error: "Base de datos no configurada",
          contacts: [],
        },
        { status: 503 },
      );
    }

    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);

    // Parámetros de filtrado
    const search = searchParams.get("search");
    const status = searchParams.get("status"); // all, active, escalated, resolved
    const channel = searchParams.get("channel"); // all, whatsapp, web

    // Intentar usar la vista inbox_view primero
    // Si no existe, hacer query directamente a conversations
    let query = supabase.from("conversations").select(`
        id,
        channel,
        contact_phone,
        contact_name,
        contact_email,
        contact_type,
        language,
        status,
        last_message_at,
        started_at,
        summary,
        escalated_at,
        escalation_reason,
        unified_contact_id,
        unread_count
      `);

    // Filtrar por estado
    if (status && status !== "all") {
      if (status === "escalated") {
        query = query.not("escalated_at", "is", null);
      } else {
        query = query.eq("status", status);
      }
    }

    // Filtrar por canal
    if (channel && channel !== "all") {
      query = query.eq("channel", channel);
    }

    // Ordenar por último mensaje
    query = query.order("last_message_at", {
      ascending: false,
      nullsFirst: false,
    });

    const { data: conversations, error } = await query;

    if (error) {
      console.error("[Inbox API] Error:", error);
      throw error;
    }

    // Agrupar por contacto (teléfono normalizado)
    const contactMap = new Map<
      string,
      {
        contact_id: string;
        phone: string | null;
        email: string | null;
        contact_name: string | null;
        contact_type: string;
        preferred_language: string;
        tags: string[];
        total_conversations: number;
        total_messages: number;
        last_contact_at: string | null;
        latest_conversation_id: string | null;
        latest_channel: string | null;
        conversation_status: string | null;
        unread_count: number;
        last_message_preview: string | null;
        last_message_at: string | null;
        is_escalated: boolean;
        escalation_reason: string | null;
        active_channels: string[];
      }
    >();

    conversations?.forEach((conv) => {
      // Usar teléfono como clave de agrupación
      const key = conv.contact_phone || conv.id;

      if (!contactMap.has(key)) {
        contactMap.set(key, {
          contact_id: conv.unified_contact_id || conv.id,
          phone: conv.contact_phone,
          email: conv.contact_email,
          contact_name: conv.contact_name,
          contact_type: conv.contact_type || "guest",
          preferred_language: conv.language || "es",
          tags: [],
          total_conversations: 1,
          total_messages: 0,
          last_contact_at: conv.last_message_at || conv.started_at,
          latest_conversation_id: conv.id,
          latest_channel: conv.channel,
          conversation_status: conv.status,
          unread_count: conv.unread_count || 0,
          last_message_preview: conv.summary,
          last_message_at: conv.last_message_at,
          is_escalated: !!conv.escalated_at,
          escalation_reason: conv.escalation_reason,
          active_channels: conv.status === "active" ? [conv.channel] : [],
        });
      } else {
        const existing = contactMap.get(key)!;
        existing.total_conversations++;

        // Agregar canal activo si no está ya
        if (
          conv.status === "active" &&
          !existing.active_channels.includes(conv.channel)
        ) {
          existing.active_channels.push(conv.channel);
        }

        // Actualizar nombre si está vacío
        if (!existing.contact_name && conv.contact_name) {
          existing.contact_name = conv.contact_name;
        }

        // Acumular no leídos
        existing.unread_count += conv.unread_count || 0;

        // Verificar si alguna conversación está escalada
        if (conv.escalated_at) {
          existing.is_escalated = true;
          existing.escalation_reason =
            existing.escalation_reason || conv.escalation_reason;
        }
      }
    });

    // Convertir a array y filtrar por búsqueda
    let contacts = Array.from(contactMap.values());

    if (search) {
      const searchLower = search.toLowerCase();
      contacts = contacts.filter(
        (c) =>
          c.contact_name?.toLowerCase().includes(searchLower) ||
          c.phone?.includes(search) ||
          c.email?.toLowerCase().includes(searchLower),
      );
    }

    return NextResponse.json({
      contacts,
      total: contacts.length,
    });
  } catch (error) {
    console.error("[Inbox API] Error:", error);
    return NextResponse.json(
      {
        error: "Error al cargar bandeja de entrada",
        contacts: [],
      },
      { status: 500 },
    );
  }
}
