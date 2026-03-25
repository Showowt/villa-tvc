// ═══════════════════════════════════════════════════════════════
// TVC DATA VALIDATION
// Zod schemas for all form inputs and API routes
// Issue #61 — NO DATA VALIDATION
// ═══════════════════════════════════════════════════════════════

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGES (Spanish)
// ═══════════════════════════════════════════════════════════════

export const ERROR_MESSAGES = {
  // General
  required: "Este campo es requerido",
  invalid_type: "Tipo de dato inválido",
  too_short: "El valor es demasiado corto",
  too_long: "El valor es demasiado largo",

  // Numbers
  min_zero: "El valor debe ser mayor o igual a 0",
  positive: "El valor debe ser positivo",
  integer: "El valor debe ser un número entero",
  max_exceeded: "El valor excede el máximo permitido",

  // Dates
  invalid_date: "Fecha inválida",
  date_past: "La fecha no puede ser en el pasado",
  date_future: "La fecha no puede ser en el futuro",
  checkout_before_checkin: "Check-out debe ser después del check-in",

  // Guest
  guest_count_exceeded: "Número de huéspedes excede la capacidad de la villa",
  invalid_phone: "Número de teléfono inválido",
  invalid_email: "Correo electrónico inválido",

  // Villa
  villa_not_available: "Villa no disponible para esta fecha",
  villa_in_maintenance: "Villa en mantenimiento",
  villa_in_cleaning: "Villa en proceso de limpieza",
  villa_occupied: "Villa ocupada",

  // Checklist
  missing_photos: "Fotos requeridas no subidas",
  incomplete_checklist: "Checklist incompleto",
} as const;

// ═══════════════════════════════════════════════════════════════
// BASE SCHEMAS
// ═══════════════════════════════════════════════════════════════

// UUID validation
export const uuidSchema = z
  .string()
  .uuid({ message: "ID inválido" })
  .or(z.string().min(1, { message: ERROR_MESSAGES.required }));

// Date string (YYYY-MM-DD)
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, { message: ERROR_MESSAGES.invalid_date });

// Phone number (international format)
export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{6,14}$/, { message: ERROR_MESSAGES.invalid_phone })
  .or(z.string().length(0))
  .optional();

// Email
export const emailSchema = z
  .string()
  .email({ message: ERROR_MESSAGES.invalid_email })
  .or(z.string().length(0))
  .optional();

// Non-negative number
export const nonNegativeNumberSchema = z
  .number({ invalid_type_error: ERROR_MESSAGES.invalid_type })
  .min(0, { message: ERROR_MESSAGES.min_zero });

// Positive integer
export const positiveIntegerSchema = z
  .number({ invalid_type_error: ERROR_MESSAGES.invalid_type })
  .int({ message: ERROR_MESSAGES.integer })
  .positive({ message: ERROR_MESSAGES.positive });

// ═══════════════════════════════════════════════════════════════
// GUEST SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const guestSchema = z.object({
  name: z.string().min(1, { message: ERROR_MESSAGES.required }).max(100),
  guests: positiveIntegerSchema,
  checkIn: dateSchema,
  checkOut: dateSchema,
  phone: phoneSchema,
  email: emailSchema,
  allergies: z.array(z.string()).optional().default([]),
  vip: z.boolean().optional().default(false),
  notes: z.string().max(500).optional().default(""),
});

export type GuestInput = z.infer<typeof guestSchema>;

// Refine to check checkout is after checkin
export const guestSchemaWithDateValidation = guestSchema.refine(
  (data) => new Date(data.checkOut) > new Date(data.checkIn),
  {
    message: ERROR_MESSAGES.checkout_before_checkin,
    path: ["checkOut"],
  },
);

// ═══════════════════════════════════════════════════════════════
// VILLA ASSIGNMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════

// Database constraint: CHECK ((status = ANY (ARRAY['vacant', 'occupied', 'cleaning', 'maintenance', 'blocked'])))
export const villaStatus = z.enum([
  "occupied",
  "vacant",
  "cleaning",
  "maintenance",
  "blocked",
]);

// Extended status for UI (includes arriving/checkout which are derived states)
export const villaStatusExtended = z.enum([
  "occupied",
  "vacant",
  "arriving",
  "cleaning",
  "checkout",
  "maintenance",
  "blocked",
]);

export type VillaStatusType = z.infer<typeof villaStatus>;

export const villaAssignmentSchema = z.object({
  villaId: z.string().min(1, { message: ERROR_MESSAGES.required }),
  villaNumber: positiveIntegerSchema.max(10),
  maxGuests: positiveIntegerSchema,
  guest: guestSchemaWithDateValidation,
  assignedBy: z.string().optional(),
});

