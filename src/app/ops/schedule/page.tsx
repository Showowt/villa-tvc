"use client";

import { useState, useEffect, useCallback } from "react";
import { useLanguage } from "@/lib/i18n/context";

// ═══════════════════════════════════════════════════════════════
// STAFF SCHEDULE PAGE - Issues #42 & #43
// Calendar view with shift management and absence handling
// ═══════════════════════════════════════════════════════════════

interface StaffMember {
  id: string;
  name: string;
  department: string | null;
  phone: string | null;
  avatar_url: string | null;
}

interface Schedule {
  id: string;
  user_id: string;
  date: string;
  shift: ShiftType;
  shift_start: string | null;
  shift_end: string | null;
  notes: string | null;
  marked_absent_at: string | null;
  absence_reason: string | null;
  tasks_redistributed: boolean;
  users: StaffMember | null;
}

type ShiftType =
  | "morning"
  | "evening"
  | "night"
  | "split"
  | "off"
  | "sick"
  | "vacation"
  | "personal";
type ViewMode = "week" | "month";

const SHIFT_CONFIG: Record<
  ShiftType,
  { label: string; labelEs: string; color: string; icon: string }
> = {
  morning: {
    label: "Morning",
    labelEs: "Manana",
    color: "bg-yellow-500",
    icon: "🌅",
  },
  evening: {
    label: "Evening",
    labelEs: "Tarde",
    color: "bg-orange-500",
    icon: "🌆",
  },
  night: {
    label: "Night",
    labelEs: "Noche",
    color: "bg-indigo-600",
    icon: "🌙",
  },
  split: {
    label: "Split",
    labelEs: "Dividido",
    color: "bg-purple-500",
    icon: "⚡",
  },
  off: {
    label: "Day Off",
    labelEs: "Libre",
    color: "bg-slate-400",
    icon: "🏠",
  },
  sick: {
    label: "Sick",
    labelEs: "Enfermo",
    color: "bg-red-500",
    icon: "🤒",
  },
  vacation: {
    label: "Vacation",
    labelEs: "Vacaciones",
    color: "bg-green-500",
    icon: "🏖️",
  },
  personal: {
    label: "Personal",
    labelEs: "Personal",
    color: "bg-gray-500",
    icon: "👤",
  },
};

const DEPARTMENTS = [
  { value: "", label: "Todos", labelEs: "Todos" },
  { value: "kitchen", label: "Kitchen", labelEs: "Cocina" },
  { value: "housekeeping", label: "Housekeeping", labelEs: "Limpieza" },
  { value: "maintenance", label: "Maintenance", labelEs: "Mantenimiento" },
  { value: "pool", label: "Pool", labelEs: "Piscina" },
  { value: "front_desk", label: "Front Desk", labelEs: "Recepcion" },
];

