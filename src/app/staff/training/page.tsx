"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// ═══════════════════════════════════════════════════════════════
// TRAINING PAGE — Issue #11
// Includes "Mostrar de nuevo" option to reset onboarding
// ═══════════════════════════════════════════════════════════════

type TrainingRequirement = Tables<"training_requirements">;
type StaffTraining = Tables<"staff_training">;

interface TrainingItem extends TrainingRequirement {
  userStatus?: StaffTraining;
}

export default function TrainingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [trainings, setTrainings] = useState<TrainingItem[]>([]);
  const [userDepartment, setUserDepartment] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTraining, setActiveTraining] = useState<TrainingItem | null>(
    null,
  );
  const [completing, setCompleting] = useState(false);
  const [completedCount, setCompletedCount] = useState(0);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resettingOnboarding, setResettingOnboarding] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const supabase = createBrowserClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("users")
      .select("id, department")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      setLoading(false);
      return;
    }

    setUserId(profile.id);
    setUserDepartment(profile.department);

    // Get training requirements for this department
    const { data: requirements } = await supabase
      .from("training_requirements")
      .select("*")
      .eq("is_active", true)
      .or(`department.eq.${profile.department},department.eq.all`)
      .order("sort_order");

    // Get user's training status
    const { data: userTrainings } = await supabase
      .from("staff_training")
      .select("*")
      .eq("user_id", profile.id);

    // Merge requirements with user status
    const merged: TrainingItem[] = (requirements || []).map((req) => ({
      ...req,
      userStatus: userTrainings?.find(
        (t) => t.training_type === req.training_type,
      ),
    }));

    setTrainings(merged);
    setCompletedCount(
      merged.filter((t) => t.userStatus?.status === "completed").length,
    );
    setLoading(false);
  };

  const handleStartTraining = (training: TrainingItem) => {
    setActiveTraining(training);
  };

  const handleCompleteTraining = async () => {
    if (!activeTraining || !userId) return;

    setCompleting(true);

    try {
      const supabase = createBrowserClient();

      if (activeTraining.userStatus) {
        // Update existing
        await supabase
          .from("staff_training")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", activeTraining.userStatus.id);
      } else {
        // Create new
        await supabase.from("staff_training").insert({
          user_id: userId,
          department: activeTraining.department,
          training_type: activeTraining.training_type,
          training_name: activeTraining.training_name,
          training_name_es: activeTraining.training_name_es,
          status: "completed",
          completed_at: new Date().toISOString(),
          expires_at: activeTraining.recertification_days
            ? new Date(
                Date.now() +
                  activeTraining.recertification_days * 24 * 60 * 60 * 1000,
              ).toISOString()
            : null,
        });
      }

      setActiveTraining(null);
      await loadData();
    } catch (error) {
      console.error("Error completing training:", error);
      alert("Error al completar capacitacion");
    } finally {
      setCompleting(false);
    }
  };

  const handleResetOnboarding = async () => {
    if (!userId) return;

    setResettingOnboarding(true);

    try {
      const supabase = createBrowserClient();

      // Reset onboarding status
      await supabase
        .from("users")
        .update({
          onboarding_completed: false,
          onboarding_completed_at: null,
        })
        .eq("id", userId);

      setShowResetModal(false);

      // Redirect to onboarding
      router.push("/staff/onboarding");
    } catch (error) {
      console.error("Error resetting onboarding:", error);
      alert("Error al reiniciar tutorial");
    } finally {
      setResettingOnboarding(false);
    }
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "expired":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/30";
    }
  };

  const getStatusLabel = (training: TrainingItem) => {
    if (!training.userStatus) return "Pendiente";

    const status = training.userStatus.status;
    if (status === "completed") {
      if (
        training.userStatus.expires_at &&
        new Date(training.userStatus.expires_at) < new Date()
      ) {
        return "Vencido";
      }
      return "Completado";
    }
    if (status === "in_progress") return "En Progreso";
    if (status === "expired") return "Vencido";
    return "Pendiente";
  };

  const progress =
    trainings.length > 0 ? (completedCount / trainings.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">Capacitaciones</h1>
        <p className="text-xs text-slate-400">
          Completa tus capacitaciones requeridas
        </p>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Tu Progreso</span>
          <span className="text-sm font-medium">
            {completedCount}/{trainings.length}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        {progress === 100 && (
          <p className="text-xs text-emerald-400 mt-2 text-center">
            Todas las capacitaciones completadas!
          </p>
        )}
      </div>

      {/* Reset Onboarding Card */}
      <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-medium text-sm flex items-center gap-2">
              <svg
                className="w-5 h-5 text-cyan-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Tutorial de la App
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Repasa como usar las herramientas principales
            </p>
          </div>
          <button
            onClick={() => setShowResetModal(true)}
            className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-medium hover:bg-cyan-500/30 transition-colors border border-cyan-500/30"
          >
            Mostrar de nuevo
          </button>
        </div>
      </div>

      {/* Required Trainings */}
      <div>
        <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
          Capacitaciones Requeridas
        </h3>

        <div className="space-y-2">
          {trainings
            .filter((t) => t.required_before_task)
            .map((training) => {
              const status = getStatusLabel(training);
              const isExpired = status === "Vencido";
              const isCompleted =
                status === "Completado" &&
                training.userStatus?.status === "completed";

              return (
                <button
                  key={training.id}
                  onClick={() => !isCompleted && handleStartTraining(training)}
                  disabled={isCompleted && !isExpired}
                  className={`w-full text-left bg-slate-800 rounded-xl p-4 transition-colors ${
                    isCompleted && !isExpired
                      ? "opacity-60"
                      : "hover:bg-slate-700"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        {training.required_before_task && (
                          <span className="text-red-400 text-[10px] font-bold">
                            REQUERIDO
                          </span>
                        )}
                      </div>
                      <div className="font-medium text-sm mb-1">
                        {training.training_name_es}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2">
                        {training.description_es || training.description}
                      </p>
                      {training.recertification_days && (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Recertificacion: cada {training.recertification_days}{" "}
                          dias
                        </p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                        isExpired ? "expired" : training.userStatus?.status,
                      )}`}
                    >
                      {status}
                    </span>
                  </div>
                </button>
              );
            })}

          {trainings.filter((t) => t.required_before_task).length === 0 && (
            <div className="bg-slate-800 rounded-xl p-6 text-center">
              <p className="text-slate-400 text-sm">
                No hay capacitaciones requeridas para tu departamento
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Optional Trainings */}
      {trainings.filter((t) => !t.required_before_task).length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            Capacitaciones Adicionales
          </h3>

          <div className="space-y-2">
            {trainings
              .filter((t) => !t.required_before_task)
              .map((training) => {
                const status = getStatusLabel(training);
                const isCompleted =
                  status === "Completado" &&
                  training.userStatus?.status === "completed";

                return (
                  <button
                    key={training.id}
                    onClick={() =>
                      !isCompleted && handleStartTraining(training)
                    }
                    disabled={isCompleted}
                    className={`w-full text-left bg-slate-800 rounded-xl p-4 transition-colors ${
                      isCompleted ? "opacity-60" : "hover:bg-slate-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">
                          {training.training_name_es}
                        </div>
                        <p className="text-xs text-slate-400">
                          {training.description_es || training.description}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded-full text-[10px] font-bold border ${getStatusColor(
                          training.userStatus?.status,
                        )}`}
                      >
                        {status}
                      </span>
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      )}

      {/* Training Modal */}
      {activeTraining && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold mb-2">
              {activeTraining.training_name_es}
            </h3>
            <p className="text-sm text-slate-400 mb-6">
              {activeTraining.description_es || activeTraining.description}
            </p>

            <div className="bg-slate-700/50 rounded-xl p-4 mb-6">
              <p className="text-sm text-slate-300 mb-4">
                Para completar esta capacitacion, debes:
              </p>
              <ul className="space-y-2 text-sm">
                {activeTraining.training_type === "sop_read" && (
                  <>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">1.</span> Leer todos los
                      SOPs del departamento
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">2.</span> Confirmar que
                      los has entendido
                    </li>
                  </>
                )}
                {activeTraining.training_type === "recipe_test" && (
                  <>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">1.</span> Revisar recetas
                      con el chef
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">2.</span> Preparar platos
                      de prueba
                    </li>
                  </>
                )}
                {activeTraining.training_type === "allergy_protocol" && (
                  <>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">1.</span> Leer protocolo
                      de alergenos
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">2.</span> Conocer
                      alergenos de cada plato
                    </li>
                  </>
                )}
                {activeTraining.training_type === "emergency_protocol" && (
                  <>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">1.</span> Revisar plan de
                      emergencias
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">2.</span> Conocer rutas de
                      evacuacion
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">3.</span> Saber donde
                      estan los extintores
                    </li>
                  </>
                )}
                {activeTraining.training_type === "cleaning_standards" && (
                  <>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">1.</span> Leer estandares
                      de limpieza
                    </li>
                    <li className="flex items-center gap-2 text-slate-400">
                      <span className="text-cyan-400">2.</span> Practicar con
                      supervision
                    </li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setActiveTraining(null)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleCompleteTraining}
                disabled={completing}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 disabled:opacity-50"
              >
                {completing ? "Guardando..." : "Marcar Completado"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Onboarding Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-slate-800 rounded-2xl p-6">
            <div className="text-center mb-6">
              <div className="w-16 h-16 rounded-full bg-cyan-500/20 flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-cyan-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-bold mb-2">Repetir Tutorial</h3>
              <p className="text-sm text-slate-400">
                Volver a ver el tutorial inicial te ayudara a recordar como usar
                todas las herramientas de la aplicacion.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowResetModal(false)}
                className="flex-1 py-3 bg-slate-700 text-white rounded-xl font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleResetOnboarding}
                disabled={resettingOnboarding}
                className="flex-1 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 disabled:opacity-50"
              >
                {resettingOnboarding ? "Cargando..." : "Ver Tutorial"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
