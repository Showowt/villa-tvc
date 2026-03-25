// ═══════════════════════════════════════════════════════════════
// GENERIC REALTIME SUBSCRIPTION HOOK
// Auto-reconnect, loading state, error handling
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import {
  createRealtimeSubscription,
  onRealtimeStatusChange,
  type ConnectionStatus,
  type RealtimeTable,
  type RealtimeChannelManager,
} from "@/lib/supabase-realtime";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface UseRealtimeSubscriptionOptions<T> {
  table: RealtimeTable;
  filter?: string;
  initialFetch?: () => Promise<T[]>;
  onInsert?: (newItem: T) => void;
  onUpdate?: (updatedItem: T) => void;
  onDelete?: (deletedItem: { old: T }) => void;
  enabled?: boolean;
}

export interface UseRealtimeSubscriptionResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  connectionStatus: ConnectionStatus;
  refetch: () => Promise<void>;
  isConnected: boolean;
}

// ═══════════════════════════════════════════════════════════════
// HOOK IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════

export function useRealtimeSubscription<T>(
  options: UseRealtimeSubscriptionOptions<T>,
): UseRealtimeSubscriptionResult<T> {
  const {
    table,
    filter,
    initialFetch,
    onInsert,
    onUpdate,
    onDelete,
    enabled = true,
  } = options;

  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const subscriptionRef = useRef<RealtimeChannelManager | null>(null);
  const mountedRef = useRef(true);

  // Fetch initial data
  const fetchData = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    if (!initialFetch) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const result = await initialFetch();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      if (mountedRef.current) {
        setError(errorMessage);
      }
      console.error(`[useRealtimeSubscription] Fetch error for ${table}:`, e);
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [initialFetch, table]);

  // Setup subscription
  useEffect(() => {
    mountedRef.current = true;

    if (!enabled || !isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    // Fetch initial data
    fetchData();

    // Create realtime subscription
    const subscription = createRealtimeSubscription(
      {
        table,
        filter,
        onInsert: (payload) => {
          console.log(`[useRealtimeSubscription] INSERT on ${table}`);
          const newRecord = payload.new as T;
          if (onInsert) {
            onInsert(newRecord);
          }
          // Refetch to ensure consistency
          fetchData();
        },
        onUpdate: (payload) => {
          console.log(`[useRealtimeSubscription] UPDATE on ${table}`);
          const updatedRecord = payload.new as T;
          if (onUpdate) {
            onUpdate(updatedRecord);
          }
          // Refetch to ensure consistency
          fetchData();
        },
        onDelete: (payload) => {
          console.log(`[useRealtimeSubscription] DELETE on ${table}`);
          const deletedRecord = payload.old as T;
          if (onDelete) {
            onDelete({ old: deletedRecord });
          }
          // Refetch to ensure consistency
          fetchData();
        },
      },
      (status) => {
        if (mountedRef.current) {
          setConnectionStatus(status);
        }
      },
    );

    subscriptionRef.current = subscription;

    // Subscribe to global status changes
    const unsubscribeStatus = onRealtimeStatusChange((status) => {
      if (mountedRef.current) {
        setConnectionStatus(status);
      }
    });

    return () => {
      mountedRef.current = false;
      subscriptionRef.current?.unsubscribe();
      unsubscribeStatus();
    };
  }, [table, filter, enabled, fetchData, onInsert, onUpdate, onDelete]);

  return {
    data,
    loading,
    error,
    connectionStatus,
    refetch: fetchData,
    isConnected: connectionStatus === "connected",
  };
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION STATUS HOOK
// ═══════════════════════════════════════════════════════════════

export function useRealtimeConnectionStatus(): {
  status: ConnectionStatus;
  isConnected: boolean;
  isReconnecting: boolean;
  hasError: boolean;
} {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const unsubscribe = onRealtimeStatusChange(setStatus);
    return unsubscribe;
  }, []);

  return {
    status,
    isConnected: status === "connected",
    isReconnecting: status === "connecting",
    hasError: status === "error",
  };
}

// ═══════════════════════════════════════════════════════════════
// SPECIALIZED HOOKS FOR COMMON PATTERNS
// ═══════════════════════════════════════════════════════════════

/**
 * Hook for realtime alerts (escalations, low stock, urgent maintenance)
 */
export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<{
    pendingApprovals: number;
    lowStockCount: number;
    escalatedConversations: number;
    urgentMaintenance: number;
  }>({
    pendingApprovals: 0,
    lowStockCount: 0,
    escalatedConversations: 0,
    urgentMaintenance: 0,
  });
  const [loading, setLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const fetchAlerts = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();

      // Fetch pending approvals
      const { count: pendingApprovals } = await supabase
        .from("checklists")
        .select("*", { count: "exact", head: true })
        .eq("status", "complete")
        .is("approved_at", null);

      // Fetch low stock count
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

      // Fetch escalated conversations
      const { count: escalatedConversations } = await supabase
        .from("conversations")
        .select("*", { count: "exact", head: true })
        .eq("status", "escalated");

      setAlerts({
        pendingApprovals: pendingApprovals || 0,
        lowStockCount,
        escalatedConversations: escalatedConversations || 0,
        urgentMaintenance: 0, // Add when maintenance table has urgent flag
      });
    } catch (e) {
      console.error("[useRealtimeAlerts] Error fetching alerts:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    fetchAlerts();

    // Subscribe to relevant tables
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("alerts-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "checklists" },
        () => fetchAlerts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ingredients" },
        () => fetchAlerts(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "conversations" },
        () => fetchAlerts(),
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAlerts]);

  const totalAlerts =
    alerts.pendingApprovals +
    alerts.lowStockCount +
    alerts.escalatedConversations +
    alerts.urgentMaintenance;

  return {
    alerts,
    totalAlerts,
    loading,
    connectionStatus,
    refetch: fetchAlerts,
    isConnected: connectionStatus === "connected",
  };
}
