"use client";

// ═══════════════════════════════════════════════════════════════
// BANDEJA DE ENTRADA UNIFICADA - Issue #59
// Todas las conversaciones (WhatsApp + Web) en una sola vista
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/context";
import Link from "next/link";

// Tipos de datos
interface InboxContact {
  contact_id: string;
  phone: string | null;
  email: string | null;
  contact_name: string | null;
  contact_type: "guest" | "staff" | "partner" | "lead";
  preferred_language: string;
  tags: string[];
  total_conversations: number;
  total_messages: number;
  last_contact_at: string | null;
  latest_conversation_id: string | null;
  latest_channel: "whatsapp" | "web" | "instagram" | null;
  conversation_status: "active" | "resolved" | "escalated" | "archived" | null;
  unread_count: number;
  last_message_preview: string | null;
  last_message_at: string | null;
  is_escalated: boolean;
  escalation_reason: string | null;
  active_channels: string[] | null;
}

type FilterStatus = "all" | "active" | "escalated" | "resolved";
type FilterChannel = "all" | "whatsapp" | "web";

// Iconos de canal
const ChannelIcon = ({ channel }: { channel: string | null }) => {
  switch (channel) {
    case "whatsapp":
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500/20 text-green-500">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
          </svg>
        </span>
      );
    case "web":
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-500/20 text-blue-500">
          <svg
            className="w-3.5 h-3.5"
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
    case "instagram":
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-pink-500/20 text-pink-500">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
          </svg>
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-500/20 text-slate-400">
          <svg
            className="w-3.5 h-3.5"
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

// Badge de estado
const StatusBadge = ({
  status,
  isEscalated,
}: {
  status: string | null;
  isEscalated: boolean;
}) => {
  if (isEscalated) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
        ESCALADA
      </span>
    );
  }

  switch (status) {
    case "active":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-500/20 text-green-400">
          Activa
        </span>
      );
    case "resolved":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-500/20 text-slate-400">
          Resuelta
        </span>
      );
    case "archived":
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-600/20 text-slate-500">
          Archivada
        </span>
      );
    default:
      return null;
  }
};

