"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type LinenInventory = Tables<"linen_inventory">;
type LinenLog = Tables<"linen_logs">;

const ACTIONS = [
  { key: "to_use", label: "A Villa", icon: "arrow-right", color: "amber" },
  { key: "to_laundry", label: "A Lavanderia", icon: "sparkles", color: "blue" },
  {
    key: "from_laundry",
    label: "De Lavanderia",
    icon: "check",
    color: "emerald",
  },
  { key: "returned", label: "Devuelto", icon: "arrow-left", color: "cyan" },
];

const VILLAS = ["villa_1", "villa_2", "villa_3", "main_house"];

export default function LinenTrackingPage() {
  const [linens, setLinens] = useState<LinenInventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLinen, setSelectedLinen] = useState<LinenInventory | null>(
    null,
  );
  const [selectedAction, setSelectedAction] = useState<string>("");
  const [quantity, setQuantity] = useState(1);
  const [selectedVilla, setSelectedVilla] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [occupiedVillas, setOccupiedVillas] = useState(0);
  const [alerts, setAlerts] = useState<LinenInventory[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createBrowserClient();

    // Load linen inventory
    const { data: linenData } = await supabase
      .from("linen_inventory")
      .select("*")
      .order("item_type")
      .order("item_name");

    if (linenData) {
      setLinens(linenData);
      // Check for alerts (available < min_available)
      const lowStock = linenData.filter((l) => l.available < l.min_available);
      setAlerts(lowStock);
    }

    // Get occupied villas count
    const today = new Date().toISOString().split("T")[0];
    const { data: occupancy } = await supabase
      .from("daily_occupancy")
      .select("villas_occupied")
      .eq("date", today)
      .single();

    if (occupancy?.villas_occupied) {
      const villaArray = occupancy.villas_occupied as string[];
      setOccupiedVillas(villaArray.length);
    }

    setLoading(false);
  };

  const handleLogMovement = async () => {
    if (!selectedLinen || !selectedAction || quantity < 1) {
      return;
    }

    setSaving(true);

    try {
      const supabase = createBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Por favor inicia sesion");
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      // Insert log
      await supabase.from("linen_logs").insert({
        linen_id: selectedLinen.id,
        action: selectedAction,
        quantity,
        villa_id: selectedVilla || null,
        notes: notes || null,
        logged_by: profile?.id,
      });

      // Update inventory counts based on action
      const updates: Partial<LinenInventory> = {};

      if (selectedAction === "to_use") {
        updates.in_use = selectedLinen.in_use + quantity;
      } else if (selectedAction === "to_laundry") {
        updates.in_use = Math.max(0, selectedLinen.in_use - quantity);
        updates.in_laundry = selectedLinen.in_laundry + quantity;
      } else if (selectedAction === "from_laundry") {
        updates.in_laundry = Math.max(0, selectedLinen.in_laundry - quantity);
      } else if (selectedAction === "returned") {
        updates.in_use = Math.max(0, selectedLinen.in_use - quantity);
      }

      await supabase
        .from("linen_inventory")
        .update(updates)
        .eq("id", selectedLinen.id);

      // Reset form and reload
      setSelectedLinen(null);
      setSelectedAction("");
      setQuantity(1);
      setSelectedVilla("");
      setNotes("");

      await loadData();
    } catch (error) {
      console.error("Error logging movement:", error);
      alert("Error al registrar movimiento");
    } finally {
      setSaving(false);
    }
  };

  const groupedLinens = linens.reduce(
    (acc, linen) => {
      const type = linen.item_type;
      if (!acc[type]) acc[type] = [];
      acc[type].push(linen);
      return acc;
    },
    {} as Record<string, LinenInventory[]>,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Blancos y Toallas</h1>
        <p className="text-xs text-slate-400">
          Control de inventario de blancos
        </p>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 text-red-400 mb-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span className="font-medium text-sm">Stock Bajo</span>
          </div>
          <div className="space-y-1">
            {alerts.map((alert) => (
              <p key={alert.id} className="text-xs text-red-300">
                {alert.item_name_es}: {alert.available} disponibles (min:{" "}
                {alert.min_available})
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-cyan-400">
              {occupiedVillas}
            </div>
            <div className="text-[10px] text-slate-400">Villas Ocupadas</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-emerald-400">
              {linens.reduce((sum, l) => sum + l.available, 0)}
            </div>
            <div className="text-[10px] text-slate-400">Disponibles</div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-2xl font-bold text-amber-400">
              {linens.reduce((sum, l) => sum + l.in_laundry, 0)}
            </div>
            <div className="text-[10px] text-slate-400">En Lavanderia</div>
          </div>
        </div>
      </div>

      {/* Inventory by Type */}
      {Object.entries(groupedLinens).map(([type, items]) => (
        <div key={type}>
          <h3 className="text-sm font-bold text-slate-400 mb-2 uppercase tracking-wide">
            {type === "towels"
              ? "Toallas"
              : type === "sheets"
                ? "Sabanas"
                : type === "pillowcases"
                  ? "Fundas"
                  : type === "bathrobes"
                    ? "Batas"
                    : type}
          </h3>

          <div className="space-y-2">
            {items.map((item) => {
              const isLow = item.available < item.min_available;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedLinen(item)}
                  className={`w-full text-left bg-slate-800 rounded-xl p-4 transition-colors ${
                    isLow ? "border border-red-500/30" : ""
                  } ${selectedLinen?.id === item.id ? "ring-2 ring-cyan-500" : ""}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">
                        {item.item_name_es}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Por villa: {item.per_villa}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex gap-3 text-xs">
                        <span className="text-emerald-400">
                          {item.available} disp
                        </span>
                        <span className="text-amber-400">
                          {item.in_use} uso
                        </span>
                        <span className="text-blue-400">
                          {item.in_laundry} lav
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Total: {item.total_stock}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Movement Modal */}
      {selectedLinen && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-end">
          <div className="w-full bg-slate-800 rounded-t-2xl p-6 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold">{selectedLinen.item_name_es}</h3>
              <button
                onClick={() => setSelectedLinen(null)}
                className="text-slate-400 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-3 gap-2 mb-4 text-center text-xs">
              <div className="bg-emerald-500/20 rounded-lg p-2 text-emerald-400">
                {selectedLinen.available} Disponibles
              </div>
              <div className="bg-amber-500/20 rounded-lg p-2 text-amber-400">
                {selectedLinen.in_use} En Uso
              </div>
              <div className="bg-blue-500/20 rounded-lg p-2 text-blue-400">
                {selectedLinen.in_laundry} Lavanderia
              </div>
            </div>

            {/* Action Selection */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">
                Accion
              </label>
              <div className="grid grid-cols-2 gap-2">
                {ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => setSelectedAction(action.key)}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${
                      selectedAction === action.key
                        ? `bg-${action.color}-500 text-white`
                        : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quantity */}
            <div className="mb-4">
              <label className="block text-xs text-slate-400 mb-2">
                Cantidad
              </label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-10 h-10 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  -
                </button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                  }
                  className="flex-1 h-10 bg-slate-700 border border-slate-600 rounded-lg text-center font-medium"
                  min="1"
                />
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="w-10 h-10 bg-slate-700 rounded-lg hover:bg-slate-600"
                >
                  +
                </button>
              </div>
            </div>

            {/* Villa Selection (for to_use action) */}
            {selectedAction === "to_use" && (
              <div className="mb-4">
                <label className="block text-xs text-slate-400 mb-2">
                  Villa
                </label>
                <select
                  value={selectedVilla}
                  onChange={(e) => setSelectedVilla(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg"
                >
                  <option value="">Seleccionar villa</option>
                  {VILLAS.map((villa) => (
                    <option key={villa} value={villa}>
                      {villa.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-xs text-slate-400 mb-2">
                Notas (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej: Toalla danada"
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg"
              />
            </div>

            {/* Submit */}
            <button
              onClick={handleLogMovement}
              disabled={saving || !selectedAction}
              className="w-full py-4 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Registrar Movimiento"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
