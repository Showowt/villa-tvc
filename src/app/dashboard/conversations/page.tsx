import Link from "next/link";
import { getAllConversations } from "@/lib/supabase/queries";
import type { Conversation, Message } from "@/types";

export const dynamic = "force-dynamic";

export default async function ConversationsPage() {
  let conversations: Conversation[] = [];

  try {
    conversations = await getAllConversations();
  } catch (error) {
    console.error("[Conversations] Error fetching:", error);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-white mb-2">
            Conversations
          </h1>
          <p className="text-white/60">
            All guest conversations with Villa concierge
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <select className="bg-admin-surface border border-admin-border rounded-lg px-4 py-2 text-white">
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="escalated">Escalated</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
        </div>
      </div>

      {/* Conversations List */}
      {conversations.length === 0 ? (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-admin-border rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No conversations yet
          </h3>
          <p className="text-white/60 max-w-md mx-auto">
            When guests message Villa on WhatsApp, their conversations will
            appear here. Share your WhatsApp number to start receiving messages!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ConversationCard({ conversation }: { conversation: Conversation }) {
  const guest = conversation.guest;
  const messages = (conversation.messages as Message[]) || [];
  const lastMessage = messages[messages.length - 1];

  const statusColors = {
    active: "badge-success",
    escalated: "badge-danger",
    resolved: "badge-info",
    closed: "badge-warning",
  };

  const statusLabels = {
    active: "Active",
    escalated: "Escalated",
    resolved: "Resolved",
    closed: "Closed",
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  return (
    <Link
      href={`/dashboard/conversations/${conversation.id}`}
      className="card card-hover block"
    >
      <div className="flex items-start justify-between">
        {/* Guest Info */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-tvc-turquoise/20 rounded-full flex items-center justify-center">
            <span className="text-tvc-turquoise font-semibold">
              {guest?.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <h3 className="font-semibold text-white">
              {guest?.name || "Unknown Guest"}
            </h3>
            <p className="text-sm text-white/60">{guest?.phone}</p>
          </div>
        </div>

        {/* Status & Time */}
        <div className="text-right">
          <span className={`badge ${statusColors[conversation.status]}`}>
            {statusLabels[conversation.status]}
          </span>
          <p className="text-xs text-white/40 mt-2">
            {formatTime(conversation.last_message_at)}
          </p>
        </div>
      </div>

      {/* Last Message Preview */}
      {lastMessage && (
        <div className="mt-4 pt-4 border-t border-admin-border">
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs ${lastMessage.role === "guest" ? "text-tvc-turquoise" : "text-white/60"}`}
            >
              {lastMessage.role === "guest" ? "Guest" : "Villa"}
            </span>
          </div>
          <p className="text-sm text-white/80 line-clamp-2">
            {lastMessage.content}
          </p>
        </div>
      )}

      {/* Message Count */}
      <div className="mt-4 flex items-center gap-4 text-xs text-white/40">
        <span>{messages.length} messages</span>
        <span>•</span>
        <span>
          Language:{" "}
          {guest?.language === "es"
            ? "Spanish"
            : guest?.language === "fr"
              ? "French"
              : "English"}
        </span>
        <span>•</span>
        <span>Stage: {guest?.journey_stage || "discovery"}</span>
      </div>
    </Link>
  );
}
