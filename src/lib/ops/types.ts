// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS INTELLIGENCE v3 — Type Definitions
// ═══════════════════════════════════════════════════════════════

export interface Ingredient {
  name: string;
  qty: string;
  cost: number; // COP
  weight?: number; // kg
  transport: number; // COP transport cost
}

export interface Dish {
  id: string;
  name: string;
  price: number;
  category: "Specialties" | "Main" | "Starters";
  ordersPerWeek: number;
  ingredients: Ingredient[];
}

export interface Drink {
  id: string;
  name: string;
  price: number;
  category: "Cocktails" | "Wine" | "Beer" | "Spirits";
  ordersPerWeek: number;
  ingredients: Ingredient[];
}

export interface ItemCalculation {
  ing: number;
  trans: number;
  total: number;
  margin: number;
  pct: number;
  weekly: number;
}

// Legacy support
export interface DishCalculation {
  ingCost: number;
  transCost: number;
  totalCost: number;
  margin: number;
  marginPct: number;
  weeklyProfit: number;
}

export interface ConsumptionItem {
  item: string;
  unit: string;
  perPN: number; // per person-night
  costPer: number; // cost per unit
  emoji: string;
}

export interface DayOccupancy {
  date: Date;
  label: string;
  shortDay: string;
  guests: number;
  checkIns: number;
  checkOuts: number;
}

export interface VillaTask {
  task: string;
  photo: boolean;
}

export interface VillaChecklist {
  bedroom: VillaTask[];
  bathroom: VillaTask[];
  living: VillaTask[];
  patio: VillaTask[];
  final: VillaTask[];
}

export interface BotMessage {
  role: "user" | "bot";
  text: string;
  timestamp?: Date;
}

export interface TransportConfig {
  boatFuelPerTrip: number;
  staffTimePerTrip: number;
  avgTripsPerWeek: number;
  optimalTripsPerWeek: number;
  perKgSurcharge: number;
}

// ═══ Revenue Maximizer Types ═══
export interface Upsell {
  id: string;
  name: string;
  type:
    | "excursion"
    | "boating"
    | "event"
    | "partner"
    | "transport"
    | "opportunity";
  price: number;
  cost: number;
  commission: number; // percentage for partner referrals
  isPartner: boolean;
  partnerName?: string;
  frequency: string;
  emoji: string;
}

export interface UpsellCalculation {
  revenue: number;
  cost: number;
  commission: number;
  profit: number;
}

// ═══ Requirements Map Types ═══
export interface Requirement {
  need: string;
  module: string;
  status: "built" | "new" | "phase2";
  phase: 1 | 2;
}

export interface RequirementCategory {
  cat: string;
  items: Requirement[];
}
