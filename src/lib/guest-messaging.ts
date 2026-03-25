// ============================================
// GUEST MESSAGING SYSTEM
// Pre-arrival, Mid-stay, Post-checkout Communications
// Issues #13, #14, #15 — Complete Guest Journey Flow
// ============================================

import type { Database } from "@/types/database";

type CommunicationType = Database["public"]["Enums"]["communication_type"];
type Language = "en" | "es" | "fr";

// ============================================
// MESSAGE TEMPLATES (Spanish + English + French)
// ============================================

export interface MessageTemplate {
  type: CommunicationType;
  name: string;
  nameEs: string;
  en: string;
  es: string;
  fr: string;
  variables: string[];
  sendTimeOffsetHours: number;
  sendTimeOfDay: number | null; // Hour of day to send (0-23), null = immediate
}

export const MESSAGE_TEMPLATES: Record<CommunicationType, MessageTemplate> = {
  // ============================================
  // BOOKING CONFIRMATION (Immediate)
  // ============================================
  booking_confirmed: {
    type: "booking_confirmed",
    name: "Booking Confirmation",
    nameEs: "Confirmacion de Reserva",
    en: `Hey {guest_name}! Your TVC reservation is confirmed.

Check-in: {check_in}
Check-out: {check_out}
Villa: {villa_name}
Guests: {guests_count}

We're SO excited to host you on our private island! Keep an eye out for more details as your trip approaches.

Questions? Just reply to this message or call +57 316 055 1387.

See you soon!
- The TVC Team`,

    es: `Hola {guest_name}! Tu reserva en TVC esta confirmada.

Check-in: {check_in}
Check-out: {check_out}
Villa: {villa_name}
Huespedes: {guests_count}

Estamos MUY emocionados de recibirte en nuestra isla privada! Te enviaremos mas detalles a medida que se acerque tu viaje.

Preguntas? Solo responde a este mensaje o llama al +57 316 055 1387.

Nos vemos pronto!
- El Equipo TVC`,

    fr: `Salut {guest_name}! Votre reservation TVC est confirmee.

Check-in: {check_in}
Check-out: {check_out}
Villa: {villa_name}
Invites: {guests_count}

Nous sommes TELLEMENT excites de vous accueillir sur notre ile privee! Restez a l'ecoute pour plus de details a l'approche de votre voyage.

Questions? Repondez simplement a ce message ou appelez +57 316 055 1387.

A bientot!
- L'equipe TVC`,

    variables: [
      "guest_name",
      "check_in",
      "check_out",
      "villa_name",
      "guests_count",
    ],
    sendTimeOffsetHours: 0,
    sendTimeOfDay: null,
  },

  // ============================================
  // 7 DAYS BEFORE: PACKING TIPS + WEATHER
  // ============================================
  pre_arrival_7_days: {
    type: "pre_arrival_7_days",
    name: "7 Days Before - Packing Tips",
    nameEs: "7 Dias Antes - Tips de Empaque",
    en: `Hi {guest_name}! Just 7 days until TVC!

PACKING ESSENTIALS:
- Light, breathable clothes (it's tropical!)
- Reef-safe sunscreen (protecting our coral)
- Bug spray for evenings
- Cash (COP) for tips & local vendors
- Your sense of adventure

WEATHER FORECAST:
{weather_forecast}

PRO TIP: Arrive in Cartagena with Colombian pesos. ATMs at the airport work, but exchange rates at hotels are brutal.

Getting excited? We sure are!
Reply with any questions.`,

    es: `Hola {guest_name}! Solo 7 dias para TVC!

ESENCIALES PARA EMPACAR:
- Ropa ligera y transpirable (es tropical!)
- Protector solar seguro para arrecifes
- Repelente para las noches
- Efectivo (COP) para propinas y vendedores locales
- Tu sentido de aventura

PRONOSTICO DEL TIEMPO:
{weather_forecast}

CONSEJO: Llega a Cartagena con pesos colombianos. Los cajeros del aeropuerto funcionan, pero las tasas de cambio en hoteles son brutales.

Te emociona? A nosotros tambien!
Responde con cualquier pregunta.`,

    fr: `Salut {guest_name}! Plus que 7 jours avant TVC!

ESSENTIELS A EMPORTER:
- Vetements legers et respirants (c'est tropical!)
- Creme solaire sans danger pour les recifs
- Anti-moustique pour les soirees
- Especes (COP) pour pourboires et vendeurs locaux
- Votre sens de l'aventure

PREVISIONS METEO:
{weather_forecast}

ASTUCE: Arrivez a Cartagena avec des pesos colombiens. Les guichets automatiques de l'aeroport fonctionnent, mais les taux de change des hotels sont brutaux.

Excite(e)? Nous aussi!
Repondez avec vos questions.`,

    variables: ["guest_name", "weather_forecast"],
    sendTimeOffsetHours: -168, // 7 days * 24 hours
    sendTimeOfDay: 9, // 9 AM
  },

  // ============================================
  // 1 DAY BEFORE: LOGISTICS
  // ============================================
  pre_arrival_1_day: {
    type: "pre_arrival_1_day",
    name: "1 Day Before - Boat Schedule",
    nameEs: "1 Dia Antes - Horario del Bote",
    en: `{guest_name}, tomorrow is the day!

BOAT SCHEDULE:
We'll pick you up from Muelle Pegasus at {boat_time}.

GETTING TO MUELLE PEGASUS:
From Cartagena Airport: ~40 min by taxi (25-35k COP)
From Walled City: ~15 min by taxi (15-20k COP)

GPS: https://maps.app.goo.gl/TVC_Dock_Location

WHAT TO BRING ON THE BOAT:
- Waterproof bag for phone/electronics
- Sunglasses & hat
- Light layer (it gets breezy!)

We'll have welcome drinks waiting!

Questions? Call/WhatsApp: +57 316 055 1387`,

    es: `{guest_name}, manana es el dia!

HORARIO DEL BOTE:
Te recogemos en Muelle Pegasus a las {boat_time}.

COMO LLEGAR A MUELLE PEGASUS:
Desde Aeropuerto Cartagena: ~40 min en taxi (25-35k COP)
Desde Ciudad Amurallada: ~15 min en taxi (15-20k COP)

GPS: https://maps.app.goo.gl/TVC_Dock_Location

QUE TRAER EN EL BOTE:
- Bolsa impermeable para telefono/electronica
- Gafas de sol y sombrero
- Capa ligera (hace viento!)

Tendremos bebidas de bienvenida esperandote!

Preguntas? Llama/WhatsApp: +57 316 055 1387`,

    fr: `{guest_name}, c'est demain!

HORAIRE DU BATEAU:
Nous vous recuperons au Muelle Pegasus a {boat_time}.

COMMENT ARRIVER AU MUELLE PEGASUS:
Depuis l'aeroport de Cartagena: ~40 min en taxi (25-35k COP)
Depuis la vieille ville: ~15 min en taxi (15-20k COP)

GPS: https://maps.app.goo.gl/TVC_Dock_Location

QUOI APPORTER SUR LE BATEAU:
- Sac etanche pour telephone/electronique
- Lunettes de soleil et chapeau
- Couche legere (ca souffle!)

Des boissons de bienvenue vous attendent!

Questions? Appelez/WhatsApp: +57 316 055 1387`,

    variables: ["guest_name", "boat_time"],
    sendTimeOffsetHours: -24,
    sendTimeOfDay: 9,
  },

  // ============================================
  // DAY OF ARRIVAL: WELCOME + ETA
  // ============================================
  day_of_arrival: {
    type: "day_of_arrival",
    name: "Day of Arrival - Welcome",
    nameEs: "Dia de Llegada - Bienvenida",
    en: `Good morning {guest_name}!

TODAY'S THE DAY!

Your boat leaves from Muelle Pegasus at {boat_time}.
Please arrive 15 minutes early.

The team is prepping your villa right now and we can't wait to see you!

Safe travels,
Team TVC`,

    es: `Buenos dias {guest_name}!

HOY ES EL DIA!

Tu bote sale del Muelle Pegasus a las {boat_time}.
Por favor llega 15 minutos antes.

El equipo esta preparando tu villa en este momento y estamos ansiosos por verte!

Buen viaje,
Equipo TVC`,

    fr: `Bonjour {guest_name}!

C'EST LE JOUR J!

Votre bateau part du Muelle Pegasus a {boat_time}.
Veuillez arriver 15 minutes a l'avance.

L'equipe prepare votre villa en ce moment et nous avons hate de vous voir!

Bon voyage,
Equipe TVC`,

    variables: ["guest_name", "boat_time"],
    sendTimeOffsetHours: 0,
    sendTimeOfDay: 7, // 7 AM
  },

  // ============================================
  // MID-STAY CHECK-IN (Day 2)
  // ============================================
  mid_stay_checkin: {
    type: "mid_stay_checkin",
    name: "Mid-Stay Check-in",
    nameEs: "Check-in de Media Estadia",
    en: `Hey {guest_name}!

Just checking in - how's everything going?

Is there anything we can do to make your stay even better?

- Need extra towels or pillows?
- Want to book an excursion? (Snorkeling, sunset cruise, private chef dinner)
- Restaurant recommendations in Cartagena for when you return?

Just reply and we'll make it happen!

Akil & The TVC Team`,

    es: `Hola {guest_name}!

Solo queria saber - como va todo?

Hay algo que podamos hacer para mejorar tu estadia?

- Necesitas toallas o almohadas extra?
- Quieres reservar una excursion? (Snorkel, crucero al atardecer, cena con chef privado)
- Recomendaciones de restaurantes en Cartagena para cuando regreses?

Solo responde y lo hacemos realidad!

Akil y El Equipo TVC`,

    fr: `Salut {guest_name}!

Je voulais juste savoir - comment ca se passe?

Y a-t-il quelque chose que nous puissions faire pour ameliorer votre sejour?

- Besoin de serviettes ou d'oreillers supplementaires?
- Envie de reserver une excursion? (Plongee, croisiere au coucher du soleil, diner avec chef prive)
- Recommandations de restaurants a Cartagena pour votre retour?

Repondez simplement et nous le ferons!

Akil et L'equipe TVC`,

    variables: ["guest_name"],
    sendTimeOffsetHours: 48, // 2 days after check-in
    sendTimeOfDay: 10, // 10 AM
  },

  // ============================================
  // CHECKOUT DAY: THANK YOU
  // ============================================
  checkout_thank_you: {
    type: "checkout_thank_you",
    name: "Checkout Thank You",
    nameEs: "Gracias por tu Estadia",
    en: `{guest_name}, thank you SO much for staying with us!

We loved having you at TVC.

Your boat back to Cartagena leaves at {boat_time}.
Don't forget to grab breakfast before you go!

Safe travels home.
- The TVC Family`,

    es: `{guest_name}, MUCHAS gracias por quedarte con nosotros!

Nos encanto tenerte en TVC.

Tu bote de regreso a Cartagena sale a las {boat_time}.
No olvides desayunar antes de irte!

Buen viaje de regreso.
- La Familia TVC`,

    fr: `{guest_name}, MERCI beaucoup d'avoir sejourne chez nous!

Nous avons adore vous avoir a TVC.

Votre bateau pour Cartagena part a {boat_time}.
N'oubliez pas de prendre le petit dejeuner avant de partir!

Bon retour chez vous.
- La Famille TVC`,

    variables: ["guest_name", "boat_time"],
    sendTimeOffsetHours: 0, // Day of checkout
    sendTimeOfDay: 7, // 7 AM
  },

  // ============================================
  // 1 DAY AFTER: REVIEW REQUEST
  // ============================================
  post_checkout_photos: {
    type: "post_checkout_photos",
    name: "Post-Checkout - Review Request",
    nameEs: "Post-Checkout - Solicitud de Resena",
    en: `Hey {guest_name}!

Hope you made it home safely!

We'd LOVE to hear about your TVC experience. Would you take 2 minutes to leave us a review?

{review_link}

Your feedback helps other travelers discover our little island paradise!

Thanks again for staying with us.
- Akil & The TVC Team

PS: Tag us on Instagram @tinyvillagecartagena - we love seeing your photos!`,

    es: `Hola {guest_name}!

Esperamos que hayas llegado bien a casa!

Nos ENCANTARIA saber sobre tu experiencia en TVC. Tomarias 2 minutos para dejarnos una resena?

{review_link}

Tu opinion ayuda a otros viajeros a descubrir nuestro pequeno paraiso!

Gracias de nuevo por quedarte con nosotros.
- Akil y El Equipo TVC

PD: Etiquetanos en Instagram @tinyvillagecartagena - nos encanta ver tus fotos!`,

    fr: `Salut {guest_name}!

J'espere que vous etes bien rentre(e)!

Nous ADORERIONS connaitre votre experience TVC. Pourriez-vous prendre 2 minutes pour nous laisser un avis?

{review_link}

Vos commentaires aident d'autres voyageurs a decouvrir notre petit paradis!

Merci encore d'avoir sejourne chez nous.
- Akil et L'equipe TVC

PS: Taguez-nous sur Instagram @tinyvillagecartagena - on adore voir vos photos!`,

    variables: ["guest_name", "review_link"],
    sendTimeOffsetHours: 24, // 1 day after checkout
    sendTimeOfDay: 10,
  },

  // ============================================
  // 30 DAYS AFTER: REBOOKING OFFER
  // ============================================
  post_checkout_rebooking: {
    type: "post_checkout_rebooking",
    name: "30 Days - Rebooking Offer",
    nameEs: "30 Dias - Oferta de Reserva",
    en: `Hey {guest_name}!

It's been about a month since your TVC adventure. Missing the island vibes?

We have some openings coming up, and as a returning guest, you get:

- {loyalty_discount}% off your next stay
- Priority villa selection
- Complimentary sunset cocktails on arrival

Ready to come back?
{rebooking_link}

Or just reply and we'll help you find the perfect dates!

Hope to see you again soon,
- The TVC Team`,

    es: `Hola {guest_name}!

Ha pasado un mes desde tu aventura en TVC. Extranando las vibras de la isla?

Tenemos disponibilidad proxima, y como huesped que regresa, obtienes:

- {loyalty_discount}% de descuento en tu proxima estadia
- Seleccion prioritaria de villa
- Cocteles de atardecer de cortesia a tu llegada

Listo para volver?
{rebooking_link}

O solo responde y te ayudamos a encontrar las fechas perfectas!

Esperamos verte pronto,
- El Equipo TVC`,

    fr: `Salut {guest_name}!

Ca fait environ un mois depuis votre aventure TVC. L'ile vous manque?

Nous avons des disponibilites a venir, et en tant qu'invite de retour, vous obtenez:

- {loyalty_discount}% de reduction sur votre prochain sejour
- Selection prioritaire de villa
- Cocktails au coucher du soleil offerts a votre arrivee

Pret(e) a revenir?
{rebooking_link}

Ou repondez simplement et nous vous aiderons a trouver les dates parfaites!

Esperons vous revoir bientot,
- L'equipe TVC`,

    variables: ["guest_name", "loyalty_discount", "rebooking_link"],
    sendTimeOffsetHours: 720, // 30 days * 24 hours
    sendTimeOfDay: 10,
  },

  // ============================================
  // REFERRAL REQUEST (45 days after)
  // ============================================
  post_checkout_referral: {
    type: "post_checkout_referral",
    name: "45 Days - Referral Request",
    nameEs: "45 Dias - Solicitud de Referido",
    en: `Hey {guest_name}!

Know someone who'd love TVC as much as you did?

Share the island life! When a friend books using your name as a referral:
- They get 10% off their first stay
- You get $50 credit toward your next visit

Just have them mention "{guest_name} referred me" when booking!

{rebooking_link}

Thanks for spreading the word!
- Team TVC`,

    es: `Hola {guest_name}!

Conoces a alguien que amaria TVC tanto como tu?

Comparte la vida de isla! Cuando un amigo reserve mencionando tu nombre:
- Ellos obtienen 10% de descuento en su primera estadia
- Tu obtienes $50 USD de credito para tu proxima visita

Solo diles que mencionen "{guest_name} me refirio" al reservar!

{rebooking_link}

Gracias por correr la voz!
- Equipo TVC`,

    fr: `Salut {guest_name}!

Connaissez-vous quelqu'un qui aimerait TVC autant que vous?

Partagez la vie insulaire! Quand un ami reserve en vous mentionnant:
- Il obtient 10% de reduction sur son premier sejour
- Vous obtenez 50$ de credit pour votre prochaine visite

Dites-leur simplement de mentionner "{guest_name} m'a recommande(e)" lors de la reservation!

{rebooking_link}

Merci de faire passer le mot!
- Equipe TVC`,

    variables: ["guest_name", "rebooking_link"],
    sendTimeOffsetHours: 1080, // 45 days
    sendTimeOfDay: 10,
  },

  // ============================================
  // WELCOME BACK (Returning Guest)
  // ============================================
  welcome_back: {
    type: "welcome_back",
    name: "Welcome Back",
    nameEs: "Bienvenido de Nuevo",
    en: `{guest_name}! WELCOME BACK!

We're thrilled to have you returning to TVC!

Since you've stayed with us before, we've noted your preferences:
{guest_preferences}

Is there anything you'd like us to prepare for your arrival?

See you soon!
- Your TVC Family`,

    es: `{guest_name}! BIENVENIDO DE NUEVO!

Estamos encantados de tenerte de vuelta en TVC!

Como ya te has quedado con nosotros, hemos guardado tus preferencias:
{guest_preferences}

Hay algo que te gustaria que preparemos para tu llegada?

Nos vemos pronto!
- Tu Familia TVC`,

    fr: `{guest_name}! BON RETOUR!

Nous sommes ravis de vous accueillir a nouveau a TVC!

Comme vous avez deja sejourne chez nous, nous avons note vos preferences:
{guest_preferences}

Y a-t-il quelque chose que vous aimeriez que nous preparions pour votre arrivee?

A bientot!
- Votre Famille TVC`,

    variables: ["guest_name", "guest_preferences"],
    sendTimeOffsetHours: -168, // 7 days before
    sendTimeOfDay: 9,
  },

  // ============================================
  // SPECIAL OCCASION
  // ============================================
  special_occasion: {
    type: "special_occasion",
    name: "Special Occasion",
    nameEs: "Ocasion Especial",
    en: `{guest_name}!

We noticed you're celebrating {occasion_type} during your stay!

We'd love to make it extra special. Our team can arrange:
- Champagne & flowers in your villa
- Romantic sunset cruise
- Private beach dinner setup
- Custom cake from our kitchen

Just let us know what you'd like!

- The TVC Team`,

    es: `{guest_name}!

Notamos que estas celebrando {occasion_type} durante tu estadia!

Nos encantaria hacerlo extra especial. Nuestro equipo puede organizar:
- Champan y flores en tu villa
- Crucero romantico al atardecer
- Cena privada en la playa
- Pastel personalizado de nuestra cocina

Solo dinos que te gustaria!

- El Equipo TVC`,

    fr: `{guest_name}!

Nous avons remarque que vous celebrez {occasion_type} pendant votre sejour!

Nous adorerions le rendre extra special. Notre equipe peut organiser:
- Champagne et fleurs dans votre villa
- Croisiere romantique au coucher du soleil
- Diner prive sur la plage
- Gateau personnalise de notre cuisine

Dites-nous simplement ce que vous aimeriez!

- L'equipe TVC`,

    variables: ["guest_name", "occasion_type"],
    sendTimeOffsetHours: -72, // 3 days before
    sendTimeOfDay: 10,
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get template by communication type
 */
export function getTemplate(type: CommunicationType): MessageTemplate {
  const template = MESSAGE_TEMPLATES[type];
  if (!template) {
    throw new Error(`No template found for communication type: ${type}`);
  }
  return template;
}

/**
 * Get message content in the specified language
 */
export function getLocalizedMessage(
  type: CommunicationType,
  language: Language,
): string {
  const template = getTemplate(type);
  switch (language) {
    case "es":
      return template.es;
    case "fr":
      return template.fr;
    default:
      return template.en;
  }
}

/**
 * Replace template variables with actual values
 */
export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | null | undefined>,
): string {
  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = new RegExp(`\\{${key}\\}`, "g");
    result = result.replace(placeholder, String(value ?? ""));
  }

  return result;
}

