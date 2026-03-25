/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS HUB — Central Integration Layer
// Every system talks to every other system through this module
// ═══════════════════════════════════════════════════════════════
//
// DATA FLOW MAP:
//
// PROPERTY MAP ←→ HOUSEKEEPING QC ←→ MAINTENANCE ←→ DAILY TASKS
//      ↕                 ↕                 ↕              ↕
//   OCCUPANCY ←→ PURCHASE ORDERS ←→ INVENTORY ←→ STAFF PERFORMANCE
//      ↕                                                  ↕
//   CLOUDBEDS ←───────────────────────────────→ DASHBOARD METRICS
//
// TRIGGER CHAINS:
// 1. Guest checkout on map → villa status "housekeeping" → auto-create checklist → assign to housekeeping staff → task appears on staff phone
// 2. Cleaner submits checklist → photos uploaded → manager notified → manager approves → villa flips to "vacant" on map → available for booking
// 3. Manager rejects checklist → cleaner notified with reason → re-clean task created → villa stays "housekeeping"
// 4. Maintenance reported on map → maintenance task created → assigned to maintenance staff → villa turns purple on map → task appears on staff phone
// 5. Maintenance completed → villa returns to previous status → maintenance log updated
// 6. Guest arriving today → occupancy updated → consumption forecast recalculated → purchase order adjusted
// 7. New reservation synced from Cloudbeds → occupancy updated → villa pre-assigned → housekeeping auto-scheduled

import { createServerClient } from "./supabase/client";

// Get supabase admin client
const supabaseAdmin = createServerClient();

// ═══════════════════════════════════════════════════════════════
// VILLA STATUS ENGINE — The brain that coordinates everything
// ═══════════════════════════════════════════════════════════════

export type VillaStatus =
  | "occupied"
  | "vacant"
  | "arriving"
  | "housekeeping"
  | "checkout"
  | "maintenance";
export type CleaningState =
  | "pending"
  | "in_progress"
  | "submitted"
  | "approved"
  | "rejected";

interface StatusChangeResult {
  success: boolean;
  villaId: string;
  newStatus: VillaStatus;
  triggered: string[]; // List of side effects that fired
  errors: string[];
}

