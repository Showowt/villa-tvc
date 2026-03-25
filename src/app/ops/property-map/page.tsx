"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import { useRealtimeVillaStatus } from "@/hooks";
import { useRealtimeChecklists as useRealtimeChecklistsEnhanced } from "@/hooks/useRealtimeVillas";
import {
  validateOverbooking,
  validateVillaAvailability,
  ERROR_MESSAGES,
  type VillaStatusType,
} from "@/lib/validation";
import {
  FloatingConnectionStatus,
  InlineConnectionStatus,
} from "@/components/ui/ConnectionStatus";
import type { Database } from "@/types/database";

// ═══════════════════════════════════════════════════════════════
// TVC PROPERTY MAP — COMPLETE OPERATIONS INTERFACE
// Villa colors from architectural blueprint (D. Arqui Restauro S.A.S)
// Full guest management, status toggling, workflows
// Issue #40 — OVERBOOKING PROTECTION added
// Issue #81 — REALTIME updates integrated with connection status
// ═══════════════════════════════════════════════════════════════

type Checklist = Database["public"]["Tables"]["checklists"]["Row"];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// Toast notification state
interface Toast {
  id: number;
  message: string;
  type: "success" | "error" | "warning";
}

interface Villa {
  id: string;
  name: string;
  type: string;
  zone: string;
  maxGuests: number;
  beds: string;
  sofa: boolean;
  color: string;
  x: number;
  y: number;
  accessible: boolean;
}

interface Guest {
  name: string;
  guests: number;
  checkIn: string;
  checkOut: string;
  nights: number;
  phone: string;
  allergies: string[];
  vip: boolean;
  notes: string;
}

interface VillaState {
  status:
    | "occupied"
    | "vacant"
    | "arriving"
    | "cleaning"
    | "checkout"
    | "maintenance";
  cleaningState: "pending" | "in_progress" | "submitted" | "approved";
  guest: Guest | null;
  maintenanceNotes: string;
  maintenanceUrgent: boolean;
  currentTab: number; // Issue #18: Cuenta corriente / Running tab
}

interface Facility {
  id: string;
  name: string;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
}

// Villa data from architectural blueprint — colors match the ACTUAL labels
const VILLAS: Villa[] = [
  {
    id: "teresa",
    name: "Teresa",
    type: "Bungalow Tipo B",
    zone: "NORTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#2E8B57",
    x: 26,
    y: 22,
    accessible: false,
  },
  {
    id: "aduana",
    name: "Aduana",
    type: "Bungalow Tipo A",
    zone: "NORTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#DAA520",
    x: 40,
    y: 18,
    accessible: false,
  },
  {
    id: "trinidad",
    name: "Trinidad",
    type: "Bungalow Tipo B",
    zone: "NORTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#E85D3A",
    x: 54,
    y: 15,
    accessible: false,
  },
  {
    id: "paz",
    name: "Paz",
    type: "Bungalow Tipo A",
    zone: "EAST",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#E878A0",
    x: 68,
    y: 24,
    accessible: false,
  },
  {
    id: "sanpedro",
    name: "San Pedro",
    type: "Bungalow Tipo A",
    zone: "EAST",
    maxGuests: 5,
    beds: "2 dobles",
    sofa: true,
    color: "#C040A0",
    x: 78,
    y: 32,
    accessible: false,
  },
  {
    id: "sandiego",
    name: "San Diego",
    type: "Bungalow Tipo B",
    zone: "EAST",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#E8A0C0",
    x: 82,
    y: 45,
    accessible: false,
  },
  {
    id: "pozo",
    name: "Pozo",
    type: "Bungalow Tipo A",
    zone: "WEST",
    maxGuests: 5,
    beds: "2 dobles",
    sofa: true,
    color: "#00BCD4",
    x: 22,
    y: 40,
    accessible: false,
  },
  {
    id: "santodomingo",
    name: "Santo Domingo",
    type: "Bungalow Tipo B",
    zone: "SOUTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#D32F2F",
    x: 30,
    y: 55,
    accessible: false,
  },
  {
    id: "merced",
    name: "Merced",
    type: "Bungalow Tipo C",
    zone: "SOUTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#D32F2F",
    x: 24,
    y: 68,
    accessible: false,
  },
  {
    id: "coche",
    name: "Coche",
    type: "Bungalow Accesible",
    zone: "SOUTH",
    maxGuests: 4,
    beds: "2 dobles",
    sofa: false,
    color: "#1565C0",
    x: 72,
    y: 62,
    accessible: true,
  },
];

const FACILITIES: Facility[] = [
  {
    id: "muelle",
    name: "MUELLE",
    label: "Dock",
    x: 38,
    y: 4,
    w: 14,
    h: 5,
    color: "#5D4E37",
  },
  {
    id: "restaurante",
    name: "RESTAURANTE",
    label: "& Bar",
    x: 36,
    y: 42,
    w: 16,
    h: 10,
    color: "#37474F",
  },
  {
    id: "piscina",
    name: "PISCINA",
    label: "",
    x: 55,
    y: 42,
    w: 12,
    h: 8,
    color: "#0097A7",
  },
  {
    id: "recepcion",
    name: "RECEPCIÓN",
    label: "",
    x: 36,
    y: 52,
    w: 8,
    h: 4,
    color: "#546E7A",
  },
  {
    id: "terraza",
    name: "TERRAZA",
    label: "",
    x: 44,
    y: 52,
    w: 8,
    h: 4,
    color: "#546E7A",
  },
  {
    id: "admin",
    name: "ADMIN",
    label: "& Taller",
    x: 34,
    y: 58,
    w: 8,
    h: 5,
    color: "#5D4E37",
  },
  {
    id: "kiosco",
    name: "KIOSCO",
    label: "",
    x: 56,
    y: 58,
    w: 8,
    h: 5,
    color: "#5D4E37",
  },
  {
    id: "banos",
    name: "BAÑOS",
    label: "",
    x: 50,
    y: 58,
    w: 6,
    h: 4,
    color: "#546E7A",
  },
];