/**
 * Build complete message with variables
 */
export function buildMessage(
  type: CommunicationType,
  language: Language,
  variables: Record<string, string | number | null | undefined>,
): string {
  const template = getLocalizedMessage(type, language);
  return replaceTemplateVariables(template, variables);
}

/**
 * Calculate scheduled send time based on check-in/check-out dates
 */
export function calculateScheduledTime(
  type: CommunicationType,
  checkIn: Date,
  checkOut: Date,
): Date {
  const template = getTemplate(type);
  let baseDate: Date;

  // Determine base date based on communication type
  if (
    type.startsWith("pre_arrival") ||
    type === "booking_confirmed" ||
    type === "day_of_arrival" ||
    type === "welcome_back" ||
    type === "special_occasion"
  ) {
    baseDate = new Date(checkIn);
  } else if (type === "mid_stay_checkin") {
    // Day 2 of stay
    baseDate = new Date(checkIn);
    baseDate.setHours(baseDate.getHours() + template.sendTimeOffsetHours);
  } else {
    // Post-checkout messages
    baseDate = new Date(checkOut);
    baseDate.setHours(baseDate.getHours() + template.sendTimeOffsetHours);
  }

  // Apply time offset for pre-arrival messages
  if (type.startsWith("pre_arrival") || type === "welcome_back") {
    baseDate.setHours(baseDate.getHours() + template.sendTimeOffsetHours);
  }

  // Set specific time of day if configured
  if (template.sendTimeOfDay !== null) {
    baseDate.setHours(template.sendTimeOfDay, 0, 0, 0);
  }

  return baseDate;
}

