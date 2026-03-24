"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";

type ChecklistTemplate = Tables<"checklist_templates">;

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  category: string;
  sort_order: number;
  completed?: boolean;
  photo_url?: string;
  notes?: string;
  completed_at?: string;
}

export default function ChecklistTypePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const checklistId = searchParams.get("id");
  const type = params.type as string;

  const [template, setTemplate] = useState<ChecklistTemplate | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [villaId, setVillaId] = useState("");
  const [started, setStarted] = useState(false);
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(
    checklistId,
  );

  useEffect(() => {
    loadTemplate();
  }, [type]);

  const loadTemplate = async () => {
    const supabase = createBrowserClient();

    // Load template - cast type to match enum
    const checklistType = type as Tables<"checklist_templates">["type"];
    const { data: templateData } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("type", checklistType)
      .single();

    if (templateData) {
      setTemplate(templateData);

      // If we have an existing checklist ID, load it
      if (checklistId) {
        const { data: checklist } = await supabase
          .from("checklists")
          .select("*")
          .eq("id", checklistId)
          .single();

        if (checklist) {
          setItems(checklist.items as unknown as ChecklistItem[]);
          setVillaId(checklist.villa_id || "");
          setStarted(true);
          setActiveChecklistId(checklist.id);
        }
      } else {
        // Initialize items from template
        const templateItems = templateData.items as unknown as ChecklistItem[];
        setItems(
          templateItems.map((item) => ({
            ...item,
            completed: false,
            photo_url: undefined,
            notes: undefined,
          })),
        );
      }
    }

    setLoading(false);
  };

  const handleStartChecklist = async () => {
    if (type.includes("villa") && !villaId) {
      alert("Por favor selecciona la villa");
      return;
    }

    const supabase = createBrowserClient();

    // Get current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/staff/login");
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      alert("Usuario no encontrado");
      return;
    }

    // Create checklist record
    const { data: checklist, error } = await supabase
      .from("checklists")
      .insert({
        template_id: template?.id,
        type: type as Tables<"checklists">["type"],
        villa_id: villaId || null,
        items: items as unknown as Json,
        status: "in_progress" as const,
        assigned_to: profile.id,
        started_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating checklist:", error);
      alert("Error al iniciar checklist");
      return;
    }

    setActiveChecklistId(checklist.id);
    setStarted(true);
  };

  const handleToggleItem = async (index: number) => {
    const newItems = [...items];
    newItems[index].completed = !newItems[index].completed;
    if (newItems[index].completed) {
      newItems[index].completed_at = new Date().toISOString();
    } else {
      newItems[index].completed_at = undefined;
    }
    setItems(newItems);

    // Auto-save to database
    if (activeChecklistId) {
      const supabase = createBrowserClient();
      await supabase
        .from("checklists")
        .update({ items: newItems as unknown as Json })
        .eq("id", activeChecklistId);
    }
  };

  const handleComplete = async () => {
    const incompleteRequired = items.filter(
      (item) => !item.completed && item.photo_required,
    );

    if (incompleteRequired.length > 0) {
      alert(
        `Faltan ${incompleteRequired.length} tareas con foto requerida por completar`,
      );
      return;
    }

    setSaving(true);

    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user!.id)
        .single();

      if (!activeChecklistId) {
        alert("No hay checklist activo");
        setSaving(false);
        return;
      }

      await supabase
        .from("checklists")
        .update({
          items: items as unknown as Json,
          status: "complete" as const,
          completed_by: profile?.id,
          completed_at: new Date().toISOString(),
        })
        .eq("id", activeChecklistId);

      router.push("/staff");
    } catch (error) {
      console.error("Error completing checklist:", error);
      alert("Error al completar checklist");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-2">❌</div>
        <p className="text-slate-400">Checklist no encontrado</p>
      </div>
    );
  }

  // Villa selection screen
  if (!started && type.includes("villa")) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">{template.name_es}</h1>
          <p className="text-xs text-slate-400">{template.description}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm font-medium mb-2">
            Selecciona la Villa
          </label>
          <select
            value={villaId}
            onChange={(e) => setVillaId(e.target.value)}
            className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="">-- Seleccionar --</option>
            <option value="villa_1">Villa 1</option>
            <option value="villa_2">Villa 2</option>
            <option value="villa_3">Villa 3</option>
            <option value="main_house">Casa Principal</option>
          </select>
        </div>

        <button
          onClick={handleStartChecklist}
          disabled={!villaId}
          className="w-full py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors disabled:opacity-50"
        >
          Comenzar Checklist
        </button>
      </div>
    );
  }

  // Start screen for non-villa checklists
  if (!started) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-xl font-bold">{template.name_es}</h1>
          <p className="text-xs text-slate-400">{template.description}</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Tareas</span>
            <span className="text-sm font-medium">{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-400">Tiempo estimado</span>
            <span className="text-sm font-medium">
              ~{template.estimated_minutes} min
            </span>
          </div>
        </div>

        <button
          onClick={handleStartChecklist}
          className="w-full py-3 bg-cyan-500 text-white rounded-lg font-medium hover:bg-cyan-600 transition-colors"
        >
          Comenzar Checklist
        </button>
      </div>
    );
  }

  // Active checklist
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold">{template.name_es}</h1>
        {villaId && (
          <p className="text-xs text-cyan-400 uppercase">
            {villaId.replace("_", " ")}
          </p>
        )}
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progreso</span>
          <span className="text-sm font-medium">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <button
            key={index}
            onClick={() => handleToggleItem(index)}
            className={`w-full text-left bg-slate-800 rounded-xl p-4 transition-colors ${
              item.completed
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : ""
            }`}
          >
            <div className="flex items-start gap-3">
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                  item.completed
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : "border-slate-600"
                }`}
              >
                {item.completed && (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div className="flex-1">
                <div
                  className={`text-sm ${
                    item.completed ? "line-through text-slate-500" : ""
                  }`}
                >
                  {item.task_es}
                </div>
                {item.photo_required && !item.completed && (
                  <div className="text-[10px] text-amber-400 mt-1">
                    📷 Foto requerida
                  </div>
                )}
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Complete Button */}
      <div className="fixed bottom-20 left-0 right-0 p-4 bg-slate-900/95 border-t border-slate-700">
        <button
          onClick={handleComplete}
          disabled={saving || completedCount === 0}
          className="w-full py-3 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Completar Checklist"}
        </button>
      </div>
    </div>
  );
}
