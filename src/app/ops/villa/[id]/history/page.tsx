"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Badge } from "@/components/ops/Badge";

// ═══════════════════════════════════════════════════════════════
// VILLA HISTORY PAGE
// Issues #41 and #52 — Villa History + Audit Trail
// Shows: Last 10 guests, Last 5 maintenance, Last 10 checklists
// Status change timeline
// ═══════════════════════════════════════════════════════════════

interface Guest {
  id: string;
  guest_name: string;
  guest_country?: string;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
  vip_level?: string;
  status: string;
  special_requests?: string;
}

interface MaintenanceReport {
  id: string;
  title: string;
  title_es?: string;
  description?: string;
  priority: string;
  status: string;
  created_at: string;
  resolved_at?: string;
  resolution_notes?: string;
  cost?: number;
}

interface Checklist {
  id: string;
  type: string;
  date: string;
  status: string;
  completed_at?: string;
  quality_score?: number;
  qc_notes?: string;
  notes?: string;
}

interface StatusChange {
  id: string;
  old_status?: string;
  new_status: string;
  old_cleaning_status?: string;
  new_cleaning_status?: string;
  change_reason?: string;
  created_at: string;
  user?: {
    name: string;
    role: string;
  };
}

interface VillaHistoryData {
  villa_id: string;
  recent_guests: Guest[];
  maintenance_reports: MaintenanceReport[];
  cleaning_checklists: Checklist[];
  status_history: StatusChange[];
  patterns: string[];
}

const VILLA_NAMES: Record<string, string> = {
  // Cloudbeds villa IDs
  villa_aduana: "Aduana (Azul)",
  villa_coches: "Coches",
  villa_merced: "Merced (Morada)",
  villa_paz: "Paz (Limón)",
  villa_pozo: "Pozo (Teal)",
  villa_san_pedro: "San Pedro (Magenta)",
  villa_santo_domingo: "Santo Domingo (Mint)",
  villa_teresa: "Teresa (Amarilla)",
  villa_trinidad: "Trinidad (Durazno)",
  villa_unassigned: "Sin Asignar",
  full_house: "Full House",
  // Component IDs (used in property-map)
  teresa: "Teresa (Amarilla)",
  aduana: "Aduana (Azul)",
  trinidad: "Trinidad (Durazno)",
  paz: "Paz (Limón)",
  sanpedro: "San Pedro (Magenta)",
  coche: "Coches",
  pozo: "Pozo (Teal)",
  santodomingo: "Santo Domingo (Mint)",
  merced: "Merced (Morada)",
};

const PRIORITY_COLORS: Record<string, string> = {
  low: "#10B981",
  medium: "#F59E0B",
  high: "#EF4444",
  urgent: "#7C3AED",
};

const STATUS_COLORS: Record<string, string> = {
  occupied: "#10B981",
  vacant: "#9CA3AF",
  arriving: "#3B82F6",
  cleaning: "#F59E0B",
  checkout: "#EF4444",
  maintenance: "#8B5CF6",
  clean: "#10B981",
  dirty: "#EF4444",
  in_progress: "#F59E0B",
  inspected: "#3B82F6",
};

const CHECKLIST_TYPE_LABELS: Record<string, string> = {
  villa_retouch: "Retoque",
  villa_occupied: "Ocupada",
  villa_empty_arriving: "Llegada",
  villa_leaving: "Salida",
};

