import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// CRON: SINCRONIZACION DE MANTENIMIENTO (Morning Sync)
// Issue #55: Auto-crear tareas y alertar si hay vencidas
// Ejecutar: 6:00 AM diariamente
// ═══════════════════════════════════════════════════════════════

interface MaintenanceTask {
  id: string;
  title: string;
  title_es: string | null;
  location: string;
  priority: string;
  next_due_at: string | null;
  frequency: string;
  estimated_duration_minutes: number | null;
  category: string | null;
  villa_id: string | null;
  assigned_to: string | null;
}

interface DailyTask {
  id: string;
  title: string;
  title_es: string;
  description: string | null;
  description_es: string | null;
  location: string;
  source_type: string;
  source_id: string;
  priority: string;
  estimated_minutes: number | null;
  due_date: string;
  assigned_to: string | null;
  villa_id: string | null;
  status: string;
}

export async function GET(request: Request) {
  try {
    // Verificar cron secret si esta configurado
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const supabase = createServerClient();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split("T")[0];

    // 1. Obtener tareas de mantenimiento vencidas o para hoy
    const { data: dueTasks, error: dueError } = await supabase
      .from("recurring_maintenance")
      .select("*")
      .eq("is_active", true)
      .lte("next_due_at", new Date().toISOString())
      .order("priority", { ascending: false })
      .order("next_due_at", { ascending: true });

    if (dueError) {
      console.error(
        "[maintenance-sync] Error obteniendo tareas vencidas:",
        dueError,
      );
      return NextResponse.json(
        { error: "Error obteniendo tareas", details: dueError.message },
        { status: 500 },
      );
    }

    const tasks = dueTasks as MaintenanceTask[];

    // 2. Clasificar tareas
    const overdueTasks = tasks.filter((t) => {
      if (!t.next_due_at) return false;
      const dueDate = new Date(t.next_due_at);
      dueDate.setHours(0, 0, 0, 0);
      return dueDate < today;
    });

    const todayTasks = tasks.filter((t) => {
      if (!t.next_due_at) return false;
      return t.next_due_at.split("T")[0] === todayStr;
    });

    // 3. Auto-crear tareas diarias para hoy si no existen
    const createdTasks: DailyTask[] = [];

    for (const task of todayTasks) {
      // Verificar si ya existe una tarea para hoy
      const { data: existing } = await supabase
        .from("daily_tasks")
        .select("id")
        .eq("source_type", "recurring_maintenance")
        .eq("source_id", task.id)
        .eq("due_date", todayStr)
        .single();

      if (!existing) {
        // Crear tarea diaria
        const newTask: Partial<DailyTask> = {
          title: task.title,
          title_es: task.title_es || task.title,
          location: task.location,
          source_type: "recurring_maintenance",
          source_id: task.id,
          priority: task.priority,
          estimated_minutes: task.estimated_duration_minutes,
          due_date: todayStr,
          assigned_to: task.assigned_to,
          villa_id: task.villa_id,
          status: "pending",
        };

        const { data: created, error: createError } = await supabase
          .from("daily_tasks")
          .insert(newTask)
          .select()
          .single();

        if (createError) {
          console.warn(
            "[maintenance-sync] Error creando tarea diaria:",
            createError,
          );
        } else if (created) {
          createdTasks.push(created as DailyTask);
        }
      }
    }

    // 4. Crear alertas para tareas vencidas urgentes
    const urgentOverdue = overdueTasks.filter(
      (t) => t.priority === "urgent" || t.priority === "high",
    );

    const alerts: string[] = [];

    for (const task of urgentOverdue) {
      const daysOverdue = task.next_due_at
        ? Math.floor(
            (today.getTime() - new Date(task.next_due_at).getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0;

      const alertMessage = `⚠️ MANTENIMIENTO VENCIDO (${daysOverdue} dias): ${task.title_es || task.title} en ${task.location}`;
      alerts.push(alertMessage);

      // Insertar notificacion de sistema
      try {
        await supabase.from("system_notifications").insert({
          type: "maintenance_overdue",
          title: "Mantenimiento Vencido",
          message: alertMessage,
          priority: task.priority,
          related_id: task.id,
          related_type: "recurring_maintenance",
          is_read: false,
        });
      } catch (notifError) {
        console.warn(
          "[maintenance-sync] Error creando notificacion:",
          notifError,
        );
      }
    }

    // 5. Generar resumen
    const summary = {
      date: todayStr,
      overdue_count: overdueTasks.length,
      today_count: todayTasks.length,
      urgent_overdue: urgentOverdue.length,
      tasks_created: createdTasks.length,
      alerts_generated: alerts.length,
    };

    console.log("[maintenance-sync] Resumen:", summary);

    // 6. Construir respuesta detallada
    return NextResponse.json({
      success: true,
      summary,
      overdue: overdueTasks.map((t) => ({
        id: t.id,
        title: t.title_es || t.title,
        location: t.location,
        priority: t.priority,
        due: t.next_due_at,
        days_overdue: t.next_due_at
          ? Math.floor(
              (today.getTime() - new Date(t.next_due_at).getTime()) /
                (1000 * 60 * 60 * 24),
            )
          : 0,
      })),
      today: todayTasks.map((t) => ({
        id: t.id,
        title: t.title_es || t.title,
        location: t.location,
        priority: t.priority,
        estimated_minutes: t.estimated_duration_minutes,
      })),
      created_tasks: createdTasks.map((t) => t.id),
      alerts,
    });
  } catch (error) {
    console.error("[maintenance-sync] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// POST: Forzar sincronizacion manual
export async function POST(request: Request) {
  return GET(request);
}
