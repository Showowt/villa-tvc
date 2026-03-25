"use client";

import { useState, useEffect } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { TaskItem, type TaskItemData } from "@/components/ops/TaskItem";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

interface KitchenTaskProgress {
  [checklistType: string]: {
    [taskIndex: string]: {
      completed: boolean;
      photo_url?: string;
      notes?: string;
    };
  };
}

type DishPL = Tables<"dish_pl">;

interface KitchenChecklist {
  type: string;
  name: string;
  name_es: string;
  items: { task: string; task_es: string; photo_required?: boolean }[];
  estimated_minutes: number;
}

const fmt = (n: number) => n.toLocaleString();

export default function FBPLPage() {
  const [view, setView] = useState<"food" | "bar">("food");
  const [withTransport, setWithTransport] = useState(true);
  const [dishes, setDishes] = useState<DishPL[]>([]);
  const [selected, setSelected] = useState<DishPL | null>(null);
  const [loading, setLoading] = useState(true);
  const [kitchenChecklists, setKitchenChecklists] = useState<
    KitchenChecklist[]
  >([]);
  const [expandedChecklist, setExpandedChecklist] = useState<string | null>(
    null,
  );
  const [kitchenProgress, setKitchenProgress] = useState<KitchenTaskProgress>(
    {},
  );

  useEffect(() => {
    loadDishes();
    loadKitchenChecklists();

    // Load kitchen progress from localStorage
    const today = new Date().toISOString().split("T")[0];
    const saved = localStorage.getItem(`tvc_kitchen_progress_${today}`);
    if (saved) {
      try {
        setKitchenProgress(JSON.parse(saved));
      } catch {
        console.error("Failed to parse kitchen progress");
      }
    }
  }, []);

  // Save kitchen progress to localStorage
  useEffect(() => {
    if (Object.keys(kitchenProgress).length > 0) {
      const today = new Date().toISOString().split("T")[0];
      localStorage.setItem(
        `tvc_kitchen_progress_${today}`,
        JSON.stringify(kitchenProgress),
      );
    }
  }, [kitchenProgress]);

  const handleKitchenTaskToggle = (
    checklistType: string,
    taskIndex: number,
    completed: boolean,
  ) => {
    setKitchenProgress((prev) => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        [taskIndex]: {
          ...prev[checklistType]?.[taskIndex],
          completed,
        },
      },
    }));
  };

  const handleKitchenPhotoUpload = (
    checklistType: string,
    taskIndex: number,
    photoUrl: string,
  ) => {
    setKitchenProgress((prev) => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        [taskIndex]: {
          ...prev[checklistType]?.[taskIndex],
          photo_url: photoUrl,
        },
      },
    }));
  };

  const handleKitchenPhotoRemove = (
    checklistType: string,
    taskIndex: number,
  ) => {
    setKitchenProgress((prev) => ({
      ...prev,
      [checklistType]: {
        ...prev[checklistType],
        [taskIndex]: {
          ...prev[checklistType]?.[taskIndex],
          photo_url: undefined,
        },
      },
    }));
  };

  const loadKitchenChecklists = async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("type, name, name_es, items, estimated_minutes")
      .eq("department", "kitchen")
      .eq("is_active", true)
      .order("type");

    if (!error && data) {
      setKitchenChecklists(data as KitchenChecklist[]);
    }
  };

  useEffect(() => {
    // Set first item as selected when view changes
    const filtered = getFilteredItems();
    if (filtered.length > 0) {
      setSelected(filtered[0]);
    }
  }, [view, dishes]);

  const loadDishes = async () => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("dish_pl")
      .select("*")
      .order("name_es");

    if (error) {
      console.error("[loadDishes]", error);
      setLoading(false);
      return;
    }

    setDishes(data || []);
    setLoading(false);
  };

  const getFilteredItems = () => {
    const foodCategories = ["breakfast", "lunch", "dinner", "snack"];
    const barCategories = [
      "cocktail",
      "mocktail",
      "beer",
      "wine",
      "spirit",
      "soft_drink",
    ];

    return dishes.filter((item) =>
      view === "food"
        ? foodCategories.includes(item.category || "")
        : barCategories.includes(item.category || ""),
    );
  };

  // Calculate margin based on transport toggle
  const calcMargin = (item: DishPL) => {
    const ingredientCost = item.ingredient_cost || 0;
    const transportCost = withTransport ? item.transport_cost || 0 : 0;
    const price = item.price || 0;
    const margin = price - ingredientCost - transportCost;
    const marginPct = price > 0 ? Math.round((margin / price) * 100) : 0;
    const ordersPerWeek = item.orders_this_week || 0;
    const weeklyProfit = margin * ordersPerWeek;
    return { margin, marginPct, weeklyProfit, transportCost };
  };

  const items = getFilteredItems();
  const sorted = [...items].sort(
    (a, b) => calcMargin(b).weeklyProfit - calcMargin(a).weeklyProfit,
  );

  // Calculate totals
  const totalWeekly = sorted.reduce(
    (sum, item) => sum + calcMargin(item).weeklyProfit,
    0,
  );
  const totalTransport = sorted.reduce(
    (sum, item) =>
      sum + (item.transport_cost || 0) * (item.orders_this_week || 0),
    0,
  );
  const totalOrders = sorted.reduce(
    (sum, item) => sum + (item.orders_this_week || 0),
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  const sel = selected ? calcMargin(selected) : null;

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-xl font-extrabold">
          💰 Food & Beverage Profitability
        </h1>
        <p className="text-slate-500 text-xs mt-1">
          Real margins for every dish AND every drink. Toggle transport costs to
          see the island premium. Ranked by weekly profit contribution.
        </p>
      </div>

      {/* Food / Bar toggle */}
      <div className="flex gap-2 mb-4">
        {[
          { key: "food" as const, label: "🍽️ Food P&L" },
          { key: "bar" as const, label: "🍹 Bar P&L" },
        ].map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setView(key)}
            className={`px-5 py-2.5 rounded-xl border-2 text-[13px] font-extrabold transition-all ${
              view === key
                ? "border-[#00B4FF] bg-[#00B4FF]/10 text-[#0066CC]"
                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300"
            }`}
          >
            {label}
          </button>
        ))}
        <div className="flex-1" />
        <button
          onClick={() => setWithTransport(!withTransport)}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            withTransport
              ? "bg-amber-500 text-[#0A0A0F]"
              : "bg-slate-200 text-slate-600"
          }`}
        >
          🚤 Transport: {withTransport ? "ON" : "OFF"}
        </button>
      </div>

      {/* Summary stats */}
      <div className="flex gap-3 flex-wrap mb-4">
        <StatCard
          label={`Weekly ${view === "food" ? "Food" : "Bar"} Profit`}
          value={`$${(totalWeekly / 1000).toFixed(0)}K`}
          sub="COP with transport"
          color="#10B981"
          icon="📈"
        />
        <StatCard
          label="Weekly Transport Cost"
          value={`$${(totalTransport / 1000).toFixed(0)}K`}
          sub="Hidden island logistics"
          color="#F59E0B"
          icon="🚤"
        />
        <StatCard
          label="Items Tracked"
          value={sorted.length}
          sub={view === "food" ? "dishes" : "drinks"}
          color="#0066CC"
          icon="📊"
        />
        <StatCard
          label="Total Weekly Orders"
          value={totalOrders}
          sub="estimated"
          color="#0A0A0F"
          icon="🔥"
        />
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-slate-500">
            No {view === "food" ? "food" : "drink"} items found in database
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Add items via the admin panel or database
          </p>
        </div>
      ) : (
        <>
          {/* Ranking table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-4">
            <div className="grid grid-cols-6 px-3 py-2.5 bg-[#0A0A0F] text-white text-[10px] font-bold tracking-wide">
              <div>#</div>
              <div className="col-span-2">ITEM</div>
              <div>PRICE</div>
              <div>MARGIN</div>
              <div>$/WEEK</div>
            </div>
            {sorted.map((item, rank) => {
              const c = calcMargin(item);
              const isSelected = selected?.menu_item_id === item.menu_item_id;
              return (
                <div
                  key={item.menu_item_id}
                  onClick={() => setSelected(item)}
                  className={`grid grid-cols-6 px-3 py-2.5 text-xs cursor-pointer border-b border-slate-100 transition-all ${
                    isSelected
                      ? "bg-[#00B4FF]/8 border-l-[3px] border-l-[#00B4FF]"
                      : rank % 2 === 0
                        ? "bg-slate-50"
                        : "bg-white"
                  }`}
                >
                  <div
                    className={`font-extrabold ${rank < 3 ? "text-emerald-600" : "text-slate-400"}`}
                  >
                    {rank + 1}
                  </div>
                  <div className="col-span-2 font-bold text-slate-900">
                    {item.name_es || item.name}
                  </div>
                  <div className="text-slate-700">${fmt(item.price || 0)}</div>
                  <div
                    className={`font-extrabold ${
                      c.marginPct > 65
                        ? "text-emerald-600"
                        : c.marginPct > 50
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {c.marginPct}%
                  </div>
                  <div className="font-extrabold text-[#0066CC]">
                    ${fmt(c.weeklyProfit)}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected item detail */}
          {selected && sel && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <div className="text-lg font-extrabold text-slate-900">
                    {selected.name_es || selected.name}
                  </div>
                  <div className="text-xs text-slate-500">
                    {selected.category} • {selected.orders_this_week || 0}{" "}
                    orders/week
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-2xl font-black ${
                      sel.marginPct > 60
                        ? "text-emerald-600"
                        : sel.marginPct > 45
                          ? "text-amber-600"
                          : "text-rose-600"
                    }`}
                  >
                    {sel.marginPct}% margin
                  </div>
                  <div className="text-xs text-slate-500">
                    ${fmt(sel.margin)} profit per{" "}
                    {view === "food" ? "plate" : "drink"}
                  </div>
                </div>
              </div>

              {/* Cost breakdown */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-700">
                    Sale Price
                  </div>
                  <div className="flex-1 h-4 bg-emerald-100 rounded overflow-hidden">
                    <div className="h-full w-full bg-emerald-500 rounded" />
                  </div>
                  <div className="w-20 text-xs font-bold text-slate-900 text-right">
                    ${fmt(selected.price || 0)}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 text-xs font-semibold text-slate-700">
                    Ingredient Cost
                  </div>
                  <div className="flex-1 h-4 bg-slate-100 rounded overflow-hidden">
                    <div
                      className="h-full bg-rose-500 rounded"
                      style={{
                        width: `${Math.min(((selected.ingredient_cost || 0) / (selected.price || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <div className="w-20 text-xs font-bold text-slate-900 text-right">
                    ${fmt(selected.ingredient_cost || 0)}
                  </div>
                </div>
                {withTransport && (selected.transport_cost || 0) > 0 && (
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-xs font-semibold text-amber-700">
                      🚤 Transport
                    </div>
                    <div className="flex-1 h-4 bg-amber-100 rounded overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded"
                        style={{
                          width: `${Math.min(((selected.transport_cost || 0) / (selected.price || 1)) * 100, 100)}%`,
                        }}
                      />
                    </div>
                    <div className="w-20 text-xs font-bold text-amber-700 text-right">
                      ${fmt(selected.transport_cost || 0)}
                    </div>
                  </div>
                )}
              </div>

              {/* Profit summary */}
              <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex justify-between items-center">
                <span className="text-sm font-extrabold text-emerald-700">
                  Weekly Profit from {selected.name_es || selected.name}
                </span>
                <span className="text-lg font-black text-emerald-600">
                  ${fmt(sel.weeklyProfit)} COP
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Kitchen Operations Checklists */}
      {kitchenChecklists.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-extrabold mb-3">
            👨‍🍳 Kitchen Operations Checklists
          </h2>
          <p className="text-slate-500 text-xs mb-4">
            Daily kitchen procedures and service prep. Click to expand and view
            all tasks.
          </p>
          <div className="grid gap-3">
            {kitchenChecklists.map((checklist) => (
              <details
                key={checklist.type}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
                open={expandedChecklist === checklist.type}
                onToggle={(e) => {
                  if ((e.target as HTMLDetailsElement).open) {
                    setExpandedChecklist(checklist.type);
                  } else if (expandedChecklist === checklist.type) {
                    setExpandedChecklist(null);
                  }
                }}
              >
                <summary className="px-4 py-3 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">
                      {checklist.type === "kitchen_open" && "🌅"}
                      {checklist.type === "breakfast_setup" && "🍳"}
                      {checklist.type === "kitchen_lunch_prep" && "🥗"}
                      {checklist.type === "kitchen_dinner_prep" && "🍽️"}
                      {checklist.type === "kitchen_close" && "🌙"}
                    </span>
                    <div>
                      <div className="font-bold text-slate-900">
                        {checklist.name_es}
                      </div>
                      <div className="text-xs text-slate-500">
                        {checklist.name}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg font-semibold">
                      {checklist.items.length} tareas
                    </span>
                    <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-semibold">
                      ~{checklist.estimated_minutes} min
                    </span>
                  </div>
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-slate-100">
                  {/* Progress bar */}
                  {(() => {
                    const progress = kitchenProgress[checklist.type] || {};
                    const completed = Object.values(progress).filter(
                      (p) => p.completed,
                    ).length;
                    const total = checklist.items.length;
                    const pct =
                      total > 0 ? Math.round((completed / total) * 100) : 0;
                    return (
                      <div className="mb-3 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-300"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {completed}/{total}
                        </span>
                      </div>
                    );
                  })()}

                  <div className="space-y-2">
                    {checklist.items.map((item, idx) => {
                      const progress =
                        kitchenProgress[checklist.type]?.[idx] || {};
                      return (
                        <TaskItem
                          key={idx}
                          task={{
                            id: `${checklist.type}_${idx}`,
                            task: item.task,
                            task_es: item.task_es,
                            photo_required: item.photo_required || false,
                            completed: progress.completed || false,
                            photo_url: progress.photo_url,
                            notes: progress.notes,
                          }}
                          index={idx}
                          onToggle={(taskId, completed) =>
                            handleKitchenTaskToggle(
                              checklist.type,
                              idx,
                              completed,
                            )
                          }
                          onPhotoUpload={(taskId, url) =>
                            handleKitchenPhotoUpload(checklist.type, idx, url)
                          }
                          onPhotoRemove={(taskId) =>
                            handleKitchenPhotoRemove(checklist.type, idx)
                          }
                          context="kitchen"
                        />
                      );
                    })}
                  </div>

                  {/* Submit button */}
                  {(() => {
                    const progress = kitchenProgress[checklist.type] || {};
                    const completed = Object.values(progress).filter(
                      (p) => p.completed,
                    ).length;
                    const total = checklist.items.length;
                    const photosUploaded = checklist.items.filter(
                      (item, idx) =>
                        item.photo_required && progress[idx]?.photo_url,
                    ).length;
                    const photosRequired = checklist.items.filter(
                      (item) => item.photo_required,
                    ).length;
                    const canSubmit =
                      completed === total && photosUploaded >= photosRequired;

                    return (
                      <button
                        onClick={() => {
                          if (!canSubmit) {
                            alert(
                              completed < total
                                ? `Completa todas las tareas (${completed}/${total})`
                                : `Sube todas las fotos requeridas (${photosUploaded}/${photosRequired})`,
                            );
                            return;
                          }
                          alert(
                            `✅ ${checklist.name_es} enviado para aprobación`,
                          );
                        }}
                        className={`mt-3 w-full py-2 rounded-lg font-bold text-sm transition-all ${
                          canSubmit
                            ? "bg-emerald-500 text-white hover:bg-emerald-600"
                            : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {canSubmit
                          ? "✅ Enviar para Aprobación"
                          : `${completed}/${total} tareas completadas`}
                      </button>
                    );
                  })()}
                </div>
              </details>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