const STATUS_CONFIG = {
  occupied: {
    label: "Ocupada",
    labelEn: "Occupied",
    color: "#10B981",
    icon: "🟢",
    bg: "#ECFDF5",
  },
  vacant: {
    label: "Vacía",
    labelEn: "Vacant",
    color: "#9CA3AF",
    icon: "⚪",
    bg: "#F9FAFB",
  },
  arriving: {
    label: "Llegada Hoy",
    labelEn: "Arriving",
    color: "#3B82F6",
    icon: "🔵",
    bg: "#EFF6FF",
  },
  cleaning: {
    label: "Limpieza",
    labelEn: "Cleaning",
    color: "#F59E0B",
    icon: "🟡",
    bg: "#FFFBEB",
  },
  checkout: {
    label: "Salida Hoy",
    labelEn: "Checkout",
    color: "#EF4444",
    icon: "🔴",
    bg: "#FEF2F2",
  },
  maintenance: {
    label: "Mantenimiento",
    labelEn: "Maintenance",
    color: "#8B5CF6",
    icon: "🟣",
    bg: "#F5F3FF",
  },
};

const CLEANING_STATES = {
  pending: { label: "Pendiente", color: "#EF4444" },
  in_progress: { label: "En Proceso", color: "#F59E0B" },
  submitted: { label: "Enviada — Esperando Aprobación", color: "#3B82F6" },
  approved: { label: "Lista para Huésped", color: "#10B981" },
};

