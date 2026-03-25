import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const villaId = searchParams.get("villa_id");

    if (!villaId) {
      return NextResponse.json(
        { error: "villa_id is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient() as SupabaseAny;

    // Get last 10 guests (bookings)
    const { data: recentGuests, error: guestsError } = await supabase
      .from("villa_bookings")
      .select(
        "id, guest_name, guest_country, check_in, check_out, num_adults, num_children, vip_level, status, special_requests",
      )
      .eq("villa_id", villaId)
      .in("status", ["checked_out", "checked_in", "confirmed"])
      .order("check_out", { ascending: false })
      .limit(10);

    if (guestsError) {
      console.error("[villa history - guests]", guestsError);
    }

    // Get last 5 maintenance reports
    const { data: maintenanceReports, error: maintenanceError } = await supabase
      .from("maintenance_issues")
      .select(
        "id, title, title_es, description, priority, status, created_at, resolved_at, resolution_notes, cost",
      )
      .eq("location", villaId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (maintenanceError) {
      console.error("[villa history - maintenance]", maintenanceError);
    }

    // Get last 10 cleaning checklists
    const { data: cleaningChecklists, error: checklistsError } = await supabase
      .from("checklists")
      .select(
        "id, type, date, status, completed_at, quality_score, qc_notes, notes",
      )
      .eq("villa_id", villaId)
      .in("type", [
        "villa_retouch",
        "villa_occupied",
        "villa_empty_arriving",
        "villa_leaving",
      ])
      .order("date", { ascending: false })
      .limit(10);

    if (checklistsError) {
      console.error("[villa history - checklists]", checklistsError);
    }

    // Analyze patterns
    const patterns = analyzePatterns(
      recentGuests || [],
      maintenanceReports || [],
      cleaningChecklists || [],
    );

    return NextResponse.json({
      villa_id: villaId,
      recent_guests: recentGuests || [],
      maintenance_reports: maintenanceReports || [],
      cleaning_checklists: cleaningChecklists || [],
      patterns,
    });
  } catch (error) {
    console.error("[villa history]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

interface Guest {
  guest_name: string;
  guest_country?: string;
  special_requests?: string;
  vip_level?: string;
}

interface MaintenanceReport {
  title: string;
  priority: string;
  resolved_at?: string;
  cost?: number;
}

interface Checklist {
  status: string;
  quality_score?: number;
}

function analyzePatterns(
  guests: Guest[],
  maintenance: MaintenanceReport[],
  checklists: Checklist[],
) {
  const patterns: string[] = [];

  // VIP frequency
  const vipCount = guests.filter(
    (g) => g.vip_level && g.vip_level !== "standard",
  ).length;
  if (vipCount > guests.length / 2 && guests.length > 2) {
    patterns.push(
      `High VIP usage: ${vipCount}/${guests.length} guests were VIP/VVIP`,
    );
  }

  // Country patterns
  const countries = guests.map((g) => g.guest_country).filter(Boolean);
  const countryCount: Record<string, number> = {};
  countries.forEach((c) => {
    if (c) countryCount[c] = (countryCount[c] || 0) + 1;
  });
  const topCountry = Object.entries(countryCount).sort(
    (a, b) => b[1] - a[1],
  )[0];
  if (topCountry && topCountry[1] > 2) {
    patterns.push(
      `Most common origin: ${topCountry[0]} (${topCountry[1]} guests)`,
    );
  }

  // Recurring maintenance issues
  const issueTypes: Record<string, number> = {};
  maintenance.forEach((m) => {
    const key = m.title.toLowerCase();
    issueTypes[key] = (issueTypes[key] || 0) + 1;
  });
  const recurringIssues = Object.entries(issueTypes).filter(
    ([, count]) => count > 1,
  );
  if (recurringIssues.length > 0) {
    patterns.push(
      `Recurring issues: ${recurringIssues.map(([issue, count]) => `${issue} (${count}x)`).join(", ")}`,
    );
  }

  // Unresolved maintenance
  const unresolvedMaintenance = maintenance.filter((m) => !m.resolved_at);
  if (unresolvedMaintenance.length > 0) {
    patterns.push(
      `${unresolvedMaintenance.length} unresolved maintenance issue(s)`,
    );
  }

  // High priority issues
  const highPriorityIssues = maintenance.filter(
    (m) => m.priority === "high" || m.priority === "urgent",
  );
  if (highPriorityIssues.length > 0) {
    patterns.push(
      `${highPriorityIssues.length} high/urgent priority issue(s) in history`,
    );
  }

  // Maintenance costs
  const totalCost = maintenance.reduce((sum, m) => sum + (m.cost || 0), 0);
  if (totalCost > 0) {
    patterns.push(`Total maintenance cost: $${totalCost.toLocaleString()}`);
  }

  // Cleaning quality
  const qualityScores = checklists
    .filter((c) => c.quality_score)
    .map((c) => c.quality_score!);
  if (qualityScores.length > 0) {
    const avgQuality =
      qualityScores.reduce((a, b) => a + b, 0) / qualityScores.length;
    if (avgQuality < 3) {
      patterns.push(
        `Low avg cleaning quality: ${avgQuality.toFixed(1)}/5 stars`,
      );
    } else if (avgQuality >= 4.5) {
      patterns.push(
        `Excellent cleaning quality: ${avgQuality.toFixed(1)}/5 stars`,
      );
    }
  }

  // Rejected checklists
  const rejectedCount = checklists.filter(
    (c) => c.status === "rejected",
  ).length;
  if (rejectedCount > 0) {
    patterns.push(
      `${rejectedCount} rejected cleaning checklist(s) - may need attention`,
    );
  }

  // Special requests patterns
  const specialRequests = guests
    .map((g) => g.special_requests)
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (specialRequests.includes("allerg")) {
    patterns.push("Multiple guests with allergy-related requests");
  }
  if (
    specialRequests.includes("anniversary") ||
    specialRequests.includes("honeymoon")
  ) {
    patterns.push("Popular for romantic occasions");
  }

  return patterns;
}
