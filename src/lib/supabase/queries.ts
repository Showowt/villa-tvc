import { createServerClient } from "./client";

// Dashboard stats helper - returns shape expected by /dashboard page
export async function getDashboardStats() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Get today's occupancy
  const { data: occupancy } = await supabase
    .from("daily_occupancy")
    .select("guests_count")
    .eq("date", today)
    .single();

  // Get active conversations
  const { count: activeConversations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  // Get pending escalations
  const { count: pendingEscalations } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .eq("status", "escalated");

  // Get today's messages (conversations started today)
  const { count: messagesToday } = await supabase
    .from("conversations")
    .select("*", { count: "exact", head: true })
    .gte("started_at", `${today}T00:00:00`);

  return {
    active_conversations: activeConversations || 0,
    pending_escalations: pendingEscalations || 0,
    messages_today: messagesToday || 0,
    guests_total: occupancy?.guests_count || 0,
    avg_response_time_ms: 0, // Placeholder - would need message timestamps to calculate
  };
}

// Get all ingredients with stock status
export async function getIngredients() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name");
  if (error) throw error;
  return data;
}

// Get dish P&L view
export async function getDishPL() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("dish_pl")
    .select("*")
    .order("weekly_profit", { ascending: false });
  if (error) throw error;
  return data;
}

// Get occupancy for date range
export async function getOccupancy(startDate: string, endDate: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_occupancy")
    .select("*")
    .gte("date", startDate)
    .lte("date", endDate)
    .order("date");
  if (error) throw error;
  return data;
}

// Get checklists for a date
export async function getChecklists(
  date: string,
  status?: "pending" | "in_progress" | "complete" | "approved" | "rejected",
) {
  const supabase = createServerClient();
  let query = supabase
    .from("checklists")
    .select("*, checklist_templates(*)")
    .eq("date", date);
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// Get checklist templates
export async function getChecklistTemplates() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("checklist_templates")
    .select("*")
    .eq("is_active", true)
    .order("department")
    .order("name_es");
  if (error) throw error;
  return data;
}

// Get staff tasks for a user and date
export async function getStaffTasks(userId: string, date: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("daily_tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("date", date)
    .single();
  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Search SOPs for staff bot
export async function searchSOPs(query: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("sop_library")
    .select("*")
    .or(
      `title.ilike.%${query}%,title_es.ilike.%${query}%,content.ilike.%${query}%,content_es.ilike.%${query}%`,
    )
    .eq("is_active", true)
    .limit(5);
  if (error) throw error;
  return data;
}

// Get all services
export async function getServices() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("services")
    .select("*")
    .eq("is_active", true)
    .order("type")
    .order("price", { ascending: false });
  if (error) throw error;
  return data;
}

// Get low stock ingredients
export async function getLowStockIngredients() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("is_active", true);
  if (error) throw error;
  return (data || []).filter(
    (i) =>
      i.min_stock !== null &&
      i.current_stock !== null &&
      i.current_stock < i.min_stock,
  );
}

// Get purchase orders
export async function getPurchaseOrders(status?: string) {
  const supabase = createServerClient();
  let query = supabase.from("purchase_orders").select("*");
  if (status) query = query.eq("status", status);
  const { data, error } = await query.order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}

// ============================================
// GUEST STAY QUERIES (Issue #47)
// ============================================

