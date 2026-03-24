// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS INTELLIGENCE — Supabase Data Queries
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

export type DailyOccupancy = Tables<"daily_occupancy">;
export type MenuItem = Tables<"menu_items">;
export type Checklist = Tables<"checklists">;
export type Conversation = Tables<"conversations">;
export type Ingredient = Tables<"ingredients">;

// ─── Occupancy Queries ───
export async function getOccupancyData(days: number = 14) {
  const supabase = createServerClient();
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - 1); // Start from yesterday
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + days);

  const { data, error } = await supabase
    .from("daily_occupancy")
    .select("*")
    .gte("date", startDate.toISOString().split("T")[0])
    .lte("date", endDate.toISOString().split("T")[0])
    .order("date", { ascending: true });

  if (error) {
    console.error("[getOccupancyData]", error);
    return [];
  }
  return data || [];
}

export async function updateOccupancy(
  date: string,
  guestsCount: number,
  checkIns: number = 0,
  checkOuts: number = 0,
) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("daily_occupancy")
    .upsert({
      date,
      guests_count: guestsCount,
      check_ins: checkIns,
      check_outs: checkOuts,
      person_nights: guestsCount,
      consumption_events: guestsCount * 2,
    })
    .select()
    .single();

  if (error) {
    console.error("[updateOccupancy]", error);
    return null;
  }
  return data;
}

// ─── Menu/Food Queries ───
export async function getMenuItems() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("name_es");

  if (error) {
    console.error("[getMenuItems]", error);
    return [];
  }
  return data || [];
}

export async function getDishPL() {
  const supabase = createServerClient();

  // dish_pl is a materialized view that calculates margins
  const { data, error } = await supabase
    .from("dish_pl")
    .select("*")
    .order("weekly_profit", { ascending: false });

  if (error) {
    console.error("[getDishPL]", error);
    // Fallback to menu_items if view doesn't exist
    return getMenuItems();
  }
  return data || [];
}

// ─── Checklist Queries ───
export async function getPendingChecklists() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("checklists")
    .select(
      `
      *,
      assigned_user:users!checklists_assigned_to_fkey(full_name),
      template:checklist_templates(name_es, department)
    `,
    )
    .in("status", ["in_progress", "complete"])
    .neq("status", "approved")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[getPendingChecklists]", error);
    return [];
  }
  return data || [];
}

export async function getChecklistsForApproval() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("checklists")
    .select(
      `
      *,
      assigned_user:users!checklists_assigned_to_fkey(full_name),
      template:checklist_templates(name_es, department, items)
    `,
    )
    .eq("status", "complete")
    .is("approved_at", null)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[getChecklistsForApproval]", error);
    return [];
  }
  return data || [];
}

export async function approveChecklist(
  checklistId: string,
  approverId: string,
) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("checklists")
    .update({
      status: "approved",
      approved_by: approverId,
      approved_at: new Date().toISOString(),
    })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) {
    console.error("[approveChecklist]", error);
    return null;
  }
  return data;
}

export async function rejectChecklist(
  checklistId: string,
  approverId: string,
  reason: string,
) {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("checklists")
    .update({
      status: "rejected",
      approved_by: approverId,
      rejection_reason: reason,
    })
    .eq("id", checklistId)
    .select()
    .single();

  if (error) {
    console.error("[rejectChecklist]", error);
    return null;
  }
  return data;
}

// ─── Conversation/Bot Queries ───
export async function getConversationStats() {
  const supabase = createServerClient();
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);

  const { data, error } = await supabase
    .from("conversations")
    .select("id, created_at, status")
    .gte("created_at", weekAgo.toISOString());

  if (error) {
    console.error("[getConversationStats]", error);
    return { totalThisWeek: 0, resolvedCount: 0, avgPerDay: 0 };
  }

  const totalThisWeek = data?.length || 0;
  const resolvedCount =
    data?.filter((c) => c.status === "resolved").length || 0;
  const avgPerDay = Math.round(totalThisWeek / 7);

  return { totalThisWeek, resolvedCount, avgPerDay };
}

// ─── Inventory Queries ───
export async function getLowStockItems() {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("is_active", true)
    .not("min_stock", "is", null);

  if (error) {
    console.error("[getLowStockItems]", error);
    return [];
  }

  // Filter items where current_stock < min_stock
  return (
    data?.filter(
      (item) =>
        item.min_stock &&
        item.current_stock &&
        item.current_stock < item.min_stock,
    ) || []
  );
}

// ─── Dashboard Stats ───
export async function getDashboardStats() {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Get today's occupancy
  const { data: occupancy } = await supabase
    .from("daily_occupancy")
    .select("guests_count, person_nights")
    .eq("date", today)
    .single();

  // Get pending approvals count
  const { count: pendingApprovals } = await supabase
    .from("checklists")
    .select("*", { count: "exact", head: true })
    .eq("status", "complete")
    .is("approved_at", null);

  // Get low stock count
  const lowStockItems = await getLowStockItems();

  // Get conversation stats
  const conversationStats = await getConversationStats();

  return {
    todayGuests: occupancy?.guests_count || 0,
    todayPersonNights: occupancy?.person_nights || 0,
    pendingApprovals: pendingApprovals || 0,
    lowStockCount: lowStockItems.length,
    staffQuestionsPerDay: conversationStats.avgPerDay,
  };
}
