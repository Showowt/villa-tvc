import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Json, Database } from "@/types/database";
import {
  checklistSubmitSchemaWithPhotos,
  validateApiRequest,
  ERROR_MESSAGES,
} from "@/lib/validation";
import { notifyChecklistSubmitted } from "@/lib/push-notifications";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate with Zod schema (includes photo validation)
    const validation = validateApiRequest(
      checklistSubmitSchemaWithPhotos,
      body,
    );

    if (!validation.success) {
      // Check if error is about missing photos
      const isMissingPhotos = validation.details.some((d) =>
        d.includes("Fotos requeridas"),
      );

      return NextResponse.json(
        {
          error: isMissingPhotos
            ? ERROR_MESSAGES.missing_photos
            : validation.error,
          details: validation.details,
          message: isMissingPhotos
            ? "Faltan fotos requeridas para algunas tareas completadas"
            : "Datos de checklist inválidos",
        },
        { status: 400 },
      );
    }

    const {
      checklist_id,
      items,
      completed_by,
      notes,
      duration_minutes,
      photos,
    } = validation.data;

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Zod schema already validated required photos
    // Calculate completion stats
    const totalItems = items.length;
    const completedItems = items.filter((i) => i.completed).length;
    const completionRate = totalItems > 0 ? completedItems / totalItems : 0;

    if (checklist_id) {
      // Get the checklist to know its type and track timing
      const { data: existingChecklist } = await supabase
        .from("checklists")
        .select("type, villa_id, started_at, items")
        .eq("id", checklist_id)
        .single();

      // Calculate actual duration from started_at if available
      let calculatedDuration = duration_minutes;
      if (
        !calculatedDuration &&
        existingChecklist?.started_at &&
        completionRate === 1
      ) {
        const start = new Date(existingChecklist.started_at);
        const end = new Date(now);
        calculatedDuration = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60),
        );
      }

      // Update existing checklist with time tracking
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
          submitted_at: completionRate === 1 ? now : null,
          notes: notes || null,
          duration_minutes: calculatedDuration || null,
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

      // If checklist is now complete, trigger supply consumption
      let supplyConsumption = null;
      if (completionRate === 1 && existingChecklist) {
        try {
          // Call supply consumption API
          const consumeResponse = await fetch(
            `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/supply/consume`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                checklist_type: existingChecklist.type,
                villa_id: existingChecklist.villa_id,
                user_id: completed_by,
              }),
            },
          );

          if (consumeResponse.ok) {
            supplyConsumption = await consumeResponse.json();
          }
        } catch (supplyError) {
          console.error(
            "[checklist/submit] Supply consumption error:",
            supplyError,
          );
          // Don't fail the whole request if supply consumption fails
        }
      }

      // Send push notification to manager when checklist is completed
      if (completionRate === 1) {
        try {
          // Get staff name
          const { data: staffUser } = await supabase
            .from("users")
            .select("name")
            .eq("id", completed_by)
            .single();

          // Get checklist type label
          const checklistLabels: Record<string, string> = {
            villa_retouch: "Retoque Villa",
            villa_occupied: "Villa Ocupada",
            villa_empty_arriving: "Villa Vacia (Llegada)",
            villa_leaving: "Villa Salida",
            pool_8am: "Piscina 8am",
            pool_2pm: "Piscina 2pm",
            pool_8pm: "Piscina 8pm",
            breakfast_setup: "Setup Desayuno",
            common_area: "Areas Comunes",
          };

          const typeLabel =
            checklistLabels[existingChecklist?.type || ""] ||
            existingChecklist?.type ||
            "Checklist";

          await notifyChecklistSubmitted(
            typeLabel,
            existingChecklist?.villa_id || null,
            staffUser?.name || "Staff",
          );
        } catch (notifyError) {
          console.error("[checklist/submit] Notification error:", notifyError);
          // Don't fail the request if notification fails
        }
      }

      return NextResponse.json({
        success: true,
        checklist: data,
        stats: {
          total: totalItems,
          completed: completedItems,
          completion_rate: Math.round(completionRate * 100),
          duration_minutes: calculatedDuration || null,
        },
        supply_consumption: supplyConsumption,
        message:
          completionRate === 1
            ? "Checklist completado y enviado para aprobacion"
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
