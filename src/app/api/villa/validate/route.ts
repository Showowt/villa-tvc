import { NextRequest, NextResponse } from "next/server";
import {
  canAssignGuest,
  formatValidationResponse,
  guestAssignmentRequestSchema,
  getVillaInfo,
  validateGuestCount,
  validateVillaStatus,
  checkDateConflicts,
  findAlternativeVillas,
  type VillaStatus,
  type CleaningStatus,
} from "@/lib/villa-validation";

// ═══════════════════════════════════════════════════════════════
// VILLA VALIDATION API
// Issue #40 — NO OVERBOOKING PROTECTION
//
// POST /api/villa/validate
// Validates guest assignment before allowing it
//
// Body:
// {
//   villaId: string,
//   guestCount: number,
//   dates: { checkIn: string, checkOut: string },
//   excludeBookingId?: string,
//   requireAccessible?: boolean
// }
//
// Response:
// {
//   success: boolean,
//   message: string,
//   errors?: string[],
//   warnings?: string[],
//   alternatives?: Array<{ id: string, name: string, maxGuests: number }>
// }
// ═══════════════════════════════════════════════════════════════

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate request body
    const parseResult = guestAssignmentRequestSchema.safeParse(body);
    if (!parseResult.success) {
      const errors = parseResult.error.errors.map((e) => {
        const path = e.path.join(" > ");
        return path ? `${path}: ${e.message}` : e.message;
      });

      return NextResponse.json(
        {
          success: false,
          message: "Datos de solicitud invalidos",
          errors,
        },
        { status: 400 },
      );
    }

    const input = parseResult.data;

    // Run full validation
    const result = await canAssignGuest({
      villaId: input.villaId,
      guestCount: input.guestCount,
      dates: input.dates,
      excludeBookingId: input.excludeBookingId,
      requireAccessible: input.requireAccessible,
    });

    const response = formatValidationResponse(result);

    return NextResponse.json(response, {
      status: result.valid ? 200 : 400,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[villa/validate]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al validar asignacion",
        errors: [errorMessage],
      },
      { status: 500 },
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// GET /api/villa/validate?villaId=xxx
// Quick status check for a single villa
// ═══════════════════════════════════════════════════════════════

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const villaId = searchParams.get("villaId");

    if (!villaId) {
      return NextResponse.json(
        {
          success: false,
          message: "villaId es requerido",
        },
        { status: 400 },
      );
    }

    // Get villa info
    const villa = getVillaInfo(villaId);
    if (!villa) {
      return NextResponse.json(
        {
          success: false,
          message: "Villa no encontrada",
        },
        { status: 404 },
      );
    }

    // Get optional params
    const guestCount = parseInt(searchParams.get("guestCount") || "1", 10);
    const checkIn = searchParams.get("checkIn");
    const checkOut = searchParams.get("checkOut");
    const status = searchParams.get("status") as VillaStatus | null;
    const cleaningStatus = searchParams.get("cleaningStatus") as
      | CleaningStatus
      | undefined;

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate guest count
    const guestResult = validateGuestCount(guestCount, villa.maxGuests);
    errors.push(...guestResult.errors.map((e) => e.message));
    warnings.push(...guestResult.warnings.map((w) => w.message));

    // Validate status if provided
    if (status) {
      const statusResult = validateVillaStatus(status, cleaningStatus);
      errors.push(...statusResult.errors.map((e) => e.message));
      warnings.push(...statusResult.warnings.map((w) => w.message));
    }

    // Check date conflicts if dates provided
    let conflicts: string[] = [];
    if (checkIn && checkOut) {
      const { hasConflicts, conflicts: bookingConflicts } =
        await checkDateConflicts(villaId, { checkIn, checkOut });

      if (hasConflicts) {
        conflicts = bookingConflicts.map(
          (c) => `${c.guestName} (${c.checkIn} - ${c.checkOut})`,
        );
        errors.push(`Conflictos de fecha: ${conflicts.join("; ")}`);
      }
    }

    // Find alternatives if errors
    let alternatives:
      | Array<{ id: string; name: string; maxGuests: number; type: string }>
      | undefined = undefined;
    if (errors.length > 0 && checkIn && checkOut) {
      const altVillas = await findAlternativeVillas(
        guestCount,
        { checkIn, checkOut },
        villaId,
      );
      alternatives = altVillas.map((v) => ({
        id: v.id,
        name: v.name,
        maxGuests: v.maxGuests,
        type: v.type,
      }));
    }

    return NextResponse.json({
      success: errors.length === 0,
      villa: {
        id: villa.id,
        name: villa.name,
        maxGuests: villa.maxGuests,
        type: villa.type,
        zone: villa.zone,
        accessible: villa.accessible,
      },
      validation: {
        canAssign: errors.length === 0,
        guestCount,
        maxGuests: villa.maxGuests,
        capacityUsed: Math.round((guestCount / villa.maxGuests) * 100),
      },
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      alternatives: alternatives?.length ? alternatives : undefined,
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[villa/validate GET]", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error al validar villa",
        errors: [errorMessage],
      },
      { status: 500 },
    );
  }
}
