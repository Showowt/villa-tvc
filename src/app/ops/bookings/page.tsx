"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

// ═══════════════════════════════════════════════════════════════
// TVC BOOKINGS MANAGEMENT — Issues #45 & #46
// Deposit tracking + Cancellation workflow
// ═══════════════════════════════════════════════════════════════

interface VillaBooking {
  id: string;
  villa_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  num_adults: number;
  num_children: number;
  status: "confirmed" | "checked_in" | "completed" | "cancelled";
  total_amount: number | null;
  deposit_amount: number | null;
  deposit_paid: boolean;
  deposit_date: string | null;
  deposit_method: string | null;
  source: string | null;
  notes: string | null;
  allergies: string[] | null;
  cancellation_reason: string | null;
  cancelled_at: string | null;
  created_at: string;
  // Arrival/Boat info - Issue #6
  arrival_time: string | null;
  boat_preference: string | null;
}

interface RefundCalculation {
  refund_amount: number;
  refund_percentage: number;
  days_until_checkin: number;
}

const VILLA_NAMES: Record<string, string> = {
  villa_1: "Teresa",
  villa_2: "Aduana",
  villa_3: "Trinidad",
  villa_4: "Paz",
  villa_5: "San Pedro",
  villa_6: "San Diego",
  villa_7: "Coche",
  villa_8: "Pozo",
  villa_9: "Santo Domingo",
  villa_10: "Merced",
};

