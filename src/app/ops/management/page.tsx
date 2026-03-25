"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS MANAGEMENT
// Issues 38, 43, 71, 75: Staff absences, delegations, groups, day visitors
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

interface StaffAbsence {
  id: string;
  user_id: string;
  absence_date: string;
  reason: string;
  reason_details?: string;
  tasks_redistributed: boolean;
  redistributed_to: string[];
  users?: { name: string; department: string };
}

interface Delegation {
  id: string;
  primary_approver_id: string;
  backup_approver_id: string;
  delegation_type: string;
  timeout_minutes: number;
  is_active: boolean;
  primary_user?: { name: string; email: string };
  backup_user?: { name: string; email: string };
}

interface DayVisitor {
  id: string;
  visit_date: string;
  party_name: string;
  party_size: number;
  arrival_time?: string;
  departure_time?: string;
  host_villa_id?: string;
  host_guest_name?: string;
  purpose: string;
  consumption_total: number;
}

interface GroupBooking {
  id: string;
  name: string;
  coordinator_name: string;
  coordinator_phone?: string;
  villa_ids: string[];
  check_in: string;
  check_out: string;
  total_guests: number;
  status: string;
}

interface User {
  id: string;
  name: string;
  department: string;
  role: string;
}

const REASON_LABELS = {
  sick: { label: "Enfermedad", emoji: "🤒", color: "#EF4444" },
  personal: { label: "Personal", emoji: "👤", color: "#3B82F6" },
  vacation: { label: "Vacaciones", emoji: "🏖️", color: "#10B981" },
  emergency: { label: "Emergencia", emoji: "🚨", color: "#F59E0B" },
  other: { label: "Otro", emoji: "📝", color: "#6B7280" },
};

const PURPOSE_LABELS = {
  restaurant: { label: "Restaurante", emoji: "🍽️" },
  pool: { label: "Piscina", emoji: "🏊" },
  event: { label: "Evento", emoji: "🎉" },
  tour: { label: "Tour", emoji: "🚤" },
  other: { label: "Otro", emoji: "📋" },
};

