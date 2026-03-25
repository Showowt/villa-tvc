"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import MobileHeader from "@/components/staff/MobileHeader";
import LargeTouchButton from "@/components/staff/LargeTouchButton";

// ============================================
// TVC POS - Simple Order Entry Interface
// Big buttons, tap → quantity → villa → ENVIAR
// Now includes: Staff Meals, Breakfast Headcount, PROMOTIONS
// Issue #68 - Happy Hour / Promociones
// ============================================

interface MenuItem {
  id: string;
  name: string;
  name_es: string;
  category: string;
  price: number;
  cost: number | null;
  is_available: boolean;
  is_active: boolean;
}

interface ActivePromotion {
  id: string;
  name: string;
  name_es: string;
  description_es: string | null;
  discount_type: "percentage" | "fixed" | "bogo";
  discount_value: number | null;
  applicable_categories: string[];
  applicable_items: string[];
  start_time: string | null;
  end_time: string | null;
}

interface OrderItem {
  menuItem: MenuItem;
  quantity: number;
  isStaffMeal?: boolean;
  promotion?: ActivePromotion | null;
  discountAmount?: number;
  finalPrice?: number;
  freeItems?: number;
}

interface BreakfastAttendance {
  id: string;
  date: string;
  guests_expected: number;
  guests_attended: number;
}

// Category config with labels and icons
const CATEGORIES = [
  { key: "breakfast", label: "Desayuno", icon: "🍳" },
  { key: "lunch", label: "Almuerzo", icon: "🥗" },
  { key: "dinner", label: "Cena", icon: "🍽️" },
  { key: "cocktail", label: "Cocteles", icon: "🍹" },
  { key: "mocktail", label: "Sin Alcohol", icon: "🥤" },
  { key: "beer", label: "Cerveza", icon: "🍺" },
  { key: "wine", label: "Vino", icon: "🍷" },
  { key: "spirit", label: "Licor", icon: "🥃" },
  { key: "soft_drink", label: "Bebidas", icon: "🧃" },
  { key: "snack", label: "Snacks", icon: "🥜" },
];

// Villa list for selection
const VILLAS = [
  { id: "villa_1", name: "Teresa" },
  { id: "villa_2", name: "Aduana" },
  { id: "villa_3", name: "Trinidad" },
  { id: "villa_4", name: "Paz" },
  { id: "villa_5", name: "San Pedro" },
  { id: "villa_6", name: "San Diego" },
  { id: "villa_7", name: "Coche" },
  { id: "villa_8", name: "Pozo" },
  { id: "villa_9", name: "Santo Domingo" },
  { id: "villa_10", name: "Merced" },
  { id: "restaurante", name: "Restaurante" },
  { id: "pool", name: "Piscina" },
];

