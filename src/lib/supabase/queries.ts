import { createServerClient } from "./client";
import type {
  Guest,
  Conversation,
  Message,
  Escalation,
  JourneyStage,
  Language,
  MessageRole,
  MessageMetadata,
  GuestPreferences,
  ConversationStatus,
} from "@/types";

// ============================================
// GUEST OPERATIONS
// ============================================

export async function upsertGuest(
  phone: string,
  name?: string,
): Promise<Guest> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("guests")
    .upsert(
      {
        phone,
        name: name || null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "phone",
        ignoreDuplicates: false,
      },
    )
    .select()
    .single();

  if (error) {
    console.error("[upsertGuest]", error);
    throw error;
  }

  return data as Guest;
}

export async function getGuestByPhone(phone: string): Promise<Guest | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .eq("phone", phone)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[getGuestByPhone]", error);
    throw error;
  }

  return data as Guest | null;
}

export async function updateGuestJourneyStage(
  guestId: string,
  stage: JourneyStage,
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("guests")
    .update({
      journey_stage: stage,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId);

  if (error) {
    console.error("[updateGuestJourneyStage]", error);
    throw error;
  }
}

export async function updateGuestLanguage(
  guestId: string,
  language: Language,
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("guests")
    .update({
      language,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId);

  if (error) {
    console.error("[updateGuestLanguage]", error);
    throw error;
  }
}

export async function updateGuestPreferences(
  guestId: string,
  preferences: Partial<GuestPreferences>,
): Promise<void> {
  const supabase = createServerClient();

  // Get current preferences first
  const { data: guest } = await supabase
    .from("guests")
    .select("preferences")
    .eq("id", guestId)
    .single();

  const currentPreferences = (guest?.preferences as GuestPreferences) || {};
  const mergedPreferences = { ...currentPreferences, ...preferences };

  const { error } = await supabase
    .from("guests")
    .update({
      preferences: mergedPreferences,
      updated_at: new Date().toISOString(),
    })
    .eq("id", guestId);

  if (error) {
    console.error("[updateGuestPreferences]", error);
    throw error;
  }
}

// ============================================
// CONVERSATION OPERATIONS
// ============================================

export async function getOrCreateConversation(
  guestId: string,
): Promise<Conversation> {
  const supabase = createServerClient();

  // Try to find active conversation
  const { data: existing } = await supabase
    .from("conversations")
    .select("*")
    .eq("guest_id", guestId)
    .in("status", ["active", "escalated"])
    .order("started_at", { ascending: false })
    .limit(1)
    .single();

  if (existing) {
    return existing as Conversation;
  }

  // Create new conversation
  const { data, error } = await supabase
    .from("conversations")
    .insert({
      guest_id: guestId,
      status: "active",
      started_at: new Date().toISOString(),
      last_message_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[getOrCreateConversation]", error);
    throw error;
  }

  return data as Conversation;
}

export async function updateConversationLastMessage(
  conversationId: string,
): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("conversations")
    .update({
      last_message_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (error) {
    console.error("[updateConversationLastMessage]", error);
    throw error;
  }
}

export async function escalateConversation(
  conversationId: string,
  reason: string,
): Promise<Escalation> {
  const supabase = createServerClient();

  // Update conversation status
  const { error: convError } = await supabase
    .from("conversations")
    .update({
      status: "escalated" as ConversationStatus,
      escalated: true,
      escalated_reason: reason,
    })
    .eq("id", conversationId);

  if (convError) {
    console.error("[escalateConversation] conversation update", convError);
    throw convError;
  }

  // Create escalation record
  const { data, error } = await supabase
    .from("escalations")
    .insert({
      conversation_id: conversationId,
      reason,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[escalateConversation] escalation create", error);
    throw error;
  }

  return data as Escalation;
}

// ============================================
// MESSAGE OPERATIONS
// ============================================

export async function addMessage(
  conversationId: string,
  role: MessageRole,
  content: string,
  metadata: MessageMetadata = {},
): Promise<Message> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("messages")
    .insert({
      conversation_id: conversationId,
      role,
      content,
      metadata,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("[addMessage]", error);
    throw error;
  }

  // Update conversation last message time
  await updateConversationLastMessage(conversationId);

  return data as Message;
}

export async function getConversationHistory(
  conversationId: string,
  limit: number = 10,
): Promise<Message[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[getConversationHistory]", error);
    throw error;
  }

  // Return in chronological order
  return (data as Message[]).reverse();
}

// ============================================
// DASHBOARD OPERATIONS
// ============================================

export async function getAllConversations(
  status?: ConversationStatus,
): Promise<Conversation[]> {
  const supabase = createServerClient();

  let query = supabase
    .from("conversations")
    .select(
      `
      *,
      guest:guests(*),
      messages(*)
    `,
    )
    .order("last_message_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getAllConversations]", error);
    throw error;
  }

  return data as Conversation[];
}

export async function getConversationById(
  id: string,
): Promise<Conversation | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("conversations")
    .select(
      `
      *,
      guest:guests(*),
      messages(*)
    `,
    )
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") {
    console.error("[getConversationById]", error);
    throw error;
  }

  return data as Conversation | null;
}

export async function getPendingEscalations(): Promise<Escalation[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("escalations")
    .select(
      `
      *,
      conversation:conversations(
        *,
        guest:guests(*)
      )
    `,
    )
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[getPendingEscalations]", error);
    throw error;
  }

  return data as Escalation[];
}

export async function resolveEscalation(escalationId: string): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from("escalations")
    .update({
      status: "resolved",
      resolved_at: new Date().toISOString(),
    })
    .eq("id", escalationId);

  if (error) {
    console.error("[resolveEscalation]", error);
    throw error;
  }
}

export async function getDashboardStats() {
  const supabase = createServerClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [activeConvos, pendingEscalations, messagesToday, totalGuests] =
    await Promise.all([
      supabase
        .from("conversations")
        .select("id", { count: "exact" })
        .in("status", ["active", "escalated"]),
      supabase
        .from("escalations")
        .select("id", { count: "exact" })
        .eq("status", "pending"),
      supabase
        .from("messages")
        .select("id", { count: "exact" })
        .gte("created_at", today.toISOString()),
      supabase.from("guests").select("id", { count: "exact" }),
    ]);

  return {
    active_conversations: activeConvos.count || 0,
    pending_escalations: pendingEscalations.count || 0,
    messages_today: messagesToday.count || 0,
    guests_total: totalGuests.count || 0,
    avg_response_time_ms: 0, // Would need to calculate from message metadata
  };
}
