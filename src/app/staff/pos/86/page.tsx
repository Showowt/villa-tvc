"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// ============================================
// 86 DASHBOARD - Sistema de No Disponibles
// Manage unavailable items, quick restore, history
// ============================================

interface Item86 {
  id: string;
  name_es: string;
  category: string | null;
  unavailable_reason: string | null;
  unavailable_until: string | null;
}

interface LogEntry {
  id: string;
  item_type: string;
  item_id: string;
  item_name: string;
  action: string;
  reason: string | null;
  created_at: string;
}

const COMMON_REASONS = [
  "Se agoto",
  "Falta ingrediente",
  "Proveedor no entrego",
  "Equipo danado",
  "Clima no permite",
  "Personal no disponible",
  "Temporada terminada",
];

export default function Page86Dashboard() {
  const [menuItems, setMenuItems] = useState<Item86[]>([]);
  const [services, setServices] = useState<Item86[]>([]);
  const [history, setHistory] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  // Modal state for adding new 86
  const [showAddModal, setShowAddModal] = useState(false);
  const [allMenuItems, setAllMenuItems] = useState<Item86[]>([]);
  const [allServices, setAllServices] = useState<Item86[]>([]);
  const [selectedType, setSelectedType] = useState<"menu_item" | "service">(
    "menu_item",
  );
  const [selectedItemId, setSelectedItemId] = useState("");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");

  const load86Data = useCallback(async () => {
    try {
      const response = await fetch("/api/staff/86");
      const data = await response.json();

      if (data.error) {
        console.error("[86] Error loading:", data.error);
        return;
      }

      setMenuItems(data.menu_items || []);
      setServices(data.services || []);
      setHistory(data.history || []);
    } catch (error) {
      console.error("[86] Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadAllItems = useCallback(async () => {
    const supabase = createBrowserClient();

    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name_es, category")
      .eq("is_active", true)
      .eq("is_available", true)
      .order("category")
      .order("name_es");

    const { data: svcs } = await supabase
      .from("services")
      .select("id, name_es, category")
      .eq("is_active", true)
      .eq("is_available_today", true)
      .order("name_es");

    setAllMenuItems(
      (items || []).map((i) => ({
        ...i,
        unavailable_reason: null,
        unavailable_until: null,
      })),
    );
    setAllServices(
      (svcs || []).map((s) => ({
        ...s,
        unavailable_reason: null,
        unavailable_until: null,
      })),
    );
  }, []);

  useEffect(() => {
    load86Data();
    loadAllItems();
  }, [load86Data, loadAllItems]);

  const restoreItem = async (
    itemType: "menu_item" | "service",
    itemId: string,
  ) => {
    setProcessing(itemId);

    try {
      const response = await fetch("/api/staff/86", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_type: itemType,
          item_id: itemId,
          action: "restore",
        }),
      });

      const data = await response.json();

      if (data.success) {
        load86Data();
        loadAllItems();
      } else {
        alert(data.error || "Error al restaurar");
      }
    } catch (error) {
      console.error("[86] Restore error:", error);
      alert("Error de conexion");
    } finally {
      setProcessing(null);
    }
  };

  const add86Item = async () => {
    if (!selectedItemId) {
      alert("Selecciona un item");
      return;
    }

    const finalReason = reason === "Otro" ? customReason : reason;

    setProcessing(selectedItemId);
    setShowAddModal(false);

    try {
      const response = await fetch("/api/staff/86", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          item_type: selectedType,
          item_id: selectedItemId,
          action: "86",
          reason: finalReason || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        load86Data();
        loadAllItems();
        setSelectedItemId("");
        setReason("");
        setCustomReason("");
      } else {
        alert(data.error || "Error al marcar como 86");
      }
    } catch (error) {
      console.error("[86] Add error:", error);
      alert("Error de conexion");
    } finally {
      setProcessing(null);
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

    if (diffHours < 1) {
      const diffMins = Math.floor(diffMs / (1000 * 60));
      return `hace ${diffMins} min`;
    } else if (diffHours < 24) {
      return `hace ${diffHours}h`;
    } else {
      return date.toLocaleDateString("es-CO", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const formatRestoreTime = (timestamp: string | null) => {
    if (!timestamp) return "Manual";
    const date = new Date(timestamp);
    return date.toLocaleString("es-CO", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-red-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🚫</span> Sistema 86
        </h1>
        <p className="text-xs text-slate-400">
          Items no disponibles - restauracion automatica a las 6 AM
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="text-3xl font-black text-red-400">
            {menuItems.length}
          </div>
          <div className="text-xs text-slate-400">Menu Items 86&apos;d</div>
        </div>
        <div className="bg-orange-500/20 border border-orange-500/30 rounded-xl p-4">
          <div className="text-3xl font-black text-orange-400">
            {services.length}
          </div>
          <div className="text-xs text-slate-400">Servicios 86&apos;d</div>
        </div>
      </div>

      {/* Add 86 Button */}
      <button
        onClick={() => setShowAddModal(true)}
        className="w-full py-3 mb-6 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
      >
        <span className="text-xl">+</span>
        Marcar Item como 86
      </button>

      {/* 86'd Menu Items */}
      {menuItems.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
            Menu Items No Disponibles
          </h2>
          <div className="space-y-2">
            {menuItems.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-black text-sm transform -rotate-12">
                      86
                    </span>
                    <span className="font-bold line-through text-slate-400">
                      {item.name_es}
                    </span>
                  </div>
                  {item.unavailable_reason && (
                    <div className="text-xs text-slate-500 mt-1">
                      {item.unavailable_reason}
                    </div>
                  )}
                  <div className="text-xs text-amber-500 mt-1">
                    Restaura: {formatRestoreTime(item.unavailable_until)}
                  </div>
                </div>
                <button
                  onClick={() => restoreItem("menu_item", item.id)}
                  disabled={processing === item.id}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50"
                >
                  {processing === item.id ? "..." : "Restaurar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 86'd Services */}
      {services.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
            Servicios No Disponibles
          </h2>
          <div className="space-y-2">
            {services.map((item) => (
              <div
                key={item.id}
                className="bg-slate-800 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-orange-500 font-black text-sm transform -rotate-12">
                      86
                    </span>
                    <span className="font-bold line-through text-slate-400">
                      {item.name_es}
                    </span>
                  </div>
                  {item.unavailable_reason && (
                    <div className="text-xs text-slate-500 mt-1">
                      {item.unavailable_reason}
                    </div>
                  )}
                  <div className="text-xs text-amber-500 mt-1">
                    Restaura: {formatRestoreTime(item.unavailable_until)}
                  </div>
                </div>
                <button
                  onClick={() => restoreItem("service", item.id)}
                  disabled={processing === item.id}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50"
                >
                  {processing === item.id ? "..." : "Restaurar"}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {menuItems.length === 0 && services.length === 0 && (
        <div className="text-center py-12 text-slate-500">
          <div className="text-4xl mb-3">✅</div>
          <div className="font-bold">Todo Disponible</div>
          <div className="text-sm">No hay items marcados como 86</div>
        </div>
      )}

      {/* Recent History */}
      {history.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">
            Historial Reciente
          </h2>
          <div className="space-y-2">
            {history.slice(0, 10).map((log) => (
              <div
                key={log.id}
                className="bg-slate-800/50 rounded-lg p-3 flex items-center gap-3"
              >
                <span
                  className={`text-xl ${
                    log.action === "86" ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {log.action === "86" ? "🚫" : "✅"}
                </span>
                <div className="flex-1">
                  <div className="text-sm font-medium">{log.item_name}</div>
                  <div className="text-xs text-slate-500">
                    {log.action === "86" ? "Marcado 86" : "Restaurado"}
                    {log.reason && ` - ${log.reason}`}
                  </div>
                </div>
                <div className="text-xs text-slate-500">
                  {formatTime(log.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add 86 Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-lg font-bold mb-4">Marcar como 86</h2>

            {/* Type Selection */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setSelectedType("menu_item");
                  setSelectedItemId("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  selectedType === "menu_item"
                    ? "bg-red-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                Menu
              </button>
              <button
                onClick={() => {
                  setSelectedType("service");
                  setSelectedItemId("");
                }}
                className={`flex-1 py-2 rounded-lg font-bold transition-colors ${
                  selectedType === "service"
                    ? "bg-orange-500 text-white"
                    : "bg-slate-700 text-slate-400"
                }`}
              >
                Servicios
              </button>
            </div>

            {/* Item Selection */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">
                Selecciona Item
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white"
              >
                <option value="">Seleccionar...</option>
                {(selectedType === "menu_item"
                  ? allMenuItems
                  : allServices
                ).map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.category ? `[${item.category}] ` : ""}
                    {item.name_es}
                  </option>
                ))}
              </select>
            </div>

            {/* Reason Selection */}
            <div className="mb-4">
              <label className="text-sm text-slate-400 mb-2 block">
                Razon (opcional)
              </label>
              <div className="grid grid-cols-2 gap-2 mb-2">
                {COMMON_REASONS.map((r) => (
                  <button
                    key={r}
                    onClick={() => setReason(r)}
                    className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                      reason === r
                        ? "bg-red-500 text-white"
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {r}
                  </button>
                ))}
                <button
                  onClick={() => setReason("Otro")}
                  className={`py-2 px-3 rounded-lg text-xs font-medium transition-colors ${
                    reason === "Otro"
                      ? "bg-red-500 text-white"
                      : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                  }`}
                >
                  Otro
                </button>
              </div>

              {reason === "Otro" && (
                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Escribe la razon..."
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 text-white mt-2"
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={add86Item}
                disabled={!selectedItemId}
                className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50"
              >
                Confirmar 86
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
