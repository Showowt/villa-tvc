"use client";

import useSWR, { SWRConfiguration, mutate } from "swr";

// ═══════════════════════════════════════════════════════════════
// TVC DASHBOARD HOOKS — Issue #64 Lazy Loading Implementation
// Progressive loading with SWR caching for island internet
// ═══════════════════════════════════════════════════════════════

// Cache TTLs in milliseconds
const CACHE_CRITICAL = 30 * 1000; // 30 seconds - real-time data
const CACHE_METRICS = 2 * 60 * 1000; // 2 minutes - counts
const CACHE_FINANCIAL = 5 * 60 * 1000; // 5 minutes - P&L data
const CACHE_STAFF = 3 * 60 * 1000; // 3 minutes - staff performance

// Auto-refresh interval (5 minutes for background refresh)
const AUTO_REFRESH_INTERVAL = 5 * 60 * 1000;

// Generic fetcher
const fetcher = async <T>(url: string): Promise<T> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
};

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface CriticalMetrics {
  success: boolean;
  today: {
    date: string;
    guests: number;
    checkIns: number;
    checkOuts: number;
    villasOccupied: string[];
  };
  alerts: {
    escalations: number;
    escalationDetails: Array<{
      id: string;
      contact_name: string | null;
      channel: string;
    }>;
    pendingApprovals: number;
  };
  checklists: {
    total: number;
    pending: number;
    inProgress: number;
    complete: number;
    approved: number;
  };
}

export interface SecondaryMetrics {
  success: boolean;
  counts: {
    pendingPurchaseOrders: number;
    lowStockItems: number;
    conversationsToday: number;
    messagesTotal: number;
  };
  pendingApprovals: {
    checklists: number;
    purchaseOrders: number;
  };
  lastUpdated: string;
}

export interface FinancialMetrics {
  success: boolean;
  week: {
    foodProfit: number;
    barProfit: number;
    totalProfit: number;
    avgFoodMargin: number;
    avgBarMargin: number;
    transportCost: number;
  };
  topDishes: Array<{
    name: string;
    nameEs?: string;
    margin: number;
    weeklyProfit: number;
  }>;
  topDrinks: Array<{
    name: string;
    nameEs?: string;
    margin: number;
    weeklyProfit: number;
  }>;
}

export interface OperationsMetrics {
  success: boolean;
  alerts: {
    lowStock: Array<{
      id: string;
      name: string;
      current: number;
      minimum: number;
      category: string;
    }>;
    lowStockCount: number;
  };
  operations: {
    conversationsToday: number;
    staffTasks: Array<{
      department: string;
      completed: number;
      total: number;
      pct: number;
    }>;
  };
  cleaningMetrics: {
    weekTotal: number;
    byType: Record<string, { total: number; count: number; avg: number }>;
    averageOverall: number;
  };
}

export interface StaffMetrics {
  success: boolean;
  date: string;
  performance: Array<{
    userId: string;
    name: string;
    department: string | null;
    tasksCompleted: number;
    tasksTotal: number;
    completionPct: number;
    checklistsCompleted: number;
  }>;
  summary: {
    totalStaff: number;
    avgCompletion: number;
    topPerformer: string | null;
  };
  lastUpdated: string;
}

export interface ScheduleMetrics {
  success: boolean;
  date: string;
  scheduled: {
    total: number;
    byDepartment: Record<
      string,
      Array<{
        userId: string;
        name: string;
        shift: string | null;
        shiftStart: string | null;
        shiftEnd: string | null;
      }>
    >;
    staffIds: string[];
  };
  unscheduled: Array<{
    userId: string;
    name: string;
    department: string | null;
  }>;
}

// ═══════════════════════════════════════════════════════════════
// HOOK CONFIGURATIONS
// ═══════════════════════════════════════════════════════════════

const criticalConfig: SWRConfiguration = {
  revalidateOnFocus: true,
  revalidateOnReconnect: true,
  dedupingInterval: CACHE_CRITICAL,
  refreshInterval: 0, // Manual refresh control
  errorRetryCount: 3,
  errorRetryInterval: 5000,
};

const metricsConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: CACHE_METRICS,
  refreshInterval: 0,
  errorRetryCount: 2,
};

const financialConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: CACHE_FINANCIAL,
  refreshInterval: 0,
  errorRetryCount: 2,
};

const staffConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  dedupingInterval: CACHE_STAFF,
  refreshInterval: 0,
  errorRetryCount: 2,
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD HOOKS
// ═══════════════════════════════════════════════════════════════

/**
 * Critical metrics - loads first, real-time data
 * Occupancy, alerts, escalations
 */
export function useCriticalMetrics() {
  return useSWR<CriticalMetrics>(
    "/api/dashboard/critical",
    fetcher,
    criticalConfig,
  );
}

/**
 * Secondary metrics - counts and pending approvals
 * Loads after critical, cached longer
 */
export function useSecondaryMetrics() {
  return useSWR<SecondaryMetrics>(
    "/api/dashboard/metrics",
    fetcher,
    metricsConfig,
  );
}

