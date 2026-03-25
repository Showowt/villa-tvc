// ═══════════════════════════════════════════════════════════════
// TVC MORNING SYNC CRON JOB
// Runs at 6:00 AM Colombia time (11:00 UTC)
// Generates daily tasks, checks arrivals/departures, flags villas
// Issue #39 — NO AUTOMATIC STATUS TRANSITIONS
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  morningSync,
  getTodayColombiaDate,
  getColombiaTime,
} from "@/lib/operations-hub";
import type { Json } from "@/types/database";

// Verify cron secret for protected routes
function verifyCronSecret(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // If no secret configured, allow in development
  if (!cronSecret && process.env.NODE_ENV === "development") {
    return true;
  }

  if (!cronSecret) {
    console.error("[Cron Morning Sync] CRON_SECRET no configurado");
    return false;
  }

  return authHeader === `Bearer ${cronSecret}`;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const startTime = Date.now();
  const colombiaTime = getColombiaTime();
  const today = getTodayColombiaDate();

  console.log(
    `[Cron Morning Sync] Starting at ${colombiaTime.toISOString()} (Colombia: ${today})`,
  );

  try {
    const supabase = createServerClient();

    // Call the existing morningSync function from operations-hub
    const syncResult = await morningSync();

    // Additional: Generate comprehensive daily tasks for all departments
    const additionalTasks = await generateComprehensiveDailyTasks(
      supabase,
      today,
    );

    // Check inventory levels and create low stock alerts
    const inventoryAlerts = await checkInventoryLevels(supabase, today);

    const duration = Date.now() - startTime;

    console.log(`[Cron Morning Sync] Completed in ${duration}ms`);
    console.log(`  - Sync triggers: ${syncResult.triggered.join(", ")}`);
    console.log(`  - Additional tasks: ${additionalTasks}`);
    console.log(`  - Inventory alerts: ${inventoryAlerts}`);

    return NextResponse.json({
      success: true,
      date: today,
      colombia_time: colombiaTime.toISOString(),
      duration_ms: duration,
      sync_triggers: syncResult.triggered,
      additional_tasks_created: additionalTasks,
      inventory_alerts: inventoryAlerts,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[Cron Morning Sync] Error:", error);

    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
        date: today,
      },
      { status: 500 },
    );
  }
}

// POST endpoint for manual trigger
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  const isAuthorized =
    authHeader === `Bearer ${cronSecret}` ||
    authHeader === "Bearer admin-manual-trigger" ||
    process.env.NODE_ENV === "development";

  if (!isAuthorized) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return GET(request);
}

/**
 * Generate comprehensive daily tasks for all departments
 */
