// ============================================
// FEEDBACK TOKEN LOOKUP API (Issue #77)
// Get feedback form data by secure token
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await context.params;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token required" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Look up feedback by token
    const { data: feedback, error } = await supabase
      .from("guest_feedback")
      .select(
        `
        id,
        guest_name,
        booking_id,
        check_out_date,
        villa_id,
        overall_rating,
        submitted_at
      `,
      )
      .eq("review_link_token", token)
      .single();

    if (error || !feedback) {
      return NextResponse.json(
        { success: false, error: "Token no valido o expirado" },
        { status: 404 },
      );
    }

    // Determine status
    const status = feedback.submitted_at ? "submitted" : "pending";

    return NextResponse.json({
      success: true,
      data: {
        id: feedback.id,
        guest_name: feedback.guest_name,
        booking_id: feedback.booking_id,
        check_out_date: feedback.check_out_date,
        villa_id: feedback.villa_id,
        status,
      },
    });
  } catch (error) {
    console.error("[Feedback Token API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Error al verificar token" },
      { status: 500 },
    );
  }
}
