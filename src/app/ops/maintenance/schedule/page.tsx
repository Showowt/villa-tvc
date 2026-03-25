"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

interface RecurringMaintenance {
  id: string;
  title: string;
  title_es: string | null;
  description: string | null;
  description_es: string | null;
  location: string;
  villa_id: string | null;
  frequency: string;
  day_of_week: number | null;
  day_of_month: number | null;
  time_of_day: string | null;
  estimated_duration_minutes: number | null;
  assigned_to: string | null;
  priority: string;
  category: string | null;
  is_active: boolean;
  last_completed_at: string | null;
  next_due_at: string | null;
  // Campos calculados
  is_overdue?: boolean;
  days_overdue?: number;
  days_until_due?: number;
  assigned_user?: { name: string } | null;
  villa?: { name: string } | null;
}

interface CalendarDay {
  date: Date;
  dateStr: string;
  isCurrentMonth: boolean;
  isToday: boolean;
  tasks: RecurringMaintenance[];
}

interface Summary {
  total: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  dueThisMonth: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTES
// ═══════════════════════════════════════════════════════════════

const PRIORITY_COLORS: Record<string, string> = {
  low: "#6B7280",
  medium: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const CATEGORY_LABELS: Record<string, string> = {
  hvac: "HVAC",
  electrical: "Electrico",
  plumbing: "Plomeria",
  pool: "Piscina",
  safety: "Seguridad",
  structural: "Estructural",
  general: "General",
};

const CATEGORY_ICONS: Record<string, string> = {
  hvac: "❄️",
  electrical: "⚡",
  plumbing: "🚿",
  pool: "🏊",
  safety: "🔥",
  structural: "🏠",
  general: "🔧",
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miercoles",
  "Jueves",
  "Viernes",
  "Sabado",
];

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function MaintenanceSchedulePage() {
  // Estado
  const [tasks, setTasks] = useState<RecurringMaintenance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<RecurringMaintenance | null>(
    null,
  );
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [filterCategory, setFilterCategory] = useState<string | null>(null);
  const [filterPriority, setFilterPriority] = useState<string | null>(null);

  // Formulario de completado
  const [completionForm, setCompletionForm] = useState({
    duration_minutes: 30,
    notes: "",
    issues_found: false,
    issue_description: "",
  });

  // ─────────────────────────────────────────────────────────────
  // CARGAR DATOS
  // ─────────────────────────────────────────────────────────────

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const supabase = createBrowserClient();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString();

      // Cargar tareas con joins
      const { data, error: fetchError } = await supabase
        .from("recurring_maintenance")
        .select(
          `
          *,
          villa:villas(name),
          assigned_user:users(name)
        `,
        )
        .eq("is_active", true)
        .order("next_due_at", { ascending: true });

      if (fetchError) {
        throw fetchError;
      }

      // Calcular estados
      const tasksWithStatus = (data || []).map((task) => {
        const nextDue = task.next_due_at ? new Date(task.next_due_at) : null;
        const isOverdue = nextDue ? nextDue < today : false;
        const daysOverdue =
          nextDue && isOverdue
            ? Math.floor(
                (today.getTime() - nextDue.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;
        const daysUntilDue =
          nextDue && !isOverdue
            ? Math.floor(
                (nextDue.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
              )
            : 0;

        return {
          ...task,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          days_until_due: daysUntilDue,
        } as RecurringMaintenance;
      });

      setTasks(tasksWithStatus);
    } catch (err) {
      console.error("[loadTasks]", err);
      setError("Error al cargar tareas de mantenimiento");
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  // ─────────────────────────────────────────────────────────────
  // CALCULAR RESUMEN
  // ─────────────────────────────────────────────────────────────

  const summary = useMemo<Summary>(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(today);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    const filteredTasks = tasks.filter((t) => {
      if (filterCategory && t.category !== filterCategory) return false;
      if (filterPriority && t.priority !== filterPriority) return false;
      return true;
    });

    const byCategory: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    filteredTasks.forEach((task) => {
      const cat = task.category || "general";
      byCategory[cat] = (byCategory[cat] || 0) + 1;

      const pri = task.priority || "medium";
      byPriority[pri] = (byPriority[pri] || 0) + 1;
    });

    return {
      total: filteredTasks.length,
      overdue: filteredTasks.filter((t) => t.is_overdue).length,
      dueToday: filteredTasks.filter((t) => {
        if (!t.next_due_at) return false;
        const due = new Date(t.next_due_at);
        due.setHours(0, 0, 0, 0);
        return due.getTime() === today.getTime();
      }).length,
      dueThisWeek: filteredTasks.filter((t) => {
        if (!t.next_due_at || t.is_overdue) return false;
        const due = new Date(t.next_due_at);
        return due >= today && due <= endOfWeek;
      }).length,
      dueThisMonth: filteredTasks.filter((t) => {
        if (!t.next_due_at || t.is_overdue) return false;
        const due = new Date(t.next_due_at);
        return due >= today && due <= endOfMonth;
      }).length,
      byCategory,
      byPriority,
    };
  }, [tasks, filterCategory, filterPriority]);

  // ─────────────────────────────────────────────────────────────
  // GENERAR CALENDARIO
  // ─────────────────────────────────────────────────────────────

  const calendarDays = useMemo<CalendarDay[]>(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const days: CalendarDay[] = [];

    // Dias del mes anterior para completar la primera semana
    const startDayOfWeek = firstDay.getDay();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i);
      const dateStr = date.toISOString().split("T")[0];
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: [],
      });
    }

    // Dias del mes actual
    for (let day = 1; day <= lastDay.getDate(); day++) {
      const date = new Date(year, month, day);
      const dateStr = date.toISOString().split("T")[0];
      const dayTasks = tasks.filter((task) => {
        if (!task.next_due_at) return false;
        if (filterCategory && task.category !== filterCategory) return false;
        if (filterPriority && task.priority !== filterPriority) return false;
        const dueDate = new Date(task.next_due_at);
        return (
          dueDate.getFullYear() === date.getFullYear() &&
          dueDate.getMonth() === date.getMonth() &&
          dueDate.getDate() === date.getDate()
        );
      });

      days.push({
        date,
        dateStr,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        tasks: dayTasks,
      });
    }

    // Dias del mes siguiente para completar la ultima semana
    const remainingDays = 42 - days.length; // 6 semanas x 7 dias
    for (let i = 1; i <= remainingDays; i++) {
      const date = new Date(year, month + 1, i);
      const dateStr = date.toISOString().split("T")[0];
      days.push({
        date,
        dateStr,
        isCurrentMonth: false,
        isToday: date.getTime() === today.getTime(),
        tasks: [],
      });
    }

    return days;
  }, [currentMonth, tasks, filterCategory, filterPriority]);

  // ─────────────────────────────────────────────────────────────
  // COMPLETAR TAREA
  // ─────────────────────────────────────────────────────────────

  const handleComplete = async () => {
    if (!selectedTask) return;
    setCompleting(true);

    try {
      const supabase = createBrowserClient();

      // Insertar registro de completado
      const { error: insertError } = await supabase
        .from("maintenance_completions")
        .insert({
          recurring_id: selectedTask.id,
          completed_at: new Date().toISOString(),
          duration_minutes: completionForm.duration_minutes,
          notes: completionForm.notes || null,
          issues_found: completionForm.issues_found,
          issue_description: completionForm.issues_found
            ? completionForm.issue_description
            : null,
        });

      if (insertError) {
        throw insertError;
      }

      // Recargar tareas
      await loadTasks();

      // Cerrar modal y resetear formulario
      setShowCompleteModal(false);
      setSelectedTask(null);
      setCompletionForm({
        duration_minutes: 30,
        notes: "",
        issues_found: false,
        issue_description: "",
      });
    } catch (err) {
      console.error("[handleComplete]", err);
      alert("Error al completar tarea");
    }

    setCompleting(false);
  };

  // ─────────────────────────────────────────────────────────────
  // NAVEGACION DE MES
  // ─────────────────────────────────────────────────────────────

  const goToPreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1),
    );
  };

  const goToNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1),
    );
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER: LOADING
  // ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: ERROR
  // ─────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
        <div className="text-rose-600 text-lg font-bold mb-2">Error</div>
        <p className="text-rose-500">{error}</p>
        <button
          onClick={loadTasks}
          className="mt-4 px-4 py-2 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600"
        >
          Reintentar
        </button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER: PRINCIPAL
  // ─────────────────────────────────────────────────────────────

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          📅 Calendario de Mantenimiento
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Vista de calendario con todas las tareas programadas de mantenimiento
          preventivo
        </p>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div
          className={`rounded-xl border p-4 cursor-pointer transition-all ${
            !filterCategory && !filterPriority
              ? "bg-blue-50 border-blue-300"
              : "bg-white border-slate-200 hover:bg-slate-50"
          }`}
          onClick={() => {
            setFilterCategory(null);
            setFilterPriority(null);
          }}
        >
          <div className="text-2xl font-black text-blue-600">
            {summary.total}
          </div>
          <div className="text-xs text-blue-600 font-medium">Total</div>
        </div>
        <div
          className={`rounded-xl border p-4 ${
            summary.overdue > 0
              ? "bg-rose-50 border-rose-300"
              : "bg-white border-slate-200"
          }`}
        >
          <div
            className={`text-2xl font-black ${
              summary.overdue > 0 ? "text-rose-600" : "text-slate-400"
            }`}
          >
            {summary.overdue}
          </div>
          <div
            className={`text-xs font-medium ${
              summary.overdue > 0 ? "text-rose-600" : "text-slate-400"
            }`}
          >
            Vencidas
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="text-2xl font-black text-amber-600">
            {summary.dueToday}
          </div>
          <div className="text-xs text-amber-600 font-medium">Hoy</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-2xl font-black text-blue-600">
            {summary.dueThisWeek}
          </div>
          <div className="text-xs text-blue-600 font-medium">Esta Semana</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="text-2xl font-black text-emerald-600">
            {summary.dueThisMonth}
          </div>
          <div className="text-xs text-emerald-600 font-medium">Este Mes</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2 mb-6">
        <select
          value={filterCategory || ""}
          onChange={(e) => setFilterCategory(e.target.value || null)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Todas las Categorias</option>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {CATEGORY_ICONS[key]} {label}
            </option>
          ))}
        </select>
        <select
          value={filterPriority || ""}
          onChange={(e) => setFilterPriority(e.target.value || null)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
        >
          <option value="">Todas las Prioridades</option>
          {Object.entries(PRIORITY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <div className="flex-1" />
        <div className="flex bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setViewMode("calendar")}
            className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${
              viewMode === "calendar"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            }`}
          >
            Calendario
          </button>
          <button
            onClick={() => setViewMode("list")}
            className={`px-3 py-1.5 rounded text-sm font-bold transition-all ${
              viewMode === "list"
                ? "bg-white text-slate-900 shadow"
                : "text-slate-500"
            }`}
          >
            Lista
          </button>
        </div>
      </div>

      {viewMode === "calendar" ? (
        <>
          {/* Navegacion del Calendario */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={goToPreviousMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              ←
            </button>
            <div className="flex items-center gap-3">
              <span className="text-lg font-bold text-slate-900">
                {MONTHS_ES[currentMonth.getMonth()]}{" "}
                {currentMonth.getFullYear()}
              </span>
              <button
                onClick={goToToday}
                className="px-3 py-1 text-xs bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200"
              >
                Hoy
              </button>
            </div>
            <button
              onClick={goToNextMonth}
              className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            >
              →
            </button>
          </div>

          {/* Calendario */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {/* Dias de la semana */}
            <div className="grid grid-cols-7 border-b border-slate-200">
              {DAYS_ES.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-bold text-slate-500 bg-slate-50"
                >
                  {day.substring(0, 3)}
                </div>
              ))}
            </div>

            {/* Dias */}
            <div className="grid grid-cols-7">
              {calendarDays.map((day, idx) => (
                <div
                  key={idx}
                  className={`min-h-[100px] border-b border-r border-slate-100 p-2 ${
                    !day.isCurrentMonth ? "bg-slate-50" : ""
                  } ${day.isToday ? "bg-blue-50" : ""}`}
                >
                  <div
                    className={`text-sm font-bold mb-1 ${
                      day.isToday
                        ? "text-blue-600"
                        : day.isCurrentMonth
                          ? "text-slate-900"
                          : "text-slate-400"
                    }`}
                  >
                    {day.date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {day.tasks.slice(0, 3).map((task) => (
                      <button
                        key={task.id}
                        onClick={() => {
                          setSelectedTask(task);
                          setCompletionForm({
                            duration_minutes:
                              task.estimated_duration_minutes || 30,
                            notes: "",
                            issues_found: false,
                            issue_description: "",
                          });
                          setShowCompleteModal(true);
                        }}
                        className={`w-full text-left px-2 py-1 rounded text-xs font-medium truncate transition-all hover:opacity-80 ${
                          task.is_overdue
                            ? "bg-rose-100 text-rose-700"
                            : task.priority === "urgent"
                              ? "bg-rose-50 text-rose-600"
                              : task.priority === "high"
                                ? "bg-amber-50 text-amber-600"
                                : "bg-blue-50 text-blue-600"
                        }`}
                      >
                        {CATEGORY_ICONS[task.category || "general"]}{" "}
                        {task.title_es || task.title}
                      </button>
                    ))}
                    {day.tasks.length > 3 && (
                      <div className="text-xs text-slate-400 px-2">
                        +{day.tasks.length - 3} mas
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        /* Vista de Lista */
        <div className="bg-white rounded-xl border border-slate-200">
          <div className="p-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">
              Todas las Tareas de Mantenimiento
            </h2>
          </div>

          {tasks.length === 0 ? (
            <div className="p-8 text-center text-slate-400">
              No hay tareas de mantenimiento programadas
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {tasks
                .filter((t) => {
                  if (filterCategory && t.category !== filterCategory)
                    return false;
                  if (filterPriority && t.priority !== filterPriority)
                    return false;
                  return true;
                })
                .map((task) => (
                  <div
                    key={task.id}
                    className={`p-4 hover:bg-slate-50 transition-colors ${
                      task.is_overdue ? "bg-rose-50/50" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">
                            {CATEGORY_ICONS[task.category || "general"]}
                          </span>
                          <span className="font-bold text-slate-900">
                            {task.title_es || task.title}
                          </span>
                          <Badge color={PRIORITY_COLORS[task.priority]}>
                            {PRIORITY_LABELS[task.priority]}
                          </Badge>
                          {task.is_overdue && (
                            <Badge color="#EF4444">
                              {task.days_overdue} dias vencido
                            </Badge>
                          )}
                          {!task.is_overdue && task.days_until_due === 0 && (
                            <Badge color="#F59E0B">Hoy</Badge>
                          )}
                          {!task.is_overdue &&
                            task.days_until_due !== undefined &&
                            task.days_until_due > 0 &&
                            task.days_until_due <= 7 && (
                              <Badge color="#3B82F6">
                                {task.days_until_due} dias
                              </Badge>
                            )}
                        </div>
                        <p className="text-sm text-slate-500 mb-2">
                          {task.description_es || task.description}
                        </p>
                        <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                          <span>📍 {task.location}</span>
                          <span>
                            🔄{" "}
                            {FREQUENCY_LABELS[task.frequency] || task.frequency}
                          </span>
                          {task.estimated_duration_minutes && (
                            <span>
                              ⏱️ ~{task.estimated_duration_minutes} min
                            </span>
                          )}
                          {task.next_due_at && (
                            <span>
                              📅 Proxima:{" "}
                              {new Date(task.next_due_at).toLocaleDateString(
                                "es-CO",
                              )}
                            </span>
                          )}
                          {task.last_completed_at && (
                            <span>
                              ✅ Ultima:{" "}
                              {new Date(
                                task.last_completed_at,
                              ).toLocaleDateString("es-CO")}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setSelectedTask(task);
                          setCompletionForm({
                            duration_minutes:
                              task.estimated_duration_minutes || 30,
                            notes: "",
                            issues_found: false,
                            issue_description: "",
                          });
                          setShowCompleteModal(true);
                        }}
                        className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 whitespace-nowrap"
                      >
                        ✅ Completar
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* Leyenda */}
      <div className="mt-6 bg-slate-50 rounded-xl p-4">
        <h3 className="font-bold text-sm text-slate-700 mb-3">
          Leyenda de Colores
        </h3>
        <div className="flex flex-wrap gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-100 rounded" />
            <span className="text-slate-600">Vencida</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-rose-50 rounded" />
            <span className="text-slate-600">Urgente</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-amber-50 rounded" />
            <span className="text-slate-600">Alta Prioridad</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-blue-50 rounded" />
            <span className="text-slate-600">Normal</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-3 text-xs">
          {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
            <div key={key} className="flex items-center gap-1">
              <span>{icon}</span>
              <span className="text-slate-600">
                {CATEGORY_LABELS[key] || key}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Completar Tarea */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-bold mb-2">✅ Completar Tarea</h3>
              <p className="text-sm text-slate-600 mb-4">
                {CATEGORY_ICONS[selectedTask.category || "general"]}{" "}
                {selectedTask.title_es || selectedTask.title}
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Duracion (minutos)
                  </label>
                  <input
                    type="number"
                    value={completionForm.duration_minutes}
                    onChange={(e) =>
                      setCompletionForm({
                        ...completionForm,
                        duration_minutes: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Notas (opcional)
                  </label>
                  <textarea
                    value={completionForm.notes}
                    onChange={(e) =>
                      setCompletionForm({
                        ...completionForm,
                        notes: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    rows={2}
                    placeholder="Observaciones generales..."
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={completionForm.issues_found}
                      onChange={(e) =>
                        setCompletionForm({
                          ...completionForm,
                          issues_found: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm font-medium text-slate-700">
                      Se encontraron problemas
                    </span>
                  </label>
                </div>

                {completionForm.issues_found && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Descripcion del problema
                    </label>
                    <textarea
                      value={completionForm.issue_description}
                      onChange={(e) =>
                        setCompletionForm({
                          ...completionForm,
                          issue_description: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 border border-rose-200 rounded-lg bg-rose-50"
                      rows={3}
                      placeholder="Describir el problema encontrado..."
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowCompleteModal(false);
                    setSelectedTask(null);
                  }}
                  className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleComplete}
                  disabled={completing}
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50"
                >
                  {completing ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
