import Anthropic from "@anthropic-ai/sdk";
import type {
  Guest,
  Message,
  JourneyStage,
  Language,
  VillaBrainInput,
  VillaBrainOutput,
  VillaBrainInputExtended,
  VillaBrainOutputExtended,
  GuestStayContext,
  StayPhase,
  UpsellType,
  TimingBasedUpsell,
  TIMING_BASED_UPSELLS,
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

// ============================================
// TIMING-BASED UPSELL SYSTEM (Issue #47)
// ============================================

// Define upsells inline since importing from types causes circular dependency
const TIMING_UPSELLS: TimingBasedUpsell[] = [
  {
    stay_phase: "arrival_day",
    upsell_type: "sunset_tour",
    upsell_name: "Sunset Bay Tour",
    message_en:
      "Welcome to TVC! Since you just arrived, would you be interested in catching tonight's sunset from the water? Our sunset cruise is magical - golden hour views of Cartagena's skyline with cocktails!",
    message_es:
      "Bienvenido a TVC! Ya que acabas de llegar, te interesaria ver el atardecer de esta noche desde el agua? Nuestro crucero al atardecer es magico - vistas de la hora dorada del skyline de Cartagena con cocteles!",
    priority: 10,
  },
  {
    stay_phase: "day_two",
    upsell_type: "islands_excursion",
    upsell_name: "Rosario Islands Day Trip",
    message_en:
      "Perfect timing! Day 2 is ideal for our Rosario Islands trip - crystal clear water, island hopping, snorkeling. We can take you on our 39ft Colibri yacht. Want me to share the details?",
    message_es:
      "Momento perfecto! El dia 2 es ideal para nuestro viaje a las Islas del Rosario - agua cristalina, saltar de isla en isla, snorkel. Podemos llevarte en nuestro yate Colibri de 39 pies. Quieres que te comparta los detalles?",
    priority: 9,
  },
  {
    stay_phase: "mid_stay",
    upsell_type: "private_brunch",
    upsell_name: "Village People Bottomless Brunch",
    message_en:
      "How about treating yourself to our famous Village People brunch? Bottomless mimosas, bottomless tapas - it's THE party brunch experience! Perfect way to celebrate your vacation",
    message_es:
      "Que tal darte un gusto con nuestro famoso brunch Village People? Mimosas ilimitadas, tapas ilimitadas - es LA experiencia de brunch de fiesta! Perfecta forma de celebrar tus vacaciones",
    priority: 7,
  },
  {
    stay_phase: "last_full_day",
    upsell_type: "special_dinner",
    upsell_name: "Cartagena Culture Private Dinner",
    message_en:
      "It's your last full day with us! Want to make it special? Our 4-course 'Cartagena Culture' private dinner is unforgettable - mango ceviche, garlic shrimp, slow-braised posta cartagenera, and enyucado with vanilla ice cream. Perfect finale!",
    message_es:
      "Es tu ultimo dia completo con nosotros! Quieres hacerlo especial? Nuestra cena privada de 4 platos 'Cultura de Cartagena' es inolvidable - ceviche de mango, camarones al ajillo, posta cartagenera, y enyucado con helado de vainilla. Final perfecto!",
    priority: 10,
  },
  {
    stay_phase: "departure_day",
    upsell_type: "late_checkout",
    upsell_name: "Late Checkout",
    message_en:
      "Since it's your departure day, would you like late checkout? Enjoy a few more hours by the pool before you go - just let us know and we'll arrange it!",
    message_es:
      "Ya que es tu dia de salida, te gustaria salida tardia? Disfruta unas horas mas junto a la piscina antes de irte - solo avisanos y lo arreglamos!",
    priority: 8,
  },
];

// Get timing-based upsell suggestion for current stay phase
function getTimingBasedUpsell(
  stayContext: GuestStayContext | null,
  language: Language,
  conversationHistory: Message[],
): {
  type: UpsellType;
  name: string;
  message: string;
  trigger_reason: string;
} | null {
  if (
    !stayContext ||
    stayContext.stay_phase === "pre_arrival" ||
    stayContext.stay_phase === "other"
  ) {
    return null;
  }

  // Find matching upsell for current stay phase
  const matchingUpsells = TIMING_UPSELLS.filter(
    (u) => u.stay_phase === stayContext.stay_phase,
  ).sort((a, b) => b.priority - a.priority);

  if (matchingUpsells.length === 0) {
    return null;
  }

  // Check if any of these upsells were already mentioned in conversation
  const allText = conversationHistory
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  for (const upsell of matchingUpsells) {
    const keywords = upsell.upsell_name.toLowerCase().split(" ");
    const alreadyMentioned = keywords.some(
      (kw) => kw.length > 4 && allText.includes(kw),
    );

    if (!alreadyMentioned) {
      return {
        type: upsell.upsell_type as UpsellType,
        name: upsell.upsell_name,
        message: language === "es" ? upsell.message_es : upsell.message_en,
        trigger_reason: `timing_${stayContext.stay_phase}_day_${stayContext.days_into_stay}`,
      };
    }
  }

  return null;
}

// Build enhanced system prompt with stay context
function buildSystemPromptWithStayContext(
  guest: Guest,
  journeyStage: JourneyStage,
  stayContext: GuestStayContext | null,
): string {
  const basePrompt = buildSystemPrompt(guest, journeyStage);

  if (!stayContext) {
    return basePrompt;
  }

  const stayContextSection = `

## GUEST STAY CONTEXT (CRITICAL FOR TIMING)
- Check-in Date: ${stayContext.check_in_date}
- Check-out Date: ${stayContext.check_out_date}
- Total Nights: ${stayContext.total_nights}
- Day of Stay: ${stayContext.days_into_stay || "Not checked in yet"}
- Days Remaining: ${stayContext.days_remaining || "N/A"}
- Stay Phase: ${stayContext.stay_phase}
- Villa: ${stayContext.villa_name || "Not assigned"}

## TIMING-BASED UPSELL GUIDANCE
Based on their stay phase (${stayContext.stay_phase}), naturally weave in relevant suggestions:

${
  stayContext.stay_phase === "arrival_day"
    ? `
- It's their ARRIVAL DAY! Welcome them warmly
- Perfect time to suggest: Sunset Bay Tour (they can catch tonight's sunset!)
- Don't be pushy - just mention it naturally if the conversation allows
`
    : ""
}

${
  stayContext.stay_phase === "day_two"
    ? `
- It's their second day - they're settling in
- Perfect time to suggest: Rosario Islands Day Trip (day 2 is ideal timing)
- They've had a day to relax, now they might want adventure
`
    : ""
}

${
  stayContext.stay_phase === "mid_stay"
    ? `
- They're in the middle of their trip
- Perfect time to suggest: Village People Brunch, nightlife experience
- They know the vibe now and might want to try more
`
    : ""
}

${
  stayContext.stay_phase === "last_full_day"
    ? `
- It's their LAST FULL DAY - make it special!
- Perfect time to suggest: Cartagena Culture Private Dinner (unforgettable finale)
- Create urgency: "last chance to..."
`
    : ""
}

${
  stayContext.stay_phase === "departure_day"
    ? `
- It's checkout day
- Offer: Late checkout if they want more pool time
- Ask about their experience, mention reviews
- Thank them warmly and invite them back
`
    : ""
}

Remember: Don't force upsells. Only suggest when the conversation naturally allows it or when they ask about activities/dining.`;

  return basePrompt + stayContextSection;
}

// ============================================
// EXTENDED BRAIN FUNCTION (with stay context)
// ============================================

export async function generateVillaResponseExtended(
  input: VillaBrainInputExtended,
): Promise<VillaBrainOutputExtended> {
  const {
    guest,
    conversation_history,
    current_message,
    journey_stage,
    stay_context,
  } = input;

  // Detect language from current message
  const languageDetected = detectLanguage(current_message);

  // Check for escalation triggers
  const escalationCheck = checkForEscalation(
    current_message,
    conversation_history,
  );

  // Get timing-based upsell suggestion
  const upsellSuggestion = getTimingBasedUpsell(
    stay_context || null,
    languageDetected,
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
      system: buildSystemPromptWithStayContext(
        guest,
        journey_stage,
        stay_context || null,
      ),
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

    // Detect funnel stage changes from message content
    let funnelStageChange: string | null = null;
    const lowerMessage = current_message.toLowerCase();
    const lowerResponse = responseText.toLowerCase();

    if (
      lowerMessage.includes("available") ||
      lowerMessage.includes("dates") ||
      lowerMessage.includes("disponible")
    ) {
      funnelStageChange = "availability_checked";
    }
    if (
      lowerResponse.includes("cloudbeds") ||
      lowerResponse.includes("booking link")
    ) {
      funnelStageChange = "link_sent";
    }
    if (
      lowerMessage.includes("booked") ||
      lowerMessage.includes("reserved") ||
      lowerMessage.includes("reservé")
    ) {
      funnelStageChange = "booked";
    }

    return {
      response: responseText,
      language_detected: languageDetected,
      blind_spots_to_surface: [],
      should_escalate: escalationCheck.shouldEscalate,
      escalation_reason: escalationCheck.reason,
      suggested_journey_stage: suggestedJourneyStage,
      upsell_suggestion: upsellSuggestion || undefined,
      funnel_stage_change:
        funnelStageChange as VillaBrainOutputExtended["funnel_stage_change"],
    };
  } catch (error) {
    console.error("[VillaBrain] Error generating response:", error);

    // Fallback response based on detected language
    const fallbackMessages: Record<Language, string> = {
      en: "I apologize, but I'm having a moment! Please reach out to our team directly at (+57) 316 055 1387 or WhatsApp and they'll help you right away.",
      es: "Disculpa, estoy teniendo un momento! Por favor contacta a nuestro equipo directamente al (+57) 316 055 1387 o WhatsApp y te ayudaran de inmediato.",
      fr: "Je m'excuse, j'ai un petit probleme! Veuillez contacter notre equipe directement au (+57) 316 055 1387 ou WhatsApp et ils vous aideront immediatement.",
    };

    return {
      response: fallbackMessages[languageDetected],
      language_detected: languageDetected,
      blind_spots_to_surface: [],
      should_escalate: true,
      escalation_reason: "AI response generation failed",
      suggested_journey_stage: null,
      upsell_suggestion: undefined,
      funnel_stage_change: undefined,
    };
  }
}

// ============================================
// FUNNEL STAGE DETECTION HELPERS
// ============================================

export function detectFunnelStageFromMessage(
  message: string,
  currentStage: string,
): string | null {
  const lower = message.toLowerCase();

  // Inquiry -> Qualified (showing real interest)
  if (currentStage === "inquiry") {
    if (
      lower.includes("how many") ||
      lower.includes("price") ||
      lower.includes("cost") ||
      lower.includes("cuanto") ||
      lower.includes("precio") ||
      lower.includes("personas") ||
      lower.includes("people") ||
      lower.includes("group")
    ) {
      return "qualified";
    }
  }

  // Qualified -> Availability Checked
  if (currentStage === "qualified" || currentStage === "inquiry") {
    if (
      lower.includes("available") ||
      lower.includes("disponible") ||
      lower.includes("dates") ||
      lower.includes("fechas") ||
      lower.includes("when") ||
      lower.includes("check-in") ||
      lower.includes("llegada")
    ) {
      return "availability_checked";
    }
  }

  // Any -> Booked
  if (
    lower.includes("booked") ||
    lower.includes("reserved") ||
    lower.includes("reservé") ||
    lower.includes("reserva confirmada") ||
    lower.includes("confirmation")
  ) {
    return "booked";
  }

  // Booked -> Arrived (check-in indicators)
  if (currentStage === "booked") {
    if (
      lower.includes("arrived") ||
      lower.includes("llegamos") ||
      lower.includes("we're here") ||
      lower.includes("estamos aqui") ||
      lower.includes("checked in") ||
      lower.includes("just got")
    ) {
      return "arrived";
    }
  }

  return null;
}
