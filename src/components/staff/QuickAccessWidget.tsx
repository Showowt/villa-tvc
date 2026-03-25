"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

// ═══════════════════════════════════════════════════════════════
// TVC QUICK ACCESS WIDGET - Issue #10
// Widget de acceso rapido configurable por usuario
// Muestra las acciones mas frecuentes + items recientes
// ═══════════════════════════════════════════════════════════════

interface QuickAction {
  href: string;
  label: string;
  icon: string;
  color: string;
}

interface RecentItem {
  id: string;
  type: "task" | "checklist" | "order";
  title: string;
  subtitle: string;
  href: string;
  time: string;
}

const ACTION_CONFIG: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  "/staff/tasks": { label: "Tareas", icon: "📋", color: "cyan" },
  "/staff/pos": { label: "POS", icon: "🧾", color: "emerald" },
  "/staff/checklist": { label: "Checklists", icon: "✅", color: "blue" },
  "/staff/inventory": { label: "Inventario", icon: "📦", color: "purple" },
  "/staff/kitchen": { label: "Cocina", icon: "👨‍🍳", color: "orange" },
  "/staff/bar": { label: "Bar", icon: "🍸", color: "pink" },
  "/staff/maintenance": { label: "Manten.", icon: "🔧", color: "amber" },
  "/staff/linen": { label: "Ropa", icon: "🛏️", color: "slate" },
  "/staff/services": { label: "Servicios", icon: "🛎️", color: "indigo" },
  "/staff/bot": { label: "AI Bot", icon: "🤖", color: "violet" },
  "/staff/training": { label: "Capacita.", icon: "📚", color: "teal" },
};

export default function QuickAccessWidget() {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [recentItems, setRecentItems] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    try {
      // Obtener usuario y preferencias
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id, department, preferences")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        // Cargar acciones rapidas de preferencias
        const prefs = profile.preferences as Record<string, unknown>;
        const savedActions = (prefs?.quick_actions as string[]) || [];

        // Si no hay acciones guardadas, usar defaults por departamento
        const actions =
          savedActions.length > 0
            ? savedActions
            : getDefaultQuickActions(profile.department);

        setQuickActions(
          actions.map((href) => ({
            href,
            label: ACTION_CONFIG[href]?.label || "Accion",
            icon: ACTION_CONFIG[href]?.icon || "📌",
            color: ACTION_CONFIG[href]?.color || "slate",
          })),
        );

        // Cargar items recientes (ultimas tareas completadas, ordenes, etc)
        const today = new Date().toISOString().split("T")[0];

        // Ultimas tareas
        const { data: recentTasks } = await supabase
          .from("daily_tasks")
          .select("id, date, tasks, department")
          .eq("user_id", profile.id)
          .order("updated_at", { ascending: false })
          .limit(3);

        // Ultimas ordenes
        const { data: recentOrders } = await supabase
          .from("order_logs")
          .select(
            "id, created_at, villa_id, total_price, menu_items!inner(name_es)",
          )
          .eq("served_by", profile.id)
          .order("created_at", { ascending: false })
          .limit(3);

        const items: RecentItem[] = [];

        // Procesar tareas
        recentTasks?.forEach((day) => {
          const tasks = day.tasks as { title_es?: string; id?: string }[];
          if (Array.isArray(tasks) && tasks.length > 0) {
            items.push({
              id: day.id,
              type: "task",
              title: tasks[0]?.title_es || "Tarea",
              subtitle: `${day.department || "General"} • ${day.date}`,
              href: "/staff/tasks",
              time: day.date,
            });
          }
        });

        // Procesar ordenes
        recentOrders?.forEach((order) => {
          const villaNames: Record<string, string> = {
            villa_1: "Teresa",
            villa_2: "Aduana",
            villa_3: "Trinidad",
            villa_4: "Paz",
            pool: "Piscina",
          };
          items.push({
            id: order.id,
            type: "order",
            title: (order.menu_items as { name_es: string }).name_es,
            subtitle: `${villaNames[order.villa_id] || order.villa_id} • $${(order.total_price || 0).toLocaleString()}`,
            href: "/staff/pos",
            time: new Date(order.created_at).toLocaleTimeString("es-CO", {
              hour: "2-digit",
              minute: "2-digit",
            }),
          });
        });

        // Ordenar por tiempo y tomar los 5 mas recientes
        setRecentItems(items.slice(0, 5));
      }
    } catch (error) {
      console.error("[QuickAccessWidget] Error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) {
    return (
      <div className="bg-slate-800 rounded-xl p-4 animate-pulse">
        <div className="h-4 bg-slate-700 rounded w-24 mb-3" />
        <div className="grid grid-cols-4 gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 bg-slate-700 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Quick Actions */}
      {quickActions.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400 uppercase tracking-wide">
              Acceso Rapido
            </span>
            <Link
              href="/staff/settings"
              className="text-xs text-cyan-400 hover:underline"
            >
              Editar
            </Link>
          </div>
          <div
            className={`grid gap-2 ${
              quickActions.length <= 3
                ? "grid-cols-3"
                : quickActions.length === 4
                  ? "grid-cols-4"
                  : "grid-cols-5"
            }`}
          >
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={`bg-slate-800 rounded-xl p-3 text-center border border-slate-700 hover:border-${action.color}-500/50 transition-colors active:scale-95`}
              >
                <span className="text-xl block mb-1">{action.icon}</span>
                <span className="text-[10px] font-medium text-slate-400">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Recent Items */}
      {recentItems.length > 0 && (
        <div>
          <span className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">
            Reciente
          </span>
          <div className="space-y-1">
            {recentItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center gap-3 bg-slate-800/50 rounded-lg p-2 hover:bg-slate-800 transition-colors"
              >
                <span className="text-lg">
                  {item.type === "task"
                    ? "📋"
                    : item.type === "order"
                      ? "🧾"
                      : "✅"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {item.title}
                  </div>
                  <div className="text-xs text-slate-400 truncate">
                    {item.subtitle}
                  </div>
                </div>
                <span className="text-xs text-slate-500">{item.time}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function getDefaultQuickActions(department: string | null): string[] {
  switch (department) {
    case "kitchen":
      return ["/staff/pos", "/staff/inventory", "/staff/kitchen"];
    case "housekeeping":
      return ["/staff/checklist", "/staff/tasks", "/staff/linen"];
    case "maintenance":
      return ["/staff/tasks", "/staff/checklist"];
    case "pool":
      return ["/staff/checklist", "/staff/tasks"];
    case "front_desk":
      return ["/staff/tasks", "/staff/services"];
    default:
      return ["/staff/tasks", "/staff/checklist", "/staff/inventory"];
  }
}
