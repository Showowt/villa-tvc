// ============================================
// FINANCIAL TRACKING UTILITIES
// Issues: 32, 33, 34, 35, 45, 69
// ============================================

import * as XLSX from "xlsx";

// ============================================
// TYPES
// ============================================

export interface ReceiptItem {
  ingredient_id: string;
  ingredient_name: string;
  estimated_qty: number;
  estimated_cost: number;
  actual_qty: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
}

export interface DailyMetrics {
  id: string;
  date: string;
  total_villas: number;
  occupied_villas: number;
  occupancy_pct: number;
  total_guests: number;
  room_revenue: number;
  fb_revenue: number;
  service_revenue: number;
  total_revenue: number;
  revpar: number;
  adr: number;
  food_cost: number;
  transport_cost: number;
  labor_cost: number;
  total_cost: number;
  gross_margin: number;
  gross_margin_pct: number;
  orders_count: number;
  top_dishes: { name: string; quantity: number; revenue: number }[];
  maintenance_issues: number;
  checklists_completed: number;
}

export interface RevPARData {
  date: string;
  room_revenue: number;
  available_rooms: number;
  occupied_rooms: number;
  revpar: number;
  adr: number;
}

export interface HistoricalComparison {
  current: number;
  previous: number;
  change: number;
  change_pct: number;
  trend: "up" | "down" | "flat";
}

export interface DepositLog {
  id: string;
  booking_id: string | null;
  reservation_id: string | null;
  amount: number;
  currency: string;
  date_paid: string;
  payment_method: string;
  reference_number: string | null;
  status: "received" | "applied" | "refunded" | "disputed";
  applied_to_invoice: boolean;
  applied_at: string | null;
  notes: string | null;
}

export interface WeeklyReport {
  id: string;
  week_start: string;
  week_end: string;
  total_revenue: number;
  room_revenue: number;
  fb_revenue: number;
  service_revenue: number;
  avg_occupancy_pct: number;
  total_guest_nights: number;
  total_bookings: number;
  weekly_revpar: number;
  weekly_adr: number;
  top_dishes: { name: string; quantity: number; revenue: number }[];
  total_orders: number;
  fb_margin_pct: number;
  staff_leaderboard: {
    name: string;
    department: string;
    points: number;
    qc_score: number;
  }[];
  checklists_completed: number;
  avg_qc_score: number;
  maintenance_issues_opened: number;
  maintenance_issues_closed: number;
  maintenance_pending: number;
  vs_last_week: Record<string, HistoricalComparison>;
  vs_last_month: Record<string, HistoricalComparison>;
}

// ============================================
// REVPAR CALCULATIONS
// ============================================

export function calculateRevPAR(
  totalRoomRevenue: number,
  availableRoomNights: number,
): number {
  if (availableRoomNights === 0) return 0;
  return totalRoomRevenue / availableRoomNights;
}

export function calculateADR(
  totalRoomRevenue: number,
  occupiedRoomNights: number,
): number {
  if (occupiedRoomNights === 0) return 0;
  return totalRoomRevenue / occupiedRoomNights;
}

export function calculateOccupancyRate(
  occupiedRoomNights: number,
  availableRoomNights: number,
): number {
  if (availableRoomNights === 0) return 0;
  return (occupiedRoomNights / availableRoomNights) * 100;
}

// ============================================
// HISTORICAL COMPARISON
// ============================================

export function calculateComparison(
  current: number,
  previous: number,
): HistoricalComparison {
  const change = current - previous;
  const change_pct =
    previous !== 0 ? (change / previous) * 100 : current > 0 ? 100 : 0;
  const trend: "up" | "down" | "flat" =
    change > 0 ? "up" : change < 0 ? "down" : "flat";

  return { current, previous, change, change_pct, trend };
}

export function getDateRange(period: "week" | "month"): {
  start: Date;
  end: Date;
} {
  const end = new Date();
  const start = new Date();

  if (period === "week") {
    start.setDate(end.getDate() - 7);
  } else {
    start.setMonth(end.getMonth() - 1);
  }

  return { start, end };
}

export function getPreviousDateRange(period: "week" | "month"): {
  start: Date;
  end: Date;
} {
  const { start: currentStart, end: currentEnd } = getDateRange(period);
  const duration = currentEnd.getTime() - currentStart.getTime();

  return {
    start: new Date(currentStart.getTime() - duration),
    end: new Date(currentEnd.getTime() - duration),
  };
}

