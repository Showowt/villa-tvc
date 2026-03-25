import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  changeVillaStatus,
  onChecklistStatusChange,
  onMaintenanceComplete,
  onGuestAssigned,
  onGuestCheckout,
  onGuestMoved,
  extendStay,
  earlyCheckout,
  walkInBooking,
  dayVisitor,
  checkoutDayVisitor,
} from "@/lib/operations-hub";
import {
  statusChangeSchema,
  validateApiRequest,
  validateOverbooking,
  guestSchemaWithDateValidation,
} from "@/lib/validation";
import { z } from "zod";

// Schema for assign_guest action
const assignGuestSchema = z.object({
  action: z.literal("assign_guest"),
  villaNumber: z.number().int().min(1).max(10),
  guest: guestSchemaWithDateValidation,
  assignedBy: z.string().optional(),
  maxGuests: z.number().int().min(1).max(20).optional(),
});

// Schema for extend_stay action (Issue #72)
const extendStaySchema = z.object({
  action: z.literal("extend_stay"),
  villaNumber: z.number().int().min(1).max(10),
  bookingId: z.string().uuid(),
  newCheckoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  extendedBy: z.string(),
});

// Schema for early_checkout action (Issue #73)
const earlyCheckoutSchema = z.object({
  action: z.literal("early_checkout"),
  villaNumber: z.number().int().min(1).max(10),
  bookingId: z.string().uuid(),
  actualCheckoutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  processedBy: z.string(),
  reason: z.string().optional(),
});

// Schema for walk_in action (Issue #74)
const walkInSchema = z.object({
  action: z.literal("walk_in"),
  villaNumber: z.number().int().min(1).max(10),
  villaId: z.string(),
  guestInfo: z.object({
    name: z.string().min(2),
    phone: z.string().optional(),
    email: z.string().email().optional(),
    country: z.string().optional(),
    adults: z.number().int().min(1).max(10),
    children: z.number().int().min(0).max(10).default(0),
    nights: z.number().int().min(1).max(30),
    notes: z.string().optional(),
    ratePerNight: z.number().min(0).optional(),
    paymentMethod: z.string().optional(),
  }),
  bookedBy: z.string(),
});

// Schema for day_visitor action (Issue #75)
const dayVisitorSchema = z.object({
  action: z.literal("day_visitor"),
  partySize: z.number().int().min(1).max(20),
  expectedDuration: z.enum(["2h", "half_day", "full_day"]),
  loggedBy: z.string(),
  options: z
    .object({
      contactName: z.string().optional(),
      phone: z.string().optional(),
      notes: z.string().optional(),
      hostVilla: z.number().int().min(1).max(10).optional(),
      hostGuestName: z.string().optional(),
      arrivalTime: z.string().optional(),
      preAuthorizedSpend: z.number().min(0).optional(),
    })
    .optional(),
});

