"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface VillaBooking {
  id: string;
  villa_id: string;
  guest_name: string;
  guest_email?: string;
  guest_phone?: string;
  guest_country?: string;
  num_adults: number;
  num_children: number;
  check_in: string;
  check_out: string;
  actual_check_in?: string;
  actual_check_out?: string;
  status: "confirmed" | "checked_in" | "checked_out" | "cancelled" | "no_show";
  booking_source?: string;
  special_requests?: string;
  vip_level?: "standard" | "vip" | "vvip";
  notes?: string;
  arrival_time?: string;
  boat_preference?: "3pm" | "6:30pm" | "private" | "other";
  cleaning_deadline?: string;
}

interface VillaStatus {
  villa_id: string;
  status: "vacant" | "occupied" | "cleaning" | "maintenance" | "blocked";
  current_booking_id?: string;
  cleaning_status: "clean" | "dirty" | "in_progress" | "inspected";
  maintenance_status: "ok" | "minor_issues" | "major_issues" | "out_of_service";
  last_cleaned_at?: string;
  notes?: string;
}

interface VillaMove {
  id: string;
  booking_id: string;
  from_villa_id: string;
  to_villa_id: string;
  move_reason: string;
  moved_at: string;
  moved_by?: string;
  notes?: string;
}

interface Villa {
  id: string;
  name: string;
  type: string;
  position: { x: number; y: number };
  size: { w: number; h: number };
}

// Villa positions on the map (relative percentages)
const VILLA_LAYOUT: Villa[] = [
  // Garden View Villas (left side)
  {
    id: "villa_1",
    name: "Villa 1",
    type: "Garden View",
    position: { x: 5, y: 20 },
    size: { w: 12, h: 15 },
  },
  {
    id: "villa_2",
    name: "Villa 2",
    type: "Garden View",
    position: { x: 5, y: 40 },
    size: { w: 12, h: 15 },
  },
  // Pool View Villas (center-left)
  {
    id: "villa_3",
    name: "Villa 3",
    type: "Pool View",
    position: { x: 22, y: 20 },
    size: { w: 12, h: 15 },
  },
  {
    id: "villa_4",
    name: "Villa 4",
    type: "Pool View",
    position: { x: 22, y: 40 },
    size: { w: 12, h: 15 },
  },
  // Ocean View Villas (center-right)
  {
    id: "villa_5",
    name: "Villa 5",
    type: "Ocean View",
    position: { x: 39, y: 20 },
    size: { w: 12, h: 15 },
  },
  {
    id: "villa_6",
    name: "Villa 6",
    type: "Ocean View",
    position: { x: 39, y: 40 },
    size: { w: 12, h: 15 },
  },
  // Premium Ocean Villas (right side)
  {
    id: "villa_7",
    name: "Villa 7",
    type: "Premium Ocean",
    position: { x: 56, y: 20 },
    size: { w: 12, h: 15 },
  },
  {
    id: "villa_8",
    name: "Villa 8",
    type: "Premium Ocean",
    position: { x: 56, y: 40 },
    size: { w: 12, h: 15 },
  },
  // Honeymoon Suites (far right)
  {
    id: "villa_9",
    name: "Villa 9",
    type: "Honeymoon Suite",
    position: { x: 73, y: 20 },
    size: { w: 12, h: 15 },
  },
  {
    id: "villa_10",
    name: "Villa 10",
    type: "Honeymoon Suite",
    position: { x: 73, y: 40 },
    size: { w: 12, h: 15 },
  },
  // Main House
  {
    id: "main_house",
    name: "Casa Principal",
    type: "Main House",
    position: { x: 35, y: 70 },
    size: { w: 20, h: 18 },
  },
];

const STATUS_COLORS = {
  vacant: {
    bg: "bg-emerald-100",
    border: "border-emerald-400",
    text: "text-emerald-700",
  },
  occupied: {
    bg: "bg-blue-100",
    border: "border-blue-400",
    text: "text-blue-700",
  },
  cleaning: {
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-700",
  },
  maintenance: {
    bg: "bg-rose-100",
    border: "border-rose-400",
    text: "text-rose-700",
  },
  blocked: {
    bg: "bg-slate-200",
    border: "border-slate-400",
    text: "text-slate-700",
  },
};

const VIP_BADGES = {
  standard: null,
  vip: { bg: "bg-purple-500", text: "VIP" },
  vvip: { bg: "bg-amber-500", text: "VVIP" },
};

