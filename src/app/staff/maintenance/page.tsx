"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// TVC MAINTENANCE DASHBOARD - Issue #10
// Pagina principal para personal de mantenimiento
// Acceso rapido a: Tareas pendientes, Mantenimiento preventivo
// ═══════════════════════════════════════════════════════════════

interface MaintenanceTask {
  id: string;
  title: string;
  title_es: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "complete";
  due_date: string | null;
  villa_id: string | null;
  category: string;
  description: string | null;
}

interface PreventiveItem {
  id: string;
  name: string;
  name_es: string;
  next_due: string;
  frequency: string;
  last_completed: string | null;
  area: string;
}

interface QuickStat {
  label: string;
  value: string | number;
  icon: string;
  color: string;
  href?: string;
}

const VILLA_NAMES: Record<string, string> = {
  villa_1: "Teresa",
  villa_2: "Aduana",
  villa_3: "Trinidad",
  villa_4: "Paz",
  villa_5: "San Pedro",
  villa_6: "San Diego",
  villa_7: "Coche",
  villa_8: "Pozo",
  villa_9: "Santo Domingo",
  villa_10: "Merced",
  common: "Areas Comunes",
  pool: "Piscina",
};

const PRIORITY_CONFIG = {
  critical: {
    label: "Critico",
    color: "bg-red-500",
    textColor: "text-red-400",
    borderColor: "border-red-500/30",
  },
  high: {
    label: "Alto",
    color: "bg-orange-500",
    textColor: "text-orange-400",
    borderColor: "border-orange-500/30",
  },
  medium: {
    label: "Medio",
    color: "bg-amber-500",
    textColor: "text-amber-400",
    borderColor: "border-amber-500/30",
  },
  low: {
    label: "Bajo",
    color: "bg-slate-500",
    textColor: "text-slate-400",
    borderColor: "border-slate-500/30",
  },
};

