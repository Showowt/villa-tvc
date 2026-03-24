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
