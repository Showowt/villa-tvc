// ============================================
// SUPPLIER PERFORMANCE API - DISABLED
// Table (supplier_performance) not in current schema
// TODO: Re-enable when supplier tracking is implemented
// ============================================

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    success: true,
    suppliers: [],
    summary: {
      total_suppliers: 0,
      avg_reliability: 0,
      suppliers_with_issues: 0,
    },
    message: "Supplier performance disabled - table not configured",
  });
}
