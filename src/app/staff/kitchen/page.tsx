"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// ============================================
// TVC Kitchen Management
// Waste Tracking, EOD Reconciliation, Bottle Inventory
// ============================================

type Ingredient = Tables<"ingredients">;

interface WasteLog {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  reason: string;
  notes: string | null;
  logged_at: string;
  ingredient?: Ingredient;
}

interface BottleEvent {
  id: string;
  ingredient_id: string;
  event_type: "opened" | "finished" | "counted";
  quantity: number;
  notes: string | null;
  created_at: string;
}

interface MenuItem {
  id: string;
  name_es: string;
  category: string;
  pours_per_bottle: number | null;
  linked_ingredient_id: string | null;
}

const WASTE_REASONS = [
  { key: "spoiled", label: "Echado a perder", icon: "🦠" },
  { key: "overprepped", label: "Sobrepreparado", icon: "📦" },
  { key: "returned", label: "Devuelto", icon: "↩️" },
  { key: "expired", label: "Expirado", icon: "📅" },
  { key: "dropped", label: "Caido/Derramado", icon: "💧" },
  { key: "other", label: "Otro", icon: "❓" },
];

export default function StaffKitchenPage() {
  const [activeTab, setActiveTab] = useState<"waste" | "bottles" | "eod">(
    "waste",
  );
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [bottleItems, setBottleItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Waste tracking state
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [wasteQuantity, setWasteQuantity] = useState("");
  const [wasteReason, setWasteReason] = useState<string>("spoiled");
  const [wasteNotes, setWasteNotes] = useState("");
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteCategory, setWasteCategory] = useState<string>("all");
  const [recentWaste, setRecentWaste] = useState<WasteLog[]>([]);

  // Bottle tracking state
  const [selectedBottleItem, setSelectedBottleItem] = useState<MenuItem | null>(
    null,
  );
  const [showBottleModal, setShowBottleModal] = useState(false);
  const [recentBottles, setRecentBottles] = useState<BottleEvent[]>([]);

  // EOD state
  const [eodItems, setEodItems] = useState<
    Array<{
      ingredient: Ingredient;
      expected: number;
      actual: string;
    }>
  >([]);
  const [eodNotes, setEodNotes] = useState("");

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    // Load ingredients
    const { data: ingredientData } = await supabase
      .from("ingredients")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (ingredientData) {
      setIngredients(ingredientData);

      // Initialize EOD items with high-value items (proteins, alcohol)
      const highValueItems = ingredientData.filter(
        (i) =>
          i.category === "protein" ||
          i.category === "alcohol" ||
          (i.cost_per_unit && i.cost_per_unit > 10000),
      );
      setEodItems(
        highValueItems.map((ingredient) => ({
          ingredient,
          expected: ingredient.current_stock || 0,
          actual: (ingredient.current_stock || 0).toString(),
        })),
      );
    }

    // Load bottle-linked menu items
    const { data: menuData } = await supabase
      .from("menu_items")
      .select("id, name_es, category, pours_per_bottle, linked_ingredient_id")
      .not("linked_ingredient_id", "is", null)
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (menuData) {
      setBottleItems(menuData);
    }

    // Load recent waste logs (today)
    const today = new Date().toISOString().split("T")[0];
    const { data: wasteData } = await supabase
      .from("waste_logs")
      .select("*, ingredient:ingredients(*)")
      .gte("logged_at", today)
      .order("logged_at", { ascending: false })
      .limit(10);

    if (wasteData) {
      setRecentWaste(wasteData as WasteLog[]);
    }

    // Load recent bottle events (today)
    const { data: bottleData } = await supabase
      .from("bottle_events")
      .select("*")
      .gte("created_at", today)
      .order("created_at", { ascending: false })
      .limit(10);

    if (bottleData) {
      setRecentBottles(bottleData as BottleEvent[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Submit waste log
  const submitWaste = async () => {
    if (
      !selectedIngredient ||
      !wasteQuantity ||
      parseFloat(wasteQuantity) <= 0
    ) {
      alert("Selecciona un ingrediente y cantidad");
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let loggedBy: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        loggedBy = profile?.id || null;
      }

      if (!loggedBy) {
        alert("Error: usuario no encontrado");
        return;
      }

      const { error } = await supabase.from("waste_logs").insert({
        ingredient_id: selectedIngredient.id,
        quantity: parseFloat(wasteQuantity),
        unit: selectedIngredient.unit,
        reason: wasteReason,
        notes: wasteNotes || null,
        logged_by: loggedBy,
      });

      if (error) {
        console.error("[Kitchen] Error logging waste:", error);
        alert("Error al registrar desperdicio");
        return;
      }

      // Update ingredient stock
      const newStock =
        (selectedIngredient.current_stock || 0) - parseFloat(wasteQuantity);
      await supabase
        .from("ingredients")
        .update({ current_stock: Math.max(0, newStock) })
        .eq("id", selectedIngredient.id);

      setSuccess(true);
      setShowWasteModal(false);
      setSelectedIngredient(null);
      setWasteQuantity("");
      setWasteNotes("");
      await loadData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Kitchen] Error:", error);
      alert("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit bottle opening
  const submitBottleOpening = async (
    ingredient_id: string,
    quantity: number = 1,
  ) => {
    setSubmitting(true);
    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let openedBy: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        openedBy = profile?.id || null;
      }

      const { error } = await supabase.from("bottle_events").insert({
        ingredient_id,
        event_type: "opened",
        quantity,
        opened_by: openedBy,
      });

      if (error) {
        console.error("[Kitchen] Error logging bottle:", error);
        alert("Error al registrar botella");
        return;
      }

      setSuccess(true);
      setShowBottleModal(false);
      setSelectedBottleItem(null);
      await loadData();
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Kitchen] Error:", error);
      alert("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  // Submit EOD reconciliation
  const submitEOD = async () => {
    setSubmitting(true);
    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let closedBy: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        closedBy = profile?.id || null;
      }

      if (!closedBy) {
        alert("Error: usuario no encontrado");
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      // Calculate discrepancies
      const items = eodItems.map((item) => ({
        ingredient_id: item.ingredient.id,
        ingredient_name: item.ingredient.name_es,
        expected: item.expected,
        actual: parseFloat(item.actual) || 0,
        variance: (parseFloat(item.actual) || 0) - item.expected,
        unit: item.ingredient.unit,
        cost_per_unit: item.ingredient.cost_per_unit,
      }));

      const itemsWithDiscrepancy = items.filter((i) => i.variance !== 0);
      const totalVarianceCost = itemsWithDiscrepancy.reduce(
        (sum, i) => sum + Math.abs(i.variance) * i.cost_per_unit,
        0,
      );

      const { error } = await supabase.from("eod_reconciliations").upsert(
        {
          date: today,
          closed_by: closedBy,
          items: items,
          total_items_checked: items.length,
          items_with_discrepancy: itemsWithDiscrepancy.length,
          total_variance_cost: totalVarianceCost,
          notes: eodNotes || null,
          status: "pending",
        },
        { onConflict: "date" },
      );

      if (error) {
        console.error("[Kitchen] Error saving EOD:", error);
        alert("Error al cerrar cocina");
        return;
      }

      // Update ingredient stock levels
      for (const item of items) {
        await supabase
          .from("ingredients")
          .update({ current_stock: item.actual })
          .eq("id", item.ingredient_id);
      }

      setSuccess(true);
      setEodNotes("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Kitchen] Error:", error);
      alert("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { key: "all", label: "Todos" },
    { key: "protein", label: "Proteinas" },
    { key: "produce", label: "Vegetales" },
    { key: "dairy", label: "Lacteos" },
    { key: "dry_goods", label: "Secos" },
    { key: "beverages", label: "Bebidas" },
    { key: "alcohol", label: "Alcohol" },
  ];

  const filteredIngredients =
    wasteCategory === "all"
      ? ingredients
      : ingredients.filter((i) => i.category === wasteCategory);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">👨‍🍳</span> Cocina
        </h1>
        <p className="text-xs text-slate-400">
          Desperdicios, botellas, cierre de cocina
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          Guardado exitosamente
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("waste")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "waste"
              ? "bg-red-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Desperdicios
        </button>
        <button
          onClick={() => setActiveTab("bottles")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "bottles"
              ? "bg-purple-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Botellas
        </button>
        <button
          onClick={() => setActiveTab("eod")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "eod"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Cierre
        </button>
      </div>

      {/* Waste Tracking Tab */}
      {activeTab === "waste" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowWasteModal(true)}
            className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2"
          >
            <span className="text-2xl">🗑️</span> Registrar Desperdicio
          </button>

          {/* Recent Waste */}
          {recentWaste.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                Desperdicios de Hoy
              </div>
              <div className="space-y-2">
                {recentWaste.map((waste) => (
                  <div
                    key={waste.id}
                    className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm">
                        {waste.ingredient?.name_es || "Ingrediente"}
                      </div>
                      <div className="text-xs text-slate-400">
                        {waste.quantity} {waste.unit} -{" "}
                        {
                          WASTE_REASONS.find((r) => r.key === waste.reason)
                            ?.label
                        }
                      </div>
                    </div>
                    <div className="text-red-400 font-bold text-sm">
                      -$
                      {(
                        waste.quantity * (waste.ingredient?.cost_per_unit || 0)
                      ).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weekly Summary Placeholder */}
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-400">
              El costo de desperdicios semanal se muestra en el dashboard de
              reportes.
            </div>
          </div>
        </div>
      )}

      {/* Bottles Tab */}
      {activeTab === "bottles" && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-500/20 border border-purple-500/30 rounded-lg text-purple-400 text-xs">
            Registra cuando abres una botella para rastrear el rendimiento
            (pours vs ventas).
          </div>

          {/* Bottle Items Grid */}
          <div className="grid grid-cols-2 gap-2">
            {bottleItems.map((item) => {
              const ingredient = ingredients.find(
                (i) => i.id === item.linked_ingredient_id,
              );
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedBottleItem(item);
                    setShowBottleModal(true);
                  }}
                  className="bg-slate-800 rounded-xl p-3 text-left hover:bg-purple-500/20 border border-transparent hover:border-purple-500/30 transition-colors"
                >
                  <div className="font-medium text-sm truncate">
                    {item.name_es}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {item.pours_per_bottle} pours/botella
                  </div>
                  {ingredient && (
                    <div className="text-xs text-purple-400 mt-1">
                      Stock: {ingredient.current_stock} {ingredient.unit}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {bottleItems.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No hay items con botellas configuradas
            </div>
          )}

          {/* Recent Bottle Events */}
          {recentBottles.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">
                Botellas Abiertas Hoy
              </div>
              <div className="space-y-2">
                {recentBottles.map((event) => {
                  const ingredient = ingredients.find(
                    (i) => i.id === event.ingredient_id,
                  );
                  return (
                    <div
                      key={event.id}
                      className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-medium text-sm">
                          {ingredient?.name_es || "Botella"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {new Date(event.created_at).toLocaleTimeString(
                            "es-CO",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                            },
                          )}
                        </div>
                      </div>
                      <div className="text-purple-400 font-bold">
                        x{event.quantity}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* EOD Reconciliation Tab */}
      {activeTab === "eod" && (
        <div className="space-y-4">
          <div className="p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 text-xs">
            Cierre de cocina: verifica el stock de items de alto valor.
          </div>

          {/* EOD Items */}
          <div className="space-y-2">
            {eodItems.map((item, index) => {
              const variance = (parseFloat(item.actual) || 0) - item.expected;
              const hasVariance = Math.abs(variance) > 0.01;

              return (
                <div
                  key={item.ingredient.id}
                  className={`bg-slate-800 rounded-lg p-3 ${
                    hasVariance ? "border border-amber-500/30" : ""
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="font-medium text-sm">
                        {item.ingredient.name_es}
                      </div>
                      <div className="text-xs text-slate-400">
                        Esperado: {item.expected} {item.ingredient.unit}
                      </div>
                    </div>
                    {hasVariance && (
                      <div
                        className={`text-xs font-bold ${variance > 0 ? "text-emerald-400" : "text-red-400"}`}
                      >
                        {variance > 0 ? "+" : ""}
                        {variance.toFixed(1)}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        const newItems = [...eodItems];
                        newItems[index].actual = Math.max(
                          0,
                          parseFloat(item.actual) - 1,
                        ).toString();
                        setEodItems(newItems);
                      }}
                      className="w-10 h-10 bg-slate-700 rounded-lg text-lg"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      value={item.actual}
                      onChange={(e) => {
                        const newItems = [...eodItems];
                        newItems[index].actual = e.target.value;
                        setEodItems(newItems);
                      }}
                      className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-center"
                      step="0.1"
                    />
                    <button
                      onClick={() => {
                        const newItems = [...eodItems];
                        newItems[index].actual = (
                          parseFloat(item.actual) + 1
                        ).toString();
                        setEodItems(newItems);
                      }}
                      className="w-10 h-10 bg-slate-700 rounded-lg text-lg"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {eodItems.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              No hay items de alto valor para verificar
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs text-slate-400">Notas (opcional):</label>
            <textarea
              value={eodNotes}
              onChange={(e) => setEodNotes(e.target.value)}
              placeholder="Observaciones del cierre..."
              className="w-full bg-slate-800 rounded-lg p-3 mt-1 text-sm resize-none"
              rows={2}
            />
          </div>

          {/* Submit EOD */}
          <button
            onClick={submitEOD}
            disabled={submitting || eodItems.length === 0}
            className="w-full py-4 bg-cyan-500 text-white rounded-xl font-bold text-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
          >
            {submitting ? "Guardando..." : "Cerrar Cocina"}
          </button>
        </div>
      )}

      {/* Waste Modal */}
      {showWasteModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowWasteModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold mb-4">Registrar Desperdicio</div>

            {/* Category Filter */}
            <div className="flex gap-2 overflow-x-auto pb-2 mb-4">
              {categories.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setWasteCategory(cat.key)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${
                    wasteCategory === cat.key
                      ? "bg-red-500 text-white"
                      : "bg-slate-700 text-slate-400"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Ingredient Selection */}
            {!selectedIngredient ? (
              <div className="max-h-48 overflow-y-auto space-y-1 mb-4">
                {filteredIngredients.map((ingredient) => (
                  <button
                    key={ingredient.id}
                    onClick={() => setSelectedIngredient(ingredient)}
                    className="w-full text-left p-2 bg-slate-700 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    <div className="font-medium text-sm">
                      {ingredient.name_es}
                    </div>
                    <div className="text-xs text-slate-400">
                      Stock: {ingredient.current_stock} {ingredient.unit}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Selected Ingredient */}
                <div className="bg-slate-700 rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-bold">
                        {selectedIngredient.name_es}
                      </div>
                      <div className="text-xs text-slate-400">
                        Stock: {selectedIngredient.current_stock}{" "}
                        {selectedIngredient.unit}
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedIngredient(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cambiar
                    </button>
                  </div>
                </div>

                {/* Quantity */}
                <div>
                  <label className="text-xs text-slate-400">
                    Cantidad ({selectedIngredient.unit}):
                  </label>
                  <input
                    type="number"
                    value={wasteQuantity}
                    onChange={(e) => setWasteQuantity(e.target.value)}
                    placeholder="0"
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1"
                    step="0.1"
                    min="0"
                    max={selectedIngredient.current_stock || undefined}
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="text-xs text-slate-400">Razon:</label>
                  <div className="grid grid-cols-2 gap-2 mt-1">
                    {WASTE_REASONS.map((reason) => (
                      <button
                        key={reason.key}
                        onClick={() => setWasteReason(reason.key)}
                        className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                          wasteReason === reason.key
                            ? "bg-red-500 text-white"
                            : "bg-slate-700 text-slate-400"
                        }`}
                      >
                        <span>{reason.icon}</span>
                        {reason.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-400">
                    Notas (opcional):
                  </label>
                  <input
                    type="text"
                    value={wasteNotes}
                    onChange={(e) => setWasteNotes(e.target.value)}
                    placeholder="Detalles adicionales..."
                    className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1"
                  />
                </div>

                {/* Submit */}
                <button
                  onClick={submitWaste}
                  disabled={submitting || !wasteQuantity}
                  className="w-full py-3 bg-red-500 text-white rounded-lg font-bold disabled:opacity-50"
                >
                  {submitting ? "Guardando..." : "Registrar Desperdicio"}
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowWasteModal(false);
                setSelectedIngredient(null);
                setWasteQuantity("");
                setWasteNotes("");
              }}
              className="w-full mt-4 py-2 bg-slate-700 text-slate-400 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Bottle Modal */}
      {showBottleModal && selectedBottleItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowBottleModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-2xl mb-2">🍾</div>
              <div className="text-lg font-bold">
                {selectedBottleItem.name_es}
              </div>
              <div className="text-sm text-slate-400">
                {selectedBottleItem.pours_per_bottle} pours por botella
              </div>
            </div>

            <div className="text-sm text-slate-400 text-center mb-4">
              Cuantas botellas abriste?
            </div>

            {/* Quick quantity buttons */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              {[1, 2, 3].map((qty) => (
                <button
                  key={qty}
                  onClick={() => {
                    if (selectedBottleItem.linked_ingredient_id) {
                      submitBottleOpening(
                        selectedBottleItem.linked_ingredient_id,
                        qty,
                      );
                    }
                  }}
                  disabled={submitting}
                  className="py-4 bg-purple-500 hover:bg-purple-600 rounded-xl text-xl font-black transition-colors disabled:opacity-50"
                >
                  {qty}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowBottleModal(false)}
              className="w-full py-2 bg-slate-700 text-slate-400 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
