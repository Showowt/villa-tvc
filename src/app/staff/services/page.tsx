"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// ============================================
// TVC Service Availability Management
// Staff can mark services available/unavailable
// Bot checks before suggesting services
// ============================================

type Service = Tables<"services">;

interface ServiceWithAvailability extends Service {
  is_available_today?: boolean;
  unavailable_reason?: string | null;
  unavailable_until?: string | null;
}

const UNAVAILABLE_REASONS = [
  { key: "weather", label: "Clima", icon: "🌧️" },
  { key: "capacity", label: "Capacidad", icon: "👥" },
  { key: "maintenance", label: "Mantenimiento", icon: "🔧" },
  { key: "no_staff", label: "Sin personal", icon: "👤" },
  { key: "partner", label: "Proveedor no disponible", icon: "🤝" },
  { key: "other", label: "Otro", icon: "❓" },
];

export default function StaffServicesPage() {
  const [services, setServices] = useState<ServiceWithAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [selectedService, setSelectedService] =
    useState<ServiceWithAvailability | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [unavailableReason, setUnavailableReason] = useState<string>("other");
  const [customNote, setCustomNote] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const loadServices = useCallback(async () => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("sort_order");

    if (error) {
      console.error("[Services] Error loading services:", error);
    } else if (data) {
      setServices(data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadServices();
  }, [loadServices]);

  const toggleAvailability = async (
    service: ServiceWithAvailability,
    makeAvailable: boolean,
  ) => {
    setSubmitting(true);
    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();
      let changedBy: string | null = null;
      if (user) {
        const { data: profile } = await supabase
          .from("users")
          .select("id")
          .eq("auth_id", user.id)
          .single();
        changedBy = profile?.id || null;
      }

      // Update service availability
      const { error: updateError } = await supabase
        .from("services")
        .update({
          is_available_today: makeAvailable,
          unavailable_reason: makeAvailable ? null : unavailableReason,
          unavailable_until: null,
        })
        .eq("id", service.id);

      if (updateError) {
        console.error("[Services] Error updating availability:", updateError);
        alert("Error al actualizar disponibilidad");
        return;
      }

      // Log the change
      const { error: logError } = await supabase
        .from("service_availability_logs")
        .insert({
          service_id: service.id,
          is_available: makeAvailable,
          reason: makeAvailable ? null : unavailableReason,
          capacity_note: makeAvailable ? null : customNote || null,
          changed_by: changedBy,
        });

      if (logError) {
        console.error(
          "[Services] Error logging availability change:",
          logError,
        );
      }

      // Update local state
      setServices((prev) =>
        prev.map((s) =>
          s.id === service.id
            ? {
                ...s,
                is_available_today: makeAvailable,
                unavailable_reason: makeAvailable ? null : unavailableReason,
              }
            : s,
        ),
      );

      setSuccess(true);
      setShowModal(false);
      setSelectedService(null);
      setCustomNote("");
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Services] Error:", error);
      alert("Error al guardar");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { key: "all", label: "Todos" },
    { key: "tours", label: "Tours" },
    { key: "water_sports", label: "Acuaticos" },
    { key: "wellness", label: "Bienestar" },
    { key: "dining", label: "Gastronomia" },
    { key: "transport", label: "Transporte" },
    { key: "other", label: "Otros" },
  ];

  const filteredServices =
    activeCategory === "all"
      ? services
      : services.filter((s) => s.category === activeCategory);

  const availableCount = services.filter(
    (s) => s.is_available_today !== false,
  ).length;
  const unavailableCount = services.filter(
    (s) => s.is_available_today === false,
  ).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">🎯</span> Servicios
        </h1>
        <p className="text-xs text-slate-400">
          Marca disponibilidad de servicios para el bot
        </p>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          Disponibilidad actualizada
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-emerald-500/20 border border-emerald-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-emerald-400">
            {availableCount}
          </div>
          <div className="text-xs text-slate-400">Disponibles</div>
        </div>
        <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-black text-red-400">
            {unavailableCount}
          </div>
          <div className="text-xs text-slate-400">No disponibles</div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-cyan-500 text-white"
                : "bg-slate-800 text-slate-400"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Services List */}
      <div className="space-y-2">
        {filteredServices.map((service) => {
          const isAvailable = service.is_available_today !== false;
          const reasonLabel = UNAVAILABLE_REASONS.find(
            (r) => r.key === service.unavailable_reason,
          )?.label;

          return (
            <div
              key={service.id}
              className={`bg-slate-800 rounded-xl p-4 ${
                !isAvailable ? "border border-red-500/30" : ""
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{service.name_es}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {service.type === "partner" && (
                      <span className="text-purple-400 mr-2">Proveedor</span>
                    )}
                    ${service.price?.toLocaleString() || 0} COP
                  </div>
                  {!isAvailable && reasonLabel && (
                    <div className="text-xs text-red-400 mt-1">
                      No disponible: {reasonLabel}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (isAvailable) {
                      setSelectedService(service);
                      setShowModal(true);
                    } else {
                      toggleAvailability(service, true);
                    }
                  }}
                  disabled={submitting}
                  className={`ml-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isAvailable
                      ? "bg-emerald-500/20 text-emerald-400 hover:bg-red-500/20 hover:text-red-400"
                      : "bg-red-500/20 text-red-400 hover:bg-emerald-500/20 hover:text-emerald-400"
                  }`}
                >
                  {isAvailable ? "Disponible" : "Activar"}
                </button>
              </div>
            </div>
          );
        })}

        {filteredServices.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            No hay servicios en esta categoria
          </div>
        )}
      </div>

      {/* Info Footer */}
      <div className="bg-slate-800/50 rounded-xl p-4 text-center">
        <div className="text-xs text-slate-400">
          El bot verifica la disponibilidad antes de sugerir servicios a los
          huespedes.
        </div>
      </div>

      {/* Unavailable Modal */}
      {showModal && selectedService && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-slate-800 rounded-2xl p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <div className="text-lg font-bold">{selectedService.name_es}</div>
              <div className="text-sm text-slate-400">
                Marcar como no disponible
              </div>
            </div>

            {/* Reason Selection */}
            <div className="space-y-2 mb-4">
              <label className="text-xs text-slate-400">Razon:</label>
              <div className="grid grid-cols-2 gap-2">
                {UNAVAILABLE_REASONS.map((reason) => (
                  <button
                    key={reason.key}
                    onClick={() => setUnavailableReason(reason.key)}
                    className={`p-2 rounded-lg text-sm flex items-center gap-2 ${
                      unavailableReason === reason.key
                        ? "bg-red-500 text-white"
                        : "bg-slate-700 text-slate-400"
                    }`}
                  >
                    <span>{reason.icon}</span>
                    {reason.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="mb-4">
              <label className="text-xs text-slate-400">
                Nota adicional (opcional):
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                placeholder="Detalles..."
                className="w-full bg-slate-700 rounded-lg px-3 py-2 mt-1"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 bg-slate-700 text-slate-400 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => toggleAvailability(selectedService, false)}
                disabled={submitting}
                className="flex-1 py-3 bg-red-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                {submitting ? "..." : "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
