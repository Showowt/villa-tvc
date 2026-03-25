"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

// ═══════════════════════════════════════════════════════════════
// TVC CLEANING PRIORITY DASHBOARD
// Shows: prioritized queue, deadline countdowns, staff assignments
// Updates every 60 seconds with deadline checks
// Issue #8: No cleaning deadline enforcement
// ═══════════════════════════════════════════════════════════════

const VILLA_NAMES: Record<number, string> = {
  1: "Teresa",
  2: "Aduana",
  3: "Trinidad",
  4: "Paz",
  5: "San Pedro",
  6: "San Diego",
  7: "Pozo",
  8: "Santo Domingo",
  9: "Merced",
  10: "Coche",
};

const VILLA_COLORS: Record<number, string> = {
  1: "#2E8B57",
  2: "#DAA520",
  3: "#E85D3A",
  4: "#E878A0",
  5: "#C040A0",
  6: "#E8A0C0",
  7: "#00BCD4",
  8: "#D32F2F",
  9: "#D32F2F",
  10: "#1565C0",
};

interface CleaningJob {
  id: string;
  position: number;
  villaNumber: number;
  villaName: string;
  type: "full_clean" | "re_clean" | "deep_clean" | "retouch";
  priority: "URGENT" | "HIGH" | "MEDIUM" | "LOW";
  priorityScore: number;
  deadline: string;
  latestStart: string;
  duration: string;
  assignedTo: string | null;
  assignedToName: string | null;
  status: "queued" | "in_progress" | "submitted" | "approved";
  color: string;
  guestContext: {
    name: string;
    count: number;
    boat: string;
    vip: boolean;
    allergies: string[];
    isGroup: boolean;
  } | null;
  reCleanContext: {
    reason: string;
  } | null;
  checklistId: string | null;
}

interface StaffWorkload {
  id: string;
  name: string;
  jobs: number;
  totalMinutes: number;
  currentVilla: string | null;
  status: "cleaning" | "waiting";
}

