import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TRAINING API - Issue #44
// Sistema de capacitacion del personal
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    const supabase = createServerClient();

    switch (action) {
      // ─── INICIAR CAPACITACION ───
      case "start_training": {
        const { userId, trainingType, requirementId } = body;
        if (!userId || !trainingType) {
          return NextResponse.json(
            { error: "Se requiere userId y trainingType" },
            { status: 400 },
          );
        }

        // Obtener detalles del requirement
        const { data: requirement } = await supabase
          .from("training_requirements")
          .select("*")
          .eq("id", requirementId)
          .single();

        if (!requirement) {
          return NextResponse.json(
            { error: "Capacitacion no encontrada" },
            { status: 404 },
          );
        }

        // Verificar si ya existe
        const { data: existing } = await supabase
          .from("staff_training")
          .select("*")
          .eq("user_id", userId)
          .eq("training_type", trainingType)
          .single();

        if (existing) {
          // Actualizar a en progreso
          const { error } = await supabase
            .from("staff_training")
            .update({
              status: "in_progress",
              started_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          return NextResponse.json({ success: true, trainingId: existing.id });
        }

        // Crear nuevo registro
        const { data: newTraining, error: insertError } = await supabase
          .from("staff_training")
          .insert({
            user_id: userId,
            requirement_id: requirementId,
            department: requirement.department,
            training_type: trainingType,
            training_name: requirement.training_name,
            training_name_es: requirement.training_name_es,
            status: "in_progress",
            started_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 },
          );
        }

        return NextResponse.json({ success: true, trainingId: newTraining.id });
      }

      // ─── COMPLETAR CAPACITACION ───
      case "complete_training": {
        const { userId, trainingType, score, quizAnswers, requirementId } =
          body;
        if (!userId || !trainingType) {
          return NextResponse.json(
            { error: "Se requiere userId y trainingType" },
            { status: 400 },
          );
        }

        // Obtener detalles del requirement
        const { data: requirement } = await supabase
          .from("training_requirements")
          .select("*")
          .eq("id", requirementId)
          .single();

        // Calcular fecha de expiracion si aplica
        let expiresAt = null;
        if (requirement?.recertification_days) {
          expiresAt = new Date(
            Date.now() + requirement.recertification_days * 24 * 60 * 60 * 1000,
          ).toISOString();
        }

        // Determinar estado basado en puntaje
        const passingScore = requirement?.passing_score || 80;
        const passed = !score || score >= passingScore;
        const status = passed ? "completed" : "failed";

        // Verificar si ya existe
        const { data: existing } = await supabase
          .from("staff_training")
          .select("*")
          .eq("user_id", userId)
          .eq("training_type", trainingType)
          .single();

        if (existing) {
          const { error } = await supabase
            .from("staff_training")
            .update({
              status,
              score,
              quiz_answers: quizAnswers,
              completed_at: new Date().toISOString(),
              expires_at: expiresAt,
              attempts: (existing.attempts || 0) + 1,
              updated_at: new Date().toISOString(),
            })
            .eq("id", existing.id);

          if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
          }
          return NextResponse.json({
            success: true,
            trainingId: existing.id,
            passed,
            status,
          });
        }

        // Crear nuevo registro completado
        const { data: newTraining, error: insertError } = await supabase
          .from("staff_training")
          .insert({
            user_id: userId,
            requirement_id: requirementId,
            department: requirement?.department || "all",
            training_type: trainingType,
            training_name: requirement?.training_name || trainingType,
            training_name_es: requirement?.training_name_es || trainingType,
            status,
            score,
            quiz_answers: quizAnswers,
            completed_at: new Date().toISOString(),
            expires_at: expiresAt,
            attempts: 1,
          })
          .select()
          .single();

        if (insertError) {
          return NextResponse.json(
            { error: insertError.message },
            { status: 500 },
          );
        }

        return NextResponse.json({
          success: true,
          trainingId: newTraining.id,
          passed,
          status,
        });
      }

      // ─── CERTIFICAR (Manager) ───
      case "certify_training": {
        const { trainingId, certifiedBy, notes } = body;
        if (!trainingId || !certifiedBy) {
          return NextResponse.json(
            { error: "Se requiere trainingId y certifiedBy" },
            { status: 400 },
          );
        }

        const { error } = await supabase
          .from("staff_training")
          .update({
            certified_by: certifiedBy,
            certified_at: new Date().toISOString(),
            notes,
            updated_at: new Date().toISOString(),
          })
          .eq("id", trainingId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      // ─── RENOVAR CAPACITACION VENCIDA ───
      case "renew_training": {
        const { trainingId } = body;
        if (!trainingId) {
          return NextResponse.json(
            { error: "Se requiere trainingId" },
            { status: 400 },
          );
        }

        const { error } = await supabase
          .from("staff_training")
          .update({
            status: "pending",
            score: null,
            quiz_answers: null,
            completed_at: null,
            expires_at: null,
            certified_by: null,
            certified_at: null,
            attempts: 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", trainingId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true });
      }

      // ─── VERIFICAR SI PUEDE RECIBIR TAREAS ───
      case "check_can_receive_tasks": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json(
            { error: "Se requiere userId" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase.rpc(
          "check_staff_training_status",
          { p_user_id: userId },
        );

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
      }

      // ─── OBTENER RESUMEN DE CAPACITACIONES ───
      case "get_summary": {
        const { userId } = body;
        if (!userId) {
          return NextResponse.json(
            { error: "Se requiere userId" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase.rpc(
          "get_staff_training_summary",
          { p_user_id: userId },
        );

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
      }

      // ─── MARCAR CAPACITACIONES VENCIDAS ───
      case "mark_expired": {
        const { data, error } = await supabase.rpc("mark_expired_trainings");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, expiredCount: data });
      }

      default:
        return NextResponse.json(
          { error: `Accion desconocida: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[TrainingAPI]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");
    const userId = searchParams.get("userId");
    const department = searchParams.get("department");

    switch (view) {
      // ─── OBTENER REQUISITOS POR DEPARTAMENTO ───
      case "requirements": {
        let query = supabase
          .from("training_requirements")
          .select("*")
          .eq("is_active", true)
          .order("sort_order");

        if (department && department !== "all") {
          query = query.or(`department.eq.${department},department.eq.all`);
        }

        const { data, error } = await query;

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ requirements: data });
      }

      // ─── OBTENER CAPACITACIONES DE UN USUARIO ───
      case "user_trainings": {
        if (!userId) {
          return NextResponse.json(
            { error: "Se requiere userId" },
            { status: 400 },
          );
        }

        // Obtener perfil del usuario
        const { data: profile } = await supabase
          .from("users")
          .select("id, name, department, role")
          .eq("id", userId)
          .single();

        if (!profile) {
          return NextResponse.json(
            { error: "Usuario no encontrado" },
            { status: 404 },
          );
        }

        // Obtener requisitos para su departamento
        const { data: requirements } = await supabase
          .from("training_requirements")
          .select("*")
          .eq("is_active", true)
          .or(`department.eq.${profile.department},department.eq.all`)
          .order("sort_order");

        // Obtener estado de capacitaciones del usuario
        const { data: userTrainings } = await supabase
          .from("staff_training")
          .select("*")
          .eq("user_id", userId);

        // Combinar requisitos con estado del usuario
        const merged = (requirements || []).map((req) => {
          const userStatus = userTrainings?.find(
            (t) => t.training_type === req.training_type,
          );
          return {
            ...req,
            userStatus,
          };
        });

        // Calcular estadisticas
        const completed = merged.filter(
          (t) =>
            t.userStatus?.status === "completed" &&
            (!t.userStatus?.expires_at ||
              new Date(t.userStatus.expires_at) > new Date()),
        ).length;
        const expired = merged.filter(
          (t) =>
            t.userStatus?.status === "completed" &&
            t.userStatus?.expires_at &&
            new Date(t.userStatus.expires_at) < new Date(),
        ).length;
        const pending = merged.length - completed - expired;

        return NextResponse.json({
          user: profile,
          trainings: merged,
          stats: {
            total: merged.length,
            completed,
            pending,
            expired,
            progress:
              merged.length > 0
                ? Math.round((completed / merged.length) * 100)
                : 0,
          },
        });
      }

      // ─── OBTENER TODOS LOS STAFF CON SU ESTADO DE CAPACITACION ───
      case "all_staff": {
        const { data: staff, error } = await supabase
          .from("users")
          .select("id, name, department, role, is_active")
          .eq("role", "staff")
          .eq("is_active", true)
          .order("name");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // Obtener resumen de capacitaciones de cada empleado
        const staffWithTraining = await Promise.all(
          (staff || []).map(async (s) => {
            const { data: summary } = await supabase.rpc(
              "get_staff_training_summary",
              { p_user_id: s.id },
            );
            const { data: canWork } = await supabase.rpc(
              "check_staff_training_status",
              { p_user_id: s.id },
            );
            return {
              ...s,
              trainingSummary: summary,
              canReceiveTasks: canWork?.can_receive_tasks ?? true,
              blockedBy: canWork?.blocked_by ?? [],
            };
          }),
        );

        return NextResponse.json({ staff: staffWithTraining });
      }

      // ─── OBTENER CONTENIDO SOP ───
      case "sop_content": {
        const requirementId = searchParams.get("requirementId");
        if (!requirementId) {
          return NextResponse.json(
            { error: "Se requiere requirementId" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase
          .from("training_sop_content")
          .select("*")
          .eq("requirement_id", requirementId)
          .eq("is_active", true)
          .order("sort_order");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ content: data });
      }

      // ─── OBTENER PREGUNTAS DE QUIZ ───
      case "quiz_questions": {
        const requirementId = searchParams.get("requirementId");
        if (!requirementId) {
          return NextResponse.json(
            { error: "Se requiere requirementId" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase
          .from("training_quiz_questions")
          .select(
            "id, question, question_es, question_type, options, points, sort_order",
          )
          .eq("requirement_id", requirementId)
          .eq("is_active", true)
          .order("sort_order");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        // No enviar respuestas correctas al cliente
        return NextResponse.json({ questions: data });
      }

      // ─── CAPACITACIONES QUE EXPIRAN PRONTO ───
      case "expiring_soon": {
        const daysAhead = parseInt(searchParams.get("days") || "30");
        const cutoffDate = new Date(
          Date.now() + daysAhead * 24 * 60 * 60 * 1000,
        ).toISOString();

        const { data, error } = await supabase
          .from("staff_training")
          .select("*, users!user_id(name, department)")
          .eq("status", "completed")
          .not("expires_at", "is", null)
          .lte("expires_at", cutoffDate)
          .order("expires_at");

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ expiring: data });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Vista desconocida. Use: requirements, user_trainings, all_staff, sop_content, quiz_questions, expiring_soon",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.error("[TrainingAPI GET]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
