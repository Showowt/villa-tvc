// ═══════════════════════════════════════════════════════════════
// TVC GUEST PROFILE ENGINE
// Issues #16 & #17: Reconocimiento de huéspedes recurrentes + Ocasiones especiales
// ═══════════════════════════════════════════════════════════════

import { createServerClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

export interface GuestProfile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  country: string | null;
  language: string;
  total_stays: number;
  total_nights: number;
  total_spent: number;
  first_stay: string | null;
  last_stay: string | null;
  preferences: GuestPreferences;
  allergies: string[];
  dietary_preferences: string[];
  special_dates: SpecialDate[];
  favorite_services: string[];
  tags: string[];
  is_vip: boolean;
  vip_reason: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface GuestPreferences {
  villa_preferred?: string;
  bed_type?: string;
  room_temp?: "cold" | "warm" | "normal";
  pillow_type?: "firm" | "soft" | "memory_foam";
  early_checkin?: boolean;
  late_checkout?: boolean;
  quiet_room?: boolean;
  floor_preference?: "high" | "low" | "any";
  view_preference?: string;
  special_amenities?: string[];
}

export interface SpecialDate {
  type: OccasionType;
  date: string; // Formato: "MM-DD" o "YYYY-MM-DD"
  name?: string; // Nombre personalizado (ej: "cumpleaños de María")
  year?: number; // Año si es aniversario con año
}

export type OccasionType =
  | "birthday"
  | "anniversary"
  | "honeymoon"
  | "celebration"
  | "proposal"
  | "baby_shower"
  | "graduation"
  | "retirement"
  | "welcome_back"
  | "vip_arrival"
  | "special_dietary"
  | "other";

export interface OccasionTask {
  id: string;
  booking_id: string;
  guest_profile_id: string | null;
  villa_id: string;
  occasion_type: OccasionType;
  occasion_details: string | null;
  department: "kitchen" | "bar" | "housekeeping" | "concierge" | "management";
  task_title: string;
  task_title_es: string;
  task_description: string | null;
  task_description_es: string | null;
  task_date: string;
  task_time: string | null;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  assigned_to: string | null;
  priority: number;
  is_auto_generated: boolean;
}

export interface DetectedOccasion {
  type: OccasionType;
  details: string;
  detailsEs: string;
  confidence: number; // 0-1
  source: "booking_notes" | "special_dates" | "returning_guest" | "vip";
}

export interface GuestMatchResult {
  found: boolean;
  profile: GuestProfile | null;
  isReturning: boolean;
  stayNumber: number;
  occasions: DetectedOccasion[];
}

// ═══════════════════════════════════════════════════════════════
// KEYWORDS PARA DETECCIÓN DE OCASIONES
// ═══════════════════════════════════════════════════════════════

const OCCASION_KEYWORDS: Record<OccasionType, { en: string[]; es: string[] }> =
  {
    birthday: {
      en: [
        "birthday",
        "bday",
        "b-day",
        "born",
        "turning",
        "years old",
        "celebrate age",
      ],
      es: [
        "cumpleaños",
        "cumple",
        "nació",
        "cumpliendo",
        "años",
        "celebrar cumple",
      ],
    },
    anniversary: {
      en: [
        "anniversary",
        "wedding anniversary",
        "married",
        "years together",
        "our anniversary",
      ],
      es: [
        "aniversario",
        "aniversario de bodas",
        "casados",
        "años juntos",
        "nuestro aniversario",
      ],
    },
    honeymoon: {
      en: [
        "honeymoon",
        "just married",
        "newlywed",
        "wedding trip",
        "luna de miel",
      ],
      es: [
        "luna de miel",
        "recién casados",
        "viaje de bodas",
        "recien casados",
        "honeymoon",
      ],
    },
    celebration: {
      en: [
        "celebration",
        "celebrate",
        "special occasion",
        "party",
        "milestone",
      ],
      es: [
        "celebración",
        "celebrar",
        "ocasión especial",
        "fiesta",
        "celebracion",
      ],
    },
    proposal: {
      en: [
        "proposal",
        "propose",
        "engagement",
        "asking to marry",
        "ring",
        "will you marry",
      ],
      es: [
        "propuesta",
        "proponer matrimonio",
        "compromiso",
        "pedir matrimonio",
        "anillo",
        "pedida de mano",
      ],
    },
    baby_shower: {
      en: [
        "baby shower",
        "expecting",
        "pregnant",
        "baby on the way",
        "new baby",
      ],
      es: [
        "baby shower",
        "esperando bebé",
        "embarazada",
        "bebé en camino",
        "nuevo bebé",
      ],
    },
    graduation: {
      en: ["graduation", "graduate", "graduated", "finishing school", "degree"],
      es: [
        "graduación",
        "graduado",
        "graduarse",
        "terminar estudios",
        "título",
        "grado",
      ],
    },
    retirement: {
      en: ["retirement", "retiring", "retired", "last day of work"],
      es: ["jubilación", "jubilarse", "jubilado", "retiro", "pensión"],
    },
    welcome_back: {
      en: [],
      es: [],
    },
    vip_arrival: {
      en: [],
      es: [],
    },
    special_dietary: {
      en: [],
      es: [],
    },
    other: {
      en: ["special", "surprise"],
      es: ["especial", "sorpresa"],
    },
  };

// ═══════════════════════════════════════════════════════════════
// FUNCIONES PRINCIPALES
// ═══════════════════════════════════════════════════════════════

const supabase = createServerClient();

/**
 * Busca un perfil de huésped existente por email o teléfono
 */
export async function findGuestProfile(
  email?: string | null,
  phone?: string | null,
): Promise<GuestProfile | null> {
  if (!email && !phone) return null;

  try {
    // Intentar por email primero (más confiable)
    if (email) {
      const { data: byEmail } = await supabase
        .from("guest_profiles")
        .select("*")
        .ilike("email", email)
        .limit(1)
        .single();

      if (byEmail) {
        return byEmail as unknown as GuestProfile;
      }
    }

    // Intentar por teléfono
    if (phone) {
      const normalizedPhone = normalizePhone(phone);
      const { data: byPhone } = await supabase
        .from("guest_profiles")
        .select("*")
        .or(`phone.eq.${phone},phone.eq.${normalizedPhone}`)
        .limit(1)
        .single();

      if (byPhone) {
        return byPhone as unknown as GuestProfile;
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Crea un nuevo perfil de huésped
 */
export async function createGuestProfile(input: {
  email?: string | null;
  phone?: string | null;
  name: string;
  country?: string | null;
  language?: string;
  createdBy?: string;
}): Promise<GuestProfile | null> {
  try {
    const { data, error } = await supabase
      .from("guest_profiles")
      .insert({
        email: input.email,
        phone: input.phone,
        name: input.name,
        country: input.country,
        language: input.language || "en",
        total_stays: 0,
        total_nights: 0,
        total_spent: 0,
        created_by: input.createdBy,
      })
      .select()
      .single();

    if (error) {
      console.error("[createGuestProfile]", error);
      return null;
    }

    return data as unknown as GuestProfile;
  } catch (err) {
    console.error("[createGuestProfile]", err);
    return null;
  }
}

/**
 * Actualiza estadísticas de un perfil de huésped después de una estadía
 */
export async function updateGuestStayStats(
  profileId: string,
  nights: number,
  amountSpent: number,
  checkIn: string,
): Promise<boolean> {
  try {
    const { data: current } = await supabase
      .from("guest_profiles")
      .select("total_stays, total_nights, total_spent, first_stay")
      .eq("id", profileId)
      .single();

    if (!current) return false;

    const { error } = await supabase
      .from("guest_profiles")
      .update({
        total_stays: (current.total_stays || 0) + 1,
        total_nights: (current.total_nights || 0) + nights,
        total_spent: (current.total_spent || 0) + amountSpent,
        first_stay: current.first_stay || checkIn,
        last_stay: checkIn,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Actualiza preferencias de un huésped
 */
export async function updateGuestPreferences(
  profileId: string,
  preferences: Partial<GuestPreferences>,
): Promise<boolean> {
  try {
    const { data: current } = await supabase
      .from("guest_profiles")
      .select("preferences")
      .eq("id", profileId)
      .single();

    const merged = {
      ...((current?.preferences as GuestPreferences) || {}),
      ...preferences,
    };

    const { error } = await supabase
      .from("guest_profiles")
      .update({
        preferences: merged,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    return !error;
  } catch {
    return false;
  }
}

/**
 * Agrega una fecha especial al perfil del huésped
 */
export async function addSpecialDate(
  profileId: string,
  specialDate: SpecialDate,
): Promise<boolean> {
  try {
    const { data: current } = await supabase
      .from("guest_profiles")
      .select("special_dates")
      .eq("id", profileId)
      .single();

    const existingDates = (current?.special_dates as SpecialDate[]) || [];

    // Evitar duplicados
    const alreadyExists = existingDates.some(
      (d) => d.type === specialDate.type && d.date === specialDate.date,
    );

    if (alreadyExists) return true;

    const { error } = await supabase
      .from("guest_profiles")
      .update({
        special_dates: [...existingDates, specialDate],
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    return !error;
  } catch {
    return false;
  }
}

// ═══════════════════════════════════════════════════════════════
// DETECCIÓN DE OCASIONES
// ═══════════════════════════════════════════════════════════════

/**
 * Detecta ocasiones especiales en las notas de la reserva
 */
export function detectOccasionsFromNotes(notes: string): DetectedOccasion[] {
  if (!notes) return [];

  const occasions: DetectedOccasion[] = [];
  const lowerNotes = notes.toLowerCase();

  for (const [occasionType, keywords] of Object.entries(OCCASION_KEYWORDS)) {
    const allKeywords = [...keywords.en, ...keywords.es];

    for (const keyword of allKeywords) {
      if (lowerNotes.includes(keyword.toLowerCase())) {
        // Extraer contexto alrededor del keyword
        const context = extractContext(notes, keyword);

        occasions.push({
          type: occasionType as OccasionType,
          details: getOccasionDetailEn(occasionType as OccasionType, context),
          detailsEs: getOccasionDetailEs(occasionType as OccasionType, context),
          confidence: 0.9,
          source: "booking_notes",
        });
        break; // Solo una detección por tipo
      }
    }
  }

  return occasions;
}

/**
 * Detecta si hay una fecha especial durante la estadía
 */
export function detectSpecialDatesInStay(
  specialDates: SpecialDate[],
  checkIn: string,
  checkOut: string,
): DetectedOccasion[] {
  if (!specialDates || specialDates.length === 0) return [];

  const occasions: DetectedOccasion[] = [];
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  const currentYear = checkInDate.getFullYear();

  for (const sd of specialDates) {
    // Parsear fecha MM-DD
    const [month, day] = sd.date.split("-").map(Number);
    const specialDateThisYear = new Date(currentYear, month - 1, day);

    // Si la fecha cae durante la estadía
    if (
      specialDateThisYear >= checkInDate &&
      specialDateThisYear <= checkOutDate
    ) {
      occasions.push({
        type: sd.type,
        details: `${getOccasionNameEn(sd.type)}${sd.name ? ` - ${sd.name}` : ""} on ${formatDateShort(specialDateThisYear)}`,
        detailsEs: `${getOccasionNameEs(sd.type)}${sd.name ? ` - ${sd.name}` : ""} el ${formatDateShortEs(specialDateThisYear)}`,
        confidence: 1.0,
        source: "special_dates",
      });
    }
  }

  return occasions;
}

/**
 * Procesa una reserva para matching de huésped y detección de ocasiones
 */
export async function processBookingForGuestProfile(booking: {
  id: string;
  guest_name: string;
  guest_email?: string | null;
  guest_phone?: string | null;
  guest_country?: string | null;
  villa_id: string;
  check_in: string;
  check_out: string;
  notes?: string | null;
  num_adults?: number;
  num_children?: number;
}): Promise<GuestMatchResult> {
  const result: GuestMatchResult = {
    found: false,
    profile: null,
    isReturning: false,
    stayNumber: 1,
    occasions: [],
  };

  try {
    // 1. Buscar perfil existente
    let profile = await findGuestProfile(
      booking.guest_email,
      booking.guest_phone,
    );

    // 2. Si existe, es huésped recurrente
    if (profile) {
      result.found = true;
      result.profile = profile;
      result.isReturning = profile.total_stays > 0;
      result.stayNumber = (profile.total_stays || 0) + 1;

      // Agregar ocasión de bienvenida si es recurrente
      if (result.isReturning) {
        result.occasions.push({
          type: "welcome_back",
          details: `Returning guest - Stay #${result.stayNumber}`,
          detailsEs: `Huésped recurrente - Estadía #${result.stayNumber}`,
          confidence: 1.0,
          source: "returning_guest",
        });
      }

      // Si es VIP
      if (profile.is_vip) {
        result.occasions.push({
          type: "vip_arrival",
          details: `VIP Guest${profile.vip_reason ? ` - ${profile.vip_reason}` : ""}`,
          detailsEs: `Huésped VIP${profile.vip_reason ? ` - ${profile.vip_reason}` : ""}`,
          confidence: 1.0,
          source: "vip",
        });
      }

      // Detectar fechas especiales durante la estadía
      if (profile.special_dates && profile.special_dates.length > 0) {
        const specialDateOccasions = detectSpecialDatesInStay(
          profile.special_dates,
          booking.check_in,
          booking.check_out,
        );
        result.occasions.push(...specialDateOccasions);
      }

      // Verificar alergias/dietas especiales
      if (
        (profile.allergies && profile.allergies.length > 0) ||
        (profile.dietary_preferences && profile.dietary_preferences.length > 0)
      ) {
        result.occasions.push({
          type: "special_dietary",
          details: `Special dietary: ${[...profile.allergies, ...profile.dietary_preferences].join(", ")}`,
          detailsEs: `Dieta especial: ${[...profile.allergies, ...profile.dietary_preferences].join(", ")}`,
          confidence: 1.0,
          source: "returning_guest",
        });
      }
    } else {
      // 3. Crear nuevo perfil
      profile = await createGuestProfile({
        email: booking.guest_email,
        phone: booking.guest_phone,
        name: booking.guest_name,
        country: booking.guest_country,
        createdBy: "system",
      });

      if (profile) {
        result.found = true;
        result.profile = profile;
      }
    }

    // 4. Detectar ocasiones de las notas de la reserva
    if (booking.notes) {
      const notesOccasions = detectOccasionsFromNotes(booking.notes);
      result.occasions.push(...notesOccasions);
    }

    // 5. Actualizar reserva con perfil vinculado
    if (profile) {
      await supabase
        .from("villa_bookings")
        .update({
          guest_profile_id: profile.id,
          is_returning_guest: result.isReturning,
          detected_occasions: result.occasions,
          updated_at: new Date().toISOString(),
        })
        .eq("id", booking.id);
    }

    // 6. Crear tareas de ocasión
    if (result.occasions.length > 0) {
      await createOccasionTasks(
        booking.id,
        profile?.id || null,
        booking.villa_id,
        booking.check_in,
        result.occasions,
      );
    }

    return result;
  } catch (err) {
    console.error("[processBookingForGuestProfile]", err);
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════
// CREACIÓN DE TAREAS DE OCASIÓN
// ═══════════════════════════════════════════════════════════════

/**
 * Crea tareas automáticas para cada ocasión detectada
 */
export async function createOccasionTasks(
  bookingId: string,
  guestProfileId: string | null,
  villaId: string,
  checkIn: string,
  occasions: DetectedOccasion[],
): Promise<OccasionTask[]> {
  const tasks: OccasionTask[] = [];

  for (const occasion of occasions) {
    const taskConfig = getTaskConfigForOccasion(occasion.type);

    for (const config of taskConfig) {
      const { data, error } = await supabase
        .from("occasion_tasks")
        .insert({
          booking_id: bookingId,
          guest_profile_id: guestProfileId,
          villa_id: villaId,
          occasion_type: occasion.type,
          occasion_details: occasion.details,
          department: config.department,
          task_title: config.titleEn,
          task_title_es: config.titleEs,
          task_description: config.descriptionEn,
          task_description_es: config.descriptionEs,
          task_date: checkIn, // Por defecto el día de llegada
          task_time: config.time,
          priority: config.priority,
          status: "pending",
          is_auto_generated: true,
        })
        .select()
        .single();

      if (!error && data) {
        tasks.push(data as unknown as OccasionTask);
      }
    }
  }

  return tasks;
}

interface TaskConfig {
  department: "kitchen" | "bar" | "housekeeping" | "concierge" | "management";
  titleEn: string;
  titleEs: string;
  descriptionEn: string;
  descriptionEs: string;
  time: string | null;
  priority: number;
}

/**
 * Retorna la configuración de tareas para cada tipo de ocasión
 */
function getTaskConfigForOccasion(type: OccasionType): TaskConfig[] {
  switch (type) {
    case "birthday":
      return [
        {
          department: "kitchen",
          titleEn: "Prepare birthday cake",
          titleEs: "Preparar pastel de cumpleaños",
          descriptionEn: "Prepare a complimentary birthday cake for the guest",
          descriptionEs: "Preparar pastel de cortesía para el huésped",
          time: "15:00",
          priority: 1,
        },
        {
          department: "housekeeping",
          titleEn: "Birthday room decoration",
          titleEs: "Decoración de cumpleaños en villa",
          descriptionEn: "Set up birthday balloons and card in the villa",
          descriptionEs: "Colocar globos y tarjeta de cumpleaños en la villa",
          time: "14:00",
          priority: 2,
        },
      ];

    case "anniversary":
      return [
        {
          department: "bar",
          titleEn: "Champagne for anniversary",
          titleEs: "Champagne para aniversario",
          descriptionEn: "Prepare complimentary champagne on arrival",
          descriptionEs: "Preparar champagne de cortesía para la llegada",
          time: "16:00",
          priority: 1,
        },
        {
          department: "housekeeping",
          titleEn: "Romantic room setup",
          titleEs: "Decoración romántica en villa",
          descriptionEn: "Rose petals, candles, romantic setup in villa",
          descriptionEs:
            "Pétalos de rosa, velas, ambiente romántico en la villa",
          time: "14:00",
          priority: 2,
        },
      ];

    case "honeymoon":
      return [
        {
          department: "bar",
          titleEn: "Honeymoon champagne",
          titleEs: "Champagne luna de miel",
          descriptionEn: "Complimentary champagne for honeymooners",
          descriptionEs: "Champagne de cortesía para luna de miel",
          time: "16:00",
          priority: 1,
        },
        {
          department: "housekeeping",
          titleEn: "Honeymoon decoration",
          titleEs: "Decoración luna de miel",
          descriptionEn: "Full romantic setup: petals, candles, towel art",
          descriptionEs:
            "Decoración romántica completa: pétalos, velas, arte con toallas",
          time: "14:00",
          priority: 1,
        },
        {
          department: "concierge",
          titleEn: "Honeymoon welcome packet",
          titleEs: "Paquete de bienvenida luna de miel",
          descriptionEn: "Prepare honeymoon activities recommendations",
          descriptionEs:
            "Preparar recomendaciones de actividades para luna de miel",
          time: null,
          priority: 2,
        },
      ];

    case "proposal":
      return [
        {
          department: "management",
          titleEn: "Coordinate proposal setup",
          titleEs: "Coordinar montaje de propuesta",
          descriptionEn:
            "Contact guest to coordinate proposal timing and setup",
          descriptionEs:
            "Contactar huésped para coordinar hora y montaje de propuesta",
          time: null,
          priority: 1,
        },
        {
          department: "bar",
          titleEn: "Champagne for proposal",
          titleEs: "Champagne para propuesta",
          descriptionEn: "Have champagne ready for post-proposal celebration",
          descriptionEs:
            "Tener champagne listo para celebración post-propuesta",
          time: null,
          priority: 1,
        },
      ];

    case "welcome_back":
      return [
        {
          department: "housekeeping",
          titleEn: "Welcome back card",
          titleEs: "Tarjeta de bienvenida",
          descriptionEn: "Place personalized welcome back card in villa",
          descriptionEs: "Colocar tarjeta de bienvenida personalizada en villa",
          time: "14:00",
          priority: 2,
        },
        {
          department: "concierge",
          titleEn: "Review guest preferences",
          titleEs: "Revisar preferencias del huésped",
          descriptionEn:
            "Check previous stay notes and apply known preferences",
          descriptionEs:
            "Revisar notas de estadías anteriores y aplicar preferencias conocidas",
          time: null,
          priority: 2,
        },
      ];

    case "vip_arrival":
      return [
        {
          department: "management",
          titleEn: "VIP arrival coordination",
          titleEs: "Coordinación llegada VIP",
          descriptionEn: "Ensure VIP welcome protocol is followed",
          descriptionEs: "Asegurar que se siga protocolo de bienvenida VIP",
          time: null,
          priority: 1,
        },
        {
          department: "bar",
          titleEn: "VIP welcome drink",
          titleEs: "Bebida de bienvenida VIP",
          descriptionEn: "Prepare premium welcome drink on arrival",
          descriptionEs: "Preparar bebida de bienvenida premium",
          time: null,
          priority: 1,
        },
      ];

    case "special_dietary":
      return [
        {
          department: "kitchen",
          titleEn: "Dietary restrictions alert",
          titleEs: "Alerta restricciones alimenticias",
          descriptionEn: "Review and prepare for special dietary needs",
          descriptionEs:
            "Revisar y preparar para necesidades dietéticas especiales",
          time: "08:00",
          priority: 1,
        },
      ];

    case "celebration":
    case "baby_shower":
    case "graduation":
    case "retirement":
      return [
        {
          department: "housekeeping",
          titleEn: "Celebration decoration",
          titleEs: "Decoración de celebración",
          descriptionEn: "Set up appropriate decorations for celebration",
          descriptionEs: "Montar decoraciones apropiadas para la celebración",
          time: "14:00",
          priority: 2,
        },
        {
          department: "bar",
          titleEn: "Celebration drinks",
          titleEs: "Bebidas de celebración",
          descriptionEn: "Prepare complimentary drinks for celebration",
          descriptionEs: "Preparar bebidas de cortesía para celebración",
          time: "16:00",
          priority: 2,
        },
      ];

    default:
      return [];
  }
}

// ═══════════════════════════════════════════════════════════════
// CONSULTAS
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene todas las tareas de ocasión pendientes para una fecha
 */
export async function getOccasionTasksForDate(
  date: string,
  department?: string,
): Promise<OccasionTask[]> {
  let query = supabase
    .from("occasion_tasks")
    .select("*")
    .eq("task_date", date)
    .eq("status", "pending")
    .order("priority", { ascending: true });

  if (department) {
    query = query.eq("department", department);
  }

  const { data, error } = await query;

  if (error) {
    console.error("[getOccasionTasksForDate]", error);
    return [];
  }

  return (data || []) as unknown as OccasionTask[];
}

/**
 * Obtiene el perfil completo de un huésped con historial
 */
export async function getGuestProfileWithHistory(profileId: string): Promise<{
  profile: GuestProfile;
  stayHistory: {
    check_in: string;
    check_out: string;
    villa_id: string;
    nights: number;
    total_spent: number;
    nps_score: number | null;
  }[];
} | null> {
  try {
    const { data: profile, error: profileError } = await supabase
      .from("guest_profiles")
      .select("*")
      .eq("id", profileId)
      .single();

    if (profileError || !profile) return null;

    const { data: history } = await supabase
      .from("guest_stay_history")
      .select("check_in, check_out, villa_id, nights, total_spent, nps_score")
      .eq("guest_profile_id", profileId)
      .order("check_in", { ascending: false });

    return {
      profile: profile as unknown as GuestProfile,
      stayHistory: history || [],
    };
  } catch {
    return null;
  }
}

/**
 * Busca perfiles de huéspedes
 */
export async function searchGuestProfiles(
  searchTerm: string,
  limit = 20,
): Promise<GuestProfile[]> {
  const { data, error } = await supabase
    .from("guest_profiles")
    .select("*")
    .or(
      `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
    )
    .order("total_stays", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[searchGuestProfiles]", error);
    return [];
  }

  return (data || []) as unknown as GuestProfile[];
}

/**
 * Marca un huésped como VIP
 */
export async function markAsVIP(
  profileId: string,
  reason?: string,
): Promise<boolean> {
  const { error } = await supabase
    .from("guest_profiles")
    .update({
      is_vip: true,
      vip_reason: reason || "Marked as VIP by staff",
      tags: supabase.rpc("array_append_unique", {
        arr: "tags",
        val: "vip",
      }),
      updated_at: new Date().toISOString(),
    })
    .eq("id", profileId);

  return !error;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-\+\(\)]/g, "");
}

function extractContext(text: string, keyword: string): string {
  const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
  if (idx === -1) return "";

  const start = Math.max(0, idx - 20);
  const end = Math.min(text.length, idx + keyword.length + 50);
  return text.substring(start, end).trim();
}

function getOccasionNameEn(type: OccasionType): string {
  const names: Record<OccasionType, string> = {
    birthday: "Birthday",
    anniversary: "Anniversary",
    honeymoon: "Honeymoon",
    celebration: "Celebration",
    proposal: "Proposal",
    baby_shower: "Baby Shower",
    graduation: "Graduation",
    retirement: "Retirement",
    welcome_back: "Welcome Back",
    vip_arrival: "VIP Arrival",
    special_dietary: "Special Dietary",
    other: "Special Occasion",
  };
  return names[type];
}

function getOccasionNameEs(type: OccasionType): string {
  const names: Record<OccasionType, string> = {
    birthday: "Cumpleaños",
    anniversary: "Aniversario",
    honeymoon: "Luna de Miel",
    celebration: "Celebración",
    proposal: "Propuesta de Matrimonio",
    baby_shower: "Baby Shower",
    graduation: "Graduación",
    retirement: "Jubilación",
    welcome_back: "Bienvenida",
    vip_arrival: "Llegada VIP",
    special_dietary: "Dieta Especial",
    other: "Ocasión Especial",
  };
  return names[type];
}

function getOccasionDetailEn(type: OccasionType, context: string): string {
  return `${getOccasionNameEn(type)}${context ? ` (${context})` : ""}`;
}

function getOccasionDetailEs(type: OccasionType, context: string): string {
  return `${getOccasionNameEs(type)}${context ? ` (${context})` : ""}`;
}

function formatDateShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatDateShortEs(date: Date): string {
  return date.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
}

// ═══════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════

export { getOccasionNameEn, getOccasionNameEs };
