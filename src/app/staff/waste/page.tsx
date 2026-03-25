"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import PhotoUpload from "@/components/ui/PhotoUpload";

// ============================================
// TVC Staff Waste Logging - Issue #27
// Log wasted items with reason, quantity, photo
// ============================================

interface Ingredient {
  id: string;
  name: string;
  name_es: string;
  unit: string;
  category: string;
  cost_per_unit: number;
}

interface WasteLog {
  id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  reason: WasteReason;
  cost: number;
  notes: string | null;
  photo_url: string | null;
  logged_at: string;
  ingredient?: Ingredient;
}

type WasteReason =
  | "spoiled"
  | "overprepped"
  | "returned"
  | "expired"
  | "dropped"
  | "other";

const WASTE_REASONS: WasteReason[] = [
  "spoiled",
  "overprepped",
  "returned",
  "expired",
  "dropped",
  "other",
];

const REASON_ICONS: Record<WasteReason, string> = {
  spoiled: "🦠",
  overprepped: "📦",
  returned: "↩️",
  expired: "📅",
  dropped: "💥",
  other: "❓",
};

// Category labels
const CATEGORIES = [
  { key: "all", label: "Todos" },
  { key: "protein", label: "Proteinas" },
  { key: "produce", label: "Vegetales" },
  { key: "dairy", label: "Lacteos" },
  { key: "dry_goods", label: "Secos" },
  { key: "beverages", label: "Bebidas" },
  { key: "alcohol", label: "Alcohol" },
];