export type VillaAssignmentInput = z.infer<typeof villaAssignmentSchema>;

// Validate guest count against villa capacity
export const villaAssignmentSchemaWithCapacity = villaAssignmentSchema.refine(
  (data) => data.guest.guests <= data.maxGuests,
  {
    message: ERROR_MESSAGES.guest_count_exceeded,
    path: ["guest", "guests"],
  },
);

// ═══════════════════════════════════════════════════════════════
// CHECKLIST SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const checklistItemSchema = z.object({
  task: z.string().min(1),
  task_es: z.string().min(1),
  photo_required: z.boolean().default(false),
  completed: z.boolean().default(false),
  photo_url: z.string().url().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
  completed_at: z.string().optional().nullable(),
});

export type ChecklistItemInput = z.infer<typeof checklistItemSchema>;

export const checklistSubmitSchema = z.object({
  checklist_id: uuidSchema.optional(),
  items: z.array(checklistItemSchema).min(1),
  completed_by: z.string().min(1, { message: ERROR_MESSAGES.required }),
  notes: z.string().max(1000).optional(),
  duration_minutes: nonNegativeNumberSchema.optional(),
  photos: z.array(z.string().url()).optional(),
});

export type ChecklistSubmitInput = z.infer<typeof checklistSubmitSchema>;

// Validate required photos
export const checklistSubmitSchemaWithPhotos = checklistSubmitSchema.refine(
  (data) => {
    const missingPhotos = data.items.filter(
      (item) => item.photo_required && item.completed && !item.photo_url,
    );
    return missingPhotos.length === 0;
  },
  {
    message: ERROR_MESSAGES.missing_photos,
    path: ["items"],
  },
);

// ═══════════════════════════════════════════════════════════════
// INVENTORY SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const inventoryItemSchema = z.object({
  ingredient_id: uuidSchema,
  quantity_counted: nonNegativeNumberSchema,
  notes: z.string().max(500).optional(),
});

export type InventoryItemInput = z.infer<typeof inventoryItemSchema>;

export const inventorySubmitSchema = z.object({
  items: z.array(inventoryItemSchema).min(1),
  counted_by: z.string().min(1, { message: ERROR_MESSAGES.required }),
  idempotency_key: z.string().optional(),
});

export type InventorySubmitInput = z.infer<typeof inventorySubmitSchema>;

// ═══════════════════════════════════════════════════════════════
// OCCUPANCY SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const occupancySchema = z.object({
  date: dateSchema,
  guests_count: nonNegativeNumberSchema.int(),
  check_ins: nonNegativeNumberSchema.int().optional().default(0),
  check_outs: nonNegativeNumberSchema.int().optional().default(0),
  notes: z.string().max(500).optional(),
});

export type OccupancyInput = z.infer<typeof occupancySchema>;

// ═══════════════════════════════════════════════════════════════
// STATUS TRANSITION SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const statusChangeSchema = z.object({
  action: z.enum([
    "change_status",
    "checklist_update",
    "maintenance_complete",
    "assign_guest",
    "checkout",
    "move_guest",
  ]),
  villaId: z.string().optional(),
  villaNumber: positiveIntegerSchema.max(10).optional(),
  newStatus: villaStatus.optional(),
  triggeredBy: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type StatusChangeInput = z.infer<typeof statusChangeSchema>;

// ═══════════════════════════════════════════════════════════════
// VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate data with a Zod schema and return formatted errors in Spanish
 */
export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; errors: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.errors.map((e) => {
    const path = e.path.join(" > ");
    return path ? `${path}: ${e.message}` : e.message;
  });

  return { success: false, errors };
}

/**
 * Parse numeric input (handles string inputs from forms)
 */
export function parseNumericInput(
  value: unknown,
  defaultValue: number = 0,
): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return isNaN(parsed) ? defaultValue : parsed;
  }
  return defaultValue;
}

/**
 * Parse integer input
 */
export function parseIntegerInput(
  value: unknown,
  defaultValue: number = 0,
): number {
  const num = parseNumericInput(value, defaultValue);
  return Math.floor(num);
}

/**
 * Validate villa is available for assignment
 */
export function validateVillaAvailability(
  villaStatus: VillaStatusType | string,
  options?: { allowCheckoutToday?: boolean },
): { available: boolean; error?: string } {
  switch (villaStatus) {
    case "maintenance":
      return { available: false, error: ERROR_MESSAGES.villa_in_maintenance };
    case "cleaning":
      return { available: false, error: ERROR_MESSAGES.villa_in_cleaning };
    case "occupied":
      return { available: false, error: ERROR_MESSAGES.villa_occupied };
    case "blocked":
      return { available: false, error: "Villa bloqueada" };
    case "checkout":
      if (options?.allowCheckoutToday) {
        return { available: true };
      }
      return {
        available: false,
        error:
          "Advertencia: Villa tiene checkout hoy pero aún no ha sido limpiada",
      };
    default:
      return { available: true };
  }
}

