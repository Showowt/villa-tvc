import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// GET: List all recurring maintenance tasks
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get("filter"); // 'overdue', 'upcoming', 'all'
    const days = parseInt(searchParams.get("days") || "7");

    const supabase = createServerClient();
    const today = new Date().toISOString().split("T")[0];
    const futureDate = new Date(Date.now() + days * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    let query = supabase
      .from("recurring_maintenance")
      .select(
        `
        *,
        assigned_user:users!recurring_maintenance_assigned_to_fkey(name, department),
        last_completed_user:users!recurring_maintenance_last_completed_by_fkey(name)
      `,
      )
      .eq("is_active", true)
      .order("next_due_date", { ascending: true });

    if (filter === "overdue") {
      query = query.lt("next_due_date", today);
    } else if (filter === "upcoming") {
      query = query
        .gte("next_due_date", today)
        .lte("next_due_date", futureDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[recurring maintenance]", error);
      return NextResponse.json(
        { error: "Failed to fetch tasks" },
        { status: 500 },
      );
    }

    // Calculate overdue status
    const tasksWithStatus = (data || []).map((task) => ({
      ...task,
      is_overdue: new Date(task.next_due_date) < new Date(today),
      days_overdue: Math.max(
        0,
        Math.floor(
          (new Date(today).getTime() - new Date(task.next_due_date).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      ),
      days_until_due: Math.max(
        0,
        Math.floor(
          (new Date(task.next_due_date).getTime() - new Date(today).getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      ),
    }));

    // Summary stats
    const summary = {
      total: tasksWithStatus.length,
      overdue: tasksWithStatus.filter((t) => t.is_overdue).length,
      due_today: tasksWithStatus.filter((t) => t.next_due_date === today)
        .length,
      upcoming_7_days: tasksWithStatus.filter(
        (t) => !t.is_overdue && t.days_until_due <= 7,
      ).length,
    };

    return NextResponse.json({
      tasks: tasksWithStatus,
      summary,
    });
  } catch (error) {
    console.error("[recurring maintenance]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// POST: Complete a maintenance task
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      task_id,
      completed_by,
      duration_minutes,
      notes,
      issues_found,
      photos,
      parts_used,
    }: {
      task_id: string;
      completed_by: string;
      duration_minutes?: number;
      notes?: string;
      issues_found?: string;
      photos?: string[];
      parts_used?: { name: string; quantity: number; cost?: number }[];
    } = body;

    if (!task_id || !completed_by) {
      return NextResponse.json(
        { error: "task_id and completed_by are required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Verify task exists
    const { data: task, error: taskError } = await supabase
      .from("recurring_maintenance")
      .select("*")
      .eq("id", task_id)
      .single();

    if (taskError || !task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Log the completion (trigger will update next_due_date)
    const { data: completion, error: completionError } = await supabase
      .from("maintenance_completions")
      .insert({
        recurring_maintenance_id: task_id,
        completed_by,
        duration_minutes,
        notes,
        issues_found,
        photos: photos || [],
        parts_used: parts_used || [],
      })
      .select()
      .single();

    if (completionError) {
      console.error("[complete maintenance]", completionError);
      return NextResponse.json(
        { error: "Failed to log completion" },
        { status: 500 },
      );
    }

    // If issues were found, create a maintenance issue ticket
    if (issues_found) {
      await supabase.from("maintenance_issues").insert({
        title: `Issue found during: ${task.task_name}`,
        title_es: `Problema encontrado durante: ${task.task_name_es}`,
        description: issues_found,
        location: task.location,
        priority: "medium",
        status: "pending",
        reported_by: completed_by,
      });
    }

    // Get updated task
    const { data: updatedTask } = await supabase
      .from("recurring_maintenance")
      .select("*")
      .eq("id", task_id)
      .single();

    return NextResponse.json({
      success: true,
      completion,
      next_due_date: updatedTask?.next_due_date,
      message: issues_found
        ? "Task completed with issues logged for follow-up"
        : "Task completed successfully",
    });
  } catch (error) {
    console.error("[complete maintenance]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
