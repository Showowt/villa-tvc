import Anthropic from "@anthropic-ai/sdk";
import type {
  Guest,
  Message,
  JourneyStage,
  Language,
  VillaBrainInput,
  VillaBrainOutput,
} from "@/types";
import { TVC_KNOWLEDGE, CARTAGENA_KNOWLEDGE, BLIND_SPOTS } from "./knowledge";

// Initialize Anthropic client
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ============================================
// SYSTEM PROMPT BUILDER
// ============================================

function buildSystemPrompt(guest: Guest, journeyStage: JourneyStage): string {
  const blindSpotsByStage = getBlindSpotsForStage(journeyStage);

  return `You are "Villa" — the official AI concierge for Tiny Village Cartagena (TVC). You are warm, enthusiastic, knowledgeable, and deeply passionate about the TVC experience. You speak like a friendly insider guide — not a stiff customer service bot.

## YOUR PERSONALITY
- Warm and welcoming, like greeting a friend
- Enthusiastic about TVC and Cartagena
- Knowledgeable but never condescending
- Proactive in offering helpful information
- Match the guest's energy and communication style
- Use casual, conversational language (not corporate speak)
- Occasionally use local expressions naturally

## LANGUAGE
Current guest language preference: ${guest.language === "es" ? "Spanish" : guest.language === "fr" ? "French" : "English"}
- Respond in the same language the guest uses
- If they switch languages, switch with them
- For Spanish speakers, use Colombian expressions when natural

## GUEST CONTEXT
- Name: ${guest.name || "Not provided yet"}
- Journey Stage: ${journeyStage}
- Preferences: ${JSON.stringify(guest.preferences)}

## JOURNEY STAGE AWARENESS
${getJourneyStageGuidance(journeyStage)}

## TVC KNOWLEDGE BASE
${JSON.stringify(TVC_KNOWLEDGE, null, 2)}

## CARTAGENA CITY GUIDE
${JSON.stringify(CARTAGENA_KNOWLEDGE, null, 2)}

## PROACTIVE INFORMATION (BLIND SPOTS)
These are things guests often don't know to ask. Surface them naturally when relevant:
${JSON.stringify(blindSpotsByStage, null, 2)}

## CRITICAL RULES
1. NEVER quote specific prices. For pricing questions, say something like: "Pricing varies based on dates and availability. I'll share our booking link where you can see current rates!" Then provide: https://hotels.cloudbeds.com/en/reservation/cNQMGh

2. For complex requests (weddings, Village Takeover, custom events), enthusiastically acknowledge and direct to fill out the form or contact the team directly at (+57) 316 055 1387.

3. If you genuinely don't know something, be honest: "Great question! I don't have that specific detail — let me connect you with our team who can help right away. You can reach them at (+57) 316 055 1387."

4. Always close with an invitation — either to book, to ask more questions, or to reach out to the team.

5. Reference specific TVC details (Teatro Colón doors, 15-foot ceilings, solar power, etc.) to show genuine expertise.

6. Proactively suggest relevant experiences based on conversation context.

## ESCALATION TRIGGERS
Immediately flag for human escalation if you detect:
- Keywords: "emergency", "problema grave", "manager", "refund", "complaint", "urgent"
- Medical situations: "sick", "hospital", "doctor", "injured"
- Safety concerns: "robbery", "stolen", "police"
- Strong negative sentiment or frustration
- Guest explicitly requests human

When escalating, warmly acknowledge and assure them a team member will reach out immediately.

## RESPONSE FORMAT
- Keep responses concise but warm (2-4 paragraphs max unless detailed info requested)
- Use emojis sparingly and naturally (1-2 max per message)
- Break up long information with line breaks
- End with a question or invitation when appropriate`;
}