// ============================================
// COST VARIANCE CALCULATIONS (Issue 32)
// ============================================

export function calculateCostVariance(
  estimatedCost: number,
  actualCost: number,
): { variance: number; variance_pct: number } {
  const variance = actualCost - estimatedCost;
  const variance_pct =
    estimatedCost !== 0
      ? (variance / estimatedCost) * 100
      : actualCost > 0
        ? 100
        : 0;

  return { variance, variance_pct };
}

export function processReceiptItems(
  estimatedItems: {
    ingredient_id: string;
    name: string;
    qty: number;
    cost: number;
  }[],
  actualItems: { ingredient_id: string; qty: number; cost: number }[],
): ReceiptItem[] {
  const actualMap = new Map(
    actualItems.map((item) => [item.ingredient_id, item]),
  );

  return estimatedItems.map((estimated) => {
    const actual = actualMap.get(estimated.ingredient_id) || {
      qty: 0,
      cost: 0,
    };
    const { variance, variance_pct } = calculateCostVariance(
      estimated.cost,
      actual.cost,
    );

    return {
      ingredient_id: estimated.ingredient_id,
      ingredient_name: estimated.name,
      estimated_qty: estimated.qty,
      estimated_cost: estimated.cost,
      actual_qty: actual.qty,
      actual_cost: actual.cost,
      variance,
      variance_pct,
    };
  });
}

// ============================================
// EXCEL EXPORT (Issue 35)
// ============================================

