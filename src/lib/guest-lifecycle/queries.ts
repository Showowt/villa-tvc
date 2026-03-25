// ═══════════════════════════════════════════════════════════════
// GUEST LIFECYCLE QUERIES
// Pre-arrival, mid-stay, post-checkout, returning guests,
// special occasions, spending tracker
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase/client";

// Types
export interface GuestCommunication {
  id: string;
  booking_id: string | null;
  reservation_id: string | null;
  communication_type: string;
  status: "scheduled" | "sent" | "delivered" | "failed" | "skipped";
  scheduled_for: string;
  sent_at: string | null;
  message_template: string;
  message_sent: string | null;
  guest_phone: string;
  guest_name: string | null;
  guest_language: string;
  twilio_sid: string | null;
  error_message: string | null;
  response_received: string | null;
  response_at: string | null;
  requires_followup: boolean;
  followup_handled: boolean;
  created_at: string;
}

export interface GuestHistory {
  id: string;
  email: string | null;
  phone: string | null;
  normalized_phone: string | null;
  full_name: string | null;
  preferred_language: string;
  country: string | null;
  dietary_preferences: string[];
  room_preferences: string[];
  interests: string[];
  notes: string | null;
  total_stays: number;
  total_nights: number;
  total_spent: number;
  first_stay_date: string | null;
  last_stay_date: string | null;
  favorite_villa: string | null;
  vip_status: "standard" | "vip" | "vvip";
  is_returning: boolean;
  loyalty_discount_pct: number;
  created_at: string;
}

export interface SpecialOccasion {
  id: string;
  reservation_id: string | null;
  booking_id: string | null;
  villa_id: string | null;
  guest_name: string;
  occasion_type:
    | "birthday"
    | "anniversary"
    | "honeymoon"
    | "proposal"
    | "celebration"
    | "other";
  occasion_date: string | null;
  details: string | null;
  task_created: boolean;
  task_assigned_to: string | null;
  task_completed: boolean;
  task_notes: string | null;
  kitchen_notified: boolean;
  bar_notified: boolean;
  surprise_prepared: boolean;
  surprise_details: string | null;
  created_at: string;
}

export interface GuestSpending {
  villa_id: string | null;
  reservation_id: string | null;
  guest_name: string | null;
  first_order_date: string;
  last_order_date: string;
  total_orders: number;
  food_total: number;
  drinks_total: number;
  grand_total: number;
  total_items: number;
  comp_total: number;
}

// ─────────────────────────────────────────────────────────────────
// GUEST COMMUNICATIONS (Issues 13, 14, 15)
// ─────────────────────────────────────────────────────────────────

// Get scheduled communications for a booking
export async function getScheduledCommunications(
  bookingId: string,
): Promise<GuestCommunication[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_communications")
    .select("*")
    .eq("booking_id", bookingId)
    .order("scheduled_for", { ascending: true });

  if (error) {
    console.error("[getScheduledCommunications]", error);
    return [];
  }
  return (data as GuestCommunication[]) || [];
}

// Get communications pending followup (mid-stay responses)
export async function getPendingFollowups(): Promise<GuestCommunication[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_communications")
    .select("*")
    .eq("requires_followup", true)
    .eq("followup_handled", false)
    .order("response_at", { ascending: false });

  if (error) {
    console.error("[getPendingFollowups]", error);
    return [];
  }
  return (data as GuestCommunication[]) || [];
}

// Mark followup as handled
export async function markFollowupHandled(
  communicationId: string,
  handledBy: string,
): Promise<boolean> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("guest_communications")
    .update({
      followup_handled: true,
      handled_by: handledBy,
    })
    .eq("id", communicationId);

  if (error) {
    console.error("[markFollowupHandled]", error);
    return false;
  }
  return true;
}

// Schedule communications for a booking
export async function scheduleBookingCommunications(
  bookingId: string,
): Promise<number> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("schedule_guest_communications", {
    p_booking_id: bookingId,
  });

  if (error) {
    console.error("[scheduleBookingCommunications]", error);
    return 0;
  }
  return data || 0;
}

