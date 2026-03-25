"use client";

// ═══════════════════════════════════════════════════════════════
// TVC STAFF TASKS PAGE — WITH LOADING & ERROR STATES
// Issues #2 & #3 — P0 Day 1 Fixes
// Issue #81 — REALTIME UPDATES
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import Link from "next/link";
import SwipeableCard from "@/components/staff/SwipeableCard";
import PullToRefresh from "@/components/staff/PullToRefresh";
import {
  SkeletonStats,
  SkeletonTaskItem,
  SkeletonCard,
} from "@/components/ui/LoadingSkeleton";
import {
  ApiError,
  normalizeApiError,
  type ApiErrorType,
} from "@/components/ui/ApiError";
import { useToast } from "@/components/ui/Toast";
import { useOnlineStatus } from "@/lib/api";
import { useLanguage } from "@/lib/i18n/context";
import {
  useRealtimeOccupancy,
  useRealtimeChecklists,
} from "@/hooks/useRealtimeVillas";
import { InlineConnectionStatus } from "@/components/ui/ConnectionStatus";

type DailyTask = Tables<"daily_occupancy"> & {
  tasks: Array<{
    id: string;
    task: string;
    task_es: string;
    priority: string;
    status: string;
    due_time?: string;
    checklist_id?: string;
    completed_at?: string;
    notes?: string;
  }>;
};

