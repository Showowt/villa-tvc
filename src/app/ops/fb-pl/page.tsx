"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type DishPL = Tables<"dish_pl">;

const fmt = (n: number) => n.toLocaleString();

export default function FBPLPage() {
  const [view, setView] = useState<"food" | "bar">("food");
  const [withTransport, setWithTransport] = useState(true);
  const [dishes, setDishes] = useState<DishPL[]>([]);
  const [selected, setSelected] = useState<DishPL | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDishes();
  }, []);

  useEffect(() => {
    // Set first item as selected when view changes
    const filtered = getFilteredItems();
    if (filtered.length > 0) {
      setSelected(filtered[0]);
    }
  }, [view, dishes]);

  const loadDishes = async () => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("dish_pl")
      .select("*")
      .order("name_es");

    if (error) {
      console.error("[loadDishes]", error);
      setLoading(false);
      return;
    }

    setDishes(data || []);
    setLoading(false);
  };

  const getFilteredItems = () => {
    const foodCategories = ["breakfast", "lunch", "dinner", "snack"];
    const barCategories = [
      "cocktail",
      "mocktail",
      "beer",
      "wine",
      "spirit",
      "soft_drink",
    ];

    return dishes.filter((item) =>
      view === "food"
        ? foodCategories.includes(item.category || "")
        : barCategories.includes(item.category || ""),
    );
  };

  // Calculate margin based on transport toggle
  const calcMargin = (item: DishPL) => {
    const ingredientCost = item.ingredient_cost || 0;
    const transportCost = withTransport ? item.transport_cost || 0 : 0;
    const price = item.price || 0;
    const margin = price - ingredientCost - transportCost;
    const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
    const ordersPerWeek = item.orders_this_week || 0;
    const weeklyProfit = margin * ordersPerWeek;
    return { margin, marginPct, weeklyProfit, transportCost };
  };

  const items = getFilteredItems();
  const sorted = [...items].sort(
    (a, b) => calcMargin(b).weeklyProfit - calcMargin(a).weeklyProfit,
  );

  // Calculate totals
  const totalWeekly = sorted.reduce(
    (sum, item) => sum + calcMargin(item).weeklyProfit,
    0,
  );
  const totalTransport = sorted.reduce(
    (sum, item) =>
      sum + (item.transport_cost || 0) * (item.orders_this_week || 0),
    0,
  );
  const totalOrders = sorted.reduce(
    (sum, item) => sum + (item.orders_this_week || 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  const sel = selected ? calcMargin(selected) : null;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          💰 Food & Beverage Profitability
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Real margins for every dish AND every drink. Toggle transport costs to
          see the island premium. Ranked by weekly profit contribution.
        </p>
      </div>

      {/* Food / Bar toggle */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "food" as const, label: "🍽️ Food P&L" },
          { key: "bar" as const, label: "🍹 Bar P&L" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-5 py-2.5 rounded-xl border-2 text-[13px] font-extrabold transition-all ${
              view === key
                ? "border-[#00B4FF] bg-[#00B4FF]/10 text-[#0066CC]"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setWithTransport(!withTransport)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            withTransport
              ? "bg-amber-500 text-[#0A0A0F]"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          🚤 Transport: {withTransport ? "ON" : "OFF"}
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap mb-4">
        <StatCard
          label={`Weekly ${view === "food" ? "Food" : "Bar"} Profit`}
          value={`$${(totalWeekly / 1000).toFixed(0)}K`}
          sub="COP with transport"
          color="#10B981"
          icon="📈"
        />
        <StatCard
          label="Weekly Transport Cost"
          value={`$${(totalTransport / 1000).toFixed(0)}K`}
          sub="Hidden island logistics"
          color="#F59E0B"
          icon="🚤"
        />
        <StatCard
          label="Items Tracked"
          value={sorted.length}
          sub={view === "food" ? "dishes" : "drinks"}
          color="#0066CC"
          icon="📊"
        />
        <StatCard
          label="Total Weekly Orders"
          value={totalOrders}
          sub="estimated"
          color="#0A0A0F"
          icon="🔥"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-slate-500">
            No {view === "food" ? "food" : "drink"} items found in database
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Add items via the admin panel or database
          </p>
        </div>
      ) : (
        <>
          {/* Ranking table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="grid grid-cols-6 px-3 py-2.5 bg-[#0A0A0F] text-white text-[10px] font-bold tracking-wide">
              <div>#</div>
              <div className="col-span-2">ITEM</div>
              <div>PRICE</div>
              <div>MARGIN</div>
              <div>$/WEEK</div>
            </div>
            {sorted.map((item, rank) => {
              const c = calcMargin(item);
              const isSelected = selected?.menu_item_id === item.menu_item_id;
              return (
                <div
                  key={item.menu_item_id}
                  onClick={() => setSelected(item)}
                  className={`grid grid-cols-6 px-3 py-2.5 text-xs cursor-pointer border-b border-slate-100 transition-all ${
                    isSelected
                      ? "bg-[#00B4FF]/8 border-l-[3px] border-l-[#00B4FF]"
                      : rank % 2 === 0
                        ? "bg-slate-50"
                        : "bg-white"
                  }`}
                >
                  <div
                    className={`font-extrabold ${rank < 3 ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {rank + 1}
                  </div>
                  <div className="col-span-2 font-bold text-slate-900">
                    {item.name_es || item.name}
                  </div>
                  <div className="text-slate-700">${fmt(item.price || 0)}</div>
                  <div
                    className={`font-extrabold ${
                      c.marginPct > 65
                        ? "text-emerald-600"
                        : c.marginPct > 50
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {c.marginPct}%
                  </div>
                  <div className="font-extrabold text-[#0066CC]">
                    ${fmt(c.weeklyProfit)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected item detail */}
          {selected && sel && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {selected.name_es || selected.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selected.category} • {selected.orders_this_week || 0}{" "}
                    orders/week
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-black ${
                      sel.marginPct > 60
                        ? "text-emerald-600"
                        : sel.marginPct > 45
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {sel.marginPct}% margin
                  </div>
                  <div className="text-xs text-slate-500">
                    ${fmt(sel.margin)} profit per{" "}
                    {view === "food" ? "plate" : "drink"}
                  </div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-700">
                    Sale Price
                  </div>
                  <div className="flex-1 h-4 bg-emerald-100 rounded overflow-hidden">
                    <div className="h-full w-full bg-emerald-500 rounded" />
                  </div>
                  <div className="w-20 text-xs font-bold text-slate-900 text-right">
                    ${fmt(selected.price || 0)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-700">
                    Ingredient Cost
                  </div>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded"
                      style={{
                        width: `${Math.min(((selected.ingredient_cost || 0) / (selected.price || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-20 text-xs font-bold text-slate-900 text-right">
                    ${fmt(selected.ingredient_cost || 0)}
                  </div>
                </div>
                {withTransport && (selected.transport_cost || 0) > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-xs font-semibold text-amber-700">
                      🚤 Transport
                    </div>
                    <div className="flex-1 h-4 bg-amber-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded"
                        style={{
                          width: `${Math.min(((selected.transport_cost || 0) / (selected.price || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-20 text-xs font-bold text-amber-700 text-right">
                      ${fmt(selected.transport_cost || 0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Profit summary */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-700">
                  Weekly Profit from {selected.name_es || selected.name}
                </span>
                <span className="text-lg font-black text-emerald-600">
                  ${fmt(sel.weeklyProfit)} COP
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
