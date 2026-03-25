// ═══════════════════════════════════════════════════════════════
// REALTIME CHECKLISTS HOOK
// Subscribes to checklist changes via Supabase Realtime
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState, useCallback } from "react";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import type { Database } from "@/types/database";

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

interface UseRealtimeChecklistsOptions {
  date?: string;
  villaId?: string;
  status?: string;
  onUpdate?: (checklists: Checklist[]) => void;
}

export function useRealtimeChecklists(
  options: UseRealtimeChecklistsOptions = {},
) {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { date, villaId, status, onUpdate } = options;

  const fetchChecklists = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setError("Supabase no configurado");
      setLoading(false);
      return;
    }

    try {
      const supabase = createBrowserClient();
      let query = supabase.from("checklists").select("*");

      // Apply filters
      if (date) {
        query = query.eq("date", date);
      } else {
        // Default to today
        query = query.eq("date", new Date().toISOString().split("T")[0]);
      }

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
  }, [date, villaId, status, onUpdate]);

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
      .channel("checklists-realtime")
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
          // Refetch on any change
          fetchChecklists();
        },
      )
      .subscribe((status) => {
        console.log("[useRealtimeChecklists] Subscription status:", status);
      });

    return () => {
      console.log("[useRealtimeChecklists] Cleaning up subscription");
      supabase.removeChannel(channel);
    };
  }, [fetchChecklists]);

  // Summary stats
  const summary = {
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
    refetch: fetchChecklists,
    summary,
  };
}