// Badge de tipo de contacto
const ContactTypeBadge = ({ type }: { type: string }) => {
  const colors: Record<string, string> = {
    guest: "bg-blue-500/20 text-blue-400",
    staff: "bg-purple-500/20 text-purple-400",
    partner: "bg-amber-500/20 text-amber-400",
    lead: "bg-teal-500/20 text-teal-400",
  };

  const labels: Record<string, string> = {
    guest: "Huesped",
    staff: "Staff",
    partner: "Partner",
    lead: "Lead",
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${colors[type] || "bg-slate-500/20 text-slate-400"}`}
    >
      {labels[type] || type}
    </span>
  );
};

// Formatear tiempo relativo
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "-";

  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins}m`;
  if (diffHours < 24) return `hace ${diffHours}h`;
  if (diffDays === 1) return "ayer";
  if (diffDays < 7) return `hace ${diffDays}d`;

  return date.toLocaleDateString("es-CO", { day: "numeric", month: "short" });
}

// Formatear número de teléfono para mostrar
function formatPhone(phone: string | null): string {
  if (!phone) return "-";
  // Mostrar últimos 4 dígitos
  if (phone.length > 4) {
    return `***${phone.slice(-4)}`;
  }
  return phone;
}

export default function InboxPage() {
  const { t } = useLanguage();
  const [contacts, setContacts] = useState<InboxContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [filterChannel, setFilterChannel] = useState<FilterChannel>("all");

  // Cargar datos
  const loadInbox = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchQuery) params.set("search", searchQuery);
      if (filterStatus !== "all") params.set("status", filterStatus);
      if (filterChannel !== "all") params.set("channel", filterChannel);

      const response = await fetch(`/api/ops/inbox?${params.toString()}`);
      if (!response.ok) throw new Error("Error al cargar bandeja");

      const data = await response.json();
      setContacts(data.contacts || []);
      setError(null);
    } catch (err) {
      console.error("[Inbox]", err);
      setError("Error al cargar la bandeja de entrada");
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filterStatus, filterChannel]);

  useEffect(() => {
    loadInbox();
  }, [loadInbox]);

  // Estadísticas rápidas
  const stats = {
    total: contacts.length,
    active: contacts.filter((c) => c.conversation_status === "active").length,
    escalated: contacts.filter((c) => c.is_escalated).length,
    unread: contacts.reduce((sum, c) => sum + (c.unread_count || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            Bandeja de Entrada Unificada
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            WhatsApp + Web Chat en un solo lugar
          </p>
        </div>

        {/* Estadísticas rápidas */}
        <div className="flex gap-3">
          <div className="bg-white rounded-lg px-4 py-2 border border-slate-200">
            <div className="text-2xl font-bold text-slate-800">
              {stats.total}
            </div>
            <div className="text-xs text-slate-500">Contactos</div>
          </div>
          <div className="bg-green-50 rounded-lg px-4 py-2 border border-green-200">
            <div className="text-2xl font-bold text-green-600">
              {stats.active}
            </div>
            <div className="text-xs text-green-600">Activas</div>
          </div>
          {stats.escalated > 0 && (
            <div className="bg-red-50 rounded-lg px-4 py-2 border border-red-200">
              <div className="text-2xl font-bold text-red-600">
                {stats.escalated}
              </div>
              <div className="text-xs text-red-600">Escaladas</div>
            </div>
          )}
          {stats.unread > 0 && (
            <div className="bg-blue-50 rounded-lg px-4 py-2 border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {stats.unread}
              </div>
              <div className="text-xs text-blue-600">Sin leer</div>
            </div>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Búsqueda */}
          <div className="flex-1">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nombre o teléfono..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]"
              />
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          {/* Filtro por estado */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["all", "active", "escalated", "resolved"] as FilterStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                    filterStatus === status
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-700"
                  }`}
                >
                  {status === "all" && "Todas"}
                  {status === "active" && "Activas"}
                  {status === "escalated" && "Escaladas"}
                  {status === "resolved" && "Resueltas"}
                </button>
              ),
            )}
          </div>

          {/* Filtro por canal */}
          <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
            {(["all", "whatsapp", "web"] as FilterChannel[]).map((channel) => (
              <button
                key={channel}
                onClick={() => setFilterChannel(channel)}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition-colors ${
                  filterChannel === channel
                    ? "bg-white text-slate-800 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {channel === "all" && "Todos"}
                {channel === "whatsapp" && "WhatsApp"}
                {channel === "web" && "Web"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Lista de conversaciones */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-[#00B4FF] border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-slate-500">Cargando conversaciones...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">❌</div>
            <p className="text-red-600 font-medium">{error}</p>
            <button
              onClick={loadInbox}
              className="mt-3 px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium transition-colors"
            >
              Reintentar
            </button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-slate-600 font-medium">
              No hay conversaciones para mostrar
            </p>
            <p className="text-slate-400 text-sm mt-1">
              {searchQuery
                ? "Intenta con otra búsqueda"
                : "Las conversaciones aparecerán aquí"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {contacts.map((contact) => (
              <Link
                key={contact.contact_id}
                href={`/ops/contact/${contact.contact_id}`}
                className="block hover:bg-slate-50 transition-colors"
              >
                <div className="p-4 flex items-start gap-4">
                  {/* Avatar con indicador de canal */}
                  <div className="relative flex-shrink-0">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#0090CC] flex items-center justify-center text-white font-bold text-lg">
                      {contact.contact_name
                        ? contact.contact_name.charAt(0).toUpperCase()
                        : "?"}
                    </div>
                    <div className="absolute -bottom-1 -right-1">
                      <ChannelIcon channel={contact.latest_channel} />
                    </div>
                  </div>

                  {/* Contenido principal */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-slate-800 truncate">
                        {contact.contact_name || formatPhone(contact.phone)}
                      </span>
                      <ContactTypeBadge type={contact.contact_type} />
                      <StatusBadge
                        status={contact.conversation_status}
                        isEscalated={contact.is_escalated}
                      />
                    </div>

                    {/* Último mensaje */}
                    <p className="text-sm text-slate-600 truncate">
                      {contact.last_message_preview || "Sin mensajes"}
                    </p>

                    {/* Metadatos */}
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
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
                          {formatPhone(contact.phone)}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <svg
                          className="w-3 h-3"
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
                          className="w-3 h-3"
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

                      {/* Canales activos */}
                      {contact.active_channels &&
                        contact.active_channels.length > 1 && (
                          <span className="flex items-center gap-1 text-[#00B4FF]">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                              />
                            </svg>
                            Multicanal
                          </span>
                        )}
                    </div>
                  </div>

                  {/* Tiempo y no leídos */}
                  <div className="flex-shrink-0 text-right">
                    <div className="text-xs text-slate-400 mb-2">
                      {formatRelativeTime(contact.last_message_at)}
                    </div>
                    {contact.unread_count > 0 && (
                      <div className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 bg-[#00B4FF] text-white text-xs font-bold rounded-full">
                        {contact.unread_count}
                      </div>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
