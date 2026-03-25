"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { StatCard } from "@/components/ops/StatCard";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

interface Supplier {
  id: string;
  name: string;
  name_es: string | null;
  contact_name: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  category: string;
  delivery_days: string[];
  payment_terms: string | null;
  minimum_order: number | null;
  notes: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface SupplierIngredient {
  id: string;
  supplier_id: string;
  ingredient_id: string;
  unit_price: number | null;
  notes: string | null;
  ingredient?: {
    name: string;
    name_es: string;
    unit: string;
  };
}

const CATEGORY_ICONS: Record<string, string> = {
  food: "🍎",
  beverage: "🍷",
  supplies: "📦",
  maintenance: "🔧",
  cleaning: "🧹",
  other: "📋",
};

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  food: { en: "Food", es: "Alimentos" },
  beverage: { en: "Beverages", es: "Bebidas" },
  supplies: { en: "Supplies", es: "Suministros" },
  maintenance: { en: "Maintenance", es: "Mantenimiento" },
  cleaning: { en: "Cleaning", es: "Limpieza" },
  other: { en: "Other", es: "Otros" },
};

const DAY_LABELS: Record<string, { en: string; es: string }> = {
  monday: { en: "Mon", es: "Lun" },
  tuesday: { en: "Tue", es: "Mar" },
  wednesday: { en: "Wed", es: "Mie" },
  thursday: { en: "Thu", es: "Jue" },
  friday: { en: "Fri", es: "Vie" },
  saturday: { en: "Sat", es: "Sab" },
  sunday: { en: "Sun", es: "Dom" },
};

