"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

// ============================================
// TVC EOD Closing - Issue #28
// End-of-day reconciliation with inventory count
// ============================================

interface HighValueItem {
  id: string;
  name: string;
  name_es: string;
  unit: string;
  category: string;
  cost_per_unit: number;
  current_stock: number;
  expected_count: number;
  actual_count: number | null;
}

interface DaySummary {
  revenue: number;
  wasteTotal: number;
  staffMealsTotal: number;
  ordersCount: number;
  guestOrders: number;
  staffOrders: number;
  compOrders: number;
}

interface ExistingReconciliation {
  id: string;
  date: string;
  status: string;
  closed_at: string;
  total_variance_cost: number;
}

type Shift = "day" | "night";

// High-value categories to count
const HIGH_VALUE_CATEGORIES = ["protein", "alcohol"];

export default function StaffClosingPage() {
  const { t, lang } = useLanguage();

  // State
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // Form state
  const [shift, setShift] = useState<Shift>("night");
  const [highValueItems, setHighValueItems] = useState<HighValueItem[]>([]);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");

  // Summary state
  const [daySummary, setDaySummary] = useState<DaySummary>({
    revenue: 0,
    wasteTotal: 0,
    staffMealsTotal: 0,
    ordersCount: 0,
    guestOrders: 0,
    staffOrders: 0,
    compOrders: 0,
  });

  // Existing reconciliation check
  const [existingReconciliation, setExistingReconciliation] =
    useState<ExistingReconciliation | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    // Check for existing reconciliation today
    const { data: existing } = await supabase
      .from("eod_reconciliations")
      .select("id, date, status, closed_at, total_variance_cost")
      .eq("date", today)
      .single();

    if (existing) {
      setExistingReconciliation(existing);
    }

    // Load high-value ingredients
    const { data: ingredientsData } = await supabase
      .from("ingredients")
      .select("id, name, name_es, unit, category, cost_per_unit, current_stock")
      .eq("is_active", true)
      .in("category", HIGH_VALUE_CATEGORIES)
      .order("category")
      .order("name_es");

    if (ingredientsData) {
      const itemsWithExpected = ingredientsData.map((ing) => ({
        ...ing,
        expected_count: ing.current_stock || 0,
        actual_count: null,
      }));
      setHighValueItems(itemsWithExpected);

      // Initialize counts with empty values
      const initialCounts: Record<string, string> = {};
      ingredientsData.forEach((ing) => {
        initialCounts[ing.id] = "";
      });
      setCounts(initialCounts);
    }

    // Load today's summary data
    const { data: ordersData } = await supabase
      .from("order_logs")
      .select("total_price, order_category, is_staff_meal, is_comp")
      .eq("order_date", today);

    if (ordersData) {
      const revenue = ordersData
        .filter((o) => !o.is_staff_meal && !o.is_comp)
        .reduce((sum, o) => sum + (o.total_price || 0), 0);

      const staffMeals = ordersData.filter(
        (o) => o.is_staff_meal || o.order_category === "staff",
      );
      const staffMealsTotal = staffMeals.reduce(
        (sum, o) => sum + (o.total_price || 0) * 0.35,
        0,
      ); // Estimate 35% food cost

      const guestOrders = ordersData.filter(
        (o) =>
          !o.is_staff_meal &&
          !o.is_comp &&
          (o.order_category === "guest" || !o.order_category),
      ).length;

      setDaySummary({
        revenue,
        wasteTotal: 0, // Will be loaded separately
        staffMealsTotal,
        ordersCount: ordersData.length,
        guestOrders,
        staffOrders: staffMeals.length,
        compOrders: ordersData.filter((o) => o.is_comp && !o.is_staff_meal)
          .length,
      });
    }

    // Load today's waste
    const { data: wasteData } = await supabase
      .from("waste_logs")
      .select("cost")
      .gte("logged_at", `${today}T00:00:00`);

    if (wasteData) {
      const wasteTotal = wasteData.reduce((sum, w) => sum + (w.cost || 0), 0);
      setDaySummary((prev) => ({ ...prev, wasteTotal }));
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle count change
  const handleCountChange = (itemId: string, value: string) => {
    setCounts((prev) => ({ ...prev, [itemId]: value }));
  };

  // Calculate variances
  const getVariances = () => {
    const items: {
      id: string;
      name: string;
      expected: number;
      actual: number;
      variance: number;
      varianceCost: number;
      unit: string;
    }[] = [];

    highValueItems.forEach((item) => {
      const actualStr = counts[item.id];
      if (actualStr !== "" && actualStr !== undefined) {
        const actual = parseFloat(actualStr);
        const variance = actual - item.expected_count;
        const varianceCost = variance * item.cost_per_unit;

        items.push({
          id: item.id,
          name: lang === "es" ? item.name_es : item.name,
          expected: item.expected_count,
          actual,
          variance,
          varianceCost,
          unit: item.unit,
        });
      }
    });

    return items;
  };

  const variances = getVariances();
  const totalVarianceCost = variances.reduce(
    (sum, v) => sum + v.varianceCost,
    0,
  );
  const itemsWithDiscrepancy = variances.filter((v) => v.variance !== 0).length;

  // Submit EOD reconciliation
  const handleSubmit = async () => {
    if (existingReconciliation) {
      alert(t("closing.already_closed"));
      return;
    }

    // Validate that at least some items have been counted
    const countedItems = Object.entries(counts).filter(
      ([, v]) => v !== "" && v !== undefined,
    );
    if (countedItems.length === 0) {
      alert("Debes contar al menos un item");
      return;
    }

    setSubmitting(true);

    try {
      const supabase = createBrowserClient();

      // Get current user
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

      const today = new Date().toISOString().split("T")[0];

      // Prepare items JSON
      const itemsJson = variances.map((v) => ({
        ingredient_id: v.id,
        ingredient_name: v.name,
        expected: v.expected,
        actual: v.actual,
        variance: v.variance,
        variance_cost: v.varianceCost,
        unit: v.unit,
      }));

      // Insert reconciliation
      const { error } = await supabase.from("eod_reconciliations").insert({
        date: today,
        closed_by: closedBy,
        shift: shift,
        items: itemsJson,
        total_items_checked: countedItems.length,
        items_with_discrepancy: itemsWithDiscrepancy,
        total_variance_cost: totalVarianceCost,
        expected_revenue: daySummary.revenue,
        actual_revenue: daySummary.revenue, // Actual from POS
        waste_total: daySummary.wasteTotal,
        staff_meals_total: daySummary.staffMealsTotal,
        status: itemsWithDiscrepancy > 0 ? "flagged" : "complete",
        notes: notes || null,
      });

      if (error) {
        console.error("[Closing] Error:", error);
        alert("Error al cerrar el dia");
        return;
      }

      // Update ingredient stock levels
      for (const [ingredientId, countStr] of Object.entries(counts)) {
        if (countStr !== "" && countStr !== undefined) {
          const newStock = parseFloat(countStr);
          await supabase
            .from("ingredients")
            .update({ current_stock: newStock })
            .eq("id", ingredientId);
        }
      }

      setSuccess(true);
      await loadData();

      setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error("[Closing] Error:", error);
      alert("Error al procesar cierre");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  // Show completed state if already closed
  if (existingReconciliation) {
    return (
      <div className="space-y-4 pb-20">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🔒</span> {t("closing.title")}
          </h1>
          <p className="text-xs text-slate-400">{t("closing.subtitle")}</p>
        </div>

        <div className="bg-emerald-500/20 border border-emerald-500/40 rounded-xl p-6 text-center">
          <div className="text-4xl mb-3">✅</div>
          <div className="text-lg font-bold text-emerald-400 mb-2">
            {t("closing.success")}
          </div>
          <div className="text-sm text-slate-400">
            Cerrado:{" "}
            {new Date(existingReconciliation.closed_at).toLocaleTimeString()}
          </div>
          {existingReconciliation.total_variance_cost !== 0 && (
            <div className="mt-3 text-sm">
              <span
                className={
                  existingReconciliation.total_variance_cost < 0
                    ? "text-red-400"
                    : "text-emerald-400"
                }
              >
                Varianza: $
                {existingReconciliation.total_variance_cost.toLocaleString()}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-20">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🌙</span> {t("closing.title")}
        </h1>
        <p className="text-xs text-slate-400">{t("closing.subtitle")}</p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm font-medium">
          {t("closing.success")}
        </div>
      )}

      {/* Day Summary */}
      <div className="bg-slate-800 rounded-xl p-4">
        <h2 className="text-sm font-bold text-slate-400 uppercase mb-3">
          {t("closing.summary")}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400">{t("closing.revenue")}</div>
            <div className="text-xl font-bold text-emerald-400">
              ${daySummary.revenue.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">
              {daySummary.guestOrders} pedidos
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400">
              {t("closing.waste_cost")}
            </div>
            <div className="text-xl font-bold text-red-400">
              -${daySummary.wasteTotal.toLocaleString()}
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400">
              {t("closing.staff_meals")}
            </div>
            <div className="text-xl font-bold text-orange-400">
              ${daySummary.staffMealsTotal.toLocaleString()}
            </div>
            <div className="text-[10px] text-slate-500">
              {daySummary.staffOrders} comidas
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3">
            <div className="text-xs text-slate-400">Neto Estimado</div>
            <div
              className={`text-xl font-bold ${
                daySummary.revenue -
                  daySummary.wasteTotal -
                  daySummary.staffMealsTotal >
                0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              $
              {(
                daySummary.revenue -
                daySummary.wasteTotal -
                daySummary.staffMealsTotal
              ).toLocaleString()}
            </div>
          </div>
        </div>
      </div>

      {/* Shift Selection */}
      <div className="bg-slate-800 rounded-xl p-4">
        <label className="text-xs text-slate-400 uppercase font-medium">
          {t("closing.shift")}
        </label>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setShift("day")}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              shift === "day"
                ? "bg-yellow-500 text-slate-900"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            ☀️ {t("closing.shift.day")}
          </button>
          <button
            onClick={() => setShift("night")}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              shift === "night"
                ? "bg-indigo-500 text-white"
                : "bg-slate-700 text-slate-400"
            }`}
          >
            🌙 {t("closing.shift.night")}
          </button>
        </div>
      </div>

      {/* High-Value Items Count */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-400 uppercase">
            {t("closing.high_value_items")}
          </h2>
          {itemsWithDiscrepancy > 0 && (
            <span className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded-full">
              {itemsWithDiscrepancy} discrepancia(s)
            </span>
          )}
        </div>

        <div className="space-y-3">
          {/* Header Row */}
          <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 uppercase px-2">
            <div className="col-span-5">Item</div>
            <div className="col-span-2 text-center">
              {t("closing.expected")}
            </div>
            <div className="col-span-3 text-center">{t("closing.actual")}</div>
            <div className="col-span-2 text-center">
              {t("closing.variance")}
            </div>
          </div>

          {/* Items */}
          {highValueItems.map((item) => {
            const actualStr = counts[item.id];
            const actual =
              actualStr !== "" && actualStr !== undefined
                ? parseFloat(actualStr)
                : null;
            const variance =
              actual !== null ? actual - item.expected_count : null;
            const hasVariance = variance !== null && variance !== 0;

            return (
              <div
                key={item.id}
                className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg ${
                  hasVariance
                    ? variance! < 0
                      ? "bg-red-500/10 border border-red-500/30"
                      : "bg-emerald-500/10 border border-emerald-500/30"
                    : "bg-slate-700/30"
                }`}
              >
                <div className="col-span-5">
                  <div className="text-sm font-medium truncate">
                    {lang === "es" ? item.name_es : item.name}
                  </div>
                  <div className="text-[10px] text-slate-500">{item.unit}</div>
                </div>
                <div className="col-span-2 text-center text-sm text-slate-400">
                  {item.expected_count}
                </div>
                <div className="col-span-3">
                  <input
                    type="number"
                    value={counts[item.id] || ""}
                    onChange={(e) => handleCountChange(item.id, e.target.value)}
                    placeholder="—"
                    className="w-full bg-slate-700 rounded px-2 py-1.5 text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    min="0"
                    step="0.5"
                  />
                </div>
                <div className="col-span-2 text-center">
                  {variance !== null ? (
                    <span
                      className={`text-sm font-bold ${
                        variance < 0
                          ? "text-red-400"
                          : variance > 0
                            ? "text-emerald-400"
                            : "text-slate-400"
                      }`}
                    >
                      {variance > 0 ? "+" : ""}
                      {variance}
                    </span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Variance Summary */}
        {variances.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-400">Varianza Total</span>
              <span
                className={`text-lg font-bold ${
                  totalVarianceCost < 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                ${totalVarianceCost.toLocaleString()}
              </span>
            </div>
            {itemsWithDiscrepancy > 0 && (
              <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                <div className="text-xs text-amber-400">
                  ⚠️ {t("closing.discrepancy_alert")}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="bg-slate-800 rounded-xl p-4">
        <label className="text-xs text-slate-400 uppercase font-medium">
          {t("closing.notes")}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Observaciones del cierre..."
          className="w-full mt-2 bg-slate-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
          rows={3}
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="w-full py-4 bg-indigo-500 text-white rounded-xl font-bold text-lg hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Procesando..." : t("closing.submit")}
      </button>
    </div>
  );
}
