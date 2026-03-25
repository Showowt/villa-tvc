/* eslint-disable @typescript-eslint/no-explicit-any */
// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS HUB EXTENDED — Additional Features
// Issue 71-75, 38, 43 implementations
// Issue 40 — OVERBOOKING PROTECTION integrated
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "./supabase/client";
import { sendNotification } from "./notifications";
import {
  canAssignGuest,
  getVillaInfo,
  checkDateConflicts,
  type ValidationResult,
} from "./villa-validation";

const supabaseAdmin = createServerClient();

// ═══════════════════════════════════════════════════════════════
// ISSUE 72: EXTEND STAY
// Adds nights to existing booking, updates occupancy, checks availability
// ═══════════════════════════════════════════════════════════════

export interface ExtendStayResult {
  success: boolean;
  newCheckOut: string;
  nightsAdded: number;
  message: string;
  errors: string[];
}

export async function extendStay(
  bookingId: string,
  additionalNights: number,
  extendedBy: string,
): Promise<ExtendStayResult> {
  const errors: string[] = [];

  try {
    // 1. Get current booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("villa_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        newCheckOut: "",
        nightsAdded: 0,
        message: "Booking not found",
        errors: ["booking_not_found"],
      };
    }

    // 2. Calculate new checkout date
    const currentCheckOut = new Date(booking.check_out);
    const newCheckOut = new Date(currentCheckOut);
    newCheckOut.setDate(newCheckOut.getDate() + additionalNights);
    const newCheckOutStr = newCheckOut.toISOString().split("T")[0];

    // 3. Check villa availability for extended dates
    const { data: conflicting } = await supabaseAdmin
      .from("villa_bookings")
      .select("id, guest_name, check_in, check_out")
      .eq("villa_id", booking.villa_id)
      .neq("id", bookingId)
      .neq("status", "cancelled")
      .neq("status", "checked_out")
      .lt("check_in", newCheckOutStr)
      .gt("check_out", booking.check_out);

    if (conflicting && conflicting.length > 0) {
      return {
        success: false,
        newCheckOut: "",
        nightsAdded: 0,
        message: `Villa not available - conflicting booking: ${conflicting[0].guest_name} (${conflicting[0].check_in})`,
        errors: ["villa_unavailable"],
      };
    }

    // 4. Update booking checkout date
    const { error: updateError } = await supabaseAdmin
      .from("villa_bookings")
      .update({
        check_out: newCheckOutStr,
        updated_at: new Date().toISOString(),
        notes: `${booking.notes || ""}\n[${new Date().toISOString()}] Extended stay +${additionalNights} nights by ${extendedBy}`,
      })
      .eq("id", bookingId);

    if (updateError) {
      errors.push(updateError.message);
      return {
        success: false,
        newCheckOut: "",
        nightsAdded: 0,
        message: "Failed to update booking",
        errors,
      };
    }

    // 5. Update occupancy for new dates
    const guestCount = booking.num_adults + (booking.num_children || 0);
    for (let i = 0; i < additionalNights; i++) {
      const date = new Date(currentCheckOut);
      date.setDate(currentCheckOut.getDate() + i);
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
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("daily_occupancy").insert({
          date: dateStr,
          guests_count: guestCount,
          villas_occupied: [booking.villa_id],
        });
      }
    }

    // 6. Adjust any related purchase orders if in draft
    const { data: draftPOs } = await supabaseAdmin
      .from("purchase_orders")
      .select("id, forecast_end")
      .eq("status", "draft")
      .gte("forecast_end", booking.check_out);

    if (draftPOs && draftPOs.length > 0) {
      // Flag for recalculation - the forecast_person_nights needs update
      for (const po of draftPOs) {
        await supabaseAdmin
          .from("purchase_orders")
          .update({
            internal_notes: `[AUTO] Booking extended - recalculate forecast`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", po.id);
      }
    }

    return {
      success: true,
      newCheckOut: newCheckOutStr,
      nightsAdded: additionalNights,
      message: `Stay extended by ${additionalNights} night(s). New checkout: ${newCheckOutStr}`,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      newCheckOut: "",
      nightsAdded: 0,
      message: error.message,
      errors: [error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 73: EARLY CHECKOUT
// Updates departure, adjusts occupancy, triggers cleaning, frees villa
// ═══════════════════════════════════════════════════════════════

export interface EarlyCheckoutResult {
  success: boolean;
  originalCheckOut: string;
  actualCheckOut: string;
  nightsReduced: number;
  message: string;
  errors: string[];
}

export async function processEarlyCheckout(
  bookingId: string,
  processedBy: string,
  notes?: string,
): Promise<EarlyCheckoutResult> {
  const errors: string[] = [];

  try {
    // 1. Get current booking
    const { data: booking, error: fetchError } = await supabaseAdmin
      .from("villa_bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (fetchError || !booking) {
      return {
        success: false,
        originalCheckOut: "",
        actualCheckOut: "",
        nightsReduced: 0,
        message: "Booking not found",
        errors: ["booking_not_found"],
      };
    }

    const today = new Date().toISOString().split("T")[0];
    const originalCheckOut = booking.check_out;
    const checkOutDate = new Date(originalCheckOut);
    const todayDate = new Date(today);
    const nightsReduced = Math.ceil(
      (checkOutDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // 2. Update booking to checked_out
    await supabaseAdmin
      .from("villa_bookings")
      .update({
        status: "checked_out",
        actual_check_out: new Date().toISOString(),
        check_out: today, // Update to actual checkout date
        notes: `${booking.notes || ""}\n[${new Date().toISOString()}] Early checkout by ${processedBy}${notes ? `: ${notes}` : ""}`,
        updated_at: new Date().toISOString(),
      })
      .eq("id", bookingId);

    // 3. Reduce occupancy for cancelled nights
    if (nightsReduced > 0) {
      const guestCount = booking.num_adults + (booking.num_children || 0);

      for (let i = 1; i <= nightsReduced; i++) {
        const date = new Date(todayDate);
        date.setDate(todayDate.getDate() + i);
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
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);
        }
      }
    }

    // 4. Update villa status to cleaning
    await supabaseAdmin
      .from("villa_status")
      .update({
        status: "cleaning",
        current_booking_id: null,
        cleaning_status: "dirty",
        updated_at: new Date().toISOString(),
      })
      .eq("villa_id", booking.villa_id);

    // 5. Create cleaning checklist
    const { data: template } = await supabaseAdmin
      .from("checklist_templates")
      .select("*")
      .eq("type", "villa_leaving")
      .eq("is_active", true)
      .single();

    if (template) {
      const { data: housekeepingStaff } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("department", "housekeeping")
        .eq("is_active", true)
        .eq("role", "staff")
        .limit(1);

      await supabaseAdmin.from("checklists").insert({
        template_id: template.id,
        type: "villa_leaving",
        villa_id: booking.villa_id,
        date: today,
        items: (template.items as any[]).map((item) => ({
          ...item,
          checked: false,
        })),
        status: "pending",
        assigned_to: housekeepingStaff?.[0]?.id || null,
      });
    }

    return {
      success: true,
      originalCheckOut,
      actualCheckOut: today,
      nightsReduced,
      message: `Early checkout processed. Villa ${booking.villa_id} now in cleaning.`,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      originalCheckOut: "",
      actualCheckOut: "",
      nightsReduced: 0,
      message: error.message,
      errors: [error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 74: WALK-IN GUESTS
// Quick-assign mode: select vacant villa -> minimal info -> immediate check-in
// ═══════════════════════════════════════════════════════════════

export interface WalkInGuestInput {
  villaId: string;
  guestName: string;
  guestPhone?: string;
  numAdults: number;
  numChildren?: number;
  nights: number;
  notes?: string;
}

export interface WalkInResult {
  success: boolean;
  bookingId: string;
  message: string;
  errors: string[];
}

export async function processWalkInGuest(
  input: WalkInGuestInput,
  processedBy: string,
): Promise<WalkInResult> {
  const errors: string[] = [];

  try {
    // ═══════════════════════════════════════════════════════════════
    // ISSUE 40: OVERBOOKING PROTECTION — Validate before walk-in
    // ═══════════════════════════════════════════════════════════════

    // 0. Calculate dates first for validation
    const today = new Date();
    const checkIn = today.toISOString().split("T")[0];
    const checkOut = new Date(today);
    checkOut.setDate(checkOut.getDate() + input.nights);
    const checkOutStr = checkOut.toISOString().split("T")[0];

    const guestCount = input.numAdults + (input.numChildren || 0);

    // 1. Run comprehensive validation
    const validationResult = await canAssignGuest({
      villaId: input.villaId,
      guestCount,
      dates: { checkIn, checkOut: checkOutStr },
    });

    if (!validationResult.valid) {
      const errorMessages = validationResult.errors.map((e) => e.message);
      let alternativesMessage = "";
      if (
        validationResult.alternatives &&
        validationResult.alternatives.length > 0
      ) {
        alternativesMessage = ` Alternativas disponibles: ${validationResult.alternatives
          .slice(0, 3)
          .map((v) => `${v.name} (max ${v.maxGuests})`)
          .join(", ")}`;
      }

      return {
        success: false,
        bookingId: "",
        message: `Villa ${input.villaId} no disponible: ${errorMessages.join("; ")}${alternativesMessage}`,
        errors: errorMessages,
      };
    }

    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.log(
        `[WalkIn] Warnings for ${input.villaId}:`,
        validationResult.warnings.map((w) => w.message),
      );
    }

    // 2. Verify villa is vacant (legacy check - now redundant but kept for safety)
    const { data: villaStatus } = await supabaseAdmin
      .from("villa_status")
      .select("status, cleaning_status")
      .eq("villa_id", input.villaId)
      .single();

    if (!villaStatus || villaStatus.status !== "vacant") {
      return {
        success: false,
        bookingId: "",
        message: `Villa ${input.villaId} no disponible (Estado: ${villaStatus?.status || "desconocido"})`,
        errors: ["villa_not_vacant"],
      };
    }

    // 3. Create booking
    const { data: booking, error: insertError } = await supabaseAdmin
      .from("villa_bookings")
      .insert({
        villa_id: input.villaId,
        guest_name: input.guestName,
        guest_phone: input.guestPhone,
        num_adults: input.numAdults,
        num_children: input.numChildren || 0,
        check_in: checkIn,
        check_out: checkOutStr,
        actual_check_in: new Date().toISOString(),
        status: "checked_in",
        booking_source: "walk_in",
        booking_type: "walk_in",
        notes: `Walk-in guest processed by ${processedBy}${input.notes ? `. ${input.notes}` : ""}`,
      })
      .select()
      .single();

    if (insertError || !booking) {
      errors.push(insertError?.message || "Insert failed");
      return {
        success: false,
        bookingId: "",
        message: "Failed to create booking",
        errors,
      };
    }

    // 4. Update villa status
    await supabaseAdmin
      .from("villa_status")
      .update({
        status: "occupied",
        current_booking_id: booking.id,
        updated_at: new Date().toISOString(),
      })
      .eq("villa_id", input.villaId);

    // 5. Update occupancy
    const guestCount = input.numAdults + (input.numChildren || 0);
    for (let i = 0; i < input.nights; i++) {
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
            check_ins:
              i === 0 ? (existing.check_ins || 0) + 1 : existing.check_ins,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("daily_occupancy").insert({
          date: dateStr,
          guests_count: guestCount,
          check_ins: i === 0 ? 1 : 0,
          villas_occupied: [input.villaId],
        });
      }
    }

    return {
      success: true,
      bookingId: booking.id,
      message: `Walk-in guest ${input.guestName} checked into ${input.villaId} for ${input.nights} night(s)`,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      bookingId: "",
      message: error.message,
      errors: [error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 43: SICK/ABSENCE HANDLING
// Mark staff as absent, auto-redistribute tasks, notify manager
// ═══════════════════════════════════════════════════════════════

export interface StaffAbsenceInput {
  userId: string;
  absenceDate: string;
  reason: "sick" | "personal" | "vacation" | "emergency" | "other";
  reasonDetails?: string;
}

export interface StaffAbsenceResult {
  success: boolean;
  tasksRedistributed: number;
  redistributedTo: string[];
  message: string;
  errors: string[];
}

export async function markStaffAbsent(
  input: StaffAbsenceInput,
  reportedBy: string,
): Promise<StaffAbsenceResult> {
  const errors: string[] = [];
  const redistributedTo: string[] = [];

  try {
    // 1. Get staff info
    const { data: staff } = await supabaseAdmin
      .from("users")
      .select("id, name, department")
      .eq("id", input.userId)
      .single();

    if (!staff) {
      return {
        success: false,
        tasksRedistributed: 0,
        redistributedTo: [],
        message: "Staff member not found",
        errors: ["staff_not_found"],
      };
    }

    // 2. Create absence record
    await supabaseAdmin.from("staff_absences").insert({
      user_id: input.userId,
      absence_date: input.absenceDate,
      reason: input.reason,
      reason_details: input.reasonDetails,
      reported_by: reportedBy,
    });

    // 3. Get today's tasks for absent staff
    const { data: staffTasks } = await supabaseAdmin
      .from("daily_tasks")
      .select("*")
      .eq("user_id", input.userId)
      .eq("date", input.absenceDate)
      .single();

    let tasksRedistributed = 0;

    if (staffTasks && staffTasks.tasks) {
      // 4. Find other staff in same department
      const { data: availableStaff } = await supabaseAdmin
        .from("users")
        .select("id, name")
        .eq("department", staff.department)
        .eq("is_active", true)
        .eq("role", "staff")
        .neq("id", input.userId);

      if (availableStaff && availableStaff.length > 0) {
        const tasks = staffTasks.tasks as any[];
        const incompleteTasks = tasks.filter((t) => !t.completed);
        tasksRedistributed = incompleteTasks.length;

        // Distribute tasks round-robin
        for (let i = 0; i < incompleteTasks.length; i++) {
          const targetStaff = availableStaff[i % availableStaff.length];
          const task = incompleteTasks[i];
          task.original_assignee = staff.name;
          task.redistributed = true;
          task.redistributed_from = input.userId;

          // Get or create task record for target staff
          const { data: existing } = await supabaseAdmin
            .from("daily_tasks")
            .select("*")
            .eq("user_id", targetStaff.id)
            .eq("date", input.absenceDate)
            .single();

          if (existing) {
            const existingTasks = existing.tasks as any[];
            await supabaseAdmin
              .from("daily_tasks")
              .update({
                tasks: [...existingTasks, task],
                total_count: existingTasks.length + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", existing.id);
          } else {
            await supabaseAdmin.from("daily_tasks").insert({
              date: input.absenceDate,
              user_id: targetStaff.id,
              department: staff.department!,
              tasks: [task],
              total_count: 1,
              completed_count: 0,
              status: "pending",
            });
          }

          if (!redistributedTo.includes(targetStaff.name)) {
            redistributedTo.push(targetStaff.name);
          }
        }

        // Mark original tasks as redistributed
        await supabaseAdmin
          .from("daily_tasks")
          .update({
            status: "skipped",
            notes: `Tasks redistributed due to absence: ${input.reason}`,
            updated_at: new Date().toISOString(),
          })
          .eq("id", staffTasks.id);
      }
    }

    // 5. Update absence record with redistribution info
    await supabaseAdmin
      .from("staff_absences")
      .update({
        tasks_redistributed: tasksRedistributed > 0,
        redistributed_to: redistributedTo,
        notified_manager: true,
      })
      .eq("user_id", input.userId)
      .eq("absence_date", input.absenceDate);

    // 6. Notify manager
    const { data: manager } = await supabaseAdmin
      .from("users")
      .select("phone")
      .eq("role", "manager")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (manager?.phone) {
      await sendNotification({
        type: "escalation",
        recipientPhone: manager.phone,
        message: `⚠️ AUSENCIA DE PERSONAL\n\n👤 ${staff.name}\n📅 ${input.absenceDate}\n📝 Razón: ${input.reason}${input.reasonDetails ? `\n📋 ${input.reasonDetails}` : ""}\n\n${tasksRedistributed} tareas redistribuidas a: ${redistributedTo.join(", ") || "N/A"}`,
      });
    }

    return {
      success: true,
      tasksRedistributed,
      redistributedTo,
      message: `${staff.name} marked absent. ${tasksRedistributed} task(s) redistributed.`,
      errors: [],
    };
  } catch (error: any) {
    return {
      success: false,
      tasksRedistributed: 0,
      redistributedTo: [],
      message: error.message,
      errors: [error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 38: MANAGER DELEGATION
// Backup approver, 30-min timeout escalation
// ═══════════════════════════════════════════════════════════════

export async function createPendingApproval(
  approvalType: "checklist" | "purchase_order" | "maintenance",
  relatedId: string,
  assignedTo: string,
  timeoutMinutes: number = 30,
): Promise<string> {
  const timeoutAt = new Date();
  timeoutAt.setMinutes(timeoutAt.getMinutes() + timeoutMinutes);

  const { data, error } = await supabaseAdmin
    .from("pending_approvals")
    .insert({
      approval_type: approvalType,
      related_id: relatedId,
      assigned_to: assignedTo,
      status: "pending",
      timeout_at: timeoutAt.toISOString(),
    })
    .select()
    .single();

  if (error) throw error;
  return data.id;
}

export async function checkAndEscalateApprovals(): Promise<{
  escalated: number;
  details: string[];
}> {
  const details: string[] = [];
  let escalated = 0;

  try {
    // Find timed-out pending approvals
    const now = new Date().toISOString();
    const { data: timedOut } = await supabaseAdmin
      .from("pending_approvals")
      .select("*, users!assigned_to(name)")
      .eq("status", "pending")
      .lt("timeout_at", now);

    if (!timedOut || timedOut.length === 0) {
      return { escalated: 0, details: [] };
    }

    for (const approval of timedOut) {
      // Find backup approver
      const { data: delegation } = await supabaseAdmin
        .from("approval_delegations")
        .select("backup_approver_id, users!backup_approver_id(name, phone)")
        .eq("primary_approver_id", approval.assigned_to)
        .eq("is_active", true)
        .or(
          `delegation_type.eq.all,delegation_type.eq.${approval.approval_type}`,
        )
        .limit(1)
        .single();

      if (delegation) {
        // Escalate to backup
        await supabaseAdmin
          .from("pending_approvals")
          .update({
            status: "escalated",
            escalated_to: delegation.backup_approver_id,
            escalated_at: new Date().toISOString(),
          })
          .eq("id", approval.id);

        // Notify backup approver
        const backupUser = delegation.users as any;
        if (backupUser?.phone) {
          await sendNotification({
            type: "escalation",
            recipientPhone: backupUser.phone,
            message: `🔔 APROBACIÓN ESCALADA\n\n📋 Tipo: ${approval.approval_type}\n👤 Original: ${(approval.users as any)?.name || "Unknown"}\n⏰ Sin respuesta en 30 min\n\nPor favor revisar y aprobar/rechazar.`,
          });
        }

        escalated++;
        details.push(
          `${approval.approval_type} ${approval.related_id} escalated to ${backupUser?.name || delegation.backup_approver_id}`,
        );
      } else {
        // No backup configured - mark as expired
        await supabaseAdmin
          .from("pending_approvals")
          .update({ status: "expired" })
          .eq("id", approval.id);

        details.push(
          `${approval.approval_type} ${approval.related_id} expired - no backup configured`,
        );
      }
    }

    return { escalated, details };
  } catch (error: any) {
    return { escalated: 0, details: [error.message] };
  }
}

export async function resolveApproval(
  approvalId: string,
  status: "approved" | "rejected",
  resolvedBy: string,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("pending_approvals")
    .update({
      status,
    })
    .eq("id", approvalId);

  return !error;
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 71: VILLAGE TAKEOVER (GROUP BOOKINGS)
// Create group booking, link villas, schedule batch cleaning
// ═══════════════════════════════════════════════════════════════

export interface GroupBookingInput {
  name: string;
  coordinatorName: string;
  coordinatorPhone?: string;
  coordinatorEmail?: string;
  villaIds: string[];
  checkIn: string;
  checkOut: string;
  totalGuests: number;
  specialRequests?: string;
  sharedItinerary?: any[];
}

export interface GroupBookingResult {
  success: boolean;
  groupBookingId: string;
  individualBookings: string[];
  message: string;
  errors: string[];
}

export async function createGroupBooking(
  input: GroupBookingInput,
  createdBy: string,
): Promise<GroupBookingResult> {
  const errors: string[] = [];
  const individualBookings: string[] = [];

  try {
    // 1. Verify all villas are available for the dates
    const { data: conflicting } = await supabaseAdmin
      .from("villa_bookings")
      .select("villa_id, guest_name")
      .in("villa_id", input.villaIds)
      .neq("status", "cancelled")
      .neq("status", "checked_out")
      .lt("check_in", input.checkOut)
      .gt("check_out", input.checkIn);

    if (conflicting && conflicting.length > 0) {
      const unavailable = conflicting.map((c) => c.villa_id).join(", ");
      return {
        success: false,
        groupBookingId: "",
        individualBookings: [],
        message: `Some villas are not available: ${unavailable}`,
        errors: ["villas_unavailable"],
      };
    }

    // 2. Create group booking record
    const { data: groupBooking, error: groupError } = await supabaseAdmin
      .from("group_bookings")
      .insert({
        name: input.name,
        coordinator_name: input.coordinatorName,
        coordinator_phone: input.coordinatorPhone,
        coordinator_email: input.coordinatorEmail,
        villa_ids: input.villaIds,
        check_in: input.checkIn,
        check_out: input.checkOut,
        total_guests: input.totalGuests,
        shared_itinerary: input.sharedItinerary || [],
        special_requests: input.specialRequests,
        status: "confirmed",
        created_by: createdBy,
      })
      .select()
      .single();

    if (groupError || !groupBooking) {
      errors.push(groupError?.message || "Failed to create group booking");
      return {
        success: false,
        groupBookingId: "",
        individualBookings: [],
        message: "Failed to create group booking",
        errors,
      };
    }

    // 3. Create individual villa bookings linked to the group
    const guestsPerVilla = Math.ceil(input.totalGuests / input.villaIds.length);

    for (const villaId of input.villaIds) {
      const { data: booking, error: bookingError } = await supabaseAdmin
        .from("villa_bookings")
        .insert({
          villa_id: villaId,
          guest_name: `${input.name} (${input.coordinatorName})`,
          guest_phone: input.coordinatorPhone,
          guest_email: input.coordinatorEmail,
          num_adults: guestsPerVilla,
          num_children: 0,
          check_in: input.checkIn,
          check_out: input.checkOut,
          status: "confirmed",
          booking_source: "group",
          booking_type: "group",
          group_booking_id: groupBooking.id,
          special_requests: input.specialRequests,
          notes: `Part of group booking: ${input.name}`,
        })
        .select()
        .single();

      if (bookingError) {
        errors.push(`Villa ${villaId}: ${bookingError.message}`);
      } else if (booking) {
        individualBookings.push(booking.id);
      }
    }

    // 4. Schedule batch cleaning (create checklists for the day before check-in)
    const cleaningDate = new Date(input.checkIn);
    cleaningDate.setDate(cleaningDate.getDate() - 1);
    const cleaningDateStr = cleaningDate.toISOString().split("T")[0];

    const { data: template } = await supabaseAdmin
      .from("checklist_templates")
      .select("*")
      .eq("type", "villa_empty_arriving")
      .eq("is_active", true)
      .single();

    if (template) {
      const { data: housekeepingStaff } = await supabaseAdmin
        .from("users")
        .select("id")
        .eq("department", "housekeeping")
        .eq("is_active", true)
        .eq("role", "staff");

      for (let i = 0; i < input.villaIds.length; i++) {
        const assignee =
          housekeepingStaff?.[i % (housekeepingStaff?.length || 1)]?.id;
        await supabaseAdmin.from("checklists").insert({
          template_id: template.id,
          type: "villa_empty_arriving",
          villa_id: input.villaIds[i],
          date: cleaningDateStr,
          items: (template.items as any[]).map((item) => ({
            ...item,
            checked: false,
          })),
          status: "pending",
          assigned_to: assignee || null,
          notes: `Group booking: ${input.name}`,
        });
      }
    }

    // 5. Update occupancy
    const checkIn = new Date(input.checkIn);
    const checkOut = new Date(input.checkOut);
    const nights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    for (let i = 0; i < nights; i++) {
      const date = new Date(checkIn);
      date.setDate(checkIn.getDate() + i);
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
            guests_count: (existing.guests_count || 0) + input.totalGuests,
            check_ins:
              i === 0
                ? (existing.check_ins || 0) + input.totalGuests
                : existing.check_ins,
            check_outs:
              i === nights - 1
                ? (existing.check_outs || 0) + input.totalGuests
                : existing.check_outs,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabaseAdmin.from("daily_occupancy").insert({
          date: dateStr,
          guests_count: input.totalGuests,
          check_ins: i === 0 ? input.totalGuests : 0,
          check_outs: i === nights - 1 ? input.totalGuests : 0,
          villas_occupied: input.villaIds,
        });
      }
    }

    return {
      success: true,
      groupBookingId: groupBooking.id,
      individualBookings,
      message: `Group booking "${input.name}" created with ${input.villaIds.length} villas`,
      errors,
    };
  } catch (error: any) {
    return {
      success: false,
      groupBookingId: "",
      individualBookings: [],
      message: error.message,
      errors: [error.message],
    };
  }
}

// ═══════════════════════════════════════════════════════════════
// ISSUE 75: DAY VISITORS
// Log day visitors, track consumption, don't count in person-nights
// ═══════════════════════════════════════════════════════════════

export interface DayVisitorInput {
  partyName: string;
  partySize: number;
  arrivalTime?: string;
  hostVillaId?: string;
  hostGuestName?: string;
  purpose: "restaurant" | "pool" | "event" | "tour" | "other";
  notes?: string;
}

export interface DayVisitorResult {
  success: boolean;
  visitorId: string;
  message: string;
}

export async function logDayVisitor(
  input: DayVisitorInput,
  loggedBy: string,
): Promise<DayVisitorResult> {
  try {
    const { data, error } = await supabaseAdmin
      .from("day_visitors")
      .insert({
        visit_date: new Date().toISOString().split("T")[0],
        party_name: input.partyName,
        party_size: input.partySize,
        arrival_time: input.arrivalTime,
        host_villa_id: input.hostVillaId,
        host_guest_name: input.hostGuestName,
        purpose: input.purpose,
        notes: input.notes,
        logged_by: loggedBy,
      })
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      visitorId: data.id,
      message: `Day visitor ${input.partyName} (${input.partySize} people) logged`,
    };
  } catch (error: any) {
    return {
      success: false,
      visitorId: "",
      message: error.message,
    };
  }
}

export async function updateDayVisitorConsumption(
  visitorId: string,
  consumptionTotal: number,
): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("day_visitors")
    .update({
      consumption_total: consumptionTotal,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitorId);

  return !error;
}

export async function checkoutDayVisitor(visitorId: string): Promise<boolean> {
  const { error } = await supabaseAdmin
    .from("day_visitors")
    .update({
      departure_time: new Date().toTimeString().split(" ")[0],
      updated_at: new Date().toISOString(),
    })
    .eq("id", visitorId);

  return !error;
}
