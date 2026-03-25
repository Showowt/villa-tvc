"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TVC INTERACTIVE PROPERTY MAP — Production Component
// Built from actual architectural plans (D. Arqui Restauro S.A.S)
// Plano N: 02 DE 31 | Fecha 3/4/2020
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface Villa {
  id: number;
  dbId: string;
  name: string;
  type: string;
  x: number;
  y: number;
  angle: number;
  labelColor: string;
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

// Villa data from architectural plans — exact positions from blueprint
// Positions based on D. Arqui Restauro S.A.S layout (viewBox 0 0 100 80)
const VILLAS: Villa[] = [
  // Top row near dock (north)
  {
    id: 1,
    dbId: "villa_1",
    name: "Villa Teresa",
    type: "Bungalow Tipo B",
    x: 28,
    y: 16,
    angle: -25,
    labelColor: "#F59E0B", // Yellow/Orange
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "north",
  },
  {
    id: 2,
    dbId: "villa_2",
    name: "Villa Aduana",
    type: "Bungalow Tipo B",
    x: 42,
    y: 14,
    angle: -10,
    labelColor: "#F97316", // Orange
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "north",
  },
  {
    id: 3,
    dbId: "villa_3",
    name: "Villa Trinidad",
    type: "Bungalow Tipo A",
    x: 56,
    y: 13,
    angle: 0,
    labelColor: "#EF4444", // Red
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "north",
  },
  // East side (right)
  {
    id: 4,
    dbId: "villa_4",
    name: "Villa Paz",
    type: "Bungalow Tipo A",
    x: 78,
    y: 20,
    angle: 15,
    labelColor: "#EC4899", // Pink
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "east",
  },
  {
    id: 5,
    dbId: "villa_5",
    name: "Villa San Pedro",
    type: "Bungalow Tipo B",
    x: 82,
    y: 32,
    angle: 20,
    labelColor: "#EC4899", // Pink
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "east",
  },
  {
    id: 6,
    dbId: "villa_6",
    name: "Villa San Diego",
    type: "Bungalow Tipo A",
    x: 80,
    y: 46,
    angle: 10,
    labelColor: "#A855F7", // Purple
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "east",
  },
  {
    id: 7,
    dbId: "villa_7",
    name: "Villa Coche",
    type: "Bungalow Tipo C",
    x: 76,
    y: 60,
    angle: 0,
    labelColor: "#EC4899", // Pink
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "south",
    ada: true, // Accesibilidad reducida
  },
  // West side (left)
  {
    id: 8,
    dbId: "villa_8",
    name: "Villa Pozo",
    type: "Bungalow Tipo B",
    x: 22,
    y: 34,
    angle: -15,
    labelColor: "#3B82F6", // Blue
    beds: 2,
    sofa: false,
    maxGuests: 4,
    zone: "west",
  },
  {
    id: 9,
    dbId: "villa_9",
    name: "Villa Santo Domingo",
    type: "Bungalow Tipo A",
    x: 28,
    y: 50,
    angle: -5,
    labelColor: "#3B82F6", // Blue
    beds: 2,
    sofa: true,
    maxGuests: 5,
    zone: "west",
  },
  {
    id: 10,
    dbId: "villa_10",
    name: "Villa Merced",
    type: "Bungalow Tipo B",
    x: 24,
    y: 66,
    angle: 0,
    labelColor: "#3B82F6", // Blue
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

export default function TVCPropertyMap() {
  const [selected, setSelected] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [time, setTime] = useState(new Date());
  const [showPanel, setShowPanel] = useState(false);
  const [villaStatuses, setVillaStatuses] = useState<{
    [key: number]: VillaStatus;
  }>({});
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    const today = new Date().toISOString().split("T")[0];

    const { data: statusData } = await supabase
      .from("villa_status")
      .select("*");
    const { data: bookingData } = await supabase
      .from("villa_bookings")
      .select("*")
      .in("status", ["confirmed", "checked_in"])
      .lte("check_in", today)
      .gte("check_out", today);

    const newStatuses: { [key: number]: VillaStatus } = {};

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

    if (statusData) {
      statusData.forEach(
        (s: {
          villa_id: string;
          status: string;
          cleaning_status: string;
          maintenance_status: string;
        }) => {
          const villa = VILLAS.find((v) => v.dbId === s.villa_id);
          if (villa && newStatuses[villa.id]) {
            if (s.status === "occupied")
              newStatuses[villa.id].status = "occupied";
            else if (s.status === "cleaning")
              newStatuses[villa.id].status = "cleaning";
            else if (s.status === "maintenance")
              newStatuses[villa.id].status = "maintenance";
            else newStatuses[villa.id].status = "vacant";

            if (s.cleaning_status === "dirty")
              newStatuses[villa.id].cleaning = "pending";
            else if (s.cleaning_status === "in_progress")
              newStatuses[villa.id].cleaning = "in_progress";
            else if (s.cleaning_status === "inspected")
              newStatuses[villa.id].cleaning = "submitted";
            else newStatuses[villa.id].cleaning = "approved";

            if (s.maintenance_status !== "ok")
              newStatuses[villa.id].maintenance = "ac_check";
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
        }) => {
          const villa = VILLAS.find((v) => v.dbId === b.villa_id);
          if (villa && newStatuses[villa.id]) {
            newStatuses[villa.id].guests = b.guest_name;
            newStatuses[villa.id].guestCount = b.num_adults + b.num_children;
            newStatuses[villa.id].checkIn = new Date(
              b.check_in,
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            newStatuses[villa.id].checkOut = new Date(
              b.check_out,
            ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
            newStatuses[villa.id].vipLevel =
              (b.vip_level as "standard" | "vip" | "vvip") || "standard";

            const checkInDate = b.check_in.split("T")[0];
            const checkOutDate = b.check_out.split("T")[0];

            if (checkInDate === today && b.status === "confirmed") {
              newStatuses[villa.id].status = "arriving";
            } else if (checkOutDate === today) {
              newStatuses[villa.id].status = "checkout";
            } else if (b.status === "checked_in") {
              newStatuses[villa.id].status = "occupied";
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
        @keyframes pulse-ring { 0% { transform: scale(1); opacity: 0.6; } 100% { transform: scale(2); opacity: 0; } }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        .villa-marker { cursor: pointer; }
        .villa-marker:hover .villa-bg { filter: brightness(1.1); }
        .villa-marker:hover .villa-label { font-weight: 900; }
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
            preserveAspectRatio="xMidYMid meet"
            style={{
              width: "100%",
              height: "100%",
              background:
                "linear-gradient(180deg, #E8F0E4 0%, #D4E4D0 50%, #C8D8C4 100%)",
            }}
          >
            <defs>
              <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4FA8D1" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#2E86AB" stopOpacity="0.6" />
              </linearGradient>
              <linearGradient id="pool" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="100%" stopColor="#0EA5E9" />
              </linearGradient>
              <pattern
                id="grass"
                patternUnits="userSpaceOnUse"
                width="3"
                height="3"
              >
                <circle cx="1" cy="1" r="0.2" fill="#6B8E5A" opacity="0.12" />
              </pattern>
              <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
                <feDropShadow
                  dx="0.2"
                  dy="0.2"
                  stdDeviation="0.3"
                  floodOpacity="0.15"
                />
              </filter>
            </defs>

            {/* Island shape */}
            <path
              d="M 8 8 Q 30 4, 55 5 Q 80 4, 92 10 Q 96 20, 94 40 Q 95 55, 90 65 Q 82 74, 60 76 Q 35 78, 18 72 Q 8 65, 6 50 Q 4 30, 8 8 Z"
              fill="url(#grass)"
              stroke="#7A9E6A"
              strokeWidth="0.4"
              opacity="0.6"
            />

            {/* Water around island */}
            <rect
              x="0"
              y="0"
              width="100"
              height="6"
              fill="url(#water)"
              opacity="0.5"
            />

            {/* Dock (Muelle Existente) */}
            <g filter="url(#shadow)">
              <rect
                x="44"
                y="2"
                width="12"
                height="4"
                rx="0.3"
                fill="#8B7355"
                stroke="#6B5335"
                strokeWidth="0.2"
              />
              <line
                x1="47"
                y1="2"
                x2="47"
                y2="0"
                stroke="#6B5335"
                strokeWidth="0.3"
              />
              <line
                x1="53"
                y1="2"
                x2="53"
                y2="0"
                stroke="#6B5335"
                strokeWidth="0.3"
              />
              <text
                x="50"
                y="4.5"
                textAnchor="middle"
                fontSize="1.2"
                fill="#4A3520"
                fontWeight="700"
              >
                MUELLE
              </text>
            </g>

            {/* Pathways (Caminos) */}
            <path
              d="M 50 6 Q 50 15, 50 30 Q 50 45, 50 60 Q 50 68, 60 72"
              fill="none"
              stroke="#C4A882"
              strokeWidth="1"
              opacity="0.5"
              strokeLinecap="round"
            />
            <path
              d="M 50 30 Q 35 30, 25 35"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.4"
              strokeLinecap="round"
            />
            <path
              d="M 50 30 Q 65 32, 78 35"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.4"
              strokeLinecap="round"
            />
            <path
              d="M 50 50 Q 35 52, 26 55"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.4"
              strokeLinecap="round"
            />
            <path
              d="M 50 50 Q 65 52, 75 58"
              fill="none"
              stroke="#C4A882"
              strokeWidth="0.8"
              opacity="0.4"
              strokeLinecap="round"
            />

            {/* Central Building Complex (Casa Principal) */}
            <g filter="url(#shadow)">
              {/* Main building - Restaurant/Bar */}
              <rect
                x="42"
                y="32"
                width="16"
                height="12"
                rx="0.5"
                fill="#E8DCC8"
                stroke="#B8A888"
                strokeWidth="0.25"
              />
              <rect
                x="43"
                y="33"
                width="14"
                height="4"
                rx="0.3"
                fill="#D4C8B4"
                stroke="#B8A888"
                strokeWidth="0.15"
              />
              <text
                x="50"
                y="35.5"
                textAnchor="middle"
                fontSize="1.1"
                fill="#4A3520"
                fontWeight="800"
              >
                RESTAURANTE
              </text>
              <text
                x="50"
                y="36.8"
                textAnchor="middle"
                fontSize="0.8"
                fill="#6B5335"
              >
                &amp; BAR
              </text>

              {/* Reception */}
              <rect
                x="43"
                y="38"
                width="6"
                height="4"
                rx="0.2"
                fill="#DDD0BC"
                stroke="#B8A888"
                strokeWidth="0.1"
              />
              <text
                x="46"
                y="40.5"
                textAnchor="middle"
                fontSize="0.7"
                fill="#6B5335"
                fontWeight="600"
              >
                RECEPCIÓN
              </text>

              {/* Terraza */}
              <rect
                x="50"
                y="38"
                width="6"
                height="4"
                rx="0.2"
                fill="#DDD0BC"
                stroke="#B8A888"
                strokeWidth="0.1"
              />
              <text
                x="53"
                y="40.5"
                textAnchor="middle"
                fontSize="0.7"
                fill="#6B5335"
                fontWeight="600"
              >
                TERRAZA
              </text>
            </g>

            {/* Pool (Piscina) */}
            <rect
              x="60"
              y="34"
              width="10"
              height="6"
              rx="0.8"
              fill="url(#pool)"
              stroke="#0EA5E9"
              strokeWidth="0.25"
            />
            <text
              x="65"
              y="37.8"
              textAnchor="middle"
              fontSize="1.2"
              fill="#FFF"
              fontWeight="800"
              opacity="0.9"
            >
              PISCINA
            </text>

            {/* Lounge next to pool */}
            <rect
              x="60"
              y="41"
              width="5"
              height="3"
              rx="0.3"
              fill="#E8DCC8"
              stroke="#B8A888"
              strokeWidth="0.15"
              opacity="0.8"
            />
            <text
              x="62.5"
              y="43"
              textAnchor="middle"
              fontSize="0.6"
              fill="#6B5335"
              fontWeight="600"
            >
              LOUNGE
            </text>

            {/* Admin & Taller */}
            <g filter="url(#shadow)">
              <rect
                x="38"
                y="48"
                width="8"
                height="5"
                rx="0.4"
                fill="#D4C8B4"
                stroke="#B8A888"
                strokeWidth="0.2"
              />
              <text
                x="42"
                y="50.5"
                textAnchor="middle"
                fontSize="0.7"
                fill="#6B5335"
                fontWeight="600"
              >
                ADMIN
              </text>
              <text
                x="42"
                y="51.6"
                textAnchor="middle"
                fontSize="0.6"
                fill="#6B5335"
              >
                &amp; TALLER
              </text>
            </g>

            {/* Kiosko */}
            <circle
              cx="68"
              cy="55"
              r="2.5"
              fill="#D4C8B4"
              stroke="#B8A888"
              strokeWidth="0.2"
            />
            <text
              x="68"
              y="55.4"
              textAnchor="middle"
              fontSize="0.8"
              fill="#6B5335"
              fontWeight="700"
            >
              KIOSKO
            </text>

            {/* Baños (16) */}
            <rect
              x="55"
              y="54"
              width="4"
              height="3"
              rx="0.3"
              fill="#DDD0BC"
              stroke="#B8A888"
              strokeWidth="0.15"
            />
            <text
              x="57"
              y="56"
              textAnchor="middle"
              fontSize="0.6"
              fill="#6B5335"
              fontWeight="600"
            >
              BAÑOS
            </text>

            {/* Escalera a Mirador */}
            <rect
              x="58"
              y="32"
              width="2"
              height="3"
              rx="0.15"
              fill="#C8B898"
              stroke="#B8A888"
              strokeWidth="0.1"
            />
            <text
              x="59"
              y="34"
              textAnchor="middle"
              fontSize="0.5"
              fill="#6B5335"
            >
              ↑
            </text>

            {/* Via de Acceso */}
            <path
              d="M 75 68 Q 82 70, 92 72"
              fill="none"
              stroke="#C4A882"
              strokeWidth="1.5"
              opacity="0.4"
              strokeLinecap="round"
            />
            <text
              x="85"
              y="70"
              fontSize="0.8"
              fill="#8B7355"
              transform="rotate(8, 85, 70)"
            >
              VÍA DE ACCESO
            </text>

            {/* Trees and vegetation */}
            {[
              [15, 12],
              [12, 25],
              [10, 45],
              [15, 58],
              [8, 68],
              [88, 12],
              [90, 30],
              [88, 48],
              [85, 68],
              [35, 8],
              [65, 8],
              [75, 70],
              [20, 75],
            ].map(([tx, ty], i) => (
              <g key={`tree-${i}`}>
                <circle
                  cx={tx}
                  cy={ty}
                  r={1.5 + (i % 2) * 0.5}
                  fill="#4A7A3A"
                  opacity={0.2 + (i % 3) * 0.05}
                />
              </g>
            ))}

            {/* Palm trees */}
            {[
              [38, 25],
              [62, 25],
              [72, 28],
              [28, 42],
              [72, 48],
              [55, 65],
              [32, 72],
            ].map(([px, py], i) => (
              <g key={`palm-${i}`}>
                <line
                  x1={px}
                  y1={py}
                  x2={px}
                  y2={py - 1.5}
                  stroke="#8B7355"
                  strokeWidth="0.25"
                />
                <ellipse
                  cx={px}
                  cy={py - 2}
                  rx="1.2"
                  ry="0.6"
                  fill="#3D7A2A"
                  opacity="0.35"
                />
              </g>
            ))}

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
                  style={{ opacity: isFiltered ? 0.25 : 1 }}
                >
                  {/* Pulse ring for active statuses */}
                  {cfg.pulse && !isFiltered && (
                    <circle
                      cx={villa.x}
                      cy={villa.y}
                      r="4"
                      fill="none"
                      stroke={cfg.color}
                      strokeWidth="0.25"
                      opacity="0.5"
                    >
                      <animate
                        attributeName="r"
                        from="3"
                        to="5.5"
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
                      r="5"
                      fill="none"
                      stroke="#0A0A0F"
                      strokeWidth="0.35"
                      strokeDasharray="1,0.5"
                    >
                      <animate
                        attributeName="stroke-dashoffset"
                        from="0"
                        to="3"
                        dur="0.5s"
                        repeatCount="indefinite"
                      />
                    </circle>
                  )}

                  {/* Villa building - using villa's label color */}
                  <rect
                    className="villa-bg"
                    x={villa.x - 3}
                    y={villa.y - 2}
                    width="6"
                    height="4"
                    rx="0.4"
                    fill={s.status === "vacant" ? "#F8FAFC" : cfg.bg}
                    stroke={villa.labelColor}
                    strokeWidth={isSelected ? "0.5" : "0.3"}
                    transform={`rotate(${villa.angle}, ${villa.x}, ${villa.y})`}
                    style={{ transition: "filter 0.2s ease" }}
                  />

                  {/* Status indicator dot */}
                  <circle
                    cx={villa.x + 2.2}
                    cy={villa.y - 1.2}
                    r="0.7"
                    fill={cfg.color}
                    stroke="#FFF"
                    strokeWidth="0.15"
                  />

                  {/* Villa name label background */}
                  <rect
                    x={villa.x - 5.5}
                    y={villa.y + 2.5}
                    width="11"
                    height="2.8"
                    rx="0.3"
                    fill={villa.labelColor}
                    stroke={villa.labelColor}
                    strokeWidth="0.1"
                    opacity="0.95"
                  />

                  {/* Villa name */}
                  <text
                    className="villa-label"
                    x={villa.x}
                    y={villa.y + 4.2}
                    textAnchor="middle"
                    fontSize="1.1"
                    fontWeight="700"
                    fill="#FFF"
                    fontFamily="DM Sans"
                    style={{ transition: "font-weight 0.15s ease" }}
                  >
                    {villa.name.replace("Villa ", "")}
                  </text>

                  {/* Guest count badge */}
                  {s.guestCount > 0 && (
                    <g>
                      <circle
                        cx={villa.x - 2.2}
                        cy={villa.y - 1.2}
                        r="0.8"
                        fill="#0A0A0F"
                      />
                      <text
                        x={villa.x - 2.2}
                        y={villa.y - 0.9}
                        textAnchor="middle"
                        fontSize="0.75"
                        fill="#FFF"
                        fontWeight="800"
                      >
                        {s.guestCount}
                      </text>
                    </g>
                  )}

                  {/* VIP badge */}
                  {s.vipLevel && s.vipLevel !== "standard" && (
                    <g>
                      <rect
                        x={villa.x + 0.5}
                        y={villa.y - 3.2}
                        width="2.8"
                        height="1.1"
                        rx="0.25"
                        fill={s.vipLevel === "vvip" ? "#F59E0B" : "#8B5CF6"}
                      />
                      <text
                        x={villa.x + 1.9}
                        y={villa.y - 2.4}
                        textAnchor="middle"
                        fontSize="0.6"
                        fill="#FFF"
                        fontWeight="800"
                      >
                        {s.vipLevel.toUpperCase()}
                      </text>
                    </g>
                  )}

                  {/* ADA symbol */}
                  {villa.ada && (
                    <text
                      x={villa.x}
                      y={villa.y + 0.4}
                      textAnchor="middle"
                      fontSize="1.3"
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
                strokeWidth="0.12"
                opacity="0.9"
              />
              <path d="M 0,-1.8 L 0.4,0.3 L 0,0 L -0.4,0.3 Z" fill="#333" />
              <text
                y="-0.8"
                textAnchor="middle"
                fontSize="0.8"
                fill="#333"
                fontWeight="800"
              >
                N
              </text>
            </g>

            {/* Scale */}
            <g transform="translate(8, 76)">
              <line
                x1="0"
                y1="0"
                x2="8"
                y2="0"
                stroke="#333"
                strokeWidth="0.15"
              />
              <line
                x1="0"
                y1="-0.25"
                x2="0"
                y2="0.25"
                stroke="#333"
                strokeWidth="0.15"
              />
              <line
                x1="8"
                y1="-0.25"
                x2="8"
                y2="0.25"
                stroke="#333"
                strokeWidth="0.15"
              />
              <text
                x="4"
                y="-0.4"
                textAnchor="middle"
                fontSize="0.7"
                fill="#333"
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
              borderRadius: 10,
              padding: "10px 14px",
              border: "1px solid #E2E8F0",
              backdropFilter: "blur(8px)",
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
                <span style={{ color: "#333", fontWeight: 600 }}>
                  {cfg.labelEs}
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
            <div
              style={{
                background: `linear-gradient(135deg, ${sel.villa.labelColor}20, ${sel.villa.labelColor}08)`,
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
                    {sel.villa.type} • Max {sel.villa.maxGuests} huéspedes
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
                  {STATUS_CONFIG[sel.status.status].labelEs}
                </span>
              </div>
            </div>

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
                  INFORMACIÓN HUÉSPED
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
                      HUÉSPEDES
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
                ESTADO LIMPIEZA
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
                  {CLEANING_STATUS[sel.status.cleaning].labelEs}
                </span>
              </div>
            </div>

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
                MANTENIMIENTO
              </div>
              {sel.status.maintenance === "ok" ? (
                <div
                  style={{ fontSize: 13, color: "#10B981", fontWeight: 700 }}
                >
                  ✅ Todos los sistemas operativos
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
                  ⚠️ Revisión de AC necesaria
                </div>
              )}
            </div>

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
                ESPECIFICACIONES
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                }}
              >
                {[
                  ["🛏️ Camas", `${sel.villa.beds} dobles`],
                  ["🛋️ Sofá Cama", sel.villa.sofa ? "Sí" : "No"],
                  ["👥 Capacidad", `${sel.villa.maxGuests} huéspedes`],
                  ["📍 Zona", sel.villa.zone.toUpperCase()],
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
                  ♿ Accesibilidad Reducida — Acceso para silla de ruedas
                </div>
              )}
            </div>

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
                ACCIONES RÁPIDAS
              </div>
              {[
                {
                  label: "🧹 Iniciar Checklist Limpieza",
                  color: "#F59E0B",
                  href: "/ops/housekeeping",
                },
                {
                  label: "🔧 Reportar Mantenimiento",
                  color: "#8B5CF6",
                  href: "/ops/maintenance",
                },
                {
                  label: "📋 Ver Detalles Huésped",
                  color: "#0066CC",
                  href: "/ops/villa-map",
                },
                { label: "💬 Contactar Huésped", color: "#10B981", href: "#" },
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
