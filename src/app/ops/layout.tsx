"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ops/Badge";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";

const NAV_ITEMS = [
  { key: "overview", labelKey: "nav.overview", href: "/ops", icon: "📊" },
  { key: "demo", labelKey: "nav.demo", href: "/ops/demo", icon: "🎓" },
  {
    key: "bookings",
    labelKey: "nav.bookings",
    href: "/ops/bookings",
    icon: "📋",
  },
  {
    key: "deposits",
    labelKey: "nav.deposits",
    href: "/ops/deposits",
    icon: "💳",
  },
  {
    key: "welcome-guide",
    labelKey: "nav.welcome_guide",
    href: "/ops/welcome-guide",
    icon: "📄",
  },
  {
    key: "requirements",
    labelKey: "nav.requirements",
    href: "/ops/requirements",
    icon: "📝",
  },
  { key: "fb-pl", labelKey: "nav.fb_pl", href: "/ops/fb-pl", icon: "💰" },
  { key: "revenue", labelKey: "nav.revenue", href: "/ops/revenue", icon: "🚀" },
  {
    key: "occupancy",
    labelKey: "nav.occupancy",
    href: "/ops/occupancy",
    icon: "📅",
  },
  {
    key: "groups",
    labelKey: "nav.groups",
    href: "/ops/groups",
    icon: "👥",
  },
  {
    key: "schedule",
    labelKey: "nav.schedule",
    href: "/ops/schedule",
    icon: "📆",
  },
  {
    key: "staff-bot",
    labelKey: "nav.staff_bot",
    href: "/ops/staff-bot",
    icon: "🤖",
  },
  {
    key: "booking-bot",
    labelKey: "nav.booking_bot",
    href: "/ops/booking-bot",
    icon: "🤝",
  },
  {
    key: "housekeeping",
    labelKey: "nav.housekeeping",
    href: "/ops/housekeeping",
    icon: "🧹",
  },
  {
    key: "cleaning-priority",
    labelKey: "nav.cleaning_priority",
    href: "/ops/cleaning-priority",
    icon: "⏱️",
  },
  {
    key: "maintenance",
    labelKey: "nav.maintenance",
    href: "/ops/maintenance",
    icon: "🔧",
  },
  {
    key: "maintenance-schedule",
    labelKey: "nav.maintenance_schedule",
    href: "/ops/maintenance/schedule",
    icon: "📆",
  },
  {
    key: "preventive",
    labelKey: "nav.preventive",
    href: "/ops/preventive-maintenance",
    icon: "🛡️",
  },
  {
    key: "suppliers",
    labelKey: "nav.suppliers",
    href: "/ops/suppliers",
    icon: "📦",
  },
  {
    key: "vendors",
    labelKey: "nav.vendors",
    href: "/ops/vendors",
    icon: "🛠️",
  },
  {
    key: "property-map",
    labelKey: "nav.property_map",
    href: "/ops/property-map",
    icon: "🗺️",
  },
  {
    key: "reports",
    labelKey: "nav.reports",
    href: "/ops/reports",
    icon: "📈",
  },
];

function LanguageToggle() {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex items-center gap-1 bg-[#1a1a2e] rounded-lg p-1">
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          lang === "en"
            ? "bg-[#00B4FF] text-[#0A0A0F]"
            : "text-slate-400 hover:text-white"
        }`}
      >
        🇺🇸 EN
      </button>
      <button
        onClick={() => setLang("es")}
        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          lang === "es"
            ? "bg-[#00B4FF] text-[#0A0A0F]"
            : "text-slate-400 hover:text-white"
        }`}
      >
        🇨🇴 ES
      </button>
    </div>
  );
}

function OpsLayoutContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { t, lang } = useLanguage();

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
                {t("header.title")}
              </div>
              <div className="text-[#00B4FF] text-[10px] font-semibold tracking-wider">
                {t("header.subtitle")}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Badge color="#10B981">{t("header.live")}</Badge>
            <Badge color="#00B4FF">{t("header.modules")}</Badge>
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
              } ${item.key === "demo" ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white" : ""}`}
            >
              {item.icon} {t(item.labelKey)}
            </Link>
          );
        })}
      </nav>

      {/* Content */}
      <main className="p-5 max-w-[1100px] mx-auto">{children}</main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-slate-200 bg-white mt-8">
        <p className="text-[10px] text-slate-500">{t("footer.powered_by")}</p>
      </footer>
    </div>
  );
}

export default function OpsLayout({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <OpsLayoutContent>{children}</OpsLayoutContent>
    </LanguageProvider>
  );
}
