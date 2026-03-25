import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import { notifyEscalation } from "@/lib/push-notifications";

// This endpoint should be called by a cron job every 5-10 minutes
export async function GET() {
  try {
    const supabase = createServerClient();
    const now = new Date();

    // Get all escalated conversations that haven't been resolved
    const { data: escalatedConvos, error } = await supabase
      .from("conversations")
      .select(
        "*, escalated_to:users!conversations_escalated_to_fkey(name, phone)",
      )
      .eq("status", "escalated")
      .is("resolved_at", null);

    if (error) {
      console.error("[check-timeouts]", error);
      return NextResponse.json(
        { error: "Failed to fetch escalations" },
        { status: 500 },
      );
    }

    const results = {
      checked: escalatedConvos?.length || 0,
      reminders_sent: 0,
      backup_notified: 0,
      marked_critical: 0,
    };

    for (const convo of escalatedConvos || []) {
      const escalatedAt = new Date(convo.escalated_at);
      const minutesSinceEscalation =
        (now.getTime() - escalatedAt.getTime()) / (1000 * 60);
      const reminderCount = convo.reminder_count || 0;
      const lastReminderAt = convo.last_reminder_at
        ? new Date(convo.last_reminder_at)
        : null;
      const minutesSinceLastReminder = lastReminderAt
        ? (now.getTime() - lastReminderAt.getTime()) / (1000 * 60)
        : minutesSinceEscalation;

      // 30 min: First reminder
      if (minutesSinceEscalation >= 30 && reminderCount === 0) {
        await supabase
          .from("conversations")
          .update({
            reminder_count: 1,
            escalation_priority: "elevated",
            last_reminder_at: now.toISOString(),
            escalation_timeout_at: new Date(
              now.getTime() + 30 * 60 * 1000,
            ).toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", convo.id);

        // Here you would send notification via Twilio
        console.log(`[escalation] 30min reminder for conversation ${convo.id}`);
        results.reminders_sent++;
      }
      // 60 min: Notify backup manager
      else if (
        minutesSinceEscalation >= 60 &&
        reminderCount === 1 &&
        !convo.backup_notified_at
      ) {
        await supabase
          .from("conversations")
          .update({
            reminder_count: 2,
            backup_notified_at: now.toISOString(),
            last_reminder_at: now.toISOString(),
            escalation_timeout_at: new Date(
              now.getTime() + 60 * 60 * 1000,
            ).toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", convo.id);

        // Here you would notify backup manager via Twilio
        console.log(
          `[escalation] 1hr backup notification for conversation ${convo.id}`,
        );
        results.backup_notified++;
      }
      // 120 min: Mark as critical
      else if (
        minutesSinceEscalation >= 120 &&
        convo.escalation_priority !== "critical"
      ) {
        await supabase
          .from("conversations")
          .update({
            reminder_count: reminderCount + 1,
            escalation_priority: "critical",
            last_reminder_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", convo.id);

        // Here you would send critical notification
        console.log(
          `[escalation] CRITICAL: conversation ${convo.id} unresolved for 2+ hours`,
        );
        results.marked_critical++;
      }
      // Re-notify every 30 min after initial escalation
      else if (minutesSinceLastReminder >= 30 && reminderCount > 0) {
        await supabase
          .from("conversations")
          .update({
            reminder_count: reminderCount + 1,
            last_reminder_at: now.toISOString(),
            updated_at: now.toISOString(),
          })
          .eq("id", convo.id);

        console.log(
          `[escalation] Follow-up reminder ${reminderCount + 1} for conversation ${convo.id}`,
        );
        results.reminders_sent++;
      }
    }

    return NextResponse.json({
      success: true,
      ...results,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[check-timeouts]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

// Also support POST for manual trigger
export async function POST() {
  return GET();
}