/**
 * Financial metrics - P&L data
 * Lazy loaded on tab/scroll, longest cache
 */
export function useFinancialMetrics(enabled = true) {
  return useSWR<FinancialMetrics>(
    enabled ? "/api/dashboard/pl" : null,
    fetcher,
    financialConfig,
  );
}

/**
 * Operations metrics - low stock, cleaning times
 * Lazy loaded, includes Issue #20 cleaning metrics
 */
export function useOperationsMetrics(enabled = true) {
  return useSWR<OperationsMetrics>(
    enabled ? "/api/dashboard/operations" : null,
    fetcher,
    metricsConfig,
  );
}

/**
 * Staff performance metrics
 * Lazy loaded on staff tab
 */
export function useStaffMetrics(enabled = true) {
  return useSWR<StaffMetrics>(
    enabled ? "/api/dashboard/staff" : null,
    fetcher,
    staffConfig,
  );
}

/**
 * Schedule metrics - who's working today
 * Lazy loaded
 */
export function useScheduleMetrics(enabled = true) {
  return useSWR<ScheduleMetrics>(
    enabled ? "/api/dashboard/schedule" : null,
    fetcher,
    staffConfig,
  );
}

// ═══════════════════════════════════════════════════════════════
// REFRESH UTILITIES
// ═══════════════════════════════════════════════════════════════

/**
 * Manually refresh all dashboard data
 */
export async function refreshAllDashboard() {
  await Promise.all([
    mutate("/api/dashboard/critical"),
    mutate("/api/dashboard/metrics"),
    mutate("/api/dashboard/pl"),
    mutate("/api/dashboard/operations"),
    mutate("/api/dashboard/staff"),
    mutate("/api/dashboard/schedule"),
  ]);
}

/**
 * Refresh only critical metrics
 */
export async function refreshCritical() {
  await mutate("/api/dashboard/critical");
}

/**
 * Refresh financial data
 */
export async function refreshFinancial() {
  await mutate("/api/dashboard/pl");
}

/**
 * Get auto-refresh interval constant
 */
export function getAutoRefreshInterval() {
  return AUTO_REFRESH_INTERVAL;
}

// ═══════════════════════════════════════════════════════════════
// COMBINED DASHBOARD HOOK
// For components that need all data with progressive loading
// ═══════════════════════════════════════════════════════════════

interface DashboardState {
  // Data
  critical: CriticalMetrics | undefined;
  metrics: SecondaryMetrics | undefined;
  financial: FinancialMetrics | undefined;
  operations: OperationsMetrics | undefined;
  staff: StaffMetrics | undefined;
  schedule: ScheduleMetrics | undefined;

  // Loading states
  isLoadingCritical: boolean;
  isLoadingMetrics: boolean;
  isLoadingFinancial: boolean;
  isLoadingOperations: boolean;
  isLoadingStaff: boolean;
  isLoadingSchedule: boolean;

  // Error states
  errorCritical: Error | undefined;
  errorMetrics: Error | undefined;
  errorFinancial: Error | undefined;
  errorOperations: Error | undefined;
  errorStaff: Error | undefined;
  errorSchedule: Error | undefined;

  // Actions
  refreshAll: () => Promise<void>;
  refreshCritical: () => Promise<void>;

  // Timestamps
  lastUpdated: string | null;
}

export function useDashboard(options?: {
  loadFinancial?: boolean;
  loadOperations?: boolean;
  loadStaff?: boolean;
  loadSchedule?: boolean;
}): DashboardState {
  const {
    loadFinancial = false,
    loadOperations = false,
    loadStaff = false,
    loadSchedule = false,
  } = options || {};

  const critical = useCriticalMetrics();
  const metrics = useSecondaryMetrics();
  const financial = useFinancialMetrics(loadFinancial);
  const operations = useOperationsMetrics(loadOperations);
  const staff = useStaffMetrics(loadStaff);
  const schedule = useScheduleMetrics(loadSchedule);

  // Calculate last updated from most recent data
  const lastUpdated =
    metrics.data?.lastUpdated || staff.data?.lastUpdated || null;

  return {
    // Data
    critical: critical.data,
    metrics: metrics.data,
    financial: financial.data,
    operations: operations.data,
    staff: staff.data,
    schedule: schedule.data,

    // Loading states
    isLoadingCritical: critical.isLoading,
    isLoadingMetrics: metrics.isLoading,
    isLoadingFinancial: financial.isLoading,
    isLoadingOperations: operations.isLoading,
    isLoadingStaff: staff.isLoading,
    isLoadingSchedule: schedule.isLoading,

    // Error states
    errorCritical: critical.error,
    errorMetrics: metrics.error,
    errorFinancial: financial.error,
    errorOperations: operations.error,
    errorStaff: staff.error,
    errorSchedule: schedule.error,

    // Actions
    refreshAll: refreshAllDashboard,
    refreshCritical: refreshCritical,

    // Timestamps
    lastUpdated,
  };
}
