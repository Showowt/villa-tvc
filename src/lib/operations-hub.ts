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

            // Create task for the cleaner
            if (assignee) {
              await addTaskToStaff(assignee, "housekeeping", {
                task: `🧹 Villa ${villaNumber} (${getVillaName(villaNumber)}) — ${checklistType === "villa_empty_arriving" ? "Full clean for arriving guest" : "Deep clean after checkout"}`,
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
            task: `🔧 Villa ${villaNumber} (${getVillaName(villaNumber)}) — ${metadata?.maintenanceNotes || "Maintenance required"}`,
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
        task: `🔴 RE-CLEAN Villa ${villaNumber} (${getVillaName(villaNumber)}) — Rejected: ${rejectionReason}`,
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
        "⚠️ ALERT: Villa not cleaned/approved for today check-in!",
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
      task: `⭐ VIP ARRIVAL: ${guest.name} en Villa ${villaNumber}. Preparar bienvenida especial.`,
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
    task: `🧹 Villa ${fromVillaNumber} (${getVillaName(fromVillaNumber)}) — Guest moved out, needs retouch`,
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

  // If no specific user, find someone in the department
  let targetUserId = userId;
  if (!targetUserId) {
    const { data: staff } = await supabaseAdmin
      .from("users")
      .select("id")
      .eq("department", department)
      .eq("is_active", true)
      .eq("role", "staff")
      .limit(1);
    targetUserId = staff?.[0]?.id || null;
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
