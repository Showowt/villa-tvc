// ═══════════════════════════════════════════════════════════════
// REALTIME VILLA STATUS HOOK
// Subscribes to villa status changes via Supabase Realtime
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";

interface VillaStatus {
  villa_id: string;
  status: "occupied" | "vacant" | "cleaning" | "maintenance" | "blocked";
  cleaning_status: "clean" | "dirty" | "in_progress" | "inspected";
  maintenance_status: "ok" | "minor_issues" | "major_issues" | "out_of_service";
  current_booking_id?: string;
  last_cleaned_at?: string;
  last_inspected_at?: string;
  notes?: string;
  updated_at: string;
}

interface UseRealtimeVillaStatusOptions {
  villaId?: string;
  onUpdate?: (statuses: VillaStatus[]) => void;
}

export function useRealtimeVillaStatus(
  options: UseRealtimeVillaStatusOptions = {},
) {
  const [villaStatuses, setVillaStatuses] = useState<VillaStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { villaId, onUpdate } = options;

  const fetchVillaStatuses = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      // Cast to bypass type checking since villa_status may not be in generated types
      let query = supabase.from("villa_status" as "users").select("*");

      if (villaId) {
        query = query.eq("villa_id", villaId);
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error: fetchError } = (await query) as any;

      if (fetchError) {
        console.error("[useRealtimeVillaStatus] Fetch error:", fetchError);
        setError(fetchError.message);
      } else {
        setVillaStatuses(data || []);
        onUpdate?.(data || []);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "Error desconocido";
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [villaId, onUpdate]);

  useEffect(() => {
    if (!isBrowserClientAvailable()) {
      setLoading(false);
      return;
    }

    // Initial fetch
    fetchVillaStatuses();

    // Subscribe to realtime changes
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("villa-status-realtime")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "villa_status",
        },
        (payload) => {
          console.log(
            "[useRealtimeVillaStatus] Change received:",
            payload.eventType,
          );
          // Refetch on any change
          fetchVillaStatuses();
        },
      )
      .subscribe((status) => {
        console.log("[useRealtimeVillaStatus] Subscription status:", status);
      });

    return () => {
      console.log("[useRealtimeVillaStatus] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [fetchVillaStatuses]);

  // Get status for a specific villa
  const getVillaStatus = (id: string): VillaStatus | undefined => {
    return villaStatuses.find((v) => v.villa_id === id);
  };

  // Summary stats
  const summary = {
    total: villaStatuses.length,
    occupied: villaStatuses.filter((v) => v.status === "occupied").length,
    vacant: villaStatuses.filter((v) => v.status === "vacant").length,
    arriving: villaStatuses.filter((v) => v.status === "arriving").length,
    cleaning: villaStatuses.filter((v) => v.status === "cleaning").length,
    checkout: villaStatuses.filter((v) => v.status === "checkout").length,
    maintenance: villaStatuses.filter((v) => v.status === "maintenance").length,
  };

  return {
    villaStatuses,
    loading,
    error,
    refetch: fetchVillaStatuses,
    getVillaStatus,
    summary,
  };
}