// Get communication stats
export async function getCommunicationStats(): Promise<{
  total: number;
  sent: number;
  failed: number;
  pending_followup: number;
}> {
  const supabase = createServerClient();

  const { count: total } = await supabase
    .from("guest_communications")
    .select("*", { count: "exact", head: true });

  const { count: sent } = await supabase
    .from("guest_communications")
    .select("*", { count: "exact", head: true })
    .eq("status", "sent");

  const { count: failed } = await supabase
    .from("guest_communications")
    .select("*", { count: "exact", head: true })
    .eq("status", "failed");

  const { count: pendingFollowup } = await supabase
    .from("guest_communications")
    .select("*", { count: "exact", head: true })
    .eq("requires_followup", true)
    .eq("followup_handled", false);

  return {
    total: total || 0,
    sent: sent || 0,
    failed: failed || 0,
    pending_followup: pendingFollowup || 0,
  };
}

// ─────────────────────────────────────────────────────────────────
// RETURNING GUEST RECOGNITION (Issue 16)
// ─────────────────────────────────────────────────────────────────

// Check if guest is returning
export async function checkReturningGuest(
  email: string | null,
  phone: string | null,
): Promise<GuestHistory | null> {
  if (!email && !phone) return null;

  const supabase = createServerClient();
  const { data, error } = await supabase.rpc("check_returning_guest", {
    p_email: email,
    p_phone: phone,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  // Map RPC result to GuestHistory interface
  const result = data[0];
  if (!result.is_returning) return null;

  // Fetch full guest history
  const { data: guestData } = await supabase
    .from("guest_history")
    .select("*")
    .eq("id", result.guest_id)
    .single();

  return guestData as GuestHistory | null;
}

// Get guest history by ID
export async function getGuestHistory(
  guestId: string,
): Promise<GuestHistory | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_history")
    .select("*")
    .eq("id", guestId)
    .single();

  if (error) {
    console.error("[getGuestHistory]", error);
    return null;
  }
  return data as GuestHistory | null;
}

// Get all VIP guests
export async function getVIPGuests(): Promise<GuestHistory[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_history")
    .select("*")
    .in("vip_status", ["vip", "vvip"])
    .order("total_stays", { ascending: false });

  if (error) {
    console.error("[getVIPGuests]", error);
    return [];
  }
  return (data as GuestHistory[]) || [];
}

// Update guest preferences
export async function updateGuestPreferences(
  guestId: string,
  preferences: {
    dietary_preferences?: string[];
    room_preferences?: string[];
    interests?: string[];
    notes?: string;
  },
): Promise<boolean> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("guest_history")
    .update({
      dietary_preferences: preferences.dietary_preferences,
      room_preferences: preferences.room_preferences,
      interests: preferences.interests,
      notes: preferences.notes,
    })
    .eq("id", guestId);

  if (error) {
    console.error("[updateGuestPreferences]", error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// SPECIAL OCCASIONS (Issue 17)
// ─────────────────────────────────────────────────────────────────

// Get special occasions for a date range
export async function getSpecialOccasions(
  startDate: string,
  endDate: string,
): Promise<SpecialOccasion[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("special_occasions")
    .select("*")
    .gte("occasion_date", startDate)
    .lte("occasion_date", endDate)
    .order("occasion_date", { ascending: true });

  if (error) {
    console.error("[getSpecialOccasions]", error);
    return [];
  }
  return (data as SpecialOccasion[]) || [];
}

// Get today's special occasions
export async function getTodaysSpecialOccasions(): Promise<SpecialOccasion[]> {
  const today = new Date().toISOString().split("T")[0];
  return getSpecialOccasions(today, today);
}

// Get pending special occasion tasks
export async function getPendingOccasionTasks(): Promise<SpecialOccasion[]> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("special_occasions")
    .select("*")
    .eq("task_completed", false)
    .or("kitchen_notified.eq.false,bar_notified.eq.false")
    .order("occasion_date", { ascending: true });

  if (error) {
    console.error("[getPendingOccasionTasks]", error);
    return [];
  }
  return (data as SpecialOccasion[]) || [];
}

// Create special occasion manually
export async function createSpecialOccasion(
  occasion: Partial<SpecialOccasion>,
): Promise<SpecialOccasion | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("special_occasions")
    .insert(occasion)
    .select()
    .single();

  if (error) {
    console.error("[createSpecialOccasion]", error);
    return null;
  }
  return data as SpecialOccasion;
}

// Notify kitchen/bar about occasion
export async function notifyOccasionDepartment(
  occasionId: string,
  department: "kitchen" | "bar",
): Promise<boolean> {
  const supabase = createServerClient();
  const updateField =
    department === "kitchen" ? "kitchen_notified" : "bar_notified";
  const timeField =
    department === "kitchen" ? "kitchen_notified_at" : "bar_notified_at";

  const { error } = await supabase
    .from("special_occasions")
    .update({
      [updateField]: true,
      [timeField]: new Date().toISOString(),
    })
    .eq("id", occasionId);

  if (error) {
    console.error("[notifyOccasionDepartment]", error);
    return false;
  }
  return true;
}

// Mark occasion task as completed
export async function completeOccasionTask(
  occasionId: string,
  notes?: string,
): Promise<boolean> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from("special_occasions")
    .update({
      task_completed: true,
      task_notes: notes,
    })
    .eq("id", occasionId);

  if (error) {
    console.error("[completeOccasionTask]", error);
    return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────────
// GUEST SPENDING TRACKER (Issue 18)
// ─────────────────────────────────────────────────────────────────

// Get spending summary by villa
export async function getVillaSpending(
  villaId: string,
): Promise<GuestSpending | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_spending_summary")
    .select("*")
    .eq("villa_id", villaId)
    .single();

  if (error) {
    console.error("[getVillaSpending]", error);
    return null;
  }
  return data as GuestSpending | null;
}

// Get spending summary by reservation
export async function getReservationSpending(
  reservationId: string,
): Promise<GuestSpending | null> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("guest_spending_summary")
    .select("*")
    .eq("reservation_id", reservationId)
    .single();

  if (error) {
    console.error("[getReservationSpending]", error);
    return null;
  }
  return data as GuestSpending | null;
}

