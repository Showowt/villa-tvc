"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ops/Badge";

const NAV_ITEMS = [
  { key: "overview", label: "Overview", href: "/ops", icon: "📊" },
  {
    key: "requirements",
    label: "Requirements",
    href: "/ops/requirements",
    icon: "📋",
  },
  { key: "fb-pl", label: "F&B P&L", href: "/ops/fb-pl", icon: "💰" },
  { key: "revenue", label: "Revenue", href: "/ops/revenue", icon: "🚀" },
  { key: "occupancy", label: "Occupancy", href: "/ops/occupancy", icon: "📅" },
  { key: "staff-bot", label: "Staff Bot", href: "/ops/staff-bot", icon: "🤖" },
  {
    key: "booking-bot",
    label: "Booking Bot",
    href: "/ops/booking-bot",
    icon: "🤝",
  },
  { key: "housekeeping", label: "QC", href: "/ops/housekeeping", icon: "🧹" },
];

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Header */}
      <header className="bg-gradient-to-r from-[#0A0A0F] to-[#1a1a2e] px-5 py-4 border-b-2 border-[#00B4FF]">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00B4FF] to-[#00D4FF] flex items-center justify-center text-[13px] font-black text-[#0A0A0F]">
              TVC
            </div>
            <div>
              <div className="text-white text-base font-extrabold">
                TVC Operations Intelligence
              </div>
              <div className="text-[#00B4FF] text-[10px] font-semibold tracking-wider">
                MACHINEMIND • v3.0 — FULL PLATFORM
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Badge color="#10B981">LIVE</Badge>
            <Badge color="#00B4FF">8 MODULES</Badge>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white px-3 py-1.5 border-b border-slate-200 flex gap-1 overflow-x-auto">
        {NAV_ITEMS.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/ops" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`px-3 py-2 rounded-lg text-[11px] font-bold tracking-wide whitespace-nowrap transition-all ${
                isActive
                  ? "bg-[#0A0A0F] text-white"
                  : "text-slate-500 hover:bg-slate-100"
              }`}
            >
              {item.icon} {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="p-5 max-w-[1100px] mx-auto">{children}</main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 bg-white mt-8">
        <p className="text-[10px] text-slate-500">
          MachineMind AI Infrastructure — TVC Operations Intelligence v3.0
        </p>
      </footer>
    </div>
  );
}
