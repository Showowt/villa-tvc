"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TVC INTERACTIVE PROPERTY MAP — Production Component
// Built from actual architectural plans (D. Arqui Restauro S.A.S)
// Integrates with: checklists, occupancy, maintenance, guest data
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface Villa {
  id: number;
  name: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  color: string;
  beds: number;
  sofa: boolean;
  maxGuests: number;
  zone: string;
  ada?: boolean;
}

interface VillaStatus {
  status:
    | "occupied"
    | "vacant"
    | "arriving"
    | "cleaning"
    | "checkout"
    | "maintenance";
  guests: string | null;
  guestCount: number;
  checkIn: string | null;
  checkOut: string | null;
  cleaning: "pending" | "in_progress" | "submitted" | "approved" | "rejected";
  maintenance: "ok" | "ac_check" | "plumbing" | "electrical" | "other";
  vipLevel?: "standard" | "vip" | "vvip";
}

// Villa data from architectural plans — exact names and relative positions
const VILLAS: Villa[] = [
  {
    id: 1,
    name: "Villa Aduana",
    type: "Deluxe",
    x: 48,
    y: 14,
    angle: -15,
    color: "#FFD700",
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "north",
  },
  {
    id: 2,
    name: "Villa Trinidad",
    type: "Deluxe",
    x: 62,
    y: 12,
    angle: -10,
    color: "#FF6B6B",
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "north",
  },
  {
    id: 3,
    name: "Villa Paz",
    type: "Garden View",
    x: 74,
    y: 16,
    angle: 5,
    color: "#DDA0DD",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "east",
  },
  {
    id: 4,
    name: "Villa San Pedro",
    type: "Deluxe",
    x: 80,
    y: 26,
    angle: 15,
    color: "#FF69B4",
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "east",
  },
  {
    id: 5,
    name: "Villa San Diego",
    type: "Garden View",
    x: 82,
    y: 38,
    angle: 20,
    color: "#90EE90",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "east",
  },
  {
    id: 6,
    name: "Villa Coche",
    type: "ADA Accessible",
    x: 84,
    y: 50,
    angle: 0,
    color: "#4169E1",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "south",
    ada: true,
  },
  {
    id: 7,
    name: "Villa Teresa",
    type: "Garden View",
    x: 38,
    y: 18,
    angle: -20,
    color: "#32CD32",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "north",
  },
  {
    id: 8,
    name: "Villa Pozo",
    type: "Garden View",
    x: 30,
    y: 34,
    angle: -10,
    color: "#00CED1",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "west",
  },
  {
    id: 9,
    name: "Villa Santo Domingo",
    type: "Deluxe",
    x: 36,
    y: 48,
    angle: -5,
    color: "#FFA500",
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "west",
  },
  {
    id: 10,
    name: "Villa Merced",
    type: "Garden View",
    x: 34,
    y: 58,
    angle: 0,
    color: "#FF4500",
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "south",
  },
];

const STATUS_CONFIG = {
  occupied: {
    color: "#10B981",
    bg: "#ECFDF5",
    border: "#10B981",
    label: "Occupied",
    labelEs: "Ocupada",
    icon: "🟢",
    pulse: false,
  },
  vacant: {
    color: "#94A3B8",
    bg: "#F8FAFC",
    border: "#CBD5E1",
    label: "Vacant",
    labelEs: "Vacía",
    icon: "⚪",
    pulse: false,
  },
  arriving: {
    color: "#0066CC",
    bg: "#EBF5FF",
    border: "#0066CC",
    label: "Arriving Today",
    labelEs: "Llegada Hoy",
    icon: "🔵",
    pulse: true,
  },
  cleaning: {
    color: "#F59E0B",
    bg: "#FFFBEB",
    border: "#F59E0B",
    label: "Cleaning",
    labelEs: "Limpieza",
    icon: "🟡",
    pulse: true,
  },
  checkout: {
    color: "#EF4444",
    bg: "#FFF1F2",
    border: "#EF4444",
    label: "Check-out Today",
    labelEs: "Salida Hoy",
    icon: "🔴",
    pulse: true,
  },
  maintenance: {
    color: "#8B5CF6",
    bg: "#F5F3FF",
    border: "#8B5CF6",
    label: "Maintenance",
    labelEs: "Mantenimiento",
    icon: "🟣",
    pulse: true,
  },
};