export default function StaffTasksPage() {
  const [error, setError] = useState<ApiErrorType | null>(null);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();
  const { t, lang } = useLanguage();

  // ═══════════════════════════════════════════════════════════════
  // REALTIME SUBSCRIPTIONS (Issue #81)
  // Auto-update when occupancy or checklists change
  // ═══════════════════════════════════════════════════════════════
  const {
    occupancy,
    loading: occupancyLoading,
    refetch: refetchOccupancy,
    isConnected: occupancyConnected,
  } = useRealtimeOccupancy({});

  const {
    checklists,
    loading: checklistsLoading,
    refetch: refetchChecklists,
    isConnected: checklistsConnected,
    summary: checklistSummary,
  } = useRealtimeChecklists({
    onUpdate: () => {
      console.log("[StaffTasks] Checklists updated via realtime");
    },
  });

  const loading = occupancyLoading || checklistsLoading;
  const isRealtime = occupancyConnected && checklistsConnected;

  const loadTodayData = useCallback(async () => {
    try {
      await Promise.all([refetchOccupancy(), refetchChecklists()]);
      setError(null);
    } catch (err) {
      console.error("[StaffTasks] Error loading data:", err);
      const apiError = normalizeApiError(err);
      setError(apiError);

      if (!isOnline) {
        addToast("warning", "Sin conexion. Mostrando datos guardados.");
      }
    }
  }, [isOnline, addToast, refetchOccupancy, refetchChecklists]);

  const handleRefresh = async () => {
    await loadTodayData();
  };

  const handleCompleteChecklist = async (checklistId: string) => {
    const supabase = createBrowserClient();
    await supabase
      .from("checklists")
      .update({ status: "complete", completed_at: new Date().toISOString() })
      .eq("id", checklistId);
    await loadTodayData();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
      case "approved":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return t("status.complete");
      case "approved":
        return t("status.approved");
      case "in_progress":
        return t("status.in_progress");
      case "rejected":
        return t("status.rejected");
      default:
        return t("status.pending");
    }
  };

  // Loading state with proper skeletons
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <SkeletonStats />
        <div>
          <div className="h-4 w-32 bg-slate-700/50 rounded mb-3 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          <div className="space-y-3">
            <SkeletonTaskItem />
            <SkeletonTaskItem />
            <SkeletonTaskItem />
          </div>
        </div>
        <div>
          <div className="h-4 w-28 bg-slate-700/50 rounded mb-3 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          <div className="grid grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    );
  }

  // Error state with retry
  if (error) {
    return <ApiError error={error} onRetry={loadTodayData} className="mt-8" />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      {/* Offline indicator */}
      {!isOnline && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2 mb-4">
          <span className="text-amber-400">📡</span>
          <span className="text-sm text-amber-400">
            Sin conexion - Mostrando ultimos datos
          </span>
        </div>
      )}
      <div className="space-y-6">
        {/* Today's Summary - Full Width Cards */}
        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold">{t("tasks.today")}</h2>
              {/* Realtime Connection Status (Issue #81) */}
              <InlineConnectionStatus />
            </div>
            <span className="text-xs text-slate-400">
              {new Date().toLocaleDateString(
                lang === "es" ? "es-CO" : "en-US",
                {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                },
              )}
            </span>
          </div>

          {/* Stats Grid - Large Touch Targets */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-700/50 rounded-xl p-4 text-center min-h-[80px] flex flex-col justify-center">
              <div className="text-3xl font-bold text-cyan-400">
                {occupancy?.guests_count || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {t("tasks.guests")}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center min-h-[80px] flex flex-col justify-center">
              <div className="text-3xl font-bold text-emerald-400">
                {occupancy?.check_ins || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {t("tasks.check_ins")}
              </div>
            </div>
            <div className="bg-slate-700/50 rounded-xl p-4 text-center min-h-[80px] flex flex-col justify-center">
              <div className="text-3xl font-bold text-amber-400">
                {occupancy?.check_outs || 0}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {t("tasks.check_outs")}
              </div>
            </div>
          </div>
        </div>

        {/* Checklists - Swipeable Cards */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide px-1">
            Checklists de Hoy
          </h3>

          {checklists.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <div className="text-5xl mb-3">✨</div>
              <p className="text-slate-400">No hay checklists asignados hoy</p>
            </div>
          ) : (
            <div className="space-y-3">
              {checklists.map((checklist) => (
                <SwipeableCard
                  key={checklist.id}
                  onSwipeRight={() => handleCompleteChecklist(checklist.id)}
                  rightAction={{
                    label: "Completar",
                    color: "bg-emerald-500",
                    icon: (
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ),
                  }}
                  disabled={checklist.status === "complete"}
                >
                  <Link
                    href={`/staff/checklist/${checklist.type}?id=${checklist.id}`}
                    className="block p-4"
                  >
                    <div className="flex items-center gap-4">
                      {/* Large Checkbox */}
                      <div
                        className={`w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                          checklist.status === "complete"
                            ? "bg-emerald-500 border-emerald-500"
                            : "border-slate-600"
                        }`}
                      >
                        {checklist.status === "complete" && (
                          <svg
                            className="w-6 h-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-base">
                          {checklist.type
                            .replace(/_/g, " ")
                            .replace(/\b\w/g, (c) => c.toUpperCase())}
                        </div>
                        {checklist.villa_id && (
                          <div className="text-sm text-cyan-400 mt-0.5">
                            {checklist.villa_id.replace("_", " ")}
                          </div>
                        )}
                      </div>

                      {/* Status Badge */}
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-bold border ${getStatusColor(
                          checklist.status || "pending",
                        )}`}
                      >
                        {getStatusLabel(checklist.status || "pending")}
                      </span>
                    </div>
                  </Link>
                </SwipeableCard>
              ))}
            </div>
          )}
        </div>

        {/* Quick Actions - Large Touch Targets */}
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide px-1">
            Acciones Rapidas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Link href="/staff/bot" className="block">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-5 text-center min-h-[100px] flex flex-col items-center justify-center active:scale-95 transition-transform">
                <div className="text-3xl mb-2">🤖</div>
                <div className="text-sm font-medium">Preguntar al Bot</div>
                <div className="text-xs text-slate-400 mt-1">
                  Recetas, SOPs, etc.
                </div>
              </div>
            </Link>
            <Link href="/staff/inventory" className="block">
              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-5 text-center min-h-[100px] flex flex-col items-center justify-center active:scale-95 transition-transform">
                <div className="text-3xl mb-2">📦</div>
                <div className="text-sm font-medium">Inventario</div>
                <div className="text-xs text-slate-400 mt-1">Contar stock</div>
              </div>
            </Link>
            <Link href="/staff/pos" className="block">
              <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border border-emerald-500/30 rounded-xl p-5 text-center min-h-[100px] flex flex-col items-center justify-center active:scale-95 transition-transform">
                <div className="text-3xl mb-2">🍽️</div>
                <div className="text-sm font-medium">POS</div>
                <div className="text-xs text-slate-400 mt-1">
                  Registrar pedido
                </div>
              </div>
            </Link>
            <Link href="/staff/checklist" className="block">
              <div className="bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30 rounded-xl p-5 text-center min-h-[100px] flex flex-col items-center justify-center active:scale-95 transition-transform">
                <div className="text-3xl mb-2">✅</div>
                <div className="text-sm font-medium">Nuevo Checklist</div>
                <div className="text-xs text-slate-400 mt-1">
                  Iniciar revision
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Swipe hint */}
        <div className="text-center py-4">
          <p className="text-xs text-slate-500">
            Desliza hacia la derecha para completar tareas
          </p>
        </div>
      </div>
    </PullToRefresh>
  );
}
