"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
  icon?: string;
}

export function StatCard({
  label,
  value,
  sub,
  color = "#00B4FF",
  icon,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 flex-1 min-w-[150px] shadow-sm">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-500 font-semibold">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <div
        className="text-2xl font-extrabold mt-1.5 tracking-tight"
        style={{ color }}
      >
        {value}
      </div>
      {sub && <div className="text-[11px] text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