function getJourneyStageGuidance(stage: JourneyStage): string {
  const guidance: Record<JourneyStage, string> = {
    discovery: `Guest is exploring and considering TVC. Focus on:
- Painting the picture of the TVC experience
- Answering questions to remove booking objections
- Highlighting unique features (colonial doors, solar power, tiny house design)
- Proactively mentioning things like visa requirements, best time to visit
- Making booking easy (share link when appropriate)`,

    booked: `Guest has a reservation! Focus on:
- Excitement and anticipation building
- Practical preparation (packing, getting pesos, phone service)
- Answering questions about what to expect
- Offering to add experiences or excursions
- Confirming they know how to get to Muelle Pegasus`,

    pre_arrival: `Guest arrives within 7 days. Focus on:
- Logistical readiness (dock directions, boat schedule)
- Last-minute questions
- Building excitement
- Confirming any special requests or dietary needs
- Weather for their specific dates`,

    on_property: `Guest is currently staying at TVC! Focus on:
- Immediate service needs
- Restaurant recommendations (on-site and Cartagena)
- Activity suggestions
- Any issues or requests
- Making their stay magical`,

    departed: `Guest has left. Focus on:
- Thanking them for staying
- Asking about their experience
- Encouraging a review
- Mentioning return visits or referrals
- Keeping the connection warm`,
  };

  return guidance[stage];
}

function getBlindSpotsForStage(
  stage: JourneyStage,
): Array<{ id: string; question: string; info: string }> {
  const stageMapping: Record<JourneyStage, keyof typeof BLIND_SPOTS> = {
    discovery: "pre_booking",
    booked: "pre_arrival",
    pre_arrival: "pre_arrival",
    on_property: "on_property",
    departed: "departing",
  };

  return BLIND_SPOTS[stageMapping[stage]] || [];
}

// ============================================
// LANGUAGE DETECTION
// ============================================

function detectLanguage(text: string): Language {
  // Common Spanish indicators
  const spanishPatterns =
    /\b(hola|buenos|gracias|por favor|qué|cómo|cuándo|dónde|quiero|necesito|puedo|tienen|está|estoy|quisiera|habitación|reserva|precio)\b/i;

  // Common French indicators
  const frenchPatterns =
    /\b(bonjour|merci|s'il vous plaît|comment|quand|où|je veux|j'ai besoin|puis-je|avez-vous|chambre|réservation|prix)\b/i;

  if (spanishPatterns.test(text)) return "es";
  if (frenchPatterns.test(text)) return "fr";
  return "en";
}

// ============================================
// ESCALATION DETECTION
// ============================================

interface EscalationCheck {
  shouldEscalate: boolean;
  reason: string | null;
  priority: "low" | "medium" | "high" | "critical";
}

function checkForEscalation(
  message: string,
  conversationHistory: Message[],
): EscalationCheck {
  const lowerMessage = message.toLowerCase();

  // Critical - immediate escalation
  const criticalKeywords = [
    "emergency",
    "emergencia",
    "urgence",
    "hospital",
    "ambulance",
    "police",
    "policia",
    "robbery",
    "robo",
    "stolen",
    "injured",
    "herido",
  ];

  for (const keyword of criticalKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        shouldEscalate: true,
        reason: `Critical keyword detected: ${keyword}`,
        priority: "critical",
      };
    }
  }

  // High priority - needs human attention
  const highKeywords = [
    "manager",
    "gerente",
    "refund",
    "reembolso",
    "complaint",
    "queja",
    "angry",
    "furious",
    "unacceptable",
    "inaceptable",
    "lawyer",
    "abogado",
  ];

  for (const keyword of highKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        shouldEscalate: true,
        reason: `High priority keyword detected: ${keyword}`,
        priority: "high",
      };
    }
  }

  // Medium - guest explicitly requests human
  const humanRequestKeywords = [
    "speak to someone",
    "hablar con alguien",
    "real person",
    "persona real",
    "human",
    "humano",
    "talk to staff",
    "hablar con personal",
  ];

  for (const keyword of humanRequestKeywords) {
    if (lowerMessage.includes(keyword)) {
      return {
        shouldEscalate: true,
        reason: "Guest requested to speak with human",
        priority: "medium",
      };
    }
  }

  // Check for repeated unclear exchanges (3+ in a row where Villa couldn't help)
  const recentMessages = conversationHistory.slice(-6);
  let unclearCount = 0;
  for (const msg of recentMessages) {
    if (
      msg.role === "villa" &&
      (msg.content.includes("I'm not sure") ||
        msg.content.includes("no estoy seguro") ||
        msg.content.includes("don't have that information") ||
        msg.content.includes("let me connect you"))
    ) {
      unclearCount++;
    }
  }

  if (unclearCount >= 2) {
    return {
      shouldEscalate: true,
      reason: "Multiple unclear exchanges - guest may need human help",
      priority: "medium",
    };
  }

  return {
    shouldEscalate: false,
    reason: null,
    priority: "low",
  };
}

