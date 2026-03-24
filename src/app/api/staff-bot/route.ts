import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createServerClient } from "@/lib/supabase/client";

const anthropic = new Anthropic();

export async function POST(request: Request) {
  try {
    const { message } = await request.json();

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Search SOP library for relevant content
    const { data: sopResults } = await supabase.rpc("search_sop", {
      query: message,
      lang: "es",
    });

    // Build context from SOP results
    let sopContext = "";
    if (sopResults && sopResults.length > 0) {
      sopContext = sopResults
        .slice(0, 3)
        .map(
          (sop: { title_es: string; content_es: string }) =>
            `### ${sop.title_es}\n${sop.content_es}`,
        )
        .join("\n\n---\n\n");
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
    ];
    const isFoodQuery = foodKeywords.some((kw) =>
      message.toLowerCase().includes(kw),
    );

    let menuContext = "";
    if (isFoodQuery) {
      const { data: menuItems } = await supabase
        .from("menu_items")
        .select("name_es, description_es, allergens, dietary_tags")
        .eq("is_active", true)
        .limit(10);

      if (menuItems && menuItems.length > 0) {
        menuContext =
          "\n\n### Menú Actual:\n" +
          menuItems
            .map((item) => `- ${item.name_es}: ${item.description_es || ""}`)
            .join("\n");
      }
    }

    // Get drink keywords
    const drinkKeywords = [
      "mojito",
      "colada",
      "margarita",
      "cocktail",
      "coctel",
      "bebida",
      "drink",
      "trago",
    ];
    const isDrinkQuery = drinkKeywords.some((kw) =>
      message.toLowerCase().includes(kw),
    );

    let drinkContext = "";
    if (isDrinkQuery) {
      const { data: drinks } = await supabase
        .from("menu_items")
        .select("name_es, description_es")
        .in("category", ["cocktail", "mocktail", "beer", "wine"])
        .eq("is_active", true);

      if (drinks && drinks.length > 0) {
        drinkContext =
          "\n\n### Bebidas Disponibles:\n" +
          drinks.map((d) => `- ${d.name_es}`).join("\n");
      }
    }

    const systemPrompt = `Eres el asistente operativo de Tiny Village Cartagena (TVC), un resort de lujo en la isla de Tierra Bomba, Colombia.

Tu rol es ayudar al personal (staff) con:
- Recetas de cocina y preparación de platos
- Preparación de bebidas y cócteles
- Procedimientos de limpieza y housekeeping
- Protocolos de emergencia
- Horarios de lanchas y logística
- Cualquier duda operativa del día a día

REGLAS IMPORTANTES:
1. Responde SIEMPRE en español
2. Sé conciso y directo - el staff está ocupado
3. Si hay un protocolo de emergencia, priorízalo
4. Si no sabes algo, di "No tengo esa información. Contacta a Akil."
5. Para emergencias médicas: "Llama al 123, luego a Akil inmediatamente"
6. Usa listas y pasos numerados cuando sea apropiado

CONOCIMIENTO DISPONIBLE:
${sopContext || "No se encontró información específica en la base de conocimiento."}
${menuContext}
${drinkContext}

INFORMACIÓN DE LANCHAS:
- Salidas desde Cartagena: 9 AM, 12 PM, 4 PM, 7 PM (última)
- Salidas desde TVC: 8 AM, 11 AM, 3 PM, 6 PM (última)
- Lancha privada disponible 24/7 (costo: 150,000 COP)

CONTACTOS DE EMERGENCIA:
- Emergencias Colombia: 123
- Gerente (Akil): Contactar por WhatsApp grupal`;

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: message }],
    });

    const assistantMessage =
      response.content[0].type === "text" ? response.content[0].text : "";

    // Log conversation to database
    await supabase.from("conversations").insert({
      channel: "web",
      contact_type: "staff",
      contact_name: "Staff Member",
      language: "es",
      status: "resolved",
    });

    return NextResponse.json({ response: assistantMessage });
  } catch (error) {
    console.error("[staff-bot]", error);
    return NextResponse.json(
      { error: "Failed to process message" },
      { status: 500 },
    );
  }
}
