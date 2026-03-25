// ============================================
// CLEANING ANALYTICS API (Issues #20 & #21)
// Time tracking + supply consumption analytics
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

interface CleaningStats {
  checklist_type: string;
  total_cleanings: number;
  avg_duration_minutes: number;
  min_duration_minutes: number;
  max_duration_minutes: number;
  avg_quality_score: number | null;
}

interface StaffStats {
  user_id: string;
  staff_name: string;
  department: string;
  checklist_type: string;
  total_cleanings: number;
  avg_duration_minutes: number;
  fastest_clean: number;
  slowest_clean: number;
  avg_quality_score: number | null;
  approved_count: number;
  rejected_count: number;
}

interface SupplyConsumption {
  checklist_type: string;
  villa_id: string | null;
  total_events: number;
  total_cost: number;
  avg_cost_per_clean: number;
}

// GET /api/analytics/cleaning - Get cleaning analytics
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || "30"; // days
    const staffId = searchParams.get("staff_id");
    const villaId = searchParams.get("villa_id");
    const checklistType = searchParams.get("type");

    const supabase = createServerClient();
    const periodDays = parseInt(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);
    const startDateStr = startDate.toISOString();

    // Build base query for checklists
    let checklistQuery = supabase
      .from("checklists")
      .select(
        `
        id,
        type,
        villa_id,
        started_at,
        first_item_at,
        completed_at,
        submitted_at,
        duration_minutes,
        assigned_to,
        quality_score,
        status,
        users!checklists_assigned_to_fkey(id, name, department)
      `,
      )
      .in("status", ["complete", "approved"])
      .gte("completed_at", startDateStr)
      .like("type", "villa_%");

    if (staffId) {
      checklistQuery = checklistQuery.eq("assigned_to", staffId);
    }
    if (villaId) {
      checklistQuery = checklistQuery.eq("villa_id", villaId);
    }
    if (checklistType) {
      checklistQuery = checklistQuery.eq("type", checklistType);
    }

    const { data: checklists, error: checklistError } = await checklistQuery;

    if (checklistError) {
      console.error(
        "[Cleaning Analytics] Error fetching checklists:",
        checklistError,
      );
      return NextResponse.json(
        { success: false, error: "Failed to fetch cleaning data" },
        { status: 500 },
      );
    }

    // Calculate cleaning stats by type
    const cleaningStatsByType: Record<string, CleaningStats> = {};
    const staffStatsMap: Map<string, StaffStats> = new Map();

    for (const checklist of checklists || []) {
      const type = checklist.type;
      const duration = checklist.duration_minutes || 0;
      const quality = checklist.quality_score;

      // Aggregate by type
      if (!cleaningStatsByType[type]) {
        cleaningStatsByType[type] = {
          checklist_type: type,
          total_cleanings: 0,
          avg_duration_minutes: 0,
          min_duration_minutes: Infinity,
          max_duration_minutes: 0,
          avg_quality_score: null,
        };
      }
      const typeStats = cleaningStatsByType[type];
      typeStats.total_cleanings++;
      typeStats.avg_duration_minutes += duration;
      if (duration > 0) {
        typeStats.min_duration_minutes = Math.min(
          typeStats.min_duration_minutes,
          duration,
        );
        typeStats.max_duration_minutes = Math.max(
          typeStats.max_duration_minutes,
          duration,
        );
      }
      if (quality !== null) {
        typeStats.avg_quality_score =
          (typeStats.avg_quality_score || 0) + quality;
      }

      // Aggregate by staff
      const user = checklist.users as {
        id: string;
        name: string;
        department: string;
      } | null;
      if (user) {
        const staffKey = `${user.id}_${type}`;
        if (!staffStatsMap.has(staffKey)) {
          staffStatsMap.set(staffKey, {
            user_id: user.id,
            staff_name: user.name,
            department: user.department,
            checklist_type: type,
            total_cleanings: 0,
            avg_duration_minutes: 0,
            fastest_clean: Infinity,
            slowest_clean: 0,
            avg_quality_score: null,
            approved_count: 0,
            rejected_count: 0,
          });
        }
        const staffStats = staffStatsMap.get(staffKey)!;
        staffStats.total_cleanings++;
        staffStats.avg_duration_minutes += duration;
        if (duration > 0) {
          staffStats.fastest_clean = Math.min(
            staffStats.fastest_clean,
            duration,
          );
          staffStats.slowest_clean = Math.max(
            staffStats.slowest_clean,
            duration,
          );
        }
        if (quality !== null) {
          staffStats.avg_quality_score =
            (staffStats.avg_quality_score || 0) + quality;
        }
        if (checklist.status === "approved") {
          staffStats.approved_count++;
        }
      }
    }

    // Finalize averages
    for (const type in cleaningStatsByType) {
      const stats = cleaningStatsByType[type];
      if (stats.total_cleanings > 0) {
        stats.avg_duration_minutes = Math.round(
          stats.avg_duration_minutes / stats.total_cleanings,
        );
        if (stats.avg_quality_score !== null) {
          stats.avg_quality_score =
            Math.round((stats.avg_quality_score / stats.total_cleanings) * 10) /
            10;
        }
      }
      if (stats.min_duration_minutes === Infinity) {
        stats.min_duration_minutes = 0;
      }
    }

    const staffStats: StaffStats[] = [];
    for (const [, stats] of staffStatsMap) {
      if (stats.total_cleanings > 0) {
        stats.avg_duration_minutes = Math.round(
          stats.avg_duration_minutes / stats.total_cleanings,
        );
        if (stats.avg_quality_score !== null) {
          stats.avg_quality_score =
            Math.round((stats.avg_quality_score / stats.total_cleanings) * 10) /
            10;
        }
      }
      if (stats.fastest_clean === Infinity) {
        stats.fastest_clean = 0;
      }
      staffStats.push(stats);
    }

    // Get supply consumption data
    let consumptionQuery = supabase
      .from("supply_consumption_logs")
      .select("*")
      .gte("consumed_at", startDateStr);

    if (villaId) {
      consumptionQuery = consumptionQuery.eq("villa_id", villaId);
    }
    if (checklistType) {
      consumptionQuery = consumptionQuery.eq("checklist_type", checklistType);
    }

    const { data: consumptionLogs } = await consumptionQuery;

    // Aggregate consumption by type and villa
    const consumptionByTypeVilla: Map<string, SupplyConsumption> = new Map();
    for (const log of consumptionLogs || []) {
      const key = `${log.checklist_type}_${log.villa_id || "all"}`;
      if (!consumptionByTypeVilla.has(key)) {
        consumptionByTypeVilla.set(key, {
          checklist_type: log.checklist_type,
          villa_id: log.villa_id,
          total_events: 0,
          total_cost: 0,
          avg_cost_per_clean: 0,
        });
      }
      const stats = consumptionByTypeVilla.get(key)!;
      stats.total_events++;
      stats.total_cost += log.total_cost || 0;
    }

    const supplyConsumption: SupplyConsumption[] = [];
    for (const [, stats] of consumptionByTypeVilla) {
      if (stats.total_events > 0) {
        stats.avg_cost_per_clean = Math.round(
          stats.total_cost / stats.total_events,
        );
      }
      supplyConsumption.push(stats);
    }

    // Calculate overall summary
    const totalCleanings = Object.values(cleaningStatsByType).reduce(
      (sum, s) => sum + s.total_cleanings,
      0,
    );
    const avgDurationAll =
      totalCleanings > 0
        ? Math.round(
            Object.values(cleaningStatsByType).reduce(
              (sum, s) => sum + s.avg_duration_minutes * s.total_cleanings,
              0,
            ) / totalCleanings,
          )
        : 0;
    const totalSupplyCost = supplyConsumption.reduce(
      (sum, s) => sum + s.total_cost,
      0,
    );

    // Generate insights
    const insights: string[] = [];

    // Find fastest and slowest staff
    const sortedBySpeed = [...staffStats].sort(
      (a, b) => a.avg_duration_minutes - b.avg_duration_minutes,
    );
    if (sortedBySpeed.length > 0 && sortedBySpeed[0].avg_duration_minutes > 0) {
      insights.push(
        `Fastest cleaner: ${sortedBySpeed[0].staff_name} (${sortedBySpeed[0].avg_duration_minutes} min avg)`,
      );
    }
    if (
      sortedBySpeed.length > 1 &&
      sortedBySpeed[sortedBySpeed.length - 1].avg_duration_minutes > 0
    ) {
      const slowest = sortedBySpeed[sortedBySpeed.length - 1];
      insights.push(
        `Improvement opportunity: ${slowest.staff_name} takes ${slowest.avg_duration_minutes} min avg`,
      );
    }

    // Most expensive villa to clean
    const sortedByCost = [...supplyConsumption].sort(
      (a, b) => b.avg_cost_per_clean - a.avg_cost_per_clean,
    );
    if (sortedByCost.length > 0 && sortedByCost[0].villa_id) {
      insights.push(
        `Highest supply cost: ${sortedByCost[0].villa_id} ($${sortedByCost[0].avg_cost_per_clean.toLocaleString()} avg)`,
      );
    }

    return NextResponse.json({
      success: true,
      period_days: periodDays,
      summary: {
        total_cleanings: totalCleanings,
        avg_duration_minutes: avgDurationAll,
        total_supply_cost: totalSupplyCost,
        avg_supply_cost_per_clean:
          totalCleanings > 0 ? Math.round(totalSupplyCost / totalCleanings) : 0,
      },
      by_type: Object.values(cleaningStatsByType),
      by_staff: staffStats.sort(
        (a, b) => b.total_cleanings - a.total_cleanings,
      ),
      supply_consumption: supplyConsumption,
      insights,
    });
  } catch (error) {
    console.error("[Cleaning Analytics] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate cleaning analytics" },
      { status: 500 },
    );
  }
}

