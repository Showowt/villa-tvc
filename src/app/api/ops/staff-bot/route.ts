// ═══════════════════════════════════════════════════════════════
// TVC STAFF BOT API
// AI-powered operational assistant for staff via WhatsApp
// Issue #58 — WHATSAPP STAFF BOT NOT CONNECTED
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// REQUEST VALIDATION
// ═══════════════════════════════════════════════════════════════

const staffBotRequestSchema = z.object({
  message: z.string().min(1, "Message is required"),
  staffId: z.string().optional(),
  staffName: z.string().optional(),
  department: z.string().optional(),
  channel: z.enum(["whatsapp", "web"]).optional().default("web"),
  history: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        text: z.string(),
      }),
    )
    .optional()
    .default([]),
});

type StaffBotRequest = z.infer<typeof staffBotRequestSchema>;

// ═══════════════════════════════════════════════════════════════
// CLAUDE API DIRECT CALL (SDK has issues on Vercel)
// ═══════════════════════════════════════════════════════════════

async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.content[0]?.text || "Lo siento, no pude generar una respuesta.";
}

// ═══════════════════════════════════════════════════════════════
// CONTEXT BUILDERS
// ═══════════════════════════════════════════════════════════════

async function getSOPContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  try {
    // Try the search_sop RPC function first
    const { data: sopResults } = await supabase.rpc("search_sop", {
      query,
      lang: "es",
    });

    if (sopResults && sopResults.length > 0) {
      return sopResults
        .slice(0, 3)
        .map(
          (sop: { title_es: string; content_es: string }) =>
            `### ${sop.title_es}\n${sop.content_es}`,
        )
        .join("\n\n---\n\n");
    }
  } catch {
    // Fallback to direct query
    const { data: sopData } = await supabase
      .from("sop_library")
      .select("title_es, content_es, category, subcategory")
      .eq("is_active", true)
      .limit(5);

    if (sopData && sopData.length > 0) {
      return sopData
        .map((sop) => `### ${sop.title_es}\n${sop.content_es}`)
        .join("\n\n---\n\n");
    }
  }

  return "";
}

async function getMenuContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  const foodKeywords = [
    "receta",
    "recipe",
    "preparar",
    "hacer",
    "ingrediente",
    "plato",
    "dish",
    "comida",
    "desayuno",
    "almuerzo",
    "cena",
    "snack",
  ];

  const drinkKeywords = [
    "mojito",
    "margarita",
    "cocktail",
    "coctel",
    "bebida",
    "trago",
    "ron",
    "vodka",
    "whiskey",
    "cerveza",
    "vino",
    "pina colada",
    "moscow mule",
  ];

  const lowerQuery = query.toLowerCase();
  const isFoodQuery = foodKeywords.some((kw) => lowerQuery.includes(kw));
  const isDrinkQuery = drinkKeywords.some((kw) => lowerQuery.includes(kw));

  if (!isFoodQuery && !isDrinkQuery) {
    return "";
  }

  let menuContext = "";

  // Get food items
  if (isFoodQuery) {
    const { data: menuItems } = await supabase
      .from("menu_items")
      .select(
        "name_es, description_es, price, cost, allergens, dietary_tags, category",
      )
      .eq("is_active", true)
      .not("category", "in", '("cocktail","mocktail","beer","wine","spirit")')
      .limit(15);

    if (menuItems && menuItems.length > 0) {
      menuContext +=
        "\n\n### Menu de Comidas:\n" +
        menuItems
          .map((item) => {
            let text = `- **${item.name_es}** ($${item.price?.toLocaleString()} COP)`;
            if (item.description_es) text += `: ${item.description_es}`;
            if (item.cost) text += ` [Costo: $${item.cost?.toLocaleString()}]`;
            if (item.allergens && Array.isArray(item.allergens)) {
              const allergens = item.allergens as string[];
              if (allergens.length > 0) {
                text += ` [Alergenos: ${allergens.join(", ")}]`;
              }
            }
            return text;
          })
          .join("\n");
    }
  }

  // Get drink items
  if (isDrinkQuery) {
    const { data: drinks } = await supabase
      .from("menu_items")
      .select("name_es, description_es, price, cost, category")
      .in("category", ["cocktail", "mocktail", "beer", "wine", "spirit"])
      .eq("is_active", true)
      .limit(20);

    if (drinks && drinks.length > 0) {
      menuContext +=
        "\n\n### Bebidas y Cocteles:\n" +
        drinks
          .map((d) => {
            let text = `- **${d.name_es}** ($${d.price?.toLocaleString()} COP)`;
            if (d.cost) text += ` [Costo: $${d.cost?.toLocaleString()}]`;
            if (d.description_es) text += `: ${d.description_es}`;
            return text;
          })
          .join("\n");
    }
  }

  return menuContext;
}