// Get all active villa spending (current guests)
export async function getActiveVillaSpending(): Promise<GuestSpending[]> {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Get currently occupied villas
  const { data: occupiedVillas } = await supabase
    .from("villa_status")
    .select("villa_id")
    .eq("status", "occupied");

  if (!occupiedVillas || occupiedVillas.length === 0) {
    return [];
  }

  const villaIds = occupiedVillas.map((v) => v.villa_id);

  const { data, error } = await supabase
    .from("guest_spending_summary")
    .select("*")
    .in("villa_id", villaIds)
    .gte("last_order_date", today);

  if (error) {
    console.error("[getActiveVillaSpending]", error);
    return [];
  }
  return (data as GuestSpending[]) || [];
}

// Get detailed order log for villa invoice
export async function getVillaOrderLog(villaId: string): Promise<
  {
    id: string;
    menu_item_name: string;
    menu_item_name_es: string;
    category: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    order_date: string;
    order_time: string | null;
    is_comp: boolean;
    notes: string | null;
  }[]
> {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("order_logs")
    .select(
      `
      id,
      quantity,
      unit_price,
      total_price,
      order_date,
      order_time,
      is_comp,
      notes,
      menu_items (
        name,
        name_es,
        category
      )
    `,
    )
    .eq("villa_id", villaId)
    .order("order_date", { ascending: true })
    .order("order_time", { ascending: true });

  if (error) {
    console.error("[getVillaOrderLog]", error);
    return [];
  }

  return (data || []).map((order) => ({
    id: order.id,
    menu_item_name: (order.menu_items as { name: string })?.name || "Unknown",
    menu_item_name_es:
      (order.menu_items as { name_es: string })?.name_es || "Desconocido",
    category: (order.menu_items as { category: string })?.category || "other",
    quantity: order.quantity,
    unit_price: order.unit_price,
    total_price: order.total_price,
    order_date: order.order_date,
    order_time: order.order_time,
    is_comp: order.is_comp,
    notes: order.notes,
  }));
}

