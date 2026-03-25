"use client";

// ═══════════════════════════════════════════════════════════════
// VISTA DE CONTACTO UNIFICADA - Issue #59
// Todas las conversaciones de un contacto en un solo lugar
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

// Tipos de datos
interface UnifiedContact {
  id: string;
  phone: string | null;
  email: string | null;
  name: string | null;
  contact_type: "guest" | "staff" | "partner" | "lead";
  preferred_language: string;
  preferred_channel: string;
  tags: string[];
  notes: string | null;
  total_conversations: number;
  total_messages: number;
  last_contact_at: string | null;
  first_contact_at: string | null;
}

interface Conversation {
  id: string;
  channel: "whatsapp" | "web" | "instagram";
  status: "active" | "resolved" | "escalated" | "archived";
  started_at: string;
  last_message_at: string | null;
  unread_count: number;
  summary: string | null;
  escalation_reason: string | null;
}

interface Message {
  id: string;
  conversation_id: string;
  role: "user" | "assistant" | "staff";
  content: string;
  created_at: string;
  channel: string;
}

// Iconos de canal
const ChannelIcon = ({
  channel,
  size = "md",
}: {
  channel: string;
  size?: "sm" | "md" | "lg";
}) => {
  const sizeClasses = {
    sm: "w-5 h-5",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  };

  const iconSizes = {
    sm: "w-3 h-3",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  switch (channel) {
    case "whatsapp":
      return (
        <span
          className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full bg-green-500/20 text-green-500`}
        >
          <svg
            className={iconSizes[size]}
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      );
    case "web":
      return (
        <span
          className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full bg-blue-500/20 text-blue-500`}
        >
          <svg
            className={iconSizes[size]}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center justify-center ${sizeClasses[size]} rounded-full bg-slate-500/20 text-slate-400`}
        >
          <svg
            className={iconSizes[size]}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
        </span>
      );
  }
};

// Formatear fecha y hora
function formatDateTime(dateString: string | null): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) {
    return "Hoy";
  }
  if (date.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Componente de burbuja de mensaje
function MessageBubble({
  message,
  showChannel = false,
}: {
  message: Message;
  showChannel?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-start" : "justify-end"} mb-3`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
          isUser
            ? "bg-slate-100 text-slate-800 rounded-bl-sm"
            : "bg-[#00B4FF] text-white rounded-br-sm"
        }`}
      >
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
        <div
          className={`flex items-center gap-2 mt-1 ${isUser ? "text-slate-400" : "text-white/70"}`}
        >
          <span className="text-[10px]">{formatTime(message.created_at)}</span>
          {showChannel && (
            <span className="text-[10px] uppercase">{message.channel}</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.id as string;

  const [contact, setContact] = useState<UnifiedContact | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<
    string | null
  >(null);
  const [replyText, setReplyText] = useState("");
  const [replyChannel, setReplyChannel] = useState<"whatsapp" | "web">(
    "whatsapp"
  );
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Cargar datos del contacto
  const loadContact = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ops/inbox/${contactId}`);
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Contacto no encontrado");
        }
        throw new Error("Error al cargar contacto");
      }

      const data = await response.json();
      setContact(data.contact);
      setConversations(data.conversations || []);
      setMessages(data.messages || []);

      // Seleccionar la conversación más reciente por defecto
      if (data.conversations && data.conversations.length > 0) {
        setSelectedConversation(data.conversations[0].id);
        // Establecer canal preferido basado en la última conversación
        setReplyChannel(data.conversations[0].channel || "whatsapp");
      }

      setError(null);
    } catch (err) {
      console.error("[ContactDetail]", err);
      setError(
        err instanceof Error ? err.message : "Error al cargar contacto"
      );
    } finally {
      setLoading(false);
    }
  }, [contactId]);

  useEffect(() => {
    loadContact();
  }, [loadContact]);

  // Scroll al final de mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Filtrar mensajes por conversación seleccionada
  const filteredMessages = selectedConversation
    ? messages.filter((m) => m.conversation_id === selectedConversation)
    : messages;

  // Agrupar mensajes por fecha
  const groupedMessages = filteredMessages.reduce(
    (groups, message) => {
      const dateKey = new Date(message.created_at).toDateString();
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(message);
      return groups;
    },
    {} as Record<string, Message[]>
  );

  // Enviar respuesta
  const sendReply = async () => {
    if (!replyText.trim() || !contact || sending) return;

    try {
      setSending(true);
      const response = await fetch(`/api/ops/inbox/${contactId}/reply`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: replyText.trim(),
          channel: replyChannel,
          conversationId: selectedConversation,
        }),
      });

      if (!response.ok) {
        throw new Error("Error al enviar mensaje");
      }

      // Limpiar input y recargar
      setReplyText("");
      await loadContact();
    } catch (err) {
      console.error("[ContactDetail]", err);
      alert("Error al enviar mensaje. Por favor intenta de nuevo.");
    } finally {
      setSending(false);
    }
  };

  // Marcar como resuelto
  const resolveConversation = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/ops/inbox/${contactId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });

      if (!response.ok) {
        throw new Error("Error al resolver conversacion");
      }

      await loadContact();
    } catch (err) {
      console.error("[ContactDetail]", err);
      alert("Error al resolver conversacion");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-4 border-[#00B4FF] border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-500">Cargando contacto...</p>
        </div>
      </div>
    );
  }

  if (error || !contact) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <div className="text-5xl mb-4">❌</div>
          <h2 className="text-xl font-bold text-slate-800 mb-2">
            {error || "Contacto no encontrado"}
          </h2>
          <Link
            href="/ops/inbox"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors mt-4"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Volver a la bandeja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-160px)] flex flex-col">
      {/* Header con info del contacto */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex items-start gap-4">
          {/* Botón volver */}
          <Link
            href="/ops/inbox"
            className="flex-shrink-0 p-2 -ml-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <svg
              className="w-5 h-5 text-slate-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
          </Link>

          {/* Avatar */}
          <div className="flex-shrink-0">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#0090CC] flex items-center justify-center text-white font-bold text-xl">
              {contact.name ? contact.name.charAt(0).toUpperCase() : "?"}
            </div>
          </div>

          {/* Info principal */}
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-slate-800 truncate">
              {contact.name || contact.phone || "Contacto sin nombre"}
            </h1>

            <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-500">
              {contact.phone && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
                    />
                  </svg>
                  {contact.phone}
                </span>
              )}
              {contact.email && (
                <span className="flex items-center gap-1">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  {contact.email}
                </span>
              )}
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                {contact.total_conversations} conversaciones
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"
                  />
                </svg>
                {contact.total_messages} mensajes
              </span>
            </div>

            {/* Tags */}
            {contact.tags && contact.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {contact.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Acciones rápidas */}
          <div className="flex items-center gap-2">
            {contact.phone && (
              <a
                href={`https://wa.me/${contact.phone.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-green-100 hover:bg-green-200 text-green-600 rounded-lg transition-colors"
                title="Abrir en WhatsApp"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Contenido principal - Conversaciones y Mensajes */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Panel izquierdo - Lista de conversaciones */}
        <div className="w-72 flex-shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          <div className="p-3 border-b border-slate-100">
            <h3 className="font-semibold text-slate-800 text-sm">
              Conversaciones ({conversations.length})
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-slate-400 text-sm">
                No hay conversaciones
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setSelectedConversation(conv.id);
                      setReplyChannel(conv.channel);
                    }}
                    className={`w-full p-3 text-left hover:bg-slate-50 transition-colors ${
                      selectedConversation === conv.id
                        ? "bg-[#00B4FF]/5 border-l-2 border-[#00B4FF]"
                        : ""
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <ChannelIcon channel={conv.channel} size="sm" />
                      <span className="text-xs font-medium text-slate-500 uppercase">
                        {conv.channel}
                      </span>
                      {conv.status === "escalated" && (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-[10px] font-bold">
                          ESCALADA
                        </span>
                      )}
                      {conv.unread_count > 0 && (
                        <span className="ml-auto px-1.5 min-w-[18px] h-[18px] bg-[#00B4FF] text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-slate-700 line-clamp-2">
                      {conv.summary || "Sin mensajes"}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {formatDateTime(conv.last_message_at || conv.started_at)}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Panel derecho - Chat */}
        <div className="flex-1 bg-white rounded-xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header del chat */}
          {selectedConversation && (
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ChannelIcon
                  channel={
                    conversations.find((c) => c.id === selectedConversation)
                      ?.channel || "web"
                  }
                />
                <span className="font-medium text-slate-700 text-sm">
                  Conversacion via{" "}
                  {conversations.find((c) => c.id === selectedConversation)
                    ?.channel || "web"}
                </span>
              </div>

              {conversations.find((c) => c.id === selectedConversation)
                ?.status === "active" && (
                <button
                  onClick={() => resolveConversation(selectedConversation)}
                  className="px-3 py-1.5 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs font-medium transition-colors"
                >
                  Marcar como resuelta
                </button>
              )}
            </div>
          )}

          {/* Mensajes */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50/50">
            {filteredMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-slate-400">
                  <svg
                    className="w-12 h-12 mx-auto mb-3 opacity-50"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <p className="text-sm">
                    {selectedConversation
                      ? "No hay mensajes en esta conversacion"
                      : "Selecciona una conversacion"}
                  </p>
                </div>
              </div>
            ) : (
              Object.entries(groupedMessages).map(([dateKey, dateMessages]) => (
                <div key={dateKey}>
                  {/* Separador de fecha */}
                  <div className="flex items-center justify-center my-4">
                    <div className="px-3 py-1 bg-slate-100 rounded-full text-xs text-slate-500 font-medium">
                      {formatDate(dateMessages[0].created_at)}
                    </div>
                  </div>

                  {/* Mensajes del día */}
                  {dateMessages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      showChannel={!selectedConversation}
                    />
                  ))}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de respuesta */}
          {selectedConversation && (
            <div className="p-3 border-t border-slate-100 bg-white">
              <div className="flex items-end gap-2">
                {/* Selector de canal */}
                <div className="flex-shrink-0">
                  <select
                    value={replyChannel}
                    onChange={(e) =>
                      setReplyChannel(e.target.value as "whatsapp" | "web")
                    }
                    className="h-11 px-3 bg-slate-100 border border-slate-200 rounded-lg text-sm font-medium focus:outline-none focus:border-[#00B4FF]"
                  >
                    <option value="whatsapp">WhatsApp</option>
                    <option value="web">Web</option>
                  </select>
                </div>

                {/* Input */}
                <div className="flex-1">
                  <textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Escribe tu respuesta..."
                    rows={1}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        sendReply();
                      }
                    }}
                  />
                </div>

                {/* Botón enviar */}
                <button
                  onClick={sendReply}
                  disabled={!replyText.trim() || sending}
                  className="flex-shrink-0 h-11 px-5 bg-[#00B4FF] hover:bg-[#0090CC] text-white rounded-xl font-medium text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    "Enviar"
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
