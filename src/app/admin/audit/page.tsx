"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Badge } from "@/components/ops/Badge";

// ═══════════════════════════════════════════════════════════════
// ADMIN AUDIT LOG PAGE — OWNER-ONLY ACCESS
// Issues #41 and #52 — Complete System Audit Trail
// Full access with enhanced filtering, export, and analysis
// ═══════════════════════════════════════════════════════════════

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  action: "INSERT" | "UPDATE" | "DELETE";
  table_name: string;
  record_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  changed_fields: string[] | null;
  ip_address: string | null;
  created_at: string;
  user?: {
    name: string;
    email: string;
    role: string;
  };
}

interface Summary {
  total_entries: number;
  last_24h: {
    inserts: number;
    updates: number;
    deletes: number;
  };
  tables_affected: string[];
}

interface UserActivity {
  user_id: string;
  user_name: string;
  user_role: string;
  action_count: number;
  last_action: string;
}

const ACTION_COLORS = {
  INSERT: "#10B981",
  UPDATE: "#3B82F6",
  DELETE: "#EF4444",
};

const ACTION_LABELS = {
  INSERT: "Crear",
  UPDATE: "Actualizar",
  DELETE: "Eliminar",
};

const TABLE_LABELS: Record<string, string> = {
  villa_bookings: "Reservas",
  villa_status: "Estado Villas",
  villa_status_history: "Historial Estado",
  purchase_orders: "Ordenes de Compra",
  conversations: "Conversaciones",
  ingredients: "Ingredientes",
  users: "Usuarios",
  checklists: "Checklists",
  maintenance_issues: "Mantenimiento",
};

const TABLE_OPTIONS = [
  { value: "", label: "Todas las tablas" },
  { value: "villa_bookings", label: "Reservas" },
  { value: "villa_status", label: "Estado Villas" },
  { value: "villa_status_history", label: "Historial Estado" },
  { value: "checklists", label: "Checklists" },
  { value: "maintenance_issues", label: "Mantenimiento" },
  { value: "purchase_orders", label: "Ordenes de Compra" },
  { value: "conversations", label: "Conversaciones" },
  { value: "users", label: "Usuarios" },
];

