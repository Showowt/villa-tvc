"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import Link from "next/link";

type Escalation = Tables<"escalations">;
type User = Tables<"users">;

interface EscalationWithDetails extends Escalation {
  escalated_user?: User | null;
  acknowledged_user?: User | null;
  resolved_user?: User | null;
}

interface EscalationStats {
  total_pending: number;
  total_acknowledged: number;
  total_resolved_today: number;
  avg_resolution_minutes: number;
  critical_count: number;
  overdue_count: number;
}

function getTimeAgo(date: string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `hace ${diffDays}d`;
  if (diffHours > 0) return `hace ${diffHours}h`;
  if (diffMins > 0) return `hace ${diffMins}m`;
  return "ahora";
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case "critical":
      return "bg-red-500/20 text-red-400 border-red-500/50";
    case "high":
      return "bg-orange-500/20 text-orange-400 border-orange-500/50";
    case "normal":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    default:
      return "bg-slate-500/20 text-slate-400 border-slate-500/50";
  }
}

function getStatusColor(status: string): string {
  switch (status) {
    case "pending":
      return "bg-yellow-500/20 text-yellow-400";
    case "acknowledged":
      return "bg-blue-500/20 text-blue-400";
    case "resolved":
      return "bg-green-500/20 text-green-400";
    case "expired":
      return "bg-red-500/20 text-red-400";
    case "auto_routed":
      return "bg-purple-500/20 text-purple-400";
    default:
      return "bg-slate-500/20 text-slate-400";
  }
}

function getStatusLabel(status: string): string {
  switch (status) {
    case "pending":
      return "Pendiente";
    case "acknowledged":
      return "Reconocido";
    case "resolved":
      return "Resuelto";
    case "expired":
      return "Expirado";
    case "auto_routed":
      return "Auto-ruteado";
    default:
      return status;
  }
}

function getDepartmentLabel(dept: string | null): string {
  switch (dept) {
    case "housekeeping":
      return "Limpieza";
    case "kitchen":
      return "Cocina";
    case "maintenance":
      return "Mantenimiento";
    case "pool":
      return "Piscina";
    case "management":
      return "Gerencia";
    default:
      return "General";
  }
}

