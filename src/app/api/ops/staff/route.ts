import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  markStaffAbsent,
  createPendingApproval,
  checkAndEscalateApprovals,
  resolveApproval,
  StaffAbsenceInput,
} from "@/lib/operations-hub-extended";

// ═══════════════════════════════════════════════════════════════
// STAFF OPERATIONS API
// Issues 38, 43: Absence handling, Manager delegation
// ═══════════════════════════════════════════════════════════════

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId = "system" } = body;
    const supabase = createServerClient();

    switch (action) {
      // ─── ISSUE 43: MARK STAFF ABSENT ───
      case "mark_absent": {
        const { staffUserId, absenceDate, reason, reasonDetails } = body;
        if (!staffUserId || !absenceDate || !reason) {
          return NextResponse.json(
            {
              error:
                "Missing required fields: staffUserId, absenceDate, reason",
            },
            { status: 400 },
          );
        }
        const input: StaffAbsenceInput = {
          userId: staffUserId,
          absenceDate,
          reason,
          reasonDetails,
        };
        const result = await markStaffAbsent(input, userId);
        return NextResponse.json(result);
      }

      // ─── ISSUE 38: CREATE DELEGATION ───
      case "create_delegation": {
        const {
          primaryApproverId,
          backupApproverId,
          delegationType,
          timeoutMinutes,
        } = body;
        if (!primaryApproverId || !backupApproverId) {
          return NextResponse.json(
            { error: "Missing primaryApproverId or backupApproverId" },
            { status: 400 },
          );
        }

        const { data, error } = await supabase
          .from("approval_delegations")
          .insert({
            primary_approver_id: primaryApproverId,
            backup_approver_id: backupApproverId,
            delegation_type: delegationType || "all",
            timeout_minutes: timeoutMinutes || 30,
            is_active: true,
          })
          .select()
          .single();

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true, delegation: data });
      }

      // ─── ISSUE 38: UPDATE DELEGATION ───
      case "update_delegation": {
        const { delegationId, isActive, timeoutMinutes: newTimeout } = body;
        if (!delegationId) {
          return NextResponse.json(
            { error: "Missing delegationId" },
            { status: 400 },
          );
        }

        const updates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (isActive !== undefined) updates.is_active = isActive;
        if (newTimeout !== undefined) updates.timeout_minutes = newTimeout;

        const { error } = await supabase
          .from("approval_delegations")
          .update(updates)
          .eq("id", delegationId);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
      }

      // ─── ISSUE 38: CREATE PENDING APPROVAL ───
      case "create_pending_approval": {
        const { approvalType, relatedId, assignedTo, timeoutMinutes } = body;
        if (!approvalType || !relatedId || !assignedTo) {
          return NextResponse.json(
            { error: "Missing approvalType, relatedId, or assignedTo" },
            { status: 400 },
          );
        }

        const approvalId = await createPendingApproval(
          approvalType,
          relatedId,
          assignedTo,
          timeoutMinutes || 30,
        );
        return NextResponse.json({ success: true, approvalId });
      }

      // ─── ISSUE 38: CHECK AND ESCALATE APPROVALS ───
      case "check_escalations": {
        const result = await checkAndEscalateApprovals();
        return NextResponse.json(result);
      }

      // ─── ISSUE 38: RESOLVE APPROVAL ───
      case "resolve_approval": {
        const { approvalId, status: approvalStatus } = body;
        if (!approvalId || !approvalStatus) {
          return NextResponse.json(
            { error: "Missing approvalId or status" },
            { status: 400 },
          );
        }

        const success = await resolveApproval(
          approvalId,
          approvalStatus,
          userId,
        );
        return NextResponse.json({ success });
      }

      // ─── GET STAFF ABSENCES ───
      case "get_absences": {
        const { date, staffUserId: targetUserId } = body;
        let query = supabase
          .from("staff_absences")
          .select("*, users!user_id(name, department)")
          .order("absence_date", { ascending: false });

        if (date) {
          query = query.eq("absence_date", date);
        }
        if (targetUserId) {
          query = query.eq("user_id", targetUserId);
        }

        const { data, error } = await query.limit(50);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ absences: data });
      }

      // ─── GET DELEGATIONS ───
      case "get_delegations": {
        const { data, error } = await supabase
          .from("approval_delegations")
          .select(
            `
            *,
            primary_user:users!primary_approver_id(name, email),
            backup_user:users!backup_approver_id(name, email)
          `,
          )
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ delegations: data });
      }

      // ─── GET PENDING APPROVALS ───
      case "get_pending_approvals": {
        const { status: filterStatus } = body;
        let query = supabase
          .from("pending_approvals")
          .select("*, users!assigned_to(name)")
          .order("created_at", { ascending: false });

        if (filterStatus) {
          query = query.eq("status", filterStatus);
        }

        const { data, error } = await query.limit(50);
        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ approvals: data });
      }

      default:
        return NextResponse.json(
          { error: `Unknown action: ${action}` },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[StaffAPI]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(req.url);
    const view = searchParams.get("view");

    switch (view) {
      case "absences_today": {
        const today = new Date().toISOString().split("T")[0];
        const { data, error } = await supabase
          .from("staff_absences")
          .select("*, users!user_id(name, department)")
          .eq("absence_date", today);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ absences: data });
      }

      case "delegations": {
        const { data, error } = await supabase
          .from("approval_delegations")
          .select(
            `
            *,
            primary_user:users!primary_approver_id(name, email),
            backup_user:users!backup_approver_id(name, email)
          `,
          )
          .eq("is_active", true);

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ delegations: data });
      }

      case "pending_approvals": {
        const { data, error } = await supabase
          .from("pending_approvals")
          .select("*, users!assigned_to(name)")
          .eq("status", "pending")
          .order("timeout_at", { ascending: true });

        if (error) {
          return NextResponse.json({ error: error.message }, { status: 500 });
        }
        return NextResponse.json({ approvals: data });
      }

      default:
        return NextResponse.json(
          {
            error:
              "Unknown view. Use: absences_today, delegations, pending_approvals",
          },
          { status: 400 },
        );
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    console.error("[StaffAPI GET]", error);
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