export default function AdminAuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [userActivity, setUserActivity] = useState<UserActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"logs" | "users" | "analytics">(
    "logs",
  );
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 100,
    offset: 0,
    has_more: false,
  });

  // Filters
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [userFilter, setUserFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", pagination.limit.toString());
      params.set("offset", pagination.offset.toString());
      if (tableFilter) params.set("table", tableFilter);
      if (actionFilter) params.set("action", actionFilter);
      if (userFilter) params.set("user_id", userFilter);
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const response = await fetch(`/api/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setSummary(data.summary);
        setPagination(data.pagination);

        // Calculate user activity from logs
        const activityMap = new Map<string, UserActivity>();
        data.logs.forEach((log: AuditLogEntry) => {
          if (log.user) {
            const existing = activityMap.get(log.user_id || "unknown");
            if (existing) {
              existing.action_count++;
              if (new Date(log.created_at) > new Date(existing.last_action)) {
                existing.last_action = log.created_at;
              }
            } else {
              activityMap.set(log.user_id || "unknown", {
                user_id: log.user_id || "unknown",
                user_name: log.user.name,
                user_role: log.user.role,
                action_count: 1,
                last_action: log.created_at,
              });
            }
          }
        });
        setUserActivity(
          Array.from(activityMap.values()).sort(
            (a, b) => b.action_count - a.action_count,
          ),
        );
      }
    } catch (error) {
      console.error("[AdminAudit]", error);
    }
    setLoading(false);
  }, [
    tableFilter,
    actionFilter,
    userFilter,
    startDate,
    endDate,
    pagination.limit,
    pagination.offset,
  ]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "null";
    if (typeof value === "object") {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  const exportToCSV = () => {
    const headers = [
      "ID",
      "Fecha",
      "Accion",
      "Tabla",
      "Record ID",
      "Usuario",
      "Campos Modificados",
    ];
    const rows = logs.map((log) => [
      log.id,
      new Date(log.created_at).toISOString(),
      log.action,
      log.table_name,
      log.record_id || "",
      log.user?.name || "Sistema",
      log.changed_fields?.join("; ") || "",
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setTableFilter("");
    setActionFilter("");
    setUserFilter("");
    setStartDate("");
    setEndDate("");
    setPagination((p) => ({ ...p, offset: 0 }));
  };

  const hasFilters =
    tableFilter || actionFilter || userFilter || startDate || endDate;

  if (loading && logs.length === 0) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/ops"
              className="text-slate-400 hover:text-white text-sm"
            >
              ← Volver a Ops
            </Link>
            <div>
              <h1 className="text-xl font-extrabold flex items-center gap-2">
                🔒 Admin — Registro de Auditoria
              </h1>
              <p className="text-slate-400 text-sm">
                Acceso completo al historial de cambios del sistema
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge color="#EF4444">Solo Propietarios</Badge>
            <button
              onClick={exportToCSV}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-500"
            >
              Exportar CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="px-6 py-4 bg-slate-800/50 border-b border-slate-700">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-3xl font-black text-white">
                {summary.total_entries.toLocaleString()}
              </div>
              <div className="text-xs text-slate-400 font-medium">
                Total Registros
              </div>
            </div>
            <div className="bg-emerald-900/30 rounded-xl p-4 border border-emerald-800">
              <div className="text-3xl font-black text-emerald-400">
                {summary.last_24h.inserts}
              </div>
              <div className="text-xs text-emerald-400 font-medium">
                Creados (24h)
              </div>
            </div>
            <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-800">
              <div className="text-3xl font-black text-blue-400">
                {summary.last_24h.updates}
              </div>
              <div className="text-xs text-blue-400 font-medium">
                Actualizados (24h)
              </div>
            </div>
            <div className="bg-rose-900/30 rounded-xl p-4 border border-rose-800">
              <div className="text-3xl font-black text-rose-400">
                {summary.last_24h.deletes}
              </div>
              <div className="text-xs text-rose-400 font-medium">
                Eliminados (24h)
              </div>
            </div>
            <div className="bg-purple-900/30 rounded-xl p-4 border border-purple-800">
              <div className="text-3xl font-black text-purple-400">
                {summary.tables_affected.length}
              </div>
              <div className="text-xs text-purple-400 font-medium">
                Tablas Activas
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="px-6 pt-4 border-b border-slate-700">
        <div className="flex gap-1">
          {[
            { key: "logs", label: "Registros", icon: "📋" },
            { key: "users", label: "Actividad por Usuario", icon: "👥" },
            { key: "analytics", label: "Analisis", icon: "📊" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() =>
                setActiveTab(tab.key as "logs" | "users" | "analytics")
              }
              className={`px-4 py-3 rounded-t-lg text-sm font-bold transition-all ${
                activeTab === tab.key
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === "logs" && (
          <>
            {/* Filters */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-4 mb-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Tabla
                  </label>
                  <select
                    value={tableFilter}
                    onChange={(e) => {
                      setTableFilter(e.target.value);
                      setPagination((p) => ({ ...p, offset: 0 }));
                    }}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white min-w-[160px]"
                  >
                    {TABLE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Accion
                  </label>
                  <select
                    value={actionFilter}
                    onChange={(e) => {
                      setActionFilter(e.target.value);
                      setPagination((p) => ({ ...p, offset: 0 }));
                    }}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white min-w-[120px]"
                  >
                    <option value="">Todas</option>
                    <option value="INSERT">Crear</option>
                    <option value="UPDATE">Actualizar</option>
                    <option value="DELETE">Eliminar</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => {
                      setStartDate(e.target.value);
                      setPagination((p) => ({ ...p, offset: 0 }));
                    }}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      setPagination((p) => ({ ...p, offset: 0 }));
                    }}
                    className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-white"
                  />
                </div>

                {hasFilters && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-slate-400 hover:text-white border border-slate-600 rounded-lg"
                  >
                    Limpiar
                  </button>
                )}

                <button
                  onClick={() => loadLogs()}
                  className="px-4 py-2 text-sm bg-[#00B4FF] text-white rounded-lg font-bold"
                >
                  Buscar
                </button>
              </div>
            </div>

            {/* Log List */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
              {logs.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  No hay registros
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-700/50 text-slate-300">
                      <tr>
                        <th className="px-4 py-3 text-left">Fecha</th>
                        <th className="px-4 py-3 text-left">Accion</th>
                        <th className="px-4 py-3 text-left">Tabla</th>
                        <th className="px-4 py-3 text-left">Usuario</th>
                        <th className="px-4 py-3 text-left">
                          Campos Modificados
                        </th>
                        <th className="px-4 py-3 text-left">ID</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                      {logs.map((log) => (
                        <tr
                          key={log.id}
                          className="hover:bg-slate-700/50 cursor-pointer"
                          onClick={() => setSelectedLog(log)}
                        >
                          <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                            {new Date(log.created_at).toLocaleString("es-CO", {
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={ACTION_COLORS[log.action]}>
                              {ACTION_LABELS[log.action]}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {TABLE_LABELS[log.table_name] || log.table_name}
                          </td>
                          <td className="px-4 py-3 text-slate-300">
                            {log.user?.name || "Sistema"}
                          </td>
                          <td className="px-4 py-3 text-slate-400 text-xs max-w-[200px] truncate">
                            {log.changed_fields?.join(", ") || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {log.record_id?.slice(0, 8) || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {pagination.total > pagination.limit && (
                <div className="p-4 border-t border-slate-700 flex items-center justify-between">
                  <span className="text-sm text-slate-400">
                    Mostrando {pagination.offset + 1} -{" "}
                    {Math.min(
                      pagination.offset + pagination.limit,
                      pagination.total,
                    )}{" "}
                    de {pagination.total.toLocaleString()}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          offset: Math.max(0, p.offset - p.limit),
                        }))
                      }
                      disabled={pagination.offset === 0}
                      className="px-3 py-1.5 text-sm bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                      ← Anterior
                    </button>
                    <button
                      onClick={() =>
                        setPagination((p) => ({
                          ...p,
                          offset: p.offset + p.limit,
                        }))
                      }
                      disabled={!pagination.has_more}
                      className="px-3 py-1.5 text-sm bg-slate-700 rounded-lg disabled:opacity-50"
                    >
                      Siguiente →
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "users" && (
          <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-700/50 text-slate-300">
                <tr>
                  <th className="px-4 py-3 text-left">Usuario</th>
                  <th className="px-4 py-3 text-left">Rol</th>
                  <th className="px-4 py-3 text-left">Acciones</th>
                  <th className="px-4 py-3 text-left">Ultima Actividad</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {userActivity.map((user) => (
                  <tr key={user.user_id} className="hover:bg-slate-700/50">
                    <td className="px-4 py-3 font-medium">{user.user_name}</td>
                    <td className="px-4 py-3">
                      <Badge color="#6B7280">{user.user_role}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xl font-black text-[#00B4FF]">
                        {user.action_count}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {new Date(user.last_action).toLocaleString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "analytics" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Tables Distribution */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h3 className="font-bold text-lg mb-4">
                Distribucion por Tabla (24h)
              </h3>
              <div className="space-y-3">
                {summary?.tables_affected.map((table) => {
                  const count = logs.filter(
                    (l) => l.table_name === table,
                  ).length;
                  const percentage = Math.round((count / logs.length) * 100);
                  return (
                    <div key={table}>
                      <div className="flex justify-between text-sm mb-1">
                        <span>{TABLE_LABELS[table] || table}</span>
                        <span className="text-slate-400">{count}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#00B4FF] rounded-full"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Actions Distribution */}
            <div className="bg-slate-800 rounded-xl border border-slate-700 p-6">
              <h3 className="font-bold text-lg mb-4">Acciones (24h)</h3>
              <div className="space-y-4">
                {["INSERT", "UPDATE", "DELETE"].map((action) => {
                  const count = logs.filter((l) => l.action === action).length;
                  const percentage = logs.length
                    ? Math.round((count / logs.length) * 100)
                    : 0;
                  return (
                    <div key={action} className="flex items-center gap-4">
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                        style={{
                          backgroundColor:
                            ACTION_COLORS[action as keyof typeof ACTION_COLORS],
                        }}
                      >
                        {count}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between text-sm mb-1">
                          <span>
                            {
                              ACTION_LABELS[
                                action as keyof typeof ACTION_LABELS
                              ]
                            }
                          </span>
                          <span className="text-slate-400">{percentage}%</span>
                        </div>
                        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor:
                                ACTION_COLORS[
                                  action as keyof typeof ACTION_COLORS
                                ],
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-slate-800 rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto border border-slate-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge color={ACTION_COLORS[selectedLog.action]}>
                    {ACTION_LABELS[selectedLog.action]}
                  </Badge>
                  <span className="font-bold text-lg">
                    {TABLE_LABELS[selectedLog.table_name] ||
                      selectedLog.table_name}
                  </span>
                </div>
                <p className="text-sm text-slate-400">
                  {new Date(selectedLog.created_at).toLocaleString("es-CO")}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {selectedLog.record_id && (
              <div className="mb-4 p-3 bg-slate-700/50 rounded-lg">
                <span className="text-xs text-slate-400">Record ID:</span>
                <span className="text-sm font-mono text-white ml-2 select-all">
                  {selectedLog.record_id}
                </span>
              </div>
            )}

            {selectedLog.user && (
              <div className="mb-4 p-3 bg-blue-900/30 rounded-lg border border-blue-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-800 flex items-center justify-center text-blue-300 font-bold">
                  {selectedLog.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium">{selectedLog.user.name}</div>
                  <div className="text-xs text-slate-400">
                    {selectedLog.user.email}
                  </div>
                </div>
                <Badge color="#3B82F6">{selectedLog.user.role}</Badge>
              </div>
            )}

            {selectedLog.changed_fields &&
              selectedLog.changed_fields.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-slate-300">
                    Campos modificados:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedLog.changed_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-xs font-medium border border-amber-800"
                      >
                        {field}
                      </span>
                    ))}
                  </div>
                </div>
              )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedLog.old_value && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500" />
                    <span className="text-sm font-medium">Valor anterior</span>
                  </div>
                  <pre className="p-3 bg-rose-900/20 border border-rose-800 rounded-lg text-xs overflow-x-auto max-h-64 font-mono text-rose-200">
                    {formatValue(selectedLog.old_value)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium">Valor nuevo</span>
                  </div>
                  <pre className="p-3 bg-emerald-900/20 border border-emerald-800 rounded-lg text-xs overflow-x-auto max-h-64 font-mono text-emerald-200">
                    {formatValue(selectedLog.new_value)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(selectedLog, null, 2),
                  );
                }}
                className="px-4 py-2 bg-[#00B4FF] text-white rounded-lg font-medium hover:bg-[#00A4EF]"
              >
                Copiar JSON
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