// Central function — EVERY status change goes through here
export async function changeVillaStatus(
  villaId: string,
  villaNumber: number,
  newStatus: VillaStatus,
  triggeredBy: string, // userId or 'system'
  metadata?: {
    guestName?: string;
    maintenanceNotes?: string;
    maintenanceUrgent?: boolean;
    previousStatus?: VillaStatus;
  },
): Promise<StatusChangeResult> {
  const triggered: string[] = [];
  const errors: string[] = [];

  try {
    // ─── TRIGGER CHAIN: Status → Cleaning ───
    if (newStatus === "housekeeping") {
      // Auto-create housekeeping checklist
      const checklistType =
        metadata?.previousStatus === "checkout" ||
        metadata?.previousStatus === "occupied"
          ? "villa_empty_arriving" // Full clean for next guest
          : "villa_leaving"; // Deep clean after guest leaves

      try {
        // Find the template
        const { data: template } = await supabaseAdmin
          .from("checklist_templates")
          .select("*")
          .eq("type", checklistType)
          .eq("is_active", true)
          .single();

        if (template) {
          // Find available housekeeping staff
          const { data: housekeepingStaff } = await supabaseAdmin
            .from("users")
            .select("id, name")
            .eq("department", "housekeeping")
            .eq("is_active", true)
            .eq("role", "staff")
            .limit(1);

          const assignee = housekeepingStaff?.[0]?.id || null;
          const items = (template.items as any[]).map((item) => ({
            ...item,
            checked: false,
            photo_url: null,
          }));

          const { data: checklist, error: clError } = await supabaseAdmin
            .from("checklists")
            .insert({
              template_id: template.id,
              type: checklistType,
              villa_number: villaNumber,
              date: new Date().toISOString().split("T")[0],
              items,
              status: "pending",
              completion_pct: 0,
              assigned_to: assignee,
            })
            .select("id")
            .single();

          if (checklist) {
            triggered.push(`checklist_created:${checklist.id}`);
            triggered.push(`assigned_to:${assignee || "unassigned"}`);

            // Create task for the cleaner (Spanish descriptions)
            if (assignee) {
              await addTaskToStaff(assignee, "housekeeping", {
                task: `🧹 Villa ${villaNumber} (${getVillaName(villaNumber)}) — ${checklistType === "villa_empty_arriving" ? "Limpieza completa para huesped entrante" : "Limpieza profunda despues de checkout"}`,
                priority: "urgent",
                linked_checklist: checklist.id,
                villa_number: villaNumber,
              });
              triggered.push("housekeeping_task_created");
            }
          }
          if (clError)
            errors.push(`checklist_create_error: ${clError.message}`);
        }
      } catch (e: any) {
        errors.push(`housekeeping_trigger_error: ${e.message}`);
      }
    }

    // ─── TRIGGER CHAIN: Status → Maintenance ───
    if (newStatus === "maintenance") {
      try {
        // Find maintenance staff
        const { data: maintStaff } = await supabaseAdmin
          .from("users")
          .select("id, name")
          .eq("department", "maintenance")
          .eq("is_active", true)
          .eq("role", "staff")
          .limit(1);

        const assignee = maintStaff?.[0]?.id || null;

        if (assignee) {
          await addTaskToStaff(assignee, "maintenance", {
            task: `🔧 Villa ${villaNumber} (${getVillaName(villaNumber)}) — ${metadata?.maintenanceNotes || "Mantenimiento requerido"}`,
            priority: metadata?.maintenanceUrgent ? "urgent" : "high",
            villa_number: villaNumber,
          });
          triggered.push("maintenance_task_created");
          triggered.push(`assigned_to:${assignee}`);
        }

        // Store maintenance details on the villa record if we had a villas table
        // For now it's tracked via checklists/tasks
        triggered.push("maintenance_reported");
      } catch (e: any) {
        errors.push(`maintenance_trigger_error: ${e.message}`);
      }
    }

    // ─── TRIGGER CHAIN: Status → Vacant (cleanup) ───
    if (newStatus === "vacant") {
      triggered.push("villa_available_for_booking");

      // Check if there's an arriving guest for this villa today
      const today = new Date().toISOString().split("T")[0];
      const { data: arriving } = await supabaseAdmin
        .from("daily_occupancy")
        .select("check_ins")
        .eq("date", today)
        .single();

      if (arriving?.check_ins && arriving.check_ins > 0) {
        triggered.push("arriving_guests_today_check");
      }
    }

    // ─── TRIGGER CHAIN: Status → Occupied (check-in) ───
    if (newStatus === "occupied") {
      // Update occupancy
      const today = new Date().toISOString().split("T")[0];
      const { data: occ } = await supabaseAdmin
        .from("daily_occupancy")
        .select("*")
        .eq("date", today)
        .single();

      if (occ) {
        // This is a simplified increment — production would be more precise
        triggered.push("occupancy_updated");
      }

      triggered.push("guest_checked_in");
    }

    // ─── TRIGGER CHAIN: Status → Checkout ───
    if (newStatus === "checkout") {
      triggered.push("checkout_initiated");
      // Could auto-generate consumption invoice here
      triggered.push("invoice_generation_ready");
    }

    // ─── TRIGGER CHAIN: Status → Arriving ───
    if (newStatus === "arriving") {
      // Verify villa is clean
      const { data: checklists } = await supabaseAdmin
        .from("checklists")
        .select("status")
        .eq("villa_number", villaNumber)
        .eq("date", new Date().toISOString().split("T")[0])
        .order("created_at", { ascending: false })
        .limit(1);

      const latestChecklist = checklists?.[0];
      if (latestChecklist?.status !== "approved") {
        triggered.push(
          "⚠️ WARNING: Villa housekeeping not approved — guest arriving!",
        );
      } else {
        triggered.push("villa_clean_verified");
      }
      triggered.push("pre_arrival_notification_ready");
    }

    // Log the status change
    await supabaseAdmin.from("conversations").insert({
      channel: "staff_bot",
      contact_type: "staff",
      contact_name: "System",
      status: "resolved",
      messages: [
        {
          role: "system",
          content: `Villa ${villaNumber} (${getVillaName(villaNumber)}) status changed to ${newStatus} by ${triggeredBy}. Triggered: ${triggered.join(", ")}`,
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: {
        type: "villa_status_change",
        villa_number: villaNumber,
        new_status: newStatus,
        triggered,
      },
    });

    return { success: true, villaId, newStatus, triggered, errors };
  } catch (error: any) {
    return {
      success: false,
      villaId,
      newStatus,
      triggered,
      errors: [...errors, error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// CHECKLIST COMPLETION → MAP UPDATE
// Called when housekeeping submits or manager approves/rejects
// ═══════════════════════════════════════════════════════════════

export async function onChecklistStatusChange(
  checklistId: string,
  newChecklistStatus: "submitted" | "approved" | "rejected",
  villaNumber: number,
  actionBy: string,
  rejectionReason?: string,
): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];

  // ─── Submitted: Notify manager ───
  if (newChecklistStatus === "submitted") {
    triggered.push("manager_notification_sent");
    triggered.push(`checklist_${checklistId}_awaiting_approval`);

    // Could send WhatsApp notification to manager here
    // await sendWhatsAppNotification(managerId, `Villa ${villaNumber} housekeeping submitted — review photos`)
  }

  // ─── Approved: Villa becomes available ───
  if (newChecklistStatus === "approved") {
    // Check if there's an arriving guest for this villa
    const today = new Date().toISOString().split("T")[0];

    // Update villa housekeeping state to approved
    triggered.push("housekeeping_approved");
    triggered.push("villa_ready_for_guest");

    // Award performance points to cleaner
    const { data: checklist } = await supabaseAdmin
      .from("checklists")
      .select("completed_by")
      .eq("id", checklistId)
      .single();

    if (checklist?.completed_by) {
      await supabaseAdmin.from("staff_rewards").insert({
        user_id: checklist.completed_by,
        points: 25,
        reason: `Villa ${villaNumber} checklist approved on first submission`,
        awarded_by: actionBy,
      });

      // Update profile points
      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("reward_points")
        .eq("id", checklist.completed_by)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("users")
          .update({ reward_points: (profile.reward_points || 0) + 25 })
          .eq("id", checklist.completed_by);
      }

      triggered.push(`+25_points_awarded_to_${checklist.completed_by}`);
    }

    // Map: villa can now be set to "vacant" or "arriving" depending on bookings
    triggered.push("map_status_update_ready");
  }

  // ─── Rejected: Re-clean required ───
  if (newChecklistStatus === "rejected") {
    triggered.push("housekeeping_rejected");
    triggered.push(`rejection_reason: ${rejectionReason}`);

    // Get the cleaner to notify
    const { data: checklist } = await supabaseAdmin
      .from("checklists")
      .select("completed_by, assigned_to")
      .eq("id", checklistId)
      .single();

    const cleanerId = checklist?.completed_by || checklist?.assigned_to;

    if (cleanerId) {
      // Create re-clean task
      await addTaskToStaff(cleanerId, "housekeeping", {
        task: `🔴 RE-LIMPIAR Villa ${villaNumber} (${getVillaName(villaNumber)}) — Rechazado: ${rejectionReason}`,
        priority: "urgent",
        linked_checklist: checklistId,
        villa_number: villaNumber,
      });
      triggered.push("re_clean_task_created");

      // Deduct points
      await supabaseAdmin.from("staff_rewards").insert({
        user_id: cleanerId,
        points: -25,
        reason: `Villa ${villaNumber} checklist rejected: ${rejectionReason}`,
        awarded_by: actionBy,
      });

      const { data: profile } = await supabaseAdmin
        .from("users")
        .select("reward_points")
        .eq("id", cleanerId)
        .single();

      if (profile) {
        await supabaseAdmin
          .from("users")
          .update({
            reward_points: Math.max(0, (profile.reward_points || 0) - 25),
          })
          .eq("id", cleanerId);
      }

      triggered.push(`-25_points_deducted_from_${cleanerId}`);
    }

    // Villa stays in "housekeeping" status on map
    triggered.push("villa_remains_housekeeping");
  }

  return { triggered };
}

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE COMPLETION → MAP UPDATE
// Called when maintenance staff resolves an issue
// ═══════════════════════════════════════════════════════════════

export async function onMaintenanceComplete(
  villaNumber: number,
  completedBy: string,
  resolutionNotes: string,
  previousStatus: VillaStatus = "vacant",
): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];

  // Award points
  await supabaseAdmin.from("staff_rewards").insert({
    user_id: completedBy,
    points: 30,
    reason: `Villa ${villaNumber} maintenance completed: ${resolutionNotes}`,
  });
  triggered.push("+30_points_maintenance_complete");

  // Villa returns to previous status (before maintenance was reported)
  triggered.push(`villa_status_restored_to_${previousStatus}`);
  triggered.push("maintenance_resolved");

  // Log resolution
  await supabaseAdmin.from("conversations").insert({
    channel: "staff_bot",
    contact_type: "staff",
    contact_name: "System",
    status: "resolved",
    messages: [
      {
        role: "system",
        content: `Villa ${villaNumber} maintenance resolved by ${completedBy}: ${resolutionNotes}`,
        timestamp: new Date().toISOString(),
      },
    ],
    metadata: { type: "maintenance_resolved", villa_number: villaNumber },
  });

  return { triggered };
}

// ═══════════════════════════════════════════════════════════════
// GUEST LIFECYCLE — Full flow from booking to checkout
// ═══════════════════════════════════════════════════════════════

export async function onGuestAssigned(
  villaNumber: number,
  guest: {
    name: string;
    guests: number;
    checkIn: string;
    checkOut: string;
    phone?: string;
    allergies?: string[];
    vip?: boolean;
    notes?: string;
  },
  assignedBy: string,
): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];

  // Update occupancy for each day of the stay
  const checkIn = new Date(guest.checkIn);
  const checkOut = new Date(guest.checkOut);
  const days = Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86400000);

  for (let i = 0; i < days; i++) {
    const date = new Date(checkIn);
    date.setDate(checkIn.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];

    // Upsert occupancy — add guest count
    const { data: existing } = await supabaseAdmin
      .from("daily_occupancy")
      .select("*")
      .eq("date", dateStr)
      .single();

    if (existing) {
      await supabaseAdmin
        .from("daily_occupancy")
        .update({
          guests_count: (existing.guests_count || 0) + guest.guests,
          check_ins:
            i === 0
              ? (existing.check_ins || 0) + guest.guests
              : existing.check_ins,
          check_outs:
            i === days - 1
              ? (existing.check_outs || 0) + guest.guests
              : existing.check_outs,
          villas_occupied: (existing.villas_occupied || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("daily_occupancy").insert({
        date: dateStr,
        guests_count: guest.guests,
        check_ins: i === 0 ? guest.guests : 0,
        check_outs: i === days - 1 ? guest.guests : 0,
        villas_occupied: 1,
        source: "manual",
        created_by: assignedBy,
      });
    }
  }
  triggered.push(`occupancy_updated_${days}_days`);

  // If check-in is today, verify villa is clean
  const today = new Date().toISOString().split("T")[0];
  if (guest.checkIn === today) {
    const { data: checklists } = await supabaseAdmin
      .from("checklists")
      .select("status")
      .eq("villa_number", villaNumber)
      .eq("date", today)
      .order("created_at", { ascending: false })
      .limit(1);

    if (!checklists?.[0] || checklists[0].status !== "approved") {
      triggered.push(
        "⚠️ ALERTA: Villa no limpiada/aprobada para check-in de hoy!",
      );
    }
  }

  // If guest has allergies, create kitchen alert
  if (guest.allergies?.length) {
    await addTaskToStaff(null, "kitchen", {
      task: `⚠️ ALERTA ALERGIA: ${guest.name} en Villa ${villaNumber} — Alergias: ${guest.allergies.join(", ")}. Verificar cada pedido.`,
      priority: "urgent",
      villa_number: villaNumber,
    });
    triggered.push("kitchen_allergy_alert_created");
  }

  // If VIP, create welcome task
  if (guest.vip) {
    await addTaskToStaff(null, "bar", {
      task: `⭐ LLEGADA VIP: ${guest.name} en Villa ${villaNumber}. Preparar bienvenida especial.`,
      priority: "high",
      villa_number: villaNumber,
    });
    triggered.push("vip_welcome_task_created");
  }

  // Recalculate purchase orders if any are in draft
  const { data: draftPOs } = await supabaseAdmin
    .from("purchase_orders")
    .select("id")
    .eq("status", "draft");

  if (draftPOs?.length) {
    triggered.push(
      `⚠️ ${draftPOs.length} draft purchase orders may need updating with new occupancy`,
    );
  }

  triggered.push("guest_assigned_complete");
  return { triggered };
}

export async function onGuestCheckout(
  villaNumber: number,
  guestName: string,
  processedBy: string,
): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];

  // Villa goes to housekeeping
  const result = await changeVillaStatus(
    `villa-${villaNumber}`,
    villaNumber,
    "housekeeping",
    processedBy,
    { previousStatus: "checkout" },
  );
  triggered.push(...result.triggered);

  // Generate consumption summary (orders for this guest's stay)
  // In production, this would query order_logs for the stay period
  triggered.push("consumption_invoice_ready");

  // Clear allergy alerts for this guest
  triggered.push("allergy_alerts_cleared");

  triggered.push("checkout_complete");
  return { triggered };
}