// Generate checkout invoice for villa
export async function generateCheckoutInvoice(villaId: string): Promise<{
  villa_id: string;
  guest_name: string | null;
  items: {
    category: string;
    items: {
      name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[];
    subtotal: number;
  }[];
  food_total: number;
  drinks_total: number;
  comp_total: number;
  grand_total: number;
  generated_at: string;
}> {
  const orders = await getVillaOrderLog(villaId);
  const spending = await getVillaSpending(villaId);

  // Group items by category
  const byCategory: Record<
    string,
    {
      name: string;
      quantity: number;
      unit_price: number;
      total: number;
    }[]
  > = {};

  for (const order of orders) {
    if (!byCategory[order.category]) {
      byCategory[order.category] = [];
    }
    byCategory[order.category].push({
      name: order.menu_item_name_es || order.menu_item_name,
      quantity: order.quantity,
      unit_price: order.unit_price,
      total: order.total_price,
    });
  }

  // Calculate subtotals per category
  const items = Object.entries(byCategory).map(([category, categoryItems]) => ({
    category,
    items: categoryItems,
    subtotal: categoryItems.reduce((sum, item) => sum + item.total, 0),
  }));

  return {
    villa_id: villaId,
    guest_name: spending?.guest_name || null,
    items,
    food_total: spending?.food_total || 0,
    drinks_total: spending?.drinks_total || 0,
    comp_total: spending?.comp_total || 0,
    grand_total: spending?.grand_total || 0,
    generated_at: new Date().toISOString(),
  };
}

// ─────────────────────────────────────────────────────────────────
// DASHBOARD AGGREGATIONS
// ─────────────────────────────────────────────────────────────────

// Get guest lifecycle dashboard stats
export async function getGuestLifecycleStats(): Promise<{
  pending_arrivals_today: number;
  mid_stay_responses: number;
  pending_checkouts: number;
  special_occasions_today: number;
  returning_guests_current: number;
  total_vip_guests: number;
}> {
  const supabase = createServerClient();
  const today = new Date().toISOString().split("T")[0];

  // Pending arrivals today
  const { count: pendingArrivals } = await supabase
    .from("villa_bookings")
    .select("*", { count: "exact", head: true })
    .eq("check_in", today)
    .eq("status", "confirmed");

  // Mid-stay responses needing attention
  const { count: midStayResponses } = await supabase
    .from("guest_communications")
    .select("*", { count: "exact", head: true })
    .eq("communication_type", "mid_stay_checkin")
    .eq("requires_followup", true)
    .eq("followup_handled", false);

  // Checkouts today
  const { count: checkoutsToday } = await supabase
    .from("villa_bookings")
    .select("*", { count: "exact", head: true })
    .eq("check_out", today)
    .eq("status", "checked_in");

  // Special occasions today
  const { count: specialOccasions } = await supabase
    .from("special_occasions")
    .select("*", { count: "exact", head: true })
    .eq("occasion_date", today);

  // Returning guests currently staying
  const { data: currentBookings } = await supabase
    .from("villa_bookings")
    .select("guest_email, guest_phone")
    .eq("status", "checked_in");

  let returningCount = 0;
  if (currentBookings) {
    for (const booking of currentBookings) {
      const guest = await checkReturningGuest(
        booking.guest_email,
        booking.guest_phone,
      );
      if (guest) returningCount++;
    }
  }

  // Total VIP guests
  const { count: vipGuests } = await supabase
    .from("guest_history")
    .select("*", { count: "exact", head: true })
    .in("vip_status", ["vip", "vvip"]);

  return {
    pending_arrivals_today: pendingArrivals || 0,
    mid_stay_responses: midStayResponses || 0,
    pending_checkouts: checkoutsToday || 0,
    special_occasions_today: specialOccasions || 0,
    returning_guests_current: returningCount,
    total_vip_guests: vipGuests || 0,
  };
}
