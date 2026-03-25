"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  calculateRevPAR,
  calculateADR,
  calculateOccupancyRate,
  calculateComparison,
  getTrendIcon,
  getTrendColor,
  exportOrderLogs,
  exportPurchaseOrders,
  exportServiceBookings,
  type HistoricalComparison,
  type DailyMetrics,
} from "@/lib/ops/financial";

const TOTAL_VILLAS = 10;

interface MetricsState {
  current: {
    totalRevenue: number;
    roomRevenue: number;
    fbRevenue: number;
    serviceRevenue: number;
    occupiedNights: number;
    revpar: number;
    adr: number;
    occupancyPct: number;
    fbMargin: number;
  };
  comparisons: {
    revenue: HistoricalComparison;
    revpar: HistoricalComparison;
    occupancy: HistoricalComparison;
  };
  dailyMetrics: DailyMetrics[];
  loading: boolean;
}

type TimePeriod = "7d" | "30d" | "90d";

export default function FinancialsPage() {
  const [period, setPeriod] = useState<TimePeriod>("7d");
  const [metrics, setMetrics] = useState<MetricsState>({
    current: {
      totalRevenue: 0,
      roomRevenue: 0,
      fbRevenue: 0,
      serviceRevenue: 0,
      occupiedNights: 0,
      revpar: 0,
      adr: 0,
      occupancyPct: 0,
      fbMargin: 0,
    },
    comparisons: {
      revenue: {
        current: 0,
        previous: 0,
        change: 0,
        change_pct: 0,
        trend: "flat",
      },
      revpar: {
        current: 0,
        previous: 0,
        change: 0,
        change_pct: 0,
        trend: "flat",
      },
      occupancy: {
        current: 0,
        previous: 0,
        change: 0,
        change_pct: 0,
        trend: "flat",
      },
    },
    dailyMetrics: [],
    loading: true,
  });
  const [exporting, setExporting] = useState<string | null>(null);

  const loadMetrics = useCallback(async () => {
    const supabase = createBrowserClient();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;

    // Date ranges
    const today = new Date();
    const currentStart = new Date(today);
    currentStart.setDate(currentStart.getDate() - days);

    const previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - days);
    const previousEnd = new Date(currentStart);
    previousEnd.setDate(previousEnd.getDate() - 1);

    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    // Fetch daily metrics for current period
    const { data: currentMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", formatDate(currentStart))
      .lte("date", formatDate(today))
      .order("date", { ascending: false });

    // Fetch daily metrics for previous period
    const { data: previousMetrics } = await supabase
      .from("daily_metrics")
      .select("*")
      .gte("date", formatDate(previousStart))
      .lte("date", formatDate(previousEnd));

    // Calculate current period totals
    const currentTotals = (currentMetrics || []).reduce(
      (acc, m) => ({
        roomRevenue: acc.roomRevenue + (m.room_revenue || 0),
        fbRevenue: acc.fbRevenue + (m.fb_revenue || 0),
        serviceRevenue: acc.serviceRevenue + (m.service_revenue || 0),
        totalRevenue: acc.totalRevenue + (m.total_revenue || 0),
        occupiedNights: acc.occupiedNights + (m.occupied_villas || 0),
        foodCost: acc.foodCost + (m.food_cost || 0),
      }),
      {
        roomRevenue: 0,
        fbRevenue: 0,
        serviceRevenue: 0,
        totalRevenue: 0,
        occupiedNights: 0,
        foodCost: 0,
      },
    );

    // Calculate previous period totals
    const previousTotals = (previousMetrics || []).reduce(
      (acc, m) => ({
        totalRevenue: acc.totalRevenue + (m.total_revenue || 0),
        occupiedNights: acc.occupiedNights + (m.occupied_villas || 0),
      }),
      { totalRevenue: 0, occupiedNights: 0 },
    );

    // Calculate RevPAR and ADR
    const availableNights = days * TOTAL_VILLAS;
    const currentRevPAR = calculateRevPAR(
      currentTotals.roomRevenue,
      availableNights,
    );
    const currentADR = calculateADR(
      currentTotals.roomRevenue,
      currentTotals.occupiedNights,
    );
    const currentOccupancy = calculateOccupancyRate(
      currentTotals.occupiedNights,
      availableNights,
    );

    const previousRevPAR = calculateRevPAR(
      (previousMetrics || []).reduce((s, m) => s + (m.room_revenue || 0), 0),
      availableNights,
    );
    const previousOccupancy = calculateOccupancyRate(
      previousTotals.occupiedNights,
      availableNights,
    );

    // F&B margin
    const fbMargin =
      currentTotals.fbRevenue > 0
        ? ((currentTotals.fbRevenue - currentTotals.foodCost) /
            currentTotals.fbRevenue) *
          100
        : 0;

    setMetrics({
      current: {
        totalRevenue: currentTotals.totalRevenue,
        roomRevenue: currentTotals.roomRevenue,
        fbRevenue: currentTotals.fbRevenue,
        serviceRevenue: currentTotals.serviceRevenue,
        occupiedNights: currentTotals.occupiedNights,
        revpar: currentRevPAR,
        adr: currentADR,
        occupancyPct: currentOccupancy,
        fbMargin,
      },
      comparisons: {
        revenue: calculateComparison(
          currentTotals.totalRevenue,
          previousTotals.totalRevenue,
        ),
        revpar: calculateComparison(currentRevPAR, previousRevPAR),
        occupancy: calculateComparison(currentOccupancy, previousOccupancy),
      },
      dailyMetrics: (currentMetrics || []) as DailyMetrics[],
      loading: false,
    });
  }, [period]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleExport = async (type: "orders" | "po" | "services") => {
    setExporting(type);
    const supabase = createBrowserClient();
    const days = period === "7d" ? 7 : period === "30d" ? 30 : 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    const formatDate = (d: Date) => d.toISOString().split("T")[0];

    try {
      if (type === "orders") {
        const { data } = await supabase
          .from("order_logs")
          .select(
            `
            id, order_date, quantity, unit_price, total_price, guest_name,
            menu_items(name),
            users(name)
          `,
          )
          .gte("order_date", formatDate(startDate))
          .order("order_date", { ascending: false });

        if (data) {
          exportOrderLogs(
            data.map((o) => ({
              id: o.id,
              order_date: o.order_date || "",
              menu_item_name:
                (o.menu_items as { name: string } | null)?.name || "Unknown",
              quantity: o.quantity,
              unit_price: o.unit_price,
              total_price: o.total_price,
              guest_name: o.guest_name || "",
              served_by_name: (o.users as { name: string } | null)?.name || "",
            })),
            { start: formatDate(startDate), end: formatDate(new Date()) },
          );
        }
      } else if (type === "po") {
        const { data } = await supabase
          .from("purchase_orders")
          .select("*")
          .gte("order_date", formatDate(startDate))
          .order("order_date", { ascending: false });

        if (data) {
          exportPurchaseOrders(data);
        }
      } else if (type === "services") {
        const { data } = await supabase
          .from("service_bookings")
          .select(
            `
            id, date, guest_name, quantity, unit_price, total_revenue, status,
            services(name)
          `,
          )
          .gte("date", formatDate(startDate))
          .order("date", { ascending: false });

        if (data) {
          exportServiceBookings(
            data.map((s) => ({
              id: s.id,
              date: s.date,
              service_name:
                (s.services as { name: string } | null)?.name || "Unknown",
              guest_name: s.guest_name,
              quantity: s.quantity || 1,
              unit_price: s.unit_price,
              total_revenue: s.total_revenue,
              status: s.status || "pending",
            })),
          );
        }
      }
    } catch (error) {
      console.error("[Export Error]", error);
    } finally {
      setExporting(null);
    }
  };

  const formatMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const formatPct = (n: number) => `${n.toFixed(1)}%`;

  if (metrics.loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-extrabold flex items-center gap-2">
              📊 Financial Dashboard
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              RevPAR, margins, historical comparisons, and exports
            </p>
          </div>

          {/* Period Selector */}
          <div className="flex gap-1.5">
            {(["7d", "30d", "90d"] as TimePeriod[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${
                  period === p
                    ? "bg-[#0A0A0F] text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                }`}
              >
                {p === "7d" ? "7 Days" : p === "30d" ? "30 Days" : "90 Days"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard
          label="Total Revenue"
          value={formatMoney(metrics.current.totalRevenue)}
          sub={<ComparisonBadge comparison={metrics.comparisons.revenue} />}
          color="#10B981"
          icon="💰"
        />
        <StatCard
          label="RevPAR"
          value={formatMoney(metrics.current.revpar)}
          sub={<ComparisonBadge comparison={metrics.comparisons.revpar} />}
          color="#0066CC"
          icon="📈"
        />
        <StatCard
          label="ADR"
          value={formatMoney(metrics.current.adr)}
          sub={`${metrics.current.occupiedNights} room nights`}
          color="#8B5CF6"
          icon="🏠"
        />
        <StatCard
          label="Occupancy"
          value={formatPct(metrics.current.occupancyPct)}
          sub={
            <ComparisonBadge
              comparison={metrics.comparisons.occupancy}
              suffix="%"
            />
          }
          color="#F59E0B"
          icon="🛏️"
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-extrabold text-slate-900 mb-4">
          Revenue Breakdown
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
            <div className="text-sm text-blue-600 font-semibold">
              Room Revenue
            </div>
            <div className="text-2xl font-black text-blue-700">
              {formatMoney(metrics.current.roomRevenue)}
            </div>
            <div className="text-xs text-blue-500 mt-1">
              {metrics.current.totalRevenue > 0
                ? formatPct(
                    (metrics.current.roomRevenue /
                      metrics.current.totalRevenue) *
                      100,
                  )
                : "0%"}{" "}
              of total
            </div>
          </div>
          <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
            <div className="text-sm text-emerald-600 font-semibold">
              F&B Revenue
            </div>
            <div className="text-2xl font-black text-emerald-700">
              {formatMoney(metrics.current.fbRevenue)}
            </div>
            <div className="text-xs text-emerald-500 mt-1">
              {formatPct(metrics.current.fbMargin)} margin
            </div>
          </div>
          <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
            <div className="text-sm text-purple-600 font-semibold">
              Service Revenue
            </div>
            <div className="text-2xl font-black text-purple-700">
              {formatMoney(metrics.current.serviceRevenue)}
            </div>
            <div className="text-xs text-purple-500 mt-1">
              Excursions, tours, etc.
            </div>
          </div>
        </div>
      </div>

      {/* Daily Trend Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
        <h2 className="font-extrabold text-slate-900 mb-4">
          Daily Revenue Trend
        </h2>
        <div className="h-48 flex items-end gap-1">
          {metrics.dailyMetrics
            .slice(0, 14)
            .reverse()
            .map((day, idx) => {
              const maxRevenue = Math.max(
                ...metrics.dailyMetrics.map((d) => d.total_revenue || 0),
              );
              const height =
                maxRevenue > 0
                  ? ((day.total_revenue || 0) / maxRevenue) * 100
                  : 0;

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center"
                  title={`${day.date}: ${formatMoney(day.total_revenue || 0)}`}
                >
                  <div
                    className="w-full bg-gradient-to-t from-blue-500 to-blue-400 rounded-t"
                    style={{ height: `${Math.max(height, 4)}%` }}
                  />
                  <div className="text-[9px] text-slate-500 mt-1 rotate-45 origin-left">
                    {new Date(day.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Export Buttons */}
      <div className="bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] rounded-xl p-5">
        <div className="text-[#00D4FF] text-[11px] font-bold tracking-widest mb-2">
          EXPORT DATA
        </div>
        <p className="text-white/60 text-sm mb-4">
          Download data for the selected period (
          {period === "7d"
            ? "7 days"
            : period === "30d"
              ? "30 days"
              : "90 days"}
          )
        </p>
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => handleExport("orders")}
            disabled={exporting === "orders"}
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {exporting === "orders" ? (
              <span className="animate-spin">⏳</span>
            ) : (
              "📋"
            )}
            Export Orders
          </button>
          <button
            onClick={() => handleExport("po")}
            disabled={exporting === "po"}
            className="px-5 py-2.5 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {exporting === "po" ? (
              <span className="animate-spin">⏳</span>
            ) : (
              "📦"
            )}
            Export Purchase Orders
          </button>
          <button
            onClick={() => handleExport("services")}
            disabled={exporting === "services"}
            className="px-5 py-2.5 bg-purple-500 text-white rounded-lg font-bold text-sm hover:bg-purple-600 disabled:opacity-50 transition-all flex items-center gap-2"
          >
            {exporting === "services" ? (
              <span className="animate-spin">⏳</span>
            ) : (
              "🎯"
            )}
            Export Services
          </button>
        </div>
      </div>
    </div>
  );
}

// Comparison Badge Component
function ComparisonBadge({
  comparison,
  suffix = "",
}: {
  comparison: HistoricalComparison;
  suffix?: string;
}) {
  const icon = getTrendIcon(comparison.trend);
  const color = getTrendColor(comparison.trend);

  return (
    <span className={`text-xs font-bold ${color}`}>
      {icon} {comparison.change_pct >= 0 ? "+" : ""}
      {comparison.change_pct.toFixed(1)}
      {suffix || "%"} vs prev
    </span>
  );
}
