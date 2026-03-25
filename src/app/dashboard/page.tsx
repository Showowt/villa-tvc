"use client";

import { useState, useEffect, useCallback } from "react";
import {
  useDashboard,
  refreshAllDashboard,
  getAutoRefreshInterval,
} from "@/hooks/useDashboard";
import {
  Skeleton,
  SkeletonCard,
  SkeletonListItem,
} from "@/components/ui/LoadingSkeleton";
import { formatTimeES, getRelativeTimeES } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════
// TVC DASHBOARD — Issue #64 Lazy Loading Implementation
// Progressive loading for island internet performance
// ═══════════════════════════════════════════════════════════════

type DashboardTab = "overview" | "operations" | "financial" | "staff";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<DashboardTab>("overview");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Progressive loading - only load what's needed
  const dashboard = useDashboard({
    loadFinancial: activeTab === "financial",
    loadOperations: activeTab === "operations" || activeTab === "overview",
    loadStaff: activeTab === "staff",
    loadSchedule: activeTab === "staff",
  });

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      refreshAllDashboard();
      setLastRefresh(new Date());
    }, getAutoRefreshInterval());

    return () => clearInterval(interval);
  }, []);

  // Manual refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refreshAllDashboard();
      setLastRefresh(new Date());
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header with Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold text-white mb-1">
            Dashboard
          </h1>
          <p className="text-white/60 text-sm">
            Villa concierge overview for Tiny Village Cartagena
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/40">
            Actualizado: {getRelativeTimeES(lastRefresh)}
          </span>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-2 px-3 py-2 bg-admin-border/30 hover:bg-admin-border/50 rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshIcon
              className={`w-4 h-4 text-tvc-turquoise ${isRefreshing ? "animate-spin" : ""}`}
            />
            <span className="text-sm text-white hidden sm:inline">
              Actualizar
            </span>
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-6 bg-admin-border/20 p-1 rounded-lg overflow-x-auto">
        {(
          [
            { id: "overview", label: "Vista General" },
            { id: "operations", label: "Operaciones" },
            { id: "financial", label: "Finanzas" },
            { id: "staff", label: "Personal" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-tvc-turquoise text-white"
                : "text-white/60 hover:text-white hover:bg-admin-border/30"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "overview" && (
        <OverviewTab
          critical={dashboard.critical}
          metrics={dashboard.metrics}
          operations={dashboard.operations}
          isLoadingCritical={dashboard.isLoadingCritical}
          isLoadingMetrics={dashboard.isLoadingMetrics}
          isLoadingOperations={dashboard.isLoadingOperations}
        />
      )}

      {activeTab === "operations" && (
        <OperationsTab
          critical={dashboard.critical}
          operations={dashboard.operations}
          isLoadingCritical={dashboard.isLoadingCritical}
          isLoadingOperations={dashboard.isLoadingOperations}
        />
      )}

      {activeTab === "financial" && (
        <FinancialTab
          financial={dashboard.financial}
          isLoading={dashboard.isLoadingFinancial}
        />
      )}

      {activeTab === "staff" && (
        <StaffTab
          staff={dashboard.staff}
          schedule={dashboard.schedule}
          isLoadingStaff={dashboard.isLoadingStaff}
          isLoadingSchedule={dashboard.isLoadingSchedule}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OVERVIEW TAB — Critical metrics first, secondary lazy loaded
// ═══════════════════════════════════════════════════════════════

interface OverviewTabProps {
  critical: ReturnType<typeof useDashboard>["critical"];
  metrics: ReturnType<typeof useDashboard>["metrics"];
  operations: ReturnType<typeof useDashboard>["operations"];
  isLoadingCritical: boolean;
  isLoadingMetrics: boolean;
  isLoadingOperations: boolean;
}

function OverviewTab({
  critical,
  metrics,
  operations,
  isLoadingCritical,
  isLoadingMetrics,
  isLoadingOperations,
}: OverviewTabProps) {
  return (
    <div className="space-y-6">
      {/* Critical Stats - Load First */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingCritical ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Huespedes Hoy"
              value={critical?.today.guests || 0}
              icon={<UsersIcon />}
              color="turquoise"
            />
            <StatCard
              label="Escalaciones"
              value={critical?.alerts.escalations || 0}
              icon={<AlertIcon />}
              color="red"
              alert={(critical?.alerts.escalations || 0) > 0}
            />
            <StatCard
              label="Check-ins"
              value={critical?.today.checkIns || 0}
              icon={<ArrowDownIcon />}
              color="green"
            />
            <StatCard
              label="Check-outs"
              value={critical?.today.checkOuts || 0}
              icon={<ArrowUpIcon />}
              color="gold"
            />
          </>
        )}
      </div>

      {/* Secondary Stats - Lazy Load */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoadingMetrics ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              label="Conversaciones"
              value={metrics?.counts.conversationsToday || 0}
              icon={<ChatIcon />}
              color="purple"
            />
            <StatCard
              label="Stock Bajo"
              value={metrics?.counts.lowStockItems || 0}
              icon={<WarningIcon />}
              color={metrics?.counts.lowStockItems ? "red" : "green"}
              alert={(metrics?.counts.lowStockItems || 0) > 0}
            />
            <StatCard
              label="Aprobaciones"
              value={metrics?.pendingApprovals.checklists || 0}
              icon={<ClipboardIcon />}
              color="gold"
            />
            <StatCard
              label="Ordenes Compra"
              value={metrics?.counts.pendingPurchaseOrders || 0}
              icon={<CartIcon />}
              color="turquoise"
            />
          </>
        )}
      </div>

      {/* Quick Actions and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low Stock Alerts */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Alertas de Stock
          </h2>
          {isLoadingOperations ? (
            <div className="space-y-2">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : operations?.alerts.lowStock.length ? (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {operations.alerts.lowStock.slice(0, 5).map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <div>
                    <p className="text-sm text-white font-medium">
                      {item.name}
                    </p>
                    <p className="text-xs text-white/60">{item.category}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-red-400 font-bold">
                      {item.current}
                    </p>
                    <p className="text-xs text-white/40">Min: {item.minimum}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-white/40 text-sm py-8 text-center">
              No hay alertas de stock
            </p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Acciones Rapidas
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <QuickAction
              label="Conversaciones"
              href="/dashboard/conversations"
              icon={<ChatIcon />}
            />
            <QuickAction
              label="Escalaciones"
              href="/dashboard/escalations"
              icon={<AlertIcon />}
              badge={critical?.alerts.escalations}
            />
            <QuickAction
              label="Huespedes"
              href="/dashboard/guests"
              icon={<UsersIcon />}
            />
            <QuickAction
              label="Analytics"
              href="/dashboard/analytics"
              icon={<ChartIcon />}
            />
            <QuickAction
              label="Booking Funnel"
              href="/dashboard/funnel"
              icon={<FunnelIcon />}
            />
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Estado del Sistema
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatusItem label="Villa AI" status="operational" />
          <StatusItem label="WhatsApp" status="operational" />
          <StatusItem label="Database" status="operational" />
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// OPERATIONS TAB
// ═══════════════════════════════════════════════════════════════

interface OperationsTabProps {
  critical: ReturnType<typeof useDashboard>["critical"];
  operations: ReturnType<typeof useDashboard>["operations"];
  isLoadingCritical: boolean;
  isLoadingOperations: boolean;
}

function OperationsTab({
  critical,
  operations,
  isLoadingCritical,
  isLoadingOperations,
}: OperationsTabProps) {
  return (
    <div className="space-y-6">
      {/* Checklist Progress */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Progreso de Checklists
        </h2>
        {isLoadingCritical ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <MiniStat
              label="Total"
              value={critical?.checklists.total || 0}
              color="turquoise"
            />
            <MiniStat
              label="Pendientes"
              value={critical?.checklists.pending || 0}
              color="gold"
            />
            <MiniStat
              label="Completados"
              value={critical?.checklists.complete || 0}
              color="purple"
            />
            <MiniStat
              label="Aprobados"
              value={critical?.checklists.approved || 0}
              color="green"
            />
          </div>
        )}
      </div>

      {/* Cleaning Metrics - Issue #20 */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Tiempos de Limpieza (Semana)
        </h2>
        {isLoadingOperations ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MiniStat
              label="Promedio General"
              value={`${operations?.cleaningMetrics.averageOverall || 0} min`}
              color="turquoise"
              subtitle={`${operations?.cleaningMetrics.weekTotal || 0} limpiezas`}
            />
            {operations?.cleaningMetrics.byType &&
              Object.entries(operations.cleaningMetrics.byType)
                .slice(0, 4)
                .map(([type, data]) => (
                  <MiniStat
                    key={type}
                    label={formatChecklistType(type)}
                    value={`${data.avg} min`}
                    color="gold"
                    subtitle={`${data.count} completadas`}
                  />
                ))}
          </div>
        )}
      </div>

      {/* Low Stock Details */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Inventario Bajo
          </h2>
          <span className="text-xs text-white/40">
            {operations?.alerts.lowStockCount || 0} items
          </span>
        </div>
        {isLoadingOperations ? (
          <div className="space-y-2">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ) : operations?.alerts.lowStock.length ? (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {operations.alerts.lowStock.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-3 bg-admin-border/30 rounded-lg hover:bg-admin-border/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      item.current === 0
                        ? "bg-red-500"
                        : item.current < item.minimum / 2
                          ? "bg-orange-500"
                          : "bg-yellow-500"
                    }`}
                  />
                  <div>
                    <p className="text-sm text-white font-medium">
                      {item.name}
                    </p>
                    <p className="text-xs text-white/50">{item.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-sm font-bold ${
                      item.current === 0
                        ? "text-red-400"
                        : item.current < item.minimum / 2
                          ? "text-orange-400"
                          : "text-yellow-400"
                    }`}
                  >
                    {item.current}
                  </p>
                  <p className="text-xs text-white/40">/ {item.minimum}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm py-8 text-center">
            Todo el inventario esta en niveles normales
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FINANCIAL TAB
// ═══════════════════════════════════════════════════════════════

interface FinancialTabProps {
  financial: ReturnType<typeof useDashboard>["financial"];
  isLoading: boolean;
}

function FinancialTab({ financial, isLoading }: FinancialTabProps) {
  return (
    <div className="space-y-6">
      {/* Weekly P&L Summary */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Resumen Semanal P&L
        </h2>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <MiniStat
              label="Ganancia Total"
              value={formatCurrency(financial?.week.totalProfit || 0)}
              color="green"
            />
            <MiniStat
              label="Comida"
              value={formatCurrency(financial?.week.foodProfit || 0)}
              color="turquoise"
              subtitle={`${financial?.week.avgFoodMargin || 0}% margen`}
            />
            <MiniStat
              label="Bar"
              value={formatCurrency(financial?.week.barProfit || 0)}
              color="gold"
              subtitle={`${financial?.week.avgBarMargin || 0}% margen`}
            />
          </div>
        )}
      </div>

      {/* Top Items */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Dishes */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Top Platos
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : (
            <div className="space-y-2">
              {financial?.topDishes.map((dish, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-admin-border/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-tvc-turquoise">
                      #{i + 1}
                    </span>
                    <span className="text-sm text-white">
                      {dish.nameEs || dish.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400 font-medium">
                      {formatCurrency(dish.weeklyProfit)}
                    </p>
                    <p className="text-xs text-white/40">{dish.margin}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Drinks */}
        <div className="card">
          <h2 className="font-display text-lg font-semibold text-white mb-4">
            Top Bebidas
          </h2>
          {isLoading ? (
            <div className="space-y-2">
              <SkeletonListItem />
              <SkeletonListItem />
              <SkeletonListItem />
            </div>
          ) : (
            <div className="space-y-2">
              {financial?.topDrinks.map((drink, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 bg-admin-border/30 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-bold text-tvc-gold">
                      #{i + 1}
                    </span>
                    <span className="text-sm text-white">
                      {drink.nameEs || drink.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-400 font-medium">
                      {formatCurrency(drink.weeklyProfit)}
                    </p>
                    <p className="text-xs text-white/40">{drink.margin}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Transport Cost */}
      <div className="card">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              Costo de Transporte
            </h2>
            <p className="text-xs text-white/40">Semanal estimado</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-10 w-32" />
          ) : (
            <p className="text-2xl font-bold text-red-400">
              {formatCurrency(financial?.week.transportCost || 0)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STAFF TAB
// ═══════════════════════════════════════════════════════════════

interface StaffTabProps {
  staff: ReturnType<typeof useDashboard>["staff"];
  schedule: ReturnType<typeof useDashboard>["schedule"];
  isLoadingStaff: boolean;
  isLoadingSchedule: boolean;
}

function StaffTab({
  staff,
  schedule,
  isLoadingStaff,
  isLoadingSchedule,
}: StaffTabProps) {
  return (
    <div className="space-y-6">
      {/* Staff Summary */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Resumen del Equipo
        </h2>
        {isLoadingStaff ? (
          <div className="grid grid-cols-3 gap-4">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-4">
            <MiniStat
              label="Personal Activo"
              value={staff?.summary.totalStaff || 0}
              color="turquoise"
            />
            <MiniStat
              label="Completacion Prom."
              value={`${staff?.summary.avgCompletion || 0}%`}
              color={
                (staff?.summary.avgCompletion || 0) >= 80 ? "green" : "gold"
              }
            />
            <MiniStat
              label="Top Performer"
              value={staff?.summary.topPerformer || "-"}
              color="gold"
            />
          </div>
        )}
      </div>

      {/* Today's Schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold text-white">
            Horario de Hoy
          </h2>
          <span className="text-xs text-white/40">
            {schedule?.scheduled.total || 0} programados
          </span>
        </div>
        {isLoadingSchedule ? (
          <div className="space-y-2">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ) : schedule?.scheduled.byDepartment ? (
          <div className="space-y-4">
            {Object.entries(schedule.scheduled.byDepartment).map(
              ([dept, staffList]) => (
                <div key={dept}>
                  <h3 className="text-sm font-medium text-tvc-turquoise mb-2 capitalize">
                    {dept}
                  </h3>
                  <div className="space-y-1">
                    {staffList.map((s) => (
                      <div
                        key={s.userId}
                        className="flex items-center justify-between p-2 bg-admin-border/20 rounded-lg"
                      >
                        <span className="text-sm text-white">{s.name}</span>
                        <span className="text-xs text-white/40">
                          {s.shiftStart && s.shiftEnd
                            ? `${s.shiftStart} - ${s.shiftEnd}`
                            : s.shift || "Turno completo"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            )}
          </div>
        ) : (
          <p className="text-white/40 text-sm py-4 text-center">
            No hay horarios programados
          </p>
        )}
      </div>

      {/* Individual Performance */}
      <div className="card">
        <h2 className="font-display text-lg font-semibold text-white mb-4">
          Rendimiento Individual
        </h2>
        {isLoadingStaff ? (
          <div className="space-y-2">
            <SkeletonListItem />
            <SkeletonListItem />
            <SkeletonListItem />
          </div>
        ) : staff?.performance.length ? (
          <div className="space-y-2">
            {staff.performance.map((p) => (
              <div
                key={p.userId}
                className="flex items-center justify-between p-3 bg-admin-border/30 rounded-lg"
              >
                <div>
                  <p className="text-sm text-white font-medium">{p.name}</p>
                  <p className="text-xs text-white/50 capitalize">
                    {p.department}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-sm text-white">
                      {p.tasksCompleted}/{p.tasksTotal}
                    </p>
                    <p className="text-xs text-white/40">tareas</p>
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      p.completionPct >= 80
                        ? "bg-green-500/20 text-green-400"
                        : p.completionPct >= 50
                          ? "bg-yellow-500/20 text-yellow-400"
                          : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {p.completionPct}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-white/40 text-sm py-4 text-center">
            No hay datos de rendimiento para hoy
          </p>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ═══════════════════════════════════════════════════════════════

function StatCard({
  label,
  value,
  icon,
  color,
  alert,
}: {
  label: string;
  value: number | string;
  icon: React.ReactNode;
  color: "turquoise" | "gold" | "red" | "purple" | "green";
  alert?: boolean;
}) {
  const colorClasses = {
    turquoise: "bg-tvc-turquoise/20 text-tvc-turquoise",
    gold: "bg-tvc-gold/20 text-tvc-gold",
    red: "bg-red-500/20 text-red-500",
    purple: "bg-purple-500/20 text-purple-500",
    green: "bg-green-500/20 text-green-500",
  };

  return (
    <div className={`card ${alert ? "border-red-500 border" : ""}`}>
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          <span className="w-5 h-5">{icon}</span>
        </div>
        {alert && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
        )}
      </div>
      <p className="text-2xl md:text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-xs md:text-sm text-white/60">{label}</p>
    </div>
  );
}

function StatCardSkeleton() {
  return (
    <div className="card">
      <div className="flex items-start justify-between mb-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
      </div>
      <Skeleton className="h-8 w-16 mb-1" />
      <Skeleton className="h-4 w-24" />
    </div>
  );
}

function MiniStat({
  label,
  value,
  color,
  subtitle,
}: {
  label: string;
  value: string | number;
  color: "turquoise" | "gold" | "green" | "purple" | "red";
  subtitle?: string;
}) {
  const colorClasses = {
    turquoise: "text-tvc-turquoise",
    gold: "text-tvc-gold",
    green: "text-green-400",
    purple: "text-purple-400",
    red: "text-red-400",
  };

  return (
    <div className="bg-admin-border/30 rounded-lg p-4">
      <p className="text-xs text-white/60 mb-1">{label}</p>
      <p className={`text-xl font-bold ${colorClasses[color]}`}>{value}</p>
      {subtitle && <p className="text-xs text-white/40 mt-1">{subtitle}</p>}
    </div>
  );
}

function QuickAction({
  label,
  href,
  icon,
  badge,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-admin-border/30 rounded-lg hover:bg-admin-border/50 transition-colors relative"
    >
      <span className="w-5 h-5 text-tvc-turquoise">{icon}</span>
      <span className="text-sm text-white">{label}</span>
      {badge !== undefined && badge > 0 && (
        <span className="absolute top-2 right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
          {badge}
        </span>
      )}
    </a>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "operational" | "degraded" | "down";
}) {
  const statusColors = {
    operational: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
  };

  const statusLabels = {
    operational: "Operativo",
    degraded: "Degradado",
    down: "Caido",
  };

  return (
    <div className="flex items-center justify-between p-4 bg-admin-border/30 rounded-lg">
      <span className="text-white">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm text-white/60">{statusLabels[status]}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatChecklistType(type: string): string {
  const typeMap: Record<string, string> = {
    villa_checkout: "Checkout Villa",
    villa_checkin: "Checkin Villa",
    villa_maintenance: "Manto. Villa",
    pool_daily: "Piscina Diaria",
    kitchen_daily: "Cocina Diaria",
  };
  return typeMap[type] || type.replace(/_/g, " ");
}

// ═══════════════════════════════════════════════════════════════
// ICONS
// ═══════════════════════════════════════════════════════════════

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}

function ArrowDownIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 14l-7 7m0 0l-7-7m7 7V3"
      />
    </svg>
  );
}

function ArrowUpIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 10l7-7m0 0l7 7m-7-7v18"
      />
    </svg>
  );
}

function WarningIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
      />
    </svg>
  );
}

function FunnelIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
      />
    </svg>
  );
}
