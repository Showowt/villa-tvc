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

FULL MENU:
FOOD:
- Empanadas 22k, Patacones 22k, Cassava Croquettes 22k
- Chicken Sandwich 44k, Turkey Ham Cheese 44k
- Vegan Burger 35k, Beef Burger 52k
- Veggie Wraps 52k, Buddha Bowl 52k, Hot Dog 35k

DRINKS:
- Soda 8.7k, Juice 13k, Water 8k, Unlimited water 20k
- Beer 22k, Wine glass 35k
- ALL cocktails 44k (mojito, margarita, cuba libre, g&t, moscow mule)
- Shots 30k, Premium shots 44k, Premium drinks 61k

BOTTLES:
- Tequila: Olmeca 200k, 1800 540k, Patron 580k, Don Julio 620k, Casamigos 700k
- Vodka: Absolut 220k, Titos 440k, Grey Goose 500k
- Whiskey: Black&White 180k, Jack 460k, Jameson 440k
- Rum: Bandoleros 140k, Ron Medellin 160k, La Hechicera 500k
- Hennessy 700k, Hendricks 560k
- Wine bottles 100-120k, Sparkling 160-180k

SPECIALS (a la carte):
- Caribbean Lobster 180k
- Coconut Fish 75k
- Island Beef 65k
- Grilled Chicken 65k

4-COURSE PRIVATE DINNERS:
- "Cartagena Culture" 235k/person: ceviche, garlic shrimp, braised beef, enyucado
- "Sunset Flavors" 200k/person: watermelon salad, arepas, grilled fish, passionfruit mousse
- "Jungle Soul" 170k/person: corn soup, yuca bites, veggie stir-fry, plantains chocolate

BRUNCH (Village People):
Bottomless mimosas + bottomless tapas (mini burgers, fried chicken, waffles, shrimp, empanadas). Contact for group pricing.

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
        max_tokens: 100, // Short but can give details when asked
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