async function generateComprehensiveDailyTasks(
  supabase: ReturnType<typeof createServerClient>,
  today: string,
): Promise<number> {
  let tasksCreated = 0;

  try {
    // Get today's arrivals and departures
    const { data: arrivals } = await supabase
      .from("villa_bookings")
      .select("*")
      .eq("check_in", today)
      .eq("status", "confirmed");

    const { data: departures } = await supabase
      .from("villa_bookings")
      .select("*")
      .eq("check_out", today)
      .eq("status", "checked_in");

    // Get all active staff
    const { data: staff } = await supabase
      .from("users")
      .select("id, name, department, role")
      .eq("is_active", true)
      .in("role", ["staff", "manager"]);

    if (!staff || staff.length === 0) {
      console.warn("[Morning Sync] No active staff found");
      return 0;
    }

    const villaNames: Record<string, string> = {
      villa_1: "Teresa",
      villa_2: "Aduana",
      villa_3: "Trinidad",
      villa_4: "Paz",
      villa_5: "San Pedro",
      villa_6: "San Diego",
      villa_7: "Coche",
      villa_8: "Pozo",
      villa_9: "Santo Domingo",
      villa_10: "Merced",
    };

    for (const member of staff) {
      const tasks: Array<Record<string, unknown>> = [];
      let sortOrder = 0;

      // Housekeeping tasks
      if (member.department === "housekeeping") {
        // Departure cleaning tasks
        if (departures && departures.length > 0) {
          for (const departure of departures) {
            const villaName =
              villaNames[departure.villa_id] || departure.villa_id;
            tasks.push({
              id: `checkout_clean_${departure.villa_id}_${today}`,
              task: `Checkout cleaning: Villa ${villaName} - ${departure.guest_name}`,
              task_es: `Limpieza checkout: Villa ${villaName} - ${departure.guest_name}`,
              priority: "high",
              category: "checkout",
              villa_id: departure.villa_id,
              booking_id: departure.id,
              completed: false,
              sort_order: sortOrder++,
            });
          }
        }

        // Arrival prep tasks
        if (arrivals && arrivals.length > 0) {
          for (const arrival of arrivals) {
            const villaName = villaNames[arrival.villa_id] || arrival.villa_id;
            tasks.push({
              id: `arrival_prep_${arrival.villa_id}_${today}`,
              task: `Arrival prep: Villa ${villaName} - ${arrival.guest_name}`,
              task_es: `Preparar llegada: Villa ${villaName} - ${arrival.guest_name}`,
              priority: "high",
              category: "arrival",
              villa_id: arrival.villa_id,
              booking_id: arrival.id,
              completed: false,
              sort_order: sortOrder++,
            });
          }
        }

        // Standard daily tasks
        tasks.push({
          id: `common_areas_${today}`,
          task: "Clean common areas",
          task_es: "Limpiar areas comunes",
          priority: "medium",
          category: "daily",
          completed: false,
          sort_order: sortOrder++,
        });
      }

      // Pool tasks
      if (member.department === "pool") {
        tasks.push(
          {
            id: `pool_8am_${today}`,
            task: "8 AM pool check (pH, chlorine, temperature)",
            task_es: "Revision piscina 8 AM (pH, cloro, temperatura)",
            priority: "high",
            category: "daily",
            completed: false,
            sort_order: sortOrder++,
          },
          {
            id: `pool_2pm_${today}`,
            task: "2 PM pool check",
            task_es: "Revision piscina 2 PM",
            priority: "medium",
            category: "daily",
            completed: false,
            sort_order: sortOrder++,
          },
          {
            id: `pool_8pm_${today}`,
            task: "8 PM pool check (night lighting, security)",
            task_es: "Revision piscina 8 PM (iluminacion nocturna, seguridad)",
            priority: "medium",
            category: "daily",
            completed: false,
            sort_order: sortOrder++,
          },
        );
      }

      // Kitchen tasks
      if (member.department === "kitchen") {
        const totalGuests =
          (arrivals?.reduce(
            (sum, a) => sum + (a.num_adults || 0) + (a.num_children || 0),
            0,
          ) || 0) +
          (departures?.reduce(
            (sum, d) => sum + (d.num_adults || 0) + (d.num_children || 0),
            0,
          ) || 0);

        tasks.push(
          {
            id: `breakfast_prep_${today}`,
            task: `Breakfast prep (est. ${totalGuests || "?"} guests)`,
            task_es: `Preparar desayuno (est. ${totalGuests || "?"} huespedes)`,
            priority: "high",
            category: "daily",
            completed: false,
            sort_order: sortOrder++,
          },
          {
            id: `kitchen_inventory_check_${today}`,
            task: "Daily inventory check",
            task_es: "Revision diaria de inventario",
            priority: "medium",
            category: "daily",
            completed: false,
            sort_order: sortOrder++,
          },
        );
      }

      // Maintenance tasks
      if (member.department === "maintenance") {
        const dayOfWeek = new Date(today).getDay();
        const maintenanceDays = [
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ];

        tasks.push({
          id: `daily_maintenance_${today}`,
          task: `${maintenanceDays[dayOfWeek]} maintenance checklist`,
          task_es: `Checklist mantenimiento ${maintenanceDays[dayOfWeek]}`,
          priority: "medium",
          category: "daily",
          completed: false,
          sort_order: sortOrder++,
        });

        // Pre-arrival equipment checks
        if (arrivals && arrivals.length > 0) {
          for (const arrival of arrivals) {
            const villaName = villaNames[arrival.villa_id] || arrival.villa_id;
            tasks.push({
              id: `ac_check_${arrival.villa_id}_${today}`,
              task: `AC/Equipment check: Villa ${villaName}`,
              task_es: `Verificar AC/Equipos: Villa ${villaName}`,
              priority: "high",
              category: "pre_arrival",
              villa_id: arrival.villa_id,
              completed: false,
              sort_order: sortOrder++,
            });
          }
        }
      }

      // Front desk tasks
      if (member.department === "front_desk") {
        if (arrivals && arrivals.length > 0) {
          for (const arrival of arrivals) {
            tasks.push({
              id: `checkin_prep_${arrival.villa_id}_${today}`,
              task: `Prepare check-in: ${arrival.guest_name}`,
              task_es: `Preparar check-in: ${arrival.guest_name}`,
              priority: "high",
              category: "arrival",
              booking_id: arrival.id,
              completed: false,
              sort_order: sortOrder++,
            });
          }
        }
      }

      // Manager briefing
      if (member.role === "manager" || member.department === "management") {
        tasks.push({
          id: `daily_briefing_${today}`,
          task: `Daily briefing: ${arrivals?.length || 0} arrivals, ${departures?.length || 0} departures`,
          task_es: `Briefing del dia: ${arrivals?.length || 0} llegadas, ${departures?.length || 0} salidas`,
          priority: "high",
          category: "daily",
          completed: false,
          sort_order: sortOrder++,
        });
      }

      // Save tasks if any were generated
      if (tasks.length > 0) {
        const { data: existing } = await supabase
          .from("daily_tasks")
          .select("id, tasks")
          .eq("user_id", member.id)
          .eq("date", today)
          .single();

        if (existing) {
          // Merge with existing tasks (avoid duplicates)
          const existingTasks =
            (existing.tasks as unknown as Array<{ id: string }>) || [];
          const existingIds = new Set(existingTasks.map((t) => t.id));
          const newTasks = tasks.filter(
            (t) => !existingIds.has(t.id as string),
          );
          const allTasks = [...existingTasks, ...newTasks];

          await supabase
            .from("daily_tasks")
            .update({
              tasks: allTasks as unknown as Json,
              total_count: allTasks.length,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          tasksCreated += newTasks.length;
        } else {
          await supabase.from("daily_tasks").insert({
            user_id: member.id,
            date: today,
            department: member.department,
            tasks: tasks as unknown as Json,
            total_count: tasks.length,
            completed_count: 0,
            status: "pending",
          });

          tasksCreated += tasks.length;
        }
      }
    }

    return tasksCreated;
  } catch (error) {
    console.error("[Morning Sync] Error generating tasks:", error);
    return tasksCreated;
  }
}

/**
 * Check inventory levels and create low stock alerts
 */
async function checkInventoryLevels(
  supabase: ReturnType<typeof createServerClient>,
  today: string,
): Promise<number> {
  let alertsCreated = 0;

  try {
    const { data: lowStock } = await supabase
      .from("ingredients")
      .select("id, name, name_es, current_stock, min_stock")
      .eq("is_active", true)
      .not("min_stock", "is", null);

    if (!lowStock) return 0;

    const criticalItems = lowStock.filter(
      (item) =>
        item.current_stock !== null &&
        item.min_stock !== null &&
        item.current_stock < item.min_stock,
    );

    if (criticalItems.length === 0) return 0;

    // Get manager for alerts
    const { data: manager } = await supabase
      .from("users")
      .select("id")
      .eq("role", "manager")
      .eq("is_active", true)
      .limit(1)
      .single();

    if (!manager) {
      console.warn("[Morning Sync] No manager found for inventory alerts");
      return 0;
    }

    const lowStockTasks = criticalItems.map((item, index) => ({
      id: `low_stock_${item.id}_${today}`,
      task: `[LOW STOCK] ${item.name}: ${item.current_stock}/${item.min_stock}`,
      task_es: `[STOCK BAJO] ${item.name_es}: ${item.current_stock}/${item.min_stock}`,
      priority: "high",
      category: "inventory",
      ingredient_id: item.id,
      completed: false,
      sort_order: 1000 + index,
    }));

    const { data: existing } = await supabase
      .from("daily_tasks")
      .select("id, tasks")
      .eq("user_id", manager.id)
      .eq("date", today)
      .single();

    if (existing) {
      const existingTasks =
        (existing.tasks as unknown as Array<{ id: string }>) || [];
      const existingIds = new Set(existingTasks.map((t) => t.id));
      const newAlerts = lowStockTasks.filter((t) => !existingIds.has(t.id));
      const allTasks = [...existingTasks, ...newAlerts];

      await supabase
        .from("daily_tasks")
        .update({
          tasks: allTasks as unknown as Json,
          total_count: allTasks.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);

      alertsCreated = newAlerts.length;
    } else {
      await supabase.from("daily_tasks").insert({
        user_id: manager.id,
        date: today,
        department: "management",
        tasks: lowStockTasks as unknown as Json,
        total_count: lowStockTasks.length,
        completed_count: 0,
        status: "pending",
      });

      alertsCreated = lowStockTasks.length;
    }

    return alertsCreated;
  } catch (error) {
    console.error("[Morning Sync] Error checking inventory:", error);
    return alertsCreated;
  }
}
