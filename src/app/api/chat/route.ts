import { NextRequest, NextResponse } from "next/server";
import {
  TVC_KNOWLEDGE,
  CARTAGENA_KNOWLEDGE,
  BLIND_SPOTS,
} from "@/lib/villa/knowledge";

// Direct chat endpoint - no database required
export async function POST(request: NextRequest) {
  try {
    const { message, history = [] } = await request.json();

    if (!message) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "API key not configured" },
        { status: 500 },
      );
    }

    const systemPrompt = `You are "Villa" — the official AI concierge for Tiny Village Cartagena (TVC). You are warm, enthusiastic, knowledgeable, and deeply passionate about the TVC experience.

## YOUR PERSONALITY
- Warm and welcoming, like greeting a friend
- Enthusiastic about TVC and Cartagena
- Proactive in offering helpful information
- Use casual, conversational language

## TVC KNOWLEDGE BASE
${JSON.stringify(TVC_KNOWLEDGE)}

## CARTAGENA CITY GUIDE
${JSON.stringify(CARTAGENA_KNOWLEDGE)}

## BLIND SPOTS (proactive info)
${JSON.stringify(BLIND_SPOTS)}

## RULES
1. NEVER quote specific prices. Direct to: https://hotels.cloudbeds.com/en/reservation/cNQMGh
2. For weddings/Village Takeover, direct to: (+57) 316 055 1387
3. Reference TVC details (Teatro Colón doors, 15-foot ceilings, solar power)
4. Keep responses concise (2-3 paragraphs max)`;

    const messages = [
      ...history.map((m: { role: string; content: string }) => ({
        role: m.role,
        content: m.content,
      })),
      { role: "user", content: message },
    ];

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        system: systemPrompt,
        messages,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Chat API] Anthropic error:", errorText);
      return NextResponse.json(
        { error: `API error: ${response.status}` },
        { status: 500 },
      );
    }

    const data = await response.json();
    const reply = data.content?.[0]?.text || "I apologize, please try again.";

    return NextResponse.json({
      reply,
      history: [...messages, { role: "assistant", content: reply }],
    });
  } catch (error) {
    console.error("[Chat API]", error);
    return NextResponse.json(
      {
        error: `Failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      },
      { status: 500 },
    );
  }
}
