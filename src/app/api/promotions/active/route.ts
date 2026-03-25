// ============================================
// API - Promociones Activas
// Issue #68 - Happy Hour / Promociones
// Retorna las promociones activas en este momento
// ============================================

import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

interface ActivePromotion {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  discount_type: "percentage" | "fixed" | "bogo";
  discount_value: number | null;
  applicable_categories: string[];
  applicable_items: string[];
  start_time: string | null;
  end_time: string | null;
}

export async function GET() {
  try {
    const supabase = createServerClient();

    // Obtener fecha y hora actual
    const now = new Date();
    const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS
    const currentDay = now
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const currentDate = now.toISOString().split("T")[0];

    // Buscar promociones activas
    const { data: promotions, error } = await supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true);

    if (error) {
      console.error("[Promotions API] Error:", error);
      return NextResponse.json(
        { error: "Error al obtener promociones" },
        { status: 500 },
      );
    }

    // Filtrar las que estan activas AHORA
    const activeNow = (promotions || []).filter((promo) => {
      // Verificar fecha de inicio
      if (promo.start_date && currentDate < promo.start_date) {
        return false;
      }

      // Verificar fecha de fin
      if (promo.end_date && currentDate > promo.end_date) {
        return false;
      }

      // Verificar horario
      if (promo.start_time && promo.end_time) {
        if (currentTime < promo.start_time || currentTime > promo.end_time) {
          return false;
        }
      }

      // Verificar dia de la semana
      if (promo.days_active && promo.days_active.length > 0) {
        if (!promo.days_active.includes(currentDay)) {
          return false;
        }
      }

      return true;
    });

    // Formatear respuesta
    const formatted: ActivePromotion[] = activeNow.map((p) => ({
      id: p.id,
      name: p.name,
      name_es: p.name_es,
      description: p.description,
      description_es: p.description_es,
      discount_type: p.discount_type,
      discount_value: p.discount_value,
      applicable_categories: p.applicable_categories || [],
      applicable_items: p.applicable_items || [],
      start_time: p.start_time,
      end_time: p.end_time,
    }));

    return NextResponse.json({
      success: true,
      promotions: formatted,
      count: formatted.length,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[Promotions API] Error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// POST: Calcular descuento para un item
export async function POST(request: Request) {
  try {
    const { menuItemId, quantity = 1, promotionId } = await request.json();

    if (!menuItemId) {
      return NextResponse.json(
        { error: "menuItemId es requerido" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Obtener item del menu
    const { data: menuItem, error: itemError } = await supabase
      .from("menu_items")
      .select("id, price, category")
      .eq("id", menuItemId)
      .single();

    if (itemError || !menuItem) {
      return NextResponse.json(
        { error: "Item no encontrado" },
        { status: 404 },
      );
    }

    // Si se especifica una promocion, usarla
    let promotion = null;
    if (promotionId) {
      const { data } = await supabase
        .from("promotions")
        .select("*")
        .eq("id", promotionId)
        .eq("is_active", true)
        .single();
      promotion = data;
    } else {
      // Buscar promocion aplicable
      const now = new Date();
      const currentTime = now.toTimeString().split(" ")[0];
      const currentDay = now
        .toLocaleDateString("en-US", { weekday: "long" })
        .toLowerCase();
      const currentDate = now.toISOString().split("T")[0];

      const { data: promos } = await supabase
        .from("promotions")
        .select("*")
        .eq("is_active", true)
        .or(
          `applicable_categories.cs.{${menuItem.category}},applicable_items.cs.{${menuItemId}}`,
        );

      // Encontrar la primera promocion aplicable
      promotion = (promos || []).find((p) => {
        // Verificar fechas
        if (p.start_date && currentDate < p.start_date) return false;
        if (p.end_date && currentDate > p.end_date) return false;

        // Verificar horario
        if (p.start_time && p.end_time) {
          if (currentTime < p.start_time || currentTime > p.end_time)
            return false;
        }

        // Verificar dia
        if (p.days_active && p.days_active.length > 0) {
          if (!p.days_active.includes(currentDay)) return false;
        }

        return true;
      });
    }

    // Calcular descuento
    const originalPrice = menuItem.price * quantity;
    let discountAmount = 0;
    let finalPrice = originalPrice;
    let freeItems = 0;

    if (promotion) {
      switch (promotion.discount_type) {
        case "percentage":
          discountAmount =
            originalPrice * ((promotion.discount_value || 0) / 100);
          break;
        case "fixed":
          discountAmount = Math.min(
            (promotion.discount_value || 0) * quantity,
            originalPrice,
          );
          break;
        case "bogo":
          freeItems = Math.floor(quantity / 2);
          discountAmount = freeItems * menuItem.price;
          break;
      }
      finalPrice = originalPrice - discountAmount;
    }

    return NextResponse.json({
      success: true,
      originalPrice: Math.round(originalPrice),
      discountAmount: Math.round(discountAmount),
      finalPrice: Math.round(finalPrice),
      freeItems,
      promotionApplied: promotion
        ? {
            id: promotion.id,
            name: promotion.name,
            name_es: promotion.name_es,
            discount_type: promotion.discount_type,
          }
        : null,
    });
  } catch (error) {
    console.error("[Promotions API] Calculate error:", error);
    return NextResponse.json(
      { error: "Error al calcular descuento" },
      { status: 500 },
    );
  }
}
