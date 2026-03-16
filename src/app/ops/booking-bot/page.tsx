"use client";

import { useState } from "react";

const BOOKING_STEPS = [
  {
    guest:
      "Hi! We're a group of 8 looking to visit Cartagena in April. Do you have availability?",
    bot: `Hey! 🏝️ Welcome — you're going to love TVC. April is beautiful here.

For 8 guests, I'd recommend our **Deluxe Villas** — they're the largest, with 15-foot ceilings and antique doors from the historic Teatro Colón. You'd need 2-3 villas depending on how you want to split up.

What dates in April are you looking at? I'll check availability right now.`,
  },
  {
    guest: "April 10-14, 4 nights",
    bot: `Checking April 10-14... ✅ **Great news — we have 3 Deluxe Villas available** for those dates!

📊 Quick math for your group:
• 8 guests × 4 nights
• 3 Deluxe Villas (sleeps 5 each = plenty of space)
• Complimentary breakfast every morning
• Pool, Jacuzzi, Roof Terrace included

Would you like me to hold these dates? I can also show you some experiences that groups your size typically love.`,
  },
  {
    guest: "Yes hold them! And what experiences?",
    bot: `Dates held! 🎉 I'll need a deposit to confirm — I can send you the link in a moment.

Here's what groups of 8 usually go for:

🏝️ **Rosario Islands Excursion** — Full day island hopping on our Colibri ONE yacht (fits 20, so you'll have space). $350K COP/person.

🌅 **Sunset Bay Tour** — Evening cruise around the bay on the Pescadito. $200K COP/person.

🕯️ **Private 4-Course Dinner** — Our chef does an incredible "Cartagena Culture Menu" — fresh ceviche, garlic shrimp, braised beef. $235K COP/person.

Want me to add any of these to your trip?`,
  },
  {
    guest: "The Rosario Islands and the dinner sound amazing",
    bot: `Excellent taste 🔥 Adding both:

📋 **Your TVC Trip — April 10-14:**

🏠 3 Deluxe Villas (4 nights, 8 guests)
🏝️ Rosario Islands Excursion (Day 2)
🕯️ Private Dinner "Cartagena Culture" (Final night)
☀️ Breakfast included daily
🚤 Boat transfers included

Ready to book? Here's your link:
👉 [Complete Booking →]

Or if you have questions, I'm right here. Can't wait to welcome you to the island! 🌴`,
  },
];

export default function BookingBotPage() {
  const [step, setStep] = useState(0);

  const renderText = (text: string) => {
    return text.split("**").map((part, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="font-bold">
          {part}
        </strong>
      ) : (
        part
      ),
    );
  };

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          🤝 Booking Bot — Bot Closes, Not Staff
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          The Villa bot doesn&apos;t just answer questions — it qualifies,
          suggests, upsells, and closes bookings. Human warmth. Machine
          precision.
        </p>
      </div>

      {/* Revenue callout */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
        <div className="text-sm font-extrabold text-emerald-700 mb-1">
          💰 THIS CONVERSATION = $4,380,000 COP BOOKING
        </div>
        <div className="text-xs text-emerald-600">
          3 villas × 4 nights + Rosario excursion (8 pax) + Private dinner (8
          pax). No human needed. Bot closes.
        </div>
      </div>

      {/* Chat window */}
      <div className="bg-slate-100 rounded-xl p-4 max-h-[420px] overflow-y-auto mb-4">
        {BOOKING_STEPS.slice(0, step + 1).map((s, i) => (
          <div key={i}>
            {/* Guest message */}
            <div className="flex justify-end mb-2">
              <div className="max-w-[75%] px-3.5 py-2.5 rounded-xl rounded-br-sm bg-slate-200 text-slate-900 text-xs leading-relaxed">
                {s.guest}
              </div>
            </div>
            {/* Bot message */}
            <div className="flex justify-start mb-4">
              <div className="max-w-[80%] px-3.5 py-2.5 rounded-xl rounded-bl-sm bg-white text-slate-900 text-xs leading-relaxed whitespace-pre-line shadow-sm border border-slate-200">
                {renderText(s.bot)}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Step navigation */}
      <div className="flex items-center justify-center gap-2 mb-2">
        {BOOKING_STEPS.map((_, i) => (
          <button
            key={i}
            onClick={() => setStep(i)}
            className={`w-9 h-9 rounded-full font-extrabold text-sm transition-all ${
              step === i
                ? "bg-[#00B4FF] text-white"
                : step > i
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-200 text-slate-500"
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>
      <div className="text-center text-xs text-slate-500 mb-4">
        Click steps to see the full booking conversation
      </div>

      {/* Breakdown */}
      <div className="bg-white border border-slate-200 rounded-xl p-4">
        <div className="text-xs font-bold text-slate-700 mb-3">
          📊 BOOKING BREAKDOWN
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-semibold">
              ACCOMMODATION
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              3 Deluxe Villas
            </div>
            <div className="text-[10px] text-slate-500">
              4 nights × 8 guests
            </div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-semibold">
              EXCURSION
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              Rosario Islands
            </div>
            <div className="text-[10px] text-slate-500">$350K × 8 = $2.8M</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-[10px] text-slate-500 font-semibold">
              EVENT
            </div>
            <div className="text-sm font-extrabold text-slate-900">
              Private Dinner
            </div>
            <div className="text-[10px] text-slate-500">$235K × 8 = $1.88M</div>
          </div>
          <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
            <div className="text-[10px] text-emerald-600 font-semibold">
              TOTAL VALUE
            </div>
            <div className="text-sm font-extrabold text-emerald-700">
              $4,380,000+
            </div>
            <div className="text-[10px] text-emerald-600">
              COP (excl. rooms)
            </div>
          </div>
        </div>
      </div>

      {/* Key insight */}
      <div className="mt-4 bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] rounded-xl p-5">
        <div className="text-[#00D4FF] text-[10px] font-bold tracking-widest mb-2">
          🎯 KEY INSIGHT
        </div>
        <div className="text-white text-sm font-semibold leading-relaxed">
          The bot didn&apos;t just answer questions. It:
        </div>
        <ul className="text-white/70 text-xs mt-2 space-y-1">
          <li>✅ Qualified the group (8 guests, specific dates)</li>
          <li>✅ Recommended the right villas (Deluxe for larger groups)</li>
          <li>✅ Created urgency ("I'll hold these dates")</li>
          <li>✅ Upsold experiences naturally (not pushy)</li>
          <li>✅ Closed with a clear CTA (booking link)</li>
        </ul>
        <div className="mt-3 text-amber-400 text-xs font-semibold">
          All without a single human. 24/7.
        </div>
      </div>
    </div>
  );
}
