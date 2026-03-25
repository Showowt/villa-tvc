import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

/**
 * Issue #64: Dashboard Lazy Loading - Critical Metrics
 * This endpoint loads first with essential real-time data
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Parallel fetch of critical metrics
    const [occupancyResult, escalationsResult, checklistsResult] =
      await Promise.all([
        // Today's occupancy
        supabase
          .from("daily_occupancy")
          .select("guests_count, check_ins, check_outs, villas_occupied")
          .eq("date", today)
          .single(),

        // Active escalations (urgent)
        supabase
          .from("conversations")
          .select("id, contact_name, channel")
          .eq("status", "escalated"),

        // Today's checklists status
        supabase
          .from("checklists")
          .select("id, type, status")
          .eq("date", today),
      ]);

    const todayOcc = occupancyResult.data;
    const escalations = escalationsResult.data || [];
    const checklists = checklistsResult.data || [];

    // Calculate checklist stats
    const checklistStats = {
      total: checklists.length,
      pending: checklists.filter((c) => c.status === "pending").length,
      inProgress: checklists.filter((c) => c.status === "in_progress").length,
      complete: checklists.filter((c) => c.status === "complete").length,
      approved: checklists.filter((c) => c.status === "approved").length,
    };

    return NextResponse.json({
      success: true,
      today: {
        date: today,
        guests: todayOcc?.guests_count || 0,
        checkIns: todayOcc?.check_ins || 0,
        checkOuts: todayOcc?.check_outs || 0,
        villasOccupied: todayOcc?.villas_occupied || [],
      },
      alerts: {
        escalations: escalations.length,
        escalationDetails: escalations.slice(0, 5),
        pendingApprovals: checklistStats.complete, // Awaiting QC review
      },
      checklists: checklistStats,
    });
  } catch (error) {
    console.error("[dashboard/critical]", error);
    return NextResponse.json(
      { error: "Failed to fetch critical metrics" },
      { status: 500 },
    );
  }
}
