import { getDashboardStats } from "@/lib/supabase/queries";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let stats = {
    active_conversations: 0,
    pending_escalations: 0,
    messages_today: 0,
    guests_total: 0,
    avg_response_time_ms: 0,
  };

  try {
    stats = await getDashboardStats();
  } catch (error) {
    console.error("[Dashboard] Error fetching stats:", error);
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Dashboard
        </h1>
        <p className="text-white/60">
          Villa concierge overview for Tiny Village Cartagena
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          label="Active Conversations"
          value={stats.active_conversations}
          icon={<ChatIcon />}
          color="turquoise"
        />
        <StatCard
          label="Pending Escalations"
          value={stats.pending_escalations}
          icon={<AlertIcon />}
          color="red"
          alert={stats.pending_escalations > 0}
        />
        <StatCard
          label="Messages Today"
          value={stats.messages_today}
          icon={<MessageIcon />}
          color="gold"
        />
        <StatCard
          label="Total Guests"
          value={stats.guests_total}
          icon={<UsersIcon />}
          color="purple"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Recent Activity */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4">
            Recent Activity
          </h2>
          <div className="space-y-4">
            <ActivityItem
              type="message"
              text="New message from +1 (555) 123-4567"
              time="2 min ago"
            />
            <ActivityItem
              type="escalation"
              text="Escalation resolved by staff"
              time="15 min ago"
            />
            <ActivityItem
              type="guest"
              text="New guest registered"
              time="1 hour ago"
            />
            <ActivityItem
              type="message"
              text="Villa responded to booking inquiry"
              time="2 hours ago"
            />
          </div>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="font-display text-xl font-semibold text-white mb-4">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <QuickAction
              label="View Conversations"
              href="/dashboard/conversations"
              icon={<ChatIcon />}
            />
            <QuickAction
              label="Check Escalations"
              href="/dashboard/escalations"
              icon={<AlertIcon />}
            />
            <QuickAction
              label="Guest Profiles"
              href="/dashboard/guests"
              icon={<UsersIcon />}
            />
            <QuickAction
              label="Analytics"
              href="/dashboard/analytics"
              icon={<ChartIcon />}
            />
          </div>
        </div>
      </div>

      {/* System Status */}
      <div className="card">
        <h2 className="font-display text-xl font-semibold text-white mb-4">
          System Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatusItem label="Villa AI" status="operational" />
          <StatusItem label="WhatsApp Integration" status="operational" />
          <StatusItem label="Database" status="operational" />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  alert,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: "turquoise" | "gold" | "red" | "purple";
  alert?: boolean;
}) {
  const colorClasses = {
    turquoise: "bg-tvc-turquoise/20 text-tvc-turquoise",
    gold: "bg-tvc-gold/20 text-tvc-gold",
    red: "bg-red-500/20 text-red-500",
    purple: "bg-purple-500/20 text-purple-500",
  };

  return (
    <div className={`card ${alert ? "border-red-500" : ""}`}>
      <div className="flex items-start justify-between mb-4">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colorClasses[color]}`}
        >
          <span className="w-5 h-5">{icon}</span>
        </div>
        {alert && (
          <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse-dot" />
        )}
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
    </div>
  );
}

function ActivityItem({
  type,
  text,
  time,
}: {
  type: "message" | "escalation" | "guest";
  text: string;
  time: string;
}) {
  const icons = {
    message: <MessageIcon />,
    escalation: <AlertIcon />,
    guest: <UsersIcon />,
  };

  const colors = {
    message: "bg-tvc-turquoise/20 text-tvc-turquoise",
    escalation: "bg-red-500/20 text-red-500",
    guest: "bg-purple-500/20 text-purple-500",
  };

  return (
    <div className="flex items-center gap-4">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center ${colors[type]}`}
      >
        <span className="w-4 h-4">{icons[type]}</span>
      </div>
      <div className="flex-1">
        <p className="text-sm text-white">{text}</p>
        <p className="text-xs text-white/40">{time}</p>
      </div>
    </div>
  );
}

function QuickAction({
  label,
  href,
  icon,
}: {
  label: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-3 p-4 bg-admin-border/30 rounded-lg hover:bg-admin-border/50 transition-colors"
    >
      <span className="w-5 h-5 text-tvc-turquoise">{icon}</span>
      <span className="text-sm text-white">{label}</span>
    </a>
  );
}

function StatusItem({
  label,
  status,
}: {
  label: string;
  status: "operational" | "degraded" | "down";
}) {
  const statusColors = {
    operational: "bg-green-500",
    degraded: "bg-yellow-500",
    down: "bg-red-500",
  };

  const statusLabels = {
    operational: "Operational",
    degraded: "Degraded",
    down: "Down",
  };

  return (
    <div className="flex items-center justify-between p-4 bg-admin-border/30 rounded-lg">
      <span className="text-white">{label}</span>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${statusColors[status]}`} />
        <span className="text-sm text-white/60">{statusLabels[status]}</span>
      </div>
    </div>
  );
}

// Icons
function ChatIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
      />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );
}
