"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

// ============================================
// GESTION DE PROMOCIONES - TVC Operations
// Issue #68 - Happy Hour / Promociones
// ============================================

interface Promotion {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  start_time: string | null;
  end_time: string | null;
  days_active: string[];
  start_date: string | null;
  end_date: string | null;
  discount_type: "percentage" | "fixed" | "bogo";
  discount_value: number | null;
  applicable_items: string[];
  applicable_categories: string[];
  is_active: boolean;
  max_uses_per_day: number | null;
  min_purchase_amount: number | null;
  created_at: string | null;
}

interface MenuItem {
  id: string;
  name: string;
  name_es: string;
  category: string;
  price: number;
}

interface PromotionAnalytics {
  id: string;
  name: string;
  name_es: string;
  total_uses: number;
  total_discount_given: number;
  total_revenue_with_promo: number;
  avg_discount_per_use: number;
}

const DAYS_OF_WEEK = [
  { key: "monday", en: "Monday", es: "Lunes" },
  { key: "tuesday", en: "Tuesday", es: "Martes" },
  { key: "wednesday", en: "Wednesday", es: "Miercoles" },
  { key: "thursday", en: "Thursday", es: "Jueves" },
  { key: "friday", en: "Friday", es: "Viernes" },
  { key: "saturday", en: "Saturday", es: "Sabado" },
  { key: "sunday", en: "Sunday", es: "Domingo" },
];

const CATEGORIES = [
  { key: "breakfast", es: "Desayuno", icon: "🍳" },
  { key: "lunch", es: "Almuerzo", icon: "🥗" },
  { key: "dinner", es: "Cena", icon: "🍽️" },
  { key: "cocktail", es: "Cocteles", icon: "🍹" },
  { key: "mocktail", es: "Sin Alcohol", icon: "🥤" },
  { key: "beer", es: "Cerveza", icon: "🍺" },
  { key: "wine", es: "Vino", icon: "🍷" },
  { key: "spirit", es: "Licor", icon: "🥃" },
  { key: "soft_drink", es: "Bebidas", icon: "🧃" },
  { key: "snack", es: "Snacks", icon: "🥜" },
];

const DISCOUNT_TYPES = [
  { key: "percentage", label: "Porcentaje (%)", icon: "%" },
  { key: "fixed", label: "Monto Fijo ($)", icon: "$" },
  { key: "bogo", label: "2x1 (BOGO)", icon: "🎁" },
];

