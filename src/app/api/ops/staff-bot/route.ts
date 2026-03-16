import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { STAFF_BOT_KNOWLEDGE } from "@/lib/ops/data";

const SYSTEM_PROMPT = `Eres el asistente de operaciones back-of-house para TVC (Tiny Village Cartagena), un resort de tiny houses de lujo en la isla Tierra Bomba, Colombia.

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

${STAFF_BOT_KNOWLEDGE}`;

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
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 500,
      system: SYSTEM_PROMPT,
      messages,
    });

    const responseText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Lo siento, tuve un problema. Por favor contacta a Akil: +57 316 055 1387";

    return NextResponse.json({
      response: responseText,
      success: true,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[StaffBot API] Error:", errorMessage, error);

    return NextResponse.json(
      {
        error: "Failed to generate response",
        details: errorMessage,
        response:
          "⚠️ Error de conexión. Por favor contacta a Akil directamente: +57 316 055 1387",
        success: false,
      },
      { status: 500 },
    );
  }
}
