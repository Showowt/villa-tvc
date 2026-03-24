"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";

type Checklist = Tables<"checklists">;

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  completed?: boolean;
  photo_url?: string;
  notes?: string;
  priority?: "low" | "normal" | "high" | "urgent";
}

interface ChecklistWithDetails extends Checklist {
  assigned_user?: { name: string } | null;
  template?: {
    name: string;
    name_es: string;
    department: string;
    items: Json;
    estimated_minutes: number | null;
  } | null;
}

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  completedThisWeek: number;
}

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const CHECKLIST_TYPES = [
  { key: "all", label: "Todos", icon: "📋", color: "#6B7280" },
  { key: "daily", label: "Diario", icon: "🔧", color: "#3B82F6" },
  { key: "pool_8am", label: "Piscina 8AM", icon: "🌅", color: "#F59E0B" },
  { key: "pool_2pm", label: "Piscina 2PM", icon: "☀️", color: "#F97316" },
  { key: "pool_8pm", label: "Piscina 8PM", icon: "🌙", color: "#8B5CF6" },
];

const MAINTENANCE_TYPES = [
  "maintenance_monday",
  "maintenance_tuesday",
  "maintenance_wednesday",
  "maintenance_thursday",
  "maintenance_friday",
  "maintenance_saturday",
  "maintenance_sunday",
  "pool_8am",
  "pool_2pm",
  "pool_8pm",
] as const;

