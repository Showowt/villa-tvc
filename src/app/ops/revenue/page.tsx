"use client";

import { useState } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { UPSELLS } from "@/lib/ops/data";
import { calcUpsell, freqMultiplier } from "@/lib/ops/calculations";

const fmt = (n: number) => n.toLocaleString();

const TYPES = [
  "all",
  "excursion",
  "boating",
  "event",
  "partner",
  "transport",
  "opportunity",
] as const;

export default function RevenuePage() {
  const [filter, setFilter] = useState<(typeof TYPES)[number]>("all");

  const filtered =
    filter === "all" ? UPSELLS : UPSELLS.filter((u) => u.type === filter);

  // Weekly calculations
  const weeklyOwned = UPSELLS.filter(
    (u) => !u.isPartner && u.type !== "opportunity",
  ).reduce((s, u) => {
    const c = calcUpsell(u);
    return s + c.profit * freqMultiplier(u.frequency);
  }, 0);

  const weeklyCommissions = UPSELLS.filter((u) => u.isPartner).reduce(
    (s, u) => {
      const c = calcUpsell(u);
      return s + c.commission * freqMultiplier(u.frequency);
    },
    0,
  );

  const weeklyOpportunity = UPSELLS.filter(
    (u) => u.type === "opportunity",
  ).reduce((s, u) => {
    return s + Math.round((u.price * u.commission) / 100) * 5; // assume 5/week if partnered
  }, 0);

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          🚀 Revenue Maximizer — Upsells & Commissions
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Every revenue stream beyond rooms: excursions, boating, events,
          partner commissions, and untapped opportunities.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap mb-4">
        <StatCard
          label="Weekly Upsell Profit"
          value={`$${(weeklyOwned / 1000).toFixed(0)}K`}
          sub="TVC-owned services"
          color="#10B981"
          icon="💰"
        />
        <StatCard
          label="Weekly Commissions"
          value={`$${(weeklyCommissions / 1000).toFixed(0)}K`}
          sub="Partner referrals"
          color="#8B5CF6"
          icon="🤝"
        />
        <StatCard
          label="Untapped Opportunity"
          value={`$${(weeklyOpportunity / 1000).toFixed(0)}K`}
          sub="If new partners activated"
          color="#F59E0B"
          icon="🔓"
        />
        <StatCard
          label="Total Revenue Potential"
          value={`$${((weeklyOwned + weeklyCommissions + weeklyOpportunity) / 1000).toFixed(0)}K`}
          sub="per week, all sources"
          color="#0066CC"
          icon="🚀"
        />
      </div>

      {/* Type filter */}
      <div className="flex gap-1.5 flex-wrap mb-4">
        {TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setFilter(t)}
            className={`px-3 py-1.5 rounded-lg text-[11px] font-bold capitalize transition-all ${
              filter === t
                ? "bg-[#0A0A0F] text-white"
                : "bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
          >
            {t === "all" ? "All Services" : t}
          </button>
        ))}
      </div>

      {/* Services grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map((u) => {
          const c = calcUpsell(u);
          const isOpp = u.type === "opportunity";
          return (
            <div
              key={u.id}
              className={`bg-white rounded-xl p-4 border relative overflow-hidden ${
                isOpp ? "border-amber-300" : "border-slate-200"
              }`}
            >
              {isOpp && (
                <div className="absolute top-0 right-0 bg-amber-500 text-[#0A0A0F] text-[9px] font-extrabold px-2.5 py-1 rounded-bl-lg tracking-wide">
                  OPPORTUNITY
                </div>
              )}

              <div className="flex justify-between items-start">
                <div>
                  <div className="text-2xl mb-2">{u.emoji}</div>
                  <div className="text-sm font-extrabold text-slate-900">
                    {u.name}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {u.type.toUpperCase()} • {u.frequency}
                  </div>
                </div>
              </div>

              <div className="flex gap-4 mt-3">
                <div>
                  <div className="text-[9px] text-slate-500 font-semibold">
                    PRICE
                  </div>
                  <div className="text-base font-extrabold text-slate-900">
                    ${fmt(u.price)}
                  </div>
                </div>
                {u.isPartner || isOpp ? (
                  <div>
                    <div className="text-[9px] text-purple-600 font-semibold">
                      COMMISSION
                    </div>
                    <div className="text-base font-extrabold text-purple-600">
                      {u.commission}% = ${fmt(c.commission)}
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <div className="text-[9px] text-slate-500 font-semibold">
                        COST
                      </div>
                      <div className="text-base font-extrabold text-rose-600">
                        ${fmt(c.cost)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-emerald-600 font-semibold">
                        PROFIT
                      </div>
                      <div className="text-base font-extrabold text-emerald-600">
                        ${fmt(c.profit)}
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Margin bar */}
              <div className="mt-3 h-1.5 bg-slate-100 rounded overflow-hidden">
                <div
                  className={`h-full rounded ${u.isPartner || isOpp ? "bg-purple-500" : "bg-emerald-500"}`}
                  style={{
                    width: `${u.isPartner ? u.commission * 3 : Math.round((c.profit / u.price) * 100)}%`,
                  }}
                />
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {u.isPartner
                  ? `${u.commission}% commission per referral`
                  : `${Math.round((c.profit / u.price) * 100)}% margin`}
                {u.partnerName && ` • Partner: ${u.partnerName}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Upsell strategy callout */}
      <div className="mt-6 bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] rounded-xl p-6">
        <div className="text-[#00D4FF] text-[11px] font-bold tracking-widest mb-2">
          💡 UPSELL INTELLIGENCE
        </div>
        <div className="text-white text-sm font-bold leading-relaxed mb-4">
          "Elegantly and trustworthy" — The Villa bot suggests experiences
          naturally based on guest profile, not hard sells.
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              time: "🌅 Day 1 Evening",
              script:
                'Bot suggests Sunset Bay Tour after check-in: "The sunset tonight is going to be incredible — would you like us to arrange a boat?"',
              price: "$200K",
            },
            {
              time: "🏝️ Day 2 Morning",
              script:
                'Bot mentions Rosario Islands over breakfast: "A lot of guests love the island trip — want me to check availability?"',
              price: "$350K",
            },
            {
              time: "🕯️ Final Night",
              script:
                'Bot offers private dinner: "For your last night, our chef can do something special — interested?"',
              price: "$235K",
            },
          ].map((item) => (
            <div
              key={item.time}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="text-[#00B4FF] text-xs font-extrabold mb-2">
                {item.time}
              </div>
              <div className="text-white/70 text-[11px] leading-relaxed">
                {item.script}
              </div>
              <div className="text-emerald-400 text-sm font-extrabold mt-2">
                Potential: {item.price} COP/guest
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
