import { NextRequest, NextResponse } from "next/server";
import {
  findGuestProfile,
  createGuestProfile,
  processBookingForGuestProfile,
  searchGuestProfiles,
  getGuestProfileWithHistory,
  updateGuestPreferences,
  addSpecialDate,
  markAsVIP,
  getOccasionTasksForDate,
} from "@/lib/guest-profile";
import { createServerClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// GUEST PROFILE API
// Issues #16 & #17: Reconocimiento de huéspedes + Ocasiones especiales
// ═══════════════════════════════════════════════════════════════

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    switch (action) {
      // ─── BUSCAR PERFIL POR EMAIL/PHONE ───
      case "find": {
        const email = searchParams.get("email");
        const phone = searchParams.get("phone");

        if (!email && !phone) {
          return NextResponse.json(
            { error: "Se requiere email o phone" },
            { status: 400 },
          );
        }

        const profile = await findGuestProfile(email, phone);
        return NextResponse.json({
          found: !!profile,
          profile,
        });
      }

      // ─── OBTENER PERFIL CON HISTORIAL ───
      case "profile": {
        const profileId = searchParams.get("id");

        if (!profileId) {
          return NextResponse.json(
            { error: "Se requiere id del perfil" },
            { status: 400 },
          );
        }

        const result = await getGuestProfileWithHistory(profileId);

        if (!result) {
          return NextResponse.json(
            { error: "Perfil no encontrado" },
            { status: 404 },
          );
        }

        return NextResponse.json(result);
      }

      // ─── BUSCAR PERFILES ───
      case "search": {
        const query = searchParams.get("q");

        if (!query || query.length < 2) {
          return NextResponse.json(
            { error: "Término de búsqueda muy corto" },
            { status: 400 },
          );
        }

        const profiles = await searchGuestProfiles(query);
        return NextResponse.json({ profiles });
      }

      // ─── OBTENER TAREAS DE OCASIÓN ───
      case "occasion_tasks": {
        const date =
          searchParams.get("date") || new Date().toISOString().split("T")[0];
        const department = searchParams.get("department");

        const tasks = await getOccasionTasksForDate(
          date,
          department || undefined,
        );
        return NextResponse.json({ tasks });
      }

      // ─── LISTAR PERFILES RECIENTES ───
      case "recent": {
        const limit = parseInt(searchParams.get("limit") || "20");
        const supabase = createServerClient();

        const { data, error } = await supabase
          .from("guest_profiles")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(limit);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profiles: data });
      }

      // ─── LISTAR HUÉSPEDES VIP ───
      case "vip": {
        const supabase = createServerClient();

        const { data, error } = await supabase
          .from("guest_profiles")
          .select("*")
          .eq("is_vip", true)
          .order("total_stays", { ascending: false });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ profiles: data });
      }

      // ─── OBTENER RESERVAS DE HOY CON INFO DE HUÉSPED ───
      case "today_arrivals": {
        const supabase = createServerClient();
        const today = new Date().toISOString().split("T")[0];

        const { data, error } = await supabase
          .from("villa_bookings")
          .select(
            `
            *,
            guest_profile:guest_profiles(*)
          `,
          )
          .eq("check_in", today)
          .not("status", "eq", "cancelled");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({
          arrivals: data,
          count: data?.length || 0,
        });
      }

      default:
        return NextResponse.json(
          { error: `Acción desconocida: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[GuestProfileAPI GET]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    switch (action) {
      // ─── CREAR PERFIL NUEVO ───
      case "create": {
        const { email, phone, name, country, language } = body;

        if (!name) {
          return NextResponse.json(
            { error: "Se requiere nombre" },
            { status: 400 },
          );
        }

        // Verificar si ya existe
        const existing = await findGuestProfile(email, phone);
        if (existing) {
          return NextResponse.json({
            created: false,
            message: "Ya existe un perfil con este email/teléfono",
            profile: existing,
          });
        }

        const profile = await createGuestProfile({
          email,
          phone,
          name,
          country,
          language,
          createdBy: body.createdBy || "staff",
        });

        if (!profile) {
          return NextResponse.json(
            { error: "Error al crear perfil" },
            { status: 500 },
          );
        }

        return NextResponse.json({
          created: true,
          profile,
        });
      }

      // ─── PROCESAR RESERVA PARA MATCHING ───
      case "process_booking": {
        const { booking } = body;

        if (!booking || !booking.id) {
          return NextResponse.json(
            { error: "Se requiere información de la reserva" },
            { status: 400 },
          );
        }

        const result = await processBookingForGuestProfile(booking);

        return NextResponse.json({
          success: true,
          ...result,
        });
      }

      // ─── ACTUALIZAR PREFERENCIAS ───
      case "update_preferences": {
        const { profileId, preferences } = body;

        if (!profileId || !preferences) {
          return NextResponse.json(
            { error: "Se requiere profileId y preferences" },
            { status: 400 },
          );
        }

        const success = await updateGuestPreferences(profileId, preferences);

        return NextResponse.json({ success });
      }

      // ─── AGREGAR FECHA ESPECIAL ───
      case "add_special_date": {
        const { profileId, specialDate } = body;

        if (!profileId || !specialDate) {
          return NextResponse.json(
            { error: "Se requiere profileId y specialDate" },
            { status: 400 },
          );
        }

        const success = await addSpecialDate(profileId, specialDate);

        return NextResponse.json({ success });
      }

      // ─── MARCAR COMO VIP ───
      case "mark_vip": {
        const { profileId, reason } = body;

        if (!profileId) {
          return NextResponse.json(
            { error: "Se requiere profileId" },
            { status: 400 },
          );
        }

        const success = await markAsVIP(profileId, reason);

        return NextResponse.json({ success });
      }

      // ─── ACTUALIZAR PERFIL ───
      case "update": {
        const { profileId, data } = body;

        if (!profileId || !data) {
          return NextResponse.json(
            { error: "Se requiere profileId y data" },
            { status: 400 },
          );
        }

        const supabase = createServerClient();
        const { error } = await supabase
          .from("guest_profiles")
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      // ─── COMPLETAR TAREA DE OCASIÓN ───
      case "complete_occasion_task": {
        const { taskId, completedBy, notes } = body;

        if (!taskId) {
          return NextResponse.json(
            { error: "Se requiere taskId" },
            { status: 400 },
          );
        }

        const supabase = createServerClient();
        const { error } = await supabase
          .from("occasion_tasks")
          .update({
            status: "completed",
            completed_at: new Date().toISOString(),
            completed_by: completedBy || "staff",
            completion_notes: notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", taskId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      // ─── AGREGAR ALERGIA/DIETA ───
      case "add_dietary": {
        const { profileId, type, value } = body;

        if (!profileId || !type || !value) {
          return NextResponse.json(
            { error: "Se requiere profileId, type, y value" },
            { status: 400 },
          );
        }

        const supabase = createServerClient();
        const column = type === "allergy" ? "allergies" : "dietary_preferences";

        const { data: current } = await supabase
          .from("guest_profiles")
          .select(column)
          .eq("id", profileId)
          .single();

        const existingArray = (current?.[column] as string[]) || [];
        if (!existingArray.includes(value)) {
          const { error } = await supabase
            .from("guest_profiles")
            .update({
              [column]: [...existingArray, value],
              updated_at: new Date().toISOString(),
            })
            .eq("id", profileId);

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
        }

        return NextResponse.json({ success: true });
      }

      // ─── AGREGAR NOTA INTERNA ───
      case "add_note": {
        const { profileId, note, author } = body;

        if (!profileId || !note) {
          return NextResponse.json(
            { error: "Se requiere profileId y note" },
            { status: 400 },
          );
        }

        const supabase = createServerClient();
        const { data: current } = await supabase
          .from("guest_profiles")
          .select("internal_notes")
          .eq("id", profileId)
          .single();

        const timestamp = new Date().toISOString().split("T")[0];
        const newNote = `[${timestamp}${author ? ` - ${author}` : ""}] ${note}`;
        const updatedNotes = current?.internal_notes
          ? `${current.internal_notes}\n${newNote}`
          : newNote;

        const { error } = await supabase
          .from("guest_profiles")
          .update({
            internal_notes: updatedNotes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", profileId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json(
          { error: `Acción desconocida: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[GuestProfileAPI POST]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
