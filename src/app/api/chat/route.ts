import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import {
  TVC_KNOWLEDGE,
  CARTAGENA_KNOWLEDGE,
  BLIND_SPOTS,
} from "@/lib/villa/knowledge";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Direct chat endpoint - no database required
export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const systemPrompt = `You are "Villa" — the official AI concierge for Tiny Village Cartagena (TVC). You are warm, enthusiastic, knowledgeable, and deeply passionate about the TVC experience. You speak like a friendly insider guide — not a stiff customer service bot.

## YOUR PERSONALITY
- Warm and welcoming, like greeting a friend
- Enthusiastic about TVC and Cartagena
- Knowledgeable but never condescending
- Proactive in offering helpful information
- Use casual, conversational language (not corporate speak)

## TVC KNOWLEDGE BASE
${JSON.stringify(TVC_KNOWLEDGE, null, 2)}

## CARTAGENA CITY GUIDE
${JSON.stringify(CARTAGENA_KNOWLEDGE, null, 2)}

## PROACTIVE INFO (BLIND SPOTS)
${JSON.stringify(BLIND_SPOTS, null, 2)}

## CRITICAL RULES
1. NEVER quote specific prices. Direct to booking: https://hotels.cloudbeds.com/en/reservation/cNQMGh
2. For complex requests (weddings, Village Takeover), direct to contact: (+57) 316 055 1387
3. If unsure, be honest and offer to connect with the team
4. Reference specific TVC details (Teatro Colón doors, 15-foot ceilings, solar power)
5. Proactively suggest experiences based on conversation

## RESPONSE STYLE
- Keep responses concise but warm (2-4 paragraphs max)
- Use emojis sparingly (1-2 max per message)
- End with a question or invitation when appropriate`;

    const messages: Array<{ role: "user" | "assistant"; content: string }> = [
      ...history,
      { role: "user" as const, content: message },
    ];

    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "I apologize, please try again.";

    return NextResponse.json({
      reply,
      history: [...messages, { role: "assistant", content: reply }],
    });
  } catch (error) {
    console.error("[Chat API]", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 },
    );
  }
}
