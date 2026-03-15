import { createServerClient } from "@/lib/supabase/client";
import type { Guest } from "@/types";

export const dynamic = "force-dynamic";

async function getGuests(): Promise<Guest[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("guests")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error("[Guests] Error fetching:", error);
    return [];
  }

  return data as Guest[];
}

export default async function GuestsPage() {
  const guests = await getGuests();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold text-white mb-2">
          Guests
        </h1>
        <p className="text-white/60">
          All guests who have interacted with Villa
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Guests"
          value={guests.length}
          color="turquoise"
        />
        <StatCard
          label="Discovery"
          value={guests.filter((g) => g.journey_stage === "discovery").length}
          color="blue"
        />
        <StatCard
          label="Booked"
          value={
            guests.filter(
              (g) =>
                g.journey_stage === "booked" ||
                g.journey_stage === "pre_arrival",
            ).length
          }
          color="gold"
        />
        <StatCard
          label="On Property"
          value={guests.filter((g) => g.journey_stage === "on_property").length}
          color="green"
        />
      </div>

      {/* Guests Table */}
      {guests.length === 0 ? (
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
                d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
              />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">
            No guests yet
          </h3>
          <p className="text-white/60 max-w-md mx-auto">
            When guests message Villa on WhatsApp, their profiles will appear
            here.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-admin-border text-left">
                <th className="px-4 py-3 text-sm font-medium text-white/60">
                  Guest
                </th>
                <th className="px-4 py-3 text-sm font-medium text-white/60">
                  Phone
                </th>
                <th className="px-4 py-3 text-sm font-medium text-white/60">
                  Language
                </th>
                <th className="px-4 py-3 text-sm font-medium text-white/60">
                  Stage
                </th>
                <th className="px-4 py-3 text-sm font-medium text-white/60">
                  Last Active
                </th>
              </tr>
            </thead>
            <tbody>
              {guests.map((guest) => (
                <GuestRow key={guest.id} guest={guest} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: "turquoise" | "blue" | "gold" | "green";
}) {
  const colorClasses = {
    turquoise: "bg-tvc-turquoise/20 text-tvc-turquoise",
    blue: "bg-blue-500/20 text-blue-500",
    gold: "bg-tvc-gold/20 text-tvc-gold",
    green: "bg-green-500/20 text-green-500",
  };

  return (
    <div className="card !p-4">
      <p className="text-2xl font-bold text-white mb-1">{value}</p>
      <p className="text-sm text-white/60">{label}</p>
      <div className={`w-full h-1 mt-3 rounded-full ${colorClasses[color]}`} />
    </div>
  );
}

function GuestRow({ guest }: { guest: Guest }) {
  const stageColors: Record<string, string> = {
    discovery: "badge-info",
    booked: "badge-warning",
    pre_arrival: "badge-warning",
    on_property: "badge-success",
    departed: "badge-info",
  };

  const languageFlags: Record<string, string> = {
    en: "🇺🇸",
    es: "🇪🇸",
    fr: "🇫🇷",
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <tr className="table-row">
      <td className="px-4 py-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-tvc-turquoise/20 rounded-full flex items-center justify-center">
            <span className="text-tvc-turquoise font-semibold">
              {guest.name?.[0]?.toUpperCase() || "?"}
            </span>
          </div>
          <div>
            <p className="font-medium text-white">{guest.name || "Unknown"}</p>
            {guest.email && (
              <p className="text-xs text-white/40">{guest.email}</p>
            )}
          </div>
        </div>
      </td>
      <td className="px-4 py-4 text-white/80">{guest.phone}</td>
      <td className="px-4 py-4">
        <span className="text-lg">{languageFlags[guest.language]}</span>
      </td>
      <td className="px-4 py-4">
        <span
          className={`badge ${stageColors[guest.journey_stage]} capitalize`}
        >
          {guest.journey_stage.replace("_", " ")}
        </span>
      </td>
      <td className="px-4 py-4 text-white/60 text-sm">
        {formatDate(guest.updated_at)}
      </td>
    </tr>
  );
}
