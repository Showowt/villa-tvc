import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/client";

const SYSTEM_PROMPT_BASE = `Eres el asistente de operaciones back-of-house para TVC (Tiny Village Cartagena), un resort de tiny houses de lujo en la isla Tierra Bomba, Colombia.

## TU ROL
Eres el bot de conocimiento operacional para el staff. Respondes preguntas sobre:
- Recetas de cócteles y comida (con costos y márgenes)
- Protocolos de seguridad y emergencias
- Horarios de barcos, check-in/out, servicio
- Procedimientos de limpieza
- Alergias y restricciones alimentarias
- Contactos de emergencia
- Excursiones y servicios

## TU PERSONALIDAD
- Profesional pero amigable
- Respuestas CONCISAS y directas
- En español colombiano natural
- Usa emojis ocasionalmente para claridad (🍹 para bebidas, 🚨 para emergencias, etc.)
- Si no sabes algo con certeza, di "Voy a escalar esto a Akil" y sugiere contactarlo

## FORMATO DE RESPUESTAS
- Usa **negritas** para títulos y datos importantes
- Listas con viñetas para pasos o ingredientes
- Incluye costos cuando aplique
- Mantén respuestas cortas (máx 150 palabras) a menos que pidan detalles

## ESCALACIÓN
Si la pregunta es sobre:
- Precios para huéspedes → "Eso es para el equipo de ventas, contacta a Akil"
- Emergencias médicas → Dar protocolo Y decir que contacten a Akil inmediatamente
- Algo que no sabes → "No tengo esa info todavía. Voy a escalar a Akil."

## INFORMACIÓN DE LANCHAS
- Salidas desde Cartagena: 3:00 PM, 6:30 PM
- Salidas desde TVC: 8:00 AM, 11:00 AM
- Punto de encuentro: Muelle Pegasus
- Lancha privada disponible 24/7 (costo adicional)

## CONTACTOS DE EMERGENCIA
- Emergencias Colombia: 123
- Gerente (Akil): +57 316 055 1387

## CONOCIMIENTO ADICIONAL
`;

export async function POST(request: NextRequest) {
  // Check if API key is configured
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "API key not configured",
        details: "ANTHROPIC_API_KEY environment variable is not set in Vercel",
        response: "⚠️ Bot no configurado. Contacta a Akil: +57 316 055 1387",
        success: false,
      },
      { status: 500 },
    );
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  try {
    const { message, history } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Search SOP library for relevant content
    let sopContext = "";
    try {
      const { data: sopResults } = await supabase.rpc("search_sop", {
        query: message,
        lang: "es",
      });

      if (sopResults && sopResults.length > 0) {
        sopContext = sopResults
          .slice(0, 3)
          .map(
            (sop: { title_es: string; content_es: string }) =>
              `### ${sop.title_es}\n${sop.content_es}`,
          )
          .join("\n\n---\n\n");
      }
    } catch (e) {
      console.log("[StaffBot] search_sop not available, using fallback", e);
      // Fallback: direct query to sop_library
      const { data: sopData } = await supabase
        .from("sop_library")
        .select("title_es, content_es")
        .limit(5);

      if (sopData) {
        sopContext = sopData
          .map((sop) => `### ${sop.title_es}\n${sop.content_es}`)
          .join("\n\n---\n\n");
      }
    }

    // Get menu items if food-related query
    const foodKeywords = [
      "receta",
      "recipe",
      "preparar",
      "hacer",
      "ingrediente",
      "plato",
      "dish",
      "mojito",
      "margarita",
      "cocktail",
      "coctel",
      "bebida",
    ];
    const isFoodQuery = foodKeywords.some((kw) =>
      message.toLowerCase().includes(kw),
    );

    let menuContext = "";
    if (isFoodQuery) {
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("name_es, description_es, price, allergens, dietary_tags")
        .eq("is_active", true)
        .limit(10);

      if (menuItems && menuItems.length > 0) {
        menuContext =
          "\n\n### Menú y Recetas:\n" +
          menuItems
            .map((item) => {
              let itemText = `- **${item.name_es}** ($${item.price?.toLocaleString()} COP)`;
              if (item.description_es) {
                itemText += `: ${item.description_es}`;
              }
              if (
                item.allergens &&
                Array.isArray(item.allergens) &&
                item.allergens.length > 0
              ) {
                itemText += ` [Alérgenos: ${(item.allergens as string[]).join(", ")}]`;
              }
              return itemText;
            })
            .join("\n");
      }
    }

    // Build complete system prompt
    const systemPrompt =
      SYSTEM_PROMPT_BASE +
      (sopContext ||
        "No se encontró información específica en la base de conocimiento.") +
      menuContext;

    // Build messages array with history
    const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

    // Add conversation history (last 10 messages max)
    if (history && Array.isArray(history)) {
      const recentHistory = history.slice(-10);
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

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 500,
      system: systemPrompt,
      messages,
    });

    const responseText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Lo siento, tuve un problema. Por favor contacta a Akil: +57 316 055 1387";

    // Log conversation to database
    try {
      await supabase.from("conversations").insert({
        channel: "web",
        contact_type: "staff",
        contact_name: "Staff Member",
        language: "es",
        status: "resolved",
      });
    } catch (e) {
      console.log("[StaffBot] Failed to log conversation", e);
    }

    return NextResponse.json({
      response: responseText,
      success: true,
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
      error,
    });

    // Check for specific Anthropic errors
    let userMessage =
      "⚠️ Error de conexión. Por favor contacta a Akil directamente: +57 316 055 1387";
    if (
      errorMessage.includes("authentication") ||
      errorMessage.includes("401")
    ) {
      userMessage =
        "⚠️ Error de autenticación del bot. Contacta a soporte técnico.";
    } else if (errorMessage.includes("rate") || errorMessage.includes("429")) {
      userMessage =
        "⚠️ Demasiadas solicitudes. Intenta de nuevo en un momento.";
    }

    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: `${errorName}: ${errorMessage}`,
        response: userMessage,
        success: false,
      },
      { status: 500 },
    );
  }
}