export default function StaffPOSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("breakfast");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [showVillaModal, setShowVillaModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Tab state for different modes
  const [activeTab, setActiveTab] = useState<
    "orders" | "staff_meal" | "breakfast"
  >("orders");

  // Breakfast headcount state
  const [guestsExpected, setGuestsExpected] = useState(0);
  const [guestsAttended, setGuestsAttended] = useState(0);
  const [breakfastData, setBreakfastData] =
    useState<BreakfastAttendance | null>(null);

  // Staff meal flag for quantity modal
  const [isStaffMealMode, setIsStaffMealMode] = useState(false);

  // PROMOCIONES: Estado para promociones activas
  const [activePromotions, setActivePromotions] = useState<ActivePromotion[]>(
    [],
  );

  // Load menu items, breakfast data, and active promotions
  const loadMenuItems = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select(
        "id, name, name_es, category, price, cost, is_available, is_active",
      )
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (error) {
      console.error("[POS] Error loading menu:", error);
    } else if (data) {
      setMenuItems(data);
    }

    // Load today's breakfast attendance
    const today = new Date().toISOString().split("T")[0];
    const { data: breakfast } = await supabase
      .from("breakfast_attendance")
      .select("*")
      .eq("date", today)
      .single();

    if (breakfast) {
      setBreakfastData(breakfast);
      setGuestsExpected(breakfast.guests_expected);
      setGuestsAttended(breakfast.guests_attended);
    } else {
      // Get expected guests from daily_occupancy
      const { data: occupancy } = await supabase
        .from("daily_occupancy")
        .select("guests_count")
        .eq("date", today)
        .single();

      if (occupancy) {
        setGuestsExpected(occupancy.guests_count);
      }
    }

    // PROMOCIONES: Cargar promociones activas
    try {
      const response = await fetch("/api/promotions/active");
      const promoData = await response.json();
      if (promoData.success && promoData.promotions) {
        setActivePromotions(promoData.promotions);
      }
    } catch (promoError) {
      console.error("[POS] Error loading promotions:", promoError);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadMenuItems();
  }, [loadMenuItems]);

  // Save breakfast attendance
  const saveBreakfastAttendance = async () => {
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

      const today = new Date().toISOString().split("T")[0];

      const { error } = await supabase.from("breakfast_attendance").upsert(
        {
          date: today,
          guests_expected: guestsExpected,
          guests_attended: guestsAttended,
          logged_by: loggedBy,
        },
        { onConflict: "date" },
      );

      if (error) {
        console.error("[POS] Error saving breakfast:", error);
        alert("Error al guardar asistencia");
        return;
      }

      setSuccessMessage("Asistencia de desayuno guardada");
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (error) {
      console.error("[POS] Error:", error);
      alert("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  // PROMOCIONES: Buscar promocion aplicable para un item
  const getApplicablePromotion = (item: MenuItem): ActivePromotion | null => {
    return (
      activePromotions.find((promo) => {
        // Verificar si aplica por categoria
        if (promo.applicable_categories.includes(item.category)) {
          return true;
        }
        // Verificar si aplica por item especifico
        if (promo.applicable_items.includes(item.id)) {
          return true;
        }
        return false;
      }) || null
    );
  };

  // PROMOCIONES: Calcular descuento para un item
  const calculateDiscount = (
    item: MenuItem,
    quantity: number,
    promo: ActivePromotion | null,
  ) => {
    if (!promo) {
      return {
        discountAmount: 0,
        finalPrice: item.price * quantity,
        freeItems: 0,
      };
    }

    const originalPrice = item.price * quantity;
    let discountAmount = 0;
    let freeItems = 0;

    switch (promo.discount_type) {
      case "percentage":
        discountAmount = originalPrice * ((promo.discount_value || 0) / 100);
        break;
      case "fixed":
        discountAmount = Math.min(
          (promo.discount_value || 0) * quantity,
          originalPrice,
        );
        break;
      case "bogo":
        freeItems = Math.floor(quantity / 2);
        discountAmount = freeItems * item.price;
        break;
    }

    return {
      discountAmount: Math.round(discountAmount),
      finalPrice: Math.round(originalPrice - discountAmount),
      freeItems,
    };
  };

  // Toggle item availability (86 system)
  const toggleAvailability = async (
    itemId: string,
    currentlyAvailable: boolean,
  ) => {
    const supabase = createBrowserClient();
    const { error } = await supabase
      .from("menu_items")
      .update({ is_available: !currentlyAvailable })
      .eq("id", itemId);

    if (error) {
      console.error("[POS] Error toggling availability:", error);
      alert("Error al actualizar disponibilidad");
    } else {
      setMenuItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? { ...item, is_available: !currentlyAvailable }
            : item,
        ),
      );
    }
  };

  // Handle item tap
  const handleItemTap = (item: MenuItem, staffMeal: boolean = false) => {
    if (!item.is_available) {
      // Show option to make available again
      if (confirm(`${item.name_es} no disponible. Marcar como disponible?`)) {
        toggleAvailability(item.id, false);
      }
      return;
    }
    setSelectedItem(item);
    setIsStaffMealMode(staffMeal);
    setShowQuantityModal(true);
  };

  // Add item to order
  const addToOrder = (quantity: number) => {
    if (!selectedItem) return;

    setOrderItems((prev) => {
      const existing = prev.find(
        (o) =>
          o.menuItem.id === selectedItem.id &&
          o.isStaffMeal === isStaffMealMode,
      );
      if (existing) {
        return prev.map((o) =>
          o.menuItem.id === selectedItem.id && o.isStaffMeal === isStaffMealMode
            ? { ...o, quantity: o.quantity + quantity }
            : o,
        );
      }
      return [
        ...prev,
        { menuItem: selectedItem, quantity, isStaffMeal: isStaffMealMode },
      ];
    });

    setShowQuantityModal(false);
    setSelectedItem(null);
    setIsStaffMealMode(false);
  };

  // Remove item from order
  const removeFromOrder = (itemId: string, isStaffMeal?: boolean) => {
    setOrderItems((prev) =>
      prev.filter(
        (o) => !(o.menuItem.id === itemId && o.isStaffMeal === isStaffMeal),
      ),
    );
  };

  // Submit order
  const submitOrder = async (villaId: string) => {
    if (orderItems.length === 0) return;

    setSubmitting(true);
    setShowVillaModal(false);

    try {
      const supabase = createBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      let servedBy: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        servedBy = profile?.id || null;
      }

      // Insert order logs
      const orderLogs = orderItems.map((item) => ({
        menu_item_id: item.menuItem.id,
        quantity: item.quantity,
        unit_price: item.menuItem.price,
        total_price: item.menuItem.price * item.quantity,
        villa_id: villaId,
        served_by: servedBy,
        order_date: new Date().toISOString().split("T")[0],
        order_time: new Date().toTimeString().split(" ")[0],
        meal_period: selectedCategory as MenuItem["category"],
        is_staff_meal: item.isStaffMeal || false,
        is_comp: item.isStaffMeal || false, // Staff meals are comped
      }));

      const { error } = await supabase.from("order_logs").insert(orderLogs);

      if (error) {
        console.error("[POS] Error submitting order:", error);
        alert("Error al enviar pedido");
      } else {
        const total = orderItems.reduce(
          (sum, item) => sum + item.menuItem.price * item.quantity,
          0,
        );
        const villaName = VILLAS.find((v) => v.id === villaId)?.name || villaId;
        setSuccessMessage(
          `Pedido enviado a ${villaName} - $${total.toLocaleString()}`,
        );
        setOrderItems([]);

        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (error) {
      console.error("[POS] Error:", error);
      alert("Error al procesar pedido");
    } finally {
      setSubmitting(false);
    }
  };

  // Calculate order total (separate guest and staff)
  const guestTotal = orderItems
    .filter((item) => !item.isStaffMeal)
    .reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  const staffMealCost = orderItems
    .filter((item) => item.isStaffMeal)
    .reduce((sum, item) => sum + (item.menuItem.cost || 0) * item.quantity, 0);
  const orderTotal = guestTotal; // Staff meals don't count as revenue

  // Filter items by category
  const filteredItems = menuItems.filter(
    (item) => item.category === selectedCategory,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="pb-48">
      {/* Header */}
      <MobileHeader
        title="POS - Punto de Venta"
        subtitle="Toca un item, selecciona cantidad, elige villa"
      />

      {/* Success Message */}
      {successMessage && (
        <div className="mb-4 p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-400 text-sm font-medium animate-pulse">
          {successMessage}
        </div>
      )}

      {/* Mode Tabs */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setActiveTab("orders")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "orders"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Pedidos
        </button>
        <button
          onClick={() => setActiveTab("staff_meal")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "staff_meal"
              ? "bg-orange-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Staff
        </button>
        <button
          onClick={() => setActiveTab("breakfast")}
          className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "breakfast"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Desayuno
        </button>
      </div>

      {/* Breakfast Tab Content */}
      {activeTab === "breakfast" && (
        <div className="space-y-6">
          <div className="bg-slate-800 rounded-xl p-4 space-y-4">
            <div className="text-center">
              <div className="text-xs text-slate-400 uppercase tracking-wide">
                Asistencia de Desayuno
              </div>
              <div className="text-2xl font-bold mt-2">
                {guestsAttended} / {guestsExpected}
              </div>
              <div className="text-xs text-slate-400">
                {guestsExpected > 0
                  ? `${Math.round((guestsAttended / guestsExpected) * 100)}% asistencia`
                  : "Sin datos de ocupacion"}
              </div>
            </div>

            {/* Quick counter */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() =>
                  setGuestsAttended(Math.max(0, guestsAttended - 1))
                }
                className="w-14 h-14 bg-slate-700 rounded-xl text-2xl hover:bg-slate-600"
              >
                -
              </button>
              <div className="w-20 text-center">
                <div className="text-4xl font-bold">{guestsAttended}</div>
                <div className="text-[10px] text-slate-400">asistieron</div>
              </div>
              <button
                onClick={() => setGuestsAttended(guestsAttended + 1)}
                className="w-14 h-14 bg-cyan-500 rounded-xl text-2xl hover:bg-cyan-600"
              >
                +
              </button>
            </div>

            {/* Expected guests input */}
            <div className="pt-4 border-t border-slate-700">
              <label className="text-xs text-slate-400">
                Huespedes esperados:
              </label>
              <div className="flex items-center gap-2 mt-1">
                <button
                  onClick={() =>
                    setGuestsExpected(Math.max(0, guestsExpected - 1))
                  }
                  className="w-10 h-10 bg-slate-700 rounded-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  value={guestsExpected}
                  onChange={(e) =>
                    setGuestsExpected(parseInt(e.target.value) || 0)
                  }
                  className="flex-1 bg-slate-700 rounded-lg px-3 py-2 text-center"
                />
                <button
                  onClick={() => setGuestsExpected(guestsExpected + 1)}
                  className="w-10 h-10 bg-slate-700 rounded-lg"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={saveBreakfastAttendance}
              disabled={submitting}
              className="w-full py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50"
            >
              {submitting ? "Guardando..." : "Guardar Asistencia"}
            </button>
          </div>

          {/* 30-day rate info */}
          <div className="bg-slate-800/50 rounded-xl p-4 text-center">
            <div className="text-xs text-slate-400">
              Despues de 30 dias, el sistema calculara la tasa promedio de
              asistencia para optimizar ordenes de compra.
            </div>
          </div>
        </div>
      )}

      {/* Staff Meal Tab Content */}
      {activeTab === "staff_meal" && (
        <>
          <div className="p-3 mb-4 bg-orange-500/20 border border-orange-500/30 rounded-lg text-orange-400 text-xs">
            Las comidas de staff se deducen del inventario pero NO se cobran
            como ingresos.
          </div>

          {/* Category Tabs */}
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {CATEGORIES.map((cat) => {
                const count = menuItems.filter(
                  (i) => i.category === cat.key && i.is_available,
                ).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat.key
                        ? "bg-orange-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-base mr-1">{cat.icon}</span>
                    {cat.label}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid for Staff Meals */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemTap(item, true)}
                className={`relative p-3 rounded-xl text-left transition-all ${
                  item.is_available
                    ? "bg-slate-800 hover:bg-orange-500/20 border border-transparent hover:border-orange-500/30 active:scale-95"
                    : "bg-slate-900/50 opacity-50"
                }`}
              >
                {!item.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 font-black text-xl transform -rotate-12">
                      86&apos;d
                    </span>
                  </div>
                )}

                <div className={item.is_available ? "" : "line-through"}>
                  <div className="font-bold text-sm truncate">
                    {item.name_es}
                  </div>
                  <div className="text-orange-400 font-medium text-sm">
                    Costo: ${(item.cost || 0).toLocaleString()}
                  </div>
                </div>
              </button>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-500">
                No hay items en esta categoria
              </div>
            )}
          </div>
        </>
      )}

      {/* Orders Tab Content */}
      {activeTab === "orders" && (
        <>
          {/* Category Tabs */}
          <div className="mb-4 overflow-x-auto">
            <div className="flex gap-2 pb-2">
              {CATEGORIES.map((cat) => {
                const count = menuItems.filter(
                  (i) => i.category === cat.key && i.is_available,
                ).length;
                return (
                  <button
                    key={cat.key}
                    onClick={() => setSelectedCategory(cat.key)}
                    className={`flex-shrink-0 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                      selectedCategory === cat.key
                        ? "bg-cyan-500 text-white"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                    }`}
                  >
                    <span className="text-base mr-1">{cat.icon}</span>
                    {cat.label}
                    {count > 0 && (
                      <span className="ml-1 text-[10px] opacity-70">
                        ({count})
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Menu Items Grid */}
          <div className="grid grid-cols-2 gap-2 mb-4">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleItemTap(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  toggleAvailability(item.id, item.is_available);
                }}
                className={`relative p-3 rounded-xl text-left transition-all ${
                  item.is_available
                    ? "bg-slate-800 hover:bg-slate-700 active:scale-95"
                    : "bg-slate-900/50 opacity-50"
                }`}
              >
                {/* 86'd indicator */}
                {!item.is_available && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-red-500 font-black text-xl transform -rotate-12">
                      86'd
                    </span>
                  </div>
                )}

                <div className={item.is_available ? "" : "line-through"}>
                  <div className="font-bold text-sm truncate">
                    {item.name_es}
                  </div>
                  <div className="text-cyan-400 font-black text-lg">
                    ${item.price.toLocaleString()}
                  </div>
                </div>
              </button>
            ))}

            {filteredItems.length === 0 && (
              <div className="col-span-2 text-center py-8 text-slate-500">
                No hay items en esta categoria
              </div>
            )}
          </div>
        </>
      )}

      {/* Current Order Summary (Fixed at bottom) */}
      {orderItems.length > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-slate-900/95 border-t border-slate-700 p-4 backdrop-blur">
          {/* Order Items */}
          <div className="max-h-32 overflow-y-auto mb-3 space-y-1">
            {orderItems.map((item) => (
              <div
                key={`${item.menuItem.id}-${item.isStaffMeal}`}
                className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                  item.isStaffMeal
                    ? "bg-orange-500/10 border border-orange-500/30"
                    : "bg-slate-800"
                }`}
              >
                <div className="flex-1 flex items-center gap-2">
                  <span
                    className={`${item.isStaffMeal ? "text-orange-400" : "text-cyan-400"} font-bold`}
                  >
                    {item.quantity}x
                  </span>
                  <span className="text-sm">{item.menuItem.name_es}</span>
                  {item.isStaffMeal && (
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1.5 py-0.5 rounded">
                      STAFF
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-bold ${item.isStaffMeal ? "text-orange-400" : ""}`}
                  >
                    ${(item.menuItem.price * item.quantity).toLocaleString()}
                  </span>
                  <button
                    onClick={() =>
                      removeFromOrder(item.menuItem.id, item.isStaffMeal)
                    }
                    className="w-6 h-6 bg-red-500/20 text-red-400 rounded-full text-xs font-bold"
                  >
                    x
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Total and Send Button */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <div className="text-xs text-slate-400">Total</div>
              <div className="text-xl font-black text-emerald-400">
                ${orderTotal.toLocaleString()}
              </div>
              {staffMealCost > 0 && (
                <div className="text-xs text-orange-400">
                  Staff: ${staffMealCost.toLocaleString()} (costo)
                </div>
              )}
            </div>
            <button
              onClick={() => setShowVillaModal(true)}
              disabled={submitting}
              className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-lg hover:bg-emerald-600 transition-colors disabled:opacity-50"
            >
              {submitting ? "Enviando..." : "ENVIAR"}
            </button>
          </div>
        </div>
      )}

      {/* Quantity Modal */}
      {showQuantityModal && selectedItem && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowQuantityModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              {isStaffMealMode && (
                <div className="text-orange-400 text-xs font-bold uppercase mb-2">
                  Comida de Staff
                </div>
              )}
              <div className="text-lg font-bold">{selectedItem.name_es}</div>
              <div
                className={`${isStaffMealMode ? "text-orange-400" : "text-cyan-400"} font-black text-2xl`}
              >
                {isStaffMealMode
                  ? `Costo: $${(selectedItem.cost || 0).toLocaleString()}`
                  : `$${selectedItem.price.toLocaleString()}`}
              </div>
            </div>

            <div className="text-sm text-slate-400 text-center mb-4">
              Selecciona cantidad
            </div>

            {/* Quick quantity buttons */}
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[1, 2, 3, 4, 5, 6, 8, 10].map((qty) => (
                <button
                  key={qty}
                  onClick={() => addToOrder(qty)}
                  className={`py-4 bg-slate-700 rounded-xl text-xl font-black transition-colors ${
                    isStaffMealMode
                      ? "hover:bg-orange-500"
                      : "hover:bg-cyan-500"
                  }`}
                >
                  {qty}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowQuantityModal(false)}
              className="w-full py-2 bg-slate-700 text-slate-400 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Villa Selection Modal */}
      {showVillaModal && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowVillaModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-lg font-bold text-center mb-4">
              Selecciona Villa
            </div>

            <div className="grid grid-cols-2 gap-2">
              {VILLAS.map((villa) => (
                <button
                  key={villa.id}
                  onClick={() => submitOrder(villa.id)}
                  className="py-4 bg-slate-700 hover:bg-cyan-500 rounded-xl font-bold transition-colors"
                >
                  {villa.name}
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowVillaModal(false)}
              className="w-full mt-4 py-2 bg-slate-700 text-slate-400 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