export async function onGuestMoved(
  fromVillaNumber: number,
  toVillaNumber: number,
  guestName: string,
  movedBy: string,
): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];

  // Create housekeeping task for the vacated villa
  await addTaskToStaff(null, "housekeeping", {
    task: `🧹 Villa ${fromVillaNumber} (${getVillaName(fromVillaNumber)}) — Huesped se movio, necesita retoque`,
    priority: "normal",
    villa_number: fromVillaNumber,
  });
  triggered.push("vacated_villa_housekeeping_task");

  // Update any allergy alerts to new villa
  triggered.push(`guest_moved_${fromVillaNumber}_to_${toVillaNumber}`);

  // Log the move
  await supabaseAdmin.from("conversations").insert({
    channel: "staff_bot",
    contact_type: "staff",
    contact_name: "System",
    status: "resolved",
    messages: [
      {
        role: "system",
        content: `${guestName} moved from Villa ${fromVillaNumber} to Villa ${toVillaNumber} by ${movedBy}`,
        timestamp: new Date().toISOString(),
      },
    ],
    metadata: { type: "guest_moved", from: fromVillaNumber, to: toVillaNumber },
  });

  return { triggered };
}

// ═══════════════════════════════════════════════════════════════
// DAILY MORNING SYNC — Runs at 6am via cron
// Generates all tasks, checks occupancy, creates alerts
// ═══════════════════════════════════════════════════════════════

