import useSWR, { SWRConfiguration } from "swr";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

// Cache TTL in milliseconds (5 minutes)
const CACHE_TTL = 5 * 60 * 1000;

// Generic fetcher for Supabase queries
type SupabaseFetcher<T> = () => Promise<T>;

// SWR configuration with stale-while-revalidate
const swrConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  dedupingInterval: CACHE_TTL,
  refreshInterval: 0, // Don't auto-refresh, manually control
  errorRetryCount: 2,
  shouldRetryOnError: true,
};

// Hook for cached ingredients
export function useCachedIngredients(activeOnly = true) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    let query = supabase
      .from("ingredients")
      .select("*")
      .order("category")
      .order("name_es");

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Tables<"ingredients">[];
  };

  return useSWR<Tables<"ingredients">[]>(
    ["ingredients", activeOnly],
    fetcher,
    swrConfig,
  );
}

// Hook for cached menu items
export function useCachedMenuItems(activeOnly = true) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    let query = supabase
      .from("menu_items")
      .select("*")
      .order("category")
      .order("sort_order");

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Tables<"menu_items">[];
  };

  return useSWR<Tables<"menu_items">[]>(
    ["menu_items", activeOnly],
    fetcher,
    swrConfig,
  );
}

// Hook for cached checklist templates
export function useCachedTemplates(department?: string) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    let query = supabase
      .from("checklist_templates")
      .select("*")
      .eq("is_active", true)
      .order("department")
      .order("name_es");

    if (department) {
      query = query.eq("department", department);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Tables<"checklist_templates">[];
  };

  return useSWR<Tables<"checklist_templates">[]>(
    ["templates", department],
    fetcher,
    swrConfig,
  );
}

// Hook for cached supply templates
export function useCachedSupplyTemplates() {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase.from("supply_templates").select("*");

    if (error) throw error;
    return data as Tables<"supply_templates">[];
  };

  return useSWR<Tables<"supply_templates">[]>(
    "supply_templates",
    fetcher,
    swrConfig,
  );
}

// Hook for cached linen inventory
export function useCachedLinenInventory() {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("linen_inventory")
      .select("*")
      .order("item_type")
      .order("item_name");

    if (error) throw error;
    return data as Tables<"linen_inventory">[];
  };

  return useSWR<Tables<"linen_inventory">[]>(
    "linen_inventory",
    fetcher,
    swrConfig,
  );
}

// Hook for cached services (with upsell info)
export function useCachedServices(activeOnly = true) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    let query = supabase
      .from("services")
      .select("*")
      .order("sort_order")
      .order("name");

    if (activeOnly) {
      query = query.eq("is_active", true);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Tables<"services">[];
  };

  return useSWR<Tables<"services">[]>(
    ["services", activeOnly],
    fetcher,
    swrConfig,
  );
}

// Hook for cached training requirements
export function useCachedTrainingRequirements(department?: string) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    let query = supabase
      .from("training_requirements")
      .select("*")
      .eq("is_active", true)
      .order("sort_order");

    if (department) {
      query = query.or(`department.eq.${department},department.eq.all`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as Tables<"training_requirements">[];
  };

  return useSWR<Tables<"training_requirements">[]>(
    ["training_requirements", department],
    fetcher,
    swrConfig,
  );
}

// Hook for user's training status
export function useUserTraining(userId: string) {
  const fetcher = async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("staff_training")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data as Tables<"staff_training">[];
  };

  return useSWR<Tables<"staff_training">[]>(
    userId ? ["user_training", userId] : null,
    fetcher,
    swrConfig,
  );
}

// Manual cache invalidation helper
export function invalidateCache(key: string | string[]) {
  // Import mutate from SWR to manually revalidate
  const { mutate } = useSWR(key);
  if (mutate) {
    mutate();
  }
}

// Helper to calculate days into stay for upsell timing
export function calculateDaysIntoStay(checkInDate: string): number {
  const checkIn = new Date(checkInDate);
  const today = new Date();

  // Set both to start of day for accurate comparison
  checkIn.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Day 1 is check-in day (day 0 in diff becomes day 1)
  return diffDays + 1;
}

// Get relevant upsells based on day of stay
export function getUpsellsForDay(
  services: Tables<"services">[],
  dayOfStay: number,
): Tables<"services">[] {
  return services
    .filter((service) => {
      // Services with matching upsell_day or no specific day (always available)
      const upsellDay = (
        service as Tables<"services"> & { upsell_day?: number }
      ).upsell_day;
      return (
        upsellDay === dayOfStay || (upsellDay === null && service.is_available)
      );
    })
    .sort((a, b) => {
      const aPriority =
        (a as Tables<"services"> & { upsell_priority?: number })
          .upsell_priority || 0;
      const bPriority =
        (b as Tables<"services"> & { upsell_priority?: number })
          .upsell_priority || 0;
      return bPriority - aPriority;
    });
}