export default function StaffMaintenancePage() {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<QuickStat[]>([]);
  const [urgentTasks, setUrgentTasks] = useState<MaintenanceTask[]>([]);
  const [todaysTasks, setTodaysTasks] = useState<MaintenanceTask[]>([]);
  const [preventiveItems, setPreventiveItems] = useState<PreventiveItem[]>([]);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    try {
      // Obtener tareas de mantenimiento
      const { data: tasks } = await supabase
        .from("daily_tasks")
        .select("*")
        .eq("department", "maintenance")
        .gte("date", today)
        .order("date")
        .limit(20);

      // Parsear tareas individuales
      const allTasks: MaintenanceTask[] = [];
      tasks?.forEach((day) => {
        const dayTasks = day.tasks as unknown as MaintenanceTask[];
        if (Array.isArray(dayTasks)) {
          dayTasks.forEach((task) => {
            allTasks.push({
              ...task,
              due_date: day.date,
            });
          });
        }
      });

      // Separar urgentes y de hoy
      const urgent = allTasks.filter(
        (t) =>
          (t.priority === "critical" || t.priority === "high") &&
          t.status !== "complete",
      );
      const todaysFiltered = allTasks.filter(
        (t) => t.due_date === today && t.status !== "complete",
      );

      setUrgentTasks(urgent.slice(0, 5));
      setTodaysTasks(todaysFiltered.slice(0, 10));

      // Obtener mantenimiento preventivo proximo
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);

      const { data: preventive } = await supabase
        .from("recurring_maintenance")
        .select("*")
        .lte("next_due_date", nextWeek.toISOString().split("T")[0])
        .eq("is_active", true)
        .order("next_due_date")
        .limit(5);

      setPreventiveItems(
        preventive?.map((p) => ({
          id: p.id,
          name: p.name,
          name_es: p.name_es || p.name,
          next_due: p.next_due_date,
          frequency: p.frequency,
          last_completed: p.last_completed_date,
          area: p.area || "general",
        })) || [],
      );

      // Contar tareas pendientes
      const pendingCount = allTasks.filter(
        (t) => t.status === "pending",
      ).length;
      const inProgressCount = allTasks.filter(
        (t) => t.status === "in_progress",
      ).length;
      const criticalCount = urgent.length;

      // Estadisticas
      setStats([
        {
          label: "Pendientes",
          value: pendingCount,
          icon: "📋",
          color: "cyan",
          href: "/staff/tasks?department=maintenance",
        },
        {
          label: "En Progreso",
          value: inProgressCount,
          icon: "🔧",
          color: "amber",
          href: "/staff/tasks?department=maintenance&status=in_progress",
        },
        {
          label: "Urgentes",
          value: criticalCount,
          icon: "🚨",
          color: criticalCount > 0 ? "red" : "slate",
          href: "/staff/tasks?department=maintenance&priority=critical",
        },
        {
          label: "Preventivo",
          value: preventiveItems?.length || 0,
          icon: "🔄",
          color: "purple",
          href: "/ops/preventive-maintenance",
        },
      ]);
    } catch (error) {
      console.error("[MaintenancePage] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStartTask = async (taskId: string) => {
    // Marcar tarea como en progreso
    // Esta es una simplificacion - en produccion necesitarias actualizar el JSON
    console.log("Starting task:", taskId);
    loadData();
  };

  const handleCompleteTask = async (taskId: string) => {
    // Marcar tarea como completada
    console.log("Completing task:", taskId);
    loadData();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🔧</span> Mantenimiento
          </h1>
          <p className="text-xs text-slate-400">
            Bienvenido - Tu centro de control
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">
            {new Date().toLocaleDateString("es-CO", {
              weekday: "long",
              day: "numeric",
              month: "short",
            })}
          </div>
          <div className="text-lg font-bold text-amber-400">
            {new Date().toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href || "#"}
            className={`bg-slate-800 rounded-xl p-4 border border-slate-700 hover:border-amber-500/50 transition-colors active:scale-95`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xl">{stat.icon}</span>
              <span className="text-xs text-slate-400">{stat.label}</span>
            </div>
            <div
              className={`text-2xl font-bold ${
                stat.color === "cyan"
                  ? "text-cyan-400"
                  : stat.color === "amber"
                    ? "text-amber-400"
                    : stat.color === "red"
                      ? "text-red-400"
                      : stat.color === "purple"
                        ? "text-purple-400"
                        : "text-slate-400"
              }`}
            >
              {stat.value}
            </div>
          </Link>
        ))}
      </div>

      {/* Acciones Rapidas */}
      <div>
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
          Acciones Rapidas
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Link
            href="/staff/tasks?department=maintenance"
            className="bg-amber-500 rounded-xl p-4 text-center hover:bg-amber-600 transition-colors active:scale-95"
          >
            <span className="text-2xl block mb-1">📋</span>
            <span className="text-sm font-bold">Ver Tareas</span>
          </Link>
          <Link
            href="/staff/checklist?type=maintenance"
            className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors active:scale-95 border border-slate-700"
          >
            <span className="text-2xl block mb-1">✅</span>
            <span className="text-sm font-medium">Checklists</span>
          </Link>
          <Link
            href="/ops/preventive-maintenance"
            className="bg-slate-800 rounded-xl p-4 text-center hover:bg-slate-700 transition-colors active:scale-95 border border-slate-700"
          >
            <span className="text-2xl block mb-1">🔄</span>
            <span className="text-sm font-medium">Preventivo</span>
          </Link>
        </div>
      </div>

      {/* Tareas Urgentes */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xl">🚨</span>
            <span className="font-bold text-red-400">Tareas Urgentes</span>
          </div>
          <div className="space-y-2">
            {urgentTasks.map((task) => (
              <div
                key={task.id}
                className={`bg-slate-800/50 rounded-lg p-3 border ${PRIORITY_CONFIG[task.priority].borderColor}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-sm">
                      {task.title_es || task.title}
                    </div>
                    {task.villa_id && (
                      <div className="text-xs text-slate-400">
                        📍 {VILLA_NAMES[task.villa_id] || task.villa_id}
                      </div>
                    )}
                  </div>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full ${PRIORITY_CONFIG[task.priority].color} text-white`}
                  >
                    {PRIORITY_CONFIG[task.priority].label}
                  </span>
                </div>
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => handleStartTask(task.id)}
                    className="flex-1 py-1.5 bg-amber-500 rounded-lg text-xs font-medium text-white hover:bg-amber-600"
                  >
                    Iniciar
                  </button>
                  <button
                    onClick={() => handleCompleteTask(task.id)}
                    className="flex-1 py-1.5 bg-emerald-500 rounded-lg text-xs font-medium text-white hover:bg-emerald-600"
                  >
                    Completar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tareas de Hoy */}
      {todaysTasks.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
            Tareas de Hoy
          </div>
          <div className="space-y-2">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className="bg-slate-800 rounded-lg p-3 border border-slate-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full ${PRIORITY_CONFIG[task.priority].color}`}
                    />
                    <div>
                      <div className="font-medium text-sm">
                        {task.title_es || task.title}
                      </div>
                      {task.villa_id && (
                        <div className="text-xs text-slate-400">
                          {VILLA_NAMES[task.villa_id] || task.villa_id}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartTask(task.id)}
                      className="p-2 bg-slate-700 rounded-lg hover:bg-amber-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleCompleteTask(task.id)}
                      className="p-2 bg-slate-700 rounded-lg hover:bg-emerald-500 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
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
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mantenimiento Preventivo Proximo */}
      {preventiveItems.length > 0 && (
        <div>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">
            Mantenimiento Preventivo (Proximos 7 dias)
          </div>
          <div className="space-y-2">
            {preventiveItems.map((item) => {
              const dueDate = new Date(item.next_due);
              const isOverdue = dueDate < new Date();
              const isToday =
                dueDate.toISOString().split("T")[0] ===
                new Date().toISOString().split("T")[0];

              return (
                <div
                  key={item.id}
                  className={`bg-slate-800 rounded-lg p-3 border ${
                    isOverdue
                      ? "border-red-500/30"
                      : isToday
                        ? "border-amber-500/30"
                        : "border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-sm">{item.name_es}</div>
                      <div className="text-xs text-slate-400 flex items-center gap-2">
                        <span>🔄 {item.frequency}</span>
                        <span>•</span>
                        <span>📍 {item.area}</span>
                      </div>
                    </div>
                    <div
                      className={`text-xs font-medium ${
                        isOverdue
                          ? "text-red-400"
                          : isToday
                            ? "text-amber-400"
                            : "text-slate-400"
                      }`}
                    >
                      {isOverdue
                        ? "Vencido"
                        : isToday
                          ? "Hoy"
                          : dueDate.toLocaleDateString("es-CO", {
                              weekday: "short",
                              day: "numeric",
                            })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vacio */}
      {urgentTasks.length === 0 && todaysTasks.length === 0 && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-6 text-center">
          <span className="text-4xl block mb-2">✅</span>
          <div className="text-emerald-400 font-bold">Todo al dia!</div>
          <div className="text-xs text-slate-400 mt-1">
            No tienes tareas pendientes por ahora
          </div>
        </div>
      )}
    </div>
  );
}
