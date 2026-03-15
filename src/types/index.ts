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
