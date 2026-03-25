import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      booking_id,
      cancellation_reason,
      cancelled_by,
    }: {
      booking_id: string;
      cancellation_reason: string;
      cancelled_by: string;
    } = body;

    if (!booking_id || !cancellation_reason || !cancelled_by) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: booking_id, cancellation_reason, cancelled_by",
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

    // Log the cancellation for audit
    await supabase.from("booking_cancellations").insert({
      booking_id,
      villa_id: booking.villa_id,
      guest_name: booking.guest_name,
      check_in: booking.check_in,
      check_out: booking.check_out,
      cancelled_by,
      cancellation_reason,
      num_nights: numNights,
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
      message: `Booking cancelled. Villa ${booking.villa_id} is now available for rebooking.`,
      booking_id,
      villa_id: booking.villa_id,
      cancelled_nights: numNights,
    });
  } catch (error) {
    console.error("[cancel booking]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
