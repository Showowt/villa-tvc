import { getFunnelDashboardData } from "@/lib/supabase/queries";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Format COP currency
function formatCOP(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Stage labels for display
const STAGE_LABELS: Record<string, { label: string; description: string }> = {
  inquiry: { label: "Inquiry", description: "First contact" },
  qualified: { label: "Qualified", description: "Showed interest" },
  availability_checked: {
    label: "Availability",
    description: "Asked about dates",
  },
  link_sent: { label: "Link Sent", description: "Booking link shared" },
  booked: { label: "Booked", description: "Reservation confirmed" },
  arrived: { label: "Arrived", description: "Checked in" },
  completed: { label: "Completed", description: "Checked out" },
};

// Upsell type labels
const UPSELL_LABELS: Record<string, string> = {
  sunset_tour: "Sunset Bay Tour",
  islands_excursion: "Rosario Islands",
  special_dinner: "Private Dinner",
  private_brunch: "Village People Brunch",
  village_takeover_upgrade: "Village Takeover",
  spa_treatment: "Spa Treatment",
  boat_upgrade: "Boat Upgrade",
  nightlife_experience: "Nightlife Experience",
  bottle_service: "Bottle Service",
  late_checkout: "Late Checkout",
  other: "Other",
};

export default async function FunnelDashboardPage() {
  let dashboardData = {
    funnel: {
      stages: [] as Array<{
        stage: string;
        total_entries: number;
        converted_to_next: number;
        conversion_rate_pct: number;
        avg_hours_to_convert: number;
      }>,
      total_inquiries: 0,
      total_booked: 0,
      overall_conversion_rate: 0,
    },
    upsells: {
      performance: [] as Array<{
        upsell_type: string;
        upsell_name: string;
        times_suggested: number;
        times_booked: number;
        conversion_rate_pct: number;
        total_revenue_cop: number;
        avg_day_suggested: number;
      }>,
      total_suggestions: 0,
      total_booked: 0,
      total_revenue_cop: 0,
      conversion_rate: 0,
    },
    daily_stats: [] as Array<{
      date: string;
      stage: string;
      entries: number;
      conversions: number;
    }>,
  };

  try {
    dashboardData = await getFunnelDashboardData();
  } catch (error) {
    console.error("[FunnelDashboard] Error fetching data:", error);
  }

  const { funnel, upsells } = dashboardData;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-sm text-white/60 mb-2">
          <Link href="/dashboard" className="hover:text-white">
            Dashboard
          </Link>
          <span>/</span>
          <span className="text-white">Booking Funnel</span>
        </div>
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Booking Funnel & Upsell Analytics
        </h1>
        <p className="text-white/60">
          Track conversion rates and upsell performance (Last 30 days)
        </p>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Total Inquiries"
          value={funnel.total_inquiries}
          subtext="First contact"
          color="turquoise"
        />
        <StatCard
          label="Total Booked"
          value={funnel.total_booked}
          subtext={`${funnel.overall_conversion_rate}% conversion`}
          color="green"
        />
        <StatCard
          label="Upsells Booked"
          value={upsells.total_booked}
          subtext={`${upsells.conversion_rate}% of suggestions`}
          color="gold"
        />
        <StatCard
          label="Upsell Revenue"
          value={formatCOP(upsells.total_revenue_cop)}
          subtext="Last 30 days"
          color="purple"
          isText
        />
      </div>

      {/* Funnel Visualization */}
      <div className="card mb-8">
        <h2 className="font-display text-xl font-semibold text-white mb-6">
          Conversion Funnel
        </h2>

        {funnel.stages.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <p className="mb-2">No funnel data yet</p>
            <p className="text-sm">
              Conversations will be tracked as they progress through stages
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {funnel.stages.map((stage, index) => {
              const maxEntries = Math.max(
                ...funnel.stages.map((s) => s.total_entries),
              );
              const widthPercent =
                maxEntries > 0 ? (stage.total_entries / maxEntries) * 100 : 0;
              const stageInfo = STAGE_LABELS[stage.stage] || {
                label: stage.stage,
                description: "",
              };

              return (
                <div key={stage.stage} className="relative">
                  {/* Stage bar */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-right">
                      <p className="text-sm font-medium text-white">
                        {stageInfo.label}
                      </p>
                      <p className="text-xs text-white/50">
                        {stageInfo.description}
                      </p>
                    </div>

                    <div className="flex-1 relative">
                      {/* Background bar */}
                      <div className="h-10 bg-admin-border/30 rounded-lg overflow-hidden">
                        {/* Filled bar */}
                        <div
                          className="h-full bg-gradient-to-r from-tvc-turquoise to-tvc-turquoise/60 rounded-lg transition-all duration-500"
                          style={{ width: `${widthPercent}%` }}
                        />
                      </div>

                      {/* Stats overlay */}
                      <div className="absolute inset-0 flex items-center px-4 justify-between">
                        <span className="text-white font-medium">
                          {stage.total_entries}
                        </span>
                        <span className="text-white/60 text-sm">
                          {stage.conversion_rate_pct}% convert
                        </span>
                      </div>
                    </div>

                    {/* Conversion arrow */}
                    {index < funnel.stages.length - 1 && (
                      <div className="w-16 text-center">
                        <div className="text-tvc-gold font-semibold">
                          {stage.conversion_rate_pct}%
                        </div>
                        <svg
                          className="w-4 h-4 mx-auto text-white/40"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 14l-7 7m0 0l-7-7m7 7V3"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Time to convert */}
                  {stage.avg_hours_to_convert > 0 && (
                    <p className="text-xs text-white/40 ml-36 mt-1">
                      Avg. time to next stage:{" "}
                      {stage.avg_hours_to_convert < 24
                        ? `${Math.round(stage.avg_hours_to_convert)}h`
                        : `${Math.round(stage.avg_hours_to_convert / 24)}d`}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Upsell Performance Table */}
      <div className="card">
        <h2 className="font-display text-xl font-semibold text-white mb-6">
          Upsell Performance
        </h2>

        {upsells.performance.length === 0 ? (
          <div className="text-center py-12 text-white/60">
            <p className="mb-2">No upsell data yet</p>
            <p className="text-sm">
              Upsell suggestions will be tracked when guests are on property
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-admin-border">
                  <th className="text-left py-3 px-4 text-white/60 font-medium text-sm">
                    Upsell
                  </th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">
                    Suggested
                  </th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">
                    Booked
                  </th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">
                    Conversion
                  </th>
                  <th className="text-center py-3 px-4 text-white/60 font-medium text-sm">
                    Avg. Day
                  </th>
                  <th className="text-right py-3 px-4 text-white/60 font-medium text-sm">
                    Revenue
                  </th>
                </tr>
              </thead>
              <tbody>
                {upsells.performance.map((upsell) => (
                  <tr
                    key={upsell.upsell_type}
                    className="border-b border-admin-border/50 hover:bg-admin-border/20"
                  >
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-tvc-gold/20 rounded-lg flex items-center justify-center">
                          <UpsellIcon type={upsell.upsell_type} />
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {upsell.upsell_name}
                          </p>
                          <p className="text-xs text-white/50">
                            {UPSELL_LABELS[upsell.upsell_type] ||
                              upsell.upsell_type}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-center text-white">
                      {upsell.times_suggested}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={
                          upsell.times_booked > 0
                            ? "text-green-400"
                            : "text-white/60"
                        }
                      >
                        {upsell.times_booked}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <ConversionBadge rate={upsell.conversion_rate_pct} />
                    </td>
                    <td className="py-4 px-4 text-center text-white/60">
                      Day {Math.round(upsell.avg_day_suggested)}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <span
                        className={
                          upsell.total_revenue_cop > 0
                            ? "text-tvc-gold font-medium"
                            : "text-white/40"
                        }
                      >
                        {formatCOP(upsell.total_revenue_cop)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-admin-border/30">
                  <td className="py-4 px-4 font-semibold text-white">Total</td>
                  <td className="py-4 px-4 text-center font-semibold text-white">
                    {upsells.total_suggestions}
                  </td>
                  <td className="py-4 px-4 text-center font-semibold text-green-400">
                    {upsells.total_booked}
                  </td>
                  <td className="py-4 px-4 text-center">
                    <ConversionBadge rate={upsells.conversion_rate} />
                  </td>
                  <td className="py-4 px-4 text-center">-</td>
                  <td className="py-4 px-4 text-right font-semibold text-tvc-gold">
                    {formatCOP(upsells.total_revenue_cop)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Timing Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        {/* Best Performing Days */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4">
            Upsell Timing Insights
          </h2>
          <div className="space-y-4">
            <InsightRow
              icon="sunrise"
              label="Arrival Day"
              value="Sunset Tour"
              description="Best time for sunset experiences"
            />
            <InsightRow
              icon="ship"
              label="Day 2"
              value="Island Excursions"
              description="Guests are ready for adventure"
            />
            <InsightRow
              icon="utensils"
              label="Last Full Day"
              value="Private Dinners"
              description="High conversion for finale experiences"
            />
            <InsightRow
              icon="clock"
              label="Departure Day"
              value="Late Checkout"
              description="Easy upsell with high acceptance"
            />
          </div>
        </div>

        {/* Drop-off Points */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4">
            Funnel Drop-off Analysis
          </h2>

          {funnel.stages.length >= 2 ? (
            <div className="space-y-4">
              {funnel.stages
                .filter((s) => s.conversion_rate_pct < 50)
                .slice(0, 4)
                .map((stage) => (
                  <div
                    key={stage.stage}
                    className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                  >
                    <div>
                      <p className="text-white font-medium">
                        {STAGE_LABELS[stage.stage]?.label || stage.stage}
                      </p>
                      <p className="text-xs text-white/60">
                        {100 - stage.conversion_rate_pct}% drop-off rate
                      </p>
                    </div>
                    <div className="text-red-400 font-semibold">
                      {stage.conversion_rate_pct}%
                    </div>
                  </div>
                ))}

              {funnel.stages.filter((s) => s.conversion_rate_pct < 50)
                .length === 0 && (
                <div className="text-center py-8 text-white/60">
                  <span className="text-green-400 text-4xl mb-2 block">
                    All stages converting well!
                  </span>
                  <p className="text-sm">No major drop-off points detected</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-white/60">
              <p>Not enough data for analysis</p>
              <p className="text-sm mt-2">
                Need more conversations to identify patterns
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Components

function StatCard({
  label,
  value,
  subtext,
  color,
  isText = false,
}: {
  label: string;
  value: number | string;
  subtext: string;
  color: "turquoise" | "gold" | "green" | "purple";
  isText?: boolean;
}) {
  const colorClasses = {
    turquoise: "bg-tvc-turquoise/20 text-tvc-turquoise",
    gold: "bg-tvc-gold/20 text-tvc-gold",
    green: "bg-green-500/20 text-green-500",
    purple: "bg-purple-500/20 text-purple-500",
  };

  return (
    <div className="card">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-4 ${colorClasses[color]}`}
      >
        <FunnelIcon />
      </div>
      <p
        className={`${isText ? "text-xl" : "text-3xl"} font-bold text-white mb-1`}
      >
        {value}
      </p>
      <p className="text-sm text-white/60">{label}</p>
      <p className="text-xs text-white/40 mt-1">{subtext}</p>
    </div>
  );
}

function ConversionBadge({ rate }: { rate: number }) {
  let bgColor = "bg-red-500/20 text-red-400";
  if (rate >= 50) bgColor = "bg-green-500/20 text-green-400";
  else if (rate >= 25) bgColor = "bg-yellow-500/20 text-yellow-400";

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${bgColor}`}>
      {rate}%
    </span>
  );
}

function UpsellIcon({ type }: { type: string }) {
  switch (type) {
    case "sunset_tour":
      return <span className="text-sm">🌅</span>;
    case "islands_excursion":
      return <span className="text-sm">🏝</span>;
    case "special_dinner":
      return <span className="text-sm">🍽</span>;
    case "private_brunch":
      return <span className="text-sm">🥂</span>;
    case "nightlife_experience":
      return <span className="text-sm">🎉</span>;
    case "boat_upgrade":
      return <span className="text-sm">🚤</span>;
    case "bottle_service":
      return <span className="text-sm">🍾</span>;
    case "late_checkout":
      return <span className="text-sm">🛏</span>;
    default:
      return <span className="text-sm">⭐</span>;
  }
}

function InsightRow({
  icon,
  label,
  value,
  description,
}: {
  icon: string;
  label: string;
  value: string;
  description: string;
}) {
  const icons: Record<string, string> = {
    sunrise: "🌅",
    ship: "🚢",
    utensils: "🍽",
    clock: "⏰",
  };

  return (
    <div className="flex items-center gap-4 p-3 bg-admin-border/30 rounded-lg">
      <div className="w-10 h-10 bg-tvc-gold/20 rounded-lg flex items-center justify-center text-xl">
        {icons[icon] || "📊"}
      </div>
      <div className="flex-1">
        <p className="text-white font-medium">{label}</p>
        <p className="text-xs text-white/60">{description}</p>
      </div>
      <div className="text-tvc-gold font-semibold">{value}</div>
    </div>
  );
}

function FunnelIcon() {
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
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}