export default function SuppliersPage() {
  const { lang, t } = useLanguage();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierIngredients, setSupplierIngredients] = useState<
    Record<string, SupplierIngredient[]>
  >({});
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(
    null,
  );
  const [showAddModal, setShowAddModal] = useState(false);

  const loadSuppliers = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setConfigError(true);
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("name");

      if (error) throw error;
      setSuppliers(data || []);

      // Load supplier ingredients for all suppliers
      const { data: ingredients } = await supabase
        .from("supplier_ingredients")
        .select(
          `
          *,
          ingredient:ingredients(name, name_es, unit)
        `,
        );

      if (ingredients) {
        const grouped: Record<string, SupplierIngredient[]> = {};
        ingredients.forEach((item) => {
          if (!grouped[item.supplier_id]) {
            grouped[item.supplier_id] = [];
          }
          grouped[item.supplier_id].push(item as SupplierIngredient);
        });
        setSupplierIngredients(grouped);
      }
    } catch (error) {
      console.error("[SuppliersPage] Error loading suppliers:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSuppliers();
  }, [loadSuppliers]);

  const filteredSuppliers = suppliers.filter((supplier) => {
    const matchesCategory =
      selectedCategory === "all" || supplier.category === selectedCategory;
    const matchesSearch =
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const isActive = supplier.is_active;
    return matchesCategory && matchesSearch && isActive;
  });

  const stats = {
    total: suppliers.filter((s) => s.is_active).length,
    food: suppliers.filter((s) => s.category === "food" && s.is_active).length,
    beverage: suppliers.filter((s) => s.category === "beverage" && s.is_active)
      .length,
    cleaning: suppliers.filter((s) => s.category === "cleaning" && s.is_active)
      .length,
  };

  const openWhatsApp = (phone: string, supplierName: string) => {
    const message = encodeURIComponent(
      lang === "es"
        ? `Hola, soy de TVC. Quisiera hacer un pedido.`
        : `Hello, I'm from TVC. I would like to place an order.`,
    );
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const callPhone = (phone: string) => {
    window.open(`tel:${phone}`, "_blank");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-amber-800 mb-2">
          {lang === "es"
            ? "Base de Datos No Configurada"
            : "Database Not Configured"}
        </h2>
        <p className="text-sm text-amber-700">
          {lang === "es"
            ? "Las variables de entorno de Supabase no estan disponibles."
            : "Supabase environment variables are not available."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {lang === "es" ? "Directorio de Proveedores" : "Supplier Directory"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === "es"
            ? "Contactos de proveedores de alimentos, bebidas y suministros"
            : "Food, beverage, and supply vendor contacts"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label={lang === "es" ? "Total Proveedores" : "Total Suppliers"}
          value={stats.total.toString()}
          sub={lang === "es" ? "Activos" : "Active"}
          color="#00B4FF"
          icon="📋"
        />
        <StatCard
          label={lang === "es" ? "Alimentos" : "Food"}
          value={stats.food.toString()}
          sub={lang === "es" ? "Proveedores" : "Suppliers"}
          color="#10B981"
          icon="🍎"
        />
        <StatCard
          label={lang === "es" ? "Bebidas" : "Beverages"}
          value={stats.beverage.toString()}
          sub={lang === "es" ? "Proveedores" : "Suppliers"}
          color="#8B5CF6"
          icon="🍷"
        />
        <StatCard
          label={lang === "es" ? "Limpieza" : "Cleaning"}
          value={stats.cleaning.toString()}
          sub={lang === "es" ? "Proveedores" : "Suppliers"}
          color="#F59E0B"
          icon="🧹"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={
                lang === "es"
                  ? "Buscar proveedor o contacto..."
                  : "Search supplier or contact..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
            />
          </div>

          {/* Category Filter */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedCategory("all")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === "all"
                  ? "bg-[#0A0A0F] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang === "es" ? "Todos" : "All"}
            </button>
            {Object.entries(CATEGORY_LABELS).map(([key, labels]) => (
              <button
                key={key}
                onClick={() => setSelectedCategory(key)}
                className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === key
                    ? "bg-[#0A0A0F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {CATEGORY_ICONS[key]} {labels[lang]}
              </button>
            ))}
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#00B4FF] text-white rounded-lg text-xs font-bold hover:bg-[#0095D6] transition-colors"
          >
            + {lang === "es" ? "Agregar" : "Add"}
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSuppliers.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#00B4FF] hover:shadow-md transition-all"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-xl">
                    {CATEGORY_ICONS[supplier.category]}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {supplier.name}
                    </h3>
                    {supplier.contact_name && (
                      <p className="text-xs text-slate-500">
                        {supplier.contact_name}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  color={
                    supplier.category === "food"
                      ? "#10B981"
                      : supplier.category === "beverage"
                        ? "#8B5CF6"
                        : supplier.category === "cleaning"
                          ? "#F59E0B"
                          : "#6B7280"
                  }
                >
                  {CATEGORY_LABELS[supplier.category]?.[lang] ||
                    supplier.category}
                </Badge>
              </div>
            </div>

            {/* Body */}
            <div className="p-4 space-y-3">
              {/* Delivery Days */}
              {supplier.delivery_days && supplier.delivery_days.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {lang === "es" ? "Dias de Entrega" : "Delivery Days"}
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {supplier.delivery_days.map((day) => (
                      <span
                        key={day}
                        className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded"
                      >
                        {DAY_LABELS[day]?.[lang] || day}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment Terms */}
              {supplier.payment_terms && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {lang === "es" ? "Condiciones de Pago" : "Payment Terms"}
                  </div>
                  <p className="text-xs text-slate-700">
                    {supplier.payment_terms}
                  </p>
                </div>
              )}

              {/* Ingredients Supplied */}
              {supplierIngredients[supplier.id]?.length > 0 && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {lang === "es" ? "Productos" : "Products"} (
                    {supplierIngredients[supplier.id].length})
                  </div>
                  <div className="flex gap-1 flex-wrap">
                    {supplierIngredients[supplier.id]
                      .slice(0, 3)
                      .map((item) => (
                        <span
                          key={item.id}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] rounded"
                        >
                          {lang === "es"
                            ? item.ingredient?.name_es
                            : item.ingredient?.name}
                        </span>
                      ))}
                    {supplierIngredients[supplier.id].length > 3 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded">
                        +{supplierIngredients[supplier.id].length - 3}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {supplier.notes && (
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                    {lang === "es" ? "Notas" : "Notes"}
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">
                    {supplier.notes}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
              {supplier.whatsapp && (
                <button
                  onClick={() =>
                    openWhatsApp(supplier.whatsapp!, supplier.name)
                  }
                  className="flex-1 px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#1DA851] transition-colors flex items-center justify-center gap-1"
                >
                  <span>WhatsApp</span>
                </button>
              )}
              {supplier.phone && (
                <button
                  onClick={() => callPhone(supplier.phone!)}
                  className="flex-1 px-3 py-2 bg-[#00B4FF] text-white rounded-lg text-xs font-bold hover:bg-[#0095D6] transition-colors flex items-center justify-center gap-1"
                >
                  <span>{lang === "es" ? "Llamar" : "Call"}</span>
                </button>
              )}
              <button
                onClick={() => setSelectedSupplier(supplier)}
                className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                {lang === "es" ? "Ver" : "View"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">📋</div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            {lang === "es" ? "No hay proveedores" : "No suppliers found"}
          </h3>
          <p className="text-sm text-slate-500">
            {lang === "es"
              ? "No se encontraron proveedores con estos filtros"
              : "No suppliers match the current filters"}
          </p>
        </div>
      )}

      {/* Supplier Detail Modal */}
      {selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          ingredients={supplierIngredients[selectedSupplier.id] || []}
          lang={lang}
          onClose={() => setSelectedSupplier(null)}
          onWhatsApp={openWhatsApp}
          onCall={callPhone}
        />
      )}

      {/* Add Supplier Modal */}
      {showAddModal && (
        <AddSupplierModal
          lang={lang}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadSuppliers();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// SUPPLIER DETAIL MODAL
// =============================================================================
function SupplierDetailModal({
  supplier,
  ingredients,
  lang,
  onClose,
  onWhatsApp,
  onCall,
}: {
  supplier: Supplier;
  ingredients: SupplierIngredient[];
  lang: "en" | "es";
  onClose: () => void;
  onWhatsApp: (phone: string, name: string) => void;
  onCall: (phone: string) => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center text-2xl">
                {CATEGORY_ICONS[supplier.category]}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {supplier.name}
                </h2>
                {supplier.contact_name && (
                  <p className="text-sm text-slate-500">
                    {supplier.contact_name}
                  </p>
                )}
                <Badge
                  color={
                    supplier.category === "food"
                      ? "#10B981"
                      : supplier.category === "beverage"
                        ? "#8B5CF6"
                        : "#6B7280"
                  }
                >
                  {CATEGORY_LABELS[supplier.category]?.[lang] ||
                    supplier.category}
                </Badge>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {supplier.phone && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {lang === "es" ? "Telefono" : "Phone"}
                </div>
                <p className="text-sm text-slate-700">{supplier.phone}</p>
              </div>
            )}
            {supplier.email && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Email
                </div>
                <p className="text-sm text-slate-700">{supplier.email}</p>
              </div>
            )}
          </div>

          {/* Delivery Days */}
          {supplier.delivery_days && supplier.delivery_days.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                {lang === "es" ? "Dias de Entrega" : "Delivery Days"}
              </div>
              <div className="flex gap-2 flex-wrap">
                {[
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].map((day) => (
                  <span
                    key={day}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                      supplier.delivery_days.includes(day)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {DAY_LABELS[day]?.[lang] || day}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Payment Terms */}
          {supplier.payment_terms && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {lang === "es" ? "Condiciones de Pago" : "Payment Terms"}
              </div>
              <p className="text-sm text-slate-700">{supplier.payment_terms}</p>
            </div>
          )}

          {/* Minimum Order */}
          {supplier.minimum_order && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {lang === "es" ? "Pedido Minimo" : "Minimum Order"}
              </div>
              <p className="text-sm text-slate-700">
                ${supplier.minimum_order.toLocaleString()} COP
              </p>
            </div>
          )}

          {/* Products/Ingredients */}
          {ingredients.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                {lang === "es"
                  ? "Productos que Suministra"
                  : "Products Supplied"}{" "}
                ({ingredients.length})
              </div>
              <div className="bg-slate-50 rounded-lg p-3 max-h-40 overflow-y-auto">
                <div className="space-y-2">
                  {ingredients.map((item) => (
                    <div
                      key={item.id}
                      className="flex justify-between items-center text-xs"
                    >
                      <span className="text-slate-700">
                        {lang === "es"
                          ? item.ingredient?.name_es
                          : item.ingredient?.name}
                      </span>
                      {item.unit_price && (
                        <span className="text-slate-500">
                          ${item.unit_price.toLocaleString()}/
                          {item.ingredient?.unit}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          {supplier.notes && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {lang === "es" ? "Notas" : "Notes"}
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                {supplier.notes}
              </p>
            </div>
          )}

          {/* Address */}
          {supplier.address && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {lang === "es" ? "Direccion" : "Address"}
              </div>
              <p className="text-sm text-slate-600">{supplier.address}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          {supplier.whatsapp && (
            <button
              onClick={() => onWhatsApp(supplier.whatsapp!, supplier.name)}
              className="flex-1 px-4 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#1DA851] transition-colors"
            >
              WhatsApp
            </button>
          )}
          {supplier.phone && (
            <button
              onClick={() => onCall(supplier.phone!)}
              className="flex-1 px-4 py-3 bg-[#00B4FF] text-white rounded-xl font-bold hover:bg-[#0095D6] transition-colors"
            >
              {lang === "es" ? "Llamar" : "Call"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ADD SUPPLIER MODAL
// =============================================================================
function AddSupplierModal({
  lang,
  onClose,
  onSaved,
}: {
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    category: "food",
    delivery_days: [] as string[],
    payment_terms: "",
    minimum_order: "",
    notes: "",
    address: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("suppliers").insert({
        name: formData.name,
        name_es: formData.name,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || formData.phone || null,
        email: formData.email || null,
        category: formData.category,
        delivery_days: formData.delivery_days,
        payment_terms: formData.payment_terms || null,
        minimum_order: formData.minimum_order
          ? parseFloat(formData.minimum_order)
          : null,
        notes: formData.notes || null,
        address: formData.address || null,
        is_active: true,
      });

      if (error) throw error;
      onSaved();
    } catch (error) {
      console.error("[AddSupplierModal] Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  const toggleDay = (day: string) => {
    setFormData((prev) => ({
      ...prev,
      delivery_days: prev.delivery_days.includes(day)
        ? prev.delivery_days.filter((d) => d !== day)
        : [...prev.delivery_days, day],
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">
                {lang === "es" ? "Agregar Proveedor" : "Add Supplier"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Nombre del Proveedor *" : "Supplier Name *"}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                required
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Nombre del Contacto" : "Contact Name"}
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              />
            </div>

            {/* Phone & WhatsApp */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  {lang === "es" ? "Telefono" : "Phone"}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+57..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                  placeholder={
                    lang === "es" ? "Si es diferente" : "If different"
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Categoria" : "Category"}
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              >
                {Object.entries(CATEGORY_LABELS).map(([key, labels]) => (
                  <option key={key} value={key}>
                    {CATEGORY_ICONS[key]} {labels[lang]}
                  </option>
                ))}
              </select>
            </div>

            {/* Delivery Days */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-2 block">
                {lang === "es" ? "Dias de Entrega" : "Delivery Days"}
              </label>
              <div className="flex gap-2 flex-wrap">
                {[
                  "monday",
                  "tuesday",
                  "wednesday",
                  "thursday",
                  "friday",
                  "saturday",
                  "sunday",
                ].map((day) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDay(day)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      formData.delivery_days.includes(day)
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                    }`}
                  >
                    {DAY_LABELS[day]?.[lang] || day}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Terms */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Condiciones de Pago" : "Payment Terms"}
              </label>
              <input
                type="text"
                value={formData.payment_terms}
                onChange={(e) =>
                  setFormData({ ...formData, payment_terms: e.target.value })
                }
                placeholder={
                  lang === "es" ? "Ej: Credito 30 dias" : "Ex: Net 30"
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Notas" : "Notes"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF] resize-none"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-[#00B4FF] text-white rounded-xl font-bold hover:bg-[#0095D6] transition-colors disabled:opacity-50"
            >
              {saving
                ? lang === "es"
                  ? "Guardando..."
                  : "Saving..."
                : lang === "es"
                  ? "Guardar"
                  : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
