import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  changeVillaStatus,
  onChecklistStatusChange,
  onMaintenanceComplete,
  onGuestAssigned,
  onGuestCheckout,
  onGuestMoved,
} from "@/lib/operations-hub";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
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
        const { villaNumber, guest, assignedBy } = body;
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
