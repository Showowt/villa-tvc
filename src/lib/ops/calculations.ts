// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS INTELLIGENCE v3 — Calculations
// ═══════════════════════════════════════════════════════════════

import type {
  Dish,
  Drink,
  DishCalculation,
  ItemCalculation,
  DayOccupancy,
  ConsumptionItem,
  Upsell,
  UpsellCalculation,
} from "./types";
import { TRANSPORT, CONSUMPTION } from "./data";

/**
 * Calculate P&L for any menu item (dish or drink)
 */
export function calcItem(
  item: Dish | Drink,
  withTransport: boolean = true,
): ItemCalculation {
  const ing = item.ingredients.reduce((s, i) => s + i.cost, 0);
  const trans = withTransport
    ? item.ingredients.reduce((s, i) => s + i.transport, 0)
    : 0;
  const total = ing + trans;
  const margin = item.price - total;
  const pct = Math.round((margin / item.price) * 100);
  const weekly = margin * item.ordersPerWeek;
  return { ing, trans, total, margin, pct, weekly };
}

/**
 * Calculate P&L for a single dish (legacy support)
 */
export function calculateDishPL(
  dish: Dish,
  includeTransport: boolean = true,
): DishCalculation {
  const ingCost = dish.ingredients.reduce((sum, ing) => sum + ing.cost, 0);
  const transCost = dish.ingredients.reduce(
    (sum, ing) => sum + ing.transport,
    0,
  );
  const totalCost = ingCost + (includeTransport ? transCost : 0);
  const margin = dish.price - totalCost;
  const marginPct = Math.round((margin / dish.price) * 100);
  const weeklyProfit = margin * dish.ordersPerWeek;

  return { ingCost, transCost, totalCost, margin, marginPct, weeklyProfit };
}

/**
 * Calculate upsell/commission profit
 */
export function calcUpsell(u: Upsell): UpsellCalculation {
  if (u.isPartner || u.type === "opportunity") {
    const commission = Math.round((u.price * u.commission) / 100);
    return { revenue: u.price, cost: 0, commission, profit: commission };
  }
  return {
    revenue: u.price,
    cost: u.cost,
    commission: 0,
    profit: u.price - u.cost,
  };
}

/**
 * Get frequency multiplier for weekly estimates
 */
export function freqMultiplier(f: string): number {
  if (f.includes("daily")) return 7;
  if (f.includes("potential")) return 0;
  const match = f.match(/(\d+)/);
  return match ? parseInt(match[1]) : 1;
}

/**
 * Calculate total person-nights from occupancy data
 */
export function calculatePersonNights(days: DayOccupancy[]): number {
  return days.reduce((sum, day) => sum + day.guests, 0);
}

/**
 * Calculate transport cost for a purchase window
 */
export function calculateTransportCost(purchaseWindowDays: number): number {
  const tripsNeeded = Math.ceil(purchaseWindowDays / 3);
  return tripsNeeded * (TRANSPORT.boatFuelPerTrip + TRANSPORT.staffTimePerTrip);
}

/**
 * Calculate consumption requirements for a given person-night total
 */
export function calculateConsumption(
  totalPN: number,
  category: string,
): Array<ConsumptionItem & { total: number; cost: number }> {
  const items = CONSUMPTION[category] || [];
  return items.map((item) => ({
    ...item,
    total: Math.ceil(item.perPN * totalPN),
    cost: Math.ceil(item.perPN * totalPN) * item.costPer,
  }));
}

/**
 * Calculate total supply cost for a purchase window
 */
export function calculateTotalSupplyCost(
  totalPN: number,
  transportCost: number,
): number {
  const consumptionCost = Object.values(CONSUMPTION)
    .flat()
    .reduce(
      (sum, item) => sum + Math.ceil(item.perPN * totalPN) * item.costPer,
      0,
    );

  return consumptionCost + transportCost;
}

/**
 * Find peak day from occupancy data
 */
export function findPeakDay(days: DayOccupancy[]): DayOccupancy {
  return days.reduce(
    (max, day) => (day.guests > max.guests ? day : max),
    days[0],
  );
}

/**
 * Generate initial occupancy data for 14 days
 */
export function generateInitialOccupancy(): DayOccupancy[] {
  const today = new Date();
  const days: DayOccupancy[] = [];

  for (let i = 0; i < 14; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    // Simulate varying occupancy
    const base = i < 2 ? 6 : i < 5 ? 12 : i < 8 ? 8 : i < 11 ? 18 : 4;

    days.push({
      date,
      label: date.toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      }),
      shortDay: date.toLocaleDateString("en-US", { weekday: "short" }),
      guests: base,
      checkIns: i === 2 ? 6 : i === 5 ? 4 : i === 8 ? 10 : 0,
      checkOuts: i === 5 ? 4 : i === 8 ? 4 : i === 11 ? 14 : 0,
    });
  }

  return days;
}

/**
 * Calculate weekly totals for all dishes
 */
export function calculateWeeklyTotals(dishes: Dish[]): {
  profit: number;
  transport: number;
} {
  const profit = dishes.reduce((sum, dish) => {
    const calc = calculateDishPL(dish, true);
    return sum + calc.weeklyProfit;
  }, 0);

  const transport = dishes.reduce((sum, dish) => {
    const transCost = dish.ingredients.reduce((s, ing) => s + ing.transport, 0);
    return sum + transCost * dish.ordersPerWeek;
  }, 0);

  return { profit, transport };
}

/**
 * Calculate combined F&B weekly totals
 */
export function calculateFBTotals(
  items: (Dish | Drink)[],
  withTransport: boolean = true,
): {
  totalWeekly: number;
  totalTransport: number;
  totalOrders: number;
} {
  const totalWeekly = items.reduce(
    (s, d) => s + calcItem(d, withTransport).weekly,
    0,
  );
  const totalTransport = items.reduce(
    (s, d) => s + calcItem(d, true).trans * d.ordersPerWeek,
    0,
  );
  const totalOrders = items.reduce((s, d) => s + d.ordersPerWeek, 0);

  return { totalWeekly, totalTransport, totalOrders };
}
