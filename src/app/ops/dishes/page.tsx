"use client";

import { useState } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { DISHES } from "@/lib/ops/data";
import { calculateDishPL } from "@/lib/ops/calculations";
import type { Dish } from "@/lib/ops/types";

export default function DishesPage() {
  const [showTransport, setShowTransport] = useState(true);
  const [selected, setSelected] = useState<Dish>(DISHES[0]);

  const calcDish = (d: Dish) => calculateDishPL(d, showTransport);

  const sorted = [...DISHES].sort(
    (a, b) => calcDish(b).weeklyProfit - calcDish(a).weeklyProfit,
  );
  const sel = calcDish(selected);
  const marginWithout = Math.round(
    ((selected.price - sel.ingCost) / selected.price) * 100,
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          💰 Dish P&L with Transport Layer
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Real margins per plate — including the hidden cost of getting
          ingredients to the island. Toggle transport on/off to see the
          difference.
        </p>
      </div>

      {/* Transport toggle */}
      <div className="bg-amber-50 rounded-xl p-3 mb-4 border border-amber-200 flex justify-between items-center flex-wrap gap-2">
        <div className="text-xs text-slate-900">
          🚤 <strong>Transport Cost Layer</strong> — Adds boat fuel + staff time
          per ingredient weight to island
        </div>
        <button
          onClick={() => setShowTransport(!showTransport)}
          className={`px-4 py-1.5 rounded-lg font-bold text-xs transition-all ${
            showTransport
              ? "bg-amber-500 text-[#0A0A0F]"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          {showTransport ? "ON — Real Margins" : "OFF — Ingredient Only"}
        </button>
      </div>

      {/* Dish selector - ranked by weekly profit */}
      <div className="flex gap-2 flex-wrap mb-4">
        {sorted.map((d, rank) => {
          const c = calcDish(d);
          return (
            <button
              key={d.id}
              onClick={() => setSelected(d)}
              className={`p-3 rounded-xl border text-left min-w-[130px] transition-all ${
                selected.id === d.id
                  ? "border-[#00B4FF] bg-[#00B4FF]/10"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <div className="text-[9px] text-slate-500 font-bold">
                #{rank + 1} WEEKLY PROFIT
              </div>
              <div className="text-[11px] font-bold text-slate-900 mt-0.5">
                {d.name}
              </div>
              <div className="flex gap-2 mt-1 items-baseline">
                <span
                  className="text-sm font-extrabold"
                  style={{
                    color:
                      c.marginPct > 60
                        ? "#10B981"
                        : c.marginPct > 45
                          ? "#F59E0B"
                          : "#EF4444",
                  }}
                >
                  {c.marginPct}%
                </span>
                <span className="text-[10px] text-slate-500">
                  ${(c.weeklyProfit / 1000).toFixed(0)}K/wk
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label="Menu Price"
          value={`$${selected.price.toLocaleString()}`}
          sub="COP"
          color="#0A0A0F"
          icon="💰"
        />
        <StatCard
          label="Ingredient Cost"
          value={`$${sel.ingCost.toLocaleString()}`}
          sub="COP per plate"
          color="#EF4444"
          icon="🥘"
        />
        {showTransport && (
          <StatCard
            label="Transport Cost"
            value={`$${sel.transCost.toLocaleString()}`}
            sub="per plate to island"
            color="#F59E0B"
            icon="🚤"
          />
        )}
        <StatCard
          label="Real Margin"
          value={`${sel.marginPct}%`}
          sub={`$${sel.margin.toLocaleString()} profit/plate`}
          color={
            sel.marginPct > 60
              ? "#10B981"
              : sel.marginPct > 45
                ? "#F59E0B"
                : "#EF4444"
          }
          icon="📊"
        />
        <StatCard
          label="Weekly Profit"
          value={`$${sel.weeklyProfit.toLocaleString()}`}
          sub={`${selected.ordersPerWeek} orders/week`}
          color="#0066CC"
          icon="🔥"
        />
      </div>

      {/* Ingredient breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div
          className={`grid ${showTransport ? "grid-cols-5" : "grid-cols-4"} px-3.5 py-2.5 bg-[#0A0A0F] text-white text-[10px] font-bold tracking-wide`}
        >
          <div className="col-span-1">INGREDIENT</div>
          <div>QTY</div>
          <div>COST</div>
          {showTransport && <div>🚤 TRANSPORT</div>}
          <div>% OF TOTAL</div>
        </div>

        {/* Rows */}
        {selected.ingredients.map((ing, i) => {
          const pct = Math.round(
            ((ing.cost + (showTransport ? ing.transport : 0)) / sel.totalCost) *
              100,
          );
          return (
            <div
              key={ing.name}
              className={`grid ${showTransport ? "grid-cols-5" : "grid-cols-4"} px-3.5 py-2 text-xs border-b border-slate-100 ${
                i % 2 === 0 ? "bg-slate-50" : "bg-white"
              }`}
            >
              <div className="font-semibold text-slate-900">{ing.name}</div>
              <div className="text-slate-500">{ing.qty}</div>
              <div className="font-bold text-slate-900">
                ${ing.cost.toLocaleString()}
              </div>
              {showTransport && (
                <div className="font-semibold text-amber-600">
                  ${ing.transport.toLocaleString()}
                </div>
              )}
              <div>
                <div
                  className={`h-1.5 rounded mb-0.5 ${pct > 35 ? "bg-rose-500" : "bg-[#00B4FF]"}`}
                  style={{ width: `${pct}%`, minWidth: 4 }}
                />
                <span className="text-[10px] text-slate-500">{pct}%</span>
              </div>
            </div>
          );
        })}

        {/* Total row */}
        <div
          className={`grid ${showTransport ? "grid-cols-5" : "grid-cols-4"} px-3.5 py-3 bg-emerald-50 border-t-2 border-emerald-500 font-extrabold text-xs`}
        >
          <div className="text-emerald-600">PROFIT PER PLATE</div>
          <div></div>
          <div className="text-emerald-600">${sel.margin.toLocaleString()}</div>
          {showTransport && <div></div>}
          <div className="text-emerald-600">{sel.marginPct}%</div>
        </div>
      </div>

      {/* Transport Impact */}
      {showTransport && (
        <div className="mt-4 bg-blue-50 rounded-xl p-4 border border-blue-200">
          <div className="text-xs font-extrabold text-[#0066CC] mb-2">
            💡 TRANSPORT IMPACT ON THIS DISH
          </div>
          <div className="text-xs text-slate-900 leading-relaxed">
            Without transport: <strong>{marginWithout}% margin</strong> ($
            {(selected.price - sel.ingCost).toLocaleString()} profit) → With
            transport: <strong>{sel.marginPct}% margin</strong> ($
            {sel.margin.toLocaleString()} profit).{" "}
            <strong className="text-rose-600">
              Transport eats ${sel.transCost.toLocaleString()} COP per plate
            </strong>{" "}
            — that&apos;s $
            {(sel.transCost * selected.ordersPerWeek).toLocaleString()} COP/week
            on this dish alone.
          </div>
        </div>
      )}
    </div>
  );
}
