// ============================================
// IN-VILLA MENU PAGE (Issue 67)
// Guest-facing menu accessible via QR code in each villa
// ============================================

import { createServerClient } from "@/lib/supabase/client";
import { Metadata } from "next";
import MenuClient from "./MenuClient";

interface Props {
  params: Promise<{ villaId: string }>;
}

// Villa names for display
const VILLA_NAMES: Record<string, string> = {
  villa1: "Villa 1 - Casa del Mar",
  villa2: "Villa 2 - Casa del Sol",
  villa3: "Villa 3 - Casa del Cielo",
  villa4: "Villa 4 - Casa del Viento",
  villa5: "Villa 5 - Casa del Bosque",
  villa6: "Villa 6 - Casa del Rio",
  villa7: "Villa 7 - Casa Coral",
  villa8: "Villa 8 - Casa Palmera",
  villa9: "Villa 9 - Casa Caracol",
  villa10: "Villa 10 - Casa Arena",
  villa11: "Villa 11 - Casa Estrella",
  common: "Common Area",
  pool: "Pool Area",
  beach: "Beach",
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { villaId } = await params;
  const villaName = VILLA_NAMES[villaId] || `Villa ${villaId}`;
  return {
    title: `Menu | ${villaName} | TVC`,
    description: `Order food and drinks to ${villaName} at Tiny Village Cartagena`,
  };
}

async function getMenuItems() {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("is_active", true)
    .order("category")
    .order("sort_order");

  if (error) {
    console.error("[Menu] Error fetching menu items:", error);
    return [];
  }
  return data || [];
}

async function getActivePromotions() {
  const supabase = createServerClient();

  // Get current time in Cartagena (UTC-5)
  const now = new Date();
  const cartagenaTime = new Date(now.getTime() - 5 * 60 * 60 * 1000);
  const currentTime = cartagenaTime.toTimeString().split(" ")[0];
  const dayOfWeek = cartagenaTime.getDay();
  const today = cartagenaTime.toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("promotions")
    .select("*")
    .eq("is_active", true)
    .or(`valid_from.is.null,valid_from.lte.${today}`)
    .or(`valid_until.is.null,valid_until.gte.${today}`)
    .lte("start_time", currentTime)
    .gte("end_time", currentTime);

  if (error) {
    console.error("[Menu] Error fetching promotions:", error);
    return [];
  }

  // Filter by day of week (PostgreSQL array contains)
  return data?.filter((promo) => promo.days_of_week?.includes(dayOfWeek)) || [];
}

export default async function VillaMenuPage({ params }: Props) {
  const { villaId } = await params;
  const villaName = VILLA_NAMES[villaId] || `Villa ${villaId}`;

  const [menuItems, promotions] = await Promise.all([
    getMenuItems(),
    getActivePromotions(),
  ]);

  // Group menu items by category
  const categories = menuItems.reduce(
    (acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = [];
      }
      acc[item.category].push(item);
      return acc;
    },
    {} as Record<string, typeof menuItems>,
  );

  // Category display order and names
  const categoryOrder = [
    "breakfast",
    "lunch",
    "dinner",
    "snack",
    "cocktail",
    "mocktail",
    "beer",
    "wine",
    "spirit",
    "soft_drink",
  ];

  const categoryNames: Record<string, { en: string; es: string }> = {
    breakfast: { en: "Breakfast", es: "Desayuno" },
    lunch: { en: "Lunch", es: "Almuerzo" },
    dinner: { en: "Dinner", es: "Cena" },
    snack: { en: "Snacks", es: "Snacks" },
    cocktail: { en: "Cocktails", es: "Cocteles" },
    mocktail: { en: "Mocktails", es: "Mocktails" },
    beer: { en: "Beer", es: "Cerveza" },
    wine: { en: "Wine", es: "Vino" },
    spirit: { en: "Spirits", es: "Licores" },
    soft_drink: { en: "Soft Drinks", es: "Refrescos" },
  };

  return (
    <div className="min-h-screen bg-tvc-void">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-tvc-deep/95 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-xl text-white font-bold">
                TVC Menu
              </h1>
              <p className="text-sm text-tvc-turquoise">{villaName}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Delivery to your villa</p>
              <p className="text-xs text-white/60">15-20 min</p>
            </div>
          </div>
        </div>
      </header>

      {/* Active Promotions Banner */}
      {promotions.length > 0 && (
        <div className="bg-tvc-gold/20 border-b border-tvc-gold/30">
          <div className="max-w-lg mx-auto px-4 py-3">
            {promotions.map((promo) => (
              <div key={promo.id} className="flex items-center gap-2">
                <span className="text-tvc-gold">★</span>
                <p className="text-sm text-white">
                  <span className="font-semibold">{promo.name_es}</span>
                  {promo.banner_text_es && ` - ${promo.banner_text_es}`}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Menu Content */}
      <MenuClient
        villaId={villaId}
        villaName={villaName}
        categories={categories}
        categoryOrder={categoryOrder}
        categoryNames={categoryNames}
        promotions={promotions}
      />
    </div>
  );
}