const CLEANING_STATUS = {
  pending: { label: "Not Started", labelEs: "Sin Iniciar", color: "#94A3B8" },
  in_progress: {
    label: "In Progress",
    labelEs: "En Progreso",
    color: "#F59E0B",
  },
  submitted: {
    label: "Awaiting Approval",
    labelEs: "Esperando Aprobación",
    color: "#0066CC",
  },
  approved: {
    label: "Guest Ready",
    labelEs: "Lista para Huésped",
    color: "#10B981",
  },
  rejected: {
    label: "Needs Re-clean",
    labelEs: "Requiere Re-limpieza",
    color: "#EF4444",
  },
};

// Villa ID mapping: DB villa_id -> component id
const VILLA_ID_MAP: { [key: string]: number } = {
  villa_1: 1,
  villa_2: 2,
  villa_3: 3,
  villa_4: 4,
  villa_5: 5,
  villa_6: 6,
  villa_7: 7,
  villa_8: 8,
  villa_9: 9,
  villa_10: 10,
};

export default function TVCPropertyMap() {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [time, setTime] = useState(new Date());
  const [showPanel, setShowPanel] = useState(false);
  const [villaStatuses, setVillaStatuses] = useState<{
    [key: number]: VillaStatus;
  }>({});
  const [loading, setLoading] = useState(true);

  // Load data from Supabase
  const loadData = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    const today = new Date().toISOString().split("T")[0];

    // Load villa statuses and bookings
    const { data: statusData } = await supabase
      .from("villa_status")
      .select("*");
    const { data: bookingData } = await supabase
      .from("villa_bookings")
      .select("*")
      .in("status", ["confirmed", "checked_in"])
      .lte("check_in", today)
      .gte("check_out", today);

    // Build status map
    const newStatuses: { [key: number]: VillaStatus } = {};

    // Initialize all villas as vacant
    VILLAS.forEach((v) => {
      newStatuses[v.id] = {
        status: "vacant",
        guests: null,
        guestCount: 0,
        checkIn: null,
        checkOut: null,
        cleaning: "approved",
        maintenance: "ok",
      };
    });

    // Apply villa status from DB
    if (statusData) {
      statusData.forEach(
        (s: {
          villa_id: string;
          status: string;
          cleaning_status: string;
          maintenance_status: string;
        }) => {
          const villaId = VILLA_ID_MAP[s.villa_id];
          if (villaId && newStatuses[villaId]) {
            // Map DB status to UI status
            if (s.status === "occupied")
              newStatuses[villaId].status = "occupied";
            else if (s.status === "cleaning")
              newStatuses[villaId].status = "cleaning";
            else if (s.status === "maintenance")
              newStatuses[villaId].status = "maintenance";
            else newStatuses[villaId].status = "vacant";

            // Map cleaning status
            if (s.cleaning_status === "dirty")
              newStatuses[villaId].cleaning = "pending";
            else if (s.cleaning_status === "in_progress")
              newStatuses[villaId].cleaning = "in_progress";
            else if (s.cleaning_status === "inspected")
              newStatuses[villaId].cleaning = "submitted";
            else newStatuses[villaId].cleaning = "approved";

            // Map maintenance
            if (s.maintenance_status !== "ok")
              newStatuses[villaId].maintenance = "ac_check";
          }
        },
      );
    }

    // Apply booking data
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
        }) => {
          const villaId = VILLA_ID_MAP[b.villa_id];
          if (villaId && newStatuses[villaId]) {
            newStatuses[villaId].guests = b.guest_name;
            newStatuses[villaId].guestCount = b.num_adults + b.num_children;
            newStatuses[villaId].checkIn = new Date(
              b.check_in,
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            newStatuses[villaId].checkOut = new Date(
              b.check_out,
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            newStatuses[villaId].vipLevel =
              (b.vip_level as "standard" | "vip" | "vvip") || "standard";

            // Check if arriving or leaving today
            const checkInDate = b.check_in.split("T")[0];
            const checkOutDate = b.check_out.split("T")[0];

            if (checkInDate === today && b.status === "confirmed") {
              newStatuses[villaId].status = "arriving";
            } else if (checkOutDate === today) {
              newStatuses[villaId].status = "checkout";
            } else if (b.status === "checked_in") {
              newStatuses[villaId].status = "occupied";
            }
          }
        },
      );
    }

    setVillaStatuses(newStatuses);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Real-time updates
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

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  const totalGuests = Object.values(villaStatuses).reduce(
    (s, v) => s + v.guestCount,
    0,
  );
  const occupiedCount = Object.values(villaStatuses).filter(
    (v) => v.status === "occupied" || v.status === "checkout",
  ).length;
  const arrivingCount = Object.values(villaStatuses).filter(
    (v) => v.status === "arriving" || v.status === "cleaning",
  ).length;

  const filteredVillas =
    filter === "all"
      ? VILLAS
      : VILLAS.filter((v) => {
          const s = villaStatuses[v.id];
          return s?.status === filter;
        });

  const sel = selected
    ? {
        villa: VILLAS.find((v) => v.id === selected),
        status: villaStatuses[selected],
      }
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div
      style={{
        fontFamily: "'DM Sans', -apple-system, sans-serif",
        background: "#F0F4F0",
        minHeight: "100vh",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800;900&display=swap');
        * { box-sizing: border-box; }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
        @keyframes ripple { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2.5); opacity: 0; } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .villa-marker:hover { transform: scale(1.15); z-index: 100; }
        .villa-marker { transition: transform 0.2s ease; cursor: pointer; }
      `}</style>

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #0A0A0F 0%, #1a1a2e 100%)",
          padding: "14px 20px",
          borderBottom: "2px solid #00B4FF",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "linear-gradient(135deg, #00B4FF, #00D4FF)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 13,
              fontWeight: 900,
              color: "#0A0A0F",
            }}
          >
            TVC
          </div>
          <div>
            <div style={{ color: "#FFF", fontSize: 15, fontWeight: 800 }}>
              Property Map — Live Operations
            </div>
            <div
              style={{
                color: "#00B4FF",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 1,
              }}
            >
              TINY VILLAGE CARTAGENA • ISLA TIERRA BOMBA
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={{ color: "#10B981", fontSize: 11, fontWeight: 700 }}>
            ● LIVE
          </span>
          <span style={{ color: "#888", fontSize: 11 }}>
            {time.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div
        style={{
          background: "#FFF",
          padding: "10px 20px",
          borderBottom: "1px solid #E2E8F0",
          display: "flex",
          gap: 20,
          alignItems: "center",
          overflowX: "auto",
          flexWrap: "wrap",
        }}
      >
        {[
          {
            label: "Guests On Property",
            value: totalGuests,
            color: "#0A0A0F",
            icon: "👥",
          },
          {
            label: "Villas Occupied",
            value: `${occupiedCount}/10`,
            color: "#10B981",
            icon: "🏠",
          },
          {
            label: "Arriving Today",
            value: arrivingCount,
            color: "#0066CC",
            icon: "✈️",
          },
          {
            label: "Capacity",
            value: `${Math.round((totalGuests / 42) * 100)}%`,
            color: totalGuests > 30 ? "#EF4444" : "#F59E0B",
            icon: "📊",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 120,
            }}
          >
            <span style={{ fontSize: 18 }}>{s.icon}</span>
            <div>
              <div style={{ fontSize: 10, color: "#64748B", fontWeight: 600 }}>
                {s.label}
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>
                {s.value}
              </div>
            </div>
          </div>
        ))}
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
          {[
            "all",
            "occupied",
            "vacant",
            "arriving",
            "cleaning",
            "checkout",
          ].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              style={{
                padding: "5px 10px",
                borderRadius: 6,
                border: "none",
                cursor: "pointer",
                background: filter === f ? "#0A0A0F" : "#F1F5F9",
                color: filter === f ? "#FFF" : "#64748B",
                fontSize: 10,
                fontWeight: 700,
                textTransform: "capitalize",
              }}
            >
              {f === "all"
                ? "All"
                : (STATUS_CONFIG[f as keyof typeof STATUS_CONFIG]?.icon || "") +
                  " " +
                  f}
            </button>
          ))}
        </div>
      </div>

      {/* Map + Detail Panel */}
      <div
        style={{
          display: "flex",
          height: "calc(100vh - 130px)",
          overflow: "hidden",
        }}
      >
        {/* SVG MAP */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
          <svg
            viewBox="0 0 100 80"
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, #E8F0E4 0%, #D4E4D0 50%, #C8D8C4 100%)",
            }}
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Water / Ocean edges */}
            <defs>
              <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FA8D1" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2E86AB" stopOpacity="0.5" />
              </linearGradient>
              <linearGradient id="pool" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
              <pattern
                id="grass"
                patternUnits="userSpaceOnUse"
                width="4"
                height="4"
              >
                <circle cx="1" cy="1" r="0.3" fill="#6B8E5A" opacity="0.15" />
                <circle cx="3" cy="3" r="0.3" fill="#5A7D4A" opacity="0.1" />
              </pattern>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow
                  dx="0.3"
                  dy="0.3"
                  stdDeviation="0.5"
                  floodOpacity="0.2"
                />
              </filter>
            </defs>

            {/* Island outline */}
            <path
              d="M 10 5 Q 30 2, 55 4 Q 75 3, 90 8 Q 95 15, 92 30 Q 93 45, 90 55 Q 88 65, 80 70 Q 65 78, 45 75 Q 25 73, 15 68 Q 8 60, 6 45 Q 5 25, 10 5 Z"
              fill="url(#grass)"
              stroke="#8BA87A"
              strokeWidth="0.3"
              opacity="0.5"
            />

            {/* Pathways */}
            <path
              d="M 50 72 Q 50 65, 52 55 Q 54 45, 55 38 Q 56 30, 52 22 Q 48 15, 50 8"
              fill="none"
              stroke="#C4A882"
              strokeWidth="1.2"
              strokeDasharray="0"
              opacity="0.6"
              strokeLinecap="round"
            />
            <path
              d="M 52 38 Q 60 35, 70 30 Q 78 27, 82 30"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.5"
              strokeLinecap="round"
            />
            <path
              d="M 52 38 Q 42 35, 35 30 Q 30 28, 30 34"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.5"
              strokeLinecap="round"
            />
            <path
              d="M 54 48 Q 65 48, 80 48"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.5"
              strokeLinecap="round"
            />
            <path
              d="M 50 55 Q 40 55, 34 58"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.5"
              strokeLinecap="round"
            />

            {/* Dock (Muelle) */}
            <rect
              x="46"
              y="3"
              width="8"
              height="3"
              rx="0.5"
              fill="#8B7355"
              stroke="#6B5335"
              strokeWidth="0.2"
            />
            <line
              x1="48"
              y1="3"
              x2="48"
              y2="1"
              stroke="#6B5335"
              strokeWidth="0.3"
            />
            <line
              x1="52"
              y1="3"
              x2="52"
              y2="1"
              stroke="#6B5335"
              strokeWidth="0.3"
            />
            <rect
              x="46"
              y="1"
              width="8"
              height="2"
              fill="url(#water)"
              rx="0.3"
              opacity="0.6"
            />
            <text
              x="50"
              y="2.5"
              textAnchor="middle"
              fontSize="1.4"
              fill="#4A3520"
              fontWeight="700"
              fontFamily="DM Sans"
            >
              MUELLE
            </text>
            <text
              x="50"
              y="5"
              textAnchor="middle"
              fontSize="1"
              fill="#8B7355"
              fontFamily="DM Sans"
            >
              Dock
            </text>

            {/* Trees/vegetation (scattered) */}
            {[
              [12, 15],
              [15, 25],
              [8, 40],
              [12, 55],
              [18, 65],
              [85, 15],
              [88, 35],
              [87, 55],
              [25, 10],
              [75, 65],
              [20, 45],
              [78, 60],
              [42, 70],
              [60, 68],
              [15, 35],
            ].map(([tx, ty], i) => (
              <g key={`tree-${i}`}>
                <circle
                  cx={tx}
                  cy={ty}
                  r={1.8 + (i % 3) * 0.3}
                  fill="#4A7A3A"
                  opacity={0.25 + (i % 4) * 0.05}
                />
                <circle
                  cx={tx + 0.5}
                  cy={ty - 0.3}
                  r={1.2 + (i % 3) * 0.2}
                  fill="#5A8A4A"
                  opacity={0.2 + (i % 3) * 0.05}
                />
              </g>
            ))}

            {/* Palm trees */}
            {[
              [45, 20],
              [55, 25],
              [60, 15],
              [40, 40],
              [65, 45],
              [30, 50],
              [70, 55],
              [48, 60],
            ].map(([px, py], i) => (
              <g key={`palm-${i}`}>
                <line
                  x1={px}
                  y1={py}
                  x2={px + 0.3}
                  y2={py - 2}
                  stroke="#8B7355"
                  strokeWidth="0.3"
                />
                <ellipse
                  cx={px + 0.3}
                  cy={py - 2.5}
                  rx="1.5"
                  ry="0.8"
                  fill="#3D7A2A"
                  opacity="0.4"
                  transform={`rotate(${i * 25}, ${px}, ${py - 2.5})`}
                />
              </g>
            ))}

            {/* Central Building Complex */}
            <g filter="url(#shadow)">
              {/* Main house/restaurant/bar */}
              <rect
                x="44"
                y="30"
                width="16"
                height="14"
                rx="0.8"
                fill="#E8DCC8"
                stroke="#B8A888"
                strokeWidth="0.3"
              />
              <rect
                x="45"
                y="31"
                width="14"
                height="5"
                rx="0.3"
                fill="#D4C8B4"
                stroke="#B8A888"
                strokeWidth="0.15"
              />
              <text
                x="52"
                y="34"
                textAnchor="middle"
                fontSize="1.3"
                fill="#4A3520"
                fontWeight="800"
                fontFamily="DM Sans"
              >
                TIA&apos;S COCINA
              </text>
              <text
                x="52"
                y="35.5"
                textAnchor="middle"
                fontSize="0.9"
                fill="#8B7355"
                fontFamily="DM Sans"
              >
                Restaurant &amp; Bar
              </text>

              {/* Kitchen */}
              <rect
                x="45"
                y="37"
                width="6"
                height="4"
                rx="0.3"
                fill="#DDD0BC"
                stroke="#B8A888"
                strokeWidth="0.15"
              />
              <text
                x="48"
                y="39.5"
                textAnchor="middle"
                fontSize="0.9"
                fill="#6B5335"
                fontWeight="600"
                fontFamily="DM Sans"
              >
                KITCHEN
              </text>

              {/* Front desk */}
              <rect
                x="52"
                y="37"
                width="6"
                height="4"
                rx="0.3"
                fill="#DDD0BC"
                stroke="#B8A888"
                strokeWidth="0.15"
              />
              <text
                x="55"
                y="39"
                textAnchor="middle"
                fontSize="0.8"
                fill="#6B5335"
                fontWeight="600"
                fontFamily="DM Sans"
              >
                FRONT
              </text>
              <text
                x="55"
                y="40"
                textAnchor="middle"
                fontSize="0.8"
                fill="#6B5335"
                fontWeight="600"
                fontFamily="DM Sans"
              >
                DESK
              </text>

              {/* Stairs to mirador */}
              <rect
                x="60"
                y="33"
                width="3"
                height="4"
                rx="0.2"
                fill="#C8B898"
                stroke="#B8A888"
                strokeWidth="0.15"
              />
              <text
                x="61.5"
                y="35.5"
                textAnchor="middle"
                fontSize="0.7"
                fill="#6B5335"
                fontWeight="600"
                fontFamily="DM Sans"
              >
                ↑ MIRADOR
              </text>
            </g>

            {/* Pool Area */}
            <rect
              x="56"
              y="25"
              width="10"
              height="6"
              rx="1"
              fill="url(#pool)"
              stroke="#0EA5E9"
              strokeWidth="0.3"
            />
            <text
              x="61"
              y="28.5"
              textAnchor="middle"
              fontSize="1.4"
              fill="#FFF"
              fontWeight="800"
              fontFamily="DM Sans"
              opacity="0.8"
            >
              PISCINA
            </text>
            {/* Jacuzzi */}
            <circle
              cx="58"
              cy="32"
              r="1.5"
              fill="#38BDF8"
              stroke="#0EA5E9"
              strokeWidth="0.2"
              opacity="0.8"
            />
            <text
              x="58"
              y="32.3"
              textAnchor="middle"
              fontSize="0.7"
              fill="#FFF"
              fontWeight="700"
              fontFamily="DM Sans"
            >
              HOT TUB
            </text>

            {/* Lounge area */}
            <rect
              x="50"
              y="24"
              width="6"
              height="4"
              rx="0.5"
              fill="#E8DCC8"
              stroke="#B8A888"
              strokeWidth="0.2"
              opacity="0.7"
            />
            <text
              x="53"
              y="26.5"
              textAnchor="middle"
              fontSize="0.9"
              fill="#6B5335"
              fontWeight="600"
              fontFamily="DM Sans"
            >
              LOUNGE
            </text>

            {/* Bathroom block */}
            <rect
              x="68"
              y="42"
              width="4"
              height="3"
              rx="0.3"
              fill="#DDD0BC"
              stroke="#B8A888"
              strokeWidth="0.15"
            />
            <text
              x="70"
              y="44"
              textAnchor="middle"
              fontSize="0.7"
              fill="#6B5335"
              fontWeight="600"
              fontFamily="DM Sans"
            >
              BAÑOS
            </text>

            {/* Kiosco */}
            <circle
              cx="76"
              cy="62"
              r="2.5"
              fill="#D4C8B4"
              stroke="#B8A888"
              strokeWidth="0.2"
            />
            <text
              x="76"
              y="62.3"
              textAnchor="middle"
              fontSize="0.9"
              fill="#6B5335"
              fontWeight="700"
              fontFamily="DM Sans"
            >
              KIOSKO
            </text>

            {/* Via de acceso */}
            <path
              d="M 78 68 Q 82 70, 90 72"
              fill="none"
              stroke="#C4A882"
              strokeWidth="1.5"
              opacity="0.4"
              strokeLinecap="round"
            />
            <text
              x="86"
              y="71"
              fontSize="0.9"
              fill="#8B7355"
              fontFamily="DM Sans"
              transform="rotate(10, 86, 71)"
            >
              VÍA DE ACCESO
            </text>

            {/* Admin building */}
            <rect
              x="28"
              y="62"
              width="6"
              height="5"
              rx="0.5"
              fill="#D4C8B4"
              stroke="#B8A888"
              strokeWidth="0.2"
            />
            <text
              x="31"
              y="64.5"
              textAnchor="middle"
              fontSize="0.7"
              fill="#6B5335"
              fontWeight="600"
              fontFamily="DM Sans"
            >
              ADMIN
            </text>
            <text
              x="31"
              y="65.5"
              textAnchor="middle"
              fontSize="0.7"
              fill="#6B5335"
              fontWeight="600"
              fontFamily="DM Sans"
            >
              &amp; TALLER
            </text>

            {/* Villa markers */}
            {filteredVillas.map((villa) => {
              const s = villaStatuses[villa.id] || {
                status: "vacant",
                guestCount: 0,
                cleaning: "approved",
                maintenance: "ok",
              };
              const cfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.vacant;
              const isFiltered = filter !== "all" && s.status !== filter;
              const isSelected = selected === villa.id;

              return (
                <g
                  key={villa.id}
                  className="villa-marker"
                  onClick={() => {
                    setSelected(villa.id);
                    setShowPanel(true);
                  }}
                  style={{ opacity: isFiltered ? 0.2 : 1 }}
                >
                  {/* Pulse ring for active statuses */}
                  {cfg.pulse && !isFiltered && (
                    <circle
                      cx={villa.x}
                      cy={villa.y}
                      r="3.5"
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth="0.3"
                      opacity="0.4"
                    >
                      <animate
                        attributeName="r"
                        from="3"
                        to="5"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                      <animate
                        attributeName="opacity"
                        from="0.5"
                        to="0"
                        dur="2s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Selection ring */}
                  {isSelected && (
                    <circle
                      cx={villa.x}
                      cy={villa.y}
                      r="4.5"
                      fill="none"
                      stroke="#0A0A0F"
                      strokeWidth="0.4"
                      strokeDasharray="1,0.5"
                    />
                  )}

                  {/* Villa building shape */}
                  <rect
                    x={villa.x - 3}
                    y={villa.y - 2}
                    width="6"
                    height="4"
                    rx="0.6"
                    fill={cfg.bg}
                    stroke={cfg.border}
                    strokeWidth={isSelected ? "0.5" : "0.3"}
                    transform={`rotate(${villa.angle}, ${villa.x}, ${villa.y})`}
                  />

                  {/* Patio indicator */}
                  <rect
                    x={villa.x - 1.5}
                    y={villa.y + 1.5}
                    width="3"
                    height="1.5"
                    rx="0.2"
                    fill={cfg.bg}
                    stroke={cfg.border}
                    strokeWidth="0.15"
                    opacity="0.6"
                    transform={`rotate(${villa.angle}, ${villa.x}, ${villa.y})`}
                  />

                  {/* Status dot */}
                  <circle
                    cx={villa.x + 2.5}
                    cy={villa.y - 1.5}
                    r="0.8"
                    fill={cfg.color}
                    stroke="#FFF"
                    strokeWidth="0.2"
                  />

                  {/* Villa name label */}
                  <rect
                    x={villa.x - 4.5}
                    y={villa.y + 3.5}
                    width="9"
                    height="2.2"
                    rx="0.4"
                    fill="#FFF"
                    stroke="#E2E8F0"
                    strokeWidth="0.15"
                    opacity="0.95"
                  />
                  <text
                    x={villa.x}
                    y={villa.y + 4.6}
                    textAnchor="middle"
                    fontSize="1"
                    fontWeight="800"
                    fill="#0A0A0F"
                    fontFamily="DM Sans"
                  >
                    {villa.name.replace("Villa ", "")}
                  </text>
                  <text
                    x={villa.x}
                    y={villa.y + 5.4}
                    textAnchor="middle"
                    fontSize="0.7"
                    fontWeight="600"
                    fill={cfg.color}
                    fontFamily="DM Sans"
                  >
                    {cfg.label}
                  </text>

                  {/* Guest count badge */}
                  {s.guestCount > 0 && (
                    <g>
                      <circle
                        cx={villa.x - 2.5}
                        cy={villa.y - 1.5}
                        r="0.9"
                        fill="#0A0A0F"
                      />
                      <text
                        x={villa.x - 2.5}
                        y={villa.y - 1.2}
                        textAnchor="middle"
                        fontSize="0.8"
                        fill="#FFF"
                        fontWeight="800"
                        fontFamily="DM Sans"
                      >
                        {s.guestCount}
                      </text>
                    </g>
                  )}

                  {/* VIP badge */}
                  {s.vipLevel && s.vipLevel !== "standard" && (
                    <g>
                      <rect
                        x={villa.x + 1}
                        y={villa.y - 3.5}
                        width="3"
                        height="1.2"
                        rx="0.3"
                        fill={s.vipLevel === "vvip" ? "#F59E0B" : "#8B5CF6"}
                      />
                      <text
                        x={villa.x + 2.5}
                        y={villa.y - 2.6}
                        textAnchor="middle"
                        fontSize="0.7"
                        fill="#FFF"
                        fontWeight="800"
                        fontFamily="DM Sans"
                      >
                        {s.vipLevel.toUpperCase()}
                      </text>
                    </g>
                  )}

                  {/* ADA symbol */}
                  {villa.ada && (
                    <text
                      x={villa.x}
                      y={villa.y + 0.3}
                      textAnchor="middle"
                      fontSize="1.5"
                    >
                      ♿
                    </text>
                  )}
                </g>
              );
            })}

            {/* North arrow */}
            <g transform="translate(8, 8)">
              <circle
                r="2.5"
                fill="#FFF"
                stroke="#333"
                strokeWidth="0.15"
                opacity="0.9"
              />
              <path d="M 0,-2 L 0.5,0.5 L 0,0 L -0.5,0.5 Z" fill="#333" />
              <text
                y="-1"
                textAnchor="middle"
                fontSize="0.9"
                fill="#333"
                fontWeight="800"
                fontFamily="DM Sans"
              >
                N
              </text>
            </g>

            {/* Scale */}
            <g transform="translate(8, 75)">
              <line
                x1="0"
                y1="0"
                x2="8"
                y2="0"
                stroke="#333"
                strokeWidth="0.2"
              />
              <line
                x1="0"
                y1="-0.3"
                x2="0"
                y2="0.3"
                stroke="#333"
                strokeWidth="0.2"
              />
              <line
                x1="8"
                y1="-0.3"
                x2="8"
                y2="0.3"
                stroke="#333"
                strokeWidth="0.2"
              />
              <text
                x="4"
                y="-0.5"
                textAnchor="middle"
                fontSize="0.8"
                fill="#333"
                fontFamily="DM Sans"
              >
                ~50m
              </text>
            </g>
          </svg>

          {/* Legend overlay */}
          <div
            style={{
              position: "absolute",
              bottom: 12,
              left: 12,
              background: "rgba(255,255,255,0.95)",
              borderRadius: 12,
              padding: "10px 14px",
              border: "1px solid #E2E8F0",
              backdropFilter: "blur(10px)",
              fontSize: 10,
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#0A0A0F",
                marginBottom: 6,
                fontSize: 11,
              }}
            >
              VILLA STATUS
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
                <span style={{ color: "#333", fontWeight: 600 }}>
                  {cfg.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail Panel */}
        {showPanel && sel && sel.villa && sel.status && (
          <div
            style={{
              width: 340,
              background: "#FFF",
              borderLeft: "1px solid #E2E8F0",
              overflowY: "auto",
              animation: "slideIn 0.3s ease",
            }}
          >
            {/* Villa header */}
            <div
              style={{
                background: `linear-gradient(135deg, ${STATUS_CONFIG[sel.status.status].color}15, ${STATUS_CONFIG[sel.status.status].color}05)`,
                padding: 20,
                borderBottom: "1px solid #E2E8F0",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                }}
              >
                <div>
                  <div
                    style={{ fontSize: 20, fontWeight: 900, color: "#0A0A0F" }}
                  >
                    {sel.villa.name}
                  </div>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    {sel.villa.type} • {sel.villa.maxGuests} guests max
                  </div>
                </div>
                <button
                  onClick={() => setShowPanel(false)}
                  style={{
                    background: "none",
                    border: "none",
                    fontSize: 18,
                    cursor: "pointer",
                    color: "#64748B",
                    padding: 4,
                  }}
                >
                  ✕
                </button>
              </div>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  marginTop: 10,
                  padding: "4px 12px",
                  borderRadius: 20,
                  background: STATUS_CONFIG[sel.status.status].bg,
                  border: `1px solid ${STATUS_CONFIG[sel.status.status].border}`,
                }}
              >
                <span style={{ fontSize: 10 }}>
                  {STATUS_CONFIG[sel.status.status].icon}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: STATUS_CONFIG[sel.status.status].color,
                  }}
                >
                  {STATUS_CONFIG[sel.status.status].label}
                </span>
              </div>
            </div>

            {/* Guest info */}
            {sel.status.guests && (
              <div
                style={{
                  padding: "16px 20px",
                  borderBottom: "1px solid #F1F5F9",
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#64748B",
                    letterSpacing: 0.5,
                    marginBottom: 8,
                  }}
                >
                  GUEST INFORMATION
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div
                    style={{ fontSize: 15, fontWeight: 800, color: "#0A0A0F" }}
                  >
                    {sel.status.guests}
                  </div>
                  {sel.status.vipLevel &&
                    sel.status.vipLevel !== "standard" && (
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          fontSize: 9,
                          fontWeight: 800,
                          background:
                            sel.status.vipLevel === "vvip"
                              ? "#F59E0B"
                              : "#8B5CF6",
                          color: "#FFF",
                        }}
                      >
                        {sel.status.vipLevel.toUpperCase()}
                      </span>
                    )}
                </div>
                <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
                  <div>
                    <div
                      style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}
                    >
                      GUESTS
                    </div>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 800,
                        color: "#0A0A0F",
                      }}
                    >
                      {sel.status.guestCount}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}
                    >
                      CHECK-IN
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0A0A0F",
                      }}
                    >
                      {sel.status.checkIn}
                    </div>
                  </div>
                  <div>
                    <div
                      style={{ fontSize: 9, color: "#94A3B8", fontWeight: 600 }}
                    >
                      CHECK-OUT
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 700,
                        color: "#0A0A0F",
                      }}
                    >
                      {sel.status.checkOut}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Cleaning Status */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                CLEANING STATUS
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 12px",
                  borderRadius: 8,
                  background: `${CLEANING_STATUS[sel.status.cleaning].color}10`,
                  border: `1px solid ${CLEANING_STATUS[sel.status.cleaning].color}30`,
                }}
              >
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: CLEANING_STATUS[sel.status.cleaning].color,
                  }}
                />
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: CLEANING_STATUS[sel.status.cleaning].color,
                  }}
                >
                  {CLEANING_STATUS[sel.status.cleaning].label}
                </span>
              </div>
            </div>

            {/* Maintenance */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                MAINTENANCE
              </div>
              {sel.status.maintenance === "ok" ? (
                <div
                  style={{ fontSize: 13, color: "#10B981", fontWeight: 700 }}
                >
                  ✅ All systems operational
                </div>
              ) : (
                <div
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: "#FFF7ED",
                    border: "1px solid #F59E0B30",
                    fontSize: 12,
                    color: "#92400E",
                    fontWeight: 600,
                  }}
                >
                  ⚠️ AC check needed — reported sluggish
                </div>
              )}
            </div>

            {/* Villa specs */}
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid #F1F5F9",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: 0.5,
                  marginBottom: 8,
                }}
              >
                VILLA SPECS
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  ["🛏️ Beds", `${sel.villa.beds} double`],
                  ["🛋️ Sofa Bed", sel.villa.sofa ? "Yes" : "No"],
                  ["👥 Capacity", `${sel.villa.maxGuests} guests`],
                  ["📍 Zone", sel.villa.zone.toUpperCase()],
                ].map(([label, val]) => (
                  <div key={String(label)}>
                    <div style={{ fontSize: 9, color: "#94A3B8" }}>{label}</div>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#0A0A0F",
                      }}
                    >
                      {val}
                    </div>
                  </div>
                ))}
              </div>
              {sel.villa.ada && (
                <div
                  style={{
                    marginTop: 8,
                    padding: "6px 10px",
                    borderRadius: 6,
                    background: "#EBF5FF",
                    border: "1px solid #0066CC30",
                    fontSize: 11,
                    color: "#0066CC",
                    fontWeight: 700,
                  }}
                >
                  ♿ ADA Accessible — Wheelchair accessible, single-story
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div style={{ padding: "16px 20px" }}>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#64748B",
                  letterSpacing: 0.5,
                  marginBottom: 10,
                }}
              >
                QUICK ACTIONS
              </div>
              {[
                {
                  label: "🧹 Start Cleaning Checklist",
                  color: "#F59E0B",
                  href: "/ops/housekeeping",
                },
                {
                  label: "🔧 Report Maintenance Issue",
                  color: "#8B5CF6",
                  href: "/ops/maintenance",
                },
                { label: "📋 View Guest Details", color: "#0066CC", href: "#" },
                { label: "💬 Message Guest", color: "#10B981", href: "#" },
                { label: "📊 Villa History", color: "#64748B", href: "#" },
              ].map((btn) => (
                <a
                  key={btn.label}
                  href={btn.href}
                  style={{
                    display: "block",
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: `1px solid ${btn.color}30`,
                    background: `${btn.color}08`,
                    color: btn.color,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: "pointer",
                    marginBottom: 6,
                    textAlign: "left",
                    transition: "all 0.15s",
                    fontFamily: "DM Sans",
                    textDecoration: "none",
                  }}
                >
                  {btn.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
