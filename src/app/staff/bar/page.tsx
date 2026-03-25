"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import type { Tables } from "@/types/database";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// TVC BAR DASHBOARD - Issue #10
// Pagina principal para personal de bar
// Acceso rapido a: POS (tragos), Inventario de licores, Botellas
// ═══════════════════════════════════════════════════════════════

type MenuItem = Tables<"menu_items">;
type Ingredient = Tables<"ingredients">;

interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  href?: string;
}

interface RecentOrder {
  id: string;
  item_name: string;
  quantity: number;
  villa_name: string;
  time: string;
}

const ALCOHOL_CATEGORIES = ["cocktail", "mocktail", "beer", "wine", "spirit"];

export default function StaffBarPage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [lowStockItems, setLowStockItems] = useState<Ingredient[]>([]);
  const [popularDrinks, setPopularDrinks] = useState<MenuItem[]>([]);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    try {
      // Ventas de hoy (bebidas)
      const { data: ordersToday, count: orderCount } = await supabase
        .from("order_logs")
        .select("*, menu_items!inner(category)", { count: "exact" })
        .eq("order_date", today)
        .in("menu_items.category", ALCOHOL_CATEGORIES);

      const totalSales =
        ordersToday?.reduce((sum, o) => sum + (o.total_price || 0), 0) || 0;

      // Botellas abiertas hoy
      const { count: bottlesOpened } = await supabase
        .from("bottle_events")
        .select("*", { count: "exact", head: true })
        .eq("event_type", "opened")
        .gte("created_at", today);

      // Items de alcohol con bajo stock
      const { data: lowStock } = await supabase
        .from("ingredients")
        .select("*")
        .eq("category", "alcohol")
        .eq("is_active", true)
        .not("min_stock", "is", null)
        .order("current_stock");

      const lowStockFiltered =
        lowStock?.filter(
          (i) =>
            i.min_stock !== null &&
            i.current_stock !== null &&
            i.current_stock <= i.min_stock * 1.2,
        ) || [];

      setLowStockItems(lowStockFiltered);

      // Bebidas mas vendidas de la semana
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: topDrinks } = await supabase
        .from("order_logs")
        .select(
          "menu_item_id, quantity, menu_items!inner(id, name_es, category, price)",
        )
        .gte("order_date", weekAgo.toISOString().split("T")[0])
        .in("menu_items.category", ALCOHOL_CATEGORIES);

      // Agrupar por item
      const drinkCounts: Record<string, { item: MenuItem; total: number }> = {};
      topDrinks?.forEach((order) => {
        const itemId = order.menu_item_id;
        if (!drinkCounts[itemId]) {
          drinkCounts[itemId] = {
            item: order.menu_items as unknown as MenuItem,
            total: 0,
          };
        }
        drinkCounts[itemId].total += order.quantity;
      });

      const sortedDrinks = Object.values(drinkCounts)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5)
        .map((d) => d.item);

      setPopularDrinks(sortedDrinks);

      // Ultimas ordenes
      const { data: recent } = await supabase
        .from("order_logs")
        .select(
          "id, quantity, order_time, villa_id, menu_items!inner(name_es, category)",
        )
        .in("menu_items.category", ALCOHOL_CATEGORIES)
        .order("created_at", { ascending: false })
        .limit(5);

      const villaNames: Record<string, string> = {
        villa_1: "Teresa",
        villa_2: "Aduana",
        villa_3: "Trinidad",
        villa_4: "Paz",
        villa_5: "San Pedro",
        villa_6: "San Diego",
        villa_7: "Coche",
        villa_8: "Pozo",
        villa_9: "Santo Domingo",
        villa_10: "Merced",
        restaurante: "Restaurante",
        pool: "Piscina",
      };

      setRecentOrders(
        recent?.map((o) => ({
          id: o.id,
          item_name: (o.menu_items as { name_es: string }).name_es,
          quantity: o.quantity,
          villa_name: villaNames[o.villa_id] || o.villa_id,
          time: o.order_time?.substring(0, 5) || "",
        })) || [],
      );

      // Estadisticas
      setStats([
        {
          label: "Ventas Hoy",
          value: `$${totalSales.toLocaleString()}`,
          icon: "💰",
          color: "emerald",
          href: "/staff/pos",
        },
        {
          label: "Tragos Vendidos",
          value: orderCount || 0,
          icon: "🍹",
          color: "cyan",
          href: "/staff/pos",
        },
        {
          label: "Botellas Abiertas",
          value: bottlesOpened || 0,
          icon: "🍾",
          color: "purple",
          href: "/staff/kitchen",
        },
        {
          label: "Stock Bajo",
          value: lowStockFiltered.length,
          icon: "⚠️",
          color: lowStockFiltered.length > 0 ? "amber" : "slate",
          href: "/staff/inventory",
        },
      ]);
    } catch (error) {
      console.error("[BarPage] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🍸</span> Bar
          </h1>
          <p className="text-xs text-slate-400">
            Bienvenido - Tu centro de control
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </div>
          <div className="text-lg font-bold text-purple-400">
            {new Date().toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href || "#"}
            className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-purple-500/50 transition-colors active:scale-95`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <div
              className={`text-2xl font-bold ${
                stat.color === "emerald"
                  ? "text-emerald-400"
                  : stat.color === "cyan"
                    ? "text-cyan-400"
                    : stat.color === "purple"
                      ? "text-purple-400"
                      : stat.color === "amber"
                        ? "text-amber-400"
                        : "text-slate-400"
              }`}
            >
              {stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* Acciones Rapidas */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
          Acciones Rapidas
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/staff/pos"
            className="bg-purple-500 rounded-xl p-4 text-center hover:bg-purple-600 transition-colors active:scale-95"
          >
            <span className="text-2xl block mb-1">🧾</span>
            <span className="text-sm font-bold">Tomar Orden</span>
          </Link>
          <Link
            href="/staff/kitchen"
            className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors active:scale-95 border border-slate-700"
          >
            <span className="text-2xl block mb-1">🍾</span>
            <span className="text-sm font-medium">Abrir Botella</span>
          </Link>
          <Link
            href="/staff/inventory"
            className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors active:scale-95 border border-slate-700"
          >
            <span className="text-2xl block mb-1">📦</span>
            <span className="text-sm font-medium">Inventario</span>
          </Link>
        </div>
      </div>

      {/* Alerta de Stock Bajo */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">⚠️</span>
            <span className="font-bold text-amber-400">Stock Bajo</span>
          </div>
          <div className="space-y-2">
            {lowStockItems.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-white">{item.name_es}</span>
                <span className="text-amber-400 font-medium">
                  {item.current_stock} {item.unit}
                </span>
              </div>
            ))}
            {lowStockItems.length > 3 && (
              <Link
                href="/staff/inventory"
                className="text-xs text-amber-400 underline"
              >
                Ver {lowStockItems.length - 3} mas...
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Tragos Populares */}
      {popularDrinks.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
            Mas Vendidos Esta Semana
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {popularDrinks.map((drink, index) => (
              <div
                key={drink.id}
                className="flex-shrink-0 bg-slate-800 rounded-xl p-3 min-w-[120px] border border-slate-700"
              >
                <div className="text-lg mb-1">
                  {index === 0
                    ? "🥇"
                    : index === 1
                      ? "🥈"
                      : index === 2
                        ? "🥉"
                        : "🍹"}
                </div>
                <div className="text-sm font-medium truncate">
                  {drink.name_es}
                </div>
                <div className="text-xs text-purple-400">
                  ${(drink.price || 0).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ultimas Ordenes */}
      {recentOrders.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
            Ultimas Ordenes
          </div>
          <div className="space-y-2">
            {recentOrders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-800 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-purple-400 font-bold text-sm">
                    x{order.quantity}
                  </span>
                  <div>
                    <div className="text-sm font-medium">{order.item_name}</div>
                    <div className="text-xs text-slate-400">
                      {order.villa_name}
                    </div>
                  </div>
                </div>
                <div className="text-xs text-slate-400">{order.time}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
