"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";

interface AuditLogEntry {
  id: string;
  user_id: string | null;
  user_email: string | null;
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

const TABLE_LABELS: Record<string, string> = {
  villa_bookings: "Reservas",
  purchase_orders: "Ordenes de Compra",
  conversations: "Conversaciones",
  ingredients: "Ingredientes",
  users: "Usuarios",
  reservations: "Reservaciones",
};

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
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("limit", pagination.limit.toString());
      params.set("offset", pagination.offset.toString());
      if (tableFilter) params.set("table", tableFilter);
      if (actionFilter) params.set("action", actionFilter);

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
  }, [tableFilter, actionFilter, pagination.limit, pagination.offset]);

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
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          📋 Registro de Auditoria
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Historial completo de cambios en el sistema (solo visible para
          propietarios)
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
            <div className="text-2xl font-black text-blue-600">
              {summary.total_entries}
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
        <div className="flex flex-wrap gap-3">
          <select
            value={tableFilter}
            onChange={(e) => {
              setTableFilter(e.target.value);
              setPagination((p) => ({ ...p, offset: 0 }));
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">Todas las tablas</option>
            <option value="villa_bookings">Reservas</option>
            <option value="purchase_orders">Ordenes de Compra</option>
            <option value="conversations">Conversaciones</option>
            <option value="ingredients">Ingredientes</option>
            <option value="users">Usuarios</option>
            <option value="reservations">Reservaciones</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPagination((p) => ({ ...p, offset: 0 }));
            }}
            className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
          >
            <option value="">Todas las acciones</option>
            <option value="INSERT">Crear</option>
            <option value="UPDATE">Actualizar</option>
            <option value="DELETE">Eliminar</option>
          </select>

          {(tableFilter || actionFilter) && (
            <button
              onClick={() => {
                setTableFilter("");
                setActionFilter("");
                setPagination((p) => ({ ...p, offset: 0 }));
              }}
              className="px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Log List */}
      <div className="bg-white rounded-xl border border-slate-200">
        {logs.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No hay registros de auditoria
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-4 hover:bg-slate-50 transition-colors cursor-pointer"
                onClick={() => setSelectedLog(log)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={ACTION_COLORS[log.action]}>
                        {ACTION_LABELS[log.action]}
                      </Badge>
                      <span className="font-medium text-slate-900">
                        {TABLE_LABELS[log.table_name] || log.table_name}
                      </span>
                      {log.record_id && (
                        <span className="text-xs text-slate-400 font-mono">
                          {log.record_id.slice(0, 8)}...
                        </span>
                      )}
                    </div>
                    {log.changed_fields && log.changed_fields.length > 0 && (
                      <div className="text-xs text-slate-500">
                        Campos: {log.changed_fields.join(", ")}
                      </div>
                    )}
                    {log.user && (
                      <div className="text-xs text-slate-400 mt-1">
                        Por: {log.user.name} ({log.user.role})
                      </div>
                    )}
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("es-CO")}
                  </span>
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
              de {pagination.total}
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
                className="px-3 py-1 text-sm bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    offset: p.offset + p.limit,
                  }))
                }
                disabled={!pagination.has_more}
                className="px-3 py-1 text-sm bg-slate-100 rounded-lg disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Badge color={ACTION_COLORS[selectedLog.action]}>
                    {ACTION_LABELS[selectedLog.action]}
                  </Badge>
                  <span className="font-bold text-slate-900">
                    {TABLE_LABELS[selectedLog.table_name] ||
                      selectedLog.table_name}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {new Date(selectedLog.created_at).toLocaleString("es-CO")}
                </p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {selectedLog.record_id && (
              <div className="mb-4">
                <span className="text-xs text-slate-500">ID del registro:</span>
                <span className="text-xs font-mono text-slate-700 ml-2">
                  {selectedLog.record_id}
                </span>
              </div>
            )}

            {selectedLog.user && (
              <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                <span className="text-sm font-medium">Usuario:</span>
                <span className="text-sm ml-2">
                  {selectedLog.user.name} ({selectedLog.user.email})
                </span>
                <Badge color="#6B7280">{selectedLog.user.role}</Badge>
              </div>
            )}

            {selectedLog.changed_fields &&
              selectedLog.changed_fields.length > 0 && (
                <div className="mb-4">
                  <span className="text-sm font-medium text-slate-700">
                    Campos modificados:
                  </span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedLog.changed_fields.map((field) => (
                      <span
                        key={field}
                        className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-xs"
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
                  <span className="text-sm font-medium text-slate-700">
                    Valor anterior:
                  </span>
                  <pre className="mt-1 p-3 bg-rose-50 rounded-lg text-xs overflow-x-auto max-h-64">
                    {formatValue(selectedLog.old_value)}
                  </pre>
                </div>
              )}

              {selectedLog.new_value && (
                <div>
                  <span className="text-sm font-medium text-slate-700">
                    Valor nuevo:
                  </span>
                  <pre className="mt-1 p-3 bg-emerald-50 rounded-lg text-xs overflow-x-auto max-h-64">
                    {formatValue(selectedLog.new_value)}
                  </pre>
                </div>
              )}
            </div>

            <div className="mt-6">
              <button
                onClick={() => setSelectedLog(null)}
                className="w-full px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
