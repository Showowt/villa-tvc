import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date, department, occupancy } = body as {
      date?: string;
      department?: string;
      occupancy?: number;
    };

    const targetDate = date || new Date().toISOString().split("T")[0];

    const supabase = createServerClient();

    // Gather context for AI
    // 1. Get today's occupancy
    const { data: occupancyData } = await supabase
      .from("daily_occupancy")
      .select("guests_count, villas_occupied, check_ins, check_outs")
      .eq("date", targetDate)
      .single();

    const guestCount = occupancy || occupancyData?.guests_count || 0;
    const checkIns = occupancyData?.check_ins || 0;
    const checkOuts = occupancyData?.check_outs || 0;

    // 2. Get low stock items
    const { data: ingredients } = await supabase
      .from("ingredients")
      .select("name_es, current_stock, min_stock, category")
      .eq("is_active", true);

    const lowStock =
      ingredients?.filter(
        (i) =>
          i.min_stock !== null &&
          i.current_stock !== null &&
          i.current_stock < i.min_stock,
      ) || [];

    // 3. Get pending checklists
    const { data: pendingChecklists } = await supabase
      .from("checklists")
      .select("type, villa_id, status")
      .eq("date", targetDate)
      .in("status", ["pending", "in_progress"]);

    // 4. Get reservations for context
    const { data: reservations } = await supabase
      .from("reservations")
      .select(
        "guest_name, guests_count, dietary_needs, interests, check_in, check_out",
      )
      .gte("check_out", targetDate)
      .lte("check_in", targetDate)
      .eq("status", "confirmed");

    // Build context for Claude
    const context = {
      date: targetDate,
      dayOfWeek: new Date(targetDate).toLocaleDateString("es-CO", {
        weekday: "long",
      }),
      occupancy: {
        guests: guestCount,
        checkIns,
        checkOuts,
        villas: occupancyData?.villas_occupied || [],
      },
      lowStock: lowStock.map((i) => ({
        item: i.name_es,
        current: i.current_stock,
        minimum: i.min_stock,
        category: i.category,
      })),
      pendingChecklists: pendingChecklists?.length || 0,
      guestPreferences: reservations?.map((r) => ({
        guest: r.guest_name,
        dietary: r.dietary_needs,
        interests: r.interests,
        guests: r.guests_count,
      })),
    };

    // Check if Anthropic API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      // Return basic tasks without AI
      return NextResponse.json({
        success: true,
        generated_at: new Date().toISOString(),
        ai_powered: false,
        tasks: generateBasicTasks(context, department),
        context,
      });
    }

    const anthropic = new Anthropic();

    const systemPrompt = `Eres el asistente de operaciones de TVC (Tiny Village Cartagena), un resort de lujo en Tierra Bomba.

Tu trabajo es generar una lista de tareas prioritarias para el día basándote en:
- Ocupación actual y movimientos de huéspedes
- Stock bajo de ingredientes
- Preferencias de los huéspedes
- Día de la semana (mantenimiento específico)

REGLAS:
1. Genera entre 5-10 tareas específicas y accionables
2. Prioriza por urgencia (Alta, Media, Baja)
3. Asigna a un departamento (kitchen, housekeeping, maintenance, pool, front_desk)
4. Incluye estimado de tiempo
5. Responde SOLO en JSON válido

FORMATO DE RESPUESTA (JSON):
{
  "tasks": [
    {
      "title": "Título de la tarea",
      "description": "Descripción detallada",
      "priority": "alta|media|baja",
      "department": "kitchen|housekeeping|maintenance|pool|front_desk",
      "estimated_minutes": 30,
      "reason": "Por qué esta tarea es necesaria hoy"
    }
  ],
  "summary": "Resumen de 1-2 oraciones del día"
}`;

    const userPrompt = `Genera las tareas para hoy basándote en este contexto:

${JSON.stringify(context, null, 2)}

${department ? `FILTRAR SOLO PARA DEPARTAMENTO: ${department}` : "Incluir todos los departamentos"}`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const responseText =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Parse JSON response
    let tasks;
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        tasks = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error(
        "[tasks/generate] Failed to parse AI response:",
        parseError,
      );
      // Fallback to basic tasks
      return NextResponse.json({
        success: true,
        generated_at: new Date().toISOString(),
        ai_powered: false,
        tasks: generateBasicTasks(context, department),
        context,
        parse_error: "AI response parsing failed",
      });
    }

    return NextResponse.json({
      success: true,
      generated_at: new Date().toISOString(),
      ai_powered: true,
      ...tasks,
      context,
    });
  } catch (error) {
    console.error("[tasks/generate]", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 },
    );
  }
}

