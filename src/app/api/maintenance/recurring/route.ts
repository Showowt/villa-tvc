// ═══════════════════════════════════════════════════════════════
// MANTENIMIENTO PREVENTIVO - API - DISABLED
// Schema mismatches (next_due_at vs next_due_date)
// TODO: Re-enable when schema types are regenerated
// ═══════════════════════════════════════════════════════════════

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    tasks: [],
    summary: {
      total: 0,
      overdue: 0,
      upcoming_7_days: 0,
    },
    message: "Recurring maintenance disabled - schema alignment needed",
  });
}

export async function POST() {
  return NextResponse.json({
    success: false,
    message: "Recurring maintenance disabled - schema alignment needed",
  });
}