// Schema for checkout_day_visitor action
const checkoutDayVisitorSchema = z.object({
  action: z.literal("checkout_day_visitor"),
  visitorId: z.string().uuid(),
  processedBy: z.string(),
  consumptionTotal: z.number().min(0).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    // Basic action validation
    const baseValidation = validateApiRequest(statusChangeSchema, body);
    if (!baseValidation.success) {
      return NextResponse.json(
        {
          error: "Datos de solicitud inválidos",
          details: baseValidation.details,
        },
        { status: 400 },
      );
    }

    const { action } = baseValidation.data;
    const supabase = createServerClient();

    switch (action) {
      case "change_status": {
        const { villaId, villaNumber, newStatus, triggeredBy, metadata } = body;
        const result = await changeVillaStatus(
          villaId,
          villaNumber,
          newStatus,
          triggeredBy,
          metadata,
        );
        return NextResponse.json(result);
      }

      case "checklist_update": {
        const {
          checklistId,
          newStatus,
          villaNumber,
          actionBy,
          rejectionReason,
        } = body;
        // First update the checklist itself
        const update: Record<string, unknown> = {
          status: newStatus,
          updated_at: new Date().toISOString(),
        };
        if (newStatus === "approved" || newStatus === "rejected") {
          update.approved_by = actionBy;
          update.approved_at = new Date().toISOString();
        }
        if (newStatus === "rejected") {
          update.rejection_reason = rejectionReason;
        }
        await supabase.from("checklists").update(update).eq("id", checklistId);

        // Then trigger the cross-system effects
        const result = await onChecklistStatusChange(
          checklistId,
          newStatus,
          villaNumber,
          actionBy,
          rejectionReason,
        );
        return NextResponse.json({ success: true, ...result });
      }

      case "maintenance_complete": {
        const { villaNumber, completedBy, resolutionNotes, previousStatus } =
          body;
        const result = await onMaintenanceComplete(
          villaNumber,
          completedBy,
          resolutionNotes,
          previousStatus,
        );
        return NextResponse.json({ success: true, ...result });
      }

      case "assign_guest": {
        // Validate guest assignment data
        const guestValidation = assignGuestSchema.safeParse(body);
        if (!guestValidation.success) {
          return NextResponse.json(
            {
              error: "Datos de huésped inválidos",
              details: guestValidation.error.errors.map(
                (e) => `${e.path.join(" > ")}: ${e.message}`,
              ),
            },
            { status: 400 },
          );
        }

        const { villaNumber, guest, assignedBy, maxGuests } =
          guestValidation.data;

        // Validate overbooking if maxGuests is provided
        if (maxGuests) {
          const overbookingCheck = validateOverbooking(guest.guests, maxGuests);
          if (!overbookingCheck.valid) {
            return NextResponse.json(
              {
                error: overbookingCheck.error,
                field: "guests",
              },
              { status: 400 },
            );
          }
        }

        const result = await onGuestAssigned(villaNumber, guest, assignedBy);
        return NextResponse.json({ success: true, ...result });
      }

      case "checkout": {
        const { villaNumber, guestName, processedBy } = body;
        const result = await onGuestCheckout(
          villaNumber,
          guestName,
          processedBy,
        );
        return NextResponse.json({ success: true, ...result });
      }

      case "move_guest": {
        const { fromVilla, toVilla, guestName, movedBy } = body;
        const result = await onGuestMoved(
          fromVilla,
          toVilla,
          guestName,
          movedBy,
        );
        return NextResponse.json({ success: true, ...result });
      }

      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("Villa status error:", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

// GET: Retrieve current villa states with all related data
export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Get today's checklists grouped by villa
    const { data: checklists } = await supabase
      .from("checklists")
      .select(
        "id, type, villa_id, status, assigned_to, completed_at, approved_at, rejection_reason, photos",
      )
      .eq("date", today)
      .order("created_at", { ascending: false });

    // Get maintenance tasks (active, unresolved)
    const { data: maintenanceTasks } = await supabase
      .from("daily_tasks")
      .select("user_id, tasks, department")
      .eq("department", "maintenance")
      .eq("date", today)
      .eq("status", "pending");

    // Get today's occupancy
    const { data: occupancy } = await supabase
      .from("daily_occupancy")
      .select("*")
      .eq("date", today)
      .single();

    // Get villa status (villa_status table may not be in types yet)
    const { data: villaStatus } = await supabase
      .from("villa_status" as "users")
      .select("*");

    // Build villa checklists lookup
    const villaChecklists: Record<string, unknown> = {};
    for (const cl of checklists || []) {
      if (cl.villa_id && !villaChecklists[cl.villa_id]) {
        villaChecklists[cl.villa_id] = cl;
      }
    }

    // Extract maintenance issues per villa from task data
    const villaMaintenanceIssues: Record<string, unknown[]> = {};
    for (const task of maintenanceTasks || []) {
      for (const t of (task.tasks as Array<{
        villa_number?: number;
        completed?: boolean;
      }>) || []) {
        if (t.villa_number && !t.completed) {
          const key = String(t.villa_number);
          if (!villaMaintenanceIssues[key]) villaMaintenanceIssues[key] = [];
          villaMaintenanceIssues[key].push(t);
        }
      }
    }

    return NextResponse.json({
      today,
      occupancy,
      villaStatus,
      villaChecklists,
      villaMaintenanceIssues,
      checklistSummary: {
        total: (checklists || []).length,
        pending: (checklists || []).filter((c) => c.status === "pending")
          .length,
        inProgress: (checklists || []).filter((c) => c.status === "in_progress")
          .length,
        submitted: (checklists || []).filter((c) => c.status === "complete")
          .length,
        approved: (checklists || []).filter((c) => c.status === "approved")
          .length,
        rejected: (checklists || []).filter((c) => c.status === "rejected")
          .length,
      },
      maintenanceSummary: {
        villasWithIssues: Object.keys(villaMaintenanceIssues).length,
        totalOpenIssues: Object.values(villaMaintenanceIssues).flat().length,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
