"use client";

import { useState, useEffect, useCallback } from "react";
import type { MetricsOverview, MetricComparison, TrendPoint } from "@/types";

// ============================================
// TVC ANALYTICS DASHBOARD
// Issues #33 & #34 - RevPAR & Historical Comparison
// ============================================

type Period = "7d" | "30d" | "mtd" | "ytd";
type CompareMode = "previous" | "yoy";

const PERIODS: { value: Period; label: string; labelEs: string }[] = [
  { value: "7d", label: "Last 7 Days", labelEs: "Ultimos 7 dias" },
  { value: "30d", label: "Last 30 Days", labelEs: "Ultimos 30 dias" },
  { value: "mtd", label: "Month to Date", labelEs: "Mes actual" },
  { value: "ytd", label: "Year to Date", labelEs: "Ano actual" },
];

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("30d");
  const [compareMode, setCompareMode] = useState<CompareMode>("previous");
  const [metrics, setMetrics] = useState<MetricsOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const { start, end } = getDateRange(period);
      const res = await fetch(
        `/api/analytics/metrics?start=${start}&end=${end}&compare=${compareMode}`,
      );

      if (!res.ok) {
        throw new Error("Failed to fetch metrics");
      }

      const data = await res.json();
      setMetrics(data);
    } catch (err) {
      console.error("[Analytics] Error:", err);
      setError("Failed to load analytics data");
    } finally {
      setLoading(false);
    }
  }, [period, compareMode]);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading) {
    return <LoadingSkeleton />;
  }

  if (error || !metrics) {
    return <ErrorState error={error} onRetry={fetchMetrics} />;
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-white">
            Analytics
          </h1>
          <p className="text-white/60 text-sm">
            {metrics.period.start} to {metrics.period.end} (
            {metrics.period.days} days)
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          {/* Period Selector */}
          <div className="flex bg-admin-border/30 rounded-lg p-1">
            {PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setPeriod(p.value)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition-all ${
                  period === p.value
                    ? "bg-tvc-turquoise text-admin-bg"
                    : "text-white/60 hover:text-white"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Compare Mode */}
          <select
            value={compareMode}
            onChange={(e) => setCompareMode(e.target.value as CompareMode)}
            className="bg-admin-border/30 text-white text-xs px-3 py-1.5 rounded-lg border border-admin-border"
          >
            <option value="previous">vs Previous Period</option>
            <option value="yoy">vs Year Ago</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KPICard
          label="RevPAR"
          value={formatCurrency(metrics.averages.revpar)}
          change={findComparison(metrics.comparison, "RevPAR")}
          icon={<RevPARIcon />}
          tooltip="Revenue Per Available Room"
        />
        <KPICard
          label="ADR"
          value={formatCurrency(metrics.averages.adr)}
          change={findComparison(metrics.comparison, "ADR")}
          icon={<ADRIcon />}
          tooltip="Average Daily Rate"
        />
        <KPICard
          label="Occupancy"
          value={`${metrics.averages.occupancy_pct.toFixed(1)}%`}
          change={findComparison(metrics.comparison, "Occupancy %")}
          icon={<OccupancyIcon />}
        />
        <KPICard
          label="Daily Revenue"
          value={formatCurrency(metrics.averages.daily_revenue)}
          change={findComparison(metrics.comparison, "Total Revenue")}
          icon={<RevenueIcon />}
        />
      </div>

      {/* Revenue Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Total Revenue Card */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Revenue Breakdown
          </h2>
          <div className="space-y-4">
            <RevenueBar
              label="Room Revenue"
              value={metrics.totals.room_revenue}
              total={metrics.totals.total_revenue}
              color="bg-tvc-turquoise"
              change={findComparison(metrics.comparison, "Room Revenue")}
            />
            <RevenueBar
              label="F&B Revenue"
              value={metrics.totals.food_revenue + metrics.totals.bar_revenue}
              total={metrics.totals.total_revenue}
              color="bg-tvc-gold"
              change={findComparison(metrics.comparison, "F&B Revenue")}
            />
            <RevenueBar
              label="Services"
              value={metrics.totals.service_revenue}
              total={metrics.totals.total_revenue}
              color="bg-purple-500"
              change={findComparison(metrics.comparison, "Service Revenue")}
            />
          </div>
          <div className="mt-6 pt-4 border-t border-admin-border">
            <div className="flex justify-between items-center">
              <span className="text-white/60">Total Revenue</span>
              <span className="text-xl font-bold text-white">
                {formatCurrency(metrics.totals.total_revenue)}
              </span>
            </div>
          </div>
        </div>

        {/* Comparison Table */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Period Comparison
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-white/40 text-xs">
                  <th className="text-left py-2">Metric</th>
                  <th className="text-right py-2">Current</th>
                  <th className="text-right py-2">Previous</th>
                  <th className="text-right py-2">Change</th>
                </tr>
              </thead>
              <tbody>
                {metrics.comparison.map((comp) => (
                  <ComparisonRow key={comp.metric} data={comp} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Revenue Trend Chart */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Revenue Trend
        </h2>
        <div className="h-64">
          <SimpleLineChart
            data={metrics.daily.map((d) => ({
              date: d.date,
              value: Number(d.total_revenue),
              label: formatCurrency(Number(d.total_revenue)),
            }))}
            color="#00D4FF"
          />
        </div>
      </div>

      {/* Occupancy & RevPAR Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Occupancy Trend
          </h2>
          <div className="h-48">
            <SimpleBarChart
              data={metrics.daily.map((d) => ({
                date: d.date,
                value: Number(d.occupancy_pct),
                label: `${Number(d.occupancy_pct).toFixed(0)}%`,
              }))}
              color="#C9A84C"
              maxValue={100}
            />
          </div>
        </div>

        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            RevPAR Trend
          </h2>
          <div className="h-48">
            <SimpleLineChart
              data={metrics.daily.map((d) => ({
                date: d.date,
                value: Number(d.revpar),
                label: formatCurrency(Number(d.revpar)),
              }))}
              color="#10B981"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatBox
          label="Total Orders"
          value={metrics.totals.orders_count.toString()}
          sub="F&B orders"
        />
        <StatBox
          label="Avg Check"
          value={formatCurrency(metrics.averages.avg_check)}
          sub="per order"
        />
        <StatBox
          label="Service Bookings"
          value={metrics.totals.service_bookings.toString()}
          sub="excursions & services"
        />
        <StatBox
          label="Days Tracked"
          value={metrics.period.days.toString()}
          sub="with data"
        />
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function getDateRange(period: Period): { start: string; end: string } {
  const now = new Date();
  const end = now.toISOString().split("T")[0];
  let start: Date;

  switch (period) {
    case "7d":
      start = new Date(now);
      start.setDate(start.getDate() - 6);
      break;
    case "30d":
      start = new Date(now);
      start.setDate(start.getDate() - 29);
      break;
    case "mtd":
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case "ytd":
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }

  return { start: start.toISOString().split("T")[0], end };
}

function formatCurrency(value: number): string {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`;
  }
  if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(0)}K`;
  }
  return `$${value.toLocaleString()}`;
}

function findComparison(
  comparisons: MetricComparison[],
  metric: string,
): MetricComparison | null {
  return comparisons.find((c) => c.metric === metric) || null;
}

// ============================================
// Components
// ============================================

function KPICard({
  label,
  value,
  change,
  icon,
  tooltip,
}: {
  label: string;
  value: string;
  change: MetricComparison | null;
  icon: React.ReactNode;
  tooltip?: string;
}) {
  return (
    <div className="card" title={tooltip}>
      <div className="flex items-start justify-between mb-2">
        <div className="w-10 h-10 bg-admin-border/50 rounded-lg flex items-center justify-center text-tvc-turquoise">
          {icon}
        </div>
        {change && (
          <ChangeIndicator
            direction={change.direction}
            value={change.changePct}
          />
        )}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function ChangeIndicator({
  direction,
  value,
}: {
  direction: "up" | "down" | "flat";
  value: number;
}) {
  const colors = {
    up: "text-emerald-400 bg-emerald-400/10",
    down: "text-red-400 bg-red-400/10",
    flat: "text-white/40 bg-white/5",
  };

  const arrows = {
    up: "↑",
    down: "↓",
    flat: "→",
  };

  return (
    <span
      className={`px-2 py-1 rounded text-xs font-medium ${colors[direction]}`}
    >
      {arrows[direction]} {Math.abs(value).toFixed(1)}%
    </span>
  );
}

function RevenueBar({
  label,
  value,
  total,
  color,
  change,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
  change: MetricComparison | null;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-white">{label}</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">
            {formatCurrency(value)}
          </span>
          {change && (
            <span
              className={`text-xs ${
                change.direction === "up"
                  ? "text-emerald-400"
                  : change.direction === "down"
                    ? "text-red-400"
                    : "text-white/40"
              }`}
            >
              {change.direction === "up" ? "+" : ""}
              {change.changePct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>
      <div className="h-2 bg-admin-border/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-white/40 mt-1">{pct.toFixed(1)}% of total</p>
    </div>
  );
}

function ComparisonRow({ data }: { data: MetricComparison }) {
  const isMonetary =
    !data.metric.includes("%") && !data.metric.includes("Orders");

  return (
    <tr className="border-t border-admin-border/50">
      <td className="py-3 text-sm text-white">{data.metric}</td>
      <td className="py-3 text-sm text-white text-right">
        {isMonetary
          ? formatCurrency(data.current)
          : data.current.toLocaleString()}
      </td>
      <td className="py-3 text-sm text-white/60 text-right">
        {isMonetary
          ? formatCurrency(data.previous)
          : data.previous.toLocaleString()}
      </td>
      <td className="py-3 text-right">
        <span
          className={`text-sm font-medium ${
            data.direction === "up"
              ? "text-emerald-400"
              : data.direction === "down"
                ? "text-red-400"
                : "text-white/40"
          }`}
        >
          {data.direction === "up" ? "+" : ""}
          {data.changePct.toFixed(1)}%
        </span>
      </td>
    </tr>
  );
}

function StatBox({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="bg-admin-border/30 rounded-xl p-4">
      <p className="text-xs text-white/40 mb-1">{label}</p>
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="text-xs text-white/40">{sub}</p>
    </div>
  );
}

// Simple SVG Line Chart
function SimpleLineChart({
  data,
  color,
}: {
  data: TrendPoint[];
  color: string;
}) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No data available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const range = max - min || 1;

  const width = 100;
  const height = 100;
  const padding = 10;

  const points = data.map((d, i) => {
    const x = padding + (i / (data.length - 1 || 1)) * (width - 2 * padding);
    const y =
      height - padding - ((d.value - min) / range) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD =
    `M ${points[0].x} ${points[0].y} ` +
    points
      .slice(1)
      .map((p) => `L ${p.x} ${p.y}`)
      .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => (
        <line
          key={pct}
          x1={padding}
          y1={height - padding - (pct / 100) * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - (pct / 100) * (height - 2 * padding)}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      ))}

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Area gradient */}
      <defs>
        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`}
        fill="url(#areaGradient)"
      />

      {/* Points */}
      {points.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="1.5"
          fill={color}
          className="hover:r-3 transition-all"
        >
          <title>
            {p.date}: {p.label}
          </title>
        </circle>
      ))}
    </svg>
  );
}

// Simple SVG Bar Chart
function SimpleBarChart({
  data,
  color,
  maxValue,
}: {
  data: TrendPoint[];
  color: string;
  maxValue?: number;
}) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-white/40">
        No data available
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const max = maxValue || Math.max(...values);

  const width = 100;
  const height = 100;
  const padding = 10;
  const barWidth = (width - 2 * padding) / data.length - 2;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
      {/* Grid lines */}
      {[0, 25, 50, 75, 100].map((pct) => (
        <line
          key={pct}
          x1={padding}
          y1={height - padding - (pct / 100) * (height - 2 * padding)}
          x2={width - padding}
          y2={height - padding - (pct / 100) * (height - 2 * padding)}
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.5"
        />
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const barHeight = (d.value / max) * (height - 2 * padding) || 1;
        const x = padding + i * ((width - 2 * padding) / data.length) + 1;
        const y = height - padding - barHeight;

        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={barHeight}
            fill={color}
            rx="1"
            className="hover:opacity-80 transition-opacity"
          >
            <title>
              {d.date}: {d.label}
            </title>
          </rect>
        );
      })}
    </svg>
  );
}

function LoadingSkeleton() {
  return (
    <div className="p-6 space-y-6">
      <div className="h-8 w-48 bg-admin-border/30 rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 bg-admin-border/30 rounded-xl animate-pulse"
          />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-64 bg-admin-border/30 rounded-xl animate-pulse" />
        <div className="h-64 bg-admin-border/30 rounded-xl animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({
  error,
  onRetry,
}: {
  error: string | null;
  onRetry: () => void;
}) {
  return (
    <div className="p-6">
      <div className="card text-center py-16">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">
          Failed to Load Analytics
        </h2>
        <p className="text-white/60 mb-6">
          {error || "An unexpected error occurred"}
        </p>
        <button
          onClick={onRetry}
          className="px-4 py-2 bg-tvc-turquoise text-admin-bg font-medium rounded-lg hover:opacity-90 transition-opacity"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}

// ============================================
// Icons
// ============================================

function RevPARIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
      />
    </svg>
  );
}

function ADRIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function OccupancyIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function RevenueIcon() {
  return (
    <svg
      className="w-5 h-5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
      />
    </svg>
  );
}
