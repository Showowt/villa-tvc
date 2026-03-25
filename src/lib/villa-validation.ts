// ═══════════════════════════════════════════════════════════════
// TVC VILLA VALIDATION — Overbooking Protection
// Issue #40 — NO OVERBOOKING PROTECTION
//
// Can assign 5 guests to a 4-max villa. Can assign to maintenance villa.
//
// This module provides:
// 1. Guest count validation against villa capacity
// 2. Villa status validation (maintenance, cleaning, occupied)
// 3. Date conflict checking with existing bookings
// 4. Alternative villa suggestions
// 5. Cloudbeds sync validation
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";
import { createServerClient } from "./supabase/client";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface DateRange {
  checkIn: string; // YYYY-MM-DD
  checkOut: string; // YYYY-MM-DD
}

export interface VillaInfo {
  id: string;
  name: string;
  maxGuests: number;
  type: string;
  zone: string;
  accessible: boolean;
}

export interface VillaStatusInfo {
  villaId: string;
  status: VillaStatus;
  cleaningStatus?: CleaningStatus;
  maintenanceNotes?: string;
  maintenanceUrgent?: boolean;
  currentGuest?: {
    name: string;
    checkIn: string;
    checkOut: string;
    guestCount: number;
  };
}

export interface BookingConflict {
  bookingId: string;
  guestName: string;
  checkIn: string;
  checkOut: string;
  conflictType: "overlap" | "same_day_checkin" | "turnaround_too_short";
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  alternatives?: VillaInfo[];
}

export interface ValidationError {
  code: VillaValidationErrorCode;
  message: string;
  field?: string;
}

export interface ValidationWarning {
  code: string;
  message: string;
}

export type VillaStatus =
  | "occupied"
  | "vacant"
  | "arriving"
  | "cleaning"
  | "checkout"
  | "maintenance"
  | "blocked";

export type CleaningStatus = "dirty" | "in_progress" | "inspected" | "clean";

export type VillaValidationErrorCode =
  | "GUEST_COUNT_EXCEEDS_CAPACITY"
  | "VILLA_IN_MAINTENANCE"
  | "VILLA_IN_CLEANING"
  | "VILLA_OCCUPIED"
  | "VILLA_BLOCKED"
  | "DATE_CONFLICT"
  | "INVALID_DATES"
  | "CHECKOUT_BEFORE_CHECKIN"
  | "CHECKIN_IN_PAST"
  | "VILLA_NOT_FOUND"
  | "TURNAROUND_TOO_SHORT";

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGES (Spanish)
// ═══════════════════════════════════════════════════════════════

export const VILLA_VALIDATION_MESSAGES: Record<
  VillaValidationErrorCode,
  string
> = {
  GUEST_COUNT_EXCEEDS_CAPACITY:
    "El numero de huespedes excede la capacidad de la villa",
  VILLA_IN_MAINTENANCE: "Villa en mantenimiento - no disponible para reservas",
  VILLA_IN_CLEANING:
    "Villa en proceso de limpieza - espere hasta que este lista",
  VILLA_OCCUPIED: "Villa actualmente ocupada",
  VILLA_BLOCKED: "Villa bloqueada - no disponible para reservas",
  DATE_CONFLICT: "Conflicto de fechas con reserva existente",
  INVALID_DATES: "Fechas invalidas",
  CHECKOUT_BEFORE_CHECKIN:
    "La fecha de check-out debe ser posterior al check-in",
  CHECKIN_IN_PAST: "La fecha de check-in no puede ser en el pasado",
  VILLA_NOT_FOUND: "Villa no encontrada",
  TURNAROUND_TOO_SHORT:
    "Tiempo insuficiente entre checkout y siguiente check-in para limpieza",
};

// ═══════════════════════════════════════════════════════════════
// VILLA DATA (from property-map)
// ═══════════════════════════════════════════════════════════════