// ============================================
// MAIN BRAIN FUNCTION
// ============================================

export async function generateVillaResponse(
  input: VillaBrainInput,
): Promise<VillaBrainOutput> {
  const { guest, conversation_history, current_message, journey_stage } = input;

  // Detect language from current message
  const languageDetected = detectLanguage(current_message);

  // Check for escalation triggers
  const escalationCheck = checkForEscalation(
    current_message,
    conversation_history,
  );

  // Build conversation messages for Claude
  const messages: Array<{ role: "user" | "assistant"; content: string }> = [];

  // Add conversation history
  for (const msg of conversation_history) {
    messages.push({
      role: msg.role === "guest" ? "user" : "assistant",
      content: msg.content,
    });
  }

  // Add current message
  messages.push({
    role: "user",
    content: current_message,
  });

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: buildSystemPrompt(guest, journey_stage),
      messages,
    });

    const responseText =
      response.content[0].type === "text"
        ? response.content[0].text
        : "I apologize, but I encountered an issue. Please contact our team directly at (+57) 316 055 1387.";

    // Check if response suggests journey stage change
    let suggestedJourneyStage: JourneyStage | null = null;

    // If they mention booking confirmation, suggest moving to 'booked'
    if (
      current_message.toLowerCase().includes("booked") ||
      current_message.toLowerCase().includes("reservation") ||
      current_message.toLowerCase().includes("reservé") ||
      current_message.toLowerCase().includes("reserva")
    ) {
      if (journey_stage === "discovery") {
        suggestedJourneyStage = "booked";
      }
    }

    // If they mention checking out or leaving
    if (
      current_message.toLowerCase().includes("checkout") ||
      current_message.toLowerCase().includes("leaving") ||
      current_message.toLowerCase().includes("salir")
    ) {
      if (journey_stage === "on_property") {
        suggestedJourneyStage = "departed";
      }
    }

    return {
      response: responseText,
      language_detected: languageDetected,
      blind_spots_to_surface: [],
      should_escalate: escalationCheck.shouldEscalate,
      escalation_reason: escalationCheck.reason,
      suggested_journey_stage: suggestedJourneyStage,
    };
  } catch (error) {
    console.error("[VillaBrain] Error generating response:", error);

    // Fallback response based on detected language
    const fallbackMessages: Record<Language, string> = {
      en: "I apologize, but I'm having a moment! 🌴 Please reach out to our team directly at (+57) 316 055 1387 or WhatsApp and they'll help you right away.",
      es: "¡Disculpa, estoy teniendo un momento! 🌴 Por favor contacta a nuestro equipo directamente al (+57) 316 055 1387 o WhatsApp y te ayudarán de inmediato.",
      fr: "Je m'excuse, j'ai un petit problème! 🌴 Veuillez contacter notre équipe directement au (+57) 316 055 1387 ou WhatsApp et ils vous aideront immédiatement.",
    };

    return {
      response: fallbackMessages[languageDetected],
      language_detected: languageDetected,
      blind_spots_to_surface: [],
      should_escalate: true,
      escalation_reason: "AI response generation failed",
      suggested_journey_stage: null,
    };
  }
}

// ============================================
// BLIND SPOT CHECKER
// ============================================

export function checkBlindSpots(
  guest: Guest,
  conversationHistory: Message[],
  currentMessage: string,
): string[] {
  const relevantBlindSpots: string[] = [];
  const stageBlindSpots = getBlindSpotsForStage(guest.journey_stage);

  // Get all mentioned topics from conversation
  const allText = [...conversationHistory.map((m) => m.content), currentMessage]
    .join(" ")
    .toLowerCase();

  for (const blindSpot of stageBlindSpots) {
    // Check if this topic has already been discussed
    const alreadyDiscussed =
      allText.includes(blindSpot.id) ||
      allText.includes(blindSpot.question.toLowerCase());

    if (!alreadyDiscussed) {
      // Add to suggestions
      relevantBlindSpots.push(blindSpot.id);
    }
  }

  return relevantBlindSpots.slice(0, 2); // Max 2 blind spots per response
}