export default function PromotionsPage() {
  const { lang } = useLanguage();
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [analytics, setAnalytics] = useState<PromotionAnalytics[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"active" | "all" | "analytics">(
    "active",
  );
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(
    null,
  );
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState<Partial<Promotion>>({
    name: "",
    name_es: "",
    description: "",
    description_es: "",
    start_time: "",
    end_time: "",
    days_active: [],
    start_date: "",
    end_date: "",
    discount_type: "percentage",
    discount_value: 0,
    applicable_items: [],
    applicable_categories: [],
    is_active: true,
    max_uses_per_day: null,
    min_purchase_amount: null,
  });

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    // Cargar promociones
    const { data: promos, error: promosError } = await supabase
      .from("promotions")
      .select("*")
      .order("created_at", { ascending: false });

    if (promosError) {
      console.error("[Promotions] Error loading:", promosError);
    } else {
      setPromotions(promos || []);
    }

    // Cargar items del menu
    const { data: items } = await supabase
      .from("menu_items")
      .select("id, name, name_es, category, price")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (items) {
      setMenuItems(items);
    }

    // Cargar analytics
    const { data: analyticsData } = await supabase
      .from("promotion_analytics")
      .select("*");

    if (analyticsData) {
      setAnalytics(analyticsData);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const resetForm = () => {
    setFormData({
      name: "",
      name_es: "",
      description: "",
      description_es: "",
      start_time: "",
      end_time: "",
      days_active: [],
      start_date: "",
      end_date: "",
      discount_type: "percentage",
      discount_value: 0,
      applicable_items: [],
      applicable_categories: [],
      is_active: true,
      max_uses_per_day: null,
      min_purchase_amount: null,
    });
    setEditingPromotion(null);
  };

  const openEditModal = (promo: Promotion) => {
    setEditingPromotion(promo);
    setFormData({
      ...promo,
      start_time: promo.start_time || "",
      end_time: promo.end_time || "",
      start_date: promo.start_date || "",
      end_date: promo.end_date || "",
    });
    setShowCreateModal(true);
  };

  const handleSave = async () => {
    if (!formData.name_es) {
      alert("El nombre es requerido");
      return;
    }

    setSaving(true);
    const supabase = createBrowserClient();

    const dataToSave = {
      name: formData.name || formData.name_es,
      name_es: formData.name_es,
      description: formData.description || null,
      description_es: formData.description_es || null,
      start_time: formData.start_time || null,
      end_time: formData.end_time || null,
      days_active: formData.days_active || [],
      start_date: formData.start_date || null,
      end_date: formData.end_date || null,
      discount_type: formData.discount_type,
      discount_value: formData.discount_value || null,
      applicable_items: formData.applicable_items || [],
      applicable_categories: formData.applicable_categories || [],
      is_active: formData.is_active ?? true,
      max_uses_per_day: formData.max_uses_per_day || null,
      min_purchase_amount: formData.min_purchase_amount || null,
    };

    let error;
    if (editingPromotion) {
      const result = await supabase
        .from("promotions")
        .update(dataToSave)
        .eq("id", editingPromotion.id);
      error = result.error;
    } else {
      const result = await supabase.from("promotions").insert(dataToSave);
      error = result.error;
    }

    if (error) {
      console.error("[Promotions] Error saving:", error);
      alert("Error al guardar: " + error.message);
    } else {
      await loadData();
      setShowCreateModal(false);
      resetForm();
    }

    setSaving(false);
  };

  const toggleActive = async (promo: Promotion) => {
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("promotions")
      .update({ is_active: !promo.is_active })
      .eq("id", promo.id);

    if (error) {
      console.error("[Promotions] Error toggling:", error);
    } else {
      await loadData();
    }
  };

  const deletePromotion = async (id: string) => {
    if (!confirm("Eliminar esta promocion?")) return;

    const supabase = createBrowserClient();
    const { error } = await supabase.from("promotions").delete().eq("id", id);

    if (error) {
      console.error("[Promotions] Error deleting:", error);
    } else {
      await loadData();
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return "-";
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "pm" : "am";
    const hour12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${hour12}:${m}${ampm}`;
  };

  const formatDays = (days: string[]) => {
    if (days.length === 0) return "Todos los dias";
    if (days.length === 7) return "Todos los dias";
    return days
      .map((d) => DAYS_OF_WEEK.find((day) => day.key === d)?.es.substring(0, 3))
      .join(", ");
  };

  const getDiscountLabel = (promo: Promotion) => {
    switch (promo.discount_type) {
      case "percentage":
        return `${promo.discount_value}%`;
      case "fixed":
        return `$${(promo.discount_value || 0).toLocaleString()}`;
      case "bogo":
        return "2x1";
      default:
        return "-";
    }
  };

  const filteredPromotions =
    activeTab === "active" ? promotions.filter((p) => p.is_active) : promotions;

  const getAnalyticsForPromo = (id: string) => {
    return analytics.find((a) => a.id === id);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <span className="text-3xl">🎉</span> Promociones y Happy Hour
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona descuentos, 2x1, y promociones especiales
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowCreateModal(true);
          }}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 flex items-center gap-2"
        >
          <span>+</span> Nueva Promocion
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            Activas Ahora
          </div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">
            {promotions.filter((p) => p.is_active).length}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            Descuentos Hoy
          </div>
          <div className="text-2xl font-bold text-purple-600 mt-1">
            $
            {analytics
              .reduce((sum, a) => sum + (a.total_discount_given || 0), 0)
              .toLocaleString()}
          </div>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border border-slate-200">
          <div className="text-xs text-slate-500 uppercase tracking-wide">
            Usos Totales
          </div>
          <div className="text-2xl font-bold text-cyan-600 mt-1">
            {analytics.reduce((sum, a) => sum + (a.total_uses || 0), 0)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "active"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Activas ({promotions.filter((p) => p.is_active).length})
        </button>
        <button
          onClick={() => setActiveTab("all")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "all"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Todas ({promotions.length})
        </button>
        <button
          onClick={() => setActiveTab("analytics")}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "analytics"
              ? "border-cyan-500 text-cyan-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Content */}
      {activeTab === "analytics" ? (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                <th className="text-left text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">
                  Promocion
                </th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">
                  Usos
                </th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">
                  Descuento Total
                </th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">
                  Ventas con Promo
                </th>
                <th className="text-right text-xs font-bold text-slate-500 uppercase tracking-wide px-4 py-3">
                  Desc. Promedio
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {analytics.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">
                      {lang === "es" ? a.name_es : a.name}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {a.total_uses || 0}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-red-600">
                    -${(a.total_discount_given || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-emerald-600">
                    ${(a.total_revenue_with_promo || 0).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    ${Math.round(a.avg_discount_per_use || 0).toLocaleString()}
                  </td>
                </tr>
              ))}
              {analytics.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-slate-500"
                  >
                    No hay datos de uso todavia
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredPromotions.map((promo) => {
            const promoAnalytics = getAnalyticsForPromo(promo.id);
            return (
              <div
                key={promo.id}
                className={`bg-white rounded-xl shadow-sm border p-4 ${
                  promo.is_active
                    ? "border-emerald-200"
                    : "border-slate-200 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-slate-900">
                        {lang === "es" ? promo.name_es : promo.name}
                      </h3>
                      <span
                        className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                          promo.is_active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {promo.is_active ? "ACTIVA" : "INACTIVA"}
                      </span>
                      <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-purple-100 text-purple-700">
                        {getDiscountLabel(promo)}
                      </span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {lang === "es"
                        ? promo.description_es
                        : promo.description || "-"}
                    </p>

                    <div className="flex flex-wrap gap-4 mt-3 text-sm">
                      {/* Horario */}
                      {(promo.start_time || promo.end_time) && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <span>🕐</span>
                          {formatTime(promo.start_time)} -{" "}
                          {formatTime(promo.end_time)}
                        </div>
                      )}

                      {/* Dias */}
                      <div className="flex items-center gap-1 text-slate-600">
                        <span>📅</span>
                        {formatDays(promo.days_active)}
                      </div>

                      {/* Categorias */}
                      {promo.applicable_categories.length > 0 && (
                        <div className="flex items-center gap-1 text-slate-600">
                          <span>📦</span>
                          {promo.applicable_categories
                            .map(
                              (c) =>
                                CATEGORIES.find((cat) => cat.key === c)?.es ||
                                c,
                            )
                            .join(", ")}
                        </div>
                      )}

                      {/* Usos */}
                      {promoAnalytics && promoAnalytics.total_uses > 0 && (
                        <div className="flex items-center gap-1 text-cyan-600 font-medium">
                          <span>📊</span>
                          {promoAnalytics.total_uses} usos
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleActive(promo)}
                      className={`p-2 rounded-lg transition-colors ${
                        promo.is_active
                          ? "bg-slate-100 hover:bg-slate-200 text-slate-600"
                          : "bg-emerald-100 hover:bg-emerald-200 text-emerald-600"
                      }`}
                      title={promo.is_active ? "Desactivar" : "Activar"}
                    >
                      {promo.is_active ? "⏸️" : "▶️"}
                    </button>
                    <button
                      onClick={() => openEditModal(promo)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600"
                      title="Editar"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deletePromotion(promo.id)}
                      className="p-2 bg-red-50 hover:bg-red-100 rounded-lg text-red-600"
                      title="Eliminar"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredPromotions.length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-slate-500">
                {activeTab === "active"
                  ? "No hay promociones activas"
                  : "No hay promociones"}
              </p>
              <button
                onClick={() => {
                  resetForm();
                  setShowCreateModal(true);
                }}
                className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600"
              >
                Crear primera promocion
              </button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-slate-900">
                {editingPromotion ? "Editar Promocion" : "Nueva Promocion"}
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-slate-100 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Nombre */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre (Espanol) *
                  </label>
                  <input
                    type="text"
                    value={formData.name_es || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name_es: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Happy Hour"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nombre (Ingles)
                  </label>
                  <input
                    type="text"
                    value={formData.name || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Happy Hour"
                  />
                </div>
              </div>

              {/* Descripcion */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripcion (Espanol)
                  </label>
                  <textarea
                    value={formData.description_es || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        description_es: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    rows={2}
                    placeholder="2x1 en cocteles..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Descripcion (Ingles)
                  </label>
                  <textarea
                    value={formData.description || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    rows={2}
                    placeholder="2-for-1 cocktails..."
                  />
                </div>
              </div>

              {/* Tipo de descuento */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Tipo de Descuento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DISCOUNT_TYPES.map((type) => (
                    <button
                      key={type.key}
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          discount_type: type.key as Promotion["discount_type"],
                        })
                      }
                      className={`p-3 rounded-lg border text-center transition-colors ${
                        formData.discount_type === type.key
                          ? "border-cyan-500 bg-cyan-50 text-cyan-700"
                          : "border-slate-300 hover:border-slate-400"
                      }`}
                    >
                      <div className="text-2xl mb-1">{type.icon}</div>
                      <div className="text-sm font-medium">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Valor del descuento */}
              {formData.discount_type !== "bogo" && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Valor del Descuento *
                  </label>
                  <div className="flex items-center gap-2">
                    {formData.discount_type === "percentage" && (
                      <span className="text-slate-500">%</span>
                    )}
                    {formData.discount_type === "fixed" && (
                      <span className="text-slate-500">$</span>
                    )}
                    <input
                      type="number"
                      value={formData.discount_value || ""}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          discount_value: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-32 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                      placeholder={
                        formData.discount_type === "percentage" ? "15" : "10000"
                      }
                    />
                  </div>
                </div>
              )}

              {/* Horario */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Horario (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="time"
                    value={formData.start_time || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <span className="text-slate-500">hasta</span>
                  <input
                    type="time"
                    value={formData.end_time || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_time: e.target.value })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Dias de la semana */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Dias Activos (vacio = todos)
                </label>
                <div className="flex flex-wrap gap-2">
                  {DAYS_OF_WEEK.map((day) => (
                    <button
                      key={day.key}
                      type="button"
                      onClick={() => {
                        const current = formData.days_active || [];
                        if (current.includes(day.key)) {
                          setFormData({
                            ...formData,
                            days_active: current.filter((d) => d !== day.key),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            days_active: [...current, day.key],
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        (formData.days_active || []).includes(day.key)
                          ? "bg-cyan-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {day.es}
                    </button>
                  ))}
                </div>
              </div>

              {/* Categorias aplicables */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Categorias Aplicables
                </label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        const current = formData.applicable_categories || [];
                        if (current.includes(cat.key)) {
                          setFormData({
                            ...formData,
                            applicable_categories: current.filter(
                              (c) => c !== cat.key,
                            ),
                          });
                        } else {
                          setFormData({
                            ...formData,
                            applicable_categories: [...current, cat.key],
                          });
                        }
                      }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        (formData.applicable_categories || []).includes(cat.key)
                          ? "bg-purple-500 text-white"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {cat.icon} {cat.es}
                    </button>
                  ))}
                </div>
              </div>

              {/* Fechas de vigencia */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Vigencia (opcional)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="date"
                    value={formData.start_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                  <span className="text-slate-500">hasta</span>
                  <input
                    type="date"
                    value={formData.end_date || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, end_date: e.target.value })
                    }
                    className="px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Opciones avanzadas */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Max usos por dia (opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.max_uses_per_day || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        max_uses_per_day: parseInt(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="Sin limite"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Compra minima (opcional)
                  </label>
                  <input
                    type="number"
                    value={formData.min_purchase_amount || ""}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        min_purchase_amount: parseFloat(e.target.value) || null,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                    placeholder="$0"
                  />
                </div>
              </div>

              {/* Estado */}
              <div className="flex items-center gap-3">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_active ?? true}
                    onChange={(e) =>
                      setFormData({ ...formData, is_active: e.target.checked })
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500" />
                </label>
                <span className="text-sm font-medium text-slate-700">
                  Promocion activa
                </span>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 disabled:opacity-50"
              >
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
