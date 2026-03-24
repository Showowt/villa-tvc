"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

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
  const [loading, setLoading] = useState(true);
  const [occupancy, setOccupancy] = useState<Tables<"daily_occupancy"> | null>(
    null,
  );
  const [checklists, setChecklists] = useState<Tables<"checklists">[]>([]);

  useEffect(() => {
    loadTodayData();
  }, []);

  const loadTodayData = async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    // Load today's occupancy
    const { data: occData } = await supabase
      .from("daily_occupancy")
      .select("*")
      .eq("date", today)
      .single();

    if (occData) {
      setOccupancy(occData);
    }

    // Load today's checklists
    const { data: checklistData } = await supabase
      .from("checklists")
      .select("*")
      .eq("date", today)
      .order("created_at", { ascending: true });

    if (checklistData) {
      setChecklists(checklistData);
    }

    setLoading(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "complete":
      case "approved":
        return "bg-emerald-500/20 text-emerald-400";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400";
      case "rejected":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-slate-500/20 text-slate-400";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "complete":
        return "Completado";
      case "approved":
        return "Aprobado";
      case "in_progress":
        return "En progreso";
      case "rejected":
        return "Rechazado";
      default:
        return "Pendiente";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today's Summary */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold">Hoy</h2>
          <span className="text-xs text-slate-400">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-cyan-400">
              {occupancy?.guests_count || 0}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">
              Huéspedes
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-emerald-400">
              {occupancy?.check_ins || 0}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">
              Check-ins
            </div>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-3 text-center">
            <div className="text-2xl font-bold text-amber-400">
              {occupancy?.check_outs || 0}
            </div>
            <div className="text-[10px] text-slate-400 uppercase tracking-wide">
              Check-outs
            </div>
          </div>
        </div>
      </div>

      {/* Checklists */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
          Checklists de Hoy
        </h3>

        {checklists.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-2">✨</div>
            <p className="text-slate-400 text-sm">
              No hay checklists asignados hoy
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {checklists.map((checklist) => (
              <a
                key={checklist.id}
                href={`/staff/checklist/${checklist.type}?id=${checklist.id}`}
                className="block bg-slate-800 rounded-xl p-4 hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {checklist.type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                    {checklist.villa_id && (
                      <div className="text-xs text-slate-400 mt-0.5">
                        {checklist.villa_id}
                      </div>
                    )}
                  </div>
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold ${getStatusColor(
                      checklist.status || "pending",
                    )}`}
                  >
                    {getStatusLabel(checklist.status || "pending")}
                  </span>
                </div>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 gap-2">
          <a
            href="/staff/bot"
            className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl p-4 text-center hover:bg-cyan-500/30 transition-colors"
          >
            <div className="text-2xl mb-1">🤖</div>
            <div className="text-sm font-medium">Preguntar al Bot</div>
            <div className="text-[10px] text-slate-400">
              Recetas, SOPs, etc.
            </div>
          </a>
          <a
            href="/staff/inventory"
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-xl p-4 text-center hover:bg-amber-500/30 transition-colors"
          >
            <div className="text-2xl mb-1">📦</div>
            <div className="text-sm font-medium">Inventario</div>
            <div className="text-[10px] text-slate-400">Contar stock</div>
          </a>
        </div>
      </div>
    </div>
  );
}
