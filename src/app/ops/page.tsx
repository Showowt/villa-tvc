"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/ops/StatCard";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import Link from "next/link";

interface DashboardStats {
  todayGuests: number;
  pendingApprovals: number;
  lowStockCount: number;
  staffQuestionsPerDay: number;
  weeklyFoodProfit: number;
  weeklyTransport: number;
  npsScore: number | null;
  totalFeedback: number;
  // New: Waste and staff meal tracking
  dailyWasteCost: number;
  dailyStaffMealCost: number;
  wasteByReason: { reason: string; cost: number; count: number }[];
}

interface WeatherDay {
  date: string;
  temp_max: number;
  temp_min: number;
  description_es: string;
  icon: string;
  rain_probability: number;
  is_good_for_excursions: boolean;
  excursion_warning: string | null;
}

const FEATURES = [
  {
    icon: "📅",
    title: "Daily Occupancy Engine",
    desc: "Per-day guest tracking with purchase windows",
    href: "/ops/occupancy",
  },
  {
    icon: "🤖",
    title: "Staff AI Bot",
    desc: "24/7 operational knowledge in Spanish",
    href: "/ops/staff-bot",
  },
  {
    icon: "🧹",
    title: "Housekeeping QC",
    desc: "Checklists + photo verification",
    href: "/ops/housekeeping",
  },
  {
    icon: "💰",
    title: "Dish P&L + Transport",
    desc: "Real margins including island logistics",
    href: "/ops/fb-pl",
  },
  {
    icon: "📖",
    title: "Recipe Library",
    desc: "SOPs with allergy logic",
    href: "/ops/dishes",
  },
  {
    icon: "⭐",
    title: "Revenue Maximizer",
    desc: "Upsells, excursions, commissions",
    href: "/ops/revenue",
  },
  {
    icon: "📈",
    title: "Financial Dashboard",
    desc: "RevPAR, margins, historical comparisons",
    href: "/ops/financials",
  },
  {
    icon: "🧾",
    title: "Receipt Logging",
    desc: "Log actual costs, track variances",
    href: "/ops/receipts",
  },
  {
    icon: "💵",
    title: "Deposit Tracking",
    desc: "Guest deposits and invoice status",
    href: "/ops/deposits",
  },
  {
    icon: "📊",
    title: "Weekly Reports",
    desc: "Auto-generated weekly summaries",
    href: "/ops/reports",
  },
  {
    icon: "🌐",
    title: "Welcome Guide",
    desc: "Guest welcome information",
    href: "/ops/welcome-guide",
  },
  {
    icon: "📋",
    title: "Requirements",
    desc: "Module status tracker",
    href: "/ops/requirements",
  },
  {
    icon: "🍽️",
    title: "Villa Menu QR",
    desc: "In-villa ordering system",
    href: "/menu/villa1",
  },
  {
    icon: "📉",
    title: "Consumption Analytics",
    desc: "Patterns by nationality, day, time",
    href: "/ops/analytics",
  },
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
  const [stats, setStats] = useState<DashboardStats>({
    todayGuests: 0,
    pendingApprovals: 0,
    lowStockCount: 0,
    staffQuestionsPerDay: 0,
    weeklyFoodProfit: 0,
    weeklyTransport: 0,
    npsScore: null,
    totalFeedback: 0,
    dailyWasteCost: 0,
    dailyStaffMealCost: 0,
    wasteByReason: [],
  });
  const [weather, setWeather] = useState<WeatherDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    loadStats();
    loadWeather();
  }, []);

  const loadStats = async () => {
    // Check if Supabase is configured before attempting connection
    if (!isBrowserClientAvailable()) {
      console.error("[OpsOverviewPage] Supabase not configured");
      setConfigError(true);
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    try {
      // Get today's occupancy
      const { data: occupancy } = await supabase
        .from("daily_occupancy")
        .select("guests_count")
        .eq("date", today)
        .single();

      // Get pending approvals count
      const { count: pendingApprovals } = await supabase
        .from("checklists")
        .select("*", { count: "exact", head: true })
        .eq("status", "complete")
        .is("approved_at", null);

      // Get low stock count
      const { data: ingredients } = await supabase
        .from("ingredients")
        .select("id, current_stock, min_stock")
        .eq("is_active", true)
        .not("min_stock", "is", null);

      const lowStockCount =
        ingredients?.filter(
          (item) =>
            item.min_stock !== null &&
            item.current_stock !== null &&
            item.current_stock < item.min_stock,
        ).length || 0;

      // Get conversation stats for last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { count: conversationCount } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .gte("created_at", weekAgo.toISOString());

      // Get dish_pl view for profit and transport calculation
      const { data: dishPL } = await supabase.from("dish_pl").select("*");

      // Calculate weekly profit and transport from the view
      let weeklyProfit = 0;
      let weeklyTransport = 0;

      if (dishPL) {
        for (const item of dishPL) {
          weeklyProfit += item.weekly_profit || 0;
          weeklyTransport +=
            (item.transport_cost || 0) * (item.orders_this_week || 0);
        }
      }

      // Get NPS score from feedback
      const { data: feedback } = await supabase
        .from("guest_feedback")
        .select("nps_score")
        .not("nps_score", "is", null);

      let npsScore: number | null = null;
      if (feedback && feedback.length > 0) {
        const promoters = feedback.filter(
          (f) => (f.nps_score as number) >= 9,
        ).length;
        const detractors = feedback.filter(
          (f) => (f.nps_score as number) <= 6,
        ).length;
        npsScore = Math.round(
          ((promoters - detractors) / feedback.length) * 100,
        );
      }

      // Get today's waste logs
      const { data: wasteData } = await supabase
        .from("waste_logs")
        .select("cost, reason")
        .gte("logged_at", `${today}T00:00:00`);

      let dailyWasteCost = 0;
      const wasteByReasonMap: Record<string, { cost: number; count: number }> =
        {};

      if (wasteData) {
        for (const w of wasteData) {
          dailyWasteCost += w.cost || 0;
          const reason = w.reason || "other";
          if (!wasteByReasonMap[reason]) {
            wasteByReasonMap[reason] = { cost: 0, count: 0 };
          }
          wasteByReasonMap[reason].cost += w.cost || 0;
          wasteByReasonMap[reason].count += 1;
        }
      }

      const wasteByReason = Object.entries(wasteByReasonMap).map(
        ([reason, data]) => ({
          reason,
          cost: data.cost,
          count: data.count,
        }),
      );

      // Get today's staff meal costs
      const { data: staffMeals } = await supabase
        .from("order_logs")
        .select("total_price")
        .eq("order_date", today)
        .or("is_staff_meal.eq.true,order_category.eq.staff");

      const dailyStaffMealCost = staffMeals
        ? staffMeals.reduce((sum, m) => sum + (m.total_price || 0) * 0.35, 0)
        : 0;

      setStats({
        todayGuests: occupancy?.guests_count || 0,
        pendingApprovals: pendingApprovals || 0,
        lowStockCount,
        staffQuestionsPerDay: Math.round((conversationCount || 0) / 7),
        weeklyFoodProfit: weeklyProfit,
        weeklyTransport: weeklyTransport,
        npsScore,
        totalFeedback: feedback?.length || 0,
        dailyWasteCost,
        dailyStaffMealCost,
        wasteByReason,
      });
    } catch (error) {
      console.error("[loadStats]", error);
    } finally {
      setLoading(false);
    }
  };

  const loadWeather = async () => {
    try {
      const response = await fetch("/api/weather");
      const data = await response.json();
      if (data.success) {
        setWeather(data.forecast || []);
      }
    } catch (error) {
      console.error("[loadWeather]", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-amber-800 mb-2">
          Database Not Configured
        </h2>
        <p className="text-sm text-amber-700 mb-4">
          Supabase environment variables are not available. This usually means
          they need to be set in Vercel and the project redeployed.
        </p>
        <div className="text-xs text-amber-600 font-mono bg-amber-100 p-3 rounded-lg text-left">
          <div>Required variables:</div>
          <div className="mt-1">• NEXT_PUBLIC_SUPABASE_URL</div>
          <div>• NEXT_PUBLIC_SUPABASE_ANON_KEY</div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Stats Row */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label="Today's Guests"
          value={stats.todayGuests.toString()}
          sub="Current occupancy"
          color="#0066CC"
          icon="👥"
        />
        <StatCard
          label="Weekly Food Profit"
          value={`$${Math.round(stats.weeklyFoodProfit / 1000)}K`}
          sub="With transport costs"
          color="#10B981"
          icon="📈"
        />
        <StatCard
          label="Weekly Transport Hit"
          value={`$${Math.round(stats.weeklyTransport / 1000)}K`}
          sub="Hidden cost per plate"
          color="#F59E0B"
          icon="🚤"
        />
        <StatCard
          label="Staff Questions/Day"
          value={`~${stats.staffQuestionsPerDay || 50}`}
          sub="Via Staff Bot"
          color="#EF4444"
          icon="📱"
        />
        <StatCard
          label="Guest NPS Score"
          value={
            stats.npsScore !== null
              ? `${stats.npsScore > 0 ? "+" : ""}${stats.npsScore}`
              : "N/A"
          }
          sub={`${stats.totalFeedback} responses`}
          color={
            stats.npsScore !== null
              ? stats.npsScore >= 50
                ? "#10B981"
                : stats.npsScore >= 0
                  ? "#F59E0B"
                  : "#EF4444"
              : "#6B7280"
          }
          icon="⭐"
        />
      </div>

      {/* Weather Widget */}
      {weather.length > 0 && (
        <div className="bg-gradient-to-br from-sky-500 to-blue-600 rounded-2xl p-5 mb-5 text-white">
          <div className="text-[11px] font-bold tracking-widest mb-2 text-white/80">
            PRONOSTICO CARTAGENA
          </div>
          <div className="grid grid-cols-5 gap-2">
            {weather.slice(0, 5).map((day, idx) => {
              const dayName =
                idx === 0
                  ? "Hoy"
                  : new Date(day.date).toLocaleDateString("es-CO", {
                      weekday: "short",
                    });
              return (
                <div
                  key={day.date}
                  className={`text-center p-2 rounded-lg ${!day.is_good_for_excursions ? "bg-red-500/30" : "bg-white/10"}`}
                >
                  <div className="text-xs font-medium mb-1">{dayName}</div>
                  <div className="text-xl mb-1">
                    {day.icon === "01d" || day.icon === "01n"
                      ? "☀️"
                      : day.icon?.includes("02")
                        ? "⛅"
                        : day.icon?.includes("03") || day.icon?.includes("04")
                          ? "☁️"
                          : day.icon?.includes("09") || day.icon?.includes("10")
                            ? "🌧️"
                            : day.icon?.includes("11")
                              ? "⛈️"
                              : "☀️"}
                  </div>
                  <div className="text-sm font-bold">{day.temp_max}°</div>
                  <div className="text-[10px] text-white/60">
                    {day.temp_min}°
                  </div>
                  {day.rain_probability > 30 && (
                    <div className="text-[10px] mt-1 text-sky-200">
                      💧{day.rain_probability}%
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {weather.some((d) => d.excursion_warning) && (
            <div className="mt-3 p-2 bg-red-500/30 rounded-lg text-xs">
              ⚠️ {weather.find((d) => d.excursion_warning)?.excursion_warning}
            </div>
          )}
        </div>
      )}

      {/* Alerts Row */}
      {(stats.pendingApprovals > 0 || stats.lowStockCount > 0) && (
        <div className="flex gap-3 flex-wrap mb-5">
          {stats.pendingApprovals > 0 && (
            <Link
              href="/ops/housekeeping"
              className="flex-1 min-w-[200px] bg-amber-50 border border-amber-200 rounded-xl p-3 hover:bg-amber-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">⏳</span>
                <div>
                  <div className="text-sm font-bold text-amber-800">
                    {stats.pendingApprovals} Pending Approvals
                  </div>
                  <div className="text-xs text-amber-600">
                    Checklists awaiting review
                  </div>
                </div>
              </div>
            </Link>
          )}
          {stats.lowStockCount > 0 && (
            <div className="flex-1 min-w-[200px] bg-rose-50 border border-rose-200 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <div className="text-sm font-bold text-rose-800">
                    {stats.lowStockCount} Low Stock Items
                  </div>
                  <div className="text-xs text-rose-600">
                    Below minimum threshold
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
          <Link
            key={feature.title}
            href={feature.href}
            className="bg-white rounded-xl p-4 border border-slate-200 hover:border-[#00B4FF] hover:shadow-md transition-all"
          >
            <div className="text-2xl mb-1.5">{feature.icon}</div>
            <div className="text-[13px] font-extrabold text-slate-900 mb-0.5">
              {feature.title}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {feature.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