// Fallback task generator without AI
function generateBasicTasks(
  context: {
    date: string;
    dayOfWeek: string;
    occupancy: { guests: number; checkIns: number; checkOuts: number };
    lowStock: { item: string; category: string }[];
  },
  department?: string,
) {
  const tasks = [];

  // Check-in preparation
  if (context.occupancy.checkIns > 0) {
    tasks.push({
      title: `Preparar ${context.occupancy.checkIns} check-in(s)`,
      description:
        "Verificar villas limpias, amenities completos, bebida de bienvenida lista",
      priority: "alta",
      department: "housekeeping",
      estimated_minutes: 45,
      reason: `${context.occupancy.checkIns} huéspedes llegando hoy`,
    });
  }

  // Check-out processing
  if (context.occupancy.checkOuts > 0) {
    tasks.push({
      title: `Procesar ${context.occupancy.checkOuts} check-out(s)`,
      description:
        "Inspección de villa, inventario de minibar, limpieza profunda",
      priority: "alta",
      department: "housekeeping",
      estimated_minutes: 60,
      reason: `${context.occupancy.checkOuts} huéspedes saliendo hoy`,
    });
  }

  // Low stock alerts
  if (context.lowStock.length > 0) {
    const categories = [...new Set(context.lowStock.map((i) => i.category))];
    tasks.push({
      title: `Revisar stock bajo (${context.lowStock.length} items)`,
      description: `Categorías afectadas: ${categories.join(", ")}. Items: ${context.lowStock
        .slice(0, 5)
        .map((i) => i.item)
        .join(", ")}`,
      priority: "media",
      department: "kitchen",
      estimated_minutes: 30,
      reason: `${context.lowStock.length} ingredientes por debajo del mínimo`,
    });
  }

  // Daily pool check
  tasks.push({
    title: "Revisión de piscina - mañana",
    description: "Verificar químicos, limpiar filtros, preparar área de deck",
    priority: "alta",
    department: "pool",
    estimated_minutes: 30,
    reason: "Mantenimiento diario obligatorio",
  });

  // Guest count based kitchen prep
  if (context.occupancy.guests > 0) {
    tasks.push({
      title: `Preparación cocina para ${context.occupancy.guests} huéspedes`,
      description: "Mise en place para desayuno, verificar inventario del día",
      priority: "alta",
      department: "kitchen",
      estimated_minutes: 45,
      reason: `${context.occupancy.guests} personas para alimentar hoy`,
    });
  }

  // Filter by department if specified
  if (department) {
    return tasks.filter((t) => t.department === department);
  }

  return tasks;
}

// GET - Get tasks for a specific date
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];
    const department = searchParams.get("department");

    const supabase = createServerClient();

    // Get occupancy for the date
    const { data: occupancy } = await supabase
      .from("daily_occupancy")
      .select("*")
      .eq("date", date)
      .single();

    // Get pending checklists
    let checklistQuery = supabase
      .from("checklists")
      .select("*")
      .eq("date", date)
      .in("status", ["pending", "in_progress"]);

    const { data: checklists } = await checklistQuery;

    return NextResponse.json({
      success: true,
      date,
      occupancy: occupancy || { guests_count: 0 },
      pending_checklists: checklists?.length || 0,
      checklists,
    });
  } catch (error) {
    console.error("[tasks/generate GET]", error);
    return NextResponse.json(
      { error: "Failed to fetch task data" },
      { status: 500 },
    );
  }
}
