"use client";

import { StatCard } from "@/components/ops/StatCard";
import { DISHES } from "@/lib/ops/data";
import { calculateWeeklyTotals } from "@/lib/ops/calculations";

const FEATURES = [
  {
    icon: "📅",
    title: "Daily Occupancy Engine",
    desc: "Per-day guest tracking with purchase windows",
  },
  {
    icon: "🤖",
    title: "Staff AI Bot",
    desc: "24/7 operational knowledge in Spanish",
  },
  {
    icon: "🧹",
    title: "Housekeeping QC",
    desc: "Checklists + photo verification",
  },
  {
    icon: "💰",
    title: "Dish P&L + Transport",
    desc: "Real margins including island logistics",
  },
  { icon: "📖", title: "Recipe Library", desc: "SOPs with allergy logic" },
  {
    icon: "⭐",
    title: "Staff Performance",
    desc: "Points, rewards, accountability",
  },
  { icon: "🌐", title: "Translation Bridge", desc: "ES↔EN↔FR real-time" },
  { icon: "📊", title: "Owner Dashboard", desc: "One screen to run TVC" },
];

const V2_FEATURES = [
  {
    icon: "📅",
    title: "Daily Occupancy Calendar",
    desc: "Occupancy changes every day. Now the calculator tracks per-day, with check-ins/outs, peak days, and variable purchase windows.",
  },
  {
    icon: "🚤",
    title: "Transport Cost Layer",
    desc: "Every ingredient costs more on an island. Boat fuel + staff time now factored into real dish margins.",
  },
  {
    icon: "🧮",
    title: "Smart Purchase Windows",
    desc: "Pick 3, 5, 7, or 14-day windows. System calculates exact quantities and optimal trip batching.",
  },
];

export default function OpsOverviewPage() {
  const { profit, transport } = calculateWeeklyTotals(DISHES);

  return (
    <div>
      {/* Stats Row */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label="Weekly Food Profit"
          value={`$${Math.round(profit / 1000)}K`}
          sub="With transport costs"
          color="#10B981"
          icon="📈"
        />
        <StatCard
          label="Weekly Transport Hit"
          value={`$${Math.round(transport / 1000)}K`}
          sub="Hidden cost per plate"
          color="#F59E0B"
          icon="🚤"
        />
        <StatCard
          label="Staff Questions/Day"
          value="~50"
          sub="Currently → Akil"
          color="#EF4444"
          icon="📱"
        />
        <StatCard
          label="Akil Time Saved"
          value="15-20 hrs"
          sub="per week"
          color="#0066CC"
          icon="⏰"
        />
      </div>

      {/* What's New */}
      <div className="bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] rounded-2xl p-7 mb-5">
        <div className="text-[#00D4FF] text-[11px] font-bold tracking-widest mb-1.5">
          WHAT&apos;S NEW IN v2.0
        </div>
        <h2 className="text-white text-xl font-extrabold leading-tight mb-4">
          Daily occupancy calendar + transport costs = real numbers, not guesses
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {V2_FEATURES.map((feature) => (
            <div
              key={feature.title}
              className="bg-white/5 rounded-xl p-4 border border-white/10"
            >
              <div className="text-2xl mb-1.5">{feature.icon}</div>
              <div className="text-white text-[13px] font-extrabold mb-1">
                {feature.title}
              </div>
              <div className="text-slate-400 text-[11px] leading-relaxed">
                {feature.desc}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
        {FEATURES.map((feature) => (
          <div
            key={feature.title}
            className="bg-white rounded-xl p-4 border border-slate-200"
          >
            <div className="text-2xl mb-1.5">{feature.icon}</div>
            <div className="text-[13px] font-extrabold text-slate-900 mb-0.5">
              {feature.title}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {feature.desc}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
