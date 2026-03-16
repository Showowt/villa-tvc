"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { DISHES, DRINKS } from "@/lib/ops/data";
import { calcItem, calculateFBTotals } from "@/lib/ops/calculations";
import type { Dish, Drink } from "@/lib/ops/types";

const fmt = (n: number) => n.toLocaleString();

export default function FBPLPage() {
  const [view, setView] = useState<"food" | "bar">("food");
  const [withTransport, setWithTransport] = useState(true);
  const [selected, setSelected] = useState<Dish | Drink | null>(null);

  const items = view === "food" ? DISHES : DRINKS;
  const sorted = [...items].sort(
    (a, b) =>
      calcItem(b, withTransport).weekly - calcItem(a, withTransport).weekly,
  );

  useEffect(() => {
    setSelected(sorted[0]);
  }, [view]);

  if (!selected) return null;

  const sel = calcItem(selected, withTransport);
  const { totalWeekly, totalTransport, totalOrders } = calculateFBTotals(
    items,
    withTransport,
  );

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
          const c = calcItem(item, withTransport);
          const isSelected = selected?.id === item.id;
          return (
            <div
              key={item.id}
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
                {item.name}
              </div>
              <div className="text-slate-700">${fmt(item.price)}</div>
              <div
                className={`font-extrabold ${
                  c.pct > 65
                    ? "text-emerald-600"
                    : c.pct > 50
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              >
                {c.pct}%
              </div>
              <div className="font-extrabold text-[#0066CC]">
                ${fmt(c.weekly)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected item detail */}
      {selected && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <div className="text-lg font-extrabold text-slate-900">
                {selected.name}
              </div>
              <div className="text-xs text-slate-500">
                {selected.category} • {selected.ordersPerWeek} orders/week
              </div>
            </div>
            <div className="text-right">
              <div
                className={`text-2xl font-black ${
                  sel.pct > 60
                    ? "text-emerald-600"
                    : sel.pct > 45
                      ? "text-amber-600"
                      : "text-rose-600"
                }`}
              >
                {sel.pct}% margin
              </div>
              <div className="text-xs text-slate-500">
                ${fmt(sel.margin)} profit per{" "}
                {view === "food" ? "plate" : "drink"}
              </div>
            </div>
          </div>

          {/* Ingredient bars */}
          <div className="space-y-2">
            {selected.ingredients.map((ing) => {
              const total = ing.cost + (withTransport ? ing.transport : 0);
              const pctOfCost = Math.round((total / sel.total) * 100);
              return (
                <div key={ing.name} className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-700 truncate">
                    {ing.name}
                  </div>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div
                      className={`h-full rounded transition-all ${
                        pctOfCost > 40
                          ? "bg-rose-500"
                          : pctOfCost > 20
                            ? "bg-amber-500"
                            : "bg-[#00B4FF]"
                      }`}
                      style={{ width: `${Math.min(pctOfCost * 1.5, 100)}%` }}
                    />
                  </div>
                  <div className="w-20 text-xs font-bold text-slate-900 text-right">
                    ${fmt(total)}
                  </div>
                  {withTransport && ing.transport > 0 && (
                    <div className="w-16 text-[10px] text-amber-600 font-semibold">
                      +${fmt(ing.transport)}🚤
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Profit summary */}
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
            <span className="text-sm font-extrabold text-emerald-700">
              Weekly Profit from {selected.name}
            </span>
            <span className="text-lg font-black text-emerald-600">
              ${fmt(sel.weekly)} COP
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