/**
 * Validate overbooking
 */
export function validateOverbooking(
  guestCount: number,
  maxGuests: number,
): { valid: boolean; error?: string } {
  if (guestCount > maxGuests) {
    return {
      valid: false,
      error: `${ERROR_MESSAGES.guest_count_exceeded} (max: ${maxGuests}, solicitado: ${guestCount})`,
    };
  }
  return { valid: true };
}

// ═══════════════════════════════════════════════════════════════
// ORDER SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const orderItemSchema = z.object({
  menu_item_id: z.string().uuid({ message: "ID de item inválido" }),
  quantity: positiveIntegerSchema,
  special_instructions: z.string().max(200).optional(),
});

export type OrderItemInput = z.infer<typeof orderItemSchema>;

export const orderSchema = z.object({
  villa_id: z.string().min(1, { message: "Villa es requerida" }),
  items: z
    .array(orderItemSchema)
    .min(1, { message: "Al menos un item es requerido" }),
  guest_name: z.string().max(100).optional(),
  guest_phone: phoneSchema,
  delivery_location: z.string().max(100).optional(),
  special_instructions: z.string().max(500).optional(),
});

export type OrderInput = z.infer<typeof orderSchema>;

// ═══════════════════════════════════════════════════════════════
// MAINTENANCE REPORT SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const maintenancePriority = z.enum(["low", "medium", "high", "urgent"]);
export type MaintenancePriorityType = z.infer<typeof maintenancePriority>;

export const maintenanceReportSchema = z.object({
  villa_id: z.string().min(1, { message: "Villa es requerida" }),
  title: z.string().min(3, { message: "Título muy corto" }).max(100),
  description: z
    .string()
    .min(10, { message: "Descripción muy corta" })
    .max(1000),
  priority: maintenancePriority,
  reported_by: z.string().min(1, { message: ERROR_MESSAGES.required }),
  photos: z.array(z.string().url()).optional(),
  category: z
    .enum([
      "plumbing",
      "electrical",
      "hvac",
      "structural",
      "appliance",
      "furniture",
      "other",
    ])
    .optional(),
});

export type MaintenanceReportInput = z.infer<typeof maintenanceReportSchema>;

// ═══════════════════════════════════════════════════════════════
// PURCHASE ORDER SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const purchaseOrderItemSchema = z.object({
  ingredient_id: uuidSchema,
  quantity: positiveIntegerSchema,
  unit_price: nonNegativeNumberSchema.optional(),
  notes: z.string().max(200).optional(),
});

export type PurchaseOrderItemInput = z.infer<typeof purchaseOrderItemSchema>;

export const purchaseOrderSchema = z.object({
  supplier_name: z
    .string()
    .min(1, { message: "Proveedor es requerido" })
    .max(100),
  items: z
    .array(purchaseOrderItemSchema)
    .min(1, { message: "Al menos un item es requerido" }),
  expected_delivery: dateSchema.optional(),
  notes: z.string().max(500).optional(),
  created_by: z.string().min(1, { message: ERROR_MESSAGES.required }),
});

export type PurchaseOrderInput = z.infer<typeof purchaseOrderSchema>;

// ═══════════════════════════════════════════════════════════════
// TASK SCHEMAS
// ═══════════════════════════════════════════════════════════════

export const taskPriority = z.enum(["alta", "media", "baja"]);
export type TaskPriorityType = z.infer<typeof taskPriority>;

export const taskDepartment = z.enum([
  "kitchen",
  "housekeeping",
  "maintenance",
  "pool",
  "front_desk",
  "general",
]);
export type TaskDepartmentType = z.infer<typeof taskDepartment>;

export const taskSchema = z.object({
  title: z.string().min(3, { message: "Título muy corto" }).max(100),
  description: z.string().max(500).optional(),
  priority: taskPriority,
  department: taskDepartment,
  assigned_to: z.string().optional().nullable(),
  assigned_to_id: z.string().uuid().optional().nullable(),
  estimated_minutes: positiveIntegerSchema.max(480).optional(),
  due_date: dateSchema.optional(),
  villa_id: z.string().optional(),
});

export type TaskInput = z.infer<typeof taskSchema>;