/**
 * Get all scheduled communications for a booking
 */
export interface ScheduledCommunication {
  type: CommunicationType;
  scheduledFor: Date;
  template: string;
  language: Language;
  variables: Record<string, string | number | null>;
}

export function getScheduledCommunications(
  checkIn: Date,
  checkOut: Date,
  guestName: string,
  language: Language,
  additionalVariables: Record<string, string | number | null> = {},
): ScheduledCommunication[] {
  const now = new Date();
  const communications: ScheduledCommunication[] = [];

  // Standard booking flow communications
  const standardTypes: CommunicationType[] = [
    "booking_confirmed",
    "pre_arrival_7_days",
    "pre_arrival_1_day",
    "day_of_arrival",
    "mid_stay_checkin",
    "checkout_thank_you",
    "post_checkout_photos",
    "post_checkout_rebooking",
    "post_checkout_referral",
  ];

  for (const type of standardTypes) {
    const scheduledFor = calculateScheduledTime(type, checkIn, checkOut);

    // Only schedule if the time is in the future
    if (scheduledFor > now) {
      const baseVariables: Record<string, string | number | null> = {
        guest_name: guestName,
        check_in: checkIn.toLocaleDateString(),
        check_out: checkOut.toLocaleDateString(),
        ...additionalVariables,
      };

      communications.push({
        type,
        scheduledFor,
        template: getLocalizedMessage(type, language),
        language,
        variables: baseVariables,
      });
    }
  }

  return communications;
}

