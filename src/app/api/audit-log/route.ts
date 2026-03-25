import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseAny = any;

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const tableName = searchParams.get("table");
    const recordId = searchParams.get("record_id");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "100");
    const offset = parseInt(searchParams.get("offset") || "0");
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");

    const supabase = createServerClient() as SupabaseAny;

    // Build query
    let query = supabase
      .from("audit_log")
      .select(
        `
        *,
        user:users!audit_log_user_id_fkey(name, email, role)
      `,
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (tableName) {
      query = query.eq("table_name", tableName);
    }
    if (recordId) {
      query = query.eq("record_id", recordId);
    }
    if (action) {
      query = query.eq("action", action);
    }
    if (startDate) {
      query = query.gte("created_at", startDate);
    }
    if (endDate) {
      query = query.lte("created_at", endDate);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[audit-log]", error);
      return NextResponse.json(
        { error: "Failed to fetch audit log" },
        { status: 500 },
      );
    }

    // Get summary stats
    const { data: summaryData } = await supabase
      .from("audit_log")
      .select("action, table_name")
      .gte(
        "created_at",
        new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      );

    interface AuditSummaryRecord {
      action: string;
      table_name: string;
    }

    const summary = {
      total_entries: count || 0,
      last_24h: {
        inserts:
          summaryData?.filter((r: AuditSummaryRecord) => r.action === "INSERT")
            .length || 0,
        updates:
          summaryData?.filter((r: AuditSummaryRecord) => r.action === "UPDATE")
            .length || 0,
        deletes:
          summaryData?.filter((r: AuditSummaryRecord) => r.action === "DELETE")
            .length || 0,
      },
      tables_affected: [
        ...new Set(
          summaryData?.map((r: AuditSummaryRecord) => r.table_name) || [],
        ),
      ],
    };

    return NextResponse.json({
      logs: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit,
      },
      summary,
    });
  } catch (error) {
    console.error("[audit-log]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