// Get guest stay context for upsell timing
export async function getGuestStayContext(guestId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_stay_context")
    .select("*")
    .eq("guest_id", guestId)
    .in("status", ["checked_in", "upcoming"])
    .order("check_in_date", { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== "PGRST116") throw error;
  return data;
}

// Get all active guest stays (checked in today)
export async function getActiveGuestStays() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_stay_context")
    .select("*")
    .eq("status", "checked_in")
    .order("check_in_date", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Create or update guest stay
export async function upsertGuestStay(stay: {
  guest_id: string;
  check_in_date: string;
  check_out_date: string;
  villa_name?: string;
  status?: string;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_stays")
    .upsert(stay, { onConflict: "guest_id,check_in_date" })
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update guest stay status
export async function updateGuestStayStatus(
  stayId: string,
  status: "upcoming" | "checked_in" | "checked_out" | "cancelled",
) {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("guest_stays")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", stayId);

  if (error) throw error;
}

// ============================================
// BOOKING FUNNEL QUERIES (Issue #48)
// ============================================

// Advance funnel stage
export async function advanceFunnelStage(params: {
  conversation_id?: string;
  guest_id?: string;
  guest_phone?: string;
  stage: string;
  source?: string;
  metadata?: Record<string, unknown>;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("advance_funnel_stage", {
    p_conversation_id: params.conversation_id || null,
    p_guest_id: params.guest_id || null,
    p_guest_phone: params.guest_phone || null,
    p_new_stage: params.stage,
    p_source: params.source || "whatsapp",
    p_metadata: params.metadata || {},
  });

  if (error) throw error;
  return data;
}

// Get funnel conversion rates
export async function getFunnelConversionRates() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("funnel_conversion_rates")
    .select("*");

  if (error) throw error;
  return data || [];
}

// Get daily funnel stats
export async function getDailyFunnelStats(days: number = 30) {
  const supabase = createServerClient();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const { data, error } = await supabase
    .from("daily_funnel_stats")
    .select("*")
    .gte("date", startDate.toISOString().split("T")[0])
    .order("date", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get funnel summary for a conversation
export async function getConversationFunnelHistory(conversationId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("booking_funnel")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("entered_at", { ascending: true });

  if (error) throw error;
  return data || [];
}

// ============================================
// UPSELL TRACKING QUERIES (Issue #47)
// ============================================

// Log upsell suggestion
export async function logUpsellSuggestion(params: {
  guest_id: string;
  conversation_id?: string;
  upsell_type: string;
  upsell_name: string;
  trigger_reason: string;
  message_content: string;
}) {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("log_upsell_suggestion", {
    p_guest_id: params.guest_id,
    p_conversation_id: params.conversation_id || null,
    p_upsell_type: params.upsell_type,
    p_upsell_name: params.upsell_name,
    p_trigger_reason: params.trigger_reason,
    p_message_content: params.message_content,
  });

  if (error) throw error;
  return data;
}

// Mark upsell as booked
export async function markUpsellBooked(upsellId: string, revenueCop?: number) {
  const supabase = createServerClient();
  const { error } = await supabase.rpc("mark_upsell_booked", {
    p_upsell_id: upsellId,
    p_revenue_cop: revenueCop || null,
  });

  if (error) throw error;
}

// Get upsell performance metrics
export async function getUpsellPerformance() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("upsell_performance")
    .select("*")
    .order("times_suggested", { ascending: false });

  if (error) throw error;
  return data || [];
}

// Get recent upsell suggestions for a guest
export async function getGuestUpsellHistory(guestId: string) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("upsell_suggestions")
    .select("*")
    .eq("guest_id", guestId)
    .order("suggested_at", { ascending: false })
    .limit(10);

  if (error) throw error;
  return data || [];
}

// Check if upsell was already suggested today
export async function wasUpsellSuggestedToday(
  guestId: string,
  upsellType: string,
) {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  const { count, error } = await supabase
    .from("upsell_suggestions")
    .select("*", { count: "exact", head: true })
    .eq("guest_id", guestId)
    .eq("upsell_type", upsellType)
    .gte("suggested_at", `${today}T00:00:00`);

  if (error) throw error;
  return (count || 0) > 0;
}

// ============================================
// COMBINED ANALYTICS QUERIES
// ============================================

// Get funnel + upsell dashboard data
export async function getFunnelDashboardData() {
  const [funnelRates, upsellPerformance, dailyStats] = await Promise.all([
    getFunnelConversionRates(),
    getUpsellPerformance(),
    getDailyFunnelStats(7),
  ]);

  // Calculate totals
  const totalInquiries =
    funnelRates.find((r) => r.stage === "inquiry")?.total_entries || 0;
  const totalBooked =
    funnelRates.find((r) => r.stage === "booked")?.total_entries || 0;
  const overallConversionRate =
    totalInquiries > 0
      ? Math.round((totalBooked / totalInquiries) * 100 * 10) / 10
      : 0;

  const totalUpsellSuggestions = upsellPerformance.reduce(
    (sum, u) => sum + u.times_suggested,
    0,
  );
  const totalUpsellBooked = upsellPerformance.reduce(
    (sum, u) => sum + u.times_booked,
    0,
  );
  const totalUpsellRevenue = upsellPerformance.reduce(
    (sum, u) => sum + u.total_revenue_cop,
    0,
  );
  const upsellConversionRate =
    totalUpsellSuggestions > 0
      ? Math.round((totalUpsellBooked / totalUpsellSuggestions) * 100 * 10) / 10
      : 0;

  return {
    funnel: {
      stages: funnelRates,
      total_inquiries: totalInquiries,
      total_booked: totalBooked,
      overall_conversion_rate: overallConversionRate,
    },
    upsells: {
      performance: upsellPerformance,
      total_suggestions: totalUpsellSuggestions,
      total_booked: totalUpsellBooked,
      total_revenue_cop: totalUpsellRevenue,
      conversion_rate: upsellConversionRate,
    },
    daily_stats: dailyStats,
  };
}
