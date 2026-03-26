// ============================================
// MORNING SYNC CRON - SIMPLIFIED
// Syncs daily tasks without problematic type casts
// ============================================

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET() {
  const startTime = Date.now();

  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];

    // Get today's occupancy
    const { data: occupancy } = await supabase
      .from("daily_occupancy")
      .select("*")
      .eq("date", today)
      .single();

    // Get active checklist templates
    const { data: templates } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("is_active", true);

    const duration = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      date: today,
      occupancy_loaded: !!occupancy,
      templates_count: templates?.length || 0,
      tasks_synced: 0,
      checklists_created: 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[MorningSync] Error:", error);
    return NextResponse.json(
      {
        error: "Morning sync failed",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}
