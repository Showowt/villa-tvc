import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// GET - Obtener alertas de discrepancia
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";

    const supabase = createServerClient();

    const { data: alerts, error } = await supabase
      .from("delivery_discrepancy_alerts")
      .select("*")
      .eq("alert_status", status)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      count: alerts?.length || 0,
    });
  } catch (error) {
    console.error("[GET discrepancy-alerts]", error);
    return NextResponse.json(
      { error: "Error al obtener alertas de discrepancia" },
      { status: 500 },
    );
  }
}

// PATCH - Actualizar estado de alerta (acknowledge/resolve)
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { alert_id, action, user_id, resolution_notes } = body as {
      alert_id: string;
      action: "acknowledge" | "resolve";
      user_id: string;
      resolution_notes?: string;
    };

    if (!alert_id || !action || !user_id) {
      return NextResponse.json(
        { error: "Campos requeridos: alert_id, action, user_id" },
        { status: 400 },
      );
    }

    if (!["acknowledge", "resolve"].includes(action)) {
      return NextResponse.json(
        { error: "Action debe ser 'acknowledge' o 'resolve'" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Verificar que la alerta existe
    const { data: existingAlert, error: fetchError } = await supabase
      .from("delivery_discrepancy_alerts")
      .select("*")
      .eq("id", alert_id)
      .single();

    if (fetchError || !existingAlert) {
      return NextResponse.json(
        { error: "Alerta no encontrada" },
        { status: 404 },
      );
    }

    // Construir update segun la accion
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (action === "acknowledge") {
      if (existingAlert.alert_status !== "pending") {
        return NextResponse.json(
          { error: "Solo se pueden reconocer alertas pendientes" },
          { status: 400 },
        );
      }
      updateData.alert_status = "acknowledged";
      updateData.acknowledged_by = user_id;
      updateData.acknowledged_at = new Date().toISOString();
    } else if (action === "resolve") {
      if (existingAlert.alert_status === "resolved") {
        return NextResponse.json(
          { error: "Esta alerta ya fue resuelta" },
          { status: 400 },
        );
      }
      if (!resolution_notes) {
        return NextResponse.json(
          { error: "Se requieren notas de resolucion" },
          { status: 400 },
        );
      }
      updateData.alert_status = "resolved";
      updateData.resolved_by = user_id;
      updateData.resolved_at = new Date().toISOString();
      updateData.resolution_notes = resolution_notes;
    }

    const { error: updateError } = await supabase
      .from("delivery_discrepancy_alerts")
      .update(updateData)
      .eq("id", alert_id);

    if (updateError) {
      throw updateError;
    }

    const actionLabel = action === "acknowledge" ? "reconocida" : "resuelta";

    return NextResponse.json({
      success: true,
      message: `Alerta ${actionLabel} exitosamente`,
      alert_id,
      new_status: updateData.alert_status,
    });
  } catch (error) {
    console.error("[PATCH discrepancy-alerts]", error);
    return NextResponse.json(
      { error: "Error al actualizar alerta" },
      { status: 500 },
    );
  }
}
