// ============================================
// GUEST FEEDBACK API (Issue 77)
// Submit and retrieve guest satisfaction surveys
// ============================================

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { z } from "zod";

// Validation schema for feedback submission
const feedbackSchema = z.object({
  reservation_id: z.string().uuid().optional(),
  villa_booking_id: z.string().uuid().optional(),
  villa_id: z.string().optional(),
  guest_name: z.string().min(1, "Name is required"),
  guest_email: z.string().email().optional(),
  guest_phone: z.string().optional(),
  guest_country: z.string().optional(),
  overall_rating: z.number().int().min(1).max(5),
  cleanliness_rating: z.number().int().min(1).max(5).optional(),
  service_rating: z.number().int().min(1).max(5).optional(),
  food_rating: z.number().int().min(1).max(5).optional(),
  location_rating: z.number().int().min(1).max(5).optional(),
  value_rating: z.number().int().min(1).max(5).optional(),
  nps_score: z.number().int().min(0).max(10).optional(),
  comment: z.string().optional(),
  staff_mentioned: z.array(z.string()).optional(),
  highlights: z.array(z.string()).optional(),
  improvements: z.array(z.string()).optional(),
  check_in_date: z.string().optional(),
  check_out_date: z.string().optional(),
  group_size: z.number().int().positive().optional(),
  language: z.enum(["es", "en", "fr"]).default("es"),
  source: z
    .enum(["survey", "manual", "google", "tripadvisor"])
    .default("survey"),
});

// Determine season based on date
function getSeason(date: string): "high" | "shoulder" | "low" {
  const month = new Date(date).getMonth() + 1;
  // High season: Dec-Mar, Jul-Aug
  if ([12, 1, 2, 3, 7, 8].includes(month)) return "high";
  // Low season: May, Sep, Oct
  if ([5, 9, 10].includes(month)) return "low";
  // Shoulder: Apr, Jun, Nov
  return "shoulder";
}

// POST /api/feedback - Submit guest feedback
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = feedbackSchema.parse(body);

    const supabase = createServerClient();

    // Determine season
    const season = validated.check_out_date
      ? getSeason(validated.check_out_date)
      : getSeason(new Date().toISOString());

    const { data, error } = await supabase
      .from("guest_feedback")
      .insert({
        ...validated,
        season,
        submitted_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("[Feedback API] Insert error:", error);
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      data,
      message:
        validated.language === "es"
          ? "Gracias por sus comentarios!"
          : "Thank you for your feedback!",
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: "Invalid input", details: error.errors },
        { status: 400 },
      );
    }
    console.error("[Feedback API] Error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to submit feedback" },
      { status: 500 },
    );
  }
}

// GET /api/feedback - Get feedback with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const villa_id = searchParams.get("villa_id");
    const season = searchParams.get("season");
    const from_date = searchParams.get("from");
    const to_date = searchParams.get("to");
    const limit = parseInt(searchParams.get("limit") || "50");

    const supabase = createServerClient();

    let query = supabase
      .from("guest_feedback")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(limit);

    if (villa_id) query = query.eq("villa_id", villa_id);
    if (season) query = query.eq("season", season);
    if (from_date) query = query.gte("submitted_at", from_date);
    if (to_date) query = query.lte("submitted_at", to_date);

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 },
      );
    }

    // Calculate NPS from feedback
    const npsResponses = data?.filter((f) => f.nps_score !== null) || [];
    const promoters = npsResponses.filter(
      (f) => (f.nps_score as number) >= 9,
    ).length;
    const detractors = npsResponses.filter(
      (f) => (f.nps_score as number) <= 6,
    ).length;
    const nps =
      npsResponses.length > 0
        ? Math.round(((promoters - detractors) / npsResponses.length) * 100)
        : null;

    // Calculate averages
    const avgOverall =
      data && data.length > 0
        ? data.reduce((sum, f) => sum + (f.overall_rating || 0), 0) /
          data.length
        : null;

    return NextResponse.json({
      success: true,
      data,
      summary: {
        total_responses: data?.length || 0,
        nps,
        nps_responses: npsResponses.length,
        promoters,
        detractors,
        avg_overall_rating: avgOverall
          ? Math.round(avgOverall * 10) / 10
          : null,
      },
    });
  } catch (error) {
    console.error("[Feedback API] GET error:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch feedback" },
      { status: 500 },
    );
  }
}
