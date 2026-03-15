import { NextRequest, NextResponse } from "next/server";

// Simulate human typing delay (1.5-3 seconds)
const humanDelay = () =>
  new Promise((resolve) => setTimeout(resolve, 1500 + Math.random() * 1500));

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

    // Add human-like delay before responding
    await humanDelay();

    const systemPrompt = `You're a staff member at Tiny Village Cartagena hotel texting with guests. Reply like you're texting a friend - keep it SHORT (1-2 sentences max).

RULES:
1. MAX 15 words per response. Seriously, keep it brief.
2. No corporate phrases. No "I'd be happy to" or "Let me know if"
3. Lowercase is fine. Casual tone.
4. Just answer the question, maybe ask one thing back

Examples:
Q: "menu?" A: "we got burgers, fish, sandwiches. what sounds good?"
Q: "mojito price" A: "44k for cocktails"
Q: "dinner time" A: "4-8pm"
Q: "how to get there" A: "taxi to Todomar Marina, boat picks you up"
Q: "thanks" A: "np!"

MENU PRICES:
Food: empanadas 22k, burgers 35-52k, sandwiches 44k, fish plates 65-180k
Drinks: cocktails 44k, beer 22k, wine 35k, bottles 140-700k
Specials: lobster 180k, coconut fish 75k

OPERATIONS:
Check-in 3pm, checkout 11am
Restaurant: breakfast 7:30-9:30am, lunch 11:30-2pm, dinner 4-8pm
Pool: 7am-10pm
Boats to TVC: 3pm, 6:30pm
Boats to city: 8am, 11am

WhatsApp: +57 316 055 1387
No ATMs on island, bring cash. TVC takes cards only.`;

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
        model: "claude-3-haiku-20240307",
        max_tokens: 60, // Very short
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
    const reply = data.content?.[0]?.text || "try again?";

    return NextResponse.json({
      reply,
      history: [...messages, { role: "assistant", content: reply }],
    });
  } catch (error) {
    console.error("[Chat API]", error);
    return NextResponse.json(
      { error: "something went wrong" },
      { status: 500 },
    );
  }
}
