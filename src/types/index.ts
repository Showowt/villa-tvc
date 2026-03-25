// ============================================
// VILLA TVC - Type Definitions
// ============================================

// Guest journey stages
export type JourneyStage =
  | "discovery" // Just browsing, considering
  | "booked" // Has reservation
  | "pre_arrival" // Within 7 days of check-in
  | "on_property" // Currently staying
  | "departed"; // Post-stay

// Supported languages
export type Language = "en" | "es" | "fr";

// Message roles
export type MessageRole = "guest" | "villa" | "staff";

// Conversation status
export type ConversationStatus = "active" | "escalated" | "resolved" | "closed";

// Escalation status
export type EscalationStatus = "pending" | "assigned" | "resolved";

// ============================================
// Database Types
// ============================================

export interface Guest {
  id: string;
  phone: string;
  name: string | null;
  email: string | null;
  language: Language;
  journey_stage: JourneyStage;
  preferences: GuestPreferences;
  created_at: string;
  updated_at: string;
}

export interface GuestPreferences {
  dietary?: string[];
  room_preference?: string;
  interests?: string[];
  arrival_date?: string;
  departure_date?: string;
  group_size?: number;
  special_requests?: string[];
}

export interface Conversation {
  id: string;
  guest_id: string;
  status: ConversationStatus;
  escalated: boolean;
  escalated_reason: string | null;
  started_at: string;
  last_message_at: string;
  // Joined fields
  guest?: Guest;
  messages?: Message[];
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  metadata: MessageMetadata;
  created_at: string;
}

export interface MessageMetadata {
  language_detected?: Language;
  blind_spots_triggered?: string[];
  escalation_check?: boolean;
  response_time_ms?: number;
  twilio_sid?: string;
}

export interface KnowledgeBase {
  id: string;
  category: string;
  subcategory: string | null;
  question: string;
  answer: string;
  keywords: string[];
  language: Language;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface BlindSpot {
  id: string;
  trigger_stage: JourneyStage;
  trigger_keywords: string[];
  condition: BlindSpotCondition | null;
  message_en: string;
  message_es: string;
  message_fr: string;
  priority: number;
  active: boolean;
}

export interface BlindSpotCondition {
  has_not_mentioned?: string[];
  days_until_arrival?: number;
  first_message?: boolean;
}

export interface Escalation {
  id: string;
  conversation_id: string;
  reason: string;
  status: EscalationStatus;
  assigned_to: string | null;
  resolved_at: string | null;
  created_at: string;
  // Joined fields
  conversation?: Conversation;
}

// ============================================
// API Types
// ============================================

export interface TwilioWebhookPayload {
  From: string;
  Body: string;
  MessageSid: string;
  NumMedia: string;
  MediaUrl0?: string;
  MediaContentType0?: string;
  ProfileName?: string;
}

export interface VillaBrainInput {
  guest: Guest;
  conversation_history: Message[];
  current_message: string;
  journey_stage: JourneyStage;
}

export interface VillaBrainOutput {
  response: string;
  language_detected: Language;
  blind_spots_to_surface: string[];
  should_escalate: boolean;
  escalation_reason: string | null;
  suggested_journey_stage: JourneyStage | null;
}

export interface BlindSpotCheck {
  guest: Guest;
  conversation_history: Message[];
  current_message: string;
}

export interface EscalationTrigger {
  should_escalate: boolean;
  reason: string | null;
  priority: "low" | "medium" | "high" | "critical";
}

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  active_conversations: number;
  pending_escalations: number;
  messages_today: number;
  guests_total: number;
  avg_response_time_ms: number;
}

export interface ConversationListItem {
  id: string;
  guest_name: string | null;
  guest_phone: string;
  last_message: string;
  last_message_at: string;
  status: ConversationStatus;
  escalated: boolean;
}

export interface AnalyticsData {
  conversations_by_day: { date: string; count: number }[];
  messages_by_hour: { hour: number; count: number }[];
  top_questions: { question: string; count: number }[];
  language_distribution: { language: Language; count: number }[];
  journey_stage_distribution: { stage: JourneyStage; count: number }[];
  escalation_reasons: { reason: string; count: number }[];
}