export default function StaffWastePage() {
  const { t, lang } = useLanguage();

  // State
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recentLogs, setRecentLogs] = useState<WasteLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [selectedIngredient, setSelectedIngredient] =
    useState<Ingredient | null>(null);
  const [quantity, setQuantity] = useState<string>("1");
  const [reason, setReason] = useState<WasteReason>("spoiled");
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoPath, setPhotoPath] = useState<string | null>(null);

  // Filter state
  const [activeCategory, setActiveCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showIngredientPicker, setShowIngredientPicker] = useState(false);

  // Today's waste total
  const [todayTotal, setTodayTotal] = useState(0);

  // Load ingredients and recent waste logs
  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    // Load ingredients
    const { data: ingredientsData } = await supabase
      .from("ingredients")
      .select("id, name, name_es, unit, category, cost_per_unit")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (ingredientsData) {
      setIngredients(ingredientsData);
    }

    // Load today's waste logs
    const today = new Date().toISOString().split("T")[0];
    const { data: logsData } = await supabase
      .from("waste_logs")
      .select(
        `
        id, ingredient_id, quantity, unit, reason, cost, notes, photo_url, logged_at,
        ingredient:ingredients(id, name, name_es, unit, category, cost_per_unit)
      `,
      )
      .gte("logged_at", `${today}T00:00:00`)
      .order("logged_at", { ascending: false })
      .limit(10);

    if (logsData) {
      // Transform the nested ingredient data
      const transformedLogs = logsData.map((log) => ({
        ...log,
        ingredient: Array.isArray(log.ingredient)
          ? log.ingredient[0]
          : log.ingredient,
      }));
      setRecentLogs(transformedLogs as WasteLog[]);

      // Calculate today's total
      const total = logsData.reduce((sum, log) => sum + (log.cost || 0), 0);
      setTodayTotal(total);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Filter ingredients
  const filteredIngredients = ingredients.filter((ing) => {
    const matchesCategory =
      activeCategory === "all" || ing.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      ing.name_es.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ing.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Handle photo upload
  const handlePhotoComplete = (url: string, path: string) => {
    setPhotoUrl(url);
    setPhotoPath(path);
  };

  // Submit waste log
  const handleSubmit = async () => {
    if (!selectedIngredient) {
      alert(t("waste.select_ingredient"));
      return;
    }

    if (!photoUrl) {
      alert(t("waste.no_photo"));
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      alert("Cantidad invalida");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createBrowserClient();

      // Get current user
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

      // Calculate cost
      const cost = qty * selectedIngredient.cost_per_unit;

      // Insert waste log
      const { error } = await supabase.from("waste_logs").insert({
        ingredient_id: selectedIngredient.id,
        quantity: qty,
        unit: selectedIngredient.unit,
        reason: reason,
        cost: cost,
        notes: notes || null,
        photo_url: photoUrl,
        logged_by: loggedBy,
      });

      if (error) {
        console.error("[Waste] Error:", error);
        alert("Error al registrar desperdicio");
        return;
      }

      // Success - reset form and reload
      setSuccess(true);
      setSelectedIngredient(null);
      setQuantity("1");
      setReason("spoiled");
      setNotes("");
      setPhotoUrl(null);
      setPhotoPath(null);

      await loadData();

      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Waste] Error:", error);
      alert("Error al procesar");
    } finally {
      setSubmitting(false);
    }
  };

  // Get reason label
  const getReasonLabel = (r: WasteReason) => {
    return t(`waste.reason.${r}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🗑️</span> {t("waste.title")}
        </h1>
        <p className="text-xs text-slate-400">{t("waste.subtitle")}</p>
      </div>

      {/* Today's Total */}
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-red-400 uppercase font-medium">
              {t("waste.today_total")}
            </div>
            <div className="text-2xl font-bold text-red-500">
              ${todayTotal.toLocaleString()}
            </div>
          </div>
          <div className="text-4xl opacity-50">📉</div>
        </div>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm font-medium">
          {t("waste.success")}
        </div>
      )}

      {/* Waste Form */}
      <div className="bg-slate-800 rounded-xl p-4 space-y-4">
        {/* Ingredient Selection */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-medium">
            {t("waste.select_ingredient")}
          </label>
          <button
            onClick={() => setShowIngredientPicker(true)}
            className="w-full mt-1 p-3 bg-slate-700 rounded-lg text-left hover:bg-slate-600 transition-colors"
          >
            {selectedIngredient ? (
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {lang === "es"
                    ? selectedIngredient.name_es
                    : selectedIngredient.name}
                </span>
                <span className="text-xs text-slate-400">
                  ${selectedIngredient.cost_per_unit.toLocaleString()}/
                  {selectedIngredient.unit}
                </span>
              </div>
            ) : (
              <span className="text-slate-400">
                Toca para seleccionar ingrediente...
              </span>
            )}
          </button>
        </div>

        {/* Quantity */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-medium">
            {t("waste.quantity")}
            {selectedIngredient && (
              <span className="text-cyan-400 ml-1">
                ({selectedIngredient.unit})
              </span>
            )}
          </label>
          <div className="flex items-center gap-2 mt-1">
            <button
              onClick={() =>
                setQuantity(
                  Math.max(0.5, parseFloat(quantity) - 0.5).toString(),
                )
              }
              className="w-12 h-12 bg-slate-700 rounded-lg text-xl hover:bg-slate-600"
            >
              -
            </button>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="flex-1 bg-slate-700 rounded-lg px-4 py-3 text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
              min="0.1"
              step="0.1"
            />
            <button
              onClick={() =>
                setQuantity((parseFloat(quantity) + 0.5).toString())
              }
              className="w-12 h-12 bg-slate-700 rounded-lg text-xl hover:bg-slate-600"
            >
              +
            </button>
          </div>
          {selectedIngredient && (
            <div className="text-xs text-red-400 mt-1 text-right">
              Costo: $
              {(
                parseFloat(quantity || "0") * selectedIngredient.cost_per_unit
              ).toLocaleString()}
            </div>
          )}
        </div>

        {/* Reason */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-medium">
            {t("waste.reason")}
          </label>
          <div className="grid grid-cols-3 gap-2 mt-1">
            {WASTE_REASONS.map((r) => (
              <button
                key={r}
                onClick={() => setReason(r)}
                className={`p-3 rounded-lg text-center transition-all ${
                  reason === r
                    ? "bg-red-500 text-white"
                    : "bg-slate-700 text-slate-300 hover:bg-slate-600"
                }`}
              >
                <div className="text-xl mb-1">{REASON_ICONS[r]}</div>
                <div className="text-[10px] font-medium">
                  {getReasonLabel(r)}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Photo Upload */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-medium flex items-center gap-1">
            {t("waste.photo_required")}
            <span className="text-red-500">*</span>
          </label>
          <div className="mt-1">
            <PhotoUpload
              onUploadComplete={handlePhotoComplete}
              onUploadError={(err) =>
                console.error("[Waste] Photo error:", err)
              }
              context="waste"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs text-slate-400 uppercase font-medium">
            {t("waste.notes")}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalles adicionales..."
            className="w-full mt-1 bg-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
            rows={2}
          />
        </div>

        {/* Submit Button */}
        <button
          onClick={handleSubmit}
          disabled={submitting || !selectedIngredient || !photoUrl}
          className="w-full py-4 bg-red-500 text-white rounded-xl font-bold text-lg hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? "Registrando..." : t("waste.submit")}
        </button>
      </div>

      {/* Recent Waste Logs */}
      {recentLogs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-bold text-slate-400 uppercase">
            {t("waste.recent")}
          </h2>
          {recentLogs.map((log) => (
            <div
              key={log.id}
              className="bg-slate-800 rounded-xl p-3 flex items-center gap-3"
            >
              {log.photo_url ? (
                <img
                  src={log.photo_url}
                  alt="Waste"
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center text-2xl">
                  {REASON_ICONS[log.reason as WasteReason]}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {log.ingredient
                    ? lang === "es"
                      ? log.ingredient.name_es
                      : log.ingredient.name
                    : "Ingrediente"}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-2">
                  <span>
                    {log.quantity} {log.unit}
                  </span>
                  <span className="text-red-400">
                    {getReasonLabel(log.reason)}
                  </span>
                </div>
              </div>
              <div className="text-red-400 font-bold">
                -${log.cost?.toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ingredient Picker Modal */}
      {showIngredientPicker && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex flex-col"
          onClick={() => setShowIngredientPicker(false)}
        >
          <div
            className="flex-1 flex flex-col bg-slate-900 rounded-t-2xl mt-12 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-700">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">Seleccionar Ingrediente</h2>
                <button
                  onClick={() => setShowIngredientPicker(false)}
                  className="w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-400"
                >
                  X
                </button>
              </div>

              {/* Search */}
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="w-full bg-slate-800 rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              {/* Category Filter */}
              <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.key}
                    onClick={() => setActiveCategory(cat.key)}
                    className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      activeCategory === cat.key
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ingredients List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {filteredIngredients.map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => {
                    setSelectedIngredient(ing);
                    setShowIngredientPicker(false);
                  }}
                  className="w-full bg-slate-800 rounded-xl p-3 text-left hover:bg-slate-700 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">
                        {lang === "es" ? ing.name_es : ing.name}
                      </div>
                      <div className="text-xs text-slate-400">{ing.unit}</div>
                    </div>
                    <div className="text-cyan-400 font-bold">
                      ${ing.cost_per_unit.toLocaleString()}
                    </div>
                  </div>
                </button>
              ))}

              {filteredIngredients.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No se encontraron ingredientes
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