export default function EscalationsPage() {
  const [escalations, setEscalations] = useState<EscalationWithDetails[]>([]);
  const [stats, setStats] = useState<EscalationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "acknowledged" | "resolved"
  >("pending");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [resolving, setResolving] = useState<string | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [showResolutionModal, setShowResolutionModal] = useState<string | null>(
    null,
  );

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    // Load escalations with related users
    let query = supabase
      .from("escalations")
      .select(
        `
        *,
        escalated_user:users!escalations_escalated_to_fkey(id, name, phone, role),
        acknowledged_user:users!escalations_acknowledged_by_fkey(id, name),
        resolved_user:users!escalations_resolved_by_fkey(id, name)
      `,
      )
      .order("escalated_at", { ascending: false });

    if (filter === "pending") {
      query = query.eq("status", "pending");
    } else if (filter === "acknowledged") {
      query = query.eq("status", "acknowledged");
    } else if (filter === "resolved") {
      query = query.in("status", ["resolved", "auto_routed"]);
    }

    const { data: escalationsData } = await query.limit(50);

    // Calculate stats
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    );

    const { data: allEscalations } = await supabase
      .from("escalations")
      .select("status, priority, escalated_at, resolved_at");

    if (allEscalations) {
      const pending = allEscalations.filter((e) => e.status === "pending");
      const acknowledged = allEscalations.filter(
        (e) => e.status === "acknowledged",
      );
      const resolvedToday = allEscalations.filter(
        (e) =>
          e.status === "resolved" &&
          e.resolved_at &&
          new Date(e.resolved_at) >= todayStart,
      );
      const critical = allEscalations.filter(
        (e) => e.priority === "critical" && e.status === "pending",
      );
      const overdue = pending.filter((e) => {
        const escalatedAt = new Date(e.escalated_at);
        return now.getTime() - escalatedAt.getTime() > 60 * 60 * 1000; // > 1 hour
      });

      // Calculate average resolution time
      const resolvedWithTimes = allEscalations.filter(
        (e) => e.status === "resolved" && e.resolved_at,
      );
      const avgTime =
        resolvedWithTimes.length > 0
          ? resolvedWithTimes.reduce((acc, e) => {
              const resTime = new Date(e.resolved_at!).getTime();
              const escTime = new Date(e.escalated_at).getTime();
              return acc + (resTime - escTime) / (1000 * 60);
            }, 0) / resolvedWithTimes.length
          : 0;

      setStats({
        total_pending: pending.length,
        total_acknowledged: acknowledged.length,
        total_resolved_today: resolvedToday.length,
        avg_resolution_minutes: Math.round(avgTime),
        critical_count: critical.length,
        overdue_count: overdue.length,
      });
    }

    setEscalations((escalationsData as EscalationWithDetails[]) || []);
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadData();

    // Set up realtime subscription
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("escalations-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "escalations",
        },
        () => {
          loadData();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const acknowledgeEscalation = async (escalationId: string) => {
    setAcknowledging(escalationId);
    const supabase = createBrowserClient();

    // TODO: Get current user ID from auth
    const { error } = await supabase
      .from("escalations")
      .update({
        status: "acknowledged",
        acknowledged_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    if (!error) {
      loadData();
    }
    setAcknowledging(null);
  };

  const resolveEscalation = async (escalationId: string) => {
    setResolving(escalationId);
    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("escalations")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        resolution_notes: resolutionNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", escalationId);

    if (!error) {
      setShowResolutionModal(null);
      setResolutionNotes("");
      loadData();
    }
    setResolving(null);
  };

  const triggerManualCheck = async () => {
    try {
      const response = await fetch("/api/cron/escalation-check", {
        method: "POST",
      });
      const result = await response.json();
      console.log("Escalation check result:", result);
      loadData();
    } catch (error) {
      console.error("Error triggering escalation check:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3" />
          <div className="grid grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-700 rounded-xl" />
            ))}
          </div>
          <div className="h-64 bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">Escalaciones</h1>
          <p className="text-white/60">
            Gestiona alertas y escalaciones del sistema
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={triggerManualCheck}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            Verificar Ahora
          </button>
          <Link
            href="/ops/settings/delegation"
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
          >
            Configuracion
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <StatCard
            label="Pendientes"
            value={stats.total_pending}
            color="yellow"
            icon="⏳"
          />
          <StatCard
            label="Reconocidas"
            value={stats.total_acknowledged}
            color="blue"
            icon="👀"
          />
          <StatCard
            label="Resueltas Hoy"
            value={stats.total_resolved_today}
            color="green"
            icon="✅"
          />
          <StatCard
            label="Criticas"
            value={stats.critical_count}
            color="red"
            icon="🚨"
          />
          <StatCard
            label="Vencidas (1h+)"
            value={stats.overdue_count}
            color="orange"
            icon="⚠️"
          />
          <StatCard
            label="Tiempo Prom."
            value={`${stats.avg_resolution_minutes}m`}
            color="purple"
            icon="⏱️"
          />
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {(["pending", "acknowledged", "resolved", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f
                ? "bg-white text-slate-900"
                : "bg-slate-700/50 text-white/70 hover:text-white"
            }`}
          >
            {f === "pending" && "Pendientes"}
            {f === "acknowledged" && "Reconocidas"}
            {f === "resolved" && "Resueltas"}
            {f === "all" && "Todas"}
          </button>
        ))}
      </div>

      {/* Escalations List */}
      {escalations.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-12 text-center">
          <div className="text-4xl mb-4">✨</div>
          <h3 className="text-xl font-semibold text-white mb-2">
            Sin escalaciones {filter === "pending" ? "pendientes" : ""}
          </h3>
          <p className="text-white/60">
            Todas las alertas han sido atendidas. Buen trabajo.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((escalation) => (
            <div
              key={escalation.id}
              className={`bg-slate-800 rounded-xl p-5 border-l-4 ${
                escalation.priority === "critical"
                  ? "border-l-red-500"
                  : escalation.priority === "high"
                    ? "border-l-orange-500"
                    : escalation.priority === "normal"
                      ? "border-l-yellow-500"
                      : "border-l-slate-500"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  {/* Header */}
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium border ${getPriorityColor(
                        escalation.priority,
                      )}`}
                    >
                      {escalation.priority.toUpperCase()}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(
                        escalation.status,
                      )}`}
                    >
                      {getStatusLabel(escalation.status)}
                    </span>
                    <span className="text-xs text-white/50">
                      {getDepartmentLabel(escalation.department)}
                    </span>
                    <span className="text-xs text-white/40">
                      {getTimeAgo(escalation.escalated_at)}
                    </span>
                  </div>

                  {/* Reason */}
                  <h3 className="text-white font-medium mb-2">
                    {escalation.reason}
                  </h3>

                  {/* Original Message */}
                  {escalation.original_message && (
                    <p className="text-white/60 text-sm bg-slate-700/50 rounded p-3 mb-3">
                      &ldquo;{escalation.original_message}&rdquo;
                    </p>
                  )}

                  {/* Meta Info */}
                  <div className="flex flex-wrap gap-4 text-xs text-white/50">
                    <span>
                      Fuente:{" "}
                      <span className="text-white/70">{escalation.source}</span>
                    </span>
                    {escalation.escalated_user && (
                      <span>
                        Asignado a:{" "}
                        <span className="text-white/70">
                          {escalation.escalated_user.name}
                        </span>
                      </span>
                    )}
                    {escalation.reminder_count > 0 && (
                      <span className="text-yellow-400">
                        {escalation.reminder_count} recordatorio(s)
                      </span>
                    )}
                    {escalation.backup_notified_at && (
                      <span className="text-orange-400">
                        Respaldo notificado
                      </span>
                    )}
                    {escalation.all_managers_notified_at && (
                      <span className="text-red-400">
                        Todos los managers notificados
                      </span>
                    )}
                    {escalation.auto_approved && (
                      <span className="text-purple-400">Auto-aprobado</span>
                    )}
                  </div>

                  {/* Resolution Notes */}
                  {escalation.resolution_notes && (
                    <div className="mt-3 text-sm">
                      <span className="text-white/50">
                        Notas de resolucion:
                      </span>
                      <p className="text-white/80 mt-1">
                        {escalation.resolution_notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  {escalation.status === "pending" && (
                    <button
                      onClick={() => acknowledgeEscalation(escalation.id)}
                      disabled={acknowledging === escalation.id}
                      className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors min-w-[120px]"
                    >
                      {acknowledging === escalation.id ? "..." : "Reconocer"}
                    </button>
                  )}
                  {(escalation.status === "pending" ||
                    escalation.status === "acknowledged") && (
                    <button
                      onClick={() => setShowResolutionModal(escalation.id)}
                      className="px-4 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white text-sm font-medium transition-colors min-w-[120px]"
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Resolution Modal */}
      {showResolutionModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-semibold text-white mb-4">
              Resolver Escalacion
            </h3>
            <div className="mb-4">
              <label className="block text-sm text-white/70 mb-2">
                Notas de resolucion (opcional)
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white placeholder-white/40 resize-none"
                rows={4}
                placeholder="Describe como se resolvio..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowResolutionModal(null);
                  setResolutionNotes("");
                }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-white text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => resolveEscalation(showResolutionModal)}
                disabled={resolving === showResolutionModal}
                className="px-4 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 rounded-lg text-white text-sm font-medium transition-colors"
              >
                {resolving === showResolutionModal
                  ? "Guardando..."
                  : "Marcar como Resuelto"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number | string;
  color: "yellow" | "blue" | "green" | "red" | "orange" | "purple";
  icon: string;
}) {
  const colors = {
    yellow: "bg-yellow-500/10 text-yellow-400",
    blue: "bg-blue-500/10 text-blue-400",
    green: "bg-green-500/10 text-green-400",
    red: "bg-red-500/10 text-red-400",
    orange: "bg-orange-500/10 text-orange-400",
    purple: "bg-purple-500/10 text-purple-400",
  };

  return (
    <div className="bg-slate-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-xs text-white/50">{label}</span>
      </div>
      <div className={`text-2xl font-bold ${colors[color]}`}>{value}</div>
    </div>
  );
}
