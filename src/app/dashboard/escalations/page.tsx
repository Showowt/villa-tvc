import Link from "next/link";
import { getPendingEscalations } from "@/lib/supabase/queries";
import type { Escalation, Conversation, Guest } from "@/types";

export const dynamic = "force-dynamic";

export default async function EscalationsPage() {
  let escalations: Escalation[] = [];

  try {
    escalations = await getPendingEscalations();
  } catch (error) {
    console.error("[Escalations] Error fetching:", error);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="font-display text-3xl font-bold text-white">
            Escalations
          </h1>
          {escalations.length > 0 && (
            <span className="badge badge-danger">
              {escalations.length} pending
            </span>
          )}
        </div>
        <p className="text-white/60">Conversations that need human attention</p>
      </div>

      {/* Escalations List */}
      {escalations.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">All clear!</h3>
          <p className="text-white/60 max-w-md mx-auto">
            No pending escalations. Villa is handling all conversations
            smoothly.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {escalations.map((escalation) => (
            <EscalationCard key={escalation.id} escalation={escalation} />
          ))}
        </div>
      )}
    </div>
  );
}

function EscalationCard({ escalation }: { escalation: Escalation }) {
  const conversation = escalation.conversation as
    | (Conversation & { guest?: Guest })
    | undefined;
  const guest = conversation?.guest;

  const priorityColors: Record<string, string> = {
    critical: "border-red-500 bg-red-500/10",
    high: "border-orange-500 bg-orange-500/10",
    medium: "border-yellow-500 bg-yellow-500/10",
    low: "border-blue-500 bg-blue-500/10",
  };

  // Determine priority from reason
  const getPriority = (reason: string): string => {
    const lowerReason = reason.toLowerCase();
    if (
      lowerReason.includes("critical") ||
      lowerReason.includes("emergency") ||
      lowerReason.includes("hospital")
    ) {
      return "critical";
    }
    if (
      lowerReason.includes("high") ||
      lowerReason.includes("manager") ||
      lowerReason.includes("refund")
    ) {
      return "high";
    }
    if (lowerReason.includes("medium") || lowerReason.includes("human")) {
      return "medium";
    }
    return "low";
  };

  const priority = getPriority(escalation.reason);

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className={`card border-l-4 ${priorityColors[priority]}`}>
      <div className="flex items-start justify-between mb-4">
        {/* Guest Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {guest?.name || "Unknown Guest"}
            </h3>
            <p className="text-sm text-white/60">{guest?.phone}</p>
          </div>
        </div>

        {/* Time & Priority */}
        <div className="text-right">
          <span className={`badge badge-danger capitalize`}>{priority}</span>
          <p className="text-xs text-white/40 mt-2">
            {formatTime(escalation.created_at)}
          </p>
        </div>
      </div>

      {/* Reason */}
      <div className="mb-4 p-3 bg-admin-border/30 rounded-lg">
        <p className="text-sm text-white/80">{escalation.reason}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Link
          href={`/dashboard/conversations/${conversation?.id}`}
          className="btn-primary text-sm"
        >
          View Conversation
        </Link>
        <a
          href={`https://wa.me/${guest?.phone?.replace("+", "")}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary text-sm"
        >
          Message on WhatsApp
        </a>
        <button className="btn-secondary text-sm">Mark Resolved</button>
      </div>
    </div>
  );
}
