import Link from "next/link";
import { notFound } from "next/navigation";
import { getConversationById } from "@/lib/supabase/queries";
import type { Message } from "@/types";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConversationDetailPage({ params }: PageProps) {
  const { id } = await params;

  const conversation = await getConversationById(id);

  if (!conversation) {
    notFound();
  }

  const guest = conversation.guest;
  const messages = (conversation.messages as Message[]) || [];

  // Sort messages by created_at
  const sortedMessages = [...messages].sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 border-b border-admin-border bg-admin-surface">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/conversations"
              className="text-white/60 hover:text-white"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
            <div className="w-12 h-12 bg-tvc-turquoise/20 rounded-full flex items-center justify-center">
              <span className="text-tvc-turquoise font-semibold text-lg">
                {guest?.name?.[0]?.toUpperCase() || "?"}
              </span>
            </div>
            <div>
              <h1 className="font-semibold text-white text-lg">
                {guest?.name || "Unknown Guest"}
              </h1>
              <p className="text-sm text-white/60">{guest?.phone}</p>
            </div>
          </div>

          {/* Guest Details */}
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-xs text-white/40">Language</p>
              <p className="text-sm text-white">
                {guest?.language === "es"
                  ? "Spanish"
                  : guest?.language === "fr"
                    ? "French"
                    : "English"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Journey Stage</p>
              <p className="text-sm text-white capitalize">
                {guest?.journey_stage?.replace("_", " ") || "Discovery"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/40">Status</p>
              <span
                className={`badge ${conversation.status === "escalated" ? "badge-danger" : "badge-success"}`}
              >
                {conversation.status}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {sortedMessages.map((message, index) => {
          // Check if we should show date separator
          const showDate =
            index === 0 ||
            formatDate(message.created_at) !==
              formatDate(sortedMessages[index - 1].created_at);

          return (
            <div key={message.id}>
              {showDate && (
                <div className="flex items-center justify-center my-6">
                  <span className="text-xs text-white/40 bg-admin-surface px-4 py-1 rounded-full">
                    {formatDate(message.created_at)}
                  </span>
                </div>
              )}
              <MessageBubble message={message} formatTime={formatTime} />
            </div>
          );
        })}
      </div>

      {/* Guest Preferences Panel */}
      {guest?.preferences && Object.keys(guest.preferences).length > 0 && (
        <div className="p-4 border-t border-admin-border bg-admin-surface">
          <h3 className="text-sm font-semibold text-white mb-2">
            Guest Preferences
          </h3>
          <div className="flex flex-wrap gap-2">
            {guest.preferences.dietary && (
              <span className="badge badge-info">
                Dietary: {guest.preferences.dietary.join(", ")}
              </span>
            )}
            {guest.preferences.group_size && (
              <span className="badge badge-info">
                Group: {guest.preferences.group_size} people
              </span>
            )}
            {guest.preferences.arrival_date && (
              <span className="badge badge-info">
                Arriving: {guest.preferences.arrival_date}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  formatTime,
}: {
  message: Message;
  formatTime: (date: string) => string;
}) {
  const isGuest = message.role === "guest";
  const isStaff = message.role === "staff";

  return (
    <div className={`flex ${isGuest ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[70%] ${
          isGuest
            ? "chat-bubble-guest"
            : isStaff
              ? "chat-bubble-staff"
              : "chat-bubble-villa"
        } px-4 py-3`}
      >
        {/* Role label for Villa/Staff */}
        {!isGuest && (
          <p
            className={`text-xs font-medium mb-1 ${isStaff ? "text-tvc-void/60" : "text-tvc-turquoise"}`}
          >
            {isStaff ? "Staff" : "Villa"}
          </p>
        )}

        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Timestamp */}
        <p
          className={`text-xs mt-2 ${isGuest ? "text-tvc-void/60" : isStaff ? "text-tvc-void/60" : "text-white/40"}`}
        >
          {formatTime(message.created_at)}
        </p>

        {/* Metadata */}
        {message.metadata?.response_time_ms && (
          <p className="text-xs text-white/30 mt-1">
            Response time: {message.metadata.response_time_ms}ms
          </p>
        )}
      </div>
    </div>
  );
}