// ============================================
// Guest Stay & Upsell Types (Issues #47, #48)
// ============================================

export type GuestStayStatus =
  | "upcoming"
  | "checked_in"
  | "checked_out"
  | "cancelled";

export type StayPhase =
  | "pre_arrival"
  | "arrival_day"
  | "day_two"
  | "mid_stay"
  | "last_full_day"
  | "departure_day"
  | "other";

export interface GuestStay {
  id: string;
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  villa_id: string | null;
  villa_name: string | null;
  total_nights: number;
  status: GuestStayStatus;
  created_at: string;
  updated_at: string;
}

export interface GuestStayContext {
  stay_id: string;
  guest_id: string;
  guest_phone: string;
  guest_name: string | null;
  check_in_date: string;
  check_out_date: string;
  total_nights: number;
  villa_name: string | null;
  status: GuestStayStatus;
  days_into_stay: number | null;
  days_remaining: number | null;
  stay_phase: StayPhase;
}

// ============================================
// Booking Funnel Types
// ============================================

export type FunnelStage =
  | "inquiry"
  | "qualified"
  | "availability_checked"
  | "link_sent"
  | "booked"
  | "arrived"
  | "completed";

export interface BookingFunnel {
  id: string;
  conversation_id: string | null;
  guest_id: string | null;
  guest_phone: string | null;
  stage: FunnelStage;
  previous_stage: FunnelStage | null;
  entered_at: string;
  converted: boolean;
  conversion_time_hours: number | null;
  source: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface FunnelConversionRate {
  stage: FunnelStage;
  total_entries: number;
  converted_to_next: number;
  conversion_rate_pct: number;
  avg_hours_to_convert: number;
}

export interface DailyFunnelStats {
  date: string;
  stage: FunnelStage;
  entries: number;
  conversions: number;
}

// ============================================
// Upsell Tracking Types
// ============================================

export type UpsellType =
  | "sunset_tour"
  | "islands_excursion"
  | "special_dinner"
  | "private_brunch"
  | "village_takeover_upgrade"
  | "spa_treatment"
  | "boat_upgrade"
  | "nightlife_experience"
  | "bottle_service"
  | "late_checkout"
  | "other";

export interface UpsellSuggestion {
  id: string;
  guest_id: string;
  guest_stay_id: string | null;
  conversation_id: string | null;
  upsell_type: UpsellType;
  upsell_name: string;
  suggested_at: string;
  day_of_stay: number | null;
  trigger_reason: string | null;
  message_content: string | null;
  booked: boolean;
  booked_at: string | null;
  revenue_cop: number | null;
  created_at: string;
}

export interface UpsellPerformance {
  upsell_type: UpsellType;
  upsell_name: string;
  times_suggested: number;
  times_booked: number;
  conversion_rate_pct: number;
  total_revenue_cop: number;
  avg_day_suggested: number;
}

// ============================================
// Extended Brain Types (with stay context)
// ============================================

export interface VillaBrainInputExtended extends VillaBrainInput {
  stay_context?: GuestStayContext;
}

export interface VillaBrainOutputExtended extends VillaBrainOutput {
  upsell_suggestion?: {
    type: UpsellType;
    name: string;
    message: string;
    trigger_reason: string;
  };
  funnel_stage_change?: FunnelStage;
}

// ============================================
// Timing-Based Upsell Configuration
// ============================================

export interface TimingBasedUpsell {
  stay_phase: StayPhase;
  upsell_type: UpsellType;
  upsell_name: string;
  message_en: string;
  message_es: string;
  priority: number;
}

// ============================================
// Daily Metrics Types (Issues #33, #34)
// ============================================

export interface DailyMetric {
  id: string;
  date: string;
  room_revenue: number;
  food_revenue: number;
  bar_revenue: number;
  service_revenue: number;
  total_revenue: number;
  rooms_occupied: number;
  rooms_available: number;
  occupancy_pct: number;
  person_nights: number;
  guests_count: number;
  revpar: number;
  adr: number;
  goppar: number;
  orders_count: number;
  avg_check: number;
  service_bookings: number;
  snapshot_type: "auto" | "manual";
  created_at: string;
  updated_at: string;
}

export interface MetricComparison {
  metric: string;
  current: number;
  previous: number;
  change: number;
  changePct: number;
  direction: "up" | "down" | "flat";
}

export interface MetricsOverview {
  period: {
    start: string;
    end: string;
    days: number;
  };
  totals: {
    total_revenue: number;
    room_revenue: number;
    food_revenue: number;
    bar_revenue: number;
    service_revenue: number;
    orders_count: number;
    service_bookings: number;
  };
  averages: {
    occupancy_pct: number;
    revpar: number;
    adr: number;
    avg_check: number;
    daily_revenue: number;
  };
  comparison: MetricComparison[];
  daily: DailyMetric[];
}

export interface TrendPoint {
  date: string;
  value: number;
  label?: string;
}

export interface MetricsTrend {
  metric: string;
  data: TrendPoint[];
  average: number;
  min: number;
  max: number;
  trend: "up" | "down" | "flat";
}

export const TIMING_BASED_UPSELLS: TimingBasedUpsell[] = [
  {
    stay_phase: "arrival_day",
    upsell_type: "sunset_tour",
    upsell_name: "Sunset Bay Tour",
    message_en:
      "Welcome to TVC! Since you just arrived, would you be interested in catching tonight's sunset from the water? Our sunset cruise is magical - golden hour views of Cartagena's skyline with cocktails! 🌅",
    message_es:
      "¡Bienvenido a TVC! Ya que acabas de llegar, ¿te interesaría ver el atardecer de esta noche desde el agua? Nuestro crucero al atardecer es mágico - vistas de la hora dorada del skyline de Cartagena con cócteles! 🌅",
    priority: 10,
  },
  {
    stay_phase: "day_two",
    upsell_type: "islands_excursion",
    upsell_name: "Rosario Islands Day Trip",
    message_en:
      "Perfect timing! Day 2 is ideal for our Rosario Islands trip - crystal clear water, island hopping, snorkeling. We can take you on our 39ft Colibri yacht. Want me to share the details?",
    message_es:
      "¡Momento perfecto! El día 2 es ideal para nuestro viaje a las Islas del Rosario - agua cristalina, saltar de isla en isla, snorkel. Podemos llevarte en nuestro yate Colibri de 39 pies. ¿Quieres que te comparta los detalles?",
    priority: 9,
  },
  {
    stay_phase: "mid_stay",
    upsell_type: "private_brunch",
    upsell_name: "Village People Bottomless Brunch",
    message_en:
      "How about treating yourself to our famous Village People brunch? Bottomless mimosas, bottomless tapas - it's THE party brunch experience! Perfect way to celebrate your vacation 🥂",
    message_es:
      "¿Qué tal darte un gusto con nuestro famoso brunch Village People? Mimosas ilimitadas, tapas ilimitadas - ¡es LA experiencia de brunch de fiesta! Perfecta forma de celebrar tus vacaciones 🥂",
    priority: 7,
  },
  {
    stay_phase: "last_full_day",
    upsell_type: "special_dinner",
    upsell_name: "Cartagena Culture Private Dinner",
    message_en:
      "It's your last full day with us! Want to make it special? Our 4-course 'Cartagena Culture' private dinner is unforgettable - mango ceviche, garlic shrimp, slow-braised posta cartagenera, and enyucado with vanilla ice cream. Perfect finale! ✨",
    message_es:
      "¡Es tu último día completo con nosotros! ¿Quieres hacerlo especial? Nuestra cena privada de 4 platos 'Cultura de Cartagena' es inolvidable - ceviche de mango, camarones al ajillo, posta cartagenera, y enyucado con helado de vainilla. ¡Final perfecto! ✨",
    priority: 10,
  },
  {
    stay_phase: "departure_day",
    upsell_type: "late_checkout",
    upsell_name: "Late Checkout",
    message_en:
      "Since it's your departure day, would you like late checkout? Enjoy a few more hours by the pool before you go - just let us know and we'll arrange it!",
    message_es:
      "Ya que es tu día de salida, ¿te gustaría salida tardía? Disfruta unas horas más junto a la piscina antes de irte - ¡solo avísanos y lo arreglamos!",
    priority: 8,
  },
];
