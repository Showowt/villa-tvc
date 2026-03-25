"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface DepositLog {
  id: string;
  booking_id: string | null;
  reservation_id: string | null;
  amount: number;
  currency: string;
  date_paid: string;
  payment_method: string;
  reference_number: string | null;
  status: "received" | "applied" | "refunded" | "disputed";
  applied_to_invoice: boolean;
  applied_at: string | null;
  notes: string | null;
}

interface VillaBooking {
  id: string;
  villa_id: string;
  guest_name: string;
  check_in: string;
  check_out: string;
  deposit_amount: number;
  deposit_paid: boolean;
}

interface BookingWithDeposit extends VillaBooking {
  deposits: DepositLog[];
  totalDeposited: number;
  depositStatus: "none" | "partial" | "full" | "overpaid";
}

const PAYMENT_METHODS = [
  "Wire Transfer",
  "Credit Card",
  "PayPal",
  "Zelle",
  "Cash",
  "Crypto",
  "Other",
];

export default function DepositsPage() {
  const [bookings, setBookings] = useState<BookingWithDeposit[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBooking, setSelectedBooking] =
    useState<BookingWithDeposit | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newDeposit, setNewDeposit] = useState({
    amount: 0,
    date_paid: new Date().toISOString().split("T")[0],
    payment_method: "Wire Transfer",
    reference_number: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];

    // Get upcoming and current bookings
    const { data: bookingData, error: bookingError } = await supabase
      .from("villa_bookings")
      .select("*")
      .gte("check_out", today)
      .order("check_in", { ascending: true });

    if (bookingError) {
      console.error("[loadData]", bookingError);
      setLoading(false);
      return;
    }

    // Get deposits for these bookings
    const bookingIds = (bookingData || []).map((b) => b.id);
    const { data: depositData } = await supabase
      .from("deposit_logs")
      .select("*")
      .in("booking_id", bookingIds);

    // Combine data
    const depositMap = new Map<string, DepositLog[]>();
    (depositData || []).forEach((d) => {
      if (d.booking_id) {
        const existing = depositMap.get(d.booking_id) || [];
        existing.push(d as DepositLog);
        depositMap.set(d.booking_id, existing);
      }
    });

    const combined: BookingWithDeposit[] = (bookingData || []).map((b) => {
      const deposits = depositMap.get(b.id) || [];
      const totalDeposited = deposits
        .filter((d) => d.status !== "refunded")
        .reduce((sum, d) => sum + d.amount, 0);

      let depositStatus: "none" | "partial" | "full" | "overpaid" = "none";
      if (totalDeposited > 0 && b.deposit_amount > 0) {
        if (totalDeposited >= b.deposit_amount * 1.01) {
          depositStatus = "overpaid";
        } else if (totalDeposited >= b.deposit_amount * 0.99) {
          depositStatus = "full";
        } else {
          depositStatus = "partial";
        }
      }

      return {
        ...b,
        deposits,
        totalDeposited,
        depositStatus,
      } as BookingWithDeposit;
    });

    setBookings(combined);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAddDeposit = async () => {
    if (!selectedBooking || newDeposit.amount <= 0) return;
    setSaving(true);

    const supabase = createBrowserClient();

    const { error } = await supabase.from("deposit_logs").insert({
      booking_id: selectedBooking.id,
      amount: newDeposit.amount,
      currency: "USD",
      date_paid: newDeposit.date_paid,
      payment_method: newDeposit.payment_method,
      reference_number: newDeposit.reference_number || null,
      notes: newDeposit.notes || null,
      status: "received",
    });

    if (error) {
      console.error("[addDeposit]", error);
      setSaving(false);
      return;
    }

    // Update booking deposit status
    await supabase
      .from("villa_bookings")
      .update({
        deposit_paid: true,
        deposit_date: newDeposit.date_paid,
      })
      .eq("id", selectedBooking.id);

    setSaving(false);
    setShowAddModal(false);
    setNewDeposit({
      amount: 0,
      date_paid: new Date().toISOString().split("T")[0],
      payment_method: "Wire Transfer",
      reference_number: "",
      notes: "",
    });
    loadData();
  };

  const handleApplyToInvoice = async (deposit: DepositLog) => {
    const supabase = createBrowserClient();

    await supabase
      .from("deposit_logs")
      .update({
        status: "applied",
        applied_to_invoice: true,
        applied_at: new Date().toISOString(),
      })
      .eq("id", deposit.id);

    loadData();
  };

  const formatMoney = (n: number) => `$${n.toLocaleString()}`;

  const getStatusBadge = (status: BookingWithDeposit["depositStatus"]) => {
    switch (status) {
      case "none":
        return (
          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-bold">
            No Deposit
          </span>
        );
      case "partial":
        return (
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">
            Partial
          </span>
        );
      case "full":
        return (
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-bold">
            Paid
          </span>
        );
      case "overpaid":
        return (
          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">
            Overpaid
          </span>
        );
    }
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
          💳 Deposit Tracking
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Track deposits for upcoming reservations and apply to final invoices
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4">
          <div className="text-2xl font-black text-emerald-600">
            {bookings.filter((b) => b.depositStatus === "full").length}
          </div>
          <div className="text-xs text-emerald-600 font-medium">Fully Paid</div>
        </div>
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4">
          <div className="text-2xl font-black text-amber-600">
            {bookings.filter((b) => b.depositStatus === "partial").length}
          </div>
          <div className="text-xs text-amber-600 font-medium">Partial</div>
        </div>
        <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-slate-600">
            {bookings.filter((b) => b.depositStatus === "none").length}
          </div>
          <div className="text-xs text-slate-600 font-medium">No Deposit</div>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <div className="text-2xl font-black text-blue-600">
            {formatMoney(
              bookings.reduce((sum, b) => sum + b.totalDeposited, 0),
            )}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            Total Collected
          </div>
        </div>
      </div>

      {/* Bookings List */}
      <div className="space-y-3">
        {bookings.map((booking) => (
          <div
            key={booking.id}
            className="bg-white rounded-xl border border-slate-200 p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-900">
                    {booking.guest_name}
                  </span>
                  {getStatusBadge(booking.depositStatus)}
                </div>
                <div className="text-sm text-slate-500 mt-0.5">
                  {booking.villa_id} |{" "}
                  {new Date(booking.check_in).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(booking.check_out).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-slate-500">
                  Required: {formatMoney(booking.deposit_amount || 0)}
                </div>
                <div
                  className={`text-lg font-bold ${
                    booking.depositStatus === "full" ||
                    booking.depositStatus === "overpaid"
                      ? "text-emerald-600"
                      : booking.depositStatus === "partial"
                        ? "text-amber-600"
                        : "text-slate-400"
                  }`}
                >
                  Received: {formatMoney(booking.totalDeposited)}
                </div>
              </div>
            </div>

            {/* Deposits List */}
            {booking.deposits.length > 0 && (
              <div className="mt-4 bg-slate-50 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-500 mb-2">
                  DEPOSIT HISTORY
                </div>
                <div className="space-y-2">
                  {booking.deposits.map((deposit) => (
                    <div
                      key={deposit.id}
                      className="flex justify-between items-center text-sm bg-white p-2 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">
                          {formatMoney(deposit.amount)}
                        </span>
                        <span className="text-slate-500">
                          {deposit.payment_method}
                        </span>
                        <span className="text-slate-400">
                          {new Date(deposit.date_paid).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            deposit.status === "applied"
                              ? "bg-emerald-100 text-emerald-700"
                              : deposit.status === "refunded"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {deposit.status}
                        </span>
                        {deposit.status === "received" && (
                          <button
                            onClick={() => handleApplyToInvoice(deposit)}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            Apply to Invoice
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSelectedBooking(booking);
                  setNewDeposit({
                    ...newDeposit,
                    amount:
                      (booking.deposit_amount || 0) - booking.totalDeposited,
                  });
                  setShowAddModal(true);
                }}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600"
              >
                + Add Deposit
              </button>
            </div>
          </div>
        ))}

        {bookings.length === 0 && (
          <div className="bg-slate-50 rounded-xl p-8 text-center">
            <div className="text-3xl mb-3">💳</div>
            <div className="text-slate-600 font-medium">
              No upcoming bookings
            </div>
            <p className="text-slate-400 text-sm mt-1">
              Bookings will appear here once they are created
            </p>
          </div>
        )}
      </div>

      {/* Add Deposit Modal */}
      {showAddModal && selectedBooking && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold mb-4">Add Deposit</h3>
            <p className="text-sm text-slate-600 mb-4">
              Recording deposit for {selectedBooking.guest_name}
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount (USD) *
                </label>
                <input
                  type="number"
                  min="0"
                  value={newDeposit.amount}
                  onChange={(e) =>
                    setNewDeposit({
                      ...newDeposit,
                      amount: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date Paid *
                </label>
                <input
                  type="date"
                  value={newDeposit.date_paid}
                  onChange={(e) =>
                    setNewDeposit({ ...newDeposit, date_paid: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Payment Method *
                </label>
                <select
                  value={newDeposit.payment_method}
                  onChange={(e) =>
                    setNewDeposit({
                      ...newDeposit,
                      payment_method: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={newDeposit.reference_number}
                  onChange={(e) =>
                    setNewDeposit({
                      ...newDeposit,
                      reference_number: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="Transaction ID, check number, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={newDeposit.notes}
                  onChange={(e) =>
                    setNewDeposit({ ...newDeposit, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setSelectedBooking(null);
                }}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddDeposit}
                disabled={saving || newDeposit.amount <= 0}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