export default function SchedulePage() {
  const { t, lang } = useLanguage();
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [department, setDepartment] = useState("");
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCell, setSelectedCell] = useState<{
    staffId: string;
    date: string;
  } | null>(null);
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [saving, setSaving] = useState(false);

  // Calculate date range based on view mode
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (viewMode === "week") {
      const day = start.getDay();
      start.setDate(start.getDate() - day); // Sunday
      end.setDate(start.getDate() + 6); // Saturday
    } else {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      start: start.toISOString().split("T")[0],
      end: end.toISOString().split("T")[0],
    };
  }, [currentDate, viewMode]);

  // Generate days array for display
  const getDays = useCallback(() => {
    const { start, end } = getDateRange();
    const days: Date[] = [];
    const current = new Date(start);
    const endDate = new Date(end);

    while (current <= endDate) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }

    return days;
  }, [getDateRange]);

  // Fetch schedules
  const fetchSchedules = useCallback(async () => {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const params = new URLSearchParams({
        start,
        end,
        ...(department && { department }),
      });

      const res = await fetch(`/api/schedule?${params}`);
      const data = await res.json();

      if (data.success) {
        setSchedules(data.schedules || []);
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error("[schedule] Fetch error:", error);
    } finally {
      setLoading(false);
    }
  }, [getDateRange, department]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  // Navigate weeks/months
  const navigate = (direction: number) => {
    const newDate = new Date(currentDate);
    if (viewMode === "week") {
      newDate.setDate(newDate.getDate() + direction * 7);
    } else {
      newDate.setMonth(newDate.getMonth() + direction);
    }
    setCurrentDate(newDate);
  };

  // Get schedule for a specific staff member and date
  const getSchedule = (staffId: string, date: string) => {
    return schedules.find((s) => s.user_id === staffId && s.date === date);
  };

  // Handle cell click - open shift selector
  const handleCellClick = (staffId: string, date: string) => {
    setSelectedCell({ staffId, date });
  };

  // Save shift
  const saveShift = async (shift: ShiftType) => {
    if (!selectedCell) return;

    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "upsert",
          user_id: selectedCell.staffId,
          date: selectedCell.date,
          shift,
        }),
      });

      if (res.ok) {
        await fetchSchedules();
        setSelectedCell(null);
      }
    } catch (error) {
      console.error("[schedule] Save error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handle absence marking with task redistribution
  const handleMarkAbsent = async (reason: "sick" | "vacation" | "personal") => {
    if (!selectedCell) return;

    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_absent",
          user_id: selectedCell.staffId,
          date: selectedCell.date,
          reason,
          redistribute_tasks: true,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchSchedules();
        setSelectedCell(null);
        setShowAbsenceModal(false);

        // Show redistribution result
        if (data.redistribution?.tasks_moved > 0) {
          alert(
            `${data.message}\n\nTareas redistribuidas: ${data.redistribution.tasks_moved}`,
          );
        } else {
          alert(data.message);
        }
      }
    } catch (error) {
      console.error("[schedule] Mark absent error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Copy previous week
  const copyPreviousWeek = async () => {
    const { start } = getDateRange();
    const sourceStart = new Date(start);
    sourceStart.setDate(sourceStart.getDate() - 7);

    setSaving(true);
    try {
      const res = await fetch("/api/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "copy_week",
          source_week_start: sourceStart.toISOString().split("T")[0],
          target_week_start: start,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchSchedules();
        alert(data.message);
      } else {
        alert(data.error || "Error al copiar semana");
      }
    } catch (error) {
      console.error("[schedule] Copy week error:", error);
    } finally {
      setSaving(false);
    }
  };

  // Format header
  const getHeaderText = () => {
    const { start, end } = getDateRange();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (viewMode === "week") {
      const startStr = startDate.toLocaleDateString(
        lang === "es" ? "es-CO" : "en-US",
        { month: "short", day: "numeric" },
      );
      const endStr = endDate.toLocaleDateString(
        lang === "es" ? "es-CO" : "en-US",
        { month: "short", day: "numeric", year: "numeric" },
      );
      return `${startStr} - ${endStr}`;
    }

    return startDate.toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
      month: "long",
      year: "numeric",
    });
  };

  const days = getDays();
  const today = new Date().toISOString().split("T")[0];

  // Filter staff by department
  const filteredStaff = department
    ? staff.filter((s) => s.department === department)
    : staff;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {lang === "es" ? "Horarios del Personal" : "Staff Schedule"}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {lang === "es"
              ? "Gestiona turnos, ausencias y redistribucion de tareas"
              : "Manage shifts, absences and task redistribution"}
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode("week")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "week"
                ? "bg-[#0A0A0F] text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {lang === "es" ? "Semana" : "Week"}
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              viewMode === "month"
                ? "bg-[#0A0A0F] text-white"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {lang === "es" ? "Mes" : "Month"}
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          {/* Navigation */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h2 className="text-lg font-semibold text-slate-900 min-w-[200px] text-center">
              {getHeaderText()}
            </h2>
            <button
              onClick={() => navigate(1)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-sm font-medium bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
            >
              {lang === "es" ? "Hoy" : "Today"}
            </button>
          </div>

          {/* Filters and actions */}
          <div className="flex items-center gap-3">
            {/* Department filter */}
            <select
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-[#00B4FF] focus:border-transparent"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d.value} value={d.value}>
                  {lang === "es" ? d.labelEs : d.label}
                </option>
              ))}
            </select>

            {/* Copy previous week button */}
            {viewMode === "week" && (
              <button
                onClick={copyPreviousWeek}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium bg-[#00B4FF] text-white rounded-lg hover:bg-[#00A0E0] transition-colors disabled:opacity-50"
              >
                {lang === "es"
                  ? "Copiar Semana Anterior"
                  : "Copy Previous Week"}
              </button>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-slate-100">
          {Object.entries(SHIFT_CONFIG).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs">
              <span className={`w-3 h-3 rounded ${config.color}`} />
              <span className="text-slate-600">
                {config.icon} {lang === "es" ? config.labelEs : config.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            {lang === "es" ? "Cargando horarios..." : "Loading schedules..."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left p-3 text-sm font-semibold text-slate-700 sticky left-0 bg-slate-50 z-10 min-w-[150px]">
                    {lang === "es" ? "Personal" : "Staff"}
                  </th>
                  {days.map((day) => {
                    const dateStr = day.toISOString().split("T")[0];
                    const isToday = dateStr === today;
                    const dayName = day.toLocaleDateString(
                      lang === "es" ? "es-CO" : "en-US",
                      { weekday: "short" },
                    );
                    const dayNum = day.getDate();

                    return (
                      <th
                        key={dateStr}
                        className={`p-2 text-center min-w-[100px] ${
                          isToday ? "bg-[#00B4FF]/10" : ""
                        }`}
                      >
                        <div className="text-xs font-medium text-slate-500 uppercase">
                          {dayName}
                        </div>
                        <div
                          className={`text-lg font-bold ${
                            isToday ? "text-[#00B4FF]" : "text-slate-900"
                          }`}
                        >
                          {dayNum}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredStaff.length === 0 ? (
                  <tr>
                    <td
                      colSpan={days.length + 1}
                      className="p-8 text-center text-slate-500"
                    >
                      {lang === "es"
                        ? "No hay personal en este departamento"
                        : "No staff in this department"}
                    </td>
                  </tr>
                ) : (
                  filteredStaff.map((member) => (
                    <tr
                      key={member.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      {/* Staff name */}
                      <td className="p-3 sticky left-0 bg-white z-10 border-r border-slate-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00B4FF] to-[#00D4FF] flex items-center justify-center text-white text-xs font-bold">
                            {member.name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)}
                          </div>
                          <div>
                            <div className="font-medium text-slate-900 text-sm">
                              {member.name}
                            </div>
                            <div className="text-xs text-slate-500">
                              {member.department}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Day cells */}
                      {days.map((day) => {
                        const dateStr = day.toISOString().split("T")[0];
                        const schedule = getSchedule(member.id, dateStr);
                        const isToday = dateStr === today;
                        const isSelected =
                          selectedCell?.staffId === member.id &&
                          selectedCell?.date === dateStr;
                        const shiftConfig = schedule
                          ? SHIFT_CONFIG[schedule.shift]
                          : null;

                        return (
                          <td
                            key={dateStr}
                            className={`p-1 text-center cursor-pointer transition-colors ${
                              isToday ? "bg-[#00B4FF]/5" : ""
                            } ${isSelected ? "ring-2 ring-[#00B4FF] ring-inset" : ""}`}
                            onClick={() => handleCellClick(member.id, dateStr)}
                          >
                            {schedule ? (
                              <div
                                className={`${shiftConfig?.color} text-white rounded-lg p-2 text-xs font-medium relative`}
                              >
                                <span className="block">
                                  {shiftConfig?.icon}
                                </span>
                                <span className="block mt-0.5">
                                  {lang === "es"
                                    ? shiftConfig?.labelEs
                                    : shiftConfig?.label}
                                </span>
                                {schedule.tasks_redistributed && (
                                  <span
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full text-[10px] flex items-center justify-center"
                                    title={
                                      lang === "es"
                                        ? "Tareas redistribuidas"
                                        : "Tasks redistributed"
                                    }
                                  >
                                    ↻
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="h-12 rounded-lg border-2 border-dashed border-slate-200 hover:border-[#00B4FF] hover:bg-[#00B4FF]/5 flex items-center justify-center text-slate-400 transition-colors">
                                +
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Selector Modal */}
      {selectedCell && !showAbsenceModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900">
                {lang === "es" ? "Seleccionar Turno" : "Select Shift"}
              </h3>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <p className="text-sm text-slate-500 mb-4">
              {staff.find((s) => s.id === selectedCell.staffId)?.name} -{" "}
              {new Date(selectedCell.date).toLocaleDateString(
                lang === "es" ? "es-CO" : "en-US",
                { weekday: "long", month: "long", day: "numeric" },
              )}
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
              {(
                ["morning", "evening", "night", "split", "off"] as ShiftType[]
              ).map((shift) => {
                const config = SHIFT_CONFIG[shift];
                return (
                  <button
                    key={shift}
                    onClick={() => saveShift(shift)}
                    disabled={saving}
                    className={`${config.color} text-white p-3 rounded-lg font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2`}
                  >
                    <span>{config.icon}</span>
                    <span>{lang === "es" ? config.labelEs : config.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Absence options */}
            <div className="border-t border-slate-200 pt-4">
              <p className="text-sm font-medium text-slate-700 mb-2">
                {lang === "es"
                  ? "Marcar ausencia (redistribuye tareas):"
                  : "Mark absence (redistributes tasks):"}
              </p>
              <div className="grid grid-cols-3 gap-2">
                {(["sick", "vacation", "personal"] as const).map((reason) => {
                  const config = SHIFT_CONFIG[reason];
                  return (
                    <button
                      key={reason}
                      onClick={() => handleMarkAbsent(reason)}
                      disabled={saving}
                      className={`${config.color} text-white p-2 rounded-lg font-medium text-xs hover:opacity-90 transition-opacity disabled:opacity-50 flex flex-col items-center gap-1`}
                    >
                      <span>{config.icon}</span>
                      <span>
                        {lang === "es" ? config.labelEs : config.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delete button */}
            {getSchedule(selectedCell.staffId, selectedCell.date) && (
              <button
                onClick={async () => {
                  const res = await fetch(
                    `/api/schedule?user_id=${selectedCell.staffId}&date=${selectedCell.date}`,
                    { method: "DELETE" },
                  );
                  if (res.ok) {
                    await fetchSchedules();
                    setSelectedCell(null);
                  }
                }}
                className="w-full mt-4 p-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                {lang === "es" ? "Eliminar horario" : "Remove schedule"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