const STATUS_CONFIG = {
  confirmed: {
    label: "Confirmada",
    labelEn: "Confirmed",
    color: "#3B82F6",
    bg: "#EFF6FF",
  },
  checked_in: {
    label: "En Casa",
    labelEn: "Checked In",
    color: "#10B981",
    bg: "#ECFDF5",
  },
  completed: {
    label: "Completada",
    labelEn: "Completed",
    color: "#6B7280",
    bg: "#F3F4F6",
  },
  cancelled: {
    label: "Cancelada",
    labelEn: "Cancelled",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
};

const DEPOSIT_STATUS = {
  paid: {
    label: "Deposito Pagado",
    labelEn: "Deposit Paid",
    color: "#10B981",
    icon: "✓",
  },
  pending: {
    label: "Deposito Pendiente",
    labelEn: "Deposit Pending",
    color: "#F59E0B",
    icon: "⚠",
  },
  not_required: {
    label: "Sin Deposito",
    labelEn: "No Deposit",
    color: "#6B7280",
    icon: "—",
  },
};

export default function BookingsPage() {
  const { t, lang } = useLanguage();
  const [bookings, setBookings] = useState<VillaBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "confirmed" | "checked_in" | "cancelled"
  >("all");
  const [depositFilter, setDepositFilter] = useState<
    "all" | "pending" | "paid"
  >("all");
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<VillaBooking | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");
  const [refundCalc, setRefundCalc] = useState<RefundCalculation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const loadBookings = useCallback(async () => {
    setLoading(true);
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("villa_bookings")
      .select("*")
      .order("check_in", { ascending: true });

    if (error) {
      console.error("[BookingsPage] Error loading bookings:", error);
      setLoading(false);
      return;
    }

    setBookings(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const calculateRefund = (booking: VillaBooking): RefundCalculation => {
    const checkIn = new Date(booking.check_in);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    checkIn.setHours(0, 0, 0, 0);

    const daysUntil = Math.ceil(
      (checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    const depositAmount = booking.deposit_amount || 0;

    let percentage = 0;
    if (daysUntil >= 30) {
      percentage = 100;
    } else if (daysUntil >= 15) {
      percentage = 50;
    } else {
      percentage = 0;
    }

    return {
      refund_amount:
        Math.round(((depositAmount * percentage) / 100) * 100) / 100,
      refund_percentage: percentage,
      days_until_checkin: daysUntil,
    };
  };

  const openCancelModal = (booking: VillaBooking) => {
    setSelectedBooking(booking);
    setRefundCalc(calculateRefund(booking));
    setCancelReason("");
    setShowCancelModal(true);
  };

  const handleCancelBooking = async () => {
    if (!selectedBooking || !cancelReason.trim()) return;
    setCancelling(true);

    try {
      const response = await fetch("/api/booking/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          booking_id: selectedBooking.id,
          cancellation_reason: cancelReason,
          cancelled_by: "ops_manager",
          refund_amount: refundCalc?.refund_amount || 0,
          refund_percentage: refundCalc?.refund_percentage || 0,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        console.error("[BookingsPage] Cancel failed:", result.error);
        alert(`Error: ${result.error}`);
        setCancelling(false);
        return;
      }

      setShowCancelModal(false);
      setSelectedBooking(null);
      setCancelReason("");
      setRefundCalc(null);
      loadBookings();
    } catch (error) {
      console.error("[BookingsPage] Cancel error:", error);
      alert("Error al cancelar la reserva");
    }

    setCancelling(false);
  };

  const getDepositStatus = (
    booking: VillaBooking,
  ): "paid" | "pending" | "not_required" => {
    if (!booking.deposit_amount || booking.deposit_amount === 0)
      return "not_required";
    return booking.deposit_paid ? "paid" : "pending";
  };

  const isDepositUrgent = (booking: VillaBooking): boolean => {
    if (booking.deposit_paid || !booking.deposit_amount) return false;
    const checkIn = new Date(booking.check_in);
    const today = new Date();
    const daysUntil = Math.ceil(
      (checkIn.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
    );
    return daysUntil < 7 && daysUntil >= 0;
  };

  const filteredBookings = bookings.filter((b) => {
    // Status filter
    if (filter !== "all" && b.status !== filter) return false;

    // Deposit filter
    if (depositFilter !== "all") {
      const depositStatus = getDepositStatus(b);
      if (depositFilter === "pending" && depositStatus !== "pending")
        return false;
      if (depositFilter === "paid" && depositStatus !== "paid") return false;
    }

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const villaName = VILLA_NAMES[b.villa_id]?.toLowerCase() || "";
      return (
        b.guest_name.toLowerCase().includes(search) ||
        villaName.includes(search) ||
        b.guest_email?.toLowerCase().includes(search) ||
        b.guest_phone?.includes(search)
      );
    }

    return true;
  });

  const stats = {
    total: bookings.filter((b) => b.status !== "cancelled").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    checkedIn: bookings.filter((b) => b.status === "checked_in").length,
    pendingDeposits: bookings.filter(
      (b) => getDepositStatus(b) === "pending" && b.status !== "cancelled",
    ).length,
    urgentDeposits: bookings.filter(
      (b) => isDepositUrgent(b) && b.status !== "cancelled",
    ).length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatMoney = (amount: number | null) => {
    if (!amount) return "$0";
    return `$${amount.toLocaleString()}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-[#00B4FF] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-500 font-medium">
            {lang === "es" ? "Cargando reservas..." : "Loading bookings..."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          📋 {lang === "es" ? "Gestion de Reservas" : "Booking Management"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {lang === "es"
            ? "Seguimiento de depositos y cancelaciones"
            : "Deposit tracking and cancellation workflow"}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-2xl font-black text-blue-600">{stats.total}</div>
          <div className="text-xs text-blue-600 font-medium">
            {lang === "es" ? "Total Activas" : "Total Active"}
          </div>
        </div>
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4">
          <div className="text-2xl font-black text-indigo-600">
            {stats.confirmed}
          </div>
          <div className="text-xs text-indigo-600 font-medium">
            {lang === "es" ? "Confirmadas" : "Confirmed"}
          </div>
        </div>
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="text-2xl font-black text-emerald-600">
            {stats.checkedIn}
          </div>
          <div className="text-xs text-emerald-600 font-medium">
            {lang === "es" ? "En Casa" : "Checked In"}
          </div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="text-2xl font-black text-amber-600">
            {stats.pendingDeposits}
          </div>
          <div className="text-xs text-amber-600 font-medium">
            {lang === "es" ? "Depositos Pend." : "Pending Deposits"}
          </div>
        </div>
        <div
          className={`rounded-xl border p-4 ${stats.urgentDeposits > 0 ? "bg-red-50 border-red-300" : "bg-slate-50 border-slate-200"}`}
        >
          <div
            className={`text-2xl font-black ${stats.urgentDeposits > 0 ? "text-red-600 animate-pulse" : "text-slate-400"}`}
          >
            {stats.urgentDeposits}
          </div>
          <div
            className={`text-xs font-medium ${stats.urgentDeposits > 0 ? "text-red-600" : "text-slate-400"}`}
          >
            {lang === "es" ? "Urgentes (<7d)" : "Urgent (<7d)"}
          </div>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-slate-500">
            {stats.cancelled}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            {lang === "es" ? "Canceladas" : "Cancelled"}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Search */}
        <div className="flex-1 min-w-[200px]">
          <input
            type="text"
            placeholder={
              lang === "es"
                ? "Buscar por nombre, villa, email..."
                : "Search by name, villa, email..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
          />
        </div>

        {/* Status Filter */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { key: "all", label: lang === "es" ? "Todas" : "All" },
            {
              key: "confirmed",
              label: lang === "es" ? "Confirmadas" : "Confirmed",
            },
            {
              key: "checked_in",
              label: lang === "es" ? "En Casa" : "Checked In",
            },
            {
              key: "cancelled",
              label: lang === "es" ? "Canceladas" : "Cancelled",
            },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key as typeof filter)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                filter === opt.key
                  ? "bg-[#0A0A0F] text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Deposit Filter */}
        <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
          {[
            { key: "all", label: lang === "es" ? "Todo Dep." : "All Dep." },
            {
              key: "pending",
              label: lang === "es" ? "Pendientes" : "Pending",
              color: "#F59E0B",
            },
            {
              key: "paid",
              label: lang === "es" ? "Pagados" : "Paid",
              color: "#10B981",
            },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => setDepositFilter(opt.key as typeof depositFilter)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                depositFilter === opt.key
                  ? "bg-[#0A0A0F] text-white"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Refund Policy Banner */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-xl p-4 mb-6 text-white">
        <div className="text-xs font-bold text-[#00B4FF] mb-2 tracking-wider">
          {lang === "es" ? "POLITICA DE REEMBOLSO" : "REFUND POLICY"}
        </div>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-black text-emerald-400">100%</div>
            <div className="text-xs text-slate-400">
              {lang === "es" ? "30+ dias antes" : "30+ days before"}
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-amber-400">50%</div>
            <div className="text-xs text-slate-400">
              {lang === "es" ? "15-29 dias" : "15-29 days"}
            </div>
          </div>
          <div>
            <div className="text-lg font-black text-red-400">0%</div>
            <div className="text-xs text-slate-400">
              {lang === "es" ? "<15 dias" : "<15 days"}
            </div>
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {filteredBookings.length === 0 ? (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <div className="text-4xl mb-3">📋</div>
            <div className="text-slate-600 font-medium">
              {lang === "es"
                ? "No hay reservas con estos filtros"
                : "No bookings match these filters"}
            </div>
          </div>
        ) : (
          filteredBookings.map((booking) => {
            const depositStatus = getDepositStatus(booking);
            const urgent = isDepositUrgent(booking);
            const statusConfig = STATUS_CONFIG[booking.status];
            const depositConfig = DEPOSIT_STATUS[depositStatus];

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-xl border p-4 ${
                  urgent
                    ? "border-red-300 shadow-lg shadow-red-100"
                    : "border-slate-200"
                }`}
              >
                {/* Urgent Badge */}
                {urgent && (
                  <div className="flex items-center gap-2 mb-3 px-3 py-1.5 bg-red-50 rounded-lg border border-red-200">
                    <span className="animate-pulse text-lg">⚠️</span>
                    <span className="text-xs font-bold text-red-600">
                      {lang === "es"
                        ? "DEPOSITO URGENTE - Check-in en menos de 7 dias"
                        : "URGENT DEPOSIT - Check-in in less than 7 days"}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-start">
                  {/* Left: Guest Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-lg font-bold text-slate-900">
                        {booking.guest_name}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{
                          background: statusConfig.bg,
                          color: statusConfig.color,
                        }}
                      >
                        {lang === "es"
                          ? statusConfig.label
                          : statusConfig.labelEn}
                      </span>
                    </div>

                    <div className="text-sm text-slate-500 mb-2">
                      <span className="font-semibold text-slate-700">
                        Villa{" "}
                        {VILLA_NAMES[booking.villa_id] || booking.villa_id}
                      </span>
                      {" | "}
                      {formatDate(booking.check_in)} -{" "}
                      {formatDate(booking.check_out)}
                      {" | "}
                      {booking.num_adults + booking.num_children}{" "}
                      {lang === "es" ? "huespedes" : "guests"}
                    </div>

                    {booking.guest_phone && (
                      <div className="text-sm text-slate-500">
                        📱 {booking.guest_phone}
                        {booking.guest_email && ` | 📧 ${booking.guest_email}`}
                      </div>
                    )}

                    {/* Arrival Time & Boat - Issue #6 */}
                    {(booking.arrival_time || booking.boat_preference) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {booking.arrival_time && (
                          <span className="px-2 py-1 bg-sky-50 text-sky-700 rounded-lg text-xs font-medium border border-sky-200">
                            🚤 {lang === "es" ? "Llegada" : "Arrival"}:{" "}
                            {booking.arrival_time}
                          </span>
                        )}
                        {booking.boat_preference && (
                          <span
                            className={`px-2 py-1 rounded-lg text-xs font-medium border ${
                              booking.boat_preference === "early" ||
                              booking.boat_preference === "9:30 AM"
                                ? "bg-amber-50 text-amber-700 border-amber-200"
                                : "bg-slate-50 text-slate-600 border-slate-200"
                            }`}
                          >
                            ⛵ {lang === "es" ? "Lancha" : "Boat"}:{" "}
                            {booking.boat_preference === "early"
                              ? lang === "es"
                                ? "9:30 AM (Temprano)"
                                : "9:30 AM (Early)"
                              : booking.boat_preference === "late"
                                ? lang === "es"
                                  ? "2:00 PM (Tarde)"
                                  : "2:00 PM (Late)"
                                : booking.boat_preference}
                          </span>
                        )}
                      </div>
                    )}

                    {booking.source && (
                      <div className="mt-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-xs font-medium">
                          {booking.source}
                        </span>
                      </div>
                    )}

                    {booking.status === "cancelled" &&
                      booking.cancellation_reason && (
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="text-xs font-bold text-red-600 mb-1">
                            {lang === "es"
                              ? "RAZON DE CANCELACION:"
                              : "CANCELLATION REASON:"}
                          </div>
                          <div className="text-sm text-red-700">
                            {booking.cancellation_reason}
                          </div>
                        </div>
                      )}
                  </div>

                  {/* Right: Deposit Info & Actions */}
                  <div className="text-right ml-4">
                    {/* Deposit Status */}
                    <div className="mb-3">
                      <div className="text-xs text-slate-500 mb-1">
                        {lang === "es" ? "Deposito" : "Deposit"}
                      </div>
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1"
                          style={{
                            background: `${depositConfig.color}15`,
                            color: depositConfig.color,
                          }}
                        >
                          {depositConfig.icon}{" "}
                          {lang === "es"
                            ? depositConfig.label
                            : depositConfig.labelEn}
                        </span>
                      </div>
                      {booking.deposit_amount && booking.deposit_amount > 0 && (
                        <div className="text-lg font-bold text-slate-900 mt-1">
                          {formatMoney(booking.deposit_amount)}
                        </div>
                      )}
                      {booking.deposit_paid && booking.deposit_date && (
                        <div className="text-xs text-slate-400">
                          {formatDate(booking.deposit_date)}
                          {booking.deposit_method &&
                            ` via ${booking.deposit_method}`}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {booking.status !== "cancelled" &&
                      booking.status !== "completed" && (
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() => openCancelModal(booking)}
                            className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-colors border border-red-200"
                          >
                            ❌ {lang === "es" ? "Cancelar" : "Cancel"}
                          </button>
                        </div>
                      )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cancel Modal */}
      {showCancelModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              ❌ {lang === "es" ? "Cancelar Reserva" : "Cancel Booking"}
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {lang === "es"
                ? `Estas a punto de cancelar la reserva de ${selectedBooking.guest_name} en Villa ${VILLA_NAMES[selectedBooking.villa_id] || selectedBooking.villa_id}.`
                : `You are about to cancel the booking for ${selectedBooking.guest_name} at Villa ${VILLA_NAMES[selectedBooking.villa_id] || selectedBooking.villa_id}.`}
            </p>

            {/* Refund Calculation */}
            {refundCalc &&
              selectedBooking.deposit_paid &&
              selectedBooking.deposit_amount && (
                <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                  <div className="text-xs font-bold text-slate-500 mb-3 tracking-wider">
                    {lang === "es"
                      ? "CALCULO DE REEMBOLSO"
                      : "REFUND CALCULATION"}
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <div className="text-sm text-slate-500">
                        {lang === "es"
                          ? "Dias hasta check-in"
                          : "Days until check-in"}
                      </div>
                      <div className="text-xl font-bold text-slate-900">
                        {refundCalc.days_until_checkin}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">
                        {lang === "es" ? "Porcentaje" : "Percentage"}
                      </div>
                      <div
                        className={`text-xl font-bold ${
                          refundCalc.refund_percentage === 100
                            ? "text-emerald-600"
                            : refundCalc.refund_percentage === 50
                              ? "text-amber-600"
                              : "text-red-600"
                        }`}
                      >
                        {refundCalc.refund_percentage}%
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">
                        {lang === "es" ? "Reembolso" : "Refund"}
                      </div>
                      <div className="text-xl font-bold text-emerald-600">
                        {formatMoney(refundCalc.refund_amount)}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-200 text-center text-xs text-slate-500">
                    {lang === "es" ? "Deposito original:" : "Original deposit:"}{" "}
                    <span className="font-bold">
                      {formatMoney(selectedBooking.deposit_amount)}
                    </span>
                  </div>
                </div>
              )}

            {/* Reason Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                {lang === "es"
                  ? "Razon de cancelacion *"
                  : "Cancellation reason *"}
              </label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder={
                  lang === "es"
                    ? "Ej: Solicitud del huesped, cambio de planes..."
                    : "Ex: Guest request, change of plans..."
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setSelectedBooking(null);
                  setCancelReason("");
                  setRefundCalc(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
              >
                {lang === "es" ? "Volver" : "Back"}
              </button>
              <button
                onClick={handleCancelBooking}
                disabled={!cancelReason.trim() || cancelling}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {cancelling
                  ? lang === "es"
                    ? "Cancelando..."
                    : "Cancelling..."
                  : lang === "es"
                    ? "Confirmar Cancelacion"
                    : "Confirm Cancellation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