export default function CleaningPriorityDashboard() {
  const { t } = useLanguage();
  const [now, setNow] = useState(new Date());
  const [queue, setQueue] = useState<CleaningJob[]>([]);
  const [staff, setStaff] = useState<StaffWorkload[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedJob, setExpandedJob] = useState<number | null>(null);

  const loadCleaningQueue = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    try {
      // Get all villas that need cleaning today
      const { data: villaStatus } = await supabase
        .from("villa_status")
        .select("*")
        .eq("status", "cleaning");

      // Get today's bookings for guest context
      const { data: arrivals } = await supabase
        .from("villa_bookings")
        .select("*")
        .eq("check_in", today)
        .in("status", ["confirmed", "checked_in"]);

      // Get checklists for status
      const { data: checklists } = await supabase
        .from("checklists")
        .select("id, villa_number, status, assigned_to, type")
        .eq("date", today)
        .in("type", ["villa_empty_arriving", "villa_leaving", "villa_retouch"]);

      // Get housekeeping staff
      const { data: housekeepingStaff } = await supabase
        .from("users")
        .select("id, name")
        .eq("department", "housekeeping")
        .eq("is_active", true);

      // Build queue with priority scoring
      const jobs: CleaningJob[] = [];

      for (const villa of villaStatus || []) {
        const villaNumber =
          villa.villa_number ||
          parseInt(villa.villa_id?.replace("villa_", "") || "0");
        const arrival = arrivals?.find((a) => a.villa_id === villa.villa_id);
        const checklist = checklists?.find(
          (c) => c.villa_number === villaNumber,
        );

        // Calculate priority score
        let score = 0;
        let priority: CleaningJob["priority"] = "LOW";
        let deadline = "20:00";
        let latestStart = "19:00";
        const boatTime =
          arrival?.boat_preference || arrival?.arrival_time || "6:30pm";

        if (arrival) {
          // Boat time scoring
          if (boatTime.includes("3pm") || boatTime === "15:00") {
            score += 40;
            deadline = "13:30";
            latestStart = "12:00";
          } else if (boatTime.includes("6:30") || boatTime === "18:30") {
            score += 20;
            deadline = "17:00";
            latestStart = "15:45";
          }

          // VIP scoring
          if (arrival.is_vip) score += 20;

          // Group scoring
          if (arrival.is_group || (arrival.guests_count || 0) > 4) score += 15;

          // Allergy scoring
          const allergies = arrival.allergies
            ? Array.isArray(arrival.allergies)
              ? arrival.allergies
              : arrival.allergies.split(",")
            : [];
          if (allergies.length > 0) score += 10;

          // Deluxe villa scoring
          if (
            [
              "Trinidad",
              "San Pedro",
              "Pozo",
              "Santo Domingo",
              "Aduana",
            ].includes(VILLA_NAMES[villaNumber])
          ) {
            score += 10;
          }
        }

        // Re-clean scoring
        const isReClean =
          checklist?.type === "villa_retouch" ||
          villa.cleaning_status === "rejected";
        if (isReClean) score += 5;

        // Determine priority level
        if (score >= 50) priority = "URGENT";
        else if (score >= 30) priority = "HIGH";
        else if (score >= 10) priority = "MEDIUM";

        // Duration estimate
        let duration = "60 min";
        if (
          ["Trinidad", "San Pedro", "Pozo", "Santo Domingo", "Aduana"].includes(
            VILLA_NAMES[villaNumber],
          )
        ) {
          duration = "75 min";
        }
        if (isReClean) duration = "45 min";

        const assignedStaff = housekeepingStaff?.find(
          (s) => s.id === checklist?.assigned_to,
        );

        jobs.push({
          id: villa.id,
          position: 0, // Will be set after sorting
          villaNumber,
          villaName: VILLA_NAMES[villaNumber] || `Villa ${villaNumber}`,
          type: isReClean ? "re_clean" : "full_clean",
          priority,
          priorityScore: score,
          deadline,
          latestStart,
          duration,
          assignedTo: checklist?.assigned_to || null,
          assignedToName: assignedStaff?.name || null,
          status:
            checklist?.status === "complete"
              ? "submitted"
              : checklist?.status === "in_progress"
                ? "in_progress"
                : "queued",
          color:
            score >= 50
              ? "#EF4444"
              : score >= 30
                ? "#F59E0B"
                : score >= 10
                  ? "#3B82F6"
                  : "#94A3B8",
          guestContext: arrival
            ? {
                name: arrival.guest_name,
                count: arrival.guests_count || 2,
                boat: boatTime,
                vip: arrival.is_vip || false,
                allergies: arrival.allergies
                  ? Array.isArray(arrival.allergies)
                    ? arrival.allergies
                    : arrival.allergies.split(",").map((a: string) => a.trim())
                  : [],
                isGroup: arrival.is_group || false,
              }
            : null,
          reCleanContext: isReClean
            ? { reason: villa.notes || "Checklist rechazado" }
            : null,
          checklistId: checklist?.id || null,
        });
      }

      // Sort by priority score descending
      jobs.sort((a, b) => b.priorityScore - a.priorityScore);
      jobs.forEach((job, idx) => (job.position = idx + 1));

      // Build staff workload
      const staffWorkload: StaffWorkload[] = (housekeepingStaff || []).map(
        (s) => {
          const staffJobs = jobs.filter((j) => j.assignedTo === s.id);
          const inProgress = staffJobs.find((j) => j.status === "in_progress");
          return {
            id: s.id,
            name: s.name,
            jobs: staffJobs.length,
            totalMinutes: staffJobs.reduce(
              (sum, j) => sum + parseInt(j.duration),
              0,
            ),
            currentVilla: inProgress?.villaName || null,
            status: inProgress ? "cleaning" : "waiting",
          };
        },
      );

      setQueue(jobs);
      setStaff(staffWorkload);
    } catch (error) {
      console.error("[CleaningPriority] Load error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCleaningQueue();
    const interval = setInterval(() => {
      setNow(new Date());
      loadCleaningQueue();
    }, 60000);
    return () => clearInterval(interval);
  }, [loadCleaningQueue]);

  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const getMinutesUntil = (deadline: string) => {
    const [dH, dM] = deadline.split(":").map(Number);
    const [nH, nM] = [now.getHours(), now.getMinutes()];
    return dH * 60 + dM - (nH * 60 + nM);
  };

  const getUrgencyColor = (minutes: number, status: string) => {
    if (status === "approved") return "#10B981";
    if (status === "submitted") return "#3B82F6";
    if (minutes <= 0) return "#EF4444";
    if (minutes <= 30) return "#EF4444";
    if (minutes <= 60) return "#F59E0B";
    return "#10B981";
  };

  const inProgressCount = queue.filter(
    (j) => j.status === "in_progress",
  ).length;
  const queuedCount = queue.filter((j) => j.status === "queued").length;
  const urgentCount = queue.filter((j) => j.priority === "URGENT").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#0A0A0F] to-[#1a1a2e] px-5 py-4 border-b-3 border-amber-500">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-amber-500 text-[11px] font-bold tracking-widest">
              CLEANING PRIORITY ENGINE
            </div>
            <div className="text-white text-lg font-extrabold">
              Cola de Limpieza — Priorizada por Check-in
            </div>
          </div>
          <div className="flex gap-4 items-center">
            <div className="text-center">
              <div className="text-slate-400 text-[9px] font-semibold">
                HORA ACTUAL
              </div>
              <div className="text-white text-xl font-black tabular-nums">
                {currentTime}
              </div>
            </div>
            <div className="text-center">
              <div className="text-red-500 text-[9px] font-semibold">
                URGENTES
              </div>
              <div className="text-red-500 text-xl font-black">
                {urgentCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-amber-500 text-[9px] font-semibold">
                EN PROGRESO
              </div>
              <div className="text-amber-500 text-xl font-black">
                {inProgressCount}
              </div>
            </div>
            <div className="text-center">
              <div className="text-slate-400 text-[9px] font-semibold">
                EN COLA
              </div>
              <div className="text-white text-xl font-black">{queuedCount}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 max-w-4xl mx-auto">
        {/* Active Alerts */}
        {queue.filter(
          (j) => getMinutesUntil(j.deadline) <= 30 && j.status !== "approved",
        ).length > 0 && (
          <div className="bg-red-50 border-2 border-red-500 rounded-xl p-4 mb-4">
            <div className="text-sm font-extrabold text-red-500 mb-2">
              🚨 ALERTAS DE DEADLINE
            </div>
            {queue
              .filter(
                (j) =>
                  getMinutesUntil(j.deadline) <= 30 && j.status !== "approved",
              )
              .map((j) => {
                const mins = getMinutesUntil(j.deadline);
                return (
                  <div
                    key={j.id}
                    className="text-xs text-red-700 py-1 animate-pulse"
                  >
                    {mins <= 0
                      ? `🔴 VENCIDO: Villa ${j.villaName} — deadline era ${j.deadline}. ${j.guestContext?.name || "Huésped"} no tiene villa limpia!`
                      : `⚠️ ${mins} min restantes para Villa ${j.villaName}. Estado: ${j.status === "in_progress" ? "limpiando" : j.status === "queued" ? "NO INICIADA" : j.status}.`}
                  </div>
                );
              })}
          </div>
        )}

        {/* Staff Workload */}
        <div className="flex gap-2.5 mb-5 flex-wrap">
          {staff.map((s) => (
            <div
              key={s.id}
              className="flex-1 min-w-[160px] bg-white rounded-xl p-3.5 border border-slate-200"
              style={{
                borderLeftWidth: 4,
                borderLeftColor:
                  s.status === "cleaning" ? "#10B981" : "#94A3B8",
              }}
            >
              <div className="text-sm font-extrabold text-slate-900">
                {s.name}
              </div>
              <div
                className="text-[11px] font-bold"
                style={{
                  color: s.status === "cleaning" ? "#10B981" : "#94A3B8",
                }}
              >
                {s.status === "cleaning"
                  ? `🧹 Limpiando: ${s.currentVilla}`
                  : "⏳ Esperando"}
              </div>
              <div className="text-[10px] text-slate-500 mt-1">
                {s.jobs} villas asignadas • ~{s.totalMinutes} min total
              </div>
            </div>
          ))}
        </div>

        {/* Priority Queue Header */}
        <div className="flex justify-between items-center mb-2.5">
          <span className="text-sm font-extrabold text-slate-900">
            COLA DE PRIORIDAD
          </span>
          <span className="text-[10px] text-slate-500 font-semibold">
            Ordenada por urgencia de check-in del huésped
          </span>
        </div>

        {/* Queue Items */}
        {queue.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <div className="text-4xl mb-3">✅</div>
            <div className="font-bold">Sin Limpiezas Pendientes</div>
            <div className="text-sm">Todas las villas están listas</div>
          </div>
        ) : (
          queue.map((job) => {
            const minutesLeft = getMinutesUntil(job.deadline);
            const urgencyColor = getUrgencyColor(minutesLeft, job.status);
            const isExpanded = expandedJob === job.villaNumber;
            const pctToDeadline = Math.max(
              0,
              Math.min(100, (minutesLeft / 180) * 100),
            );

            return (
              <div
                key={job.id}
                onClick={() =>
                  setExpandedJob(isExpanded ? null : job.villaNumber)
                }
                className="bg-white rounded-xl mb-2.5 border border-slate-200 cursor-pointer overflow-hidden transition-all hover:shadow-md"
                style={{
                  borderLeftWidth: 5,
                  borderLeftColor: job.color,
                  boxShadow: isExpanded
                    ? "0 4px 16px rgba(0,0,0,0.08)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                {/* Main Row */}
                <div className="p-3.5 flex items-center gap-3.5">
                  {/* Position */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-base font-black text-white shrink-0"
                    style={{ backgroundColor: job.color }}
                  >
                    {job.position}
                  </div>

                  {/* Villa Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-extrabold text-slate-900">
                        Villa {job.villaName}
                      </span>
                      <span
                        className="text-[9px] font-bold px-2 py-0.5 rounded-md"
                        style={{
                          backgroundColor: `${job.color}15`,
                          color: job.color,
                        }}
                      >
                        {job.priority}
                      </span>
                      {job.guestContext?.vip && (
                        <span className="text-xs">⭐</span>
                      )}
                      {(job.guestContext?.allergies?.length || 0) > 0 && (
                        <span className="text-xs">⚠️</span>
                      )}
                      {job.reCleanContext && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-100 text-red-500 font-bold">
                          RE-CLEAN
                        </span>
                      )}
                      {job.guestContext?.isGroup && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-100 text-purple-600 font-bold">
                          GRUPO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {job.guestContext
                        ? `${job.guestContext.name} • ${job.guestContext.count} huéspedes • Bote ${job.guestContext.boat}`
                        : "Sin huésped asignado — limpieza de mantenimiento"}
                    </div>
                  </div>

                  {/* Deadline Countdown */}
                  <div className="text-right shrink-0">
                    <div
                      className="text-[11px] font-bold"
                      style={{
                        color: urgencyColor,
                        animation:
                          minutesLeft <= 30 ? "pulse 1.5s infinite" : "none",
                      }}
                    >
                      {minutesLeft <= 0 ? "VENCIDO" : `${minutesLeft} min`}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      Deadline: {job.deadline}
                    </div>
                    {/* Progress bar */}
                    <div className="w-20 h-1 bg-slate-100 rounded mt-1">
                      <div
                        className="h-full rounded transition-all"
                        style={{
                          width: `${pctToDeadline}%`,
                          backgroundColor: urgencyColor,
                        }}
                      />
                    </div>
                  </div>

                  {/* Status */}
                  <div
                    className="px-3 py-1.5 rounded-lg shrink-0"
                    style={{
                      backgroundColor:
                        job.status === "in_progress"
                          ? "#ECFDF5"
                          : job.status === "submitted"
                            ? "#EFF6FF"
                            : "#F9FAFB",
                      border: `1px solid ${
                        job.status === "in_progress"
                          ? "#10B98130"
                          : job.status === "submitted"
                            ? "#3B82F630"
                            : "#E2E8F0"
                      }`,
                    }}
                  >
                    <div
                      className="text-[10px] font-bold"
                      style={{
                        color:
                          job.status === "in_progress"
                            ? "#10B981"
                            : job.status === "submitted"
                              ? "#3B82F6"
                              : "#94A3B8",
                      }}
                    >
                      {job.status === "in_progress"
                        ? "🧹 Limpiando"
                        : job.status === "submitted"
                          ? "📋 Enviada"
                          : job.status === "approved"
                            ? "✅ Lista"
                            : "⏳ En Cola"}
                    </div>
                    <div className="text-[9px] text-slate-400">
                      {job.assignedToName || "Sin asignar"}
                    </div>
                  </div>
                </div>

                {/* Expanded Detail */}
                {isExpanded && (
                  <div className="px-4 pb-3.5 pt-3.5 border-t border-slate-100 bg-slate-50/50">
                    <div className="grid grid-cols-4 gap-3 mb-3">
                      <div>
                        <div className="text-[9px] text-slate-400 font-semibold">
                          TIPO LIMPIEZA
                        </div>
                        <div className="text-xs font-bold">
                          {job.type === "full_clean"
                            ? "Limpieza Completa"
                            : job.type === "re_clean"
                              ? "Re-Limpieza"
                              : job.type === "deep_clean"
                                ? "Limpieza Profunda"
                                : "Retoque"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 font-semibold">
                          DURACIÓN EST.
                        </div>
                        <div className="text-xs font-bold">{job.duration}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 font-semibold">
                          INICIAR ANTES DE
                        </div>
                        <div
                          className="text-xs font-bold"
                          style={{ color: urgencyColor }}
                        >
                          {job.latestStart}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 font-semibold">
                          PUNTUACIÓN
                        </div>
                        <div
                          className="text-xs font-bold"
                          style={{ color: job.color }}
                        >
                          {job.priorityScore}/100
                        </div>
                      </div>
                    </div>

                    {/* Why this priority */}
                    <div
                      className="rounded-lg p-2.5 mb-2.5"
                      style={{
                        backgroundColor: `${job.color}08`,
                        border: `1px solid ${job.color}20`,
                      }}
                    >
                      <div
                        className="text-[10px] font-bold mb-1"
                        style={{ color: job.color }}
                      >
                        ¿POR QUÉ ESTA PRIORIDAD?
                      </div>
                      <div className="text-[11px] text-slate-700 leading-relaxed">
                        {[
                          job.guestContext?.boat?.includes("3pm") &&
                            "+40 pts: Huésped llega en bote de 3pm",
                          job.guestContext?.boat?.includes("6:30") &&
                            "+20 pts: Huésped llega en bote de 6:30pm",
                          job.guestContext?.vip && "+20 pts: Huésped VIP",
                          job.guestContext?.isGroup &&
                            "+15 pts: Parte de reserva grupal",
                          (job.guestContext?.allergies?.length || 0) > 0 &&
                            `+10 pts: Huésped con alergias (${job.guestContext?.allergies?.join(", ")})`,
                          [
                            "Trinidad",
                            "San Pedro",
                            "Pozo",
                            "Santo Domingo",
                            "Aduana",
                          ].includes(job.villaName) &&
                            "+10 pts: Villa Deluxe (más grande, más tiempo)",
                          job.reCleanContext && "+5 pts: Re-limpieza requerida",
                          !job.guestContext &&
                            "0 pts: Sin huésped — limpiar al final del día",
                        ]
                          .filter(Boolean)
                          .map((reason, i) => (
                            <div key={i}>• {reason}</div>
                          ))}
                      </div>
                    </div>

                    {/* Re-clean reason */}
                    {job.reCleanContext && (
                      <div className="bg-red-50 rounded-lg p-2.5 mb-2.5 border border-red-200">
                        <div className="text-[10px] font-bold text-red-500">
                          🔴 RAZÓN DEL RECHAZO
                        </div>
                        <div className="text-[11px] text-red-700">
                          {job.reCleanContext.reason}
                        </div>
                      </div>
                    )}

                    {/* Allergy warning */}
                    {(job.guestContext?.allergies?.length || 0) > 0 && (
                      <div className="bg-yellow-50 rounded-lg p-2.5 border border-yellow-200">
                        <div className="text-[10px] font-bold text-yellow-700">
                          ⚠️ ALERTA DE ALERGIA — LIMPIEZA EXTRA REQUERIDA
                        </div>
                        <div className="text-[11px] text-yellow-800">
                          Huésped tiene alergia a:{" "}
                          {job.guestContext?.allergies?.join(", ")}. Verificar
                          que NO queden residuos de estos alérgenos. Limpiar
                          superficies extra.
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}

        {/* Scoring Legend */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 mt-5">
          <div className="text-sm font-extrabold text-slate-900 mb-3">
            📊 CÓMO SE CALCULA LA PRIORIDAD
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
            {[
              [
                "+40",
                "Bote de 3pm",
                "Máxima urgencia — deadline 1:30pm",
                "#EF4444",
              ],
              [
                "+20",
                "Bote de 6:30pm",
                "Media urgencia — deadline 5:00pm",
                "#3B82F6",
              ],
              ["+20", "Huésped VIP", "Atención especial requerida", "#DAA520"],
              [
                "+15",
                "Grupo / Takeover",
                "Coordinación múltiples villas",
                "#7C3AED",
              ],
              ["+10", "Alergia", "Limpieza extra sanitización", "#F59E0B"],
              [
                "+10",
                "Villa Deluxe",
                "Más grande, más tiempo necesario",
                "#0066CC",
              ],
              [
                "+5",
                "Re-limpieza",
                "Fue rechazada, urgente corregir",
                "#EF4444",
              ],
              ["+0", "Sin llegada", "Limpiar al final del día", "#94A3B8"],
            ].map(([pts, label, desc, color]) => (
              <div
                key={label}
                className="flex gap-2 items-start p-2 rounded-lg"
                style={{ backgroundColor: `${color}08` }}
              >
                <span
                  className="text-xs font-black min-w-[30px] text-right"
                  style={{ color }}
                >
                  {pts}
                </span>
                <div>
                  <div className="text-[11px] font-bold text-slate-900">
                    {label}
                  </div>
                  <div className="text-[9px] text-slate-500">{desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
