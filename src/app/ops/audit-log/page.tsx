"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";

// ═══════════════════════════════════════════════════════════════
// AUDIT LOG PAGE — OWNER-ONLY ACCESS
// Issues #41 and #52 — Complete Audit Trail
// Search by user, table, date, action type
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

const ACTION_ICONS = {
  INSERT: "+",
  UPDATE: "~",
  DELETE: "-",
};

const TABLE_LABELS: Record<string, string> = {
  villa_bookings: "Reservas",
  villa_status: "Estado Villas",
  purchase_orders: "Ordenes de Compra",
  conversations: "Conversaciones",
  ingredients: "Ingredientes",
  users: "Usuarios",
  reservations: "Reservaciones",
  checklists: "Checklists",
  maintenance_issues: "Mantenimiento",
  villa_status_history: "Historial Estado",
};

const TABLE_OPTIONS = [
  { value: "", label: "Todas las tablas" },
  { value: "villa_bookings", label: "Reservas" },
  { value: "villa_status", label: "Estado Villas" },
  { value: "checklists", label: "Checklists" },
  { value: "maintenance_issues", label: "Mantenimiento" },
  { value: "purchase_orders", label: "Ordenes de Compra" },
  { value: "conversations", label: "Conversaciones" },
  { value: "users", label: "Usuarios" },
];

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    total: 0,
    limit: 50,
    offset: 0,
    has_more: false,
  });

  // Filters
  const [tableFilter, setTableFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
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
      if (startDate) params.set("start_date", startDate);
      if (endDate) params.set("end_date", endDate);

      const response = await fetch(`/api/audit-log?${params}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs);
        setSummary(data.summary);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("[loadLogs]", error);
    }
    setLoading(false);
  }, [
    tableFilter,
    actionFilter,
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

  const getTimeSince = (date: string): string => {
    const seconds = Math.floor(
      (new Date().getTime() - new Date(date).getTime()) / 1000,
    );
    if (seconds < 60) return "hace unos segundos";
    if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
    if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)} horas`;
    return `hace ${Math.floor(seconds / 86400)} días`;
  };

  const clearFilters = () => {
    setTableFilter("");
    setActionFilter("");
    setStartDate("");
    setEndDate("");
    setPagination((p) => ({ ...p, offset: 0 }));
  };

  const hasFilters = tableFilter || actionFilter || startDate || endDate;

  if (loading && logs.length === 0) {
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              📋 Registro de Auditoria
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Historial completo de cambios en el sistema
            </p>
          </div>
          <Badge color="#EF4444">Solo Propietarios</Badge>
        </div>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="text-2xl font-black text-blue-600">
              {summary.total_entries.toLocaleString()}
            </div>
            <div className="text-xs text-blue-600 font-medium">
              Total Registros
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
            <div className="text-2xl font-black text-emerald-600">
              {summary.last_24h.inserts}
            </div>
            <div className="text-xs text-emerald-600 font-medium">
              Creados (24h)
            </div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="text-2xl font-black text-amber-600">
              {summary.last_24h.updates}
            </div>
            <div className="text-xs text-amber-600 font-medium">
              Actualizados (24h)
            </div>
          </div>
          <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
            <div className="text-2xl font-black text-rose-600">
              {summary.last_24h.deletes}
            </div>
            <div className="text-xs text-rose-600 font-medium">
              Eliminados (24h)
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-4">
        <div className="flex flex-wrap gap-3 items-end">
          {/* Table Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Tabla
            </label>
            <select
              value={tableFilter}
              onChange={(e) => {
                setTableFilter(e.target.value);
                setPagination((p) => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[160px]"
            >
              {TABLE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Action Filter */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Accion
            </label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPagination((p) => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm min-w-[140px]"
            >
              <option value="">Todas</option>
              <option value="INSERT">Crear</option>
              <option value="UPDATE">Actualizar</option>
              <option value="DELETE">Eliminar</option>
            </select>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Desde
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPagination((p) => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Hasta
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPagination((p) => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
            />
          </div>

          {hasFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700 border border-slate-200 rounded-lg"
            >
              Limpiar filtros
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
      <div className="bg-white rounded-xl border border-slate-200">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <div className="text-4xl mb-2">📭</div>
            No hay registros de auditoria
            {hasFilters && (
              <p className="text-sm mt-2">
                Intenta ajustar los filtros para ver mas resultados
              </p>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer group"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {/* Action Icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: ACTION_COLORS[log.action] }}
                    >
                      {ACTION_ICONS[log.action]}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge color={ACTION_COLORS[log.action]}>
                          {ACTION_LABELS[log.action]}
                        </Badge>
                        <span className="font-medium text-slate-900">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </span>
                        {log.record_id && (
                          <span className="text-xs text-slate-400 font-mono bg-slate-100 px-1.5 py-0.5 rounded">
                            {log.record_id.slice(0, 8)}
                          </span>
                        )}
                      </div>

                      {log.changed_fields && log.changed_fields.length > 0 && (
                        <div className="text-xs text-slate-500 mb-1">
                          Campos:{" "}
                          <span className="text-slate-700">
                            {log.changed_fields.slice(0, 5).join(", ")}
                            {log.changed_fields.length > 5 &&
                              ` +${log.changed_fields.length - 5} mas`}
                          </span>
                        </div>
                      )}

                      {log.user && (
                        <div className="text-xs text-slate-400">
                          Por:{" "}
                          <span className="text-slate-600">
                            {log.user.name}
                          </span>{" "}
                          <Badge color="#6B7280">{log.user.role}</Badge>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <div className="text-xs text-slate-400">
                      {getTimeSince(log.created_at)}
                    </div>
                    <div className="text-[10px] text-slate-300 mt-0.5">
                      {new Date(log.created_at).toLocaleString("es-CO", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                {/* Expandable preview on hover */}
                <div className="hidden group-hover:block mt-2 pt-2 border-t border-slate-100">
                  <div className="text-xs text-slate-500">
                    Click para ver detalles completos
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.total > pagination.limit && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between">
            <span className="text-sm text-slate-500">
              Mostrando {pagination.offset + 1} -{" "}
              {Math.min(pagination.offset + pagination.limit, pagination.total)}{" "}
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
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg disabled:opacity-50 font-medium"
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
                className="px-3 py-1.5 text-sm bg-slate-100 rounded-lg disabled:opacity-50 font-medium"
              >
                Siguiente →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-3xl w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                    style={{
                      backgroundColor: ACTION_COLORS[selectedLog.action],
                    }}
                  >
                    {ACTION_ICONS[selectedLog.action]}
                  </div>
                  <Badge color={ACTION_COLORS[selectedLog.action]}>
                    {ACTION_LABELS[selectedLog.action]}
                  </Badge>
                  <span className="font-bold text-slate-900 text-lg">
                    {TABLE_LABELS[selectedLog.table_name] ||
                      selectedLog.table_name}
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  {new Date(selectedLog.created_at).toLocaleString("es-CO", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedLog.record_id && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <span className="text-xs text-slate-500">ID del registro:</span>
                <span className="text-sm font-mono text-slate-700 ml-2 select-all">
                  {selectedLog.record_id}
                </span>
              </div>
            )}

            {selectedLog.user && (
              <div className="mb-4 p-3 bg-blue-50 rounded-lg flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-600 font-bold">
                  {selectedLog.user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-slate-900">
                    {selectedLog.user.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selectedLog.user.email}
                  </div>
                </div>
                <Badge color="#3B82F6">{selectedLog.user.role}</Badge>
              </div>
            )}

            {selectedLog.changed_fields &&
              selectedLog.changed_fields.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-slate-700">
                    Campos modificados:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {selectedLog.changed_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-xs font-medium"
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
                    <span className="text-sm font-medium text-slate-700">
                      Valor anterior
                    </span>
                  </div>
                  <pre className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs overflow-x-auto max-h-64 font-mono">
                    {formatValue(selectedLog.old_value)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500" />
                    <span className="text-sm font-medium text-slate-700">
                      Valor nuevo
                    </span>
                  </div>
                  <pre className="p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-xs overflow-x-auto max-h-64 font-mono">
                    {formatValue(selectedLog.new_value)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setSelectedLog(null)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200"
              >
                Cerrar
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    JSON.stringify(
                      {
                        id: selectedLog.id,
                        action: selectedLog.action,
                        table: selectedLog.table_name,
                        record_id: selectedLog.record_id,
                        old_value: selectedLog.old_value,
                        new_value: selectedLog.new_value,
                        user: selectedLog.user,
                        created_at: selectedLog.created_at,
                      },
                      null,
                      2,
                    ),
                  );
                }}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-medium hover:bg-slate-700"
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
