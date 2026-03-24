import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Json, Database } from "@/types/database";

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  completed: boolean;
  photo_url?: string;
  notes?: string;
  completed_at?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      checklist_id,
      items,
      completed_by,
      notes,
      duration_minutes,
      photos,
    } = body as {
      checklist_id?: string;
      items: ChecklistItem[];
      completed_by: string;
      notes?: string;
      duration_minutes?: number;
      photos?: string[];
    };

    if (!items || !Array.isArray(items)) {
      return NextResponse.json(
        { error: "Items array is required" },
        { status: 400 },
      );
    }

    if (!completed_by) {
      return NextResponse.json(
        { error: "completed_by (user_id) is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Check if all required photo items have photos
    const missingPhotos = items.filter(
      (item) => item.photo_required && item.completed && !item.photo_url,
    );

    if (missingPhotos.length > 0) {
      return NextResponse.json(
        {
          error: "Missing required photos",
          missing: missingPhotos.map((i) => i.task_es),
        },
        { status: 400 },
      );
    }

    // Calculate completion stats
    const totalItems = items.length;
    const completedItems = items.filter((i) => i.completed).length;
    const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

    if (checklist_id) {
      // Update existing checklist
      const { data, error } = await supabase
        .from("checklists")
        .update({
          items: items as unknown as Json,
          status:
            completionRate === 1
              ? ("complete" as const)
              : ("in_progress" as const),
          completed_by: completionRate === 1 ? completed_by : null,
          completed_at: completionRate === 1 ? now : null,
          notes: notes || null,
          duration_minutes: duration_minutes || null,
          photos: photos ? (photos as unknown as Json) : null,
          updated_at: now,
        })
        .eq("id", checklist_id)
        .select()
        .single();

      if (error) {
        console.error("[checklist/submit] Update error:", error);
        return NextResponse.json(
          { error: "Failed to update checklist" },
          { status: 500 },
        );
      }

      return NextResponse.json({
        success: true,
        checklist: data,
        stats: {
          total: totalItems,
          completed: completedItems,
          completion_rate: Math.round(completionRate * 100),
        },
        message:
          completionRate === 1
            ? "Checklist completado y enviado para aprobación"
            : `Progreso guardado: ${completedItems}/${totalItems} tareas`,
      });
    } else {
      // This shouldn't happen - checklists should be created first
      return NextResponse.json(
        { error: "checklist_id is required for updates" },
        { status: 400 },
      );
    }
  } catch (error) {
    console.error("[checklist/submit]", error);
    return NextResponse.json(
      { error: "Failed to submit checklist" },
      { status: 500 },
    );
  }
}

// GET - Get checklist templates or specific checklist
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checklistId = searchParams.get("id");
    const templateType = searchParams.get("type");

    const supabase = createServerClient();

    if (checklistId) {
      // Get specific checklist
      const { data, error } = await supabase
        .from("checklists")
        .select("*")
        .eq("id", checklistId)
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Checklist not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, checklist: data });
    }

    if (templateType) {
      // Get template by type - cast to enum type
      const checklistType =
        templateType as Database["public"]["Enums"]["checklist_type"];
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("*")
        .eq("type", checklistType)
        .eq("is_active", true)
        .single();

      if (error) {
        return NextResponse.json(
          { error: "Template not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ success: true, template: data });
    }

    // Get all active templates
    const { data: templates, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("is_active", true)
      .order("department")
      .order("name_es");

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, templates });
  } catch (error) {
    console.error("[checklist/submit GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch checklist data" },
      { status: 500 },
    );
  }
}
