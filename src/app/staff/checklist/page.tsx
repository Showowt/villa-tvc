"use client";

// ═══════════════════════════════════════════════════════════════
// TVC STAFF CHECKLIST PAGE — WITH LOADING & ERROR STATES
// Issues #2 & #3 — P0 Day 1 Fixes
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import Link from "next/link";
import MobileHeader from "@/components/staff/MobileHeader";
import PullToRefresh from "@/components/staff/PullToRefresh";
import { SkeletonChecklistItem } from "@/components/ui/LoadingSkeleton";
import {
  ApiError,
  normalizeApiError,
  type ApiErrorType,
} from "@/components/ui/ApiError";
import { useOnlineStatus } from "@/lib/api";

type ChecklistTemplate = Tables<"checklist_templates">;

export default function StaffChecklistPage() {
  const [templates, setTemplates] = useState<ChecklistTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ApiErrorType | null>(null);
  const isOnline = useOnlineStatus();

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();

      const { data, error: fetchError } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("is_active", true)
        .order("department")
        .order("name_es");

      if (fetchError) {
        throw fetchError;
      }

      if (data) {
        setTemplates(data);
      }

      setError(null);
    } catch (err) {
      console.error("[Checklist] Error loading:", err);
      const apiError = normalizeApiError(err);
      setError(apiError);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  const handleRefresh = async () => {
    await loadTemplates();
  };

  const getCategoryIcon = (type: string) => {
    if (type.includes("villa")) return "🏠";
    if (type.includes("pool")) return "🏊";
    if (type.includes("maintenance")) return "🔧";
    if (type.includes("breakfast")) return "🍳";
    if (type.includes("common")) return "🏢";
    return "📋";
  };

  const getDepartmentLabel = (dept: string) => {
    switch (dept) {
      case "housekeeping":
        return "Limpieza";
      case "maintenance":
        return "Mantenimiento";
      case "pool":
        return "Piscina";
      case "kitchen":
        return "Cocina";
      default:
        return dept;
    }
  };

  const getDepartmentColor = (dept: string) => {
    switch (dept) {
      case "housekeeping":
        return "from-cyan-500/20 to-blue-500/20 border-cyan-500/30";
      case "maintenance":
        return "from-amber-500/20 to-orange-500/20 border-amber-500/30";
      case "pool":
        return "from-blue-500/20 to-indigo-500/20 border-blue-500/30";
      case "kitchen":
        return "from-emerald-500/20 to-teal-500/20 border-emerald-500/30";
      default:
        return "from-slate-500/20 to-slate-600/20 border-slate-500/30";
    }
  };

  const groupedTemplates = templates.reduce(
    (acc, template) => {
      const dept = template.department;
      if (!acc[dept]) {
        acc[dept] = [];
      }
      acc[dept].push(template);
      return acc;
    },
    {} as Record<string, ChecklistTemplate[]>,
  );

  // Loading state with skeletons
  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div>
          <div className="h-6 w-32 bg-slate-700/50 rounded mb-2 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          <div className="h-4 w-64 bg-slate-700/50 rounded animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
        </div>
        <div>
          <div className="h-4 w-24 bg-slate-700/50 rounded mb-3 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          <div className="space-y-3">
            <SkeletonChecklistItem />
            <SkeletonChecklistItem />
            <SkeletonChecklistItem />
          </div>
        </div>
        <div>
          <div className="h-4 w-28 bg-slate-700/50 rounded mb-3 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          <div className="space-y-3">
            <SkeletonChecklistItem />
            <SkeletonChecklistItem />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return <ApiError error={error} onRetry={loadTemplates} className="mt-8" />;
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-6 animate-fade-in">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-amber-400">📡</span>
            <span className="text-sm text-amber-400">
              Sin conexion - Mostrando datos guardados
            </span>
          </div>
        )}

        <MobileHeader
          title="Checklists"
          subtitle="Selecciona el tipo de checklist para comenzar"
        />

        {Object.entries(groupedTemplates).map(([department, templates]) => (
          <div key={department}>
            <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide px-1">
              {getDepartmentLabel(department)}
            </h2>
            <div className="space-y-3">
              {templates.map((template) => (
                <Link
                  key={template.id}
                  href={`/staff/checklist/${template.type}`}
                  className="block"
                >
                  <div
                    className={`bg-gradient-to-br ${getDepartmentColor(department)} border rounded-xl p-4 min-h-[72px] flex items-center active:scale-[0.98] transition-transform`}
                  >
                    <div className="flex items-center gap-4 w-full">
                      {/* Large Icon */}
                      <div className="text-4xl w-14 h-14 flex items-center justify-center bg-slate-800/50 rounded-xl">
                        {getCategoryIcon(template.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="font-bold text-base">
                          {template.name_es}
                        </div>
                        {template.description && (
                          <div className="text-sm text-slate-400 mt-0.5 line-clamp-1">
                            {template.description}
                          </div>
                        )}
                      </div>

                      {/* Time estimate */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-bold text-cyan-400">
                          ~{template.estimated_minutes}
                        </div>
                        <div className="text-xs text-slate-400">min</div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        ))}

        {/* Empty State */}
        {Object.keys(groupedTemplates).length === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-slate-400">No hay checklists disponibles</p>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
