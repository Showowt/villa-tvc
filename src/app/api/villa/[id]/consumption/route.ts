// ============================================
// VILLA CONSUMPTION API (Issue #18)
// Cuenta corriente / Running tab por villa
// Obtiene todos los pedidos durante la estadia
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// Tipos de respuesta
interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_name_es: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_date: string;
  order_time: string;
  is_comp: boolean;
  is_staff_meal: boolean;
  notes: string | null;
}

interface CategoryTotal {
  category: string;
  category_label: string;
  items_count: number;
  total: number;
}

interface ConsumptionSummary {
  villa_id: string;
  villa_name: string;
  guest_name: string | null;
  check_in: string | null;
  check_out: string | null;
  orders: OrderItem[];
  category_totals: CategoryTotal[];
  food_total: number;
  drinks_total: number;
  services_total: number;
  comp_total: number;
  grand_total: number;
  total_items: number;
}

// Mapeo de categorias a etiquetas en espanol
const CATEGORY_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Almuerzo",
  dinner: "Cena",
  snack: "Snacks",
  cocktail: "Cocteles",
  mocktail: "Sin Alcohol",
  beer: "Cerveza",
  wine: "Vino",
  spirit: "Licores",
  soft_drink: "Bebidas",
};

// Categorias de comida vs bebidas
const FOOD_CATEGORIES = ["breakfast", "lunch", "dinner", "snack"];
const DRINK_CATEGORIES = [
  "cocktail",
  "mocktail",
  "beer",
  "wine",
  "spirit",
  "soft_drink",
];

// Mapeo de villa_id a nombre
const VILLA_NAMES: Record<string, string> = {
  villa_1: "Teresa",
  villa_2: "Aduana",
  villa_3: "Trinidad",
  villa_4: "Paz",
  villa_5: "San Pedro",
  villa_6: "San Diego",
  villa_7: "Coche",
  villa_8: "Pozo",
  villa_9: "Santo Domingo",
  villa_10: "Merced",
  restaurante: "Restaurante",
  pool: "Piscina",
};

// GET /api/villa/[id]/consumption - Obtener cuenta corriente de villa
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: villaId } = await params;
    const { searchParams } = new URL(request.url);

    // Parametros opcionales de fecha
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const includeComp = searchParams.get("include_comp") !== "false";

    const supabase = createServerClient();

    // Obtener booking activo para la villa (para fechas y nombre de huesped)
    const today = new Date().toISOString().split("T")[0];
    const { data: activeBooking } = await supabase
      .from("villa_bookings")
      .select("*")
      .eq("villa_id", villaId)
      .in("status", ["confirmed", "checked_in"])
      .lte("check_in", today)
      .gte("check_out", today)
      .maybeSingle();

    // Determinar rango de fechas
    const queryStartDate =
      startDate || activeBooking?.check_in?.split("T")[0] || today;
    const queryEndDate =
      endDate || activeBooking?.check_out?.split("T")[0] || today;

    // Obtener pedidos de la villa en el rango de fechas
    let query = supabase
      .from("order_logs")
      .select(
        `
        id,
        menu_item_id,
        quantity,
        unit_price,
        total_price,
        order_date,
        order_time,
        is_comp,
        is_staff_meal,
        notes,
        menu_items!inner(name, name_es, category)
      `,
      )
      .eq("villa_id", villaId)
      .gte("order_date", queryStartDate)
      .lte("order_date", queryEndDate)
      .eq("is_staff_meal", false) // Excluir comidas de staff
      .order("order_date", { ascending: false })
      .order("order_time", { ascending: false });

    if (!includeComp) {
      query = query.eq("is_comp", false);
    }

    const { data: orders, error: ordersError } = await query;

    if (ordersError) {
      console.error("[Villa Consumption] Orders fetch error:", ordersError);
      return NextResponse.json(
        { success: false, error: "Error al obtener pedidos" },
        { status: 500 },
      );
    }

    // Procesar ordenes
    const processedOrders: OrderItem[] = (orders || []).map((order) => {
      const menuItem = order.menu_items as {
        name: string;
        name_es: string;
        category: string;
      };
      return {
        id: order.id,
        menu_item_id: order.menu_item_id,
        menu_item_name: menuItem.name,
        menu_item_name_es: menuItem.name_es,
        category: menuItem.category,
        quantity: order.quantity,
        unit_price: order.unit_price || 0,
        total_price: order.total_price || 0,
        order_date: order.order_date || "",
        order_time: order.order_time || "",
        is_comp: order.is_comp || false,
        is_staff_meal: order.is_staff_meal || false,
        notes: order.notes,
      };
    });

    // Calcular totales por categoria
    const categoryMap: Record<string, { items_count: number; total: number }> =
      {};
    let foodTotal = 0;
    let drinksTotal = 0;
    let compTotal = 0;
    let grandTotal = 0;
    let totalItems = 0;

    for (const order of processedOrders) {
      const cat = order.category;
      if (!categoryMap[cat]) {
        categoryMap[cat] = { items_count: 0, total: 0 };
      }
      categoryMap[cat].items_count += order.quantity;
      categoryMap[cat].total += order.total_price;
      totalItems += order.quantity;

      if (order.is_comp) {
        compTotal += order.total_price;
      } else {
        grandTotal += order.total_price;

        if (FOOD_CATEGORIES.includes(cat)) {
          foodTotal += order.total_price;
        } else if (DRINK_CATEGORIES.includes(cat)) {
          drinksTotal += order.total_price;
        }
      }
    }

    // Convertir a array de category totals
    const categoryTotals: CategoryTotal[] = Object.entries(categoryMap)
      .map(([category, data]) => ({
        category,
        category_label: CATEGORY_LABELS[category] || category,
        items_count: data.items_count,
        total: data.total,
      }))
      .sort((a, b) => b.total - a.total);

    // Construir respuesta
    const summary: ConsumptionSummary = {
      villa_id: villaId,
      villa_name: VILLA_NAMES[villaId] || villaId,
      guest_name: activeBooking?.guest_name || null,
      check_in: activeBooking?.check_in || queryStartDate,
      check_out: activeBooking?.check_out || queryEndDate,
      orders: processedOrders,
      category_totals: categoryTotals,
      food_total: foodTotal,
      drinks_total: drinksTotal,
      services_total: 0, // Por ahora, servicios no estan integrados
      comp_total: compTotal,
      grand_total: grandTotal,
      total_items: totalItems,
    };

    return NextResponse.json({
      success: true,
      data: summary,
    });
  } catch (error) {
    console.error("[Villa Consumption] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al procesar solicitud" },
      { status: 500 },
    );
  }
}
