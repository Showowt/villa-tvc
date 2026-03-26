// ============================================
// TRAINING API - DISABLED
// Tables (training_programs, staff_certifications, training_sop_content, training_quiz_questions)
// not in current schema
// TODO: Re-enable when training system is implemented
// ============================================

import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  return NextResponse.json({
    success: true,
    programs: [],
    certifications: [],
    message: "Training system disabled - tables not configured",
    action,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));

  return NextResponse.json({
    success: false,
    message: "Training system disabled - tables not configured",
    action: body.action,
  });
}
