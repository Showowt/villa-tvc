"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";

interface MaintenanceTask {
  id: string;
  task_name: string;
  task_name_es: string;
  description: string;
  description_es: string;
  location: string;
  frequency: string;
  frequency_days: number;
  last_completed_at: string | null;
  next_due_date: string;
  priority: "low" | "medium" | "high" | "urgent";
  estimated_minutes: number;
  is_overdue: boolean;
  days_overdue: number;
  days_until_due: number;
  assigned_user?: { name: string; department: string };
  last_completed_user?: { name: string };
}

interface Summary {
  total: number;
  overdue: number;
  due_today: number;
  upcoming_7_days: number;
}

const PRIORITY_COLORS = {
  low: "#6B7280",
  medium: "#3B82F6",
  high: "#F59E0B",
  urgent: "#EF4444",
};

const FREQUENCY_LABELS: Record<string, string> = {
  daily: "Diario",
  weekly: "Semanal",
  biweekly: "Quincenal",
  monthly: "Mensual",
  quarterly: "Trimestral",
  yearly: "Anual",
};

export default function PreventiveMaintenancePage() {
  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "overdue" | "upcoming">("all");
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<MaintenanceTask | null>(
    null,
  );
  const [completing, setCompleting] = useState(false);

  // Completion form
  const [completionForm, setCompletionForm] = useState({
    duration_minutes: 30,
    notes: "",
    issues_found: "",
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("filter", filter);

      const response = await fetch(`/api/maintenance/recurring?${params}`);
      if (response.ok) {
        const data = await response.json();
        setTasks(data.tasks);
        setSummary(data.summary);
      }
    } catch (error) {
      console.error("[loadTasks]", error);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleComplete = async () => {
    if (!selectedTask) return;
    setCompleting(true);

    try {
      const response = await fetch("/api/maintenance/recurring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_id: selectedTask.id,
          completed_by: "00000000-0000-0000-0000-000000000000", // TODO: Get from auth
          ...completionForm,
        }),
      });

      if (response.ok) {
        setShowCompleteModal(false);
        setSelectedTask(null);
        setCompletionForm({
          duration_minutes: 30,
          notes: "",
          issues_found: "",
        });
        loadTasks();
      } else {
        const data = await response.json();
        alert(data.error || "Error completing task");
      }
    } catch (error) {
      console.error("[completeTask]", error);
      alert("Error completing task");
    }
    setCompleting(false);
  };

  const getDueBadge = (task: MaintenanceTask) => {
    if (task.is_overdue) {
      return <Badge color="#EF4444">{task.days_overdue} dias vencido</Badge>;
    }
    if (task.days_until_due === 0) {
      return <Badge color="#F59E0B">Hoy</Badge>;
    }
    if (task.days_until_due <= 3) {
      return <Badge color="#3B82F6">{task.days_until_due} dias</Badge>;
    }
    return (
      <span className="text-slate-400 text-xs">{task.days_until_due} dias</span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          🔧 Mantenimiento Preventivo
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Tareas recurrentes programadas para mantener la propiedad en optimas
          condiciones
        </p>
      </div>

      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              filter === "all"
                ? "bg-blue-50 border-blue-300"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setFilter("all")}
          >
            <div className="text-2xl font-black text-blue-600">
              {summary.total}
            </div>
            <div className="text-xs text-blue-600 font-medium">
              Total Tareas
            </div>
          </div>
          <div
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              filter === "overdue"
                ? "bg-rose-50 border-rose-300"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setFilter("overdue")}
          >
            <div className="text-2xl font-black text-rose-600">
              {summary.overdue}
            </div>
            <div className="text-xs text-rose-600 font-medium">Vencidas</div>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
            <div className="text-2xl font-black text-amber-600">
              {summary.due_today}
            </div>
            <div className="text-xs text-amber-600 font-medium">Hoy</div>
          </div>
          <div
            className={`rounded-xl border p-4 cursor-pointer transition-all ${
              filter === "upcoming"
                ? "bg-emerald-50 border-emerald-300"
                : "bg-white border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => setFilter("upcoming")}
          >
            <div className="text-2xl font-black text-emerald-600">
              {summary.upcoming_7_days}
            </div>
            <div className="text-xs text-emerald-600 font-medium">
              Proximos 7 dias
            </div>
          </div>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="p-4 border-b border-slate-100">
          <h2 className="font-bold text-slate-900">
            {filter === "overdue"
              ? "Tareas Vencidas"
              : filter === "upcoming"
                ? "Tareas Proximas (7 dias)"
                : "Todas las Tareas"}
          </h2>
        </div>

        {tasks.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            No hay tareas en esta categoria
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 hover:bg-slate-50 transition-colors ${
                  task.is_overdue ? "bg-rose-50/50" : ""
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-bold text-slate-900">
                        {task.task_name_es}
                      </span>
                      <Badge color={PRIORITY_COLORS[task.priority]}>
                        {task.priority}
                      </Badge>
                      {getDueBadge(task)}
                    </div>
                    <p className="text-sm text-slate-500 mb-2">
                      {task.description_es}
                    </p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                      <span>📍 {task.location}</span>
                      <span>
                        🔄 {FREQUENCY_LABELS[task.frequency] || task.frequency}
                      </span>
                      <span>⏱️ ~{task.estimated_minutes} min</span>
                      {task.last_completed_at && (
                        <span>
                          ✅ Ultimo:{" "}
                          {new Date(task.last_completed_at).toLocaleDateString(
                            "es-CO",
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTask(task);
                      setCompletionForm({
                        duration_minutes: task.estimated_minutes,
                        notes: "",
                        issues_found: "",
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

      {/* Complete Modal */}
      {showCompleteModal && selectedTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-2">✅ Completar Tarea</h3>
            <p className="text-sm text-slate-600 mb-4">
              {selectedTask.task_name_es}
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
                  Notas
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
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Problemas encontrados (opcional)
                </label>
                <textarea
                  value={completionForm.issues_found}
                  onChange={(e) =>
                    setCompletionForm({
                      ...completionForm,
                      issues_found: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="Si se encontraron problemas, se creara un ticket de mantenimiento..."
                />
              </div>
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
      )}
    </div>
  );
}
