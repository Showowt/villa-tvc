import { NextRequest, NextResponse } from "next/server";
import {
  extendStay,
  processEarlyCheckout,
  processWalkInGuest,
  createGroupBooking,
  logDayVisitor,
  updateDayVisitorConsumption,
  checkoutDayVisitor,
  WalkInGuestInput,
  GroupBookingInput,
  DayVisitorInput,
} from "@/lib/operations-hub-extended";

// ═══════════════════════════════════════════════════════════════
// BOOKING OPERATIONS API
// Issues 71-75: Group bookings, extend stay, early checkout,
// walk-ins, day visitors
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = "system" } = body;

    switch (action) {
      // ─── ISSUE 72: EXTEND STAY ───
      case "extend_stay": {
        const { bookingId, additionalNights } = body;
        if (!bookingId || !additionalNights) {
          return NextResponse.json(
            { error: "Missing bookingId or additionalNights" },
            { status: 400 },
          );
        }
        const result = await extendStay(bookingId, additionalNights, userId);
        return NextResponse.json(result);
      }

      // ─── ISSUE 73: EARLY CHECKOUT ───
      case "early_checkout": {
        const { bookingId, notes } = body;
        if (!bookingId) {
          return NextResponse.json(
            { error: "Missing bookingId" },
            { status: 400 },
          );
        }
        const result = await processEarlyCheckout(bookingId, userId, notes);
        return NextResponse.json(result);
      }

      // ─── ISSUE 74: WALK-IN GUEST ───
      case "walk_in": {
        const {
          villaId,
          guestName,
          guestPhone,
          numAdults,
          numChildren,
          nights,
          notes,
        } = body;
        if (!villaId || !guestName || !numAdults || !nights) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: villaId, guestName, numAdults, nights",
            },
            { status: 400 },
          );
        }
        const input: WalkInGuestInput = {
          villaId,
          guestName,
          guestPhone,
          numAdults,
          numChildren,
          nights,
          notes,
        };
        const result = await processWalkInGuest(input, userId);
        return NextResponse.json(result);
      }

      // ─── ISSUE 71: GROUP BOOKING (Village Takeover) ───
      case "group_booking": {
        const {
          name,
          coordinatorName,
          coordinatorPhone,
          coordinatorEmail,
          villaIds,
          checkIn,
          checkOut,
          totalGuests,
          specialRequests,
          sharedItinerary,
        } = body;

        if (!name || !coordinatorName || !villaIds || !checkIn || !checkOut) {
          return NextResponse.json(
            { error: "Missing required fields for group booking" },
            { status: 400 },
          );
        }

        const input: GroupBookingInput = {
          name,
          coordinatorName,
          coordinatorPhone,
          coordinatorEmail,
          villaIds,
          checkIn,
          checkOut,
          totalGuests: totalGuests || villaIds.length * 2,
          specialRequests,
          sharedItinerary,
        };
        const result = await createGroupBooking(input, userId);
        return NextResponse.json(result);
      }

      // ─── ISSUE 75: DAY VISITORS ───
      case "log_day_visitor": {
        const {
          partyName,
          partySize,
          arrivalTime,
          hostVillaId,
          hostGuestName,
          purpose,
          notes,
        } = body;
        if (!partyName || !partySize || !purpose) {
          return NextResponse.json(
            { error: "Missing required fields: partyName, partySize, purpose" },
            { status: 400 },
          );
        }
        const input: DayVisitorInput = {
          partyName,
          partySize,
          arrivalTime,
          hostVillaId,
          hostGuestName,
          purpose,
          notes,
        };
        const result = await logDayVisitor(input, userId);
        return NextResponse.json(result);
      }

      case "update_day_visitor_consumption": {
        const { visitorId, consumptionTotal } = body;
        if (!visitorId) {
          return NextResponse.json(
            { error: "Missing visitorId" },
            { status: 400 },
          );
        }
        const success = await updateDayVisitorConsumption(
          visitorId,
          consumptionTotal || 0,
        );
        return NextResponse.json({ success });
      }

      case "checkout_day_visitor": {
        const { visitorId } = body;
        if (!visitorId) {
          return NextResponse.json(
            { error: "Missing visitorId" },
            { status: 400 },
          );
        }
        const success = await checkoutDayVisitor(visitorId);
        return NextResponse.json({ success });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[BookingsAPI]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
