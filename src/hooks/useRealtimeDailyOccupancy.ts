// ═══════════════════════════════════════════════════════════════
// REALTIME DAILY OCCUPANCY HOOK
// Subscribes to daily occupancy changes via Supabase Realtime
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type DailyOccupancy = Database["public"]["Tables"]["daily_occupancy"]["Row"];

interface UseRealtimeDailyOccupancyOptions {
  date?: string;
  onUpdate?: (occupancy: DailyOccupancy | null) => void;
}

export function useRealtimeDailyOccupancy(
  options: UseRealtimeDailyOccupancyOptions = {},
) {
  const [occupancy, setOccupancy] = useState<DailyOccupancy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
        console.error("[useRealtimeDailyOccupancy] Fetch error:", fetchError);
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
      .channel("daily-occupancy-realtime")
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
            "[useRealtimeDailyOccupancy] Change received:",
            payload.eventType,
          );
          // Refetch on any change
          fetchOccupancy();
        },
      )
      .subscribe((status) => {
        console.log("[useRealtimeDailyOccupancy] Subscription status:", status);
      });

    return () => {
      console.log("[useRealtimeDailyOccupancy] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [fetchOccupancy, targetDate]);

  return {
    occupancy,
    loading,
    error,
    refetch: fetchOccupancy,
    guestsCount: occupancy?.guests_count || 0,
    checkIns: occupancy?.check_ins || 0,
    checkOuts: occupancy?.check_outs || 0,
  };
}