async function getInventoryContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  const inventoryKeywords = [
    "hay",
    "tenemos",
    "queda",
    "disponible",
    "inventario",
    "stock",
    "falta",
    "necesitamos",
    "pollo",
    "carne",
    "pescado",
    "verdura",
    "fruta",
    "huevo",
    "leche",
    "queso",
  ];

  const lowerQuery = query.toLowerCase();
  const isInventoryQuery = inventoryKeywords.some((kw) =>
    lowerQuery.includes(kw),
  );

  if (!isInventoryQuery) {
    return "";
  }

  // Get low stock items
  const { data: lowStock } = await supabase
    .from("ingredients")
    .select("name_es, current_stock, min_stock, unit, category")
    .eq("is_active", true)
    .not("current_stock", "is", null)
    .order("current_stock", { ascending: true })
    .limit(20);

  if (!lowStock || lowStock.length === 0) {
    return "";
  }

  const criticalItems = lowStock.filter(
    (item) =>
      item.current_stock !== null &&
      item.min_stock !== null &&
      item.current_stock <= item.min_stock,
  );

  const lowItems = lowStock.filter(
    (item) =>
      item.current_stock !== null &&
      item.min_stock !== null &&
      item.current_stock > item.min_stock &&
      item.current_stock <= item.min_stock * 1.5,
  );

  let inventoryContext = "\n\n### Estado de Inventario:\n";

  if (criticalItems.length > 0) {
    inventoryContext +=
      "\n**CRITICO (ordenar ya):**\n" +
      criticalItems
        .map(
          (item) =>
            `- ${item.name_es}: ${item.current_stock} ${item.unit} (min: ${item.min_stock})`,
        )
        .join("\n");
  }

  if (lowItems.length > 0) {
    inventoryContext +=
      "\n\n**Stock bajo:**\n" +
      lowItems
        .map(
          (item) =>
            `- ${item.name_es}: ${item.current_stock} ${item.unit} (min: ${item.min_stock})`,
        )
        .join("\n");
  }

  // Search for specific ingredient mentioned
  const specificIngredient = lowStock.find((item) =>
    lowerQuery.includes(item.name_es.toLowerCase()),
  );

  if (specificIngredient) {
    inventoryContext += `\n\n**${specificIngredient.name_es}:** ${specificIngredient.current_stock} ${specificIngredient.unit} disponible`;
  }

  return inventoryContext;
}

async function getOccupancyContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  const occupancyKeywords = [
    "huespedes",
    "guests",
    "ocupacion",
    "ocupados",
    "villas",
    "check-in",
    "check-out",
    "llegadas",
    "salidas",
    "cuantos",
    "hoy",
  ];

  const lowerQuery = query.toLowerCase();
  const isOccupancyQuery = occupancyKeywords.some((kw) =>
    lowerQuery.includes(kw),
  );

  if (!isOccupancyQuery) {
    return "";
  }

  // Get today's occupancy
  const today = new Date().toISOString().split("T")[0];

  const { data: occupancy } = await supabase
    .from("daily_occupancy")
    .select("guests_count, check_ins, check_outs, villas_occupied")
    .eq("date", today)
    .single();

  // Get active reservations
  const { data: reservations } = await supabase
    .from("reservations")
    .select("guest_name, guests_count, villas, check_in, check_out, status")
    .eq("status", "checked_in")
    .limit(10);

  let occupancyContext = "\n\n### Ocupacion de Hoy:\n";

  if (occupancy) {
    occupancyContext += `- **Huespedes:** ${occupancy.guests_count || 0}
- **Check-ins hoy:** ${occupancy.check_ins || 0}
- **Check-outs hoy:** ${occupancy.check_outs || 0}`;

    if (occupancy.villas_occupied && Array.isArray(occupancy.villas_occupied)) {
      occupancyContext += `\n- **Villas ocupadas:** ${(occupancy.villas_occupied as string[]).join(", ")}`;
    }
  }

  if (reservations && reservations.length > 0) {
    occupancyContext +=
      "\n\n**Reservas activas:**\n" +
      reservations
        .map((r) => {
          const villas = r.villas
            ? Array.isArray(r.villas)
              ? (r.villas as string[]).join(", ")
              : r.villas
            : "No asignada";
          return `- ${r.guest_name} (${r.guests_count} pax) - ${villas}`;
        })
        .join("\n");
  }

  return occupancyContext;
}

