"use client";

import { StatCard } from "@/components/ops/StatCard";
import { REQUIREMENTS } from "@/lib/ops/data";

export default function RequirementsPage() {
  const totalItems = REQUIREMENTS.reduce((s, r) => s + r.items.length, 0);
  const builtItems = REQUIREMENTS.reduce(
    (s, r) => s + r.items.filter((i) => i.status === "built").length,
    0,
  );
  const newItems = REQUIREMENTS.reduce(
    (s, r) => s + r.items.filter((i) => i.status === "new").length,
    0,
  );
  const p2Items = REQUIREMENTS.reduce(
    (s, r) => s + r.items.filter((i) => i.status === "phase2").length,
    0,
  );

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          📋 Akil&apos;s Requirements → Mapped to Modules
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Every single item from Akil&apos;s list, mapped to a specific module
          with build status. Green = already built. Blue = building in Phase 1.
          Gray = Phase 2.
        </p>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label="Total Requirements"
          value={totalItems}
          color="#0A0A0F"
          icon="📋"
        />
        <StatCard
          label="Already Built"
          value={builtItems}
          sub={`${Math.round((builtItems / totalItems) * 100)}% coverage`}
          color="#10B981"
          icon="✅"
        />
        <StatCard
          label="New for Phase 1"
          value={newItems}
          sub="Building now"
          color="#00B4FF"
          icon="🔨"
        />
        <StatCard
          label="Phase 2"
          value={p2Items}
          sub="After launch"
          color="#64748B"
          icon="📅"
        />
      </div>

      {/* Requirements by category */}
      {REQUIREMENTS.map((cat) => (
        <div key={cat.cat} className="mb-4">
          <div className="text-xs font-extrabold text-slate-900 tracking-wide pb-2 mb-2 border-b-2 border-[#00B4FF]">
            {cat.cat}
          </div>
          {cat.items.map((item) => (
            <div
              key={item.need}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg mb-1 ${
                item.status === "built"
                  ? "bg-emerald-50"
                  : item.status === "new"
                    ? "bg-[#00B4FF]/5"
                    : "bg-slate-50"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  item.status === "built"
                    ? "bg-emerald-500"
                    : item.status === "new"
                      ? "bg-[#00B4FF]"
                      : "bg-slate-400"
                }`}
              />
              <span className="flex-1 text-xs text-slate-900">{item.need}</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                  item.status === "built"
                    ? "bg-emerald-100 text-emerald-700"
                    : item.status === "new"
                      ? "bg-[#00B4FF]/15 text-[#0066CC]"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {item.status === "built"
                  ? "✅ BUILT"
                  : item.status === "new"
                    ? "🔨 PHASE 1"
                    : "📅 PHASE 2"}
              </span>
              <span className="text-[10px] text-[#0066CC] font-semibold min-w-[130px] text-right">
                → {item.module}
              </span>
            </div>
          ))}
        </div>
      ))}

      {/* Legend */}
      <div className="mt-6 p-4 bg-slate-100 rounded-xl">
        <div className="text-xs font-bold text-slate-700 mb-2">LEGEND</div>
        <div className="flex gap-6 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500" />
            <span className="text-xs text-slate-600">Built & Live</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-[#00B4FF]" />
            <span className="text-xs text-slate-600">Building in Phase 1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-slate-400" />
            <span className="text-xs text-slate-600">Planned for Phase 2</span>
          </div>
        </div>
      </div>
    </div>
  );
}
