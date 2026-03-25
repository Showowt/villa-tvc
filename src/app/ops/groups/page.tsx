"use client";

import { useState, useCallback, useEffect } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { LanguageProvider, useLanguage } from "@/lib/i18n/context";

// ═══════════════════════════════════════════════════════════════
// TVC GRUPOS / VILLAGE TAKEOVER
// Issue #71 — 42 huéspedes, todas las 10 villas
// Gestión completa de reservas de grupo
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface VillaAssignment {
  villa_id: string;
  villa_name: string;
  guest_count: number;
  guest_names: string[];
}

interface GroupBooking {
  id: string;
  name: string;
  coordinator_name: string;
  coordinator_phone: string | null;
  coordinator_email: string | null;
  check_in: string;
  check_out: string;
  total_guests: number;
  villa_ids: string[];
  villas: VillaAssignment[];
  status: "tentative" | "confirmed" | "active" | "completed" | "cancelled";
  shared_itinerary: Record<string, unknown> | null;
  special_requests: string | null;
  notes: string | null;
  deposit_amount: number;
  deposit_paid: boolean;
  total_amount: number;
  is_village_takeover: boolean;
  shared_dining: boolean;
  single_invoice: boolean;
  dietary_restrictions: string[] | null;
  created_at: string;
  updated_at: string;
}

interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

// Villas disponibles (coincide con property-map)
const VILLAS = [
  { id: "villa_1", name: "Teresa", maxGuests: 4 },
  { id: "villa_2", name: "Aduana", maxGuests: 4 },
  { id: "villa_3", name: "Trinidad", maxGuests: 4 },
  { id: "villa_4", name: "Paz", maxGuests: 4 },
  { id: "villa_5", name: "San Pedro", maxGuests: 5 },
  { id: "villa_6", name: "San Diego", maxGuests: 4 },
  { id: "villa_7", name: "Coche", maxGuests: 4 },
  { id: "villa_8", name: "Pozo", maxGuests: 5 },
  { id: "villa_9", name: "Santo Domingo", maxGuests: 4 },
  { id: "villa_10", name: "Merced", maxGuests: 4 },
];

const MAX_PROPERTY_CAPACITY = VILLAS.reduce((sum, v) => sum + v.maxGuests, 0);

