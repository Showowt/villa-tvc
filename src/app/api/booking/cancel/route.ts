import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

// ═══════════════════════════════════════════════════════════════
// BOOKING CANCELLATION API - Issues #45 & #46
// Enhanced with refund calculation and tracking
// Politica: 30+ dias = 100%, 15-29 dias = 50%, <15 dias = 0%
// ═══════════════════════════════════════════════════════════════

interface CancelRequest {
  booking_id: string;
  cancellation_reason: string;
  cancelled_by: string;
  refund_amount?: number;
  refund_percentage?: number;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CancelRequest;
    const {
      booking_id,
      cancellation_reason,
      cancelled_by,
      refund_amount,
      refund_percentage,
    } = body;

    if (!booking_id || !cancellation_reason || !cancelled_by) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: booking_id, cancellation_reason, cancelled_by",
        },
        { status: 400 },
      );
    }

    const supabase = createServerClient() as SupabaseAny;

    // Get the booking details first
    const { data: booking, error: bookingError } = await supabase
      .from("villa_bookings")
      .select("*")
      .eq("id", booking_id)
      .single();

    if (bookingError || !booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Calculate number of nights
    const checkIn = new Date(booking.check_in);
    const checkOut = new Date(booking.check_out);
    const numNights = Math.ceil(
      (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Update booking status to cancelled
    const { error: updateError } = await supabase
      .from("villa_bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by,
        cancellation_reason,
        updated_at: new Date().toISOString(),
      })
      .eq("id", booking_id);

    if (updateError) {
      console.error("[cancel booking]", updateError);
      return NextResponse.json(
        { error: "Failed to cancel booking" },
        { status: 500 },
      );
    }

    // Calculate refund based on policy if not provided
    let finalRefundAmount = refund_amount;
    let finalRefundPercentage = refund_percentage;
    let daysUntilCheckin = 0;

    if (booking.deposit_paid && booking.deposit_amount) {
      const checkInDate = new Date(booking.check_in);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      checkInDate.setHours(0, 0, 0, 0);

      daysUntilCheckin = Math.ceil(
        (checkInDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
      );

      // Apply refund policy if not provided
      if (finalRefundPercentage === undefined) {
        if (daysUntilCheckin >= 30) {
          finalRefundPercentage = 100;
        } else if (daysUntilCheckin >= 15) {
          finalRefundPercentage = 50;
        } else {
          finalRefundPercentage = 0;
        }
      }

      if (finalRefundAmount === undefined) {
        finalRefundAmount =
          Math.round(
            ((booking.deposit_amount * (finalRefundPercentage || 0)) / 100) *
              100,
          ) / 100;
      }
    }

    // Log the cancellation for audit with refund info
    await supabase.from("booking_cancellations").insert({
      booking_id,
      villa_id: booking.villa_id,
      guest_name: booking.guest_name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      cancelled_by,
      cancellation_reason,
      num_nights: numNights,
      deposit_amount: booking.deposit_amount || 0,
      days_until_checkin: daysUntilCheckin,
      refund_amount: finalRefundAmount || 0,
      refund_percentage: finalRefundPercentage || 0,
    });

    // Update villa status to vacant (free for rebooking)
    await supabase
      .from("villa_status")
      .update({
        status: "vacant",
        current_booking_id: null,
        updated_at: new Date().toISOString(),
      })
      .eq("villa_id", booking.villa_id)
      .eq("current_booking_id", booking_id);

    // Update daily_occupancy for all affected dates
    const today = new Date().toISOString().split("T")[0];
    const startDate = booking.check_in > today ? booking.check_in : today;

    // Get number of guests that were booked
    const guestCount = (booking.num_adults || 1) + (booking.num_children || 0);

    // Update occupancy for each day in the booking range
    const currentDate = new Date(startDate);
    const endDate = new Date(booking.check_out);

    while (currentDate < endDate) {
      const dateStr = currentDate.toISOString().split("T")[0];

      // Get current occupancy for this date
      const { data: occupancy } = await supabase
        .from("daily_occupancy")
        .select("*")
        .eq("date", dateStr)
        .single();

      if (occupancy) {
        // Get current villas_occupied array
        const villasOccupied = (occupancy.villas_occupied as string[]) || [];
        const updatedVillas = villasOccupied.filter(
          (v: string) => v !== booking.villa_id,
        );

        await supabase
          .from("daily_occupancy")
          .update({
            guests_count: Math.max(
              0,
              (occupancy.guests_count || 0) - guestCount,
            ),
            person_nights: Math.max(
              0,
              (occupancy.person_nights || 0) - guestCount,
            ),
            villas_occupied: updatedVillas,
            updated_at: new Date().toISOString(),
          })
          .eq("date", dateStr);
      }

      currentDate.setDate(currentDate.getDate() + 1);
    }

    return NextResponse.json({
      success: true,
      message: `Reserva cancelada. Villa ${booking.villa_id} esta disponible para nueva reserva.`,
      booking_id,
      villa_id: booking.villa_id,
      cancelled_nights: numNights,
      refund_amount: finalRefundAmount || 0,
      refund_percentage: finalRefundPercentage || 0,
      days_until_checkin: daysUntilCheckin,
    });
  } catch (error) {
    console.error("[cancel booking]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
