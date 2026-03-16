"use client";

import { useState } from "react";
import { Badge } from "@/components/ops/Badge";
import { VILLA_CHECKLIST, VILLAS } from "@/lib/ops/data";
import type { VillaTask } from "@/lib/ops/types";

export default function HousekeepingPage() {
  const [selectedVilla, setSelectedVilla] = useState(VILLAS[2]); // Villa 3
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const allTasks = Object.values(VILLA_CHECKLIST).flat();
  const done = Object.values(checked).filter(Boolean).length;
  const pct = Math.round((done / allTasks.length) * 100);
  const photoReq = allTasks.filter((t) => t.photo).length;
  const photosDone = allTasks.filter((t) => t.photo && checked[t.task]).length;

  const handleVillaChange = (villaId: number) => {
    const villa = VILLAS.find((v) => v.id === villaId);
    if (villa) {
      setSelectedVilla(villa);
      setChecked({}); // Reset checklist
    }
  };

  const sectionLabels: Record<string, string> = {
    bedroom: "🛏️ Bedroom",
    bathroom: "🚿 Bathroom",
    living: "🏠 Living",
    patio: "🌿 Patio",
    final: "✨ Final Walk",
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          🧹 Housekeeping Quality Control
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Photo-verified checklists. Villa is &quot;Guest Ready&quot; only when
          100% verified. No more Akil double-checking.
        </p>
      </div>

      {/* Villa selector + badges */}
      <div className="flex gap-3 mb-4 flex-wrap items-center">
        <select
          value={selectedVilla.id}
          onChange={(e) => handleVillaChange(parseInt(e.target.value))}
          className="px-3.5 py-2 rounded-xl border border-slate-200 text-[13px] font-semibold outline-none focus:border-[#00B4FF]"
        >
          {VILLAS.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name} — {v.type}
            </option>
          ))}
        </select>

        <Badge
          color={pct === 100 ? "#10B981" : pct > 50 ? "#F59E0B" : "#EF4444"}
        >
          {pct}% Complete
        </Badge>
        <Badge color="#0066CC">
          📸 {photosDone}/{photoReq} photos
        </Badge>
      </div>

      {/* Progress bar */}
      <div
        className={`rounded-xl p-3.5 mb-4 border ${
          pct === 100
            ? "bg-emerald-50 border-emerald-200"
            : "bg-amber-50 border-amber-200"
        }`}
      >
        <div className="h-2 bg-slate-200 rounded overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-500 ${
              pct === 100
                ? "bg-emerald-500"
                : pct > 50
                  ? "bg-amber-500"
                  : "bg-rose-500"
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <div
          className={`text-xs font-bold mt-1.5 ${
            pct === 100 ? "text-emerald-600" : "text-amber-600"
          }`}
        >
          {pct === 100
            ? "✅ VILLA READY — Send to Akil for approval"
            : `${allTasks.length - done} items remaining`}
        </div>
      </div>

      {/* Checklists by section */}
      {Object.entries(VILLA_CHECKLIST).map(
        ([section, tasks]: [string, VillaTask[]]) => (
          <div key={section} className="mb-3.5">
            <div className="text-xs font-extrabold text-slate-900 uppercase tracking-wide mb-1.5 pb-1 border-b border-slate-200">
              {sectionLabels[section] || section}
            </div>
            {tasks.map((task) => (
              <label
                key={task.task}
                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg mb-0.5 cursor-pointer transition-colors ${
                  checked[task.task] ? "bg-emerald-50" : "hover:bg-slate-50"
                }`}
              >
                <input
                  type="checkbox"
                  checked={!!checked[task.task]}
                  onChange={() =>
                    setChecked((prev) => ({
                      ...prev,
                      [task.task]: !prev[task.task],
                    }))
                  }
                  className="w-4 h-4 accent-emerald-500"
                />
                <span
                  className={`flex-1 text-xs ${
                    checked[task.task]
                      ? "text-slate-400 line-through"
                      : "text-slate-900"
                  }`}
                >
                  {task.task}
                </span>
                {task.photo && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                      checked[task.task]
                        ? "bg-emerald-100 text-emerald-600"
                        : "bg-rose-100 text-rose-600"
                    }`}
                  >
                    📸 FOTO
                  </span>
                )}
              </label>
            ))}
          </div>
        ),
      )}

      {/* Submit button when complete */}
      {pct === 100 && (
        <div className="mt-4 p-4 bg-emerald-50 rounded-xl border border-emerald-200 flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-sm font-extrabold text-emerald-700">
              ✅ All tasks complete for {selectedVilla.name}
            </div>
            <div className="text-xs text-slate-500">
              {photosDone} verification photos required
            </div>
          </div>
          <button className="px-5 py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm hover:bg-emerald-600 transition-colors">
            Send to Akil for Approval
          </button>
        </div>
      )}
    </div>
  );
}
