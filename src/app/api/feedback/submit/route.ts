// ============================================
// FEEDBACK SUBMISSION API (Issue #77) - SIMPLIFIED
// Submit guest feedback
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// Validation schema
const submitSchema = z.object({
  token: z.string().min(1),
  overall_rating: z.number().int().min(1).max(5),
  nps_score: z.number().int().min(0).max(10).nullable().optional(),
  comment: z.string().nullable().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = submitSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid input", details: validation.error.issues },
        { status: 400 },
      );
    }

    const { token, overall_rating, nps_score, comment } = validation.data;
    const supabase = createServerClient();

    // Find the feedback record by token
    const { data: feedback, error: fetchError } = await supabase
      .from("guest_feedback")
      .select("id, submitted_at")
      .eq("token", token)
      .single();

    if (fetchError || !feedback) {
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

    // Update the feedback record
    const { error: updateError } = await supabase
      .from("guest_feedback")
      .update({
        overall_rating,
        nps_score: nps_score ?? null,
        comment: comment ?? null,
        submitted_at: new Date().toISOString(),
      })
      .eq("id", feedback.id);

    if (updateError) {
      console.error("[feedback/submit] Update error:", updateError);
      return NextResponse.json(
        { error: "Failed to submit feedback" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Thank you for your feedback!",
    });
  } catch (error) {
    console.error("[feedback/submit] Error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