export default function VillaHistoryPage() {
  const params = useParams();
  const router = useRouter();
  const villaId = params.id as string;

  const [data, setData] = useState<VillaHistoryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<
    "guests" | "maintenance" | "checklists" | "timeline"
  >("guests");

  const loadHistory = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Map component IDs to database IDs if needed
      let dbVillaId = villaId;
      const componentToDb: Record<string, string> = {
        teresa: "villa_1",
        aduana: "villa_2",
        trinidad: "villa_3",
        paz: "villa_4",
        sanpedro: "villa_5",
        sandiego: "villa_6",
        coche: "villa_7",
        pozo: "villa_8",
        santodomingo: "villa_9",
        merced: "villa_10",
      };
      if (componentToDb[villaId]) {
        dbVillaId = componentToDb[villaId];
      }

      // Fetch villa history
      const historyRes = await fetch(
        `/api/villa/history?villa_id=${dbVillaId}`,
      );
      if (!historyRes.ok) {
        throw new Error("Failed to load villa history");
      }
      const historyData = await historyRes.json();

      // Fetch status history from audit log
      const auditRes = await fetch(
        `/api/audit-log?table=villa_status&record_id=${dbVillaId}&limit=20`,
      );
      let statusHistory: StatusChange[] = [];
      if (auditRes.ok) {
        const auditData = await auditRes.json();
        statusHistory = auditData.logs
          .filter(
            (log: { action: string; table_name: string }) =>
              log.action === "UPDATE" && log.table_name === "villa_status",
          )
          .map(
            (log: {
              id: string;
              old_value: { status?: string; cleaning_status?: string };
              new_value: { status?: string; cleaning_status?: string };
              created_at: string;
              user?: { name: string; role: string };
            }) => ({
              id: log.id,
              old_status: log.old_value?.status,
              new_status: log.new_value?.status || "unknown",
              old_cleaning_status: log.old_value?.cleaning_status,
              new_cleaning_status: log.new_value?.cleaning_status,
              created_at: log.created_at,
              user: log.user,
            }),
          );
      }

      setData({
        ...historyData,
        status_history: statusHistory,
      });
    } catch (err) {
      console.error("[VillaHistory]", err);
      setError(err instanceof Error ? err.message : "Error loading history");
    }

    setLoading(false);
  }, [villaId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const villaName = VILLA_NAMES[villaId] || villaId;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center">
        <div className="text-4xl mb-4">❌</div>
        <p className="text-slate-600">{error}</p>
        <button
          onClick={loadHistory}
          className="mt-4 px-4 py-2 bg-[#00B4FF] text-white rounded-lg font-bold"
        >
          Reintentar
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
          <Link href="/ops/property-map" className="hover:text-[#00B4FF]">
            Mapa de Propiedades
          </Link>
          <span>/</span>
          <span>Villa {villaName}</span>
          <span>/</span>
          <span className="text-slate-900">Historial</span>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            🏠 Historial — Villa {villaName}
          </h1>
          <button
            onClick={() => router.back()}
            className="px-3 py-1.5 text-sm text-slate-600 hover:text-slate-900 border border-slate-200 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Patterns/Insights */}
      {data?.patterns && data.patterns.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="font-bold text-amber-800 mb-2 flex items-center gap-2">
            <span>💡</span> Patrones Detectados
          </h3>
          <ul className="space-y-1">
            {data.patterns.map((pattern, i) => (
              <li key={i} className="text-sm text-amber-700">
                • {pattern}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-4 border-b border-slate-200 pb-2">
        {[
          {
            key: "guests",
            label: "Huéspedes",
            icon: "👥",
            count: data?.recent_guests?.length,
          },
          {
            key: "maintenance",
            label: "Mantenimiento",
            icon: "🔧",
            count: data?.maintenance_reports?.length,
          },
          {
            key: "checklists",
            label: "Limpieza",
            icon: "✅",
            count: data?.cleaning_checklists?.length,
          },
          {
            key: "timeline",
            label: "Timeline",
            icon: "📊",
            count: data?.status_history?.length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() =>
              setActiveTab(
                tab.key as "guests" | "maintenance" | "checklists" | "timeline",
              )
            }
            className={`px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2 ${
              activeTab === tab.key
                ? "bg-[#0A0A0F] text-white"
                : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-xs ${
                  activeTab === tab.key
                    ? "bg-white/20"
                    : "bg-slate-200 text-slate-600"
                }`}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200">
        {/* Guests Tab */}
        {activeTab === "guests" && (
          <div>
            {data?.recent_guests && data.recent_guests.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.recent_guests.map((guest) => (
                  <div key={guest.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">
                            {guest.guest_name}
                          </span>
                          {guest.vip_level &&
                            guest.vip_level !== "standard" && (
                              <Badge
                                color={
                                  guest.vip_level === "vvip"
                                    ? "#DAA520"
                                    : "#F59E0B"
                                }
                              >
                                {guest.vip_level.toUpperCase()}
                              </Badge>
                            )}
                          {guest.guest_country && (
                            <span className="text-xs text-slate-400">
                              {guest.guest_country}
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-600">
                          {guest.num_adults} adultos
                          {guest.num_children > 0 &&
                            `, ${guest.num_children} niños`}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {new Date(guest.check_in).toLocaleDateString("es-CO")}{" "}
                          →{" "}
                          {new Date(guest.check_out).toLocaleDateString(
                            "es-CO",
                          )}
                        </div>
                        {guest.special_requests && (
                          <div className="mt-2 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                            📝 {guest.special_requests}
                          </div>
                        )}
                      </div>
                      <Badge
                        color={
                          guest.status === "checked_out" ? "#9CA3AF" : "#10B981"
                        }
                      >
                        {guest.status === "checked_out"
                          ? "Salido"
                          : guest.status === "checked_in"
                            ? "En Villa"
                            : "Confirmado"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                No hay historial de huéspedes para esta villa
              </div>
            )}
          </div>
        )}

        {/* Maintenance Tab */}
        {activeTab === "maintenance" && (
          <div>
            {data?.maintenance_reports &&
            data.maintenance_reports.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.maintenance_reports.map((report) => (
                  <div key={report.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge
                            color={
                              PRIORITY_COLORS[report.priority] || "#6B7280"
                            }
                          >
                            {report.priority.toUpperCase()}
                          </Badge>
                          <span className="font-bold text-slate-900">
                            {report.title_es || report.title}
                          </span>
                        </div>
                        {report.description && (
                          <p className="text-sm text-slate-600 mt-1">
                            {report.description}
                          </p>
                        )}
                        <div className="text-xs text-slate-400 mt-2">
                          Reportado:{" "}
                          {new Date(report.created_at).toLocaleDateString(
                            "es-CO",
                          )}
                          {report.resolved_at && (
                            <span className="ml-2 text-emerald-600">
                              • Resuelto:{" "}
                              {new Date(report.resolved_at).toLocaleDateString(
                                "es-CO",
                              )}
                            </span>
                          )}
                        </div>
                        {report.resolution_notes && (
                          <div className="mt-2 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                            ✓ {report.resolution_notes}
                          </div>
                        )}
                        {report.cost && report.cost > 0 && (
                          <div className="mt-1 text-xs text-slate-500">
                            Costo: ${report.cost.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Badge
                        color={
                          report.status === "resolved"
                            ? "#10B981"
                            : report.status === "in_progress"
                              ? "#F59E0B"
                              : "#EF4444"
                        }
                      >
                        {report.status === "resolved"
                          ? "Resuelto"
                          : report.status === "in_progress"
                            ? "En Proceso"
                            : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                No hay reportes de mantenimiento para esta villa
              </div>
            )}
          </div>
        )}

        {/* Checklists Tab */}
        {activeTab === "checklists" && (
          <div>
            {data?.cleaning_checklists &&
            data.cleaning_checklists.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {data.cleaning_checklists.map((checklist) => (
                  <div key={checklist.id} className="p-4 hover:bg-slate-50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">
                            {CHECKLIST_TYPE_LABELS[checklist.type] ||
                              checklist.type}
                          </span>
                          {checklist.quality_score && (
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <span
                                  key={star}
                                  className={`text-xs ${
                                    star <= checklist.quality_score!
                                      ? "text-amber-400"
                                      : "text-slate-300"
                                  }`}
                                >
                                  ★
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(checklist.date).toLocaleDateString("es-CO")}
                          {checklist.completed_at && (
                            <span className="ml-2">
                              • Completado:{" "}
                              {new Date(
                                checklist.completed_at,
                              ).toLocaleTimeString("es-CO", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          )}
                        </div>
                        {checklist.notes && (
                          <div className="mt-2 text-xs text-slate-600">
                            📝 {checklist.notes}
                          </div>
                        )}
                        {checklist.qc_notes && (
                          <div className="mt-1 text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            QC: {checklist.qc_notes}
                          </div>
                        )}
                      </div>
                      <Badge
                        color={
                          checklist.status === "approved"
                            ? "#10B981"
                            : checklist.status === "rejected"
                              ? "#EF4444"
                              : checklist.status === "submitted"
                                ? "#3B82F6"
                                : "#F59E0B"
                        }
                      >
                        {checklist.status === "approved"
                          ? "Aprobado"
                          : checklist.status === "rejected"
                            ? "Rechazado"
                            : checklist.status === "submitted"
                              ? "Pendiente QC"
                              : "En Proceso"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                No hay checklists de limpieza para esta villa
              </div>
            )}
          </div>
        )}

        {/* Timeline Tab */}
        {activeTab === "timeline" && (
          <div className="p-4">
            {data?.status_history && data.status_history.length > 0 ? (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-slate-200" />

                {data.status_history.map((change, index) => (
                  <div key={change.id} className="relative pl-10 pb-6">
                    {/* Timeline dot */}
                    <div
                      className="absolute left-2.5 w-3 h-3 rounded-full border-2 border-white"
                      style={{
                        backgroundColor:
                          STATUS_COLORS[change.new_status] || "#6B7280",
                      }}
                    />

                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        {change.old_status && (
                          <>
                            <Badge
                              color={
                                STATUS_COLORS[change.old_status] || "#6B7280"
                              }
                            >
                              {change.old_status}
                            </Badge>
                            <span className="text-slate-400">→</span>
                          </>
                        )}
                        <Badge
                          color={STATUS_COLORS[change.new_status] || "#6B7280"}
                        >
                          {change.new_status}
                        </Badge>
                      </div>

                      {change.old_cleaning_status !==
                        change.new_cleaning_status &&
                        change.new_cleaning_status && (
                          <div className="flex items-center gap-2 text-xs mt-1">
                            <span className="text-slate-500">Limpieza:</span>
                            {change.old_cleaning_status && (
                              <>
                                <Badge
                                  color={
                                    STATUS_COLORS[change.old_cleaning_status] ||
                                    "#6B7280"
                                  }
                                >
                                  {change.old_cleaning_status}
                                </Badge>
                                <span className="text-slate-400">→</span>
                              </>
                            )}
                            <Badge
                              color={
                                STATUS_COLORS[change.new_cleaning_status] ||
                                "#6B7280"
                              }
                            >
                              {change.new_cleaning_status}
                            </Badge>
                          </div>
                        )}

                      <div className="text-xs text-slate-400 mt-2">
                        {new Date(change.created_at).toLocaleString("es-CO")}
                        {change.user && (
                          <span className="ml-2">
                            • Por: {change.user.name} ({change.user.role})
                          </span>
                        )}
                      </div>

                      {change.change_reason && (
                        <div className="text-xs text-slate-600 mt-1 bg-white px-2 py-1 rounded border border-slate-100">
                          {change.change_reason}
                        </div>
                      )}
                    </div>

                    {index === data.status_history.length - 1 && (
                      <div className="absolute left-2.5 w-3 h-3 rounded-full bg-slate-300 -bottom-1" />
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400">
                No hay historial de cambios de estado para esta villa
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Stats */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-emerald-600">
            {data?.recent_guests?.length || 0}
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            Huéspedes Recientes
          </div>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-purple-600">
            {data?.maintenance_reports?.length || 0}
          </div>
          <div className="text-xs text-purple-600 font-medium">
            Reportes Mant.
          </div>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-blue-600">
            {data?.cleaning_checklists?.length || 0}
          </div>
          <div className="text-xs text-blue-600 font-medium">Checklists</div>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <div className="text-2xl font-black text-amber-600">
            {data?.status_history?.length || 0}
          </div>
          <div className="text-xs text-amber-600 font-medium">
            Cambios Estado
          </div>
        </div>
      </div>
    </div>
  );
}
