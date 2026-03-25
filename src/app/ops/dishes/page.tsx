"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ops/StatCard";
import Link from "next/link";

interface DishPLItem {
  menu_item_id: string;
  name: string;
  name_es: string;
  category: string;
  price: number;
  ingredient_cost: number;
  transport_cost: number;
  margin: number;
  margin_pct: number;
  orders_this_week: number;
  avg_orders_per_week: number;
  weekly_profit: number;
}

interface DishPLResponse {
  success: boolean;
  items: DishPLItem[];
  summary: {
    totalItems: number;
    foodItems: number;
    drinkItems: number;
    weekFoodProfit: number;
    weekBarProfit: number;
    weekTotalProfit: number;
    avgFoodMargin: number;
    avgBarMargin: number;
    weekTransportCost: number;
    lowMarginCount: number;
  };
  lowMarginItems: Array<{
    id: string;
    name: string;
    nameEs: string;
    category: string;
    price: number;
    cost: number;
    marginPct: number;
  }>;
}

export default function DishesPage() {
  const [data, setData] = useState<DishPLResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransport, setShowTransport] = useState(true);
  const [selected, setSelected] = useState<DishPLItem | null>(null);
  const [filter, setFilter] = useState<"all" | "food" | "drinks">("all");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/dish-pl");
        const json = await res.json();
        if (json.success) {
          setData(json);
          if (json.items.length > 0) {
            setSelected(json.items[0]);
          }
        }
      } catch (error) {
        console.error("[DishesPage] Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!data || !data.items.length) {
    return (
      <div className="bg-amber-50 rounded-xl p-6 border border-amber-200">
        <h2 className="font-bold text-amber-800 mb-2">No P&L Data Available</h2>
        <p className="text-amber-700 text-sm">
          Menu items or recipes may not be configured. Please check the database
          setup.
        </p>
      </div>
    );
  }

  const drinkCategories = [
    "cocktail",
    "mocktail",
    "beer",
    "wine",
    "spirit",
    "soft_drink",
  ];

  const filteredItems = data.items.filter((item) => {
    if (filter === "all") return true;
    if (filter === "food") return !drinkCategories.includes(item.category);
    return drinkCategories.includes(item.category);
  });

  const sorted = [...filteredItems].sort(
    (a, b) => Number(b.weekly_profit) - Number(a.weekly_profit),
  );

  const getMarginColor = (pct: number) => {
    if (pct >= 70) return "#10B981";
    if (pct >= 50) return "#F59E0B";
    return "#EF4444";
  };

  const formatCOP = (n: number) => `$${Math.round(n).toLocaleString()}`;

  const selectedCost = selected
    ? Number(selected.ingredient_cost) +
      (showTransport ? Number(selected.transport_cost) : 0)
    : 0;
  const selectedMargin = selected ? Number(selected.price) - selectedCost : 0;
  const selectedMarginPct = selected
    ? Math.round((selectedMargin / Number(selected.price)) * 100)
    : 0;

  return (
    <div>
      <div className="mb-4">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-extrabold">
              Dish P&L with Transport Layer
            </h1>
            <p className="text-slate-500 text-xs mt-1">
              Real margins per plate calculated from recipes - including the
              hidden cost of getting ingredients to the island.
            </p>
          </div>
          <Link
            href="/admin/recipes"
            className="px-4 py-2 bg-[#0A0A0F] text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all"
          >
            Edit Recipes
          </Link>
        </div>
      </div>

      {/* Low Margin Alert */}
      {data.lowMarginItems.length > 0 && (
        <div className="bg-rose-50 rounded-xl p-4 mb-4 border border-rose-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-lg">Warning</span>
            <span className="font-bold text-rose-800">
              {data.lowMarginItems.length} Low Margin Item
              {data.lowMarginItems.length > 1 ? "s" : ""} (&lt;50%)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {data.lowMarginItems.map((item) => (
              <span
                key={item.id}
                className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-semibold"
              >
                {item.name}: {Number(item.marginPct).toFixed(0)}%
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        <StatCard
          label="Weekly Food Profit"
          value={formatCOP(data.summary.weekFoodProfit)}
          sub={`${data.summary.avgFoodMargin}% avg margin`}
          color="#10B981"
          icon="Restaurant"
        />
        <StatCard
          label="Weekly Bar Profit"
          value={formatCOP(data.summary.weekBarProfit)}
          sub={`${data.summary.avgBarMargin}% avg margin`}
          color="#8B5CF6"
          icon="Drink"
        />
        <StatCard
          label="Total Weekly"
          value={formatCOP(data.summary.weekTotalProfit)}
          sub="Combined F&B"
          color="#0066CC"
          icon="Chart"
        />
        <StatCard
          label="Transport Cost"
          value={formatCOP(data.summary.weekTransportCost)}
          sub="Weekly boat + labor"
          color="#F59E0B"
          icon="Boat"
        />
        <StatCard
          label="Menu Items"
          value={String(data.summary.totalItems)}
          sub={`${data.summary.foodItems} food, ${data.summary.drinkItems} drinks`}
          color="#64748B"
          icon="List"
        />
      </div>

      {/* Filters and Transport Toggle */}
      <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
        <div className="flex gap-1.5">
          {(["all", "food", "drinks"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                filter === f
                  ? "bg-[#0A0A0F] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f === "all"
                ? "All Items"
                : f === "food"
                  ? "Food Only"
                  : "Drinks Only"}
            </button>
          ))}
        </div>

        <div className="bg-amber-50 rounded-xl px-4 py-2 border border-amber-200 flex items-center gap-3">
          <span className="text-xs text-slate-900">Transport Cost Layer</span>
          <button
            onClick={() => setShowTransport(!showTransport)}
            className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${
              showTransport
                ? "bg-amber-500 text-[#0A0A0F]"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            {showTransport ? "ON - Real Margins" : "OFF - Ingredient Only"}
          </button>
        </div>
      </div>

      {/* Dish selector - ranked by weekly profit */}
      <div className="flex gap-2 flex-wrap mb-4">
        {sorted.slice(0, 12).map((d, rank) => {
          const marginPct = Number(d.margin_pct);
          const weeklyProfit = Number(d.weekly_profit);
          return (
            <button
              key={d.menu_item_id}
              onClick={() => setSelected(d)}
              className={`p-3 rounded-xl border text-left min-w-[130px] transition-all ${
                selected?.menu_item_id === d.menu_item_id
                  ? "border-[#00B4FF] bg-[#00B4FF]/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-[9px] text-slate-500 font-bold">
                #{rank + 1} WEEKLY PROFIT
              </div>
              <div className="text-[11px] font-bold text-slate-900 mt-0.5 truncate">
                {d.name}
              </div>
              <div className="flex gap-2 mt-1 items-baseline">
                <span
                  className="text-sm font-extrabold"
                  style={{ color: getMarginColor(marginPct) }}
                >
                  {marginPct}%
                </span>
                <span className="text-[10px] text-slate-500">
                  ${(weeklyProfit / 1000).toFixed(0)}K/wk
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected item detail */}
      {selected && (
        <>
          {/* Stats row */}
          <div className="flex gap-3 flex-wrap mb-5">
            <StatCard
              label="Menu Price"
              value={formatCOP(Number(selected.price))}
              sub="COP"
              color="#0A0A0F"
              icon="Money"
            />
            <StatCard
              label="Ingredient Cost"
              value={formatCOP(Number(selected.ingredient_cost))}
              sub="COP per plate"
              color="#EF4444"
              icon="Food"
            />
            {showTransport && (
              <StatCard
                label="Transport Cost"
                value={formatCOP(Number(selected.transport_cost))}
                sub="per plate to island"
                color="#F59E0B"
                icon="Boat"
              />
            )}
            <StatCard
              label="Real Margin"
              value={`${selectedMarginPct}%`}
              sub={`${formatCOP(selectedMargin)} profit/plate`}
              color={getMarginColor(selectedMarginPct)}
              icon="Chart"
            />
            <StatCard
              label="Weekly Profit"
              value={formatCOP(Number(selected.weekly_profit))}
              sub={`${selected.orders_this_week} orders/week`}
              color="#0066CC"
              icon="Fire"
            />
          </div>

          {/* Cost Breakdown Visual */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
            <h3 className="font-bold text-slate-900 mb-4">Cost Breakdown</h3>
            <div className="flex gap-4 items-center">
              <div className="flex-1">
                <div className="h-8 rounded-lg overflow-hidden flex">
                  <div
                    className="bg-emerald-500"
                    style={{
                      width: `${(selectedMargin / Number(selected.price)) * 100}%`,
                    }}
                    title={`Profit: ${formatCOP(selectedMargin)}`}
                  />
                  <div
                    className="bg-rose-500"
                    style={{
                      width: `${(Number(selected.ingredient_cost) / Number(selected.price)) * 100}%`,
                    }}
                    title={`Ingredients: ${formatCOP(Number(selected.ingredient_cost))}`}
                  />
                  {showTransport && (
                    <div
                      className="bg-amber-500"
                      style={{
                        width: `${(Number(selected.transport_cost) / Number(selected.price)) * 100}%`,
                      }}
                      title={`Transport: ${formatCOP(Number(selected.transport_cost))}`}
                    />
                  )}
                </div>
                <div className="flex justify-between text-xs mt-2 text-slate-600">
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-emerald-500 rounded" />
                    Profit ({selectedMarginPct}%)
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-3 h-3 bg-rose-500 rounded" />
                    Ingredients
                  </span>
                  {showTransport && (
                    <span className="flex items-center gap-1">
                      <span className="w-3 h-3 bg-amber-500 rounded" />
                      Transport
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-black text-slate-900">
                  {formatCOP(Number(selected.price))}
                </div>
                <div className="text-xs text-slate-500">Menu Price</div>
              </div>
            </div>
          </div>

          {/* Transport Impact Note */}
          {showTransport && (
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <div className="text-xs font-extrabold text-[#0066CC] mb-2">
                TRANSPORT IMPACT ON THIS DISH
              </div>
              <div className="text-xs text-slate-900 leading-relaxed">
                Without transport:{" "}
                <strong>
                  {Math.round(
                    ((Number(selected.price) -
                      Number(selected.ingredient_cost)) /
                      Number(selected.price)) *
                      100,
                  )}
                  % margin
                </strong>{" "}
                (
                {formatCOP(
                  Number(selected.price) - Number(selected.ingredient_cost),
                )}{" "}
                profit) With transport:{" "}
                <strong>{selectedMarginPct}% margin</strong> (
                {formatCOP(selectedMargin)} profit).{" "}
                <strong className="text-rose-600">
                  Transport eats {formatCOP(Number(selected.transport_cost))}{" "}
                  COP per plate
                </strong>{" "}
                - that&apos;s{" "}
                {formatCOP(
                  Number(selected.transport_cost) * selected.orders_this_week,
                )}{" "}
                COP/week on this dish alone.
              </div>
            </div>
          )}
        </>
      )}

      {/* Full Table */}
      <div className="mt-6 bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">
            All Items ({filteredItems.length})
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#0A0A0F] text-white text-xs">
                <th className="px-4 py-3 text-left">Item</th>
                <th className="px-4 py-3 text-left">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-right">Cost</th>
                <th className="px-4 py-3 text-right">Transport</th>
                <th className="px-4 py-3 text-right">Margin</th>
                <th className="px-4 py-3 text-right">Orders/Wk</th>
                <th className="px-4 py-3 text-right">Weekly Profit</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((item, idx) => {
                const marginPct = Number(item.margin_pct);
                return (
                  <tr
                    key={item.menu_item_id}
                    className={`border-b border-slate-100 cursor-pointer hover:bg-slate-50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-slate-25"
                    }`}
                    onClick={() => setSelected(item)}
                  >
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900">
                        {item.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {item.name_es}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 capitalize">
                      {item.category.replace("_", " ")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {formatCOP(Number(item.price))}
                    </td>
                    <td className="px-4 py-3 text-right text-rose-600">
                      {formatCOP(Number(item.ingredient_cost))}
                    </td>
                    <td className="px-4 py-3 text-right text-amber-600">
                      {formatCOP(Number(item.transport_cost))}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span
                        className="font-bold"
                        style={{ color: getMarginColor(marginPct) }}
                      >
                        {marginPct}%
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {item.orders_this_week}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                      {formatCOP(Number(item.weekly_profit))}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