/**
 * Format weather forecast for message
 */
export function formatWeatherForMessage(
  forecast: Array<{
    date: string;
    temp_max: number;
    temp_min: number;
    description: string;
    description_es: string;
    rain_probability: number;
  }>,
  language: Language,
): string {
  const lines = forecast.slice(0, 3).map((day) => {
    const date = new Date(day.date).toLocaleDateString(
      language === "es" ? "es-CO" : "en-US",
      { weekday: "short", month: "short", day: "numeric" },
    );
    const desc = language === "es" ? day.description_es : day.description;
    const rain =
      day.rain_probability > 30
        ? language === "es"
          ? ` (${day.rain_probability}% lluvia)`
          : ` (${day.rain_probability}% rain)`
        : "";

    return `${date}: ${day.temp_max}C/${day.temp_min}C - ${desc}${rain}`;
  });

  return lines.join("\n");
}

/**
 * Detect guest language from message or reservation
 */
export function detectLanguage(text: string): Language {
  const spanishPatterns =
    /\b(hola|gracias|por favor|buenos|quiero|necesito|puedo|tiene|donde|cuando|como|reserva|precio)\b/i;
  const frenchPatterns =
    /\b(bonjour|merci|s'il vous plait|comment|quand|ou|je veux|reservation|prix)\b/i;

  if (spanishPatterns.test(text)) return "es";
  if (frenchPatterns.test(text)) return "fr";
  return "en";
}

/**
 * Check if communication should be sent based on guest history
 */
export function shouldSendCommunication(
  type: CommunicationType,
  isReturningGuest: boolean,
): boolean {
  // Don't send booking confirmation to returning guests (they get welcome_back instead)
  if (isReturningGuest && type === "booking_confirmed") {
    return false;
  }

  // Don't send rebooking offer too early for returning guests
  if (isReturningGuest && type === "post_checkout_rebooking") {
    // Maybe reduce the wait time for returning guests
    return true;
  }

  return true;
}

/**
 * Get default boat time based on check-in/out
 */
export function getDefaultBoatTime(isCheckIn: boolean): string {
  // Standard boat times
  if (isCheckIn) {
    return "2:00 PM"; // Default check-in boat
  }
  return "11:00 AM"; // Default check-out boat
}

/**
 * Format occasion type for message
 */
export function formatOccasionType(
  type: Database["public"]["Enums"]["occasion_type"],
  language: Language,
): string {
  const translations: Record<
    Database["public"]["Enums"]["occasion_type"],
    { en: string; es: string; fr: string }
  > = {
    birthday: { en: "a birthday", es: "un cumpleanos", fr: "un anniversaire" },
    anniversary: {
      en: "an anniversary",
      es: "un aniversario",
      fr: "un anniversaire de mariage",
    },
    honeymoon: {
      en: "your honeymoon",
      es: "tu luna de miel",
      fr: "votre lune de miel",
    },
    proposal: {
      en: "a special moment",
      es: "un momento especial",
      fr: "un moment special",
    },
    celebration: {
      en: "a celebration",
      es: "una celebracion",
      fr: "une celebration",
    },
    other: {
      en: "something special",
      es: "algo especial",
      fr: "quelque chose de special",
    },
  };

  return translations[type]?.[language] || translations.other[language];
}