export default function MaintenanceQCPage() {
  const [checklists, setChecklists] = useState<ChecklistWithDetails[]>([]);
  const [selected, setSelected] = useState<ChecklistWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    completedThisWeek: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    // Get pending checklists
    const { data: pendingData, error: pendingError } = await supabase
      .from("checklists")
      .select("*")
      .eq("status", "complete")
      .is("approved_at", null)
      .in("type", MAINTENANCE_TYPES)
      .order("completed_at", { ascending: false });

    if (pendingError) {
      console.error("[loadData] pendingError:", pendingError);
    }

    // Get stats
    const { data: approvedToday } = await supabase
      .from("checklists")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${today}T00:00:00`)
      .in("type", MAINTENANCE_TYPES);

    const { data: rejectedToday } = await supabase
      .from("checklists")
      .select("id", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("updated_at", `${today}T00:00:00`)
      .in("type", MAINTENANCE_TYPES);

    const { data: completedWeek } = await supabase
      .from("checklists")
      .select("id", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${weekAgo}T00:00:00`)
      .in("type", MAINTENANCE_TYPES);

    setStats({
      pending: pendingData?.length || 0,
      approvedToday: approvedToday?.length || 0,
      rejectedToday: rejectedToday?.length || 0,
      completedThisWeek: completedWeek?.length || 0,
    });

    if (!pendingData || pendingData.length === 0) {
      setChecklists([]);
      setLoading(false);
      return;
    }

    // Get unique user IDs and template IDs
    const userIds = [
      ...new Set(pendingData.map((c) => c.assigned_to).filter(Boolean)),
    ] as string[];
    const templateIds = [
      ...new Set(pendingData.map((c) => c.template_id).filter(Boolean)),
    ] as string[];

    // Fetch users
    const { data: usersData } =
      userIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", userIds)
        : { data: [] };

    // Fetch templates
    const { data: templatesData } =
      templateIds.length > 0
        ? await supabase
            .from("checklist_templates")
            .select("id, name, name_es, department, items, estimated_minutes")
            .in("id", templateIds)
        : { data: [] };

    // Create lookup maps
    const usersMap = new Map((usersData || []).map((u) => [u.id, u]));
    const templatesMap = new Map((templatesData || []).map((t) => [t.id, t]));

    // Combine data
    const enrichedChecklists: ChecklistWithDetails[] = pendingData.map(
      (checklist) => ({
        ...checklist,
        assigned_user: checklist.assigned_to
          ? usersMap.get(checklist.assigned_to) || null
          : null,
        template: checklist.template_id
          ? templatesMap.get(checklist.template_id) || null
          : null,
      }),
    );

    setChecklists(enrichedChecklists);
    if (enrichedChecklists.length > 0) {
      setSelected(enrichedChecklists[0]);
    }
    setLoading(false);
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "approved" as const,
        approved_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleApprove]", error);
      alert("Error al aprobar: " + error.message);
    } else {
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        approvedToday: prev.approvedToday + 1,
      }));
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selected || !rejectReason) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "rejected" as const,
        rejection_reason: rejectReason,
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleReject]", error);
      alert("Error al rechazar: " + error.message);
    } else {
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
      setShowRejectModal(false);
      setRejectReason("");
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        rejectedToday: prev.rejectedToday + 1,
      }));
    }

    setProcessing(false);
  };

  const getTypeInfo = (type: string) => {
    if (type.startsWith("maintenance_")) {
      const dayIndex = [
        "sunday",
        "monday",
        "tuesday",
        "wednesday",
        "thursday",
        "friday",
        "saturday",
      ].indexOf(type.replace("maintenance_", ""));
      return {
        label: `Mantenimiento ${DAYS_ES[dayIndex] || ""}`,
        icon: "🔧",
        color: "#3B82F6",
        category: "daily",
      };
    }
    if (type === "pool_8am")
      return {
        label: "Piscina 8:00 AM",
        icon: "🌅",
        color: "#F59E0B",
        category: "pool_8am",
      };
    if (type === "pool_2pm")
      return {
        label: "Piscina 2:00 PM",
        icon: "☀️",
        color: "#F97316",
        category: "pool_2pm",
      };
    if (type === "pool_8pm")
      return {
        label: "Piscina 8:00 PM",
        icon: "🌙",
        color: "#8B5CF6",
        category: "pool_8pm",
      };
    return { label: type, icon: "📋", color: "#6B7280", category: "other" };
  };

  const parseItems = (items: Json): ChecklistItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items as unknown as ChecklistItem[];
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
            URGENTE
          </span>
        );
      case "high":
        return (
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded">
            ALTA
          </span>
        );
      default:
        return null;
    }
  };

  const filteredChecklists =
    activeFilter === "all"
      ? checklists
      : checklists.filter((c) => {
          const info = getTypeInfo(c.type);
          return info.category === activeFilter;
        });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          🔧 Maintenance Quality Control
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Revisa y aprueba los checklists de mantenimiento diario y piscina.
          Verificación de tareas críticas.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-amber-500">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Pendientes de Aprobación
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-emerald-500">
            {stats.approvedToday}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Aprobados Hoy
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-rose-500">
            {stats.rejectedToday}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Rechazados Hoy
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-blue-500">
            {stats.completedThisWeek}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Completados Esta Semana
          </div>
        </div>
      </div>

      {/* Today's Schedule */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100 p-4 mb-6">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-lg">📅</span>
          <span className="font-bold text-blue-900">
            Hoy: {DAYS_ES[new Date().getDay()]}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge color="#3B82F6">
            🔧 Mantenimiento {DAYS_ES[new Date().getDay()]}
          </Badge>
          <Badge color="#F59E0B">🌅 Piscina 8AM</Badge>
          <Badge color="#F97316">☀️ Piscina 2PM</Badge>
          <Badge color="#8B5CF6">🌙 Piscina 8PM</Badge>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        {CHECKLIST_TYPES.map((type) => {
          const count =
            type.key === "all"
              ? checklists.length
              : checklists.filter(
                  (c) => getTypeInfo(c.type).category === type.key,
                ).length;
          return (
            <button
              key={type.key}
              onClick={() => setActiveFilter(type.key)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                activeFilter === type.key
                  ? "bg-[#0A0A0F] text-white"
                  : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
              }`}
            >
              {type.icon} {type.label}
              <span className="ml-1 text-xs opacity-60">({count})</span>
            </button>
          );
        })}
      </div>

      {filteredChecklists.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-slate-600 font-semibold text-lg">
            ¡Mantenimiento al día!
          </p>
          <p className="text-sm text-slate-400 mt-1">
            No hay checklists de mantenimiento pendientes de aprobación
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pending List */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
              Pendientes ({filteredChecklists.length})
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {filteredChecklists.map((checklist) => {
                const items = parseItems(checklist.items);
                const completedCount = items.filter((i) => i.completed).length;
                const urgentCount = items.filter(
                  (i) => i.priority === "urgent" || i.priority === "high",
                ).length;
                const typeInfo = getTypeInfo(checklist.type);

                return (
                  <button
                    key={checklist.id}
                    onClick={() => setSelected(checklist)}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selected?.id === checklist.id
                        ? "bg-[#00B4FF]/10 border-[#00B4FF] shadow-sm"
                        : "bg-white border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                          <span>{typeInfo.icon}</span>
                          <span>
                            {checklist.template?.name_es || typeInfo.label}
                          </span>
                        </div>
                      </div>
                      <Badge color={typeInfo.color}>
                        {checklist.type.includes("pool") ? "Piscina" : "Diario"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                      <span>👤 {checklist.assigned_user?.name || "Staff"}</span>
                      <span>
                        ✅ {completedCount}/{items.length}
                      </span>
                      {urgentCount > 0 && (
                        <span className="text-red-500 font-semibold">
                          ⚠️ {urgentCount} urgentes
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {checklist.completed_at
                        ? new Date(checklist.completed_at).toLocaleString(
                            "es-CO",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "numeric",
                              month: "short",
                            },
                          )
                        : ""}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Detail View */}
          <div className="lg:col-span-2">
            {selected ? (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <span>{getTypeInfo(selected.type).icon}</span>
                      {selected.template?.name_es ||
                        getTypeInfo(selected.type).label}
                    </div>
                    <div className="text-sm text-slate-500 mt-1 flex items-center gap-3">
                      <span>👤 {selected.assigned_user?.name || "Staff"}</span>
                      {selected.duration_minutes && (
                        <span>⏱️ {selected.duration_minutes} min</span>
                      )}
                      <span>
                        📅{" "}
                        {new Date(selected.date).toLocaleDateString("es-CO", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </span>
                    </div>
                  </div>
                  <Badge color="#F59E0B">Pendiente Aprobación</Badge>
                </div>

                {/* Progress Bar */}
                {(() => {
                  const items = parseItems(selected.items);
                  const completedCount = items.filter(
                    (i) => i.completed,
                  ).length;
                  const pct =
                    items.length > 0
                      ? (completedCount / items.length) * 100
                      : 0;
                  return (
                    <div className="mb-4">
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Progreso del checklist</span>
                        <span>
                          {completedCount}/{items.length} tareas (
                          {Math.round(pct)}%)
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })()}

                {/* Items Review */}
                <div className="space-y-2 mb-4 max-h-[350px] overflow-y-auto">
                  {parseItems(selected.items).map((item, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start gap-3 p-3 rounded-lg ${
                        item.completed
                          ? "bg-emerald-50"
                          : item.priority === "urgent"
                            ? "bg-red-50"
                            : "bg-rose-50"
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          item.completed
                            ? "bg-emerald-500 text-white"
                            : item.priority === "urgent"
                              ? "bg-red-500 text-white"
                              : "bg-rose-500 text-white"
                        }`}
                      >
                        {item.completed ? "✓" : "✗"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-sm ${item.completed ? "text-slate-700" : "text-rose-700 font-medium"}`}
                          >
                            {item.task_es || item.task}
                          </span>
                          {getPriorityBadge(item.priority)}
                        </div>
                        {item.notes && (
                          <div className="text-xs text-slate-500 mt-1">
                            💬 {item.notes}
                          </div>
                        )}
                      </div>
                      {item.photo_required && (
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold flex-shrink-0 ${
                            item.photo_url
                              ? "bg-emerald-100 text-emerald-600"
                              : "bg-amber-100 text-amber-600"
                          }`}
                        >
                          📸 {item.photo_url ? "OK" : "FALTA"}
                        </span>
                      )}
                    </div>
                  ))}
                </div>

                {/* Notes */}
                {selected.notes && (
                  <div className="bg-slate-50 rounded-lg p-3 mb-4">
                    <div className="text-xs font-semibold text-slate-600 mb-1">
                      Notas del Staff:
                    </div>
                    <div className="text-sm text-slate-700">
                      {selected.notes}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-4 border-t border-slate-100">
                  <button
                    onClick={handleApprove}
                    disabled={processing}
                    className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {processing ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <>✅ Aprobar Checklist</>
                    )}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(true)}
                    disabled={processing}
                    className="px-6 py-3 bg-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-200 transition-colors disabled:opacity-50"
                  >
                    ❌ Rechazar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-slate-200 text-slate-400">
                ← Selecciona un checklist para revisar
              </div>
            )}
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              ❌ Rechazar Checklist
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indica el motivo del rechazo. El staff de mantenimiento recibirá
              esta notificación y deberá completar las tareas faltantes.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Nivel de cloro fuera de rango, falta revisar filtros..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-28 focus:outline-none focus:border-[#00B4FF] focus:ring-2 focus:ring-[#00B4FF]/20"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Confirmar Rechazo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