export const dailyTasksSchema = z.object({
  date: dateSchema,
  department: taskDepartment.optional(),
  tasks: z.array(taskSchema),
  generated_by: z.string().optional(),
});

export type DailyTasksInput = z.infer<typeof dailyTasksSchema>;

// ═══════════════════════════════════════════════════════════════
// BOOKING GUEST SCHEMA (for villa-map Add Guest form)
// ═══════════════════════════════════════════════════════════════

export const bookingGuestSchema = z.object({
  guest_name: z.string().min(2, { message: "Nombre muy corto" }).max(100),
  guest_email: emailSchema,
  guest_phone: phoneSchema,
  guest_country: z.string().max(50).optional(),
  num_adults: positiveIntegerSchema.max(10, { message: "Máximo 10 adultos" }),
  num_children: nonNegativeNumberSchema
    .int()
    .max(10, { message: "Máximo 10 niños" }),
  check_in: dateSchema,
  check_out: dateSchema,
  special_requests: z.string().max(500).optional(),
  vip_level: z.enum(["standard", "vip", "vvip"]).default("standard"),
  arrival_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, { message: "Formato HH:MM" })
    .optional(),
  boat_preference: z.enum(["3pm", "6:30pm", "private", "other"]).optional(),
});

export type BookingGuestInput = z.infer<typeof bookingGuestSchema>;

// Validate checkout is after checkin
export const bookingGuestSchemaWithDateValidation = bookingGuestSchema.refine(
  (data) => new Date(data.check_out) > new Date(data.check_in),
  {
    message: ERROR_MESSAGES.checkout_before_checkin,
    path: ["check_out"],
  },
);

// ═══════════════════════════════════════════════════════════════
// FORM FIELD VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a single field and return error message
 */
export function validateField<T>(
  schema: z.ZodSchema<T>,
  value: unknown,
): string | null {
  const result = schema.safeParse(value);
  if (result.success) return null;
  return result.error.errors[0]?.message || ERROR_MESSAGES.invalid_type;
}

/**
 * Coerce string to number for form inputs
 */
export const coercedNumber = z.coerce.number({
  invalid_type_error: "Cantidad debe ser un número",
});

export const coercedPositiveNumber = coercedNumber.min(0, {
  message: ERROR_MESSAGES.min_zero,
});

export const coercedPositiveInteger = coercedNumber
  .int({ message: ERROR_MESSAGES.integer })
  .min(0, { message: ERROR_MESSAGES.min_zero });

/**
 * Create a schema that coerces string input to number
 */
export function createQuantitySchema(min = 0, max?: number) {
  let schema = z.coerce
    .number({
      invalid_type_error: "Cantidad debe ser un número",
    })
    .min(min, { message: `Mínimo ${min}` });

  if (max !== undefined) {
    schema = schema.max(max, { message: `Máximo ${max}` });
  }

  return schema;
}

/**
 * Validate form data and return field-level errors
 */
export function validateForm<T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
  data: unknown,
):
  | { success: true; data: z.infer<z.ZodObject<T>> }
  | { success: false; fieldErrors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const fieldErrors: Record<string, string> = {};
  for (const error of result.error.errors) {
    const field = error.path.join(".");
    if (!fieldErrors[field]) {
      fieldErrors[field] = error.message;
    }
  }

  return { success: false, fieldErrors };
}

/**
 * API validation helper - returns NextResponse if validation fails
 */
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
):
  | { success: true; data: T }
  | { success: false; error: string; details: string[] } {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details = result.error.errors.map((e) => {
    const path = e.path.join(" > ");
    return path ? `${path}: ${e.message}` : e.message;
  });

  return {
    success: false,
    error: "Datos inválidos",
    details,
  };
}

// ═══════════════════════════════════════════════════════════════
// RE-EXPORTS FROM VILLA-VALIDATION
// Issue #40 — Comprehensive overbooking protection
// ═══════════════════════════════════════════════════════════════

export {
  canAssignGuest,
  checkDateConflicts,
  findAlternativeVillas,
  getVillaInfo,
  getAllVillas,
  getVillaCurrentStatus,
  validateGuestCount,
  validateDateRange,
  canVillaAcceptGuests,
  getVillaStatusBadge,
  formatValidationResponse,
  formatConflictMessage,
  VILLA_VALIDATION_MESSAGES,
  type DateRange,
  type VillaInfo,
  type VillaStatusInfo,
  type BookingConflict,
  type ValidationResult,
  type ValidationError,
  type ValidationWarning,
  type VillaStatus as VillaStatusExtendedType,
  type CleaningStatus,
  type VillaValidationErrorCode,
  type GuestAssignmentInput,
} from "./villa-validation";
