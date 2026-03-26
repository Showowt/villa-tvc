// ═══════════════════════════════════════════════════════════════
// EXPORT API - Issue #35 - DISABLED
// Schema mismatches prevent type-safe queries
// TODO: Re-enable when database types are regenerated
// ═══════════════════════════════════════════════════════════════

import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ table: string }> },
) {
  const { table } = await params;

  return NextResponse.json(
    {
      success: false,
      error: "Export functionality temporarily disabled",
      message: "Database schema types need to be regenerated. Contact admin.",
      table,
    },
    { status: 503 },
  );
}
