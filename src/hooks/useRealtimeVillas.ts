// ═══════════════════════════════════════════════════════════════
// REALTIME VILLAS HOOKS
// Specialized hooks for villa operations
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import type { Database } from "@/types/database";
import type { ConnectionStatus } from "@/lib/supabase-realtime";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];
type DailyTask = Database["public"]["Tables"]["daily_tasks"]["Row"];
type DailyOccupancy = Database["public"]["Tables"]["daily_occupancy"]["Row"];

// ═══════════════════════════════════════════════════════════════
// useRealtimeChecklists - Enhanced Version
// ═══════════════════════════════════════════════════════════════

interface UseRealtimeChecklistsOptions {
  date?: string;
  villaId?: string;
  status?: string;
  onUpdate?: (checklists: Checklist[]) => void;
  onApproval?: (checklist: Checklist) => void;
  onRejection?: (checklist: Checklist) => void;
}

interface ChecklistSummary {
  total: number;
  pending: number;
  inProgress: number;
  complete: number;
  approved: number;
  rejected: number;
}

export function useRealtimeChecklists(
  options: UseRealtimeChecklistsOptions = {},
) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const { date, villaId, status, onUpdate, onApproval, onRejection } = options;
  const targetDate = date || new Date().toISOString().split("T")[0];

  const fetchChecklists = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      let query = supabase
        .from("checklists")
        .select("*")
        .eq("date", targetDate);

      if (villaId) {
        query = query.eq("villa_id", villaId);
      }

      if (status) {
        query = query.eq("status", status);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("[useRealtimeChecklists] Fetch error:", fetchError);
        setError(fetchError.message);
      } else {
        setChecklists(data || []);
        onUpdate?.(data || []);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [targetDate, villaId, status, onUpdate]);

  useEffect(() => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchChecklists();

    // Subscribe to realtime changes
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`checklists-realtime-${targetDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "checklists",
        },
        (payload) => {
          console.log(
            "[useRealtimeChecklists] Change received:",
            payload.eventType,
          );

          // Check for approval/rejection events
          if (payload.eventType === "UPDATE") {
            const newRecord = payload.new as Checklist;
            const oldRecord = payload.old as Partial<Checklist>;

            // Detect approval
            if (
              newRecord.status === "approved" &&
              oldRecord.status !== "approved"
            ) {
              console.log(
                "[useRealtimeChecklists] Checklist approved:",
                newRecord.id,
              );
              onApproval?.(newRecord);
            }

            // Detect rejection
            if (
              newRecord.status === "rejected" &&
              oldRecord.status !== "rejected"
            ) {
              console.log(
                "[useRealtimeChecklists] Checklist rejected:",
                newRecord.id,
              );
              onRejection?.(newRecord);
            }
          }

          // Refetch on any change
          fetchChecklists();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
          console.log("[useRealtimeChecklists] Connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
          console.log("[useRealtimeChecklists] Disconnected");
        } else if (status === "TIMED_OUT") {
          setConnectionStatus("error");
          console.error("[useRealtimeChecklists] Connection timed out");
        }
      });

    return () => {
      console.log("[useRealtimeChecklists] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [fetchChecklists, targetDate, onApproval, onRejection]);

  // Summary stats
  const summary: ChecklistSummary = {
    total: checklists.length,
    pending: checklists.filter((c) => c.status === "pending").length,
    inProgress: checklists.filter((c) => c.status === "in_progress").length,
    complete: checklists.filter((c) => c.status === "complete").length,
    approved: checklists.filter((c) => c.status === "approved").length,
    rejected: checklists.filter((c) => c.status === "rejected").length,
  };

  return {
    checklists,
    loading,
    error,
    connectionStatus,
    refetch: fetchChecklists,
    summary,
    isConnected: connectionStatus === "connected",
  };
}

// ═══════════════════════════════════════════════════════════════
// useRealtimeTasks - For Staff Tasks Page
// ═══════════════════════════════════════════════════════════════

interface UseRealtimeTasksOptions {
  userId?: string;
  date?: string;
  department?: string;
  onUpdate?: (tasks: DailyTask[]) => void;
  onTaskComplete?: (task: DailyTask) => void;
  onPointsAwarded?: (task: DailyTask, points: number) => void;
}

interface TaskSummary {
  total: number;
  completed: number;
  pending: number;
  active: number;
  done: number;
  completionRate: number;
}

export function useRealtimeTasks(options: UseRealtimeTasksOptions = {}) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const {
    userId,
    date,
    department,
    onUpdate,
    onTaskComplete,
    onPointsAwarded,
  } = options;
  const targetDate = date || new Date().toISOString().split("T")[0];

  const fetchTasks = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      let query = supabase
        .from("daily_tasks")
        .select("*")
        .eq("date", targetDate);

      if (userId) {
        query = query.eq("user_id", userId);
      }

      if (department) {
        query = query.eq("department", department);
      }

      query = query.order("created_at", { ascending: false });

      const { data, error: fetchError } = await query;

      if (fetchError) {
        console.error("[useRealtimeTasks] Fetch error:", fetchError);
        setError(fetchError.message);
      } else {
        setTasks(data || []);
        onUpdate?.(data || []);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [targetDate, userId, department, onUpdate]);

  useEffect(() => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchTasks();

    // Subscribe to realtime changes
    const supabase = createBrowserClient();

    // Build filter for subscription
    let filter = `date=eq.${targetDate}`;
    if (userId) {
      filter = `user_id=eq.${userId}`;
    }

    const channel = supabase
      .channel(`daily-tasks-realtime-${userId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_tasks",
          filter,
        },
        (payload) => {
          console.log("[useRealtimeTasks] Change received:", payload.eventType);

          // Detect task completion
          if (payload.eventType === "UPDATE") {
            const newRecord = payload.new as DailyTask;
            const oldRecord = payload.old as Partial<DailyTask>;

            if (
              newRecord.status === "completed" &&
              oldRecord.status !== "completed"
            ) {
              console.log("[useRealtimeTasks] Task completed:", newRecord.id);
              onTaskComplete?.(newRecord);
            }
          }

          // Refetch on any change
          fetchTasks();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setConnectionStatus("connected");
        } else if (status === "CLOSED" || status === "CHANNEL_ERROR") {
          setConnectionStatus("disconnected");
        }
      });

    // Also subscribe to staff_rewards for point notifications
    const rewardsChannel = supabase
      .channel(`staff-rewards-realtime-${userId || "all"}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "staff_rewards",
          filter: userId ? `user_id=eq.${userId}` : undefined,
        },
        (payload) => {
          console.log("[useRealtimeTasks] Points awarded:", payload.new);
          const reward = payload.new as { points: number };
          // Find the related task
          const task = tasks.find((t) => t.status === "completed");
          if (task && onPointsAwarded) {
            onPointsAwarded(task, reward.points);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      supabase.removeChannel(rewardsChannel);
    };
  }, [fetchTasks, targetDate, userId, tasks, onTaskComplete, onPointsAwarded]);

  // Summary stats
  const totalTasks = tasks.reduce((sum, t) => sum + (t.total_count || 0), 0);
  const completedTasks = tasks.reduce(
    (sum, t) => sum + (t.completed_count || 0),
    0,
  );

  const summary: TaskSummary = {
    total: totalTasks,
    completed: completedTasks,
    pending: tasks.filter((t) => t.status === "pending").length,
    active: tasks.filter((t) => t.status === "active").length,
    done: tasks.filter((t) => t.status === "completed").length,
    completionRate: totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0,
  };

  return {
    tasks,
    loading,
    error,
    connectionStatus,
    refetch: fetchTasks,
    summary,
    isConnected: connectionStatus === "connected",
  };
}

// ═══════════════════════════════════════════════════════════════
// useRealtimeOccupancy - For Dashboard
// ═══════════════════════════════════════════════════════════════

interface UseRealtimeOccupancyOptions {
  date?: string;
  onUpdate?: (occupancy: DailyOccupancy | null) => void;
}

export function useRealtimeOccupancy(
  options: UseRealtimeOccupancyOptions = {},
) {
  const [occupancy, setOccupancy] = useState<DailyOccupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected");

  const { date, onUpdate } = options;
  const targetDate = date || new Date().toISOString().split("T")[0];

  const fetchOccupancy = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      const { data, error: fetchError } = await supabase
        .from("daily_occupancy")
        .select("*")
        .eq("date", targetDate)
        .single();

      if (fetchError && fetchError.code !== "PGRST116") {
        // PGRST116 = no rows returned
        console.error("[useRealtimeOccupancy] Fetch error:", fetchError);
        setError(fetchError.message);
      } else {
        setOccupancy(data);
        onUpdate?.(data);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [targetDate, onUpdate]);

  useEffect(() => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchOccupancy();

    // Subscribe to realtime changes
    const supabase = createBrowserClient();
    const channel = supabase
      .channel(`daily-occupancy-realtime-${targetDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_occupancy",
          filter: `date=eq.${targetDate}`,
        },
        (payload) => {
          console.log(
            "[useRealtimeOccupancy] Change received:",
            payload.eventType,
          );
          // Refetch on any change
          fetchOccupancy();
        },
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
  }, [fetchOccupancy, targetDate]);

  return {
    occupancy,
    loading,
    error,
    connectionStatus,
    refetch: fetchOccupancy,
    guestsCount: occupancy?.guests_count || 0,
    checkIns: occupancy?.check_ins || 0,
    checkOuts: occupancy?.check_outs || 0,
    isConnected: connectionStatus === "connected",
  };
}

// ═══════════════════════════════════════════════════════════════
// useRealtimeAlerts - For Dashboard Alerts
// ═══════════════════════════════════════════════════════════════

interface AlertCounts {
  pendingApprovals: number;
  lowStockCount: number;
  escalatedConversations: number;
  urgentMaintenance: number;
}

export function useRealtimeAlerts() {
  const [alerts, setAlerts] = useState<AlertCounts>({
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
        urgentMaintenance: 0,
      });
    } catch (e) {
      console.error("[useRealtimeAlerts] Error:", e);
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
      .channel("alerts-realtime-combined")
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
