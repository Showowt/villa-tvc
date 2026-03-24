"use client";

import { useState, useMemo } from "react";

const DEFAULT_INCLUSIONS = [
  "daily-breakfast",
  "welcome-happy-hour",
  "palenque-culture",
  "rosario-islands",
  "bottomless-brunch",
  "tailored-experiences",
];

const INCLUSIONS = [
  { id: "daily-breakfast", name: "Daily Breakfast" },
  { id: "welcome-happy-hour", name: "Welcome Happy Hour at TVC" },
  { id: "palenque-culture", name: "Palenque Culture Experience" },
  { id: "rosario-islands", name: "Cholón & Rosario Islands" },
  { id: "bottomless-brunch", name: "The Brunch" },
  { id: "tailored-experiences", name: "Tailored Experiences" },
  { id: "sunset-boat-tour", name: "Sunset Bay Tour" },
  { id: "private-dinner", name: "Private Chef Dinner" },
  { id: "city-tour", name: "Cartagena City Tour" },
  { id: "spa-day", name: "Spa & Wellness Day" },
];

const DAY_OPTIONS = [
  { id: "arrival", name: "The Arrival" },
  { id: "culture", name: "The Culture (Palenque)" },
  { id: "islands", name: "The Islands (Cholón)" },
  { id: "brunch", name: "The Brunch" },
  { id: "departure", name: "The Departure" },
  { id: "free-day", name: "Free Day" },
  { id: "city-exploration", name: "City Exploration" },
];

interface ItineraryDay {
  dayNumber: number;
  date: string;
  templateId: string;
}