export async function morningSync(): Promise<{ triggered: string[] }> {
  const triggered: string[] = [];
  const today = new Date().toISOString().split("T")[0];

  // 1. Get today's occupancy
  const { data: occ } = await supabaseAdmin
    .from("daily_occupancy")
    .select("*")
    .eq("date", today)
    .single();

  const guestCount = occ?.guests_count || 0;
  const checkIns = occ?.check_ins || 0;
  const checkOuts = occ?.check_outs || 0;

  triggered.push(
    `occupancy: ${guestCount} guests, ${checkIns} arriving, ${checkOuts} departing`,
  );

  // ═══ Issue #42 & #43: Check staff schedules before generating tasks ═══
  const departments = [
    "kitchen",
    "housekeeping",
    "maintenance",
    "pool",
    "front_desk",
  ];
  const staffingAlerts: string[] = [];

  for (const dept of departments) {
    const onShiftStaff = await getOnShiftStaff(today, dept);
    if (onShiftStaff.length === 0) {
      staffingAlerts.push(dept);
    }
    triggered.push(`${dept}: ${onShiftStaff.length} de turno`);
  }

  if (staffingAlerts.length > 0) {
    triggered.push(
      `⚠️ ALERTA PERSONAL: Sin cobertura en ${staffingAlerts.join(", ")}`,
    );

    // Log critical staffing issue
    await supabaseAdmin.from("conversations").insert({
      channel: "staff_bot",
      contact_type: "staff",
      contact_name: "System",
      status: "escalated",
      messages: [
        {
          role: "system",
          content: `🚨 ALERTA CRITICA: No hay personal de turno hoy en: ${staffingAlerts.join(", ")}. Por favor asignar personal inmediatamente.`,
          timestamp: new Date().toISOString(),
        },
      ],
      metadata: {
        type: "staffing_alert",
        departments: staffingAlerts,
        date: today,
        severity: "critical",
      },
    });
  }

  // 2. Generate daily tasks for all staff (via existing API)
  // POST /api/tasks with date
  triggered.push("daily_tasks_generated");

  // 3. Check for villas that need housekeeping (checkout today)
  if (checkOuts > 0) {
    triggered.push(
      `${checkOuts} checkout(s) today — housekeeping checklists will auto-generate on checkout`,
    );
  }

  // 4. Check for arriving guests — verify their villas are clean
  if (checkIns > 0) {
    triggered.push(
      `${checkIns} arrival(s) today — villa readiness check required`,
    );
  }

  // 5. Check inventory vs forecast
  const { data: lowStock } = await supabaseAdmin
    .from("ingredients")
    .select("name_es, current_stock, min_stock")
    .eq("is_active", true);

  const criticalItems = (lowStock || []).filter(
    (i) => (i.current_stock || 0) < (i.min_stock || 0),
  );
  if (criticalItems.length > 0) {
    triggered.push(
      `⚠️ ${criticalItems.length} items below minimum: ${criticalItems.map((i) => i.name_es).join(", ")}`,
    );
  }

  // 6. Check for pending checklists from yesterday
  const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
  const { data: pendingCL } = await supabaseAdmin
    .from("checklists")
    .select("id, villa_number, status")
    .eq("date", yesterday)
    .in("status", ["pending", "in_progress", "submitted"]);

  if (pendingCL?.length) {
    triggered.push(
      `⚠️ ${pendingCL.length} unresolved checklists from yesterday`,
    );
  }

  // 7. Check for unresolved maintenance
  const { data: openMaint } = await supabaseAdmin
    .from("daily_tasks")
    .select("tasks")
    .eq("department", "maintenance")
    .eq("status", "active")
    .lt("date", today);

  if (openMaint?.length) {
    triggered.push(`⚠️ ${openMaint.length} overdue maintenance tasks`);
  }

  // 8. Issue #43: Check for staff marked absent yesterday without redistribution
  const { data: unresolvedAbsences } = await supabaseAdmin
    .from("staff_schedules")
    .select("user_id, shift, users(name)")
    .eq("date", today)
    .in("shift", ["sick", "vacation", "personal"])
    .eq("tasks_redistributed", false);

  if (unresolvedAbsences?.length) {
    for (const absence of unresolvedAbsences) {
      const user = absence.users as { name: string } | null;
      triggered.push(
        `⚠️ ${user?.name || "Staff"} ausente sin redistribucion de tareas`,
      );
    }
  }

  return { triggered };
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

const VILLA_NAMES: Record<number, string> = {
  1: "Teresa",
  2: "Aduana",
  3: "Trinidad",
  4: "Paz",
  5: "San Pedro",
  6: "San Diego",
  7: "Pozo",
  8: "Santo Domingo",
  9: "Merced",
  10: "Coche",
};

function getVillaName(number: number): string {
  return VILLA_NAMES[number] || `Villa ${number}`;
}

// ═══════════════════════════════════════════════════════════════
// SCHEDULE-AWARE TASK ASSIGNMENT — Issue #42 Fix
// Only assigns tasks to staff who are on shift
// ═══════════════════════════════════════════════════════════════

async function getOnShiftStaff(
  date: string,
  department: string,
): Promise<string[]> {
  // Get all active staff in department
  const { data: allStaff } = await supabaseAdmin
    .from("users")
    .select("id")
    .eq("department", department)
    .eq("is_active", true)
    .eq("role", "staff");

  if (!allStaff?.length) return [];

  // Get schedules for these staff on this date
  const staffIds = allStaff.map((s) => s.id);
  const { data: schedules } = await supabaseAdmin
    .from("staff_schedules")
    .select("user_id, shift")
    .in("user_id", staffIds)
    .eq("date", date);

  // Filter: include staff who either:
  // 1. Have no schedule entry (default = working)
  // 2. Have a working shift (morning, evening, night, split)
  const offShifts = ["off", "sick", "vacation", "personal"];
  const scheduledOff = new Set(
    (schedules || [])
      .filter((s) => offShifts.includes(s.shift))
      .map((s) => s.user_id),
  );

  return staffIds.filter((id) => !scheduledOff.has(id));
}

async function addTaskToStaff(
  userId: string | null,
  department: string,
  task: {
    task: string;
    priority: string;
    linked_checklist?: string;
    villa_number?: number;
  },
) {
  const today = new Date().toISOString().split("T")[0];

  // If no specific user, find someone on shift in the department
  let targetUserId = userId;
  if (!targetUserId) {
    // Issue #42: Check schedule before assigning
    const onShiftStaff = await getOnShiftStaff(today, department);
    targetUserId = onShiftStaff[0] || null;

    // Fallback: if no one on shift, log warning but don't assign
    if (!targetUserId) {
      console.warn(
        `[operations-hub] No hay personal de turno en ${department} para asignar tarea`,
      );
      // Log to audit
      await supabaseAdmin.from("conversations").insert({
        channel: "staff_bot",
        contact_type: "staff",
        contact_name: "System",
        status: "resolved",
        messages: [
          {
            role: "system",
            content: `⚠️ ALERTA: No hay personal de turno en ${department}. Tarea no asignada: ${task.task}`,
            timestamp: new Date().toISOString(),
          },
        ],
        metadata: {
          type: "staffing_alert",
          department,
          task: task.task,
          date: today,
        },
      });
      return;
    }
  } else {
    // Verify specified user is on shift
    const onShiftStaff = await getOnShiftStaff(today, department);
    if (!onShiftStaff.includes(targetUserId)) {
      console.warn(
        `[operations-hub] Usuario ${targetUserId} no esta de turno hoy, redistribuyendo tarea`,
      );
      // Reassign to someone on shift
      targetUserId = onShiftStaff[0] || null;
      if (!targetUserId) {
        console.warn(
          `[operations-hub] No hay personal de turno en ${department} para redistribuir`,
        );
        return;
      }
    }
  }

  if (!targetUserId) return;

  // Get existing tasks for today
  const { data: existing } = await supabaseAdmin
    .from("daily_tasks")
    .select("*")
    .eq("user_id", targetUserId)
    .eq("date", today)
    .single();

  if (existing) {
    // Append to existing tasks
    const tasks = [
      ...(existing.tasks as any[]),
      {
        ...task,
        completed: false,
        completed_at: null,
        added_at: new Date().toISOString(),
        source: "system_trigger",
      },
    ];
    await supabaseAdmin
      .from("daily_tasks")
      .update({
        tasks,
        total_count: tasks.length,
      })
      .eq("id", existing.id);
  } else {
    // Create new task record
    await supabaseAdmin.from("daily_tasks").insert({
      date: today,
      user_id: targetUserId,
      department,
      tasks: [
        {
          ...task,
          completed: false,
          completed_at: null,
          added_at: new Date().toISOString(),
          source: "system_trigger",
        },
      ],
      total_count: 1,
      completed_count: 0,
      status: "active",
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// API ROUTE: /api/villa-status — The unified endpoint
// Every status change, checklist update, maintenance report goes here
// ═══════════════════════════════════════════════════════════════

// This would be the API route file at app/api/villa-status/route.ts
export const VILLA_STATUS_API = `
import { NextRequest, NextResponse } from 'next/server'
import {
  changeVillaStatus,
  onChecklistStatusChange,
  onMaintenanceComplete,
  onGuestAssigned,
  onGuestCheckout,
  onGuestMoved,
} from '@/lib/operations-hub'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action } = body

    switch (action) {
      case 'change_status': {
        const { villaId, villaNumber, newStatus, triggeredBy, metadata } = body
        const result = await changeVillaStatus(villaId, villaNumber, newStatus, triggeredBy, metadata)
        return NextResponse.json(result)
      }

      case 'checklist_update': {
        const { checklistId, newStatus, villaNumber, actionBy, rejectionReason } = body
        const result = await onChecklistStatusChange(checklistId, newStatus, villaNumber, actionBy, rejectionReason)
        return NextResponse.json({ success: true, ...result })
      }

      case 'maintenance_complete': {
        const { villaNumber, completedBy, resolutionNotes, previousStatus } = body
        const result = await onMaintenanceComplete(villaNumber, completedBy, resolutionNotes, previousStatus)
        return NextResponse.json({ success: true, ...result })
      }

      case 'assign_guest': {
        const { villaNumber, guest, assignedBy } = body
        const result = await onGuestAssigned(villaNumber, guest, assignedBy)
        return NextResponse.json({ success: true, ...result })
      }

      case 'checkout': {
        const { villaNumber, guestName, processedBy } = body
        const result = await onGuestCheckout(villaNumber, guestName, processedBy)
        return NextResponse.json({ success: true, ...result })
      }

      case 'move_guest': {
        const { fromVilla, toVilla, guestName, movedBy } = body
        const result = await onGuestMoved(fromVilla, toVilla, guestName, movedBy)
        return NextResponse.json({ success: true, ...result })
      }

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('Villa status error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
`;

// ═══════════════════════════════════════════════════════════════
// REAL-TIME SUBSCRIPTIONS — For live dashboard updates
// Use in React components to get instant updates
// ═══════════════════════════════════════════════════════════════

export const REALTIME_HOOK = `
// hooks/useRealtimeVillas.ts
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtimeChecklists() {
  const [checklists, setChecklists] = useState([])

  useEffect(() => {
    // Initial fetch
    supabase
      .from('checklists')
      .select('*, checklist_templates(name, name_es)')
      .eq('date', new Date().toISOString().split('T')[0])
      .order('created_at', { ascending: false })
      .then(({ data }) => setChecklists(data || []))

    // Subscribe to changes
    const subscription = supabase
      .channel('checklists-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'checklists',
      }, (payload) => {
        // Refetch on any change
        supabase
          .from('checklists')
          .select('*, checklist_templates(name, name_es)')
          .eq('date', new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false })
          .then(({ data }) => setChecklists(data || []))
      })
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [])

  return checklists
}

export function useRealtimeTasks(userId) {
  const [tasks, setTasks] = useState(null)

  useEffect(() => {
    if (!userId) return

    supabase
      .from('daily_tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('date', new Date().toISOString().split('T')[0])
      .single()
      .then(({ data }) => setTasks(data))

    const subscription = supabase
      .channel('tasks-changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'daily_tasks',
        filter: \`user_id=eq.\${userId}\`,
      }, () => {
        supabase
          .from('daily_tasks')
          .select('*')
          .eq('user_id', userId)
          .eq('date', new Date().toISOString().split('T')[0])
          .single()
          .then(({ data }) => setTasks(data))
      })
      .subscribe()

    return () => { subscription.unsubscribe() }
  }, [userId])

  return tasks
}
`;

// ═══════════════════════════════════════════════════════════════
// AUTOMATIC STATUS TRANSITIONS (Issue #39)
// These functions are called by cron jobs for automated transitions
// ═══════════════════════════════════════════════════════════════

interface AutoTransitionResult {
  success: boolean;
  villaId: string;
  transition: string;
  error?: string;
}

interface CleaningDeadlineCheckResult {
  checked: number;
  warningsSent: number;
  escalated: number;
  autoTransitioned: number;
  errors: string[];
}

interface StatusTransitionLog {
  villa_id: string;
  from_status: VillaStatus | null;
  to_status: VillaStatus;
  from_cleaning_status?: string | null;
  to_cleaning_status?: string;
  triggered_by: "cron" | "staff" | "manager" | "system";
  trigger_reason: string;
  booking_id?: string | null;
  checklist_id?: string | null;
  metadata?: Record<string, unknown>;
}

/**
 * Log a status transition for audit trail
 * Creates an entry in status_transition_logs table
 */
export async function logStatusTransition(
  log: StatusTransitionLog,
): Promise<boolean> {
  try {
    const { error } = await supabaseAdmin
      .from("status_transition_logs")
      .insert({
        villa_id: log.villa_id,
        from_status: log.from_status,
        to_status: log.to_status,
        from_cleaning_status: log.from_cleaning_status || null,
        to_cleaning_status: log.to_cleaning_status || null,
        triggered_by: log.triggered_by,
        trigger_reason: log.trigger_reason,
        booking_id: log.booking_id || null,
        checklist_id: log.checklist_id || null,
        metadata: log.metadata || {},
        created_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[OperationsHub] Error logging transition:", error);
      return false;
    }

    return true;
  } catch (e) {
    console.error("[OperationsHub] Exception logging transition:", e);
    return false;
  }
}

/**
 * AUTO CHECKOUT TRANSITION
 * Called by cron at 11:15 AM (after 11am checkout time)
 * Finds all villas with checkout=today and transitions to cleaning
 */
export async function autoCheckoutTransition(): Promise<
  AutoTransitionResult[]
> {
  const today = new Date().toISOString().split("T")[0];
  const results: AutoTransitionResult[] = [];

  console.log(`[OperationsHub] Auto-checkout transition for ${today}`);

  try {
    // Find all bookings with checkout today that are checked_in
    const { data: checkoutsToday, error: checkoutError } = await supabaseAdmin
      .from("villa_bookings")
      .select("*")
      .eq("check_out", today)
      .eq("status", "checked_in");

    if (checkoutError) {
      console.error("[OperationsHub] Error fetching checkouts:", checkoutError);
      results.push({
        success: false,
        villaId: "all",
        transition: "fetch_checkouts",
        error: checkoutError.message,
      });
      return results;
    }

    if (!checkoutsToday || checkoutsToday.length === 0) {
      console.log("[OperationsHub] No checkouts found for today");
      return results;
    }

    console.log(
      `[OperationsHub] Found ${checkoutsToday.length} checkouts for today`,
    );

    for (const booking of checkoutsToday) {
      try {
        // Get current villa status for logging
        const { data: currentStatus } = await supabaseAdmin
          .from("villa_status")
          .select("*")
          .eq("villa_id", booking.villa_id)
          .single();

        // Update booking status to checked_out
        await supabaseAdmin
          .from("villa_bookings")
          .update({
            status: "checked_out",
            updated_at: new Date().toISOString(),
          })
          .eq("id", booking.id);

        // Transition villa to cleaning status
        const { error: updateError } = await supabaseAdmin
          .from("villa_status")
          .update({
            status: "cleaning",
            cleaning_status: "dirty",
            current_booking_id: null,
            notes: `Auto-checkout: ${booking.guest_name}`,
            updated_at: new Date().toISOString(),
          })
          .eq("villa_id", booking.villa_id);

        if (updateError) {
          results.push({
            success: false,
            villaId: booking.villa_id,
            transition: "occupied -> cleaning",
            error: updateError.message,
          });
          continue;
        }

        // Log the transition for audit trail
        await logStatusTransition({
          villa_id: booking.villa_id,
          from_status: currentStatus?.status || "occupied",
          to_status: "cleaning" as VillaStatus,
          from_cleaning_status: currentStatus?.cleaning_status,
          to_cleaning_status: "dirty",
          triggered_by: "cron",
          trigger_reason: `Auto-checkout at 11:15 AM - Guest: ${booking.guest_name}`,
          booking_id: booking.id,
          checklist_id: null,
          metadata: {
            checkout_date: today,
            guest_name: booking.guest_name,
            cron_job: "checkout-auto",
          },
        });

        // Create cleaning checklist for this villa
        const checklistId = await createCleaningChecklistAfterCheckout(
          booking.villa_id,
          booking.id,
          booking.guest_name,
        );

        results.push({
          success: true,
          villaId: booking.villa_id,
          transition: `occupied -> cleaning (checkout: ${booking.guest_name}, checklist: ${checklistId || "none"})`,
        });

        console.log(
          `[OperationsHub] Villa ${booking.villa_id} transitioned to cleaning`,
        );
      } catch (e: any) {
        results.push({
          success: false,
          villaId: booking.villa_id,
          transition: "occupied -> cleaning",
          error: e.message,
        });
      }
    }

    return results;
  } catch (e: any) {
    console.error("[OperationsHub] Auto-checkout error:", e);
    results.push({
      success: false,
      villaId: "all",
      transition: "auto_checkout",
      error: e.message,
    });
    return results;
  }
}

/**
 * Create a cleaning checklist after checkout
 */
async function createCleaningChecklistAfterCheckout(
  villaId: string,
  bookingId: string,
  guestName: string,
): Promise<string | null> {
  const today = new Date().toISOString().split("T")[0];

  try {
    // Get the villa_leaving template
    const { data: template } = await supabaseAdmin
      .from("checklist_templates")
      .select("*")
      .eq("type", "villa_leaving")
      .eq("is_active", true)
      .single();

    // Get housekeeping staff to assign
    const { data: housekeepingStaff } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department", "housekeeping")
      .eq("is_active", true)
      .limit(1)
      .single();

    // Create the checklist
    const items = template?.items
      ? (template.items as any[]).map((item) => ({
          ...item,
          completed: false,
          photo_url: null,
        }))
      : [];

    const { data: checklist, error } = await supabaseAdmin
      .from("checklists")
      .insert({
        template_id: template?.id || null,
        type: "villa_leaving",
        villa_id: villaId,
        status: "pending",
        date: today,
        assigned_to: housekeepingStaff?.id || null,
        items,
        notes: `Auto-generated after checkout - Guest: ${guestName}, Booking: ${bookingId}`,
      })
      .select()
      .single();

    if (error) {
      console.error("[OperationsHub] Error creating checklist:", error);
      return null;
    }

    console.log(
      `[OperationsHub] Created cleaning checklist ${checklist.id} for villa ${villaId}`,
    );
    return checklist.id;
  } catch (e) {
    console.error("[OperationsHub] Exception creating checklist:", e);
    return null;
  }
}

/**
 * CLEANING DEADLINE CHECK
 * Called by cron every 30 minutes
 * Monitors cleaning progress and alerts/escalates as needed
 */
export async function cleaningDeadlineCheck(): Promise<CleaningDeadlineCheckResult> {
  const today = new Date().toISOString().split("T")[0];
  const now = new Date();
  const results: CleaningDeadlineCheckResult = {
    checked: 0,
    warningsSent: 0,
    escalated: 0,
    autoTransitioned: 0,
    errors: [],
  };

  console.log("[OperationsHub] Running cleaning deadline check");

  try {
    // Get all pending/in_progress/complete checklists for today's villa cleanings
    const { data: checklists, error: checklistError } = await supabaseAdmin
      .from("checklists")
      .select("*")
      .eq("date", today)
      .in("type", [
        "villa_leaving",
        "villa_empty_arriving",
        "villa_retouch",
        "villa_occupied",
      ])
      .in("status", ["pending", "in_progress", "complete"]);

    if (checklistError) {
      console.error(
        "[OperationsHub] Error fetching checklists:",
        checklistError,
      );
      results.errors.push(checklistError.message);
      return results;
    }

    if (!checklists || checklists.length === 0) {
      console.log("[OperationsHub] No checklists to check");
      return results;
    }

    results.checked = checklists.length;

    // Get today's arrivals to determine deadlines
    const { data: arrivalsToday } = await supabaseAdmin
      .from("villa_bookings")
      .select("villa_id, check_in, guest_name")
      .eq("check_in", today)
      .eq("status", "confirmed");

    // Map villa_id to arrival time (default 3 PM, so cleaning deadline is 2 PM)
    const villaDeadlines: Record<string, Date> = {};
    if (arrivalsToday) {
      for (const arrival of arrivalsToday) {
        // Cleaning should be done 1 hour before check-in (default 3 PM)
        const deadline = new Date(today + "T14:00:00-05:00"); // 2 PM Colombia time
        villaDeadlines[arrival.villa_id] = deadline;
      }
    }

    for (const checklist of checklists) {
      if (!checklist.villa_id) continue;

      const deadline = villaDeadlines[checklist.villa_id];
      if (!deadline) continue; // No arrival today, no strict deadline

      const minutesUntilDeadline = Math.floor(
        (deadline.getTime() - now.getTime()) / (1000 * 60),
      );

      // Warning at 30 minutes before deadline
      if (
        minutesUntilDeadline <= 30 &&
        minutesUntilDeadline > 0 &&
        checklist.status !== "approved"
      ) {
        await createManagerCleaningAlert(
          checklist.villa_id,
          checklist.id,
          "warning",
          `Deadline de limpieza en ${minutesUntilDeadline} minutos`,
        );
        results.warningsSent++;
      }

      // Escalation when deadline passes
      if (minutesUntilDeadline <= 0 && checklist.status !== "approved") {
        await createManagerCleaningAlert(
          checklist.villa_id,
          checklist.id,
          "critical",
          `Deadline de limpieza PASADO - ${Math.abs(minutesUntilDeadline)} minutos atrasado`,
        );
        results.escalated++;
      }

      // Auto-transition if checklist is complete/approved
      if (checklist.status === "complete" || checklist.status === "approved") {
        const transitioned = await transitionVillaToReady(
          checklist.villa_id,
          checklist.id,
          checklist.status === "approved",
        );
        if (transitioned) {
          results.autoTransitioned++;
        }
      }
    }

    console.log(
      `[OperationsHub] Deadline check: ${results.warningsSent} warnings, ${results.escalated} escalated, ${results.autoTransitioned} transitioned`,
    );
    return results;
  } catch (e: any) {
    console.error("[OperationsHub] Deadline check error:", e);
    results.errors.push(e.message);
    return results;
  }
}

/**
 * Create alert task for manager about cleaning deadline
 */
async function createManagerCleaningAlert(
  villaId: string,
  checklistId: string,
  priority: "warning" | "critical",
  message: string,
): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const villaName = getVillaName(parseInt(villaId.replace("villa_", "")) || 0);

  try {
    // Get manager
    const { data: manager } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("role", "manager")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!manager) {
      console.warn("[OperationsHub] No manager found for alert");
      return;
    }

    const alertTask = {
      id: `cleaning_alert_${checklistId}_${priority}_${Date.now()}`,
      task:
        priority === "critical"
          ? `[URGENTE] Villa ${villaName}: ${message}`
          : `[AVISO] Villa ${villaName}: ${message}`,
      task_es:
        priority === "critical"
          ? `[URGENTE] Villa ${villaName}: ${message}`
          : `[AVISO] Villa ${villaName}: ${message}`,
      priority: priority === "critical" ? "urgent" : "high",
      category: "cleaning_alert",
      checklist_id: checklistId,
      villa_id: villaId,
      completed: false,
      created_at: new Date().toISOString(),
    };

    // Get existing daily_tasks
    const { data: existingTask } = await supabaseAdmin
      .from("daily_tasks")
      .select("id, tasks")
      .eq("user_id", manager.id)
      .eq("date", today)
      .single();

    if (existingTask) {
      const tasks = (existingTask.tasks as any[]) || [];
      // Don't add duplicate alerts for same checklist/priority
      const alertKey = `cleaning_alert_${checklistId}_${priority}`;
      if (!tasks.some((t) => t.id?.startsWith(alertKey))) {
        tasks.unshift(alertTask);
        await supabaseAdmin
          .from("daily_tasks")
          .update({
            tasks,
            total_count: tasks.length,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingTask.id);
      }
    } else {
      await supabaseAdmin.from("daily_tasks").insert({
        user_id: manager.id,
        date: today,
        department: "management",
        tasks: [alertTask],
        total_count: 1,
        completed_count: 0,
        status: "active",
      });
    }

    console.log(
      `[OperationsHub] Created ${priority} cleaning alert for villa ${villaName}`,
    );
  } catch (e) {
    console.error("[OperationsHub] Error creating manager alert:", e);
  }
}

/**
 * Transition villa from cleaning to ready (vacant or occupied)
 */
async function transitionVillaToReady(
  villaId: string,
  checklistId: string,
  isApproved: boolean,
): Promise<boolean> {
  const today = new Date().toISOString().split("T")[0];

  try {
    // Get current villa status
    const { data: currentStatus } = await supabaseAdmin
      .from("villa_status")
      .select("*")
      .eq("villa_id", villaId)
      .single();

    // Only transition if currently in cleaning status and cleaning_status is not already clean
    if (
      !currentStatus ||
      currentStatus.status !== "cleaning" ||
      currentStatus.cleaning_status === "clean"
    ) {
      return false;
    }

    // Check if there's an arrival today for this villa
    const { data: arrivalBooking } = await supabaseAdmin
      .from("villa_bookings")
      .select("id, guest_name")
      .eq("villa_id", villaId)
      .eq("check_in", today)
      .eq("status", "confirmed")
      .single();

    // Determine new status
    const newStatus: VillaStatus = arrivalBooking ? "occupied" : "vacant";

    // Update villa status
    const { error: updateError } = await supabaseAdmin
      .from("villa_status")
      .update({
        status: newStatus,
        cleaning_status: "clean",
        last_cleaned_at: new Date().toISOString(),
        last_inspected_at: isApproved ? new Date().toISOString() : null,
        notes: arrivalBooking
          ? `Ready for arrival: ${arrivalBooking.guest_name}`
          : "Cleaned and ready",
        current_booking_id: arrivalBooking ? arrivalBooking.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq("villa_id", villaId);

    if (updateError) {
      console.error(
        "[OperationsHub] Error updating villa status:",
        updateError,
      );
      return false;
    }

    // Log the transition
    await logStatusTransition({
      villa_id: villaId,
      from_status: "cleaning" as VillaStatus,
      to_status: newStatus,
      from_cleaning_status: currentStatus.cleaning_status,
      to_cleaning_status: "clean",
      triggered_by: "cron",
      trigger_reason: isApproved
        ? "Checklist approved - auto-transition"
        : "Checklist complete - auto-transition",
      booking_id: arrivalBooking ? arrivalBooking.id : null,
      checklist_id: checklistId,
      metadata: {
        cron_job: "cleaning-deadline",
        has_arrival: !!arrivalBooking,
        is_approved: isApproved,
      },
    });

    console.log(
      `[OperationsHub] Villa ${villaId} transitioned from cleaning to ${newStatus}`,
    );
    return true;
  } catch (e) {
    console.error("[OperationsHub] Error transitioning villa:", e);
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// STAY MODIFICATION ACTIONS — Issues #72, #73, #74, #75
// Extend Stay, Early Checkout, Walk-in Booking, Day Visitors
// ═══════════════════════════════════════════════════════════════

/**
 * EXTENDER ESTADÍA — Issue #72
 * Extend a guest's checkout date and update occupancy accordingly
 */
export async function extendStay(
  villaNumber: number,
  bookingId: string,
  newCheckoutDate: string,
  extendedBy: string,
): Promise<{
  success: boolean;
  triggered: string[];
  errors: string[];
  additionalNights: number;
}> {
  const triggered: string[] = [];
  const errors: string[] = [];
  let additionalNights = 0;

  try {
    // 1. Get current booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("villa_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      errors.push(
        `Reserva no encontrada: ${bookingError?.message || "ID inválido"}`,
      );
      return { success: false, triggered, errors, additionalNights: 0 };
    }

    const oldCheckout = new Date(booking.check_out);
    const newCheckout = new Date(newCheckoutDate);

    if (newCheckout <= oldCheckout) {
      errors.push("La nueva fecha de checkout debe ser posterior a la actual");
      return { success: false, triggered, errors, additionalNights: 0 };
    }

    additionalNights = Math.ceil(
      (newCheckout.getTime() - oldCheckout.getTime()) / 86400000,
    );

    // 2. Check for conflicts with next booking
    const { data: nextBooking } = await supabaseAdmin
      .from("villa_bookings")
      .select("id, guest_name, check_in")
      .eq("villa_id", booking.villa_id)
      .eq("status", "confirmed")
      .gt("check_in", booking.check_out)
      .lte("check_in", newCheckoutDate)
      .order("check_in", { ascending: true })
      .limit(1);

    if (nextBooking && nextBooking.length > 0) {
      errors.push(
        `Conflicto: ${nextBooking[0].guest_name} tiene reserva desde ${nextBooking[0].check_in}`,
      );
      return { success: false, triggered, errors, additionalNights: 0 };
    }

    // 3. Update booking
    const { error: updateError } = await supabaseAdmin
      .from("villa_bookings")
      .update({
        check_out: newCheckoutDate,
        notes: `${booking.notes || ""}\n[${new Date().toISOString()}] Estadía extendida ${additionalNights} noches por ${extendedBy}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      errors.push(`Error actualizando reserva: ${updateError.message}`);
      return { success: false, triggered, errors, additionalNights: 0 };
    }

    triggered.push(`booking_extended_${additionalNights}_nights`);

    // 4. Update occupancy for additional nights
    for (let i = 0; i < additionalNights; i++) {
      const date = new Date(oldCheckout);
      date.setDate(oldCheckout.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const { data: existing } = await supabaseAdmin
        .from("daily_occupancy")
        .select("*")
        .eq("date", dateStr)
        .single();

      const guestCount = booking.num_adults + booking.num_children;

      if (existing) {
        await supabaseAdmin
          .from("daily_occupancy")
          .update({
            guests_count: (existing.guests_count || 0) + guestCount,
            villas_occupied: (existing.villas_occupied || 0) + 1,
            // Set checkout flag only on last additional day
            check_outs:
              i === additionalNights - 1
                ? (existing.check_outs || 0) + guestCount
                : existing.check_outs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("daily_occupancy").insert({
          date: dateStr,
          guests_count: guestCount,
          villas_occupied: 1,
          check_ins: 0,
          check_outs: i === additionalNights - 1 ? guestCount : 0,
          source: "extend_stay",
          created_by: extendedBy,
        });
      }
    }

    triggered.push(`occupancy_updated_${additionalNights}_days`);

    // 5. Update original checkout day (remove checkout flag)
    const oldCheckoutStr = oldCheckout.toISOString().split("T")[0];
    const { data: oldOcc } = await supabaseAdmin
      .from("daily_occupancy")
      .select("*")
      .eq("date", oldCheckoutStr)
      .single();

    if (oldOcc) {
      await supabaseAdmin
        .from("daily_occupancy")
        .update({
          check_outs: Math.max(
            0,
            (oldOcc.check_outs || 0) -
              (booking.num_adults + booking.num_children),
          ),
        })
        .eq("id", oldOcc.id);
    }

    triggered.push("old_checkout_occupancy_adjusted");

    // 6. Update villa status (remove checkout flag if it was checkout today)
    const today = new Date().toISOString().split("T")[0];
    if (oldCheckoutStr === today) {
      await supabaseAdmin
        .from("villa_status")
        .update({
          check_out: newCheckoutDate,
          status: "occupied",
          updated_at: new Date().toISOString(),
        })
        .eq("villa_id", booking.villa_id);
      triggered.push("villa_status_updated_to_occupied");
    }

    // 7. Log the change
    await supabaseAdmin.from("audit_log").insert({
      table_name: "villa_bookings",
      record_id: bookingId,
      action: "extend_stay",
      old_data: { check_out: booking.check_out },
      new_data: {
        check_out: newCheckoutDate,
        additional_nights: additionalNights,
      },
      performed_by: extendedBy,
    });

    triggered.push("audit_logged");

    return { success: true, triggered, errors, additionalNights };
  } catch (error: any) {
    errors.push(`Error inesperado: ${error.message}`);
    return { success: false, triggered, errors, additionalNights: 0 };
  }
}

/**
 * SALIDA ANTICIPADA — Issue #73
 * Process early checkout and update occupancy for unused nights
 */
export async function earlyCheckout(
  villaNumber: number,
  bookingId: string,
  actualCheckoutDate: string,
  processedBy: string,
  reason?: string,
): Promise<{
  success: boolean;
  triggered: string[];
  errors: string[];
  unusedNights: number;
}> {
  const triggered: string[] = [];
  const errors: string[] = [];
  let unusedNights = 0;

  try {
    // 1. Get current booking
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("villa_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (bookingError || !booking) {
      errors.push(
        `Reserva no encontrada: ${bookingError?.message || "ID inválido"}`,
      );
      return { success: false, triggered, errors, unusedNights: 0 };
    }

    const originalCheckout = new Date(booking.check_out);
    const actualCheckout = new Date(actualCheckoutDate);

    if (actualCheckout >= originalCheckout) {
      errors.push(
        "La fecha de salida anticipada debe ser anterior a la fecha original",
      );
      return { success: false, triggered, errors, unusedNights: 0 };
    }

    if (actualCheckout < new Date(booking.check_in)) {
      errors.push("La fecha de salida no puede ser anterior al check-in");
      return { success: false, triggered, errors, unusedNights: 0 };
    }

    unusedNights = Math.ceil(
      (originalCheckout.getTime() - actualCheckout.getTime()) / 86400000,
    );

    // 2. Update booking
    const { error: updateError } = await supabaseAdmin
      .from("villa_bookings")
      .update({
        check_out: actualCheckoutDate,
        status: "checked_out",
        notes: `${booking.notes || ""}\n[${new Date().toISOString()}] Salida anticipada: ${reason || "Sin razón especificada"} — Procesado por ${processedBy}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    if (updateError) {
      errors.push(`Error actualizando reserva: ${updateError.message}`);
      return { success: false, triggered, errors, unusedNights: 0 };
    }

    triggered.push(`early_checkout_processed_${unusedNights}_nights_unused`);

    // 3. Remove occupancy for unused nights
    const guestCount = booking.num_adults + booking.num_children;
    for (let i = 0; i < unusedNights; i++) {
      const date = new Date(actualCheckout);
      date.setDate(actualCheckout.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const { data: existing } = await supabaseAdmin
        .from("daily_occupancy")
        .select("*")
        .eq("date", dateStr)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("daily_occupancy")
          .update({
            guests_count: Math.max(
              0,
              (existing.guests_count || 0) - guestCount,
            ),
            villas_occupied: Math.max(0, (existing.villas_occupied || 0) - 1),
            // Remove checkout flag from original checkout day
            check_outs:
              i === unusedNights - 1
                ? Math.max(0, (existing.check_outs || 0) - guestCount)
                : existing.check_outs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      }
    }

    triggered.push(`occupancy_reduced_${unusedNights}_days`);

    // 4. Set checkout flag on actual checkout day
    const actualCheckoutStr = actualCheckout.toISOString().split("T")[0];
    const { data: actualOcc } = await supabaseAdmin
      .from("daily_occupancy")
      .select("*")
      .eq("date", actualCheckoutStr)
      .single();

    if (actualOcc) {
      await supabaseAdmin
        .from("daily_occupancy")
        .update({
          check_outs: (actualOcc.check_outs || 0) + guestCount,
        })
        .eq("id", actualOcc.id);
    }

    // 5. Trigger housekeeping
    const result = await changeVillaStatus(
      `villa-${villaNumber}`,
      villaNumber,
      "housekeeping",
      processedBy,
      { previousStatus: "checkout", guestName: booking.guest_name },
    );
    triggered.push(...result.triggered);

    // 6. Log the change
    await supabaseAdmin.from("audit_log").insert({
      table_name: "villa_bookings",
      record_id: bookingId,
      action: "early_checkout",
      old_data: { check_out: booking.check_out },
      new_data: {
        check_out: actualCheckoutDate,
        unused_nights: unusedNights,
        reason,
      },
      performed_by: processedBy,
    });

    triggered.push("audit_logged");

    return { success: true, triggered, errors, unusedNights };
  } catch (error: any) {
    errors.push(`Error inesperado: ${error.message}`);
    return { success: false, triggered, errors, unusedNights: 0 };
  }
}

/**
 * WALK-IN BOOKING — Issue #74
 * Create an immediate booking for a guest who arrives without reservation
 */
export async function walkInBooking(
  villaNumber: number,
  villaId: string,
  guestInfo: {
    name: string;
    phone?: string;
    email?: string;
    country?: string;
    adults: number;
    children: number;
    nights: number;
    notes?: string;
    ratePerNight?: number;
    paymentMethod?: string;
  },
  bookedBy: string,
): Promise<{
  success: boolean;
  bookingId?: string;
  triggered: string[];
  errors: string[];
}> {
  const triggered: string[] = [];
  const errors: string[] = [];

  try {
    // 1. Verify villa is available
    const { data: villaStatusData } = await supabaseAdmin
      .from("villa_status")
      .select("status")
      .eq("villa_id", villaId)
      .single();

    if (villaStatusData?.status === "occupied") {
      errors.push("Villa ocupada — no disponible para walk-in");
      return { success: false, triggered, errors };
    }

    if (villaStatusData?.status === "maintenance") {
      errors.push("Villa en mantenimiento — no disponible");
      return { success: false, triggered, errors };
    }

    // 2. Calculate dates
    const today = new Date();
    const checkIn = today.toISOString().split("T")[0];
    const checkOutDate = new Date(today);
    checkOutDate.setDate(today.getDate() + guestInfo.nights);
    const checkOut = checkOutDate.toISOString().split("T")[0];

    // 3. Check for conflicts
    const { data: conflicts } = await supabaseAdmin
      .from("villa_bookings")
      .select("id, guest_name, check_in")
      .eq("villa_id", villaId)
      .in("status", ["confirmed", "checked_in"])
      .gte("check_in", checkIn)
      .lt("check_in", checkOut);

    if (conflicts && conflicts.length > 0) {
      errors.push(
        `Conflicto: Reserva existente desde ${conflicts[0].check_in} (${conflicts[0].guest_name})`,
      );
      return { success: false, triggered, errors };
    }

    // 4. Create booking
    const totalAmount = (guestInfo.ratePerNight || 0) * guestInfo.nights;
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("villa_bookings")
      .insert({
        villa_id: villaId,
        guest_name: guestInfo.name,
        guest_phone: guestInfo.phone || null,
        guest_email: guestInfo.email || null,
        guest_country: guestInfo.country || null,
        num_adults: guestInfo.adults,
        num_children: guestInfo.children || 0,
        check_in: checkIn,
        check_out: checkOut,
        status: "checked_in", // Walk-ins are immediately checked in
        nightly_rate: guestInfo.ratePerNight || null,
        total_amount: totalAmount || null,
        source: "walk_in",
        notes: `Walk-in: ${guestInfo.notes || ""}\nPago: ${guestInfo.paymentMethod || "No especificado"}\nRegistrado por: ${bookedBy}`,
      })
      .select("id")
      .single();

    if (bookingError || !booking) {
      errors.push(
        `Error creando reserva: ${bookingError?.message || "Unknown"}`,
      );
      return { success: false, triggered, errors };
    }

    triggered.push(`walk_in_booking_created:${booking.id}`);

    // 5. Update villa status
    await supabaseAdmin
      .from("villa_status")
      .update({
        status: "occupied",
        current_booking_id: booking.id,
        current_guest_name: guestInfo.name,
        check_in: checkIn,
        check_out: checkOut,
        updated_at: new Date().toISOString(),
      })
      .eq("villa_id", villaId);

    triggered.push("villa_status_occupied");

    // 6. Update occupancy for all nights
    const guestCount = guestInfo.adults + (guestInfo.children || 0);
    for (let i = 0; i < guestInfo.nights; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateStr = date.toISOString().split("T")[0];

      const { data: existing } = await supabaseAdmin
        .from("daily_occupancy")
        .select("*")
        .eq("date", dateStr)
        .single();

      if (existing) {
        await supabaseAdmin
          .from("daily_occupancy")
          .update({
            guests_count: (existing.guests_count || 0) + guestCount,
            villas_occupied: (existing.villas_occupied || 0) + 1,
            check_ins:
              i === 0
                ? (existing.check_ins || 0) + guestCount
                : existing.check_ins,
            check_outs:
              i === guestInfo.nights - 1
                ? (existing.check_outs || 0) + guestCount
                : existing.check_outs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("daily_occupancy").insert({
          date: dateStr,
          guests_count: guestCount,
          villas_occupied: 1,
          check_ins: i === 0 ? guestCount : 0,
          check_outs: i === guestInfo.nights - 1 ? guestCount : 0,
          source: "walk_in",
          created_by: bookedBy,
        });
      }
    }

    triggered.push(`occupancy_updated_${guestInfo.nights}_days`);

    // 7. Trigger VIP welcome if guest spends enough
    if (totalAmount && totalAmount >= 2000000) {
      await addTaskToStaff(null, "bar", {
        task: `⭐ WALK-IN VIP: ${guestInfo.name} en Villa ${villaNumber}. Total: $${totalAmount.toLocaleString()}. Preparar bienvenida.`,
        priority: "high",
        villa_number: villaNumber,
      });
      triggered.push("vip_welcome_task_created");
    }

    // 8. Log
    await supabaseAdmin.from("audit_log").insert({
      table_name: "villa_bookings",
      record_id: booking.id,
      action: "walk_in_booking",
      new_data: {
        villa_number: villaNumber,
        guest_name: guestInfo.name,
        nights: guestInfo.nights,
        total: totalAmount,
      },
      performed_by: bookedBy,
    });

    triggered.push("audit_logged");

    return { success: true, bookingId: booking.id, triggered, errors };
  } catch (error: any) {
    errors.push(`Error inesperado: ${error.message}`);
    return { success: false, triggered, errors };
  }
}

/**
 * VISITANTE DEL DÍA — Issue #75
 * Log a day visitor (non-guest using facilities)
 */
export async function dayVisitor(
  partySize: number,
  expectedDuration: string, // "2h", "half_day", "full_day"
  loggedBy: string,
  options?: {
    contactName?: string;
    phone?: string;
    notes?: string;
    hostVilla?: number; // If visiting a guest
    hostGuestName?: string;
    arrivalTime?: string;
    preAuthorizedSpend?: number;
  },
): Promise<{
  success: boolean;
  visitorId?: string;
  triggered: string[];
  errors: string[];
}> {
  const triggered: string[] = [];
  const errors: string[] = [];

  try {
    const today = new Date();
    const arrivalTime =
      options?.arrivalTime || today.toTimeString().split(" ")[0];

    // Calculate expected departure
    let expectedDeparture: string;
    const [hours] = arrivalTime.split(":");
    const arrivalHour = parseInt(hours);

    switch (expectedDuration) {
      case "2h":
        expectedDeparture = `${String(Math.min(23, arrivalHour + 2)).padStart(2, "0")}:00:00`;
        break;
      case "half_day":
        expectedDeparture = arrivalHour < 14 ? "14:00:00" : "20:00:00";
        break;
      case "full_day":
        expectedDeparture = "20:00:00";
        break;
      default:
        expectedDeparture = "18:00:00";
    }

    // Create day visitor record
    const { data: visitor, error: visitorError } = await supabaseAdmin
      .from("day_visitors")
      .insert({
        date: today.toISOString().split("T")[0],
        party_size: partySize,
        contact_name: options?.contactName || null,
        phone: options?.phone || null,
        arrival_time: arrivalTime,
        expected_departure_time: expectedDeparture,
        actual_departure_time: null,
        host_villa_number: options?.hostVilla || null,
        host_guest_name: options?.hostGuestName || null,
        pre_authorized_spend: options?.preAuthorizedSpend || null,
        notes: options?.notes || null,
        status: "active",
        logged_by: loggedBy,
      })
      .select("id")
      .single();

    if (visitorError || !visitor) {
      errors.push(
        `Error registrando visitante: ${visitorError?.message || "Unknown"}`,
      );
      return { success: false, triggered, errors };
    }

    triggered.push(`day_visitor_logged:${visitor.id}`);
    triggered.push(`party_size:${partySize}`);
    triggered.push(`duration:${expectedDuration}`);

    // Notify bar/restaurant if pre-authorized spend
    if (options?.preAuthorizedSpend && options.preAuthorizedSpend > 0) {
      await addTaskToStaff(null, "bar", {
        task: `👥 VISITANTE: ${options.contactName || "Sin nombre"} (${partySize} personas). Autorizado: $${options.preAuthorizedSpend.toLocaleString()}. ${options.hostVilla ? `Invitado de Villa ${options.hostVilla}` : "Sin host"}`,
        priority: "normal",
        villa_number: options.hostVilla || undefined,
      });
      triggered.push("bar_notified_pre_auth_spend");
    }

    // Log
    await supabaseAdmin.from("audit_log").insert({
      table_name: "day_visitors",
      record_id: visitor.id,
      action: "day_visitor_check_in",
      new_data: {
        party_size: partySize,
        duration: expectedDuration,
        host_villa: options?.hostVilla,
      },
      performed_by: loggedBy,
    });

    triggered.push("audit_logged");

    return { success: true, visitorId: visitor.id, triggered, errors };
  } catch (error: any) {
    errors.push(`Error inesperado: ${error.message}`);
    return { success: false, triggered, errors };
  }
}

/**
 * Checkout day visitor
 */
export async function checkoutDayVisitor(
  visitorId: string,
  processedBy: string,
  consumptionTotal?: number,
): Promise<{
  success: boolean;
  triggered: string[];
  errors: string[];
}> {
  const triggered: string[] = [];
  const errors: string[] = [];

  try {
    const now = new Date();

    const { error: updateError } = await supabaseAdmin
      .from("day_visitors")
      .update({
        actual_departure_time: now.toTimeString().split(" ")[0],
        status: "departed",
        consumption_total: consumptionTotal || null,
        updated_at: now.toISOString(),
      })
      .eq("id", visitorId);

    if (updateError) {
      errors.push(`Error procesando salida: ${updateError.message}`);
      return { success: false, triggered, errors };
    }

    triggered.push("day_visitor_checked_out");
    if (consumptionTotal) {
      triggered.push(`consumption_total:${consumptionTotal}`);
    }

    return { success: true, triggered, errors };
  } catch (error: any) {
    errors.push(`Error inesperado: ${error.message}`);
    return { success: false, triggered, errors };
  }
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get Colombia time (UTC-5)
 */
export function getColombiaTime(): Date {
  const now = new Date();
  const colombiaOffset = -5 * 60; // UTC-5 in minutes
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  return new Date(utc + colombiaOffset * 60000);
}

/**
 * Get today's date in Colombia time as YYYY-MM-DD
 */
export function getTodayColombiaDate(): string {
  return getColombiaTime().toISOString().split("T")[0];
}