export default function OperationsManagementPage() {
  const [activeTab, setActiveTab] = useState<
    "absences" | "delegations" | "groups" | "visitors"
  >("absences");
  const [loading, setLoading] = useState(true);

  // Data states
  const [absences, setAbsences] = useState<StaffAbsence[]>([]);
  const [delegations, setDelegations] = useState<Delegation[]>([]);
  const [dayVisitors, setDayVisitors] = useState<DayVisitor[]>([]);
  const [groupBookings, setGroupBookings] = useState<GroupBooking[]>([]);
  const [staff, setStaff] = useState<User[]>([]);
  const [managers, setManagers] = useState<User[]>([]);

  // Modal states
  const [showAbsenceModal, setShowAbsenceModal] = useState(false);
  const [showDelegationModal, setShowDelegationModal] = useState(false);
  const [showVisitorModal, setShowVisitorModal] = useState(false);
  const [showGroupModal, setShowGroupModal] = useState(false);

  // Form states
  const [absenceForm, setAbsenceForm] = useState({
    staffUserId: "",
    absenceDate: new Date().toISOString().split("T")[0],
    reason: "sick" as keyof typeof REASON_LABELS,
    reasonDetails: "",
  });

  const [delegationForm, setDelegationForm] = useState({
    primaryApproverId: "",
    backupApproverId: "",
    delegationType: "all",
    timeoutMinutes: 30,
  });

  const [visitorForm, setVisitorForm] = useState({
    partyName: "",
    partySize: 1,
    arrivalTime: "",
    hostVillaId: "",
    hostGuestName: "",
    purpose: "restaurant" as keyof typeof PURPOSE_LABELS,
    notes: "",
  });

  const [groupForm, setGroupForm] = useState({
    name: "",
    coordinatorName: "",
    coordinatorPhone: "",
    coordinatorEmail: "",
    villaIds: [] as string[],
    checkIn: "",
    checkOut: "",
    totalGuests: 0,
    specialRequests: "",
  });

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient() as SupabaseAny;
    const today = new Date().toISOString().split("T")[0];

    try {
      // Load staff
      const { data: staffData } = await supabase
        .from("users")
        .select("id, name, department, role")
        .eq("is_active", true)
        .eq("role", "staff");
      setStaff(staffData || []);

      // Load managers
      const { data: managerData } = await supabase
        .from("users")
        .select("id, name, department, role")
        .eq("is_active", true)
        .in("role", ["manager", "owner"]);
      setManagers(managerData || []);

      // Load absences (last 7 days)
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const { data: absenceData } = await supabase
        .from("staff_absences")
        .select("*, users!user_id(name, department)")
        .gte("absence_date", weekAgo.toISOString().split("T")[0])
        .order("absence_date", { ascending: false });
      setAbsences(absenceData || []);

      // Load delegations
      const { data: delegationData } = await supabase
        .from("approval_delegations")
        .select(
          `
          *,
          primary_user:users!primary_approver_id(name, email),
          backup_user:users!backup_approver_id(name, email)
        `,
        )
        .order("created_at", { ascending: false });
      setDelegations(delegationData || []);

      // Load today's day visitors
      const { data: visitorData } = await supabase
        .from("day_visitors")
        .select("*")
        .eq("visit_date", today)
        .order("arrival_time", { ascending: true });
      setDayVisitors(visitorData || []);

      // Load active group bookings
      const { data: groupData } = await supabase
        .from("group_bookings")
        .select("*")
        .neq("status", "cancelled")
        .gte("check_out", today)
        .order("check_in", { ascending: true });
      setGroupBookings(groupData || []);
    } catch (error) {
      console.error("[OpsManagement] Error loading data:", error);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMarkAbsent = async () => {
    if (!absenceForm.staffUserId || !absenceForm.reason) return;

    try {
      const response = await fetch("/api/ops/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark_absent",
          ...absenceForm,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowAbsenceModal(false);
        setAbsenceForm({
          staffUserId: "",
          absenceDate: new Date().toISOString().split("T")[0],
          reason: "sick",
          reasonDetails: "",
        });
        loadData();
        alert(`${result.message}`);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("[OpsManagement] Error marking absent:", error);
      alert("Error al procesar la ausencia");
    }
  };

  const handleCreateDelegation = async () => {
    if (!delegationForm.primaryApproverId || !delegationForm.backupApproverId)
      return;

    try {
      const response = await fetch("/api/ops/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_delegation",
          ...delegationForm,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowDelegationModal(false);
        setDelegationForm({
          primaryApproverId: "",
          backupApproverId: "",
          delegationType: "all",
          timeoutMinutes: 30,
        });
        loadData();
      } else {
        alert(`Error: ${result.error}`);
      }
    } catch (error) {
      console.error("[OpsManagement] Error creating delegation:", error);
    }
  };

  const handleToggleDelegation = async (
    delegationId: string,
    isActive: boolean,
  ) => {
    try {
      await fetch("/api/ops/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_delegation",
          delegationId,
          isActive: !isActive,
        }),
      });
      loadData();
    } catch (error) {
      console.error("[OpsManagement] Error toggling delegation:", error);
    }
  };

  const handleLogVisitor = async () => {
    if (!visitorForm.partyName || !visitorForm.partySize) return;

    try {
      const response = await fetch("/api/ops/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "log_day_visitor",
          ...visitorForm,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowVisitorModal(false);
        setVisitorForm({
          partyName: "",
          partySize: 1,
          arrivalTime: "",
          hostVillaId: "",
          hostGuestName: "",
          purpose: "restaurant",
          notes: "",
        });
        loadData();
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("[OpsManagement] Error logging visitor:", error);
    }
  };

  const handleCheckoutVisitor = async (visitorId: string) => {
    try {
      await fetch("/api/ops/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "checkout_day_visitor",
          visitorId,
        }),
      });
      loadData();
    } catch (error) {
      console.error("[OpsManagement] Error checking out visitor:", error);
    }
  };

  const handleCreateGroupBooking = async () => {
    if (
      !groupForm.name ||
      !groupForm.coordinatorName ||
      groupForm.villaIds.length === 0
    )
      return;

    try {
      const response = await fetch("/api/ops/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "group_booking",
          ...groupForm,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setShowGroupModal(false);
        setGroupForm({
          name: "",
          coordinatorName: "",
          coordinatorPhone: "",
          coordinatorEmail: "",
          villaIds: [],
          checkIn: "",
          checkOut: "",
          totalGuests: 0,
          specialRequests: "",
        });
        loadData();
        alert(result.message);
      } else {
        alert(`Error: ${result.message}`);
      }
    } catch (error) {
      console.error("[OpsManagement] Error creating group booking:", error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold">Operations Management</h1>
        <p className="text-slate-500 text-sm">
          Staff absences, approvals, group bookings, and day visitors
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto">
        {[
          {
            key: "absences",
            label: "Staff Absences",
            emoji: "🤒",
            count: absences.filter(
              (a) => a.absence_date === new Date().toISOString().split("T")[0],
            ).length,
          },
          {
            key: "delegations",
            label: "Delegations",
            emoji: "🔄",
            count: delegations.filter((d) => d.is_active).length,
          },
          {
            key: "groups",
            label: "Group Bookings",
            emoji: "👥",
            count: groupBookings.length,
          },
          {
            key: "visitors",
            label: "Day Visitors",
            emoji: "🌴",
            count: dayVisitors.filter((v) => !v.departure_time).length,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${
              activeTab === tab.key
                ? "bg-blue-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.emoji} {tab.label}{" "}
            {tab.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-white/20 rounded">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        {/* ABSENCES TAB */}
        {activeTab === "absences" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Staff Absences</h2>
              <button
                onClick={() => setShowAbsenceModal(true)}
                className="px-4 py-2 bg-rose-500 text-white rounded-lg font-bold text-sm hover:bg-rose-600"
              >
                + Report Absence
              </button>
            </div>

            {absences.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No absences recorded in the last 7 days
              </div>
            ) : (
              <div className="space-y-3">
                {absences.map((absence) => {
                  const reasonInfo =
                    REASON_LABELS[
                      absence.reason as keyof typeof REASON_LABELS
                    ] || REASON_LABELS.other;
                  const isToday =
                    absence.absence_date ===
                    new Date().toISOString().split("T")[0];
                  return (
                    <div
                      key={absence.id}
                      className={`p-4 rounded-lg border ${isToday ? "bg-rose-50 border-rose-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{reasonInfo.emoji}</span>
                            <span className="font-bold">
                              {absence.users?.name || "Unknown"}
                            </span>
                            <span
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${reasonInfo.color}20`,
                                color: reasonInfo.color,
                              }}
                            >
                              {reasonInfo.label}
                            </span>
                            {isToday && (
                              <span className="text-xs px-2 py-0.5 bg-rose-500 text-white rounded-full">
                                HOY
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {absence.users?.department} |{" "}
                            {new Date(absence.absence_date).toLocaleDateString(
                              "es-CO",
                            )}
                          </div>
                          {absence.reason_details && (
                            <div className="text-sm text-slate-600 mt-2 italic">
                              "{absence.reason_details}"
                            </div>
                          )}
                        </div>
                        <div className="text-right">
                          {absence.tasks_redistributed && (
                            <div className="text-xs text-emerald-600 font-medium">
                              Tasks redistributed to:{" "}
                              {absence.redistributed_to.join(", ")}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DELEGATIONS TAB */}
        {activeTab === "delegations" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Approval Delegations</h2>
              <button
                onClick={() => setShowDelegationModal(true)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600"
              >
                + Add Delegation
              </button>
            </div>

            <div className="text-sm text-slate-500 mb-4 p-3 bg-blue-50 rounded-lg">
              When the primary approver doesn't respond within the timeout,
              approvals are automatically escalated to the backup.
            </div>

            {delegations.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No delegations configured
              </div>
            ) : (
              <div className="space-y-3">
                {delegations.map((delegation) => (
                  <div
                    key={delegation.id}
                    className={`p-4 rounded-lg border ${delegation.is_active ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">
                            {delegation.primary_user?.name || "Unknown"}
                          </span>
                          <span className="text-slate-400">→</span>
                          <span className="font-bold text-blue-600">
                            {delegation.backup_user?.name || "Unknown"}
                          </span>
                        </div>
                        <div className="text-sm text-slate-500 mt-1">
                          Type: {delegation.delegation_type} | Timeout:{" "}
                          {delegation.timeout_minutes} min
                        </div>
                      </div>
                      <button
                        onClick={() =>
                          handleToggleDelegation(
                            delegation.id,
                            delegation.is_active,
                          )
                        }
                        className={`px-3 py-1 rounded-lg text-sm font-bold ${
                          delegation.is_active
                            ? "bg-emerald-500 text-white"
                            : "bg-slate-300 text-slate-600"
                        }`}
                      >
                        {delegation.is_active ? "Active" : "Inactive"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* GROUP BOOKINGS TAB */}
        {activeTab === "groups" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">
                Group Bookings (Village Takeover)
              </h2>
              <button
                onClick={() => setShowGroupModal(true)}
                className="px-4 py-2 bg-purple-500 text-white rounded-lg font-bold text-sm hover:bg-purple-600"
              >
                + New Group Booking
              </button>
            </div>

            {groupBookings.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No active group bookings
              </div>
            ) : (
              <div className="space-y-3">
                {groupBookings.map((group) => {
                  const checkIn = new Date(group.check_in);
                  const checkOut = new Date(group.check_out);
                  const nights = Math.ceil(
                    (checkOut.getTime() - checkIn.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );
                  return (
                    <div
                      key={group.id}
                      className="p-4 rounded-lg border bg-purple-50 border-purple-200"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">👥</span>
                            <span className="font-bold text-lg">
                              {group.name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-purple-500 text-white rounded-full">
                              {group.status}
                            </span>
                          </div>
                          <div className="text-sm text-slate-600 mt-1">
                            Coordinator: {group.coordinator_name}{" "}
                            {group.coordinator_phone &&
                              `| ${group.coordinator_phone}`}
                          </div>
                          <div className="flex gap-4 mt-2 text-sm">
                            <span className="text-purple-700">
                              🏠 Villas: {group.villa_ids.join(", ")}
                            </span>
                            <span className="text-purple-700">
                              👥 {group.total_guests} guests
                            </span>
                            <span className="text-purple-700">
                              🌙 {nights} nights
                            </span>
                          </div>
                        </div>
                        <div className="text-right text-sm">
                          <div className="font-bold">
                            {checkIn.toLocaleDateString("es-CO")}
                          </div>
                          <div className="text-slate-500">
                            to {checkOut.toLocaleDateString("es-CO")}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* DAY VISITORS TAB */}
        {activeTab === "visitors" && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold">Day Visitors (Today)</h2>
              <button
                onClick={() => setShowVisitorModal(true)}
                className="px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600"
              >
                + Log Visitor
              </button>
            </div>

            <div className="text-sm text-slate-500 mb-4 p-3 bg-amber-50 rounded-lg">
              Day visitors are NOT counted in person-nights. Track consumption
              separately for revenue reporting.
            </div>

            {dayVisitors.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                No day visitors today
              </div>
            ) : (
              <div className="space-y-3">
                {dayVisitors.map((visitor) => {
                  const purposeInfo =
                    PURPOSE_LABELS[
                      visitor.purpose as keyof typeof PURPOSE_LABELS
                    ] || PURPOSE_LABELS.other;
                  const isActive = !visitor.departure_time;
                  return (
                    <div
                      key={visitor.id}
                      className={`p-4 rounded-lg border ${isActive ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{purposeInfo.emoji}</span>
                            <span className="font-bold">
                              {visitor.party_name}
                            </span>
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                              {visitor.party_size} people
                            </span>
                            {isActive && (
                              <span className="text-xs px-2 py-0.5 bg-emerald-500 text-white rounded-full">
                                ON SITE
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-slate-500 mt-1">
                            {purposeInfo.label}
                            {visitor.host_villa_id &&
                              ` | Host: ${visitor.host_guest_name || visitor.host_villa_id}`}
                            {visitor.arrival_time &&
                              ` | Arrived: ${visitor.arrival_time}`}
                          </div>
                          {visitor.consumption_total > 0 && (
                            <div className="text-sm font-bold text-emerald-600 mt-1">
                              Consumption: $
                              {visitor.consumption_total.toFixed(2)}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {isActive && (
                            <button
                              onClick={() => handleCheckoutVisitor(visitor.id)}
                              className="px-3 py-1 bg-rose-500 text-white rounded-lg text-sm font-bold hover:bg-rose-600"
                            >
                              Checkout
                            </button>
                          )}
                          {visitor.departure_time && (
                            <span className="text-sm text-slate-500">
                              Left: {visitor.departure_time}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ABSENCE MODAL */}
      {showAbsenceModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowAbsenceModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Report Staff Absence</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Staff Member *
                </label>
                <select
                  value={absenceForm.staffUserId}
                  onChange={(e) =>
                    setAbsenceForm((p) => ({
                      ...p,
                      staffUserId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select staff member</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.department})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  value={absenceForm.absenceDate}
                  onChange={(e) =>
                    setAbsenceForm((p) => ({
                      ...p,
                      absenceDate: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Reason *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(REASON_LABELS).map(
                    ([key, { label, emoji, color }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setAbsenceForm((p) => ({
                            ...p,
                            reason: key as typeof absenceForm.reason,
                          }))
                        }
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          absenceForm.reason === key
                            ? "border-2"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                        style={
                          absenceForm.reason === key
                            ? {
                                borderColor: color,
                                backgroundColor: `${color}10`,
                              }
                            : {}
                        }
                      >
                        {emoji} {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Details (optional)
                </label>
                <textarea
                  value={absenceForm.reasonDetails}
                  onChange={(e) =>
                    setAbsenceForm((p) => ({
                      ...p,
                      reasonDetails: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="Additional details..."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowAbsenceModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkAbsent}
                disabled={!absenceForm.staffUserId}
                className="flex-1 px-4 py-2 bg-rose-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Report Absence
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELEGATION MODAL */}
      {showDelegationModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowDelegationModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Add Approval Delegation</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Primary Approver *
                </label>
                <select
                  value={delegationForm.primaryApproverId}
                  onChange={(e) =>
                    setDelegationForm((p) => ({
                      ...p,
                      primaryApproverId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select manager</option>
                  {managers.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Backup Approver *
                </label>
                <select
                  value={delegationForm.backupApproverId}
                  onChange={(e) =>
                    setDelegationForm((p) => ({
                      ...p,
                      backupApproverId: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="">Select backup</option>
                  {managers
                    .filter((m) => m.id !== delegationForm.primaryApproverId)
                    .map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Delegation Type
                </label>
                <select
                  value={delegationForm.delegationType}
                  onChange={(e) =>
                    setDelegationForm((p) => ({
                      ...p,
                      delegationType: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                >
                  <option value="all">All Approvals</option>
                  <option value="checklist">Checklists Only</option>
                  <option value="purchase_order">Purchase Orders Only</option>
                  <option value="maintenance">Maintenance Only</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={delegationForm.timeoutMinutes}
                  onChange={(e) =>
                    setDelegationForm((p) => ({
                      ...p,
                      timeoutMinutes: parseInt(e.target.value) || 30,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowDelegationModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDelegation}
                disabled={
                  !delegationForm.primaryApproverId ||
                  !delegationForm.backupApproverId
                }
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Create Delegation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VISITOR MODAL */}
      {showVisitorModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowVisitorModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">Log Day Visitor</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Party Name *
                </label>
                <input
                  type="text"
                  value={visitorForm.partyName}
                  onChange={(e) =>
                    setVisitorForm((p) => ({ ...p, partyName: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Smith Family"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Party Size *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={visitorForm.partySize}
                    onChange={(e) =>
                      setVisitorForm((p) => ({
                        ...p,
                        partySize: parseInt(e.target.value) || 1,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Arrival Time
                  </label>
                  <input
                    type="time"
                    value={visitorForm.arrivalTime}
                    onChange={(e) =>
                      setVisitorForm((p) => ({
                        ...p,
                        arrivalTime: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Purpose *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(PURPOSE_LABELS).map(
                    ([key, { label, emoji }]) => (
                      <button
                        key={key}
                        type="button"
                        onClick={() =>
                          setVisitorForm((p) => ({
                            ...p,
                            purpose: key as typeof visitorForm.purpose,
                          }))
                        }
                        className={`p-2 rounded-lg border text-sm font-medium transition-all ${
                          visitorForm.purpose === key
                            ? "bg-blue-100 border-blue-500 text-blue-700"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        {emoji} {label}
                      </button>
                    ),
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Host Villa (optional)
                  </label>
                  <input
                    type="text"
                    value={visitorForm.hostVillaId}
                    onChange={(e) =>
                      setVisitorForm((p) => ({
                        ...p,
                        hostVillaId: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="e.g., villa_1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Host Guest Name
                  </label>
                  <input
                    type="text"
                    value={visitorForm.hostGuestName}
                    onChange={(e) =>
                      setVisitorForm((p) => ({
                        ...p,
                        hostGuestName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    placeholder="Guest inviting them"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={visitorForm.notes}
                  onChange={(e) =>
                    setVisitorForm((p) => ({ ...p, notes: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowVisitorModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleLogVisitor}
                disabled={!visitorForm.partyName || !visitorForm.partySize}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Log Visitor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GROUP BOOKING MODAL */}
      {showGroupModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowGroupModal(false)}
        >
          <div
            className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-bold mb-4">
              Create Group Booking (Village Takeover)
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Group Name *
                </label>
                <input
                  type="text"
                  value={groupForm.name}
                  onChange={(e) =>
                    setGroupForm((p) => ({ ...p, name: e.target.value }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder="e.g., Johnson Family Reunion"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Coordinator Name *
                  </label>
                  <input
                    type="text"
                    value={groupForm.coordinatorName}
                    onChange={(e) =>
                      setGroupForm((p) => ({
                        ...p,
                        coordinatorName: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={groupForm.coordinatorPhone}
                    onChange={(e) =>
                      setGroupForm((p) => ({
                        ...p,
                        coordinatorPhone: e.target.value,
                      }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={groupForm.coordinatorEmail}
                  onChange={(e) =>
                    setGroupForm((p) => ({
                      ...p,
                      coordinatorEmail: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Select Villas *
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    "villa_1",
                    "villa_2",
                    "villa_3",
                    "villa_4",
                    "villa_5",
                    "villa_6",
                    "villa_7",
                    "villa_8",
                    "villa_9",
                    "villa_10",
                  ].map((villaId) => (
                    <button
                      key={villaId}
                      type="button"
                      onClick={() => {
                        setGroupForm((p) => ({
                          ...p,
                          villaIds: p.villaIds.includes(villaId)
                            ? p.villaIds.filter((v) => v !== villaId)
                            : [...p.villaIds, villaId],
                        }));
                      }}
                      className={`p-2 rounded-lg border text-xs font-bold transition-all ${
                        groupForm.villaIds.includes(villaId)
                          ? "bg-purple-500 border-purple-500 text-white"
                          : "border-slate-200 hover:border-purple-300"
                      }`}
                    >
                      {villaId.replace("villa_", "V")}
                    </button>
                  ))}
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  {groupForm.villaIds.length} villa(s) selected
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Check-in *
                  </label>
                  <input
                    type="date"
                    value={groupForm.checkIn}
                    onChange={(e) =>
                      setGroupForm((p) => ({ ...p, checkIn: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Check-out *
                  </label>
                  <input
                    type="date"
                    value={groupForm.checkOut}
                    onChange={(e) =>
                      setGroupForm((p) => ({ ...p, checkOut: e.target.value }))
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Total Guests
                </label>
                <input
                  type="number"
                  min="1"
                  value={groupForm.totalGuests}
                  onChange={(e) =>
                    setGroupForm((p) => ({
                      ...p,
                      totalGuests: parseInt(e.target.value) || 0,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  placeholder={`Estimated: ${groupForm.villaIds.length * 4} guests`}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Special Requests
                </label>
                <textarea
                  value={groupForm.specialRequests}
                  onChange={(e) =>
                    setGroupForm((p) => ({
                      ...p,
                      specialRequests: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  rows={2}
                  placeholder="Group activities, dining preferences, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowGroupModal(false)}
                className="flex-1 px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGroupBooking}
                disabled={
                  !groupForm.name ||
                  !groupForm.coordinatorName ||
                  groupForm.villaIds.length === 0 ||
                  !groupForm.checkIn ||
                  !groupForm.checkOut
                }
                className="flex-1 px-4 py-2 bg-purple-500 text-white rounded-lg font-bold disabled:opacity-50"
              >
                Create Group Booking
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