const STATUS_CONFIG = {
  tentative: {
    label: "Tentativa",
    labelEn: "Tentative",
    color: "#F59E0B",
    icon: "⏳",
  },
  confirmed: {
    label: "Confirmada",
    labelEn: "Confirmed",
    color: "#3B82F6",
    icon: "✓",
  },
  active: { label: "Activa", labelEn: "Active", color: "#10B981", icon: "🟢" },
  completed: {
    label: "Completada",
    labelEn: "Completed",
    color: "#6B7280",
    icon: "✔️",
  },
  cancelled: {
    label: "Cancelada",
    labelEn: "Cancelled",
    color: "#EF4444",
    icon: "✗",
  },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTES DE UI
// ═══════════════════════════════════════════════════════════════

const Badge = ({
  children,
  color,
}: {
  children: React.ReactNode;
  color: string;
}) => (
  <span
    style={{
      background: `${color}20`,
      color,
      padding: "3px 10px",
      borderRadius: 12,
      fontSize: 11,
      fontWeight: 700,
      display: "inline-flex",
      alignItems: "center",
      gap: 4,
    }}
  >
    {children}
  </span>
);

const ActionBtn = ({
  children,
  color = "#0066CC",
  onClick,
  disabled,
  size = "normal",
}: {
  children: React.ReactNode;
  color?: string;
  onClick: () => void;
  disabled?: boolean;
  size?: "small" | "normal";
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: size === "small" ? "6px 10px" : "10px 16px",
      borderRadius: 8,
      border: `1px solid ${color}30`,
      background: disabled ? "#F1F5F9" : `${color}08`,
      color: disabled ? "#999" : color,
      fontSize: size === "small" ? 11 : 13,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: 6,
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit",
    }}
  >
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

function GroupsPageContent() {
  const { t } = useLanguage();
  const [groups, setGroups] = useState<GroupBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState<GroupBooking | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignVillasModal, setShowAssignVillasModal] = useState(false);
  const [filter, setFilter] = useState<string>("all");
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Form state para crear/editar grupo
  const [form, setForm] = useState({
    name: "",
    coordinator_name: "",
    coordinator_phone: "",
    coordinator_email: "",
    check_in: "",
    check_out: "",
    total_guests: 0,
    special_requests: "",
    is_village_takeover: false,
    shared_dining: true,
    single_invoice: true,
    deposit_amount: 0,
    total_amount: 0,
  });

  // Villa assignments para el modal
  const [villaAssignments, setVillaAssignments] = useState<
    Record<
      string,
      { selected: boolean; guest_count: number; guest_names: string }
    >
  >({});

  // Toast handler
  const showToast = (message: string, type: Toast["type"] = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000,
    );
  };

  // Cargar grupos
  const loadGroups = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    try {
      const { data, error } = await supabase
        .from("group_bookings")
        .select("*")
        .order("check_in", { ascending: true });

      if (error) throw error;
      setGroups(data || []);
    } catch (err) {
      console.error("[Groups] Error cargando grupos:", err);
      showToast("Error cargando grupos", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGroups();
  }, [loadGroups]);

  // Crear nuevo grupo
  const handleCreateGroup = async () => {
    if (
      !form.name.trim() ||
      !form.coordinator_name.trim() ||
      !form.check_in ||
      !form.check_out
    ) {
      showToast("Completa todos los campos requeridos", "error");
      return;
    }

    if (new Date(form.check_out) <= new Date(form.check_in)) {
      showToast("Check-out debe ser después de check-in", "error");
      return;
    }

    const supabase = createBrowserClient() as SupabaseAny;
    try {
      const { data, error } = await supabase
        .from("group_bookings")
        .insert({
          name: form.name,
          coordinator_name: form.coordinator_name,
          coordinator_phone: form.coordinator_phone || null,
          coordinator_email: form.coordinator_email || null,
          check_in: form.check_in,
          check_out: form.check_out,
          total_guests: form.total_guests,
          special_requests: form.special_requests || null,
          is_village_takeover: form.is_village_takeover,
          shared_dining: form.shared_dining,
          single_invoice: form.single_invoice,
          deposit_amount: form.deposit_amount,
          total_amount: form.total_amount,
          villa_ids: [],
          villas: [],
          status: "tentative",
        })
        .select()
        .single();

      if (error) throw error;

      showToast(`Grupo "${form.name}" creado exitosamente`);
      setShowCreateModal(false);
      resetForm();
      loadGroups();

      // Auto-seleccionar el nuevo grupo
      if (data) setSelectedGroup(data);
    } catch (err) {
      console.error("[Groups] Error creando grupo:", err);
      showToast("Error creando grupo", "error");
    }
  };

  // Resetear formulario
  const resetForm = () => {
    setForm({
      name: "",
      coordinator_name: "",
      coordinator_phone: "",
      coordinator_email: "",
      check_in: "",
      check_out: "",
      total_guests: 0,
      special_requests: "",
      is_village_takeover: false,
      shared_dining: true,
      single_invoice: true,
      deposit_amount: 0,
      total_amount: 0,
    });
  };

  // Abrir modal de asignación de villas
  const openVillaAssignmentModal = (group: GroupBooking) => {
    const assignments: Record<
      string,
      { selected: boolean; guest_count: number; guest_names: string }
    > = {};

    // Inicializar con selecciones existentes
    VILLAS.forEach((villa) => {
      const existing = group.villas?.find((v) => v.villa_id === villa.id);
      assignments[villa.id] = {
        selected: group.villa_ids?.includes(villa.id) || !!existing,
        guest_count: existing?.guest_count || 0,
        guest_names: existing?.guest_names?.join(", ") || "",
      };
    });

    setVillaAssignments(assignments);
    setSelectedGroup(group);
    setShowAssignVillasModal(true);
  };

  // Guardar asignaciones de villas
  const handleSaveVillaAssignments = async () => {
    if (!selectedGroup) return;

    const selectedVillaIds: string[] = [];
    const villasData: VillaAssignment[] = [];
    let totalAssignedGuests = 0;

    Object.entries(villaAssignments).forEach(([villaId, assignment]) => {
      if (assignment.selected) {
        selectedVillaIds.push(villaId);
        const villa = VILLAS.find((v) => v.id === villaId);
        const guestNames = assignment.guest_names
          .split(",")
          .map((n) => n.trim())
          .filter(Boolean);

        villasData.push({
          villa_id: villaId,
          villa_name: villa?.name || "",
          guest_count: assignment.guest_count,
          guest_names: guestNames,
        });
        totalAssignedGuests += assignment.guest_count;
      }
    });

    const isVillageTakeover = selectedVillaIds.length === 10;

    const supabase = createBrowserClient() as SupabaseAny;
    try {
      const { error } = await supabase
        .from("group_bookings")
        .update({
          villa_ids: selectedVillaIds,
          villas: villasData,
          total_guests: totalAssignedGuests,
          is_village_takeover: isVillageTakeover,
        })
        .eq("id", selectedGroup.id);

      if (error) throw error;

      showToast(
        isVillageTakeover
          ? "Village Takeover activado - Todas las villas asignadas"
          : `${selectedVillaIds.length} villas asignadas al grupo`,
      );
      setShowAssignVillasModal(false);
      loadGroups();
    } catch (err) {
      console.error("[Groups] Error asignando villas:", err);
      showToast("Error asignando villas", "error");
    }
  };

  // Cambiar estado del grupo
  const handleStatusChange = async (
    group: GroupBooking,
    newStatus: GroupBooking["status"],
  ) => {
    const supabase = createBrowserClient() as SupabaseAny;
    try {
      const { error } = await supabase
        .from("group_bookings")
        .update({ status: newStatus })
        .eq("id", group.id);

      if (error) throw error;

      showToast(`Estado cambiado a ${STATUS_CONFIG[newStatus].label}`);
      loadGroups();
    } catch (err) {
      console.error("[Groups] Error cambiando estado:", err);
      showToast("Error cambiando estado", "error");
    }
  };

  // Marcar depósito como pagado
  const handleToggleDeposit = async (group: GroupBooking) => {
    const supabase = createBrowserClient() as SupabaseAny;
    try {
      const { error } = await supabase
        .from("group_bookings")
        .update({ deposit_paid: !group.deposit_paid })
        .eq("id", group.id);

      if (error) throw error;

      showToast(
        group.deposit_paid
          ? "Depósito marcado como pendiente"
          : "Depósito confirmado",
      );
      loadGroups();
    } catch (err) {
      console.error("[Groups] Error actualizando depósito:", err);
      showToast("Error actualizando depósito", "error");
    }
  };

  // Check-in/out de grupo completo
  const handleGroupCheckIn = async (group: GroupBooking) => {
    const supabase = createBrowserClient() as SupabaseAny;
    try {
      // Actualizar estado del grupo
      await supabase
        .from("group_bookings")
        .update({ status: "active" })
        .eq("id", group.id);

      // Actualizar estado de todas las villas del grupo
      for (const villaId of group.villa_ids || []) {
        await supabase
          .from("villa_status")
          .update({ status: "occupied" })
          .eq("villa_id", villaId);
      }

      showToast(`Check-in completado para grupo "${group.name}"`);
      loadGroups();
    } catch (err) {
      console.error("[Groups] Error en check-in:", err);
      showToast("Error en check-in de grupo", "error");
    }
  };

  const handleGroupCheckOut = async (group: GroupBooking) => {
    const supabase = createBrowserClient() as SupabaseAny;
    try {
      // Actualizar estado del grupo
      await supabase
        .from("group_bookings")
        .update({ status: "completed" })
        .eq("id", group.id);

      // Marcar todas las villas para limpieza
      for (const villaId of group.villa_ids || []) {
        await supabase
          .from("villa_status")
          .update({ status: "cleaning", cleaning_status: "dirty" })
          .eq("villa_id", villaId);
      }

      showToast(
        `Check-out completado para grupo "${group.name}" — ${group.villa_ids?.length || 0} villas marcadas para limpieza`,
      );
      loadGroups();
    } catch (err) {
      console.error("[Groups] Error en check-out:", err);
      showToast("Error en check-out de grupo", "error");
    }
  };

  // Filtrar grupos
  const filteredGroups =
    filter === "all" ? groups : groups.filter((g) => g.status === filter);

  // Calcular noches
  const calculateNights = (checkIn: string, checkOut: string) => {
    const diff = new Date(checkOut).getTime() - new Date(checkIn).getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  // Seleccionar todas las villas
  const selectAllVillas = () => {
    const newAssignments = { ...villaAssignments };
    VILLAS.forEach((villa) => {
      newAssignments[villa.id] = {
        ...newAssignments[villa.id],
        selected: true,
        guest_count: newAssignments[villa.id]?.guest_count || villa.maxGuests,
      };
    });
    setVillaAssignments(newAssignments);
  };

  // Deseleccionar todas las villas
  const deselectAllVillas = () => {
    const newAssignments = { ...villaAssignments };
    VILLAS.forEach((villa) => {
      newAssignments[villa.id] = {
        selected: false,
        guest_count: 0,
        guest_names: "",
      };
    });
    setVillaAssignments(newAssignments);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid #E2E8F0",
              borderTopColor: "#00B4FF",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <div style={{ color: "#64748B", fontWeight: 600 }}>
            Cargando grupos...
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans', -apple-system, sans-serif" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .modal { background: white; border-radius: 16px; padding: 24px; max-width: 600px; width: 95%; max-height: 85vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        input, select, textarea { padding: 10px 14px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; width: 100%; font-family: inherit; outline: none; }
        input:focus, textarea:focus, select:focus { border-color: #00B4FF; box-shadow: 0 0 0 2px rgba(0,180,255,0.15); }
        .villa-card { transition: all 0.15s; }
        .villa-card:hover { transform: translateY(-2px); }
      `}</style>

      {/* ═══════ HEADER ═══════ */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div>
            <h1
              style={{
                fontSize: 24,
                fontWeight: 900,
                color: "#0A0A0F",
                margin: 0,
              }}
            >
              Grupos & Village Takeover
            </h1>
            <p style={{ color: "#64748B", fontSize: 13, marginTop: 4 }}>
              Gestión de reservas de grupo — Capacidad máxima:{" "}
              {MAX_PROPERTY_CAPACITY} huéspedes en 10 villas
            </p>
          </div>
          <ActionBtn color="#10B981" onClick={() => setShowCreateModal(true)}>
            + Nuevo Grupo
          </ActionBtn>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 12,
            marginTop: 20,
          }}
        >
          {[
            {
              label: "Grupos Activos",
              value: groups.filter((g) => g.status === "active").length,
              color: "#10B981",
            },
            {
              label: "Confirmados",
              value: groups.filter((g) => g.status === "confirmed").length,
              color: "#3B82F6",
            },
            {
              label: "Tentativos",
              value: groups.filter((g) => g.status === "tentative").length,
              color: "#F59E0B",
            },
            {
              label: "Village Takeovers",
              value: groups.filter((g) => g.is_village_takeover).length,
              color: "#8B5CF6",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              style={{
                background: "white",
                padding: 16,
                borderRadius: 12,
                border: "1px solid #E2E8F0",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 900, color: stat.color }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 600 }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ═══════ FILTROS ═══════ */}
      <div
        style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}
      >
        {[
          { key: "all", label: "Todos" },
          { key: "tentative", label: "Tentativos" },
          { key: "confirmed", label: "Confirmados" },
          { key: "active", label: "Activos" },
          { key: "completed", label: "Completados" },
          { key: "cancelled", label: "Cancelados" },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "inherit",
              background: filter === f.key ? "#0A0A0F" : "#F1F5F9",
              color: filter === f.key ? "white" : "#64748B",
            }}
          >
            {f.label}{" "}
            {f.key !== "all" &&
              `(${groups.filter((g) => g.status === f.key).length})`}
          </button>
        ))}
      </div>

      {/* ═══════ LISTA DE GRUPOS ═══════ */}
      {filteredGroups.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: 60,
            background: "white",
            borderRadius: 12,
            border: "1px solid #E2E8F0",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 12 }}>👥</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0A0A0F" }}>
            No hay grupos
          </div>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
            Crea un nuevo grupo para empezar a gestionar reservas de grupo
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredGroups.map((group) => {
            const statusConfig = STATUS_CONFIG[group.status];
            const nights = calculateNights(group.check_in, group.check_out);
            const villaCount = group.villa_ids?.length || 0;

            return (
              <div
                key={group.id}
                className="villa-card"
                style={{
                  background: "white",
                  borderRadius: 12,
                  border: `2px solid ${group.is_village_takeover ? "#8B5CF6" : "#E2E8F0"}`,
                  padding: 20,
                  boxShadow: group.is_village_takeover
                    ? "0 4px 20px rgba(139,92,246,0.15)"
                    : "none",
                }}
              >
                {/* Header del grupo */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 12,
                  }}
                >
                  <div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <h3
                        style={{
                          fontSize: 18,
                          fontWeight: 800,
                          color: "#0A0A0F",
                          margin: 0,
                        }}
                      >
                        {group.name}
                      </h3>
                      {group.is_village_takeover && (
                        <Badge color="#8B5CF6">🏝️ Village Takeover</Badge>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "#64748B" }}>
                      Coordinador: <strong>{group.coordinator_name}</strong>
                      {group.coordinator_phone &&
                        ` • ${group.coordinator_phone}`}
                    </div>
                  </div>
                  <Badge color={statusConfig.color}>
                    {statusConfig.icon} {statusConfig.label}
                  </Badge>
                </div>

                {/* Información del grupo */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                    gap: 16,
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 10, color: "#999", fontWeight: 600 }}
                    >
                      📅 FECHAS
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>
                      {new Date(group.check_in).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                      })}{" "}
                      →{" "}
                      {new Date(group.check_out).toLocaleDateString("es-CO", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>
                      {nights} noches
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 10, color: "#999", fontWeight: 600 }}
                    >
                      👥 HUÉSPEDES
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: "#0A0A0F",
                      }}
                    >
                      {group.total_guests}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 10, color: "#999", fontWeight: 600 }}
                    >
                      🏠 VILLAS
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 900,
                        color: villaCount === 10 ? "#8B5CF6" : "#0A0A0F",
                      }}
                    >
                      {villaCount}/10
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 10, color: "#999", fontWeight: 600 }}
                    >
                      💰 DEPÓSITO
                    </div>
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700 }}>
                        ${group.deposit_amount?.toLocaleString() || 0}
                      </span>
                      <Badge color={group.deposit_paid ? "#10B981" : "#F59E0B"}>
                        {group.deposit_paid ? "Pagado" : "Pendiente"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Villas asignadas */}
                {villaCount > 0 && (
                  <div style={{ marginBottom: 16 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "#999",
                        fontWeight: 600,
                        marginBottom: 6,
                      }}
                    >
                      VILLAS ASIGNADAS
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      {group.villas?.map((villa) => (
                        <div
                          key={villa.villa_id}
                          style={{
                            background: "#F1F5F9",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 600,
                          }}
                        >
                          {villa.villa_name} ({villa.guest_count}👥)
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Opciones del grupo */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    flexWrap: "wrap",
                    marginBottom: 16,
                  }}
                >
                  {group.shared_dining && (
                    <Badge color="#0066CC">🍽️ Comidas Compartidas</Badge>
                  )}
                  {group.single_invoice && (
                    <Badge color="#0066CC">📄 Factura Única</Badge>
                  )}
                </div>

                {/* Notas/Solicitudes especiales */}
                {group.special_requests && (
                  <div
                    style={{
                      background: "#FFFBEB",
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 16,
                      fontSize: 12,
                      color: "#92400E",
                    }}
                  >
                    📝 {group.special_requests}
                  </div>
                )}

                {/* Acciones */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <ActionBtn
                    size="small"
                    color="#3B82F6"
                    onClick={() => openVillaAssignmentModal(group)}
                  >
                    🏠 Asignar Villas
                  </ActionBtn>

                  {group.status === "tentative" && (
                    <ActionBtn
                      size="small"
                      color="#10B981"
                      onClick={() => handleStatusChange(group, "confirmed")}
                    >
                      ✓ Confirmar
                    </ActionBtn>
                  )}

                  {group.status === "confirmed" && (
                    <ActionBtn
                      size="small"
                      color="#10B981"
                      onClick={() => handleGroupCheckIn(group)}
                    >
                      🔑 Check-in Grupo
                    </ActionBtn>
                  )}

                  {group.status === "active" && (
                    <ActionBtn
                      size="small"
                      color="#EF4444"
                      onClick={() => handleGroupCheckOut(group)}
                    >
                      🚪 Check-out Grupo
                    </ActionBtn>
                  )}

                  <ActionBtn
                    size="small"
                    color="#F59E0B"
                    onClick={() => handleToggleDeposit(group)}
                  >
                    💰{" "}
                    {group.deposit_paid
                      ? "Desmarcar Depósito"
                      : "Confirmar Depósito"}
                  </ActionBtn>

                  {group.status === "tentative" && (
                    <ActionBtn
                      size="small"
                      color="#EF4444"
                      onClick={() => handleStatusChange(group, "cancelled")}
                    >
                      ✗ Cancelar
                    </ActionBtn>
                  )}

                  {group.coordinator_phone && (
                    <ActionBtn
                      size="small"
                      color="#25D366"
                      onClick={() =>
                        window.open(
                          `https://wa.me/${group.coordinator_phone?.replace(/[^0-9]/g, "")}`,
                          "_blank",
                        )
                      }
                    >
                      💬 WhatsApp
                    </ActionBtn>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ═══════ MODAL: CREAR GRUPO ═══════ */}
      {showCreateModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>
                Crear Nuevo Grupo
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Nombre del grupo */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#333",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nombre del Grupo *
                </label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: Familia García - Reunión Anual"
                />
              </div>

              {/* Coordinador */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#333",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Nombre del Coordinador *
                </label>
                <input
                  value={form.coordinator_name}
                  onChange={(e) =>
                    setForm({ ...form, coordinator_name: e.target.value })
                  }
                  placeholder="Persona principal de contacto"
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Teléfono
                  </label>
                  <input
                    value={form.coordinator_phone}
                    onChange={(e) =>
                      setForm({ ...form, coordinator_phone: e.target.value })
                    }
                    placeholder="+57 300..."
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Email
                  </label>
                  <input
                    type="email"
                    value={form.coordinator_email}
                    onChange={(e) =>
                      setForm({ ...form, coordinator_email: e.target.value })
                    }
                    placeholder="email@ejemplo.com"
                  />
                </div>
              </div>

              {/* Fechas */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Check-in *
                  </label>
                  <input
                    type="date"
                    value={form.check_in}
                    onChange={(e) =>
                      setForm({ ...form, check_in: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Check-out *
                  </label>
                  <input
                    type="date"
                    value={form.check_out}
                    onChange={(e) =>
                      setForm({ ...form, check_out: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Huéspedes y Financiero */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: 12,
                }}
              >
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Total Huéspedes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={MAX_PROPERTY_CAPACITY}
                    value={form.total_guests}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        total_guests: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Depósito ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.deposit_amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        deposit_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: "#333",
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    Total ($)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.total_amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        total_amount: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>

              {/* Opciones */}
              <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.is_village_takeover}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        is_village_takeover: e.target.checked,
                      })
                    }
                  />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    🏝️ Village Takeover (10 villas)
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.shared_dining}
                    onChange={(e) =>
                      setForm({ ...form, shared_dining: e.target.checked })
                    }
                  />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    🍽️ Comidas Compartidas
                  </span>
                </label>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.single_invoice}
                    onChange={(e) =>
                      setForm({ ...form, single_invoice: e.target.checked })
                    }
                  />
                  <span style={{ fontSize: 12, fontWeight: 600 }}>
                    📄 Factura Única
                  </span>
                </label>
              </div>

              {/* Solicitudes especiales */}
              <div>
                <label
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#333",
                    display: "block",
                    marginBottom: 4,
                  }}
                >
                  Solicitudes Especiales
                </label>
                <textarea
                  rows={3}
                  value={form.special_requests}
                  onChange={(e) =>
                    setForm({ ...form, special_requests: e.target.value })
                  }
                  placeholder="Restricciones dietéticas, eventos especiales, preferencias..."
                />
              </div>

              {/* Botón crear */}
              <button
                onClick={handleCreateGroup}
                disabled={
                  !form.name.trim() ||
                  !form.coordinator_name.trim() ||
                  !form.check_in ||
                  !form.check_out
                }
                style={{
                  padding: 14,
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "#10B981",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  fontFamily: "inherit",
                  opacity:
                    form.name.trim() &&
                    form.coordinator_name.trim() &&
                    form.check_in &&
                    form.check_out
                      ? 1
                      : 0.5,
                }}
              >
                Crear Grupo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ MODAL: ASIGNAR VILLAS ═══════ */}
      {showAssignVillasModal && selectedGroup && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignVillasModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
                  Asignar Villas
                </h2>
                <p
                  style={{ fontSize: 12, color: "#64748B", margin: "4px 0 0" }}
                >
                  {selectedGroup.name} — {selectedGroup.total_guests} huéspedes
                </p>
              </div>
              <button
                onClick={() => setShowAssignVillasModal(false)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  border: "1px solid #E2E8F0",
                  background: "#F8FAFC",
                  cursor: "pointer",
                  fontSize: 18,
                }}
              >
                ×
              </button>
            </div>

            {/* Quick actions */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              <ActionBtn size="small" color="#8B5CF6" onClick={selectAllVillas}>
                🏝️ Seleccionar Todas (Village Takeover)
              </ActionBtn>
              <ActionBtn
                size="small"
                color="#64748B"
                onClick={deselectAllVillas}
              >
                Limpiar Selección
              </ActionBtn>
            </div>

            {/* Resumen */}
            <div
              style={{
                background: "#F8FAFC",
                padding: 12,
                borderRadius: 8,
                marginBottom: 16,
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: 13,
                }}
              >
                <span>
                  Villas seleccionadas:{" "}
                  <strong>
                    {
                      Object.values(villaAssignments).filter((a) => a.selected)
                        .length
                    }
                    /10
                  </strong>
                </span>
                <span>
                  Huéspedes asignados:{" "}
                  <strong>
                    {Object.values(villaAssignments).reduce(
                      (sum, a) => sum + (a.selected ? a.guest_count : 0),
                      0,
                    )}
                  </strong>
                </span>
              </div>
            </div>

            {/* Lista de villas */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                maxHeight: "40vh",
                overflowY: "auto",
              }}
            >
              {VILLAS.map((villa) => {
                const assignment = villaAssignments[villa.id] || {
                  selected: false,
                  guest_count: 0,
                  guest_names: "",
                };

                return (
                  <div
                    key={villa.id}
                    style={{
                      border: `2px solid ${assignment.selected ? "#10B981" : "#E2E8F0"}`,
                      borderRadius: 10,
                      padding: 12,
                      background: assignment.selected ? "#ECFDF5" : "white",
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 12 }}
                    >
                      <input
                        type="checkbox"
                        checked={assignment.selected}
                        onChange={(e) => {
                          setVillaAssignments({
                            ...villaAssignments,
                            [villa.id]: {
                              ...assignment,
                              selected: e.target.checked,
                              guest_count: e.target.checked
                                ? villa.maxGuests
                                : 0,
                            },
                          });
                        }}
                        style={{ width: 18, height: 18 }}
                      />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>
                          {villa.name}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          Max {villa.maxGuests} huéspedes
                        </div>
                      </div>

                      {assignment.selected && (
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <input
                            type="number"
                            min={1}
                            max={villa.maxGuests}
                            value={assignment.guest_count}
                            onChange={(e) => {
                              setVillaAssignments({
                                ...villaAssignments,
                                [villa.id]: {
                                  ...assignment,
                                  guest_count: Math.min(
                                    villa.maxGuests,
                                    parseInt(e.target.value) || 0,
                                  ),
                                },
                              });
                            }}
                            style={{ width: 60, textAlign: "center" }}
                          />
                          <span style={{ fontSize: 12, color: "#64748B" }}>
                            👥
                          </span>
                        </div>
                      )}
                    </div>

                    {assignment.selected && (
                      <div style={{ marginTop: 8 }}>
                        <input
                          placeholder="Nombres de huéspedes (separados por coma)"
                          value={assignment.guest_names}
                          onChange={(e) => {
                            setVillaAssignments({
                              ...villaAssignments,
                              [villa.id]: {
                                ...assignment,
                                guest_names: e.target.value,
                              },
                            });
                          }}
                          style={{ fontSize: 12 }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Botón guardar */}
            <button
              onClick={handleSaveVillaAssignments}
              style={{
                width: "100%",
                padding: 14,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                background: "#10B981",
                color: "white",
                fontWeight: 800,
                fontSize: 14,
                fontFamily: "inherit",
                marginTop: 16,
              }}
            >
              Guardar Asignaciones
            </button>
          </div>
        </div>
      )}

      {/* ═══════ TOASTS ═══════ */}
      <div
        style={{
          position: "fixed",
          top: 80,
          right: 20,
          zIndex: 200,
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            style={{
              padding: "12px 16px",
              borderRadius: 10,
              background:
                toast.type === "success"
                  ? "#10B981"
                  : toast.type === "warning"
                    ? "#F59E0B"
                    : "#EF4444",
              color: "white",
              fontSize: 13,
              fontWeight: 600,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
              maxWidth: 320,
              animation: "slideIn 0.3s ease",
            }}
          >
            {toast.type === "success" && "✓ "}
            {toast.type === "warning" && "⚠️ "}
            {toast.type === "error" && "✗ "}
            {toast.message}
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// Export con provider de idioma
export default function GroupsPage() {
  return (
    <LanguageProvider>
      <GroupsPageContent />
    </LanguageProvider>
  );
}
