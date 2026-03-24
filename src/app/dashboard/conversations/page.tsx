"use client";

// Placeholder page - Conversations will be implemented
// when WhatsApp integration is built

export default function ConversationsPage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Conversations
        </h1>
        <p className="text-white/60">
          Conversation management will be available when WhatsApp integration is
          configured.
        </p>
      </div>

      <div className="bg-slate-800 rounded-xl p-8 text-center">
        <div className="text-4xl mb-4">💬</div>
        <h3 className="text-xl font-semibold text-white mb-2">Coming Soon</h3>
        <p className="text-white/60 max-w-md mx-auto">
          This module requires WhatsApp Business API integration to manage guest
          conversations.
        </p>
      </div>
    </div>
  );
}