async function getScheduleContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  const scheduleKeywords = [
    "lancha",
    "bote",
    "boat",
    "ferry",
    "horario",
    "schedule",
    "llega",
    "sale",
    "muelle",
  ];

  const lowerQuery = query.toLowerCase();
  const isScheduleQuery = scheduleKeywords.some((kw) =>
    lowerQuery.includes(kw),
  );

  if (!isScheduleQuery) {
    return "";
  }

  return `
### Horarios de Lanchas:

**Desde Cartagena (Muelle Pegasus):**
- 3:00 PM
- 6:30 PM

**Desde TVC:**
- 8:00 AM
- 11:00 AM

**Lancha privada:** Disponible 24/7 (costo adicional, coordinar con Akil)

**Punto de encuentro:** Muelle Pegasus, Centro Historico de Cartagena
`;
}

async function get86Context(
  supabase: ReturnType<typeof createServerClient>,
): Promise<string> {
  // Get 86'd menu items
  const { data: unavailableItems } = await supabase
    .from("menu_items")
    .select("name_es, category, unavailable_reason")
    .eq("is_available", false)
    .eq("is_active", true);

  // Get 86'd services
  const { data: unavailableServices } = await supabase
    .from("services")
    .select("name_es, unavailable_reason")
    .eq("is_available_today", false)
    .eq("is_active", true);

  let context = "";

  if (unavailableItems && unavailableItems.length > 0) {
    context +=
      "\n\n### ITEMS 86'd (NO DISPONIBLES):\n" +
      unavailableItems
        .map(
          (item) =>
            `- *${item.name_es}* (${item.category})${item.unavailable_reason ? ` - ${item.unavailable_reason}` : ""}`,
        )
        .join("\n");
  }

  if (unavailableServices && unavailableServices.length > 0) {
    context +=
      "\n\n### SERVICIOS 86'd (NO DISPONIBLES HOY):\n" +
      unavailableServices
        .map(
          (svc) =>
            `- *${svc.name_es}*${svc.unavailable_reason ? ` - ${svc.unavailable_reason}` : ""}`,
        )
        .join("\n");
  }

  if (context) {
    context +=
      "\n\nCuando un huesped o staff pregunte por un item 86'd, informa que no esta disponible y sugiere alternativas similares.";
  }

  return context;
}

async function getAllergyContext(
  supabase: ReturnType<typeof createServerClient>,
  query: string,
): Promise<string> {
  const allergyKeywords = [
    "alergia",
    "alergico",
    "gluten",
    "lactosa",
    "vegano",
    "vegetariano",
    "sin",
    "libre de",
    "celiaco",
    "intolerancia",
  ];

  const lowerQuery = query.toLowerCase();
  const isAllergyQuery = allergyKeywords.some((kw) => lowerQuery.includes(kw));

  if (!isAllergyQuery) {
    return "";
  }

  // Get menu items with dietary tags
  const { data: gfItems } = await supabase
    .from("menu_items")
    .select("name_es, dietary_tags, allergens")
    .eq("is_active", true)
    .limit(30);

  if (!gfItems || gfItems.length === 0) {
    return "";
  }

  const glutenFree = gfItems.filter((item) => {
    const tags = item.dietary_tags as string[] | null;
    return tags && (tags.includes("gluten_free") || tags.includes("gf"));
  });

  const vegan = gfItems.filter((item) => {
    const tags = item.dietary_tags as string[] | null;
    return tags && tags.includes("vegan");
  });

  const vegetarian = gfItems.filter((item) => {
    const tags = item.dietary_tags as string[] | null;
    return tags && (tags.includes("vegetarian") || tags.includes("vegan"));
  });

  let allergyContext = "\n\n### Opciones Dieteticas:\n";

  if (glutenFree.length > 0) {
    allergyContext +=
      "\n**Sin Gluten:**\n" +
      glutenFree.map((item) => `- ${item.name_es}`).join("\n");
  }

  if (vegan.length > 0) {
    allergyContext +=
      "\n\n**Vegano:**\n" + vegan.map((item) => `- ${item.name_es}`).join("\n");
  }

  if (vegetarian.length > 0 && vegetarian.length !== vegan.length) {
    allergyContext +=
      "\n\n**Vegetariano:**\n" +
      vegetarian.map((item) => `- ${item.name_es}`).join("\n");
  }

  return allergyContext;
}

