import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

interface ServiceWithUpsell extends Tables<"services"> {
  upsell_day?: number;
  upsell_priority?: number;
}

// Calculate days into stay
function calculateDaysIntoStay(checkInDate: string): number {
  const checkIn = new Date(checkInDate);
  const today = new Date();

  checkIn.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  const diffTime = today.getTime() - checkIn.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return diffDays + 1; // Day 1 is check-in day
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const guestPhone = searchParams.get("phone");
    const reservationId = searchParams.get("reservation_id");
    const checkInDate = searchParams.get("check_in");

    // Need either reservation_id or check_in date
    if (!reservationId && !checkInDate) {
      return NextResponse.json(
        { error: "Either reservation_id or check_in date is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    let dayOfStay = 1;

    // If we have reservation_id, look up the check-in date
    if (reservationId) {
      const { data: reservation } = await supabase
        .from("reservations")
        .select("check_in, check_out, status")
        .eq("id", reservationId)
        .single();

      if (reservation && reservation.status === "checked_in") {
        dayOfStay = calculateDaysIntoStay(reservation.check_in);
      } else if (reservation) {
        // Not checked in yet - treat as pre-arrival
        dayOfStay = 0;
      }
    } else if (checkInDate) {
      dayOfStay = calculateDaysIntoStay(checkInDate);
    }

    // Get services with upsell configuration
    const { data: services, error } = await supabase
      .from("services")
      .select("*")
      .eq("is_active", true)
      .eq("is_available", true)
      .order("sort_order");

    if (error) {
      throw error;
    }

    // Check what has already been suggested to this guest
    let suggestedServiceIds: string[] = [];
    if (guestPhone) {
      const { data: tracking } = await supabase
        .from("guest_upsell_tracking")
        .select("service_id")
        .eq("guest_phone", guestPhone);

      if (tracking) {
        suggestedServiceIds = tracking
          .map((t) => t.service_id)
          .filter((id): id is string => id !== null);
      }
    }

    // Filter services based on day of stay
    const relevantServices = (services as ServiceWithUpsell[])
      .filter((service) => {
        // Exclude already suggested services
        if (suggestedServiceIds.includes(service.id)) {
          return false;
        }

        // Services with matching upsell_day
        if (service.upsell_day === dayOfStay) {
          return true;
        }

        // Services without specific day are always available
        if (service.upsell_day === null && dayOfStay > 0) {
          return true;
        }

        return false;
      })
      .sort((a, b) => {
        // Sort by upsell_priority (higher first)
        const aPriority = a.upsell_priority || 0;
        const bPriority = b.upsell_priority || 0;
        return bPriority - aPriority;
      });

    // Build upsell recommendations
    const recommendations = relevantServices.slice(0, 3).map((service) => ({
      id: service.id,
      name: service.name,
      name_es: service.name_es,
      description: service.description,
      description_es: service.description_es,
      price: service.price,
      category: service.category,
      upsell_day: service.upsell_day,
      priority: service.upsell_priority,
    }));

    // Build upsell message based on day of stay
    let upsellMessage = "";
    let upsellMessageEs = "";

    if (dayOfStay === 1) {
      upsellMessage =
        "Perfect timing for a sunset experience or relaxing massage!";
      upsellMessageEs =
        "Momento perfecto para una experiencia de atardecer o un masaje relajante!";
    } else if (dayOfStay === 2) {
      upsellMessage =
        "Have you explored the Rosario Islands yet? We have amazing boat tours!";
      upsellMessageEs =
        "Ya exploraste las Islas del Rosario? Tenemos increibles tours en bote!";
    } else if (dayOfStay >= 3) {
      upsellMessage =
        "Looking for a special experience before you leave? Check out our spa services!";
      upsellMessageEs =
        "Buscas una experiencia especial antes de irte? Mira nuestros servicios de spa!";
    }

    return NextResponse.json({
      success: true,
      day_of_stay: dayOfStay,
      recommendations,
      upsell_message: {
        en: upsellMessage,
        es: upsellMessageEs,
      },
      total_available: relevantServices.length,
    });
  } catch (error) {
    console.error("[upsell/timing]", error);
    return NextResponse.json(
      { error: "Failed to get upsell timing" },
      { status: 500 },
    );
  }
}

// POST - Track that an upsell was suggested
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      reservation_id,
      guest_phone,
      service_id,
      suggestion_day,
      response,
    } = body as {
      reservation_id?: string;
      guest_phone?: string;
      service_id: string;
      suggestion_day?: number;
      response?: string;
    };

    if (!service_id) {
      return NextResponse.json(
        { error: "service_id is required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    const { data, error } = await supabase
      .from("guest_upsell_tracking")
      .insert({
        reservation_id: reservation_id || null,
        guest_phone: guest_phone || null,
        service_id,
        suggestion_day: suggestion_day || null,
        response: response || null,
        suggested_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      tracking: data,
    });
  } catch (error) {
    console.error("[upsell/timing POST]", error);
    return NextResponse.json(
      { error: "Failed to track upsell" },
      { status: 500 },
    );
  }
}