export interface ExportColumn<T> {
  header: string;
  key: keyof T;
  format?: (value: unknown) => string | number;
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExportColumn<T>[],
  filename: string,
  sheetName: string = "Data",
): void {
  // Transform data based on columns
  const exportData = data.map((row) => {
    const exportRow: Record<string, unknown> = {};
    columns.forEach((col) => {
      const value = row[col.key];
      exportRow[col.header] = col.format ? col.format(value) : value;
    });
    return exportRow;
  });

  // Create workbook and worksheet
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(exportData);

  // Auto-size columns
  const colWidths = columns.map((col) => ({
    wch:
      Math.max(
        col.header.length,
        ...data.map((row) => {
          const value = col.format ? col.format(row[col.key]) : row[col.key];
          return String(value).length;
        }),
      ) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportOrderLogs(
  orders: {
    id: string;
    order_date: string;
    menu_item_name: string;
    quantity: number;
    unit_price: number;
    total_price: number;
    guest_name?: string;
    served_by_name?: string;
  }[],
  dateRange: { start: string; end: string },
): void {
  const columns: ExportColumn<(typeof orders)[0]>[] = [
    { header: "Order ID", key: "id" },
    { header: "Date", key: "order_date" },
    { header: "Item", key: "menu_item_name" },
    { header: "Quantity", key: "quantity" },
    {
      header: "Unit Price",
      key: "unit_price",
      format: (v) => `$${Number(v).toLocaleString()}`,
    },
    {
      header: "Total",
      key: "total_price",
      format: (v) => `$${Number(v).toLocaleString()}`,
    },
    { header: "Guest", key: "guest_name" },
    { header: "Served By", key: "served_by_name" },
  ];

  exportToExcel(
    orders,
    columns,
    `orders_${dateRange.start}_to_${dateRange.end}`,
    "Orders",
  );
}

export function exportInventoryLogs(
  logs: {
    id: string;
    counted_at: string;
    ingredient_name: string;
    previous_quantity: number;
    quantity_counted: number;
    variance: number;
    counted_by_name: string;
    notes?: string;
  }[],
): void {
  const columns: ExportColumn<(typeof logs)[0]>[] = [
    {
      header: "Date",
      key: "counted_at",
      format: (v) => new Date(String(v)).toLocaleDateString(),
    },
    { header: "Ingredient", key: "ingredient_name" },
    { header: "Previous Qty", key: "previous_quantity" },
    { header: "Counted Qty", key: "quantity_counted" },
    { header: "Variance", key: "variance" },
    { header: "Counted By", key: "counted_by_name" },
    { header: "Notes", key: "notes" },
  ];

  exportToExcel(
    logs,
    columns,
    `inventory_logs_${new Date().toISOString().split("T")[0]}`,
    "Inventory",
  );
}

export function exportPurchaseOrders(
  orders: {
    id: string;
    order_number: string;
    order_date: string;
    status: string;
    subtotal: number;
    transport_cost: number;
    total_cost: number;
    actual_total_cost?: number;
    cost_variance?: number;
  }[],
): void {
  const columns: ExportColumn<(typeof orders)[0]>[] = [
    { header: "Order #", key: "order_number" },
    { header: "Date", key: "order_date" },
    { header: "Status", key: "status" },
    { header: "Subtotal", key: "subtotal", format: (v) => Number(v || 0) },
    {
      header: "Transport",
      key: "transport_cost",
      format: (v) => Number(v || 0),
    },
    { header: "Est. Total", key: "total_cost", format: (v) => Number(v || 0) },
    {
      header: "Actual Total",
      key: "actual_total_cost",
      format: (v) => Number(v || 0),
    },
    { header: "Variance", key: "cost_variance", format: (v) => Number(v || 0) },
  ];

  exportToExcel(
    orders,
    columns,
    `purchase_orders_${new Date().toISOString().split("T")[0]}`,
    "Purchase Orders",
  );
}

export function exportServiceBookings(
  bookings: {
    id: string;
    date: string;
    service_name: string;
    guest_name: string;
    quantity: number;
    unit_price: number;
    total_revenue: number;
    status: string;
  }[],
): void {
  const columns: ExportColumn<(typeof bookings)[0]>[] = [
    { header: "Date", key: "date" },
    { header: "Service", key: "service_name" },
    { header: "Guest", key: "guest_name" },
    { header: "Quantity", key: "quantity" },
    { header: "Unit Price", key: "unit_price", format: (v) => Number(v || 0) },
    { header: "Total", key: "total_revenue", format: (v) => Number(v || 0) },
    { header: "Status", key: "status" },
  ];

  exportToExcel(
    bookings,
    columns,
    `service_bookings_${new Date().toISOString().split("T")[0]}`,
    "Services",
  );
}

// ============================================
// WEEKLY REPORT GENERATION (Issue 69)
// ============================================

export function getWeekBounds(date: Date = new Date()): {
  start: Date;
  end: Date;
} {
  const start = new Date(date);
  const dayOfWeek = start.getDay();
  // Start from last Sunday
  start.setDate(start.getDate() - dayOfWeek - 7);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);

  return { start, end };
}

export function formatWeeklyReportMessage(report: WeeklyReport): string {
  const formatMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const formatPct = (n: number) => `${n.toFixed(1)}%`;

  const topDishesText = report.top_dishes
    .slice(0, 5)
    .map((d, i) => `${i + 1}. ${d.name} (${d.quantity}x)`)
    .join("\n");

  const leaderText = report.staff_leaderboard
    .slice(0, 3)
    .map((s, i) => `${i + 1}. ${s.name} - ${s.points} pts`)
    .join("\n");

  return `
*TVC Weekly Report*
${report.week_start} - ${report.week_end}

*Revenue*
Total: ${formatMoney(report.total_revenue)}
- Rooms: ${formatMoney(report.room_revenue)}
- F&B: ${formatMoney(report.fb_revenue)}
- Services: ${formatMoney(report.service_revenue)}

*Occupancy*
Average: ${formatPct(report.avg_occupancy_pct)}
Guest Nights: ${report.total_guest_nights}
RevPAR: ${formatMoney(report.weekly_revpar)}
ADR: ${formatMoney(report.weekly_adr)}

*Top 5 Dishes*
${topDishesText}

*Staff Leaderboard*
${leaderText}

*Maintenance*
Opened: ${report.maintenance_issues_opened}
Closed: ${report.maintenance_issues_closed}
Pending: ${report.maintenance_pending}
`.trim();
}

// ============================================
// TREND INDICATORS
// ============================================

export function getTrendIcon(trend: "up" | "down" | "flat"): string {
  switch (trend) {
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "flat":
      return "→";
  }
}

export function getTrendColor(
  trend: "up" | "down" | "flat",
  isGoodWhenUp: boolean = true,
): string {
  if (trend === "flat") return "text-slate-500";
  if (trend === "up")
    return isGoodWhenUp ? "text-emerald-600" : "text-rose-600";
  return isGoodWhenUp ? "text-rose-600" : "text-emerald-600";
}