// Badge component
const Badge = ({
  children,
  color,
  small,
}: {
  children: React.ReactNode;
  color: string;
  small?: boolean;
}) => (
  <span
    style={{
      background: `${color}20`,
      color,
      padding: small ? "1px 6px" : "2px 10px",
      borderRadius: 12,
      fontSize: small ? 9 : 10,
      fontWeight: 700,
      letterSpacing: 0.3,
      display: "inline-flex",
      alignItems: "center",
      gap: 3,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </span>
);

// Action button component
const ActionBtn = ({
  children,
  color = "#0066CC",
  onClick,
  disabled,
}: {
  children: React.ReactNode;
  color?: string;
  onClick: () => void;
  disabled?: boolean;
}) => (
  <button
    onClick={onClick}
    disabled={disabled}
    style={{
      padding: "8px 14px",
      borderRadius: 8,
      border: `1px solid ${color}30`,
      background: disabled ? "#F1F5F9" : `${color}08`,
      color: disabled ? "#999" : color,
      fontSize: 12,
      fontWeight: 700,
      cursor: disabled ? "not-allowed" : "pointer",
      transition: "all 0.15s",
      display: "flex",
      alignItems: "center",
      gap: 4,
      width: "100%",
      opacity: disabled ? 0.5 : 1,
      fontFamily: "inherit",
    }}
  >
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function TVCPropertyMap() {
  const router = useRouter();
  const [villaStates, setVillaStates] = useState<{ [key: string]: VillaState }>(
    {},
  );
  const [selectedVilla, setSelectedVilla] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    guests: 1,
    checkIn: "",
    checkOut: "",
    phone: "",
    allergies: "",
    vip: false,
    notes: "",
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // ═══════════════════════════════════════════════════════════════
  // REALTIME CHECKLIST SUBSCRIPTION (Issue #81)
  // Auto-updates villa status when cleaning is approved
  // ═══════════════════════════════════════════════════════════════
  const {
    checklists: realtimeChecklists,
    summary: checklistSummary,
    connectionStatus,
    isConnected,
  } = useRealtimeChecklistsEnhanced({
    onApproval: (checklist: Checklist) => {
      console.log(
        "[PropertyMap] Checklist approved, updating villa:",
        checklist.villa_id,
      );
      showToast(`✓ Limpieza aprobada para ${checklist.villa_id}`, "success");
      // Trigger reload to update villa status
      loadData();
      setLastUpdate(new Date());
    },
    onRejection: (checklist: Checklist) => {
      console.log("[PropertyMap] Checklist rejected:", checklist.villa_id);
      showToast(`✗ Limpieza rechazada para ${checklist.villa_id}`, "warning");
      loadData();
      setLastUpdate(new Date());
    },
    onUpdate: () => {
      // Any checklist change triggers a refresh
      setLastUpdate(new Date());
    },
  });

  // Load data from Supabase
  const loadData = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    const today = new Date().toISOString().split("T")[0];

    // Initialize all villas with default state
    const newStates: { [key: string]: VillaState } = {};
    VILLAS.forEach((v) => {
      newStates[v.id] = {
        status: "vacant",
        cleaningState: "approved",
        guest: null,
        maintenanceNotes: "",
        maintenanceUrgent: false,
        currentTab: 0, // Issue #18: Running tab
      };
    });

    try {
      // Fetch villa statuses
      const { data: statusData } = await supabase
        .from("villa_status")
        .select("*");
      const { data: bookingData } = await supabase
        .from("villa_bookings")
        .select("*")
        .in("status", ["confirmed", "checked_in"])
        .lte("check_in", today)
        .gte("check_out", today);

      // Map DB villa IDs to our component IDs
      const dbIdToId: { [key: string]: string } = {
        villa_1: "teresa",
        villa_2: "aduana",
        villa_3: "trinidad",
        villa_4: "paz",
        villa_5: "sanpedro",
        villa_6: "sandiego",
        villa_7: "coche",
        villa_8: "pozo",
        villa_9: "santodomingo",
        villa_10: "merced",
      };

      if (statusData) {
        statusData.forEach(
          (s: {
            villa_id: string;
            status: string;
            cleaning_status: string;
            maintenance_status: string;
            maintenance_notes?: string;
          }) => {
            const villaId = dbIdToId[s.villa_id];
            if (villaId && newStates[villaId]) {
              if (s.status === "occupied")
                newStates[villaId].status = "occupied";
              else if (s.status === "cleaning")
                newStates[villaId].status = "cleaning";
              else if (s.status === "maintenance") {
                newStates[villaId].status = "maintenance";
                newStates[villaId].maintenanceNotes = s.maintenance_notes || "";
              }

              if (s.cleaning_status === "dirty")
                newStates[villaId].cleaningState = "pending";
              else if (s.cleaning_status === "in_progress")
                newStates[villaId].cleaningState = "in_progress";
              else if (s.cleaning_status === "inspected")
                newStates[villaId].cleaningState = "submitted";
              else newStates[villaId].cleaningState = "approved";
            }
          },
        );
      }

      if (bookingData) {
        bookingData.forEach(
          (b: {
            villa_id: string;
            guest_name: string;
            num_adults: number;
            num_children: number;
            check_in: string;
            check_out: string;
            status: string;
            vip_level?: string;
            phone?: string;
            allergies?: string[];
            notes?: string;
          }) => {
            const villaId = dbIdToId[b.villa_id];
            if (villaId && newStates[villaId]) {
              const nights = Math.ceil(
                (new Date(b.check_out).getTime() -
                  new Date(b.check_in).getTime()) /
                  86400000,
              );
              newStates[villaId].guest = {
                name: b.guest_name,
                guests: b.num_adults + b.num_children,
                checkIn: b.check_in,
                checkOut: b.check_out,
                nights,
                phone: b.phone || "",
                allergies: b.allergies || [],
                vip: b.vip_level === "vip" || b.vip_level === "vvip",
                notes: b.notes || "",
              };

              const checkInDate = b.check_in.split("T")[0];
              const checkOutDate = b.check_out.split("T")[0];

              if (checkInDate === today && b.status === "confirmed") {
                newStates[villaId].status = "arriving";
              } else if (checkOutDate === today) {
                newStates[villaId].status = "checkout";
              } else if (b.status === "checked_in") {
                newStates[villaId].status = "occupied";
              }
            }
          },
        );
      }

      // Issue #18: Fetch current tab totals for each villa
      const { data: tabData } = await supabase
        .from("order_logs")
        .select("villa_id, total_price")
        .gte("order_date", today)
        .eq("is_staff_meal", false)
        .eq("is_comp", false);

      if (tabData) {
        const tabTotals: { [key: string]: number } = {};
        tabData.forEach(
          (order: { villa_id: string | null; total_price: number | null }) => {
            if (order.villa_id && order.total_price) {
              const villaId = dbIdToId[order.villa_id];
              if (villaId) {
                tabTotals[villaId] =
                  (tabTotals[villaId] || 0) + order.total_price;
              }
            }
          },
        );
        Object.entries(tabTotals).forEach(([villaId, total]) => {
          if (newStates[villaId]) {
            newStates[villaId].currentTab = total;
          }
        });
      }
    } catch (err) {
      console.error("[PropertyMap] Error loading data:", err);
    }

    setVillaStates(newStates);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
    const supabase = createBrowserClient() as SupabaseAny;
    const channel = supabase
      .channel("property-map-updates")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "villa_status" },
        () => loadData(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "villa_bookings" },
        () => loadData(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  const totalGuests = Object.values(villaStates).reduce(
    (s, v) => s + (v.guest?.guests || 0),
    0,
  );
  const occupiedCount = Object.values(villaStates).filter(
    (v) => v.status === "occupied",
  ).length;
  const arrivingCount = Object.values(villaStates).filter(
    (v) => v.status === "arriving",
  ).length;
  const checkoutCount = Object.values(villaStates).filter(
    (v) => v.status === "checkout",
  ).length;
  const cleaningCount = Object.values(villaStates).filter(
    (v) => v.status === "cleaning",
  ).length;
  const maintenanceCount = Object.values(villaStates).filter(
    (v) => v.status === "maintenance",
  ).length;
  const capacity = Math.round((occupiedCount / 10) * 100);

  const sel = selectedVilla
    ? {
        ...VILLAS.find((v) => v.id === selectedVilla)!,
        state: villaStates[selectedVilla],
      }
    : null;

  const updateVilla = (id: string, updates: Partial<VillaState>) => {
    setVillaStates((prev) => ({ ...prev, [id]: { ...prev[id], ...updates } }));
  };

  const handleStatusChange = (id: string, newStatus: VillaState["status"]) => {
    const updates: Partial<VillaState> = { status: newStatus };
    if (newStatus === "vacant") {
      updates.guest = null;
      updates.cleaningState = "pending";
    }
    if (newStatus === "cleaning") {
      updates.cleaningState = "pending";
    }
    if (newStatus === "arriving" || newStatus === "occupied") {
      updates.cleaningState = "approved";
    }
    updateVilla(id, updates);
    setShowStatusModal(false);
  };

  // Toast notification handler
  const [toasts, setToasts] = useState<Toast[]>([]);
  const showToast = (message: string, type: Toast["type"] = "error") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleAssignGuest = () => {
    if (!selectedVilla || !editForm.name.trim()) {
      showToast("El nombre del huésped es requerido", "error");
      return;
    }

    const villa = VILLAS.find((v) => v.id === selectedVilla);
    if (!villa) return;

    const currentState = villaStates[selectedVilla];

    // ═══════════════════════════════════════════════════════════════
    // OVERBOOKING PROTECTION (Issue #40)
    // ═══════════════════════════════════════════════════════════════

    // 1. Validate guest count against villa capacity
    const overbookingCheck = validateOverbooking(
      editForm.guests,
      villa.maxGuests,
    );
    if (!overbookingCheck.valid) {
      showToast(
        overbookingCheck.error || ERROR_MESSAGES.guest_count_exceeded,
        "error",
      );
      return;
    }

    // 2. Validate villa is available (not in maintenance/cleaning)
    const availabilityCheck = validateVillaAvailability(
      currentState.status as VillaStatusType,
      { allowCheckoutToday: false },
    );
    if (!availabilityCheck.available) {
      showToast(availabilityCheck.error || "Villa no disponible", "error");
      return;
    }

    // 3. Warning for checkout today but not yet cleaned
    if (
      currentState.status === "checkout" &&
      currentState.cleaningState !== "approved"
    ) {
      showToast(
        "Advertencia: Esta villa tiene checkout hoy pero aún no ha sido limpiada. Proceda con precaución.",
        "warning",
      );
    }

    // 4. Validate dates
    if (editForm.checkIn && editForm.checkOut) {
      if (new Date(editForm.checkOut) <= new Date(editForm.checkIn)) {
        showToast(
          "La fecha de check-out debe ser posterior al check-in",
          "error",
        );
        return;
      }
    }

    const nights =
      editForm.checkIn && editForm.checkOut
        ? Math.ceil(
            (new Date(editForm.checkOut).getTime() -
              new Date(editForm.checkIn).getTime()) /
              86400000,
          )
        : 1;

    updateVilla(selectedVilla, {
      status: "occupied",
      cleaningState: "approved",
      guest: {
        name: editForm.name,
        guests: editForm.guests,
        checkIn: editForm.checkIn,
        checkOut: editForm.checkOut,
        nights,
        phone: editForm.phone,
        allergies: editForm.allergies
          ? editForm.allergies
              .split(",")
              .map((a) => a.trim())
              .filter(Boolean)
          : [],
        vip: editForm.vip,
        notes: editForm.notes,
      },
    });

    showToast(
      `Huésped ${editForm.name} asignado a Villa ${villa.name}`,
      "success",
    );
    setShowAssignModal(false);
    setEditForm({
      name: "",
      guests: 1,
      checkIn: "",
      checkOut: "",
      phone: "",
      allergies: "",
      vip: false,
      notes: "",
    });
  };

  const handleMoveGuest = (fromId: string, toId: string) => {
    const fromState = villaStates[fromId];
    if (!fromState.guest) return;
    updateVilla(toId, {
      status: "occupied",
      guest: fromState.guest,
      cleaningState: "approved",
    });
    updateVilla(fromId, {
      status: "vacant",
      guest: null,
      cleaningState: "pending",
    });
    setSelectedVilla(toId);
    setShowMoveModal(false);
  };

  const vacantVillas = VILLAS.filter(
    (v) => villaStates[v.id]?.status === "vacant" && v.id !== selectedVilla,
  );
  const filteredVillas =
    filter === "all"
      ? VILLAS
      : VILLAS.filter((v) => villaStates[v.id]?.status === filter);

  const getNightsRemaining = (guest: Guest | null) => {
    if (!guest?.checkOut) return null;
    const diff = Math.ceil(
      (new Date(guest.checkOut).getTime() - new Date().getTime()) / 86400000,
    );
    return Math.max(0, diff);
  };

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
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
            Cargando mapa...
          </div>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: "#F8FAFC",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; }
        .villa-node { transition: filter 0.2s ease; }
        .villa-node:hover { filter: brightness(1.05); }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 100; display: flex; align-items: center; justify-content: center; }
        .modal { background: white; border-radius: 16px; padding: 24px; max-width: 440px; width: 90%; max-height: 80vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
        input, select, textarea { padding: 8px 12px; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 13px; width: 100%; font-family: inherit; outline: none; }
        input:focus, textarea:focus { border-color: #00B4FF; box-shadow: 0 0 0 2px rgba(0,180,255,0.15); }
        .pulse { animation: pulse 2s infinite; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>

      {/* ═══════ TOP BAR ═══════ */}
      <div
        style={{
          background: "white",
          borderBottom: "1px solid #E2E8F0",
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            flex: 1,
            flexWrap: "wrap",
          }}
        >
          {[
            ["👥", "Huéspedes", totalGuests, null],
            [
              "🏠",
              "Ocupadas",
              `${occupiedCount}/10`,
              occupiedCount > 7 ? "#EF4444" : "#10B981",
            ],
            ["✨", "Llegadas", arrivingCount, "#3B82F6"],
            [
              "📊",
              "Capacidad",
              `${capacity}%`,
              capacity > 80 ? "#EF4444" : "#10B981",
            ],
          ].map(([icon, label, value, color]) => (
            <div
              key={String(label)}
              style={{ textAlign: "center", minWidth: 70 }}
            >
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                {icon} {label}
              </div>
              <div
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  color: (color as string) || "#0A0A0F",
                  marginTop: 2,
                }}
              >
                {value}
              </div>
            </div>
          ))}
        </div>

        {/* Connection Status + Pending Approvals (Issue #81) */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginRight: 8,
          }}
        >
          <InlineConnectionStatus />
          {checklistSummary.complete > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 4,
                padding: "4px 10px",
                background: "#F59E0B20",
                border: "1px solid #F59E0B50",
                borderRadius: 8,
                fontSize: 10,
                fontWeight: 700,
                color: "#F59E0B",
              }}
            >
              <span style={{ fontSize: 12 }}>⏳</span>
              {checklistSummary.complete} pendiente
              {checklistSummary.complete > 1 ? "s" : ""}
            </div>
          )}
          {lastUpdate && (
            <div
              style={{
                fontSize: 9,
                color: "#94A3B8",
                fontWeight: 500,
              }}
            >
              Actualizado:{" "}
              {lastUpdate.toLocaleTimeString("es-CO", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            ["all", "All", null, 10],
            ["occupied", "Ocupada", "#10B981", occupiedCount],
            [
              "vacant",
              "Vacía",
              "#9CA3AF",
              10 -
                occupiedCount -
                arrivingCount -
                cleaningCount -
                checkoutCount -
                maintenanceCount,
            ],
            ["arriving", "Llegada", "#3B82F6", arrivingCount],
            ["cleaning", "Limpieza", "#F59E0B", cleaningCount],
            ["checkout", "Salida", "#EF4444", checkoutCount],
            ["maintenance", "Mant.", "#8B5CF6", maintenanceCount],
          ].map(([key, label, color, count]) => (
            <button
              key={String(key)}
              onClick={() => setFilter(String(key))}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                fontSize: 10,
                fontWeight: 700,
                transition: "all 0.15s",
                fontFamily: "inherit",
                background:
                  filter === key ? (color as string) || "#0A0A0F" : "#F1F5F9",
                color: filter === key ? "white" : "#64748B",
              }}
            >
              {color && (
                <span
                  style={{
                    display: "inline-block",
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: color as string,
                    marginRight: 4,
                  }}
                />
              )}
              {label} {Number(count) > 0 ? `(${count})` : ""}
            </button>
          ))}
        </div>
      </div>

      {/* ═══════ MAIN LAYOUT ═══════ */}
      <div style={{ display: "flex", height: "calc(100vh - 60px)" }}>
        {/* ─── MAP ─── */}
        <div
          style={{
            flex: 1,
            position: "relative",
            overflow: "hidden",
            background:
              "linear-gradient(180deg, #B8E6D0 0%, #C8DEB8 30%, #D8D4A8 60%, #E8DAB0 100%)",
          }}
        >
          {/* Water at top */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: "12%",
              background: "linear-gradient(180deg, #7EC8D8 0%, #A8DCC8 100%)",
            }}
          />

          {/* Access path at bottom */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: "30%",
              right: "10%",
              height: "4%",
              background: "#C8B898",
              borderTop: "2px dashed #A89878",
            }}
          >
            <span
              style={{
                position: "absolute",
                left: "40%",
                top: "50%",
                transform: "translateY(-50%)",
                fontSize: 9,
                color: "#8B7355",
                fontWeight: 700,
                letterSpacing: 1,
              }}
            >
              VÍA DE ACCESO
            </span>
          </div>

          {/* Compass */}
          <div
            style={{
              position: "absolute",
              top: 16,
              left: 16,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.85)",
              border: "2px solid #333",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 900,
              color: "#333",
            }}
          >
            N
          </div>

          {/* Facilities */}
          {FACILITIES.map((f) => (
            <div
              key={f.id}
              style={{
                position: "absolute",
                left: `${f.x}%`,
                top: `${f.y}%`,
                width: `${f.w}%`,
                height: `${f.h}%`,
                background: f.color,
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <span
                style={{
                  color: "white",
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: 1,
                }}
              >
                {f.name}
              </span>
              {f.label && (
                <span
                  style={{
                    color: "rgba(255,255,255,0.7)",
                    fontSize: 8,
                    fontWeight: 600,
                  }}
                >
                  {f.label}
                </span>
              )}
            </div>
          ))}

          {/* Palm trees (decorative) */}
          {[
            [15, 15],
            [85, 15],
            [12, 50],
            [90, 55],
            [45, 70],
            [70, 75],
            [20, 80],
            [55, 25],
            [30, 35],
          ].map(([x, y], i) => (
            <div
              key={`palm-${i}`}
              style={{
                position: "absolute",
                left: `${x}%`,
                top: `${y}%`,
                fontSize: 16,
                opacity: 0.5,
                pointerEvents: "none",
                transform: "translate(-50%, -50%)",
              }}
            >
              🌴
            </div>
          ))}

          {/* ─── VILLA NODES ─── */}
          {VILLAS.map((villa) => {
            const state = villaStates[villa.id];
            if (!state) return null;
            const statusCfg = STATUS_CONFIG[state.status];
            const isSelected = selectedVilla === villa.id;
            const isFiltered = filter !== "all" && state.status !== filter;
            const nightsLeft = getNightsRemaining(state.guest);

            return (
              <div
                key={villa.id}
                className="villa-node"
                onClick={() => setSelectedVilla(villa.id)}
                style={{
                  position: "absolute",
                  left: `${villa.x}%`,
                  top: `${villa.y}%`,
                  transform: "translate(-50%, -50%)",
                  cursor: "pointer",
                  opacity: isFiltered ? 0.2 : 1,
                  pointerEvents: isFiltered ? "none" : "auto",
                  zIndex: isSelected ? 10 : 1,
                }}
              >
                {/* Villa building */}
                <div
                  style={{
                    width: 56,
                    height: 44,
                    borderRadius: 8,
                    background: "white",
                    border: `3px solid ${isSelected ? "#0A0A0F" : statusCfg.color}`,
                    boxShadow: isSelected
                      ? `0 0 0 3px ${villa.color}60, 0 4px 16px rgba(0,0,0,0.25)`
                      : "0 2px 8px rgba(0,0,0,0.15)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    position: "relative",
                    overflow: "visible",
                  }}
                >
                  {/* Status dot */}
                  <div
                    style={{
                      position: "absolute",
                      top: -5,
                      right: -5,
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: statusCfg.color,
                      border: "2px solid white",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                    }}
                    className={state.status === "maintenance" ? "pulse" : ""}
                  />

                  {/* VIP star */}
                  {state.guest?.vip && (
                    <div
                      style={{
                        position: "absolute",
                        top: -6,
                        left: -6,
                        fontSize: 14,
                      }}
                    >
                      ⭐
                    </div>
                  )}

                  {/* Guest count */}
                  {state.guest && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: -6,
                        right: -6,
                        width: 18,
                        height: 18,
                        borderRadius: "50%",
                        background: "#0A0A0F",
                        color: "white",
                        fontSize: 10,
                        fontWeight: 800,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid white",
                      }}
                    >
                      {state.guest.guests}
                    </div>
                  )}

                  {/* Allergy flag */}
                  {state.guest?.allergies &&
                    state.guest.allergies.length > 0 && (
                      <div
                        style={{
                          position: "absolute",
                          top: -6,
                          left: 20,
                          fontSize: 10,
                        }}
                      >
                        ⚠️
                      </div>
                    )}

                  {/* Nights remaining */}
                  {nightsLeft !== null &&
                    nightsLeft <= 1 &&
                    state.status === "occupied" && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: -8,
                          left: -8,
                          background: "#EF4444",
                          color: "white",
                          fontSize: 8,
                          fontWeight: 800,
                          padding: "1px 4px",
                          borderRadius: 4,
                        }}
                      >
                        {nightsLeft === 0 ? "OUT" : "1d"}
                      </div>
                    )}

                  {/* Villa icon */}
                  <div style={{ fontSize: 14 }}>
                    {state.status === "cleaning"
                      ? "🧹"
                      : state.status === "maintenance"
                        ? "🔧"
                        : villa.accessible
                          ? "♿"
                          : "🏠"}
                  </div>
                </div>

                {/* Villa name label — uses the ACTUAL color from the architectural blueprint */}
                <div
                  style={{
                    marginTop: 4,
                    padding: "2px 8px",
                    borderRadius: 4,
                    background: villa.color,
                    color: "white",
                    fontSize: 10,
                    fontWeight: 800,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    letterSpacing: 0.3,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.2)",
                  }}
                >
                  {villa.name}
                </div>

                {/* Guest name under villa */}
                {state.guest && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 8,
                      fontWeight: 600,
                      color: "#333",
                      textAlign: "center",
                      maxWidth: 80,
                      background: "rgba(255,255,255,0.85)",
                      padding: "1px 4px",
                      borderRadius: 3,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {state.guest.name}
                  </div>
                )}

                {/* Issue #18: Current tab amount */}
                {state.currentTab > 0 && (
                  <div
                    style={{
                      marginTop: 2,
                      fontSize: 8,
                      fontWeight: 800,
                      color: state.currentTab > 300000 ? "#F59E0B" : "#10B981",
                      textAlign: "center",
                      background:
                        state.currentTab > 300000
                          ? "rgba(245,158,11,0.15)"
                          : "rgba(16,185,129,0.15)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      border: `1px solid ${state.currentTab > 300000 ? "rgba(245,158,11,0.3)" : "rgba(16,185,129,0.3)"}`,
                    }}
                  >
                    ${(state.currentTab / 1000).toFixed(0)}K
                  </div>
                )}
              </div>
            );
          })}

          {/* Legend */}
          <div
            style={{
              position: "absolute",
              bottom: 40,
              left: 12,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 10,
              padding: "10px 14px",
              boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 800,
                color: "#0A0A0F",
                marginBottom: 6,
                letterSpacing: 0.5,
              }}
            >
              ESTADO VILLAS
            </div>
            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
              <div
                key={key}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 3,
                }}
              >
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: cfg.color,
                  }}
                />
                <span style={{ fontSize: 9, color: "#333", fontWeight: 600 }}>
                  {cfg.label}
                </span>
              </div>
            ))}
            <div
              style={{
                borderTop: "1px solid #E2E8F0",
                marginTop: 6,
                paddingTop: 4,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 9 }}>⭐</span>
                <span style={{ fontSize: 9, color: "#333" }}>VIP Guest</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                  marginBottom: 2,
                }}
              >
                <span style={{ fontSize: 9 }}>⚠️</span>
                <span style={{ fontSize: 9, color: "#333" }}>Alergias</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: "#0A0A0F",
                    color: "white",
                    fontSize: 8,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                  }}
                >
                  3
                </div>
                <span style={{ fontSize: 9, color: "#333" }}>Huéspedes</span>
              </div>
            </div>
          </div>
        </div>

        {/* ═══════ DETAIL PANEL ═══════ */}
        <div
          style={{
            width: 340,
            background: "white",
            borderLeft: "1px solid #E2E8F0",
            overflowY: "auto",
            flexShrink: 0,
          }}
        >
          {sel && sel.state ? (
            <div style={{ padding: 20 }}>
              {/* Villa Header */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 16,
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 22, fontWeight: 900, color: "#0A0A0F" }}
                  >
                    Villa {sel.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    {sel.type} • Max {sel.maxGuests} huéspedes
                  </div>
                  {sel.accessible && (
                    <Badge color="#1565C0" small>
                      ♿ Accesible
                    </Badge>
                  )}
                </div>
                <button
                  onClick={() => setSelectedVilla(null)}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: "1px solid #E2E8F0",
                    background: "#F8FAFC",
                    cursor: "pointer",
                    fontSize: 14,
                    color: "#64748B",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontFamily: "inherit",
                  }}
                >
                  ×
                </button>
              </div>

              {/* Status Badge — Clickable to change */}
              <button
                onClick={() => setShowStatusModal(true)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: 10,
                  background: STATUS_CONFIG[sel.state.status].bg,
                  border: `1px solid ${STATUS_CONFIG[sel.state.status].color}30`,
                  cursor: "pointer",
                  textAlign: "left",
                  marginBottom: 12,
                  fontFamily: "inherit",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <span style={{ fontSize: 12 }}>
                      {STATUS_CONFIG[sel.state.status].icon}
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: STATUS_CONFIG[sel.state.status].color,
                      }}
                    >
                      {STATUS_CONFIG[sel.state.status].label}
                    </span>
                  </div>
                  <span style={{ fontSize: 10, color: "#999" }}>Cambiar ▸</span>
                </div>
              </button>

              {/* Cleaning State */}
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: 0.5,
                    marginBottom: 4,
                  }}
                >
                  ESTADO LIMPIEZA
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background:
                        CLEANING_STATES[sel.state.cleaningState].color,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: CLEANING_STATES[sel.state.cleaningState].color,
                    }}
                  >
                    {CLEANING_STATES[sel.state.cleaningState].label}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    marginTop: 8,
                    flexWrap: "wrap",
                  }}
                >
                  {(
                    Object.entries(CLEANING_STATES) as [
                      VillaState["cleaningState"],
                      { label: string; color: string },
                    ][]
                  ).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() =>
                        updateVilla(selectedVilla!, { cleaningState: key })
                      }
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        border: "none",
                        cursor: "pointer",
                        fontSize: 9,
                        fontWeight: 700,
                        fontFamily: "inherit",
                        background:
                          sel.state.cleaningState === key
                            ? cfg.color
                            : `${cfg.color}15`,
                        color:
                          sel.state.cleaningState === key ? "white" : cfg.color,
                      }}
                    >
                      {cfg.label.split(" — ")[0]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Maintenance */}
              {sel.state.status === "maintenance" && (
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    marginBottom: 12,
                    background: "#F5F3FF",
                    border: "1px solid #8B5CF630",
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#8B5CF6",
                      letterSpacing: 0.5,
                      marginBottom: 4,
                    }}
                  >
                    MANTENIMIENTO {sel.state.maintenanceUrgent && "🚨 URGENTE"}
                  </div>
                  <div style={{ fontSize: 12, color: "#333" }}>
                    {sel.state.maintenanceNotes || "Sin notas"}
                  </div>
                </div>
              )}

              {/* Guest Info */}
              {sel.state.guest ? (
                <div
                  style={{
                    padding: "14px",
                    borderRadius: 12,
                    marginBottom: 12,
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "#64748B",
                        letterSpacing: 0.5,
                      }}
                    >
                      HUÉSPED
                    </div>
                    {sel.state.guest.vip && (
                      <Badge color="#DAA520" small>
                        ⭐ VIP
                      </Badge>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 800,
                      color: "#0A0A0F",
                      marginBottom: 4,
                    }}
                  >
                    {sel.state.guest.name}
                  </div>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 8,
                      marginBottom: 8,
                    }}
                  >
                    <div>
                      <div
                        style={{ fontSize: 9, color: "#999", fontWeight: 600 }}
                      >
                        👥 Huéspedes
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0A0A0F",
                        }}
                      >
                        {sel.state.guest.guests}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 9, color: "#999", fontWeight: 600 }}
                      >
                        🌙 Noches
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          color: "#0A0A0F",
                        }}
                      >
                        {sel.state.guest.nights}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 9, color: "#999", fontWeight: 600 }}
                      >
                        📅 Check-in
                      </div>
                      <div
                        style={{ fontSize: 11, fontWeight: 600, color: "#333" }}
                      >
                        {sel.state.guest.checkIn}
                      </div>
                    </div>
                    <div>
                      <div
                        style={{ fontSize: 9, color: "#999", fontWeight: 600 }}
                      >
                        📅 Check-out
                      </div>
                      <div
                        style={{ fontSize: 11, fontWeight: 600, color: "#333" }}
                      >
                        {sel.state.guest.checkOut}
                      </div>
                    </div>
                  </div>
                  {sel.state.guest.phone && (
                    <div
                      style={{ fontSize: 11, color: "#333", marginBottom: 4 }}
                    >
                      📱 {sel.state.guest.phone}
                    </div>
                  )}
                  {sel.state.guest.allergies?.length > 0 && (
                    <div style={{ marginBottom: 4 }}>
                      <span
                        style={{
                          fontSize: 9,
                          color: "#EF4444",
                          fontWeight: 700,
                        }}
                      >
                        ⚠️ ALERGIAS:{" "}
                      </span>
                      {sel.state.guest.allergies.map((a) => (
                        <Badge key={a} color="#EF4444" small>
                          {a}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {sel.state.guest.notes && (
                    <div
                      style={{
                        fontSize: 11,
                        color: "#666",
                        fontStyle: "italic",
                        padding: "6px 8px",
                        background: "#FFFBEB",
                        borderRadius: 6,
                        marginTop: 4,
                      }}
                    >
                      📝 {sel.state.guest.notes}
                    </div>
                  )}
                  {/* Nights remaining */}
                  {getNightsRemaining(sel.state.guest) !== null && (
                    <div
                      style={{
                        marginTop: 8,
                        padding: "6px 10px",
                        borderRadius: 8,
                        textAlign: "center",
                        background:
                          getNightsRemaining(sel.state.guest)! <= 1
                            ? "#FEF2F2"
                            : "#EBF5FF",
                        border: `1px solid ${getNightsRemaining(sel.state.guest)! <= 1 ? "#EF444430" : "#3B82F630"}`,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 800,
                          color:
                            getNightsRemaining(sel.state.guest)! <= 1
                              ? "#EF4444"
                              : "#3B82F6",
                        }}
                      >
                        {getNightsRemaining(sel.state.guest) === 0
                          ? "🔴 CHECKOUT TODAY"
                          : `${getNightsRemaining(sel.state.guest)} noches restantes`}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div
                  style={{
                    padding: "20px 14px",
                    borderRadius: 12,
                    marginBottom: 12,
                    background: "#F8FAFC",
                    border: "1px dashed #CBD5E1",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 24, marginBottom: 4 }}>🏠</div>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Sin huésped asignado
                  </div>
                </div>
              )}

              {/* Villa Specs */}
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  marginBottom: 12,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: 0.5,
                    marginBottom: 6,
                  }}
                >
                  ESPECIFICACIONES
                </div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 9, color: "#999" }}>🛏️ Camas</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {sel.beds}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#999" }}>
                      🛋️ Sofá Cama
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {sel.sofa ? "Sí" : "No"}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#999" }}>
                      👥 Capacidad
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {sel.maxGuests} huéspedes
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#999" }}>📍 Zona</div>
                    <div style={{ fontSize: 12, fontWeight: 700 }}>
                      {sel.zone}
                    </div>
                  </div>
                </div>
              </div>

              {/* ═══════ QUICK ACTIONS ═══════ */}
              <div style={{ marginBottom: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#0066CC",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  ACCIONES RÁPIDAS
                </div>
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  {!sel.state.guest && sel.state.status !== "maintenance" && (
                    <ActionBtn
                      color="#10B981"
                      onClick={() => {
                        setEditForm({
                          name: "",
                          guests: 1,
                          checkIn: new Date().toISOString().split("T")[0],
                          checkOut: "",
                          phone: "",
                          allergies: "",
                          vip: false,
                          notes: "",
                        });
                        setShowAssignModal(true);
                      }}
                    >
                      👤 Asignar Huésped
                    </ActionBtn>
                  )}
                  {sel.state.guest && (
                    <ActionBtn
                      color="#3B82F6"
                      onClick={() => setShowMoveModal(true)}
                    >
                      🔄 Mover Huésped a Otra Villa
                    </ActionBtn>
                  )}
                  <ActionBtn
                    color="#F59E0B"
                    onClick={() => {
                      updateVilla(selectedVilla!, {
                        status: "cleaning",
                        cleaningState: "pending",
                      });
                    }}
                    disabled={sel.state.status === "cleaning"}
                  >
                    ✅ Iniciar Checklist Limpieza
                  </ActionBtn>
                  <ActionBtn
                    color="#8B5CF6"
                    onClick={() => setShowMaintenanceModal(true)}
                  >
                    🔧 Reportar Mantenimiento
                  </ActionBtn>
                  <ActionBtn
                    color="#0066CC"
                    onClick={() =>
                      router.push(`/ops/villa/${selectedVilla}/history`)
                    }
                  >
                    📊 Ver Historial Villa
                  </ActionBtn>
                  {sel.state.guest && (
                    <>
                      <ActionBtn color="#64748B" onClick={() => {}}>
                        📋 Ver Detalles Huésped
                      </ActionBtn>
                      <ActionBtn
                        color="#10B981"
                        onClick={() => {
                          window.open(
                            `https://wa.me/${sel.state.guest?.phone?.replace(/[^0-9+]/g, "")}`,
                            "_blank",
                          );
                        }}
                        disabled={!sel.state.guest.phone}
                      >
                        💬 Contactar Huésped (WhatsApp)
                      </ActionBtn>
                    </>
                  )}
                  {sel.state.status === "checkout" && (
                    <ActionBtn
                      color="#EF4444"
                      onClick={() =>
                        handleStatusChange(selectedVilla!, "cleaning")
                      }
                    >
                      🚪 Procesar Check-out → Limpieza
                    </ActionBtn>
                  )}
                  {sel.state.status === "arriving" && (
                    <ActionBtn
                      color="#10B981"
                      onClick={() =>
                        handleStatusChange(selectedVilla!, "occupied")
                      }
                    >
                      ✨ Confirmar Check-in → Ocupada
                    </ActionBtn>
                  )}
                  {sel.state.cleaningState === "approved" &&
                    sel.state.status === "cleaning" && (
                      <ActionBtn
                        color="#10B981"
                        onClick={() =>
                          handleStatusChange(selectedVilla!, "vacant")
                        }
                      >
                        🏠 Marcar como Disponible
                      </ActionBtn>
                    )}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ padding: 20, textAlign: "center", marginTop: 40 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🏝️</div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0A0A0F" }}>
                Selecciona una Villa
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
                Haz click en una villa en el mapa para ver detalles, cambiar
                estado, o asignar huéspedes.
              </div>
              <div style={{ marginTop: 24, textAlign: "left" }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    color: "#64748B",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  RESUMEN DE HOY
                </div>
                {filteredVillas.map((v) => {
                  const s = villaStates[v.id];
                  if (!s) return null;
                  const cfg = STATUS_CONFIG[s.status];
                  return (
                    <div
                      key={v.id}
                      onClick={() => setSelectedVilla(v.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "6px 10px",
                        borderRadius: 8,
                        marginBottom: 3,
                        cursor: "pointer",
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        transition: "all 0.15s",
                      }}
                    >
                      <div
                        style={{
                          width: 20,
                          height: 14,
                          borderRadius: 3,
                          background: v.color,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "#0A0A0F",
                          flex: 1,
                        }}
                      >
                        {v.name}
                      </span>
                      <Badge color={cfg.color} small>
                        {cfg.label}
                      </Badge>
                      {s.guest && (
                        <span style={{ fontSize: 9, color: "#64748B" }}>
                          {s.guest.guests}👥
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ MODALS ═══════ */}

      {/* Status Change Modal */}
      {showStatusModal && selectedVilla && sel && (
        <div
          className="modal-overlay"
          onClick={() => setShowStatusModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
              Cambiar Estado — Villa {sel.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(
                Object.entries(STATUS_CONFIG) as [
                  VillaState["status"],
                  typeof STATUS_CONFIG.occupied,
                ][]
              ).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => handleStatusChange(selectedVilla, key)}
                  style={{
                    padding: "12px 16px",
                    borderRadius: 10,
                    border: `2px solid ${cfg.color}30`,
                    background: sel.state.status === key ? cfg.bg : "white",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                  }}
                >
                  <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                  <div style={{ textAlign: "left" }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: cfg.color,
                      }}
                    >
                      {cfg.label}
                    </div>
                    <div style={{ fontSize: 10, color: "#999" }}>
                      {cfg.labelEn}
                    </div>
                  </div>
                  {sel.state.status === key && (
                    <span
                      style={{
                        marginLeft: "auto",
                        color: cfg.color,
                        fontWeight: 800,
                      }}
                    >
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Assign Guest Modal */}
      {showAssignModal && selectedVilla && sel && (
        <div
          className="modal-overlay"
          onClick={() => setShowAssignModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
              Asignar Huésped — Villa {sel.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  Nombre del Huésped *
                </label>
                <input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Ej: Martinez Family"
                />
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
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
                    Huéspedes
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={sel.maxGuests}
                    value={editForm.guests}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        guests: parseInt(e.target.value) || 1,
                      }))
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
                    Teléfono
                  </label>
                  <input
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, phone: e.target.value }))
                    }
                    placeholder="+1 555..."
                  />
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
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
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={editForm.checkIn}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, checkIn: e.target.value }))
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
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={editForm.checkOut}
                    onChange={(e) =>
                      setEditForm((p) => ({ ...p, checkOut: e.target.value }))
                    }
                  />
                </div>
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
                  Alergias (separadas por coma)
                </label>
                <input
                  value={editForm.allergies}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, allergies: e.target.value }))
                  }
                  placeholder="gluten, dairy, shellfish..."
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
                  Notas
                </label>
                <textarea
                  rows={2}
                  value={editForm.notes}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Late checkout, champagne on arrival..."
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={editForm.vip}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, vip: e.target.checked }))
                  }
                  style={{ width: 16, height: 16 }}
                />
                <span style={{ fontSize: 12, fontWeight: 700 }}>
                  ⭐ VIP Guest
                </span>
              </label>
              <button
                onClick={handleAssignGuest}
                disabled={!editForm.name.trim()}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: editForm.name.trim() ? "#10B981" : "#E2E8F0",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  marginTop: 4,
                  fontFamily: "inherit",
                }}
              >
                Asignar Huésped
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Move Guest Modal */}
      {showMoveModal && selectedVilla && sel?.state?.guest && (
        <div className="modal-overlay" onClick={() => setShowMoveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 4 }}>
              Mover Huésped
            </div>
            <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
              {sel.state.guest.name} — Villa {sel.name} →
            </div>
            {vacantVillas.length > 0 ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {vacantVillas.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => handleMoveGuest(selectedVilla, v.id)}
                    style={{
                      padding: "12px 16px",
                      borderRadius: 10,
                      border: "1px solid #E2E8F0",
                      background: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      fontFamily: "inherit",
                    }}
                  >
                    <div
                      style={{
                        width: 24,
                        height: 16,
                        borderRadius: 4,
                        background: v.color,
                      }}
                    />
                    <div style={{ textAlign: "left", flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>
                        Villa {v.name}
                      </div>
                      <div style={{ fontSize: 10, color: "#999" }}>
                        {v.type} • Max {v.maxGuests} • {v.zone}
                      </div>
                    </div>
                    <span
                      style={{
                        fontSize: 12,
                        color: "#0066CC",
                        fontWeight: 700,
                      }}
                    >
                      → Mover
                    </span>
                  </button>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: "center", padding: 20, color: "#999" }}>
                No hay villas disponibles
              </div>
            )}
          </div>
        </div>
      )}

      {/* Maintenance Report Modal */}
      {showMaintenanceModal && selectedVilla && sel && (
        <div
          className="modal-overlay"
          onClick={() => setShowMaintenanceModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>
              🔧 Reportar Mantenimiento — Villa {sel.name}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                  Descripción del problema
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: AC unit not cooling, strange noise..."
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, notes: e.target.value }))
                  }
                />
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, vip: e.target.checked }))
                  }
                  style={{ width: 16, height: 16 }}
                />
                <span
                  style={{ fontSize: 12, fontWeight: 700, color: "#EF4444" }}
                >
                  🚨 Urgente (affects guest safety or comfort)
                </span>
              </label>
              <button
                onClick={() => {
                  updateVilla(selectedVilla, {
                    status: "maintenance",
                    maintenanceNotes: editForm.notes,
                    maintenanceUrgent: editForm.vip,
                  });
                  setShowMaintenanceModal(false);
                }}
                style={{
                  padding: "12px",
                  borderRadius: 10,
                  border: "none",
                  cursor: "pointer",
                  background: "#8B5CF6",
                  color: "white",
                  fontWeight: 800,
                  fontSize: 14,
                  fontFamily: "inherit",
                }}
              >
                Reportar Mantenimiento
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications (Issue #61) */}
      <div
        style={{
          position: "fixed",
          top: 20,
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

      {/* Floating Connection Status (Issue #81) */}
      <FloatingConnectionStatus
        position="bottom-left"
        autoHideWhenConnected={true}
      />
    </div>
  );
}
