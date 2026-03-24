"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { key: "tasks", label: "Tareas", href: "/staff/tasks", icon: "📋" },
  { key: "bot", label: "Asistente", href: "/staff/bot", icon: "🤖" },
  {
    key: "inventory",
    label: "Inventario",
    href: "/staff/inventory",
    icon: "📦",
  },
  {
    key: "checklist",
    label: "Checklists",
    href: "/staff/checklist",
    icon: "✅",
  },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Don't show nav on login page
  if (pathname === "/staff/login") {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800 px-4 py-3 border-b border-slate-700 sticky top-0 z-50">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-xs font-black">
              TVC
            </div>
            <div>
              <div className="text-sm font-bold">Portal del Personal</div>
              <div className="text-[10px] text-cyan-400">
                Tiny Village Cartagena
              </div>
            </div>
          </div>
          <Link
            href="/staff/login"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Salir
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="p-4 pb-24">{children}</main>

      {/* Bottom Navigation (Mobile-first) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-800 border-t border-slate-700 px-2 py-2 safe-area-bottom">
        <div className="flex justify-around">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg transition-all ${
                  isActive
                    ? "bg-cyan-500/20 text-cyan-400"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
