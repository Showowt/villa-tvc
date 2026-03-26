// ============================================
// FEEDBACK TOKEN LOOKUP API (Issue #77) - SIMPLIFIED
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
      return NextResponse.json({ error: "Token is required" }, { status: 400 });
    }

    const supabase = createServerClient();

    // Find feedback by token
    const { data: feedback, error } = await supabase
      .from("guest_feedback")
      .select("id, guest_name, villa_id, check_out_date, submitted_at")
      .eq("token", token)
      .single();

    if (error || !feedback) {
      return NextResponse.json(
        { error: "Invalid or expired feedback link" },
        { status: 404 },
      );
    }

    if (feedback.submitted_at) {
      return NextResponse.json(
        { error: "Feedback already submitted" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      feedback: {
        id: feedback.id,
        guest_name: feedback.guest_name,
        villa_id: feedback.villa_id,
        check_out_date: feedback.check_out_date,
      },
    });
  } catch (error) {
    console.error("[feedback/token] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