const VILLAS: VillaInfo[] = [
  {
    id: "teresa",
    name: "Teresa",
    type: "Bungalow Tipo B",
    zone: "NORTH",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "aduana",
    name: "Aduana",
    type: "Bungalow Tipo A",
    zone: "NORTH",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "trinidad",
    name: "Trinidad",
    type: "Bungalow Tipo B",
    zone: "NORTH",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "paz",
    name: "Paz",
    type: "Bungalow Tipo A",
    zone: "EAST",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "sanpedro",
    name: "San Pedro",
    type: "Bungalow Tipo A",
    zone: "EAST",
    maxGuests: 5,
    accessible: false,
  },
  {
    id: "sandiego",
    name: "San Diego",
    type: "Bungalow Tipo B",
    zone: "EAST",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "pozo",
    name: "Pozo",
    type: "Bungalow Tipo A",
    zone: "WEST",
    maxGuests: 5,
    accessible: false,
  },
  {
    id: "santodomingo",
    name: "Santo Domingo",
    type: "Bungalow Tipo B",
    zone: "SOUTH",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "merced",
    name: "Merced",
    type: "Bungalow Tipo C",
    zone: "SOUTH",
    maxGuests: 4,
    accessible: false,
  },
  {
    id: "coche",
    name: "Coche",
    type: "Bungalow Accesible",
    zone: "SOUTH",
    maxGuests: 4,
    accessible: true,
  },
];

// DB ID to component ID mapping
const DB_ID_TO_VILLA_ID: Record<string, string> = {
  villa_1: "teresa",
  villa_2: "aduana",
  villa_3: "trinidad",
  villa_4: "paz",
  villa_5: "sanpedro",
  villa_6: "sandiego",
  villa_7: "coche",
  villa_8: "pozo",
  villa_9: "santodomingo",
  villa_10: "merced",
};

const VILLA_ID_TO_DB_ID: Record<string, string> = Object.fromEntries(
  Object.entries(DB_ID_TO_VILLA_ID).map(([k, v]) => [v, k]),
);

// ═══════════════════════════════════════════════════════════════
// CORE VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Get villa info by ID
 */
export function getVillaInfo(villaId: string): VillaInfo | undefined {
  return VILLAS.find((v) => v.id === villaId);
}

/**
 * Get all villas
 */
export function getAllVillas(): VillaInfo[] {
  return [...VILLAS];
}

/**
 * Convert DB villa ID to component villa ID
 */
export function dbIdToVillaId(dbId: string): string | undefined {
  return DB_ID_TO_VILLA_ID[dbId];
}

/**
 * Convert component villa ID to DB villa ID
 */
export function villaIdToDbId(villaId: string): string | undefined {
  return VILLA_ID_TO_DB_ID[villaId];
}

/**
 * Validate guest count against villa capacity
 */