export default function WelcomeGuidePage() {
  const [groupName, setGroupName] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [selectedInclusions, setSelectedInclusions] =
    useState<string[]>(DEFAULT_INCLUSIONS);
  const [itinerary, setItinerary] = useState<ItineraryDay[]>([]);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const numberOfNights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [checkIn, checkOut]);

  const handleCheckOutChange = (date: string) => {
    setCheckOut(date);
    if (checkIn && date) {
      const start = new Date(checkIn);
      const end = new Date(date);
      const nights = Math.ceil(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
      );

      if (nights > 0 && nights <= 14) {
        const newItinerary: ItineraryDay[] = [];
        for (let i = 0; i <= nights; i++) {
          const dayDate = new Date(start);
          dayDate.setDate(dayDate.getDate() + i);

          let templateId = "free-day";
          if (i === 0) templateId = "arrival";
          else if (i === nights) templateId = "departure";
          else if (i === 1) templateId = "culture";
          else if (i === 2) templateId = "islands";
          else if (i === 3) templateId = "brunch";

          newItinerary.push({
            dayNumber: i + 1,
            date: dayDate.toISOString().split("T")[0],
            templateId,
          });
        }
        setItinerary(newItinerary);
      }
    }
  };

  const handleInclusionToggle = (id: string) => {
    setSelectedInclusions((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleDayChange = (index: number, templateId: string) => {
    setItinerary((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], templateId };
      return updated;
    });
  };

  const handleGenerate = async () => {
    if (!groupName.trim()) {
      setError("Please enter the group name");
      return;
    }
    if (!checkIn || !checkOut) {
      setError("Please select check-in and check-out dates");
      return;
    }
    if (itinerary.length === 0) {
      setError("Please set the itinerary");
      return;
    }

    setError(null);
    setGenerating(true);

    try {
      const response = await fetch("/api/ops/welcome-guide/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupName,
          checkIn,
          checkOut,
          numberOfGuests: 8,
          selectedInclusions,
          itinerary,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${groupName.replace(/[^a-zA-Z0-9]/g, "_")}_Welcome_Guide.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const formatDayDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">
          📄 Welcome Guide Generator
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Uses the original TVC PDF template • Perfect quality • Instant
          download
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Guest Details */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-bold text-slate-900 mb-4">
            👥 GUEST DETAILS
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                Group Name
              </label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="e.g., Cheria & Friends"
                className="w-full px-4 py-3 border border-slate-200 rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-[#0f3d3e]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Check-In
                </label>
                <input
                  type="date"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d3e]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Check-Out
                </label>
                <input
                  type="date"
                  value={checkOut}
                  onChange={(e) => handleCheckOutChange(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0f3d3e]"
                />
              </div>
            </div>

            {numberOfNights > 0 && (
              <div className="bg-[#0f3d3e] text-white rounded-lg p-4 text-center">
                <div className="text-2xl font-black">
                  {numberOfNights + 1} Days
                </div>
                <div className="text-sm opacity-80">
                  {numberOfNights} Nights
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Inclusions */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-bold text-slate-900 mb-4">
            ✨ PACKAGE INCLUSIONS
          </div>

          <div className="space-y-1 max-h-[350px] overflow-y-auto">
            {INCLUSIONS.map((inc) => (
              <label
                key={inc.id}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedInclusions.includes(inc.id)}
                  onChange={() => handleInclusionToggle(inc.id)}
                  className="w-5 h-5 rounded border-slate-300 text-[#0f3d3e] focus:ring-[#0f3d3e]"
                />
                <span className="text-sm font-medium">{inc.name}</span>
                {DEFAULT_INCLUSIONS.includes(inc.id) && (
                  <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full ml-auto">
                    Default
                  </span>
                )}
              </label>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
            {selectedInclusions.length} inclusions selected
          </div>
        </div>

        {/* Column 3: Itinerary */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="text-sm font-bold text-slate-900 mb-4">
            📅 DAILY ITINERARY
          </div>

          {itinerary.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-3xl mb-2">📅</div>
              <div className="text-sm">
                Select dates to auto-generate itinerary
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-[350px] overflow-y-auto">
              {itinerary.map((day, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg"
                >
                  <div className="min-w-[70px]">
                    <div className="text-xs font-bold text-[#0f3d3e]">
                      Day {day.dayNumber}
                    </div>
                    <div className="text-[10px] text-slate-500">
                      {formatDayDate(day.date)}
                    </div>
                  </div>
                  <select
                    value={day.templateId}
                    onChange={(e) => handleDayChange(idx, e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {DAY_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Generate Button */}
      <div className="mt-8 flex gap-4">
        <button
          onClick={handleGenerate}
          disabled={generating || !groupName || !checkIn || !checkOut}
          className="flex-1 py-4 rounded-xl bg-[#0f3d3e] text-white text-lg font-bold hover:bg-[#1a5a5c] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3"
        >
          {generating ? (
            <>
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating PDF...
            </>
          ) : (
            <>📄 Generate Welcome Guide PDF</>
          )}
        </button>

        <button
          onClick={() => {
            const message = encodeURIComponent(
              `🌴 *Welcome to Tiny Village Cartagena!*\n\n` +
                `*${groupName || "Guest"}*\n` +
                `📅 Your Welcome Guide is ready!\n\n` +
                `@TinyVillageCartagena`,
            );
            window.open(`https://wa.me/?text=${message}`, "_blank");
          }}
          disabled={!groupName}
          className="px-8 py-4 rounded-xl bg-[#25D366] text-white font-bold hover:bg-[#20bd5a] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          📱 WhatsApp
        </button>
      </div>

      {/* Status */}
      <div className="mt-6 text-center text-sm text-slate-500">
        {groupName && checkIn && checkOut && itinerary.length > 0 ? (
          <span className="text-emerald-600 font-semibold">
            ✓ Ready to generate: {groupName} • {numberOfNights + 1} days,{" "}
            {numberOfNights} nights • 15 pages
          </span>
        ) : (
          <span>Fill in the details above to generate the PDF</span>
        )}
      </div>

      {/* Info */}
      <div className="mt-4 p-4 bg-slate-50 rounded-xl text-xs text-slate-600">
        <strong>How it works:</strong> This generator uses your original
        &quot;Cheria &amp; Friends&quot; PDF as a template. It overlays the new
        guest name and dates while preserving all the beautiful images and
        formatting. Perfect quality, every time.
      </div>
    </div>
  );
}
