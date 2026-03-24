"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { createBrowserClient } from "@/lib/supabase/client";
import { TRANSPORT, CONSUMPTION } from "@/lib/ops/data";
import type { Tables } from "@/types/database";

type DailyOccupancy = Tables<"daily_occupancy">;

interface DayOccupancy {
  date: Date;
  dateString: string;
  shortDay: string;
  guests: number;
  checkIns: number;
  checkOuts: number;
  dbId?: string;
}

const WINDOW_OPTIONS = [3, 5, 7, 14];

export default function OccupancyPage() {
  const [days, setDays] = useState<DayOccupancy[]>([]);
  const [purchaseWindow, setPurchaseWindow] = useState(3);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadOccupancyData();
  }, []);

  const loadOccupancyData = async () => {
    const supabase = createBrowserClient();
    const today = new Date();

    // Generate 14 days starting from today
    const generatedDays: DayOccupancy[] = [];
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      generatedDays.push({
        date,
        dateString: date.toISOString().split("T")[0],
        shortDay: date.toLocaleDateString("en-US", { weekday: "short" }),
        guests: 0,
        checkIns: 0,
        checkOuts: 0,
      });
    }

    // Fetch existing occupancy data from Supabase
    const startDate = today.toISOString().split("T")[0];
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 14);

    const { data: occupancyData, error } = await supabase
      .from("daily_occupancy")
      .select("*")
      .gte("date", startDate)
      .lte("date", endDate.toISOString().split("T")[0]);

    if (error) {
      console.error("[loadOccupancyData]", error);
    }

    // Merge DB data with generated days
    if (occupancyData) {
      for (const dbRecord of occupancyData) {
        const idx = generatedDays.findIndex(
          (d) => d.dateString === dbRecord.date,
        );
        if (idx !== -1) {
          generatedDays[idx] = {
            ...generatedDays[idx],
            guests: dbRecord.guests_count,
            checkIns: dbRecord.check_ins || 0,
            checkOuts: dbRecord.check_outs || 0,
            dbId: dbRecord.id,
          };
        }
      }
    }

    setDays(generatedDays);
    setLoading(false);
  };

  const updateGuests = async (idx: number, val: number) => {
    const newDays = [...days];
    const newGuests = Math.max(0, Math.min(42, val));
    newDays[idx] = { ...newDays[idx], guests: newGuests };
    setDays(newDays);

    // Auto-save to database
    setSaving(true);
    const supabase = createBrowserClient();
    const day = newDays[idx];

    const { error } = await supabase.from("daily_occupancy").upsert(
      {
        date: day.dateString,
        guests_count: newGuests,
        check_ins: day.checkIns,
        check_outs: day.checkOuts,
        person_nights: newGuests,
        consumption_events: newGuests * 2,
      },
      { onConflict: "date" },
    );

    if (error) {
      console.error("[updateGuests]", error);
    }
    setSaving(false);
  };

  // Calculations
  const windowDays = days.slice(0, purchaseWindow);
  const totalPN = windowDays.reduce((s, d) => s + d.guests, 0);
  const peakDay = windowDays.reduce(
    (max, d, i) =>
      d.guests > max.guests
        ? {
            guests: d.guests,
            label: d.shortDay + " " + d.date.getDate(),
            index: i,
          }
        : max,
    { guests: 0, label: "N/A", index: -1 },
  );
  const avgOccupancy = Math.round(totalPN / purchaseWindow) || 0;
  const tripsNeeded = Math.ceil(purchaseWindow / 3);
  const singleTripCost = TRANSPORT.boatFuelPerTrip + TRANSPORT.staffTimePerTrip;
  const transportCost = tripsNeeded * singleTripCost;

  const calculateTotalSupplyCost = () => {
    let total = 0;
    Object.values(CONSUMPTION).forEach((items) => {
      items.forEach((item) => {
        total += Math.ceil(item.perPN * totalPN) * item.costPer;
      });
    });
    return total + transportCost;
  };

  const totalCost = calculateTotalSupplyCost();

  const today = new Date();
  const orderByDate = new Date(today.getTime() - 48 * 60 * 60 * 1000);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">
            📅 Daily Occupancy & Consumption Engine
          </h1>
          {saving && (
            <span className="text-xs text-[#00B4FF] font-medium animate-pulse">
              Saving...
            </span>
          )}
        </div>
        <p className="text-slate-500 text-xs mt-1">
          Occupancy changes daily. Edit each day&apos;s guest count. Pick a
          purchase window. Get exact quantities with transport costs included.
        </p>
      </div>

      {/* Purchase Window Selector */}
      <div className="bg-gradient-to-br from-[#0A0A0F] to-[#1a1a2e] rounded-2xl p-5 mb-5">
        <div className="flex justify-between items-center flex-wrap gap-3">
          <div>
            <div className="text-[#00D4FF] text-[11px] font-bold tracking-widest">
              PURCHASE WINDOW
            </div>
            <div className="text-white text-[13px] mt-1">
              Calculate supplies for the next{" "}
              <strong className="text-[#00B4FF]">{purchaseWindow} days</strong>
            </div>
          </div>
          <div className="flex gap-1.5">
            {WINDOW_OPTIONS.map((w) => (
              <button
                key={w}
                onClick={() => setPurchaseWindow(w)}
                className={`px-4 py-2 rounded-lg font-bold text-[13px] transition-all ${
                  purchaseWindow === w
                    ? "bg-[#00B4FF] text-[#0A0A0F]"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {w} days
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Occupancy Calendar */}
      <div className="mb-5">
        <div className="text-sm font-extrabold text-slate-900 mb-2.5">
          📅 DAILY OCCUPANCY — Click numbers to edit
        </div>
        <div className="overflow-x-auto">
          <div className="flex gap-1.5 min-w-max pb-2">
            {days.map((day, idx) => {
              const inWindow = idx < purchaseWindow;
              const isToday = idx === 0;
              const isPeak =
                inWindow && day.guests === peakDay.guests && day.guests > 0;

              return (
                <div
                  key={idx}
                  className={`w-20 rounded-xl p-2.5 text-center relative transition-all ${
                    inWindow ? "bg-white" : "bg-slate-100"
                  } ${
                    isToday
                      ? "border-2 border-[#00B4FF]"
                      : isPeak
                        ? "border-2 border-amber-500"
                        : inWindow
                          ? "border border-slate-200"
                          : "border border-slate-100"
                  } ${inWindow ? "opacity-100" : "opacity-50"}`}
                >
                  {isToday && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#00B4FF] text-[#0A0A0F] text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                      TODAY
                    </div>
                  )}
                  {isPeak && !isToday && (
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-amber-500 text-[#0A0A0F] text-[9px] font-extrabold px-2 py-0.5 rounded-full">
                      PEAK
                    </div>
                  )}

                  <div className="text-[10px] font-bold text-slate-500 mt-1">
                    {day.shortDay}
                  </div>
                  <div className="text-[9px] text-slate-400 mb-1.5">
                    {day.date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>

                  <input
                    type="number"
                    min={0}
                    max={42}
                    value={day.guests}
                    onChange={(e) =>
                      updateGuests(idx, parseInt(e.target.value) || 0)
                    }
                    className={`w-12 text-center border rounded-lg p-1.5 text-lg font-extrabold text-slate-900 outline-none ${
                      inWindow
                        ? "border-[#00B4FF]/30 bg-[#00B4FF]/5"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  />

                  <div className="text-[9px] text-slate-500 mt-1">guests</div>

                  {/* Check-in/out indicators */}
                  <div className="flex justify-center gap-1 mt-1">
                    {day.checkIns > 0 && (
                      <span className="text-[9px] text-emerald-600 font-bold">
                        +{day.checkIns}↓
                      </span>
                    )}
                    {day.checkOuts > 0 && (
                      <span className="text-[9px] text-rose-500 font-bold">
                        -{day.checkOuts}↑
                      </span>
                    )}
                  </div>

                  {/* Occupancy bar */}
                  <div className="h-1 bg-slate-200 rounded mt-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded ${
                        day.guests > 30
                          ? "bg-rose-500"
                          : day.guests > 20
                            ? "bg-amber-500"
                            : "bg-emerald-500"
                      }`}
                      style={{ width: `${(day.guests / 42) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label="Total Person-Nights"
          value={totalPN}
          sub={`Next ${purchaseWindow} days`}
          color="#0066CC"
          icon="📊"
        />
        <StatCard
          label="Consumption Events"
          value={totalPN * 2}
          sub="2x per person-night"
          color="#0A0A0F"
          icon="🍽️"
        />
        <StatCard
          label="Peak Day"
          value={`${peakDay.guests} guests`}
          sub={peakDay.label}
          color="#F59E0B"
          icon="📈"
        />
        <StatCard
          label="Avg. Occupancy"
          value={`${avgOccupancy}/day`}
          sub={`${Math.round((avgOccupancy / 42) * 100)}% capacity`}
          color="#10B981"
          icon="🏠"
        />
      </div>

      {/* Transport Cost Alert */}
      <div className="bg-amber-50 rounded-xl p-4 mb-5 border border-amber-200 flex gap-4 items-start flex-wrap">
        <div className="text-3xl">🚤</div>
        <div className="flex-1 min-w-[200px]">
          <div className="text-[13px] font-extrabold text-slate-900 mb-1">
            TRANSPORT COST FOR THIS WINDOW
          </div>
          <div className="text-xs text-slate-600 leading-relaxed">
            Estimated{" "}
            <strong>
              {tripsNeeded} boat trip{tripsNeeded > 1 ? "s" : ""}
            </strong>{" "}
            to Cartagena needed for supplies. Each trip = $35,000 fuel + $25,000
            staff time.
          </div>
          <div className="flex gap-4 mt-2.5 flex-wrap">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">
                TRANSPORT COST
              </div>
              <div className="text-xl font-extrabold text-amber-600">
                ${transportCost.toLocaleString()}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold">
                COST PER PERSON-NIGHT
              </div>
              <div className="text-xl font-extrabold text-amber-600">
                $
                {totalPN > 0
                  ? Math.round(transportCost / totalPN).toLocaleString()
                  : 0}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-emerald-600 font-semibold">
                💡 SAVINGS IF BATCHED
              </div>
              <div className="text-xl font-extrabold text-emerald-600">
                ${(transportCost - singleTripCost).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Consumption Forecast */}
      {Object.entries(CONSUMPTION).map(([cat, items]) => (
        <div key={cat} className="mb-4">
          <div className="text-[13px] font-extrabold text-slate-900 uppercase tracking-wide mb-2 pb-1 border-b-2 border-[#00B4FF]">
            {cat === "breakfast"
              ? "☀️ Breakfast"
              : cat === "beverage"
                ? "🍹 Beverages & Ice"
                : "🧴 Supplies"}
            <span className="text-[11px] text-slate-500 font-semibold ml-2 normal-case tracking-normal">
              for {purchaseWindow}-day window ({totalPN} person-nights)
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {items.map((item) => {
              const total = Math.ceil(item.perPN * totalPN);
              const cost = total * item.costPer;
              const peakReq = Math.ceil(item.perPN * peakDay.guests);
              return (
                <div
                  key={item.item}
                  className="bg-white rounded-xl p-3 border border-slate-200"
                >
                  <div className="text-xs font-bold text-slate-900">
                    {item.emoji} {item.item}
                  </div>
                  <div className="text-2xl font-extrabold text-[#0066CC] mt-1">
                    {total.toLocaleString()}{" "}
                    <span className="text-xs font-semibold text-slate-500">
                      {item.unit}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ${cost.toLocaleString()} COP • Peak day needs {peakReq}{" "}
                    {item.unit}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Total */}
      <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200 flex justify-between items-center flex-wrap gap-3">
        <div>
          <div className="text-xs font-bold text-emerald-700">
            💰 TOTAL SUPPLY COST ({purchaseWindow}-DAY WINDOW)
          </div>
          <div className="text-3xl font-black text-emerald-600">
            ${totalCost.toLocaleString()} COP
          </div>
          <div className="text-[11px] text-slate-500">
            Includes ${transportCost.toLocaleString()} transport • Order by{" "}
            {orderByDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
        <button className="px-6 py-3 rounded-xl bg-emerald-500 text-white font-extrabold text-sm hover:bg-emerald-600 transition-colors">
          📋 Generate Purchase Order
        </button>
      </div>
    </div>
  );
}
