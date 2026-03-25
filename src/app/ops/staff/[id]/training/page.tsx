"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// MANAGER VIEW: Staff Training Status - Issue #44
// Vista de manager para estado de capacitacion de empleados
// ═══════════════════════════════════════════════════════════════

interface TrainingItem {
  id: string;
  training_type: string;
  training_name: string;
  training_name_es: string;
  department: string;
  description_es: string | null;
  required_before_task: boolean;
  recertification_days: number | null;
  userStatus?: {
    id: string;
    status: string;
    score: number | null;
    completed_at: string | null;
    expires_at: string | null;
    certified_by: string | null;
    certified_at: string | null;
    attempts: number;
  };
}

interface StaffMember {
  id: string;
  name: string;
  department: string;
  role: string;
}

interface TrainingStats {
  total: number;
  completed: number;
  pending: number;
  expired: number;
  progress: number;
}

export default function StaffTrainingManagerPage() {
  const params = useParams();
  const router = useRouter();
  const staffId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember | null>(null);
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [stats, setStats] = useState<TrainingStats | null>(null);
  const [canReceiveTasks, setCanReceiveTasks] = useState(true);
  const [blockedBy, setBlockedBy] = useState<{ training_name_es: string }[]>(
    [],
  );
  const [certifying, setCertifying] = useState<string | null>(null);
  const [showCertifyModal, setShowCertifyModal] = useState(false);
  const [selectedTraining, setSelectedTraining] = useState<TrainingItem | null>(
    null,
  );
  const [certifyNotes, setCertifyNotes] = useState("");
  const [managerId, setManagerId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/training?view=user_trainings&userId=${staffId}`,
      );
      const data = await response.json();

      if (data.error) {
        console.error("[StaffTraining] Error:", data.error);
        return;
      }

      setStaff(data.user);
      setTrainings(data.trainings || []);
      setStats(data.stats);

      // Verificar si puede recibir tareas
      const canWorkResponse = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "check_can_receive_tasks",
          userId: staffId,
        }),
      });
      const canWorkData = await canWorkResponse.json();
      setCanReceiveTasks(canWorkData.can_receive_tasks ?? true);
      setBlockedBy(canWorkData.blocked_by ?? []);

      // Obtener ID del manager actual
      const supabase = createBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        if (profile) {
          setManagerId(profile.id);
        }
      }
    } catch (error) {
      console.error("[StaffTraining] Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [staffId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCertify = async () => {
    if (!selectedTraining?.userStatus?.id || !managerId) return;

    setCertifying(selectedTraining.id);
    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "certify_training",
          trainingId: selectedTraining.userStatus.id,
          certifiedBy: managerId,
          notes: certifyNotes,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setShowCertifyModal(false);
        setSelectedTraining(null);
        setCertifyNotes("");
        await loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("[StaffTraining] Error certifying:", error);
      alert("Error al certificar");
    } finally {
      setCertifying(null);
    }
  };

  const handleRenew = async (trainingId: string) => {
    if (
      !confirm(
        "Esto requiere que el empleado complete la capacitacion nuevamente. Continuar?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch("/api/training", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew_training",
          trainingId,
        }),
      });

      const data = await response.json();
      if (data.success) {
        await loadData();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error("[StaffTraining] Error renewing:", error);
      alert("Error al renovar");
    }
  };

  const getStatusBadge = (training: TrainingItem) => {
    if (!training.userStatus) {
      return {
        text: "Pendiente",
        color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
      };
    }

    const status = training.userStatus.status;
    const isExpired =
      status === "completed" &&
      training.userStatus.expires_at &&
      new Date(training.userStatus.expires_at) < new Date();

    if (isExpired) {
      return {
        text: "Vencido",
        color: "bg-red-500/20 text-red-400 border-red-500/30",
      };
    }

    switch (status) {
      case "completed":
        return {
          text: training.userStatus.certified_by ? "Certificado" : "Completado",
          color: training.userStatus.certified_by
            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
            : "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
        };
      case "in_progress":
        return {
          text: "En Progreso",
          color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
        };
      case "failed":
        return {
          text: "Reprobado",
          color: "bg-red-500/20 text-red-400 border-red-500/30",
        };
      default:
        return {
          text: "Pendiente",
          color: "bg-slate-500/20 text-slate-400 border-slate-500/30",
        };
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getDepartmentLabel = (dept: string) => {
    const labels: Record<string, string> = {
      kitchen: "Cocina",
      bar: "Bar",
      cleaning: "Limpieza",
      all: "Todos",
    };
    return labels[dept] || dept;
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  if (!staff) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="text-center py-12">
          <p className="text-slate-400">Empleado no encontrado</p>
          <Link
            href="/ops/management"
            className="text-cyan-400 mt-4 inline-block"
          >
            Volver
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-sm text-slate-400 hover:text-white mb-2 flex items-center gap-1"
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
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Volver
        </button>
        <h1 className="text-2xl font-bold">Capacitaciones</h1>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-lg">{staff.name}</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
            {getDepartmentLabel(staff.department)}
          </span>
        </div>
      </div>

      {/* Task Assignment Status */}
      <div
        className={`rounded-xl p-4 mb-6 ${
          canReceiveTasks
            ? "bg-emerald-500/10 border border-emerald-500/30"
            : "bg-red-500/10 border border-red-500/30"
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center ${
              canReceiveTasks ? "bg-emerald-500/20" : "bg-red-500/20"
            }`}
          >
            {canReceiveTasks ? (
              <svg
                className="w-5 h-5 text-emerald-400"
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
            ) : (
              <svg
                className="w-5 h-5 text-red-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            )}
          </div>
          <div>
            <div
              className={`font-bold ${canReceiveTasks ? "text-emerald-400" : "text-red-400"}`}
            >
              {canReceiveTasks
                ? "Puede recibir tareas completas"
                : "Tareas limitadas hasta completar capacitaciones"}
            </div>
            {!canReceiveTasks && blockedBy.length > 0 && (
              <div className="text-sm text-slate-400 mt-1">
                Falta: {blockedBy.map((b) => b.training_name_es).join(", ")}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      {stats && (
        <div className="bg-slate-800 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Progreso General</span>
            <span className="text-sm font-bold">
              {stats.completed}/{stats.total} ({stats.progress}%)
            </span>
          </div>
          <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${stats.progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs">
            <span className="text-emerald-400">
              {stats.completed} completadas
            </span>
            <span className="text-amber-400">{stats.pending} pendientes</span>
            <span className="text-red-400">{stats.expired} vencidas</span>
          </div>
        </div>
      )}

      {/* Training List */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wide">
          Capacitaciones ({trainings.length})
        </h3>

        {trainings.map((training) => {
          const badge = getStatusBadge(training);
          const isCompleted = training.userStatus?.status === "completed";
          const isExpired =
            isCompleted &&
            training.userStatus?.expires_at &&
            new Date(training.userStatus.expires_at) < new Date();
          const needsCertification =
            isCompleted && !isExpired && !training.userStatus?.certified_by;

          return (
            <div
              key={training.id}
              className="bg-slate-800 rounded-xl p-4 border border-slate-700"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {training.required_before_task && (
                      <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">
                        REQUERIDO
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500">
                      {getDepartmentLabel(training.department)}
                    </span>
                  </div>
                  <h4 className="font-medium">{training.training_name_es}</h4>
                  <p className="text-xs text-slate-400 mt-1">
                    {training.description_es || "-"}
                  </p>

                  {training.userStatus && (
                    <div className="mt-3 text-xs text-slate-500 space-y-1">
                      {training.userStatus.completed_at && (
                        <div>
                          Completado:{" "}
                          {formatDate(training.userStatus.completed_at)}
                        </div>
                      )}
                      {training.userStatus.score !== null && (
                        <div>Puntaje: {training.userStatus.score}%</div>
                      )}
                      {training.userStatus.expires_at && (
                        <div
                          className={
                            isExpired ? "text-red-400" : "text-slate-500"
                          }
                        >
                          {isExpired ? "Vencio: " : "Vence: "}
                          {formatDate(training.userStatus.expires_at)}
                        </div>
                      )}
                      {training.userStatus.certified_by && (
                        <div className="text-emerald-400">
                          Certificado:{" "}
                          {formatDate(training.userStatus.certified_at || "")}
                        </div>
                      )}
                      {training.userStatus.attempts > 0 && (
                        <div>Intentos: {training.userStatus.attempts}</div>
                      )}
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <span
                    className={`px-2 py-1 rounded-full text-[10px] font-bold border ${badge.color}`}
                  >
                    {badge.text}
                  </span>

                  {/* Actions */}
                  <div className="flex gap-1">
                    {needsCertification && (
                      <button
                        onClick={() => {
                          setSelectedTraining(training);
                          setShowCertifyModal(true);
                        }}
                        className="px-2 py-1 bg-emerald-500 text-white text-xs rounded font-medium hover:bg-emerald-600"
                      >
                        Certificar
                      </button>
                    )}
                    {(isExpired ||
                      training.userStatus?.status === "failed") && (
                      <button
                        onClick={() =>
                          training.userStatus &&
                          handleRenew(training.userStatus.id)
                        }
                        className="px-2 py-1 bg-amber-500 text-white text-xs rounded font-medium hover:bg-amber-600"
                      >
                        Renovar
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Recertification info */}
              {training.recertification_days && (
                <div className="mt-2 pt-2 border-t border-slate-700">
                  <span className="text-[10px] text-slate-500">
                    Recertificacion cada {training.recertification_days} dias
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Certify Modal */}
      {showCertifyModal && selectedTraining && (
        <div
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setShowCertifyModal(false)}
        >
          <div
            className="w-full max-w-md bg-slate-800 rounded-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-2">Certificar Capacitacion</h3>
            <p className="text-sm text-slate-400 mb-4">
              Certificar a {staff.name} en:{" "}
              <span className="text-white">
                {selectedTraining.training_name_es}
              </span>
            </p>

            <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
              <p className="text-xs text-slate-400 mb-2">
                Al certificar confirmas que:
              </p>
              <ul className="text-xs text-slate-300 space-y-1">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">1.</span> Has verificado
                  que el empleado comprende el material
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">2.</span> El empleado ha
                  demostrado competencia practica
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-400">3.</span> Esta listo para
                  realizar tareas relacionadas
                </li>
              </ul>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-slate-400 mb-1">
                Notas (opcional)
              </label>
              <textarea
                value={certifyNotes}
                onChange={(e) => setCertifyNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm"
                rows={2}
                placeholder="Observaciones adicionales..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCertifyModal(false);
                  setSelectedTraining(null);
                  setCertifyNotes("");
                }}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCertify}
                disabled={certifying === selectedTraining.id}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 disabled:opacity-50"
              >
                {certifying === selectedTraining.id
                  ? "Certificando..."
                  : "Certificar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