// POST /api/analytics/cleaning - Generate cleaning time forecast
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { forecast_days = 7 } = body;

    const supabase = createServerClient();

    // Get historical cleaning times (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: historicalData } = await supabase
      .from("checklists")
      .select("type, villa_id, duration_minutes, completed_at")
      .in("status", ["complete", "approved"])
      .gte("completed_at", thirtyDaysAgo.toISOString())
      .like("type", "villa_%")
      .not("duration_minutes", "is", null);

    // Calculate average time per checklist type
    const avgTimeByType: Record<string, number> = {};
    const countByType: Record<string, number> = {};

    for (const checklist of historicalData || []) {
      const type = checklist.type;
      if (!avgTimeByType[type]) {
        avgTimeByType[type] = 0;
        countByType[type] = 0;
      }
      avgTimeByType[type] += checklist.duration_minutes || 0;
      countByType[type]++;
    }

    for (const type in avgTimeByType) {
      if (countByType[type] > 0) {
        avgTimeByType[type] = Math.round(
          avgTimeByType[type] / countByType[type],
        );
      }
    }

    // Get upcoming occupancy for forecast
    const today = new Date().toISOString().split("T")[0];
    const forecastEnd = new Date();
    forecastEnd.setDate(forecastEnd.getDate() + forecast_days);
    const forecastEndStr = forecastEnd.toISOString().split("T")[0];

    const { data: occupancyData } = await supabase
      .from("daily_occupancy")
      .select("date, guests_count, check_ins, check_outs, villas_occupied")
      .gte("date", today)
      .lte("date", forecastEndStr)
      .order("date");

    // Generate forecast
    const forecast: Array<{
      date: string;
      expected_cleanings: number;
      estimated_hours: number;
      checklist_breakdown: Record<string, number>;
      supply_cost_estimate: number;
    }> = [];

    // Default supply costs per type (from templates)
    const supplyCostByType: Record<string, number> = {
      villa_empty_arriving: 75000, // Full setup
      villa_occupied: 15000, // Daily service
      villa_leaving: 12000, // Checkout clean
      villa_retouch: 3000, // Quick touch
    };

    for (const day of occupancyData || []) {
      const checkIns = day.check_ins || 0;
      const checkOuts = day.check_outs || 0;
      const occupied = day.guests_count || 0;
      const villasOccupied =
        (day.villas_occupied as string[] | null)?.length ||
        Math.ceil(occupied / 2);

      // Estimate cleanings needed
      const breakdown: Record<string, number> = {
        villa_empty_arriving: checkIns,
        villa_leaving: checkOuts,
        villa_occupied: Math.max(0, villasOccupied - checkIns), // Occupied but not arriving
      };

      let totalMinutes = 0;
      let totalSupplyCost = 0;

      for (const [type, count] of Object.entries(breakdown)) {
        if (count > 0) {
          const avgTime = avgTimeByType[type] || 45; // Default 45 min
          totalMinutes += avgTime * count;
          totalSupplyCost += (supplyCostByType[type] || 15000) * count;
        }
      }

      forecast.push({
        date: day.date,
        expected_cleanings: checkIns + checkOuts + (villasOccupied - checkIns),
        estimated_hours: Math.round((totalMinutes / 60) * 10) / 10,
        checklist_breakdown: breakdown,
        supply_cost_estimate: totalSupplyCost,
      });
    }

    return NextResponse.json({
      success: true,
      forecast_days,
      avg_time_by_type: avgTimeByType,
      forecast,
      total_estimated_hours:
        Math.round(
          forecast.reduce((sum, f) => sum + f.estimated_hours, 0) * 10,
        ) / 10,
      total_supply_cost_estimate: forecast.reduce(
        (sum, f) => sum + f.supply_cost_estimate,
        0,
      ),
    });
  } catch (error) {
    console.error("[Cleaning Analytics] POST error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to generate forecast" },
      { status: 500 },
    );
  }
}
