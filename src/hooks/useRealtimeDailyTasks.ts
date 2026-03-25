// ═══════════════════════════════════════════════════════════════
// REALTIME DAILY TASKS HOOK
// Subscribes to daily tasks changes via Supabase Realtime
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type DailyTask = Database["public"]["Tables"]["daily_tasks"]["Row"];

interface UseRealtimeDailyTasksOptions {
  userId?: string;
  date?: string;
  department?: string;
  onUpdate?: (tasks: DailyTask[]) => void;
}

export function useRealtimeDailyTasks(
  options: UseRealtimeDailyTasksOptions = {},
) {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { userId, date, department, onUpdate } = options;
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
        console.error("[useRealtimeDailyTasks] Fetch error:", fetchError);
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
      .channel("daily-tasks-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "daily_tasks",
          filter,
        },
        (payload) => {
          console.log(
            "[useRealtimeDailyTasks] Change received:",
            payload.eventType,
          );
          // Refetch on any change
          fetchTasks();
        },
      )
      .subscribe((status) => {
        console.log("[useRealtimeDailyTasks] Subscription status:", status);
      });

    return () => {
      console.log("[useRealtimeDailyTasks] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [fetchTasks, targetDate, userId]);

  // Summary stats
  const summary = {
    total: tasks.reduce((sum, t) => sum + (t.total_count || 0), 0),
    completed: tasks.reduce((sum, t) => sum + (t.completed_count || 0), 0),
    pending: tasks.filter((t) => t.status === "pending").length,
    active: tasks.filter((t) => t.status === "active").length,
    done: tasks.filter((t) => t.status === "completed").length,
  };

  return {
    tasks,
    loading,
    error,
    refetch: fetchTasks,
    summary,
  };
}
