// ═══════════════════════════════════════════════════════════════
// TVC HOOKS BARREL EXPORT
// Export all hooks for easy importing
// ═══════════════════════════════════════════════════════════════

// Original realtime hooks (kept for backwards compatibility)
export { useRealtimeChecklists } from "./useRealtimeChecklists";
export { useRealtimeVillaStatus } from "./useRealtimeVillaStatus";
export { useRealtimeDailyOccupancy } from "./useRealtimeDailyOccupancy";
export { useRealtimeDailyTasks } from "./useRealtimeDailyTasks";

// New enhanced realtime hooks
export {
  useRealtimeChecklists as useRealtimeChecklistsEnhanced,
  useRealtimeTasks,
  useRealtimeOccupancy,
  useRealtimeAlerts,
} from "./useRealtimeVillas";

// Generic subscription hooks
export {
  useRealtimeSubscription,
  useRealtimeConnectionStatus,
  useRealtimeAlerts as useRealtimeAlertsGeneric,
} from "./useRealtimeSubscription";

// Dashboard hooks (Issue #64 - Lazy Loading)
export {
  useDashboard,
  useCriticalMetrics,
  useSecondaryMetrics,
  useFinancialMetrics,
  useOperationsMetrics,
  useStaffMetrics,
  useScheduleMetrics,
  refreshAllDashboard,
  refreshCritical,
  refreshFinancial,
  getAutoRefreshInterval,
} from "./useDashboard";

// Cache hooks (SWR-based caching)
export {
  useCachedIngredients,
  useCachedMenuItems,
  useCachedTemplates,
  useCachedSupplyTemplates,
  useCachedLinenInventory,
  useCachedServices,
  useCachedTrainingRequirements,
  useUserTraining,
} from "./useCache";