export function validateGuestCount(
  guestCount: number,
  maxGuests: number,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  if (guestCount > maxGuests) {
    errors.push({
      code: "GUEST_COUNT_EXCEEDS_CAPACITY",
      message: `${VILLA_VALIDATION_MESSAGES.GUEST_COUNT_EXCEEDS_CAPACITY} (max: ${maxGuests}, solicitado: ${guestCount})`,
      field: "guests",
    });
  } else if (guestCount === maxGuests) {
    warnings.push({
      code: "AT_CAPACITY",
      message: `Villa al maximo de capacidad (${maxGuests} huespedes)`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate villa status for guest assignment
 */
export function validateVillaStatus(
  status: VillaStatus,
  cleaningStatus?: CleaningStatus,
  options?: {
    allowCheckoutToday?: boolean;
    allowCleaningIfApproved?: boolean;
  },
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  switch (status) {
    case "maintenance":
      errors.push({
        code: "VILLA_IN_MAINTENANCE",
        message: VILLA_VALIDATION_MESSAGES.VILLA_IN_MAINTENANCE,
        field: "status",
      });
      break;

    case "cleaning":
      // Check if cleaning is complete
      if (options?.allowCleaningIfApproved && cleaningStatus === "clean") {
        warnings.push({
          code: "RECENTLY_CLEANED",
          message: "Villa recientemente limpiada - verificar estado",
        });
      } else {
        errors.push({
          code: "VILLA_IN_CLEANING",
          message: VILLA_VALIDATION_MESSAGES.VILLA_IN_CLEANING,
          field: "status",
        });
      }
      break;

    case "occupied":
      errors.push({
        code: "VILLA_OCCUPIED",
        message: VILLA_VALIDATION_MESSAGES.VILLA_OCCUPIED,
        field: "status",
      });
      break;

    case "blocked":
      errors.push({
        code: "VILLA_BLOCKED",
        message: VILLA_VALIDATION_MESSAGES.VILLA_BLOCKED,
        field: "status",
      });
      break;

    case "checkout":
      if (!options?.allowCheckoutToday) {
        warnings.push({
          code: "CHECKOUT_TODAY",
          message:
            "Villa tiene checkout hoy - asegurar limpieza antes de nuevo check-in",
        });
      }
      break;

    case "arriving":
      errors.push({
        code: "VILLA_OCCUPIED",
        message: "Villa ya tiene llegada programada",
        field: "status",
      });
      break;

    case "vacant":
      // OK
      break;
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validate date range
 */
export function validateDateRange(dates: DateRange): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  const checkIn = new Date(dates.checkIn);
  const checkOut = new Date(dates.checkOut);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Check date validity
  if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
    errors.push({
      code: "INVALID_DATES",
      message: VILLA_VALIDATION_MESSAGES.INVALID_DATES,
      field: "dates",
    });
    return { valid: false, errors, warnings };
  }

  // Check-in cannot be in the past
  if (checkIn < today) {
    errors.push({
      code: "CHECKIN_IN_PAST",
      message: VILLA_VALIDATION_MESSAGES.CHECKIN_IN_PAST,
      field: "checkIn",
    });
  }

  // Check-out must be after check-in
  if (checkOut <= checkIn) {
    errors.push({
      code: "CHECKOUT_BEFORE_CHECKIN",
      message: VILLA_VALIDATION_MESSAGES.CHECKOUT_BEFORE_CHECKIN,
      field: "checkOut",
    });
  }

  // Warn for same-day stays (unusual)
  const nights = Math.ceil(
    (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
  );
  if (nights === 0) {
    warnings.push({
      code: "SAME_DAY_CHECKOUT",
      message: "Check-in y check-out el mismo dia",
    });
  }

  // Warn for very long stays
  if (nights > 30) {
    warnings.push({
      code: "LONG_STAY",
      message: `Estancia de ${nights} noches - verificar disponibilidad`,
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ═══════════════════════════════════════════════════════════════
// DATABASE VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check for date conflicts with existing bookings
 */
export async function checkDateConflicts(
  villaId: string,
  dates: DateRange,
  excludeBookingId?: string,
): Promise<{
  hasConflicts: boolean;
  conflicts: BookingConflict[];
}> {
  const supabase = createServerClient();
  const dbVillaId = VILLA_ID_TO_DB_ID[villaId] || villaId;

  let query = supabase
    .from("villa_bookings")
    .select("id, guest_name, check_in, check_out")
    .eq("villa_id", dbVillaId)
    .not("status", "in", '("cancelled","checked_out","no_show")')
    .lt("check_in", dates.checkOut) // New checkout after existing check-in
    .gt("check_out", dates.checkIn); // Existing checkout after new check-in

  if (excludeBookingId) {
    query = query.neq("id", excludeBookingId);
  }

  const { data: conflictingBookings, error } = await query;

  if (error) {
    console.error("[villa-validation] Error checking conflicts:", error);
    return { hasConflicts: false, conflicts: [] };
  }

  const conflicts: BookingConflict[] = (conflictingBookings || []).map((b) => {
    // Determine conflict type
    let conflictType: BookingConflict["conflictType"] = "overlap";
    if (b.check_out === dates.checkIn) {
      conflictType = "same_day_checkin";
    }

    return {
      bookingId: b.id,
      guestName: b.guest_name,
      checkIn: b.check_in,
      checkOut: b.check_out,
      conflictType,
    };
  });

  return {
    hasConflicts: conflicts.length > 0,
    conflicts,
  };
}

/**
 * Check for turnaround time between bookings
 * Minimum 4 hours between checkout and next check-in recommended
 */
export async function checkTurnaroundTime(
  villaId: string,
  checkInDate: string,
  minHours: number = 4,
): Promise<{
  hasSufficientTime: boolean;
  previousCheckout?: string;
  previousGuestName?: string;
  hoursBetween?: number;
}> {
  const supabase = createServerClient();
  const dbVillaId = VILLA_ID_TO_DB_ID[villaId] || villaId;

  // Find bookings that check out on or near the check-in date
  const { data: previousBooking } = await supabase
    .from("villa_bookings")
    .select("id, guest_name, check_out")
    .eq("villa_id", dbVillaId)
    .eq("check_out", checkInDate)
    .not("status", "in", '("cancelled","no_show")')
    .order("check_out", { ascending: false })
    .limit(1)
    .single();

  if (!previousBooking) {
    return { hasSufficientTime: true };
  }

  // For same-day checkout/check-in, assume standard checkout 11am, check-in 3pm = 4 hours
  // This is sufficient by default
  return {
    hasSufficientTime: true,
    previousCheckout: previousBooking.check_out,
    previousGuestName: previousBooking.guest_name,
    hoursBetween: 4, // Standard turnaround
  };
}

/**
 * Get current villa status from database
 */
export async function getVillaCurrentStatus(
  villaId: string,
): Promise<VillaStatusInfo | null> {
  const supabase = createServerClient();
  const dbVillaId = VILLA_ID_TO_DB_ID[villaId] || villaId;

  const { data: status, error } = await supabase
    .from("villa_status")
    .select("*")
    .eq("villa_id", dbVillaId)
    .single();

  if (error || !status) {
    return null;
  }

  // Get current booking if occupied
  let currentGuest;
  if (status.current_booking_id) {
    const { data: booking } = await supabase
      .from("villa_bookings")
      .select("guest_name, check_in, check_out, num_adults, num_children")
      .eq("id", status.current_booking_id)
      .single();

    if (booking) {
      currentGuest = {
        name: booking.guest_name,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        guestCount: booking.num_adults + (booking.num_children || 0),
      };
    }
  }

  return {
    villaId,
    status: status.status as VillaStatus,
    cleaningStatus: status.cleaning_status as CleaningStatus | undefined,
    maintenanceNotes: status.maintenance_notes,
    maintenanceUrgent: status.maintenance_urgent,
    currentGuest,
  };
}

/**
 * Find available alternative villas
 */
export async function findAlternativeVillas(
  guestCount: number,
  dates: DateRange,
  excludeVillaId?: string,
  requireAccessible?: boolean,
): Promise<VillaInfo[]> {
  const supabase = createServerClient();

  // Get villas with sufficient capacity
  const eligibleVillas = VILLAS.filter(
    (v) =>
      v.maxGuests >= guestCount &&
      v.id !== excludeVillaId &&
      (!requireAccessible || v.accessible),
  );

  const availableVillas: VillaInfo[] = [];

  for (const villa of eligibleVillas) {
    // Check status
    const statusInfo = await getVillaCurrentStatus(villa.id);
    if (statusInfo && ["maintenance", "blocked"].includes(statusInfo.status)) {
      continue;
    }

    // Check date conflicts
    const { hasConflicts } = await checkDateConflicts(villa.id, dates);
    if (!hasConflicts) {
      availableVillas.push(villa);
    }
  }

  // Sort by preference: same zone, then capacity fit
  return availableVillas.sort((a, b) => {
    // Prefer closer capacity fit
    const aDiff = a.maxGuests - guestCount;
    const bDiff = b.maxGuests - guestCount;
    return aDiff - bDiff;
  });
}

// ═══════════════════════════════════════════════════════════════
// COMPREHENSIVE VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface GuestAssignmentInput {
  villaId: string;
  guestCount: number;
  dates: DateRange;
  excludeBookingId?: string;
  requireAccessible?: boolean;
}

/**
 * Complete validation for guest assignment
 * Checks capacity, status, and date conflicts
 */
export async function canAssignGuest(
  input: GuestAssignmentInput,
): Promise<ValidationResult> {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationWarning[] = [];

  // 1. Get villa info
  const villa = getVillaInfo(input.villaId);
  if (!villa) {
    return {
      valid: false,
      errors: [
        {
          code: "VILLA_NOT_FOUND",
          message: VILLA_VALIDATION_MESSAGES.VILLA_NOT_FOUND,
        },
      ],
      warnings: [],
    };
  }

  // 2. Check accessibility requirement
  if (input.requireAccessible && !villa.accessible) {
    allWarnings.push({
      code: "NOT_ACCESSIBLE",
      message: "Villa solicitada no es accesible",
    });
  }

  // 3. Validate guest count
  const guestResult = validateGuestCount(input.guestCount, villa.maxGuests);
  allErrors.push(...guestResult.errors);
  allWarnings.push(...guestResult.warnings);

  // 4. Validate dates
  const dateResult = validateDateRange(input.dates);
  allErrors.push(...dateResult.errors);
  allWarnings.push(...dateResult.warnings);

  // If dates are invalid, don't check conflicts
  if (!dateResult.valid) {
    return {
      valid: false,
      errors: allErrors,
      warnings: allWarnings,
    };
  }

  // 5. Get current status
  const statusInfo = await getVillaCurrentStatus(input.villaId);
  if (statusInfo) {
    const statusResult = validateVillaStatus(
      statusInfo.status,
      statusInfo.cleaningStatus,
      { allowCleaningIfApproved: true },
    );
    allErrors.push(...statusResult.errors);
    allWarnings.push(...statusResult.warnings);
  }

  // 6. Check date conflicts
  const { hasConflicts, conflicts } = await checkDateConflicts(
    input.villaId,
    input.dates,
    input.excludeBookingId,
  );

  if (hasConflicts) {
    for (const conflict of conflicts) {
      allErrors.push({
        code: "DATE_CONFLICT",
        message: `${VILLA_VALIDATION_MESSAGES.DATE_CONFLICT}: ${conflict.guestName} (${conflict.checkIn} - ${conflict.checkOut})`,
        field: "dates",
      });
    }
  }

  // 7. Check turnaround time
  const turnaround = await checkTurnaroundTime(
    input.villaId,
    input.dates.checkIn,
  );
  if (!turnaround.hasSufficientTime) {
    allWarnings.push({
      code: "TIGHT_TURNAROUND",
      message: `Checkout previo mismo dia (${turnaround.previousGuestName}) - coordinar limpieza`,
    });
  }

  // 8. Find alternatives if there are errors
  let alternatives: VillaInfo[] | undefined;
  if (allErrors.length > 0) {
    alternatives = await findAlternativeVillas(
      input.guestCount,
      input.dates,
      input.villaId,
      input.requireAccessible,
    );
  }

  return {
    valid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    alternatives:
      alternatives && alternatives.length > 0 ? alternatives : undefined,
  };
}

// ═══════════════════════════════════════════════════════════════
// CLOUDBEDS SYNC VALIDATION
// ═══════════════════════════════════════════════════════════════

export interface CloudbedsReservationValidation {
  reservationId: string;
  guestName: string;
  villaId: string;
  guestCount: number;
  dates: DateRange;
}

export interface CloudbedsSyncValidationResult {
  valid: ValidationResult[];
  invalid: {
    reservation: CloudbedsReservationValidation;
    result: ValidationResult;
  }[];
  summary: {
    total: number;
    valid: number;
    invalid: number;
    warnings: number;
  };
}

/**
 * Validate multiple reservations from Cloudbeds sync
 * Returns detailed validation results for each reservation
 */
export async function validateCloudbedsSync(
  reservations: CloudbedsReservationValidation[],
): Promise<CloudbedsSyncValidationResult> {
  const validResults: ValidationResult[] = [];
  const invalidResults: {
    reservation: CloudbedsReservationValidation;
    result: ValidationResult;
  }[] = [];
  let warningCount = 0;

  for (const reservation of reservations) {
    const result = await canAssignGuest({
      villaId: reservation.villaId,
      guestCount: reservation.guestCount,
      dates: reservation.dates,
    });

    if (result.valid) {
      validResults.push(result);
      if (result.warnings.length > 0) {
        warningCount += result.warnings.length;
      }
    } else {
      invalidResults.push({
        reservation,
        result,
      });
    }
  }

  return {
    valid: validResults,
    invalid: invalidResults,
    summary: {
      total: reservations.length,
      valid: validResults.length,
      invalid: invalidResults.length,
      warnings: warningCount,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// ZOD SCHEMAS FOR API VALIDATION
// ═══════════════════════════════════════════════════════════════

export const dateRangeSchema = z.object({
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Formato de fecha invalido (YYYY-MM-DD)",
  }),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, {
    message: "Formato de fecha invalido (YYYY-MM-DD)",
  }),
});

export const guestAssignmentRequestSchema = z.object({
  villaId: z.string().min(1, { message: "ID de villa requerido" }),
  guestCount: z
    .number()
    .int()
    .positive({ message: "Numero de huespedes debe ser positivo" }),
  dates: dateRangeSchema,
  excludeBookingId: z.string().uuid().optional(),
  requireAccessible: z.boolean().optional(),
});

export type GuestAssignmentRequest = z.infer<
  typeof guestAssignmentRequestSchema
>;

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Format validation result for API response
 */
export function formatValidationResponse(result: ValidationResult): {
  success: boolean;
  message: string;
  errors?: string[];
  warnings?: string[];
  alternatives?: Array<{ id: string; name: string; maxGuests: number }>;
} {
  return {
    success: result.valid,
    message: result.valid
      ? "Validacion exitosa"
      : result.errors.map((e) => e.message).join("; "),
    errors:
      result.errors.length > 0
        ? result.errors.map((e) => e.message)
        : undefined,
    warnings:
      result.warnings.length > 0
        ? result.warnings.map((w) => w.message)
        : undefined,
    alternatives: result.alternatives?.map((v) => ({
      id: v.id,
      name: v.name,
      maxGuests: v.maxGuests,
    })),
  };
}

/**
 * Format conflicting dates for display
 */
export function formatConflictMessage(conflicts: BookingConflict[]): string {
  if (conflicts.length === 0) return "";

  return conflicts
    .map((c) => {
      switch (c.conflictType) {
        case "same_day_checkin":
          return `Checkout de ${c.guestName} mismo dia`;
        case "turnaround_too_short":
          return `Tiempo insuficiente despues de ${c.guestName}`;
        default:
          return `Conflicto con ${c.guestName} (${c.checkIn} - ${c.checkOut})`;
      }
    })
    .join("; ");
}

/**
 * Quick check if villa can accept guests (simplified for UI)
 */
export function canVillaAcceptGuests(
  status: VillaStatus,
  cleaningStatus?: CleaningStatus,
): boolean {
  if (["maintenance", "blocked", "occupied"].includes(status)) {
    return false;
  }
  if (status === "cleaning" && cleaningStatus !== "clean") {
    return false;
  }
  return true;
}

/**
 * Get status badge info for UI
 */
export function getVillaStatusBadge(
  status: VillaStatus,
  canAssign: boolean,
): {
  label: string;
  color: string;
  icon: string;
} {
  const badges: Record<
    VillaStatus,
    { label: string; color: string; icon: string }
  > = {
    occupied: { label: "Ocupada", color: "#10B981", icon: "person" },
    vacant: { label: "Disponible", color: "#3B82F6", icon: "check" },
    arriving: { label: "Llegada Hoy", color: "#3B82F6", icon: "flight_land" },
    cleaning: { label: "Limpieza", color: "#F59E0B", icon: "cleaning" },
    checkout: { label: "Salida Hoy", color: "#EF4444", icon: "logout" },
    maintenance: {
      label: "Mantenimiento",
      color: "#8B5CF6",
      icon: "construction",
    },
    blocked: { label: "Bloqueada", color: "#6B7280", icon: "block" },
  };

  const badge = badges[status];
  if (!canAssign && status === "vacant") {
    badge.color = "#9CA3AF"; // Gray out if can't assign
  }

  return badge;
}