// ═══════════════════════════════════════════════════════════════
// ESCALATION DETECTION
// ═══════════════════════════════════════════════════════════════

function detectEscalation(message: string): {
  needsEscalation: boolean;
  reason: string | null;
} {
  const lowerMessage = message.toLowerCase();

  // Emergency keywords
  const emergencyKeywords = [
    "emergencia",
    "emergency",
    "urgente",
    "urgent",
    "accidente",
    "accident",
    "medico",
    "doctor",
    "hospital",
    "fuego",
    "fire",
    "policia",
    "police",
  ];

  if (emergencyKeywords.some((kw) => lowerMessage.includes(kw))) {
    return { needsEscalation: true, reason: "Emergency keyword detected" };
  }

  // Escalation request
  const escalationKeywords = [
    "hablar con akil",
    "contactar a akil",
    "necesito a akil",
    "donde esta akil",
    "talk to manager",
    "need manager",
    "quiero hablar",
    "no entiendo",
    "no me ayuda",
  ];

  if (escalationKeywords.some((kw) => lowerMessage.includes(kw))) {
    return { needsEscalation: true, reason: "Staff requested escalation" };
  }

  // Guest complaints
  const complaintKeywords = [
    "queja",
    "complaint",
    "problema grave",
    "muy molesto",
    "inaceptable",
    "reembolso",
    "refund",
  ];

  if (complaintKeywords.some((kw) => lowerMessage.includes(kw))) {
    return { needsEscalation: true, reason: "Complaint or serious issue" };
  }

  return { needsEscalation: false, reason: null };
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT
// ═══════════════════════════════════════════════════════════════

const SYSTEM_PROMPT_BASE = `Eres el asistente de operaciones back-of-house para TVC (Tiny Village Cartagena), un resort de tiny houses de lujo en la isla Tierra Bomba, Colombia.

## TU ROL
Eres el bot de conocimiento operacional para el staff. Respondes preguntas sobre:
- Recetas de cocteles y comida (con costos y margenes)
- Protocolos de seguridad y emergencias
- Horarios de barcos, check-in/out, servicio
- Procedimientos de limpieza y housekeeping
- Alergias y restricciones alimentarias de huespedes
- Estado de inventario
- Ocupacion del dia
- Contactos de emergencia
- Excursiones y servicios

## TU PERSONALIDAD
- Profesional pero amigable
- Respuestas CONCISAS y directas - el staff esta ocupado
- En espanol colombiano natural (sin tildes en respuestas para compatibilidad WhatsApp)
- Si no sabes algo con certeza, di "No tengo esa info. Contacta a Akil."

## FORMATO DE RESPUESTAS
- Usa *negritas* para titulos y datos importantes (formato WhatsApp)
- Listas con viñetas para pasos o ingredientes
- Incluye costos cuando aplique
- Mantén respuestas cortas (max 200 palabras) a menos que pidan detalles

## ESCALACION
Si la pregunta es sobre:
- Precios para huespedes → "Eso es para el equipo de ventas, contacta a Akil"
- Emergencias medicas → Dar protocolo Y decir que contacten a Akil inmediatamente
- Algo que no sabes → "No tengo esa info todavia. Voy a escalar a Akil."

## CONTACTOS DE EMERGENCIA
- Emergencias Colombia: 123
- Ambulancia: 125
- Gerente (Akil): +57 316 055 1387

## CONOCIMIENTO DISPONIBLE
`;

// ═══════════════════════════════════════════════════════════════
// MAIN API HANDLER
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "API key not configured",
        details: "ANTHROPIC_API_KEY environment variable is not set in Vercel",
        response: "Bot no configurado. Contacta a Akil: +57 316 055 1387",
        success: false,
        needsEscalation: true,
        escalationReason: "Bot not configured",
      },
      { status: 500 },
    );
  }

  try {
    // Parse and validate request
    const rawBody = await request.json();
    const parseResult = staffBotRequestSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid request",
          details: parseResult.error.errors,
          success: false,
        },
        { status: 400 },
      );
    }

    const { message, staffId, staffName, department, channel, history } =
      parseResult.data;

    console.log(
      `[StaffBot] Query from ${staffName || "Unknown"} (${department || "no dept"}) via ${channel}: ${message.substring(0, 50)}...`,
    );

    // Check for escalation triggers
    const escalation = detectEscalation(message);

    // Initialize Supabase client
    const supabase = createServerClient();

    // Build context from various sources in parallel
    const [
      sopContext,
      menuContext,
      inventoryContext,
      occupancyContext,
      scheduleContext,
      allergyContext,
      item86Context,
    ] = await Promise.all([
      getSOPContext(supabase, message),
      getMenuContext(supabase, message),
      getInventoryContext(supabase, message),
      getOccupancyContext(supabase, message),
      getScheduleContext(supabase, message),
      getAllergyContext(supabase, message),
      get86Context(supabase),
    ]);

    // Combine all context (86'd items ALWAYS included for awareness)
    const combinedContext =
      (sopContext || "No hay informacion especifica en SOPs.") +
      menuContext +
      inventoryContext +
      occupancyContext +
      scheduleContext +
      allergyContext +
      item86Context;

    // Build complete system prompt
    const systemPrompt = SYSTEM_PROMPT_BASE + combinedContext;

    // Build messages array with history
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add conversation history (last 6 messages max for context window)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-6);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === "user" ? "user" : "assistant",
          content: msg.text,
        });
      }
    }

    // Add current message
    messages.push({
      role: "user",
      content: message,
    });

    // Call Claude via direct fetch
    const responseText = await callClaude(systemPrompt, messages);

    // Log conversation to database
    try {
      await supabase.from("conversations").insert({
        channel,
        contact_type: "staff",
        contact_name: staffName || "Staff Member",
        contact_id: staffId || null,
        language: "es",
        status: escalation.needsEscalation ? "escalated" : "resolved",
        summary: message.substring(0, 200),
        escalation_reason: escalation.reason,
      });
    } catch (e) {
      console.error("[StaffBot] Failed to log conversation:", e);
    }

    // Create task if escalation needed
    if (escalation.needsEscalation) {
      try {
        // Note: This would create a task in tasks table if it exists
        console.log(`[StaffBot] Escalation triggered: ${escalation.reason}`);
      } catch (e) {
        console.error("[StaffBot] Failed to create escalation task:", e);
      }
    }

    return NextResponse.json({
      response: responseText,
      success: true,
      needsEscalation: escalation.needsEscalation,
      escalationReason: escalation.reason,
      contextUsed: {
        sop: !!sopContext,
        menu: !!menuContext,
        inventory: !!inventoryContext,
        occupancy: !!occupancyContext,
        schedule: !!scheduleContext,
        allergy: !!allergyContext,
        item86: !!item86Context,
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    const errorStack = error instanceof Error ? error.stack : "";
    const errorName = error instanceof Error ? error.name : "UnknownError";

    console.error("[StaffBot API] Error:", {
      name: errorName,
      message: errorMessage,
      stack: errorStack,
    });

    // Check for specific Anthropic errors
    let userMessage =
      "Error de conexion. Por favor contacta a Akil directamente: +57 316 055 1387";

    if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      userMessage =
        "Error de autenticacion del bot. Contacta a soporte tecnico.";
    } else if (errorMessage.includes("rate") || errorMessage.includes("429")) {
      userMessage = "Demasiadas solicitudes. Intenta de nuevo en un momento.";
    }

    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: `${errorName}: ${errorMessage}`,
        response: userMessage,
        success: false,
        needsEscalation: true,
        escalationReason: "Bot error",
      },
      { status: 500 },
    );
  }
}