// Helper to calculate cleaning deadline urgency
function getCleaningDeadlineStatus(deadline: string | undefined): {
  urgency: "normal" | "warning" | "critical" | "overdue" | null;
  countdown: string | null;
} {
  if (!deadline) return { urgency: null, countdown: null };

  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate.getTime() - now.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 0) {
    const overdueMins = Math.abs(diffMinutes);
    const hours = Math.floor(overdueMins / 60);
    const mins = overdueMins % 60;
    return {
      urgency: "overdue",
      countdown: hours > 0 ? `-${hours}h${mins}m` : `-${mins}m`,
    };
  } else if (diffMinutes <= 30) {
    return { urgency: "critical", countdown: `${diffMinutes}m` };
  } else if (diffMinutes <= 60) {
    return { urgency: "warning", countdown: `${diffMinutes}m` };
  } else {
    const hours = Math.floor(diffMinutes / 60);
    const mins = diffMinutes % 60;
    return { urgency: "normal", countdown: `${hours}h${mins}m` };
  }
}

export default function VillaMapPage() {
  const [villaStatuses, setVillaStatuses] = useState<{
    [key: string]: VillaStatus;
  }>({});
  const [bookings, setBookings] = useState<{ [key: string]: VillaBooking }>({});
  const [selectedVilla, setSelectedVilla] = useState<Villa | null>(null);
  const [loading, setLoading] = useState(true);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [moveHistory, setMoveHistory] = useState<VillaMove[]>([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [villaHistory, setVillaHistory] = useState<{
    recent_guests: Array<{
      id: string;
      guest_name: string;
      guest_country?: string;
      check_in: string;
      check_out: string;
      vip_level?: string;
    }>;
    maintenance_reports: Array<{
      id: string;
      title: string;
      priority: string;
      status: string;
      created_at: string;
    }>;
    cleaning_checklists: Array<{
      id: string;
      type: string;
      date: string;
      status: string;
      quality_score?: number;
    }>;
    patterns: string[];
  } | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // New guest form
  const [newGuest, setNewGuest] = useState<{
    guest_name: string;
    guest_email: string;
    guest_phone: string;
    guest_country: string;
    num_adults: number;
    num_children: number;
    check_in: string;
    check_out: string;
    special_requests: string;
    vip_level: "standard" | "vip" | "vvip";
    arrival_time: string;
    boat_preference: "3pm" | "6:30pm" | "private" | "other";
  }>({
    guest_name: "",
    guest_email: "",
    guest_phone: "",
    guest_country: "",
    num_adults: 1,
    num_children: 0,
    check_in: new Date().toISOString().split("T")[0],
    check_out: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    special_requests: "",
    vip_level: "standard",
    arrival_time: "15:00",
    boat_preference: "3pm",
  });

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    const today = new Date().toISOString().split("T")[0];

    // Load villa statuses
    const { data: statusData } = await supabase
      .from("villa_status")
      .select("*");

    if (statusData) {
      const statusMap: { [key: string]: VillaStatus } = {};
      (statusData as VillaStatus[]).forEach((s: VillaStatus) => {
        statusMap[s.villa_id] = s;
      });
      setVillaStatuses(statusMap);
    }

    // Load active bookings (checked_in or confirmed with today's date)
    const { data: bookingData } = await supabase
      .from("villa_bookings")
      .select("*, arrival_time, boat_preference, cleaning_deadline")
      .in("status", ["confirmed", "checked_in"])
      .lte("check_in", today)
      .gte("check_out", today);

    if (bookingData) {
      const bookingMap: { [key: string]: VillaBooking } = {};
      (bookingData as VillaBooking[]).forEach((b: VillaBooking) => {
        bookingMap[b.villa_id] = b;
      });
      setBookings(bookingMap);
    }

    // Also load upcoming arrivals today (for cleaning deadline tracking)
    const { data: arrivalsData } = await supabase
      .from("villa_bookings")
      .select("villa_id, cleaning_deadline, guest_name, arrival_time")
      .eq("check_in", today)
      .eq("status", "confirmed");

    if (arrivalsData) {
      // Merge cleaning deadline info into bookings map for villas awaiting arrival
      arrivalsData.forEach(
        (arrival: {
          villa_id: string;
          cleaning_deadline?: string;
          guest_name: string;
          arrival_time?: string;
        }) => {
          if (!bookingMap[arrival.villa_id]) {
            // Create a minimal booking entry for villas being cleaned for arrivals
            bookingMap[arrival.villa_id] = {
              id: "",
              villa_id: arrival.villa_id,
              guest_name: arrival.guest_name,
              num_adults: 0,
              num_children: 0,
              check_in: today,
              check_out: today,
              status: "confirmed",
              cleaning_deadline: arrival.cleaning_deadline,
              arrival_time: arrival.arrival_time,
            } as VillaBooking;
          }
        },
      );
      setBookings({ ...bookingMap });
    }

    // Load recent move history
    const { data: moveData } = await supabase
      .from("villa_moves")
      .select("*")
      .order("moved_at", { ascending: false })
      .limit(10);

    if (moveData) {
      setMoveHistory(moveData as VillaMove[]);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();

    // Set up real-time subscription
    const supabase = createBrowserClient();
    const channel = supabase
      .channel("villa-status-changes")
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

  const handleCheckIn = async () => {
    if (!selectedVilla) return;
    const booking = bookings[selectedVilla.id];
    if (!booking) return;

    const supabase = createBrowserClient() as SupabaseAny;

    // Update booking status
    await supabase
      .from("villa_bookings")
      .update({
        status: "checked_in",
        actual_check_in: new Date().toISOString(),
      })
      .eq("id", booking.id);

    // Update villa status
    await supabase
      .from("villa_status")
      .update({
        status: "occupied",
        current_booking_id: booking.id,
      })
      .eq("villa_id", selectedVilla.id);

    setShowCheckInModal(false);
    loadData();
  };

  const handleCheckOut = async () => {
    if (!selectedVilla) return;
    const booking = bookings[selectedVilla.id];
    if (!booking) return;

    const supabase = createBrowserClient() as SupabaseAny;

    // Update booking status
    await supabase
      .from("villa_bookings")
      .update({
        status: "checked_out",
        actual_check_out: new Date().toISOString(),
      })
      .eq("id", booking.id);

    // Update villa status
    await supabase
      .from("villa_status")
      .update({
        status: "cleaning",
        current_booking_id: null,
        cleaning_status: "dirty",
      })
      .eq("villa_id", selectedVilla.id);

    setSelectedVilla(null);
    loadData();
  };

  const handleMoveGuest = async (toVillaId: string, reason: string) => {
    if (!selectedVilla) return;
    const booking = bookings[selectedVilla.id];
    if (!booking) return;

    const supabase = createBrowserClient() as SupabaseAny;

    // Record the move
    await supabase.from("villa_moves").insert({
      booking_id: booking.id,
      from_villa_id: selectedVilla.id,
      to_villa_id: toVillaId,
      move_reason: reason,
      moved_by: "Admin",
    });

    // Update booking villa
    await supabase
      .from("villa_bookings")
      .update({ villa_id: toVillaId })
      .eq("id", booking.id);

    // Update old villa status
    await supabase
      .from("villa_status")
      .update({
        status: "cleaning",
        current_booking_id: null,
        cleaning_status: "dirty",
      })
      .eq("villa_id", selectedVilla.id);

    // Update new villa status
    await supabase
      .from("villa_status")
      .update({
        status: "occupied",
        current_booking_id: booking.id,
      })
      .eq("villa_id", toVillaId);

    setShowMoveModal(false);
    setSelectedVilla(null);
    loadData();
  };

  const handleAddGuest = async () => {
    if (!selectedVilla || !newGuest.guest_name) return;

    const supabase = createBrowserClient() as SupabaseAny;

    // Create booking
    const { data: booking, error } = await supabase
      .from("villa_bookings")
      .insert({
        villa_id: selectedVilla.id,
        ...newGuest,
        status: "checked_in",
        actual_check_in: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[addGuest]", error);
      alert("Error adding guest");
      return;
    }

    // Update villa status
    await supabase
      .from("villa_status")
      .update({
        status: "occupied",
        current_booking_id: booking.id,
      })
      .eq("villa_id", selectedVilla.id);

    setShowAddGuestModal(false);
    setNewGuest({
      guest_name: "",
      guest_email: "",
      guest_phone: "",
      guest_country: "",
      num_adults: 1,
      num_children: 0,
      check_in: new Date().toISOString().split("T")[0],
      check_out: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      special_requests: "",
      vip_level: "standard",
      arrival_time: "15:00",
      boat_preference: "3pm",
    });
    loadData();
  };

  const handleCancelBooking = async () => {
    if (!selectedVilla || !cancellationReason) return;
    const booking = bookings[selectedVilla.id];
    if (!booking) return;

    try {
      const response = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: booking.id,
          cancellation_reason: cancellationReason,
          cancelled_by: "Admin",
        }),
      });

      if (response.ok) {
        setShowCancelModal(false);
        setCancellationReason("");
        setSelectedVilla(null);
        loadData();
      } else {
        const data = await response.json();
        alert(data.error || "Error cancelling booking");
      }
    } catch (error) {
      console.error("[cancelBooking]", error);
      alert("Error cancelling booking");
    }
  };

  const loadVillaHistory = async (villaId: string) => {
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/villa/history?villa_id=${villaId}`);
      if (response.ok) {
        const data = await response.json();
        setVillaHistory(data);
        setShowHistoryModal(true);
      }
    } catch (error) {
      console.error("[loadVillaHistory]", error);
    }
    setLoadingHistory(false);
  };

  const handleStatusChange = async (
    villaId: string,
    newStatus: VillaStatus["status"],
  ) => {
    const supabase = createBrowserClient() as SupabaseAny;
    await supabase
      .from("villa_status")
      .update({ status: newStatus })
      .eq("villa_id", villaId);
    loadData();
  };

  const getVillaColor = (villaId: string) => {
    const status = villaStatuses[villaId]?.status || "vacant";
    return STATUS_COLORS[status];
  };

  const getDaysRemaining = (checkOut: string) => {
    const today = new Date();
    const out = new Date(checkOut);
    const diff = Math.ceil(
      (out.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return diff;
  };

  // Calculate stats
  const stats = {
    occupied: Object.values(villaStatuses).filter(
      (s) => s.status === "occupied",
    ).length,
    vacant: Object.values(villaStatuses).filter((s) => s.status === "vacant")
      .length,
    cleaning: Object.values(villaStatuses).filter(
      (s) => s.status === "cleaning",
    ).length,
    maintenance: Object.values(villaStatuses).filter(
      (s) => s.status === "maintenance",
    ).length,
    totalGuests: Object.values(bookings).reduce(
      (sum, b) => sum + b.num_adults + b.num_children,
      0,
    ),
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
          🗺️ Villa Map - Live Occupancy
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Real-time villa status, guest tracking, and room management
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-2xl font-black text-blue-600">
            {stats.occupied}
          </div>
          <div className="text-xs text-blue-600 font-medium">Ocupadas</div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="text-2xl font-black text-emerald-600">
            {stats.vacant}
          </div>
          <div className="text-xs text-emerald-600 font-medium">Vacías</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="text-2xl font-black text-amber-600">
            {stats.cleaning}
          </div>
          <div className="text-xs text-amber-600 font-medium">Limpieza</div>
        </div>
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4">
          <div className="text-2xl font-black text-rose-600">
            {stats.maintenance}
          </div>
          <div className="text-xs text-rose-600 font-medium">Mantenimiento</div>
        </div>
        <div className="bg-purple-50 rounded-xl border border-purple-200 p-4">
          <div className="text-2xl font-black text-purple-600">
            {stats.totalGuests}
          </div>
          <div className="text-xs text-purple-600 font-medium">
            Huéspedes Hoy
          </div>
        </div>
      </div>

      {/* Interactive Map */}
      <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-2xl border border-blue-200 p-4 mb-6 relative overflow-hidden">
        {/* Ocean background */}
        <div className="absolute top-0 right-0 w-full h-16 bg-gradient-to-b from-cyan-400/30 to-transparent" />
        <div className="absolute top-2 right-4 text-cyan-600 text-xs font-bold">
          🌊 OCEAN
        </div>

        {/* Pool area */}
        <div
          className="absolute bg-cyan-300/50 rounded-xl border-2 border-cyan-400"
          style={{ left: "30%", top: "55%", width: "25%", height: "12%" }}
        >
          <div className="absolute inset-0 flex items-center justify-center text-cyan-700 text-xs font-bold">
            🏊 POOL
          </div>
        </div>

        {/* Garden */}
        <div className="absolute left-2 top-2 text-emerald-600 text-xs font-bold">
          🌴 GARDEN
        </div>

        {/* Villa cards on map */}
        <div className="relative h-[500px]">
          {VILLA_LAYOUT.map((villa) => {
            const status = villaStatuses[villa.id];
            const booking = bookings[villa.id];
            const colors = getVillaColor(villa.id);
            const isSelected = selectedVilla?.id === villa.id;
            const vipBadge = booking?.vip_level
              ? VIP_BADGES[booking.vip_level]
              : null;
            const deadlineStatus = getCleaningDeadlineStatus(
              booking?.cleaning_deadline,
            );

            return (
              <button
                key={villa.id}
                onClick={() => setSelectedVilla(villa)}
                className={`absolute rounded-xl border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg ${colors.bg} ${colors.border} ${
                  isSelected
                    ? "ring-4 ring-blue-500 ring-opacity-50 shadow-xl scale-105"
                    : ""
                } ${
                  deadlineStatus.urgency === "overdue"
                    ? "ring-2 ring-red-500 animate-pulse"
                    : deadlineStatus.urgency === "critical"
                      ? "ring-2 ring-red-400"
                      : ""
                }`}
                style={{
                  left: `${villa.position.x}%`,
                  top: `${villa.position.y}%`,
                  width: `${villa.size.w}%`,
                  height: `${villa.size.h}%`,
                }}
              >
                <div className="h-full flex flex-col items-center justify-center p-1 text-center">
                  <div className={`font-bold text-xs ${colors.text}`}>
                    {villa.name}
                  </div>
                  <div className="text-[10px] text-slate-500">{villa.type}</div>

                  {/* Status indicator */}
                  <div className={`mt-1 text-[10px] font-bold ${colors.text}`}>
                    {status?.status === "occupied" && "👤"}
                    {status?.status === "vacant" && "✨"}
                    {status?.status === "cleaning" && "🧹"}
                    {status?.status === "maintenance" && "🔧"}
                  </div>

                  {/* Guest name if occupied */}
                  {booking && (
                    <div className="text-[9px] text-slate-600 truncate w-full px-1">
                      {booking.guest_name.split(" ")[0]}
                    </div>
                  )}

                  {/* Cleaning deadline indicator */}
                  {status?.status === "cleaning" &&
                    deadlineStatus.countdown && (
                      <div
                        className={`text-[8px] font-bold px-1 rounded ${
                          deadlineStatus.urgency === "overdue"
                            ? "bg-red-500 text-white"
                            : deadlineStatus.urgency === "critical"
                              ? "bg-red-100 text-red-600"
                              : deadlineStatus.urgency === "warning"
                                ? "bg-amber-100 text-amber-600"
                                : "bg-emerald-100 text-emerald-600"
                        }`}
                      >
                        {deadlineStatus.countdown}
                      </div>
                    )}

                  {/* VIP badge */}
                  {vipBadge && (
                    <div
                      className={`absolute -top-1 -right-1 ${vipBadge.bg} text-white text-[8px] font-bold px-1 rounded`}
                    >
                      {vipBadge.text}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-4 justify-center text-xs">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1">
              <div
                className={`w-3 h-3 rounded ${colors.bg} ${colors.border} border`}
              />
              <span className="text-slate-600 capitalize">{status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Selected Villa Details */}
      {selectedVilla && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">
                {selectedVilla.name}
              </h2>
              <p className="text-sm text-slate-500">{selectedVilla.type}</p>
            </div>
            <button
              onClick={() => setSelectedVilla(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          </div>

          {/* Villa Status */}
          <div className="flex gap-2 mb-4">
            {(
              [
                "vacant",
                "occupied",
                "cleaning",
                "maintenance",
                "blocked",
              ] as const
            ).map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(selectedVilla.id, status)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  villaStatuses[selectedVilla.id]?.status === status
                    ? `${STATUS_COLORS[status].bg} ${STATUS_COLORS[status].border} border-2 ${STATUS_COLORS[status].text}`
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {status === "vacant" && "✨ Vacía"}
                {status === "occupied" && "👤 Ocupada"}
                {status === "cleaning" && "🧹 Limpieza"}
                {status === "maintenance" && "🔧 Mantenimiento"}
                {status === "blocked" && "🚫 Bloqueada"}
              </button>
            ))}
          </div>

          {/* Guest Info if occupied */}
          {bookings[selectedVilla.id] ? (
            <div className="bg-blue-50 rounded-xl p-4 mb-4">
              <div className="flex justify-between items-start">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {bookings[selectedVilla.id].guest_name}
                    </span>
                    {bookings[selectedVilla.id].vip_level !== "standard" && (
                      <Badge
                        color={
                          bookings[selectedVilla.id].vip_level === "vvip"
                            ? "#F59E0B"
                            : "#8B5CF6"
                        }
                      >
                        {bookings[selectedVilla.id].vip_level?.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 mt-1">
                    {bookings[selectedVilla.id].guest_country && (
                      <span>{bookings[selectedVilla.id].guest_country} • </span>
                    )}
                    {bookings[selectedVilla.id].num_adults} adulto(s)
                    {bookings[selectedVilla.id].num_children > 0 && (
                      <span>
                        , {bookings[selectedVilla.id].num_children} niño(s)
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-500 mt-1">
                    📅 Check-out:{" "}
                    {new Date(
                      bookings[selectedVilla.id].check_out,
                    ).toLocaleDateString("es-CO")}
                    <span
                      className={`ml-2 font-bold ${
                        getDaysRemaining(
                          bookings[selectedVilla.id].check_out,
                        ) <= 1
                          ? "text-rose-500"
                          : "text-slate-600"
                      }`}
                    >
                      ({getDaysRemaining(bookings[selectedVilla.id].check_out)}{" "}
                      días)
                    </span>
                  </div>
                  {bookings[selectedVilla.id].special_requests && (
                    <div className="mt-2 text-sm bg-amber-50 p-2 rounded-lg border border-amber-200">
                      <span className="font-bold text-amber-700">
                        ⚠️ Notas:{" "}
                      </span>
                      <span className="text-amber-600">
                        {bookings[selectedVilla.id].special_requests}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  {bookings[selectedVilla.id].status === "confirmed" && (
                    <button
                      onClick={() => setShowCheckInModal(true)}
                      className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
                    >
                      ✅ Check In
                    </button>
                  )}
                  {bookings[selectedVilla.id].status === "checked_in" && (
                    <>
                      <button
                        onClick={handleCheckOut}
                        className="px-4 py-2 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600"
                      >
                        👋 Check Out
                      </button>
                      <button
                        onClick={() => setShowMoveModal(true)}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm font-bold hover:bg-amber-600"
                      >
                        🔄 Mover
                      </button>
                      <button
                        onClick={() => setShowCancelModal(true)}
                        className="px-4 py-2 bg-slate-500 text-white rounded-lg text-sm font-bold hover:bg-slate-600"
                      >
                        ❌ Cancelar
                      </button>
                    </>
                  )}
                  <button
                    onClick={() => loadVillaHistory(selectedVilla.id)}
                    disabled={loadingHistory}
                    className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-bold hover:bg-purple-600 disabled:opacity-50"
                  >
                    {loadingHistory ? "..." : "📜 Historial"}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-50 rounded-xl p-4 mb-4 text-center">
              {/* Show cleaning deadline if villa is in cleaning status with upcoming arrival */}
              {villaStatuses[selectedVilla.id]?.status === "cleaning" &&
                bookings[selectedVilla.id]?.cleaning_deadline && (
                  <div className="mb-4">
                    {(() => {
                      const ds = getCleaningDeadlineStatus(
                        bookings[selectedVilla.id]?.cleaning_deadline,
                      );
                      return (
                        <div
                          className={`p-3 rounded-lg ${
                            ds.urgency === "overdue"
                              ? "bg-red-100 border border-red-300"
                              : ds.urgency === "critical"
                                ? "bg-red-50 border border-red-200"
                                : ds.urgency === "warning"
                                  ? "bg-amber-50 border border-amber-200"
                                  : "bg-emerald-50 border border-emerald-200"
                          }`}
                        >
                          <div className="text-xs text-slate-500 mb-1">
                            Deadline de Limpieza
                          </div>
                          <div
                            className={`text-xl font-mono font-bold ${
                              ds.urgency === "overdue"
                                ? "text-red-600"
                                : ds.urgency === "critical"
                                  ? "text-red-500"
                                  : ds.urgency === "warning"
                                    ? "text-amber-500"
                                    : "text-emerald-500"
                            }`}
                          >
                            {ds.countdown}
                          </div>
                          {bookings[selectedVilla.id]?.guest_name && (
                            <div className="text-xs text-slate-500 mt-1">
                              Proximo huesped:{" "}
                              {bookings[selectedVilla.id].guest_name}
                            </div>
                          )}
                          {ds.urgency === "overdue" && (
                            <div className="text-xs text-red-600 font-bold mt-2 animate-pulse">
                              ATRASADO - Escalar a gerencia
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              <p className="text-slate-500 mb-3">
                No hay huésped en esta villa
              </p>
              <button
                onClick={() => setShowAddGuestModal(true)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
              >
                + Agregar Huésped
              </button>
            </div>
          )}
        </div>
      )}

      {/* Move History */}
      {moveHistory.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="font-bold text-slate-900 mb-3">
            📋 Historial de Movimientos
          </h3>
          <div className="space-y-2">
            {moveHistory.map((move) => (
              <div
                key={move.id}
                className="flex items-center gap-3 text-sm bg-slate-50 p-2 rounded-lg"
              >
                <span className="text-slate-400 text-xs">
                  {new Date(move.moved_at).toLocaleDateString("es-CO")}
                </span>
                <span className="font-medium">{move.from_villa_id}</span>
                <span className="text-slate-400">→</span>
                <span className="font-medium">{move.to_villa_id}</span>
                <Badge color="#F59E0B">{move.move_reason}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Move Modal */}
      {showMoveModal && selectedVilla && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">🔄 Mover Huésped</h3>
            <p className="text-sm text-slate-600 mb-4">
              Selecciona la villa destino para{" "}
              {bookings[selectedVilla.id]?.guest_name}
            </p>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {VILLA_LAYOUT.filter(
                (v) =>
                  v.id !== selectedVilla.id &&
                  villaStatuses[v.id]?.status === "vacant",
              ).map((villa) => (
                <button
                  key={villa.id}
                  onClick={() => handleMoveGuest(villa.id, "guest_request")}
                  className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-sm font-medium hover:bg-emerald-100"
                >
                  {villa.name}
                </button>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowMoveModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Guest Modal */}
      {showAddGuestModal && selectedVilla && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">
              + Agregar Huésped a {selectedVilla.name}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newGuest.guest_name}
                  onChange={(e) =>
                    setNewGuest({ ...newGuest, guest_name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Juan García"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={newGuest.guest_email}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, guest_email: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={newGuest.guest_phone}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, guest_phone: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Adultos
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newGuest.num_adults}
                    onChange={(e) =>
                      setNewGuest({
                        ...newGuest,
                        num_adults: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Niños
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newGuest.num_children}
                    onChange={(e) =>
                      setNewGuest({
                        ...newGuest,
                        num_children: parseInt(e.target.value) || 0,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Check-in
                  </label>
                  <input
                    type="date"
                    value={newGuest.check_in}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, check_in: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Check-out
                  </label>
                  <input
                    type="date"
                    value={newGuest.check_out}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, check_out: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Hora de Llegada
                  </label>
                  <input
                    type="time"
                    value={newGuest.arrival_time}
                    onChange={(e) =>
                      setNewGuest({ ...newGuest, arrival_time: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Bote de Llegada
                  </label>
                  <select
                    value={newGuest.boat_preference}
                    onChange={(e) =>
                      setNewGuest({
                        ...newGuest,
                        boat_preference: e.target.value as
                          | "3pm"
                          | "6:30pm"
                          | "private"
                          | "other",
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="3pm">Bote 3:00 PM</option>
                    <option value="6:30pm">Bote 6:30 PM</option>
                    <option value="private">Bote Privado</option>
                    <option value="other">Otro</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nivel VIP
                </label>
                <select
                  value={newGuest.vip_level}
                  onChange={(e) =>
                    setNewGuest({
                      ...newGuest,
                      vip_level: e.target.value as "standard" | "vip" | "vvip",
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="standard">Standard</option>
                  <option value="vip">VIP</option>
                  <option value="vvip">VVIP</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notas / Solicitudes
                </label>
                <textarea
                  value={newGuest.special_requests}
                  onChange={(e) =>
                    setNewGuest({
                      ...newGuest,
                      special_requests: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="Alergias, preferencias, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAddGuestModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddGuest}
                disabled={!newGuest.guest_name}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50"
              >
                ✅ Registrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {showCancelModal && selectedVilla && bookings[selectedVilla.id] && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4 text-rose-600">
              ❌ Cancelar Reserva
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Esta accion cancelara la reserva de{" "}
              <span className="font-bold">
                {bookings[selectedVilla.id].guest_name}
              </span>{" "}
              y liberara {selectedVilla.name} para nuevas reservas.
            </p>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Razon de cancelacion *
              </label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg mb-2"
              >
                <option value="">Seleccionar razon...</option>
                <option value="guest_request">Solicitud del huesped</option>
                <option value="no_show">No se presento</option>
                <option value="payment_issue">Problema de pago</option>
                <option value="emergency">Emergencia</option>
                <option value="overbooking">Overbooking</option>
                <option value="other">Otro</option>
              </select>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setCancellationReason("");
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Volver
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={!cancellationReason}
                className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-bold hover:bg-rose-600 disabled:opacity-50"
              >
                Confirmar Cancelacion
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Villa History Modal */}
      {showHistoryModal && selectedVilla && villaHistory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-bold">
                📜 Historial de {selectedVilla.name}
              </h3>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            {/* Patterns/Insights */}
            {villaHistory.patterns.length > 0 && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                <h4 className="font-bold text-purple-700 text-sm mb-2">
                  Patrones Detectados
                </h4>
                <ul className="space-y-1">
                  {villaHistory.patterns.map((pattern, i) => (
                    <li key={i} className="text-sm text-purple-600">
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recent Guests */}
            <div className="mb-4">
              <h4 className="font-bold text-slate-700 text-sm mb-2">
                Ultimos 10 Huespedes
              </h4>
              {villaHistory.recent_guests.length > 0 ? (
                <div className="space-y-2">
                  {villaHistory.recent_guests.map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{guest.guest_name}</span>
                        {guest.guest_country && (
                          <span className="text-slate-500 ml-2">
                            ({guest.guest_country})
                          </span>
                        )}
                        {guest.vip_level && guest.vip_level !== "standard" && (
                          <Badge
                            color={
                              guest.vip_level === "vvip" ? "#F59E0B" : "#8B5CF6"
                            }
                          >
                            {guest.vip_level.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <span className="text-slate-400 text-xs">
                        {new Date(guest.check_in).toLocaleDateString("es-CO")} -{" "}
                        {new Date(guest.check_out).toLocaleDateString("es-CO")}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Sin historial de huespedes
                </p>
              )}
            </div>

            {/* Maintenance Reports */}
            <div className="mb-4">
              <h4 className="font-bold text-slate-700 text-sm mb-2">
                Ultimos 5 Reportes de Mantenimiento
              </h4>
              {villaHistory.maintenance_reports.length > 0 ? (
                <div className="space-y-2">
                  {villaHistory.maintenance_reports.map((report) => (
                    <div
                      key={report.id}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{report.title}</span>
                        <Badge
                          color={
                            report.priority === "urgent"
                              ? "#EF4444"
                              : report.priority === "high"
                                ? "#F59E0B"
                                : "#6B7280"
                          }
                        >
                          {report.priority}
                        </Badge>
                      </div>
                      <Badge
                        color={
                          report.status === "completed"
                            ? "#10B981"
                            : report.status === "pending"
                              ? "#F59E0B"
                              : "#6B7280"
                        }
                      >
                        {report.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Sin reportes de mantenimiento
                </p>
              )}
            </div>

            {/* Cleaning Checklists */}
            <div>
              <h4 className="font-bold text-slate-700 text-sm mb-2">
                Ultimos 10 Checklists de Limpieza
              </h4>
              {villaHistory.cleaning_checklists.length > 0 ? (
                <div className="space-y-2">
                  {villaHistory.cleaning_checklists.map((checklist) => (
                    <div
                      key={checklist.id}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {checklist.type.replace(/_/g, " ")}
                        </span>
                        {checklist.quality_score && (
                          <span className="ml-2 text-amber-500">
                            {"★".repeat(checklist.quality_score)}
                            {"☆".repeat(5 - checklist.quality_score)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          color={
                            checklist.status === "approved"
                              ? "#10B981"
                              : checklist.status === "rejected"
                                ? "#EF4444"
                                : "#6B7280"
                          }
                        >
                          {checklist.status}
                        </Badge>
                        <span className="text-slate-400 text-xs">
                          {new Date(checklist.date).toLocaleDateString("es-CO")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">
                  Sin checklists de limpieza
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
