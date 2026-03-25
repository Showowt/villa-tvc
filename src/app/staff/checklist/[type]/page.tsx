"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";
import PhotoUpload from "@/components/ui/PhotoUpload";
import MobileHeader from "@/components/staff/MobileHeader";
import LargeTouchButton from "@/components/staff/LargeTouchButton";
import {
  getPendingPhotosForChecklist,
  getPendingPhotoCount,
  processPendingPhotos,
  onPhotoSyncComplete,
  initPhotoSync,
  type PendingPhoto,
  type UploadResult,
} from "@/lib/image-compression";

type ChecklistTemplate = Tables<"checklist_templates">;

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  category: string;
  sort_order: number;
  completed?: boolean;
  photo_url?: string;
  photo_pending?: boolean;
  notes?: string;
  completed_at?: string;
}

// Villa list for selection
const VILLAS = [
  { id: "villa_1", name: "Teresa" },
  { id: "villa_2", name: "Aduana" },
  { id: "villa_3", name: "Trinidad" },
  { id: "villa_4", name: "Paz" },
  { id: "villa_5", name: "San Pedro" },
  { id: "villa_6", name: "San Diego" },
  { id: "villa_7", name: "Coche" },
  { id: "villa_8", name: "Pozo" },
  { id: "villa_9", name: "Santo Domingo" },
  { id: "villa_10", name: "Merced" },
  { id: "main_house", name: "Casa Principal" },
];

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
  const [startedAt, setStartedAt] = useState<string | null>(null);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [cleaningDeadline, setCleaningDeadline] = useState<string | null>(null);
  const [deadlineCountdown, setDeadlineCountdown] = useState<string | null>(
    null,
  );
  const [deadlineUrgency, setDeadlineUrgency] = useState<
    "normal" | "warning" | "critical" | "overdue"
  >("normal");
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [viewMode, setViewMode] = useState<"list" | "single">("list");
  const [dbPendingPhotoCount, setDbPendingPhotoCount] = useState(0);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Initialize photo sync and online status
  useEffect(() => {
    const cleanup = initPhotoSync();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Listen for photo sync completions
    const unsubscribe = onPhotoSyncComplete(async (result) => {
      if (result.uploaded > 0 && activeChecklistId) {
        await loadDbPendingPhotoCount();
        await updateChecklistPhotoStatus();
      }
    });

    return () => {
      cleanup();
      unsubscribe();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [activeChecklistId]);

  // Load pending photo count from IndexedDB
  const loadDbPendingPhotoCount = useCallback(async () => {
    if (!activeChecklistId) return;
    try {
      const photos = await getPendingPhotosForChecklist(activeChecklistId);
      setDbPendingPhotoCount(photos.length);
    } catch {
      // Ignore errors
    }
  }, [activeChecklistId]);

  useEffect(() => {
    loadDbPendingPhotoCount();
  }, [loadDbPendingPhotoCount]);

  // Update checklist status when photos are uploaded
  const updateChecklistPhotoStatus = useCallback(async () => {
    if (!activeChecklistId) return;

    const supabase = createBrowserClient();
    const photos = await getPendingPhotosForChecklist(activeChecklistId);

    if (photos.length === 0) {
      const { data: checklist } = await supabase
        .from("checklists")
        .select("status, notes")
        .eq("id", activeChecklistId)
        .single();

      if (checklist?.notes?.includes("Fotos pendientes")) {
        await supabase
          .from("checklists")
          .update({
            status: "complete" as const,
            notes: null,
            completed_at: new Date().toISOString(),
          })
          .eq("id", activeChecklistId);
      }
    }
  }, [activeChecklistId]);

  // Retry pending photos
  const handleRetryPendingPhotos = useCallback(async () => {
    if (!activeChecklistId) return;

    const result = await processPendingPhotos(
      async (photo: PendingPhoto, uploadResult: UploadResult) => {
        if (uploadResult.success && uploadResult.url) {
          const newItems = [...items];
          if (newItems[photo.itemIndex]) {
            newItems[photo.itemIndex].photo_url = uploadResult.url;
            newItems[photo.itemIndex].photo_pending = false;
            setItems(newItems);

            const supabase = createBrowserClient();
            await supabase
              .from("checklists")
              .update({ items: newItems as unknown as Json })
              .eq("id", activeChecklistId);
          }
        }
      },
    );

    await loadDbPendingPhotoCount();

    if (result.uploaded > 0) {
      await updateChecklistPhotoStatus();
    }
  }, [
    activeChecklistId,
    items,
    loadDbPendingPhotoCount,
    updateChecklistPhotoStatus,
  ]);

  // Load template
  const loadTemplate = useCallback(async () => {
    const supabase = createBrowserClient();

    const checklistType = type as Tables<"checklist_templates">["type"];
    const { data: templateData } = await supabase
      .from("checklist_templates")
      .select("*")
      .eq("type", checklistType)
      .single();

    if (templateData) {
      setTemplate(templateData);

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
          setStartedAt(checklist.started_at || null);
        }
      } else {
        const templateItems = templateData.items as unknown as ChecklistItem[];
        setItems(
          templateItems.map((item) => ({
            ...item,
            completed: false,
            photo_url: undefined,
            photo_pending: false,
            notes: undefined,
          })),
        );
      }
    }

    setLoading(false);
  }, [type, checklistId]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  // Calculate deadline countdown
  useEffect(() => {
    if (!cleaningDeadline) {
      setDeadlineCountdown(null);
      setDeadlineUrgency("normal");
      return;
    }

    const updateCountdown = () => {
      const deadline = new Date(cleaningDeadline);
      const now = new Date();
      const diffMs = deadline.getTime() - now.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));

      if (diffMinutes < 0) {
        const overdueMins = Math.abs(diffMinutes);
        const hours = Math.floor(overdueMins / 60);
        const mins = overdueMins % 60;
        setDeadlineCountdown(
          hours > 0 ? `-${hours}h ${mins}m ATRASADO` : `-${mins}m ATRASADO`,
        );
        setDeadlineUrgency("overdue");
      } else if (diffMinutes <= 30) {
        setDeadlineCountdown(`${diffMinutes}m`);
        setDeadlineUrgency("critical");
      } else if (diffMinutes <= 60) {
        setDeadlineCountdown(`${diffMinutes}m`);
        setDeadlineUrgency("warning");
      } else {
        const hours = Math.floor(diffMinutes / 60);
        const mins = diffMinutes % 60;
        setDeadlineCountdown(`${hours}h ${mins}m`);
        setDeadlineUrgency("normal");
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [cleaningDeadline]);

  // Calculate elapsed time
  const [elapsedTime, setElapsedTime] = useState<string>("00:00");

  useEffect(() => {
    if (!startedAt) return;

    const updateTime = () => {
      const start = new Date(startedAt);
      const now = new Date();
      const diff = Math.floor((now.getTime() - start.getTime()) / 1000);
      const minutes = Math.floor(diff / 60);
      const seconds = diff % 60;
      setElapsedTime(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`,
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const handleStartChecklist = async () => {
    if (type.includes("villa") && !villaId) {
      alert("Por favor selecciona la villa");
      return;
    }

    const supabase = createBrowserClient();

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

    const now = new Date().toISOString();

    const { data: checklist, error } = await supabase
      .from("checklists")
      .insert({
        template_id: template?.id,
        type: type as Tables<"checklists">["type"],
        villa_id: villaId || null,
        items: items as unknown as Json,
        status: "in_progress" as const,
        assigned_to: profile.id,
        started_at: now,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating checklist:", error);
      alert("Error al iniciar checklist");
      return;
    }

    setActiveChecklistId(checklist.id);
    setStartedAt(now);
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

    if (activeChecklistId) {
      const supabase = createBrowserClient();
      await supabase
        .from("checklists")
        .update({ items: newItems as unknown as Json })
        .eq("id", activeChecklistId);
    }

    // Auto-advance to next item in single view mode
    if (viewMode === "single" && newItems[index].completed) {
      const nextIncomplete = newItems.findIndex(
        (item, i) => i > index && !item.completed,
      );
      if (nextIncomplete !== -1) {
        setTimeout(() => setCurrentItemIndex(nextIncomplete), 300);
      }
    }
  };

  const handlePhotoUpload = useCallback(
    async (index: number, url: string) => {
      const newItems = [...items];
      newItems[index].photo_url = url;
      newItems[index].photo_pending = false;
      setItems(newItems);

      if (activeChecklistId) {
        const supabase = createBrowserClient();
        await supabase
          .from("checklists")
          .update({ items: newItems as unknown as Json })
          .eq("id", activeChecklistId);
      }
    },
    [items, activeChecklistId],
  );

  const handlePhotoError = useCallback(
    (index: number) => {
      const newItems = [...items];
      newItems[index].photo_pending = true;
      setItems(newItems);
    },
    [items],
  );

  const handleComplete = async () => {
    const itemsPendingPhotos = items.filter(
      (item) => item.photo_required && item.photo_pending,
    );

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

      const completedAt = new Date().toISOString();

      let durationMinutes: number | null = null;
      if (startedAt) {
        const start = new Date(startedAt);
        const end = new Date(completedAt);
        durationMinutes = Math.round(
          (end.getTime() - start.getTime()) / (1000 * 60),
        );
      }

      // Check for pending photos (both in items state and in IndexedDB)
      const dbPendingPhotos =
        await getPendingPhotosForChecklist(activeChecklistId);
      const totalPendingPhotos =
        itemsPendingPhotos.length + dbPendingPhotos.length;

      const status = totalPendingPhotos > 0 ? "in_progress" : "complete";
      const notes =
        totalPendingPhotos > 0
          ? `Fotos pendientes: ${totalPendingPhotos}`
          : null;

      await supabase
        .from("checklists")
        .update({
          items: items as unknown as Json,
          status: status as "in_progress" | "complete",
          completed_by: status === "complete" ? profile?.id : null,
          completed_at: status === "complete" ? completedAt : null,
          duration_minutes: durationMinutes,
          notes: notes,
        })
        .eq("id", activeChecklistId);

      if (totalPendingPhotos > 0) {
        alert(
          `Checklist guardado con ${totalPendingPhotos} foto(s) pendiente(s). Se subiran automaticamente cuando haya conexion.`,
        );
      }

      router.push("/staff/tasks");
    } catch (error) {
      console.error("Error completing checklist:", error);
      alert("Error al completar checklist");
    } finally {
      setSaving(false);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
  const itemsPendingPhotoCount = items.filter(
    (i) => i.photo_required && i.photo_pending,
  ).length;
  const totalPendingPhotoCount = itemsPendingPhotoCount + dbPendingPhotoCount;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="text-center py-12">
        <div className="text-5xl mb-3">❌</div>
        <p className="text-slate-400 text-lg">Checklist no encontrado</p>
        <LargeTouchButton
          onClick={() => router.push("/staff/checklist")}
          variant="secondary"
          className="mt-6"
        >
          Volver
        </LargeTouchButton>
      </div>
    );
  }

  // Villa selection screen - Mobile optimized with large buttons
  if (!started && type.includes("villa")) {
    return (
      <div className="space-y-6">
        <MobileHeader
          title={template.name_es}
          subtitle={template.description || undefined}
          showBack
          backHref="/staff/checklist"
        />

        <div className="bg-slate-800 rounded-xl p-4">
          <label className="block text-sm font-medium mb-3">
            Selecciona la Villa
          </label>
          <div className="grid grid-cols-2 gap-3">
            {VILLAS.map((villa) => (
              <button
                key={villa.id}
                onClick={() => setVillaId(villa.id)}
                className={`min-h-[56px] rounded-xl font-medium text-base transition-all active:scale-95 ${
                  villaId === villa.id
                    ? "bg-cyan-500 text-white"
                    : "bg-slate-700 text-slate-300 active:bg-slate-600"
                }`}
              >
                {villa.name}
              </button>
            ))}
          </div>
        </div>

        {/* Cleaning deadline */}
        {deadlineCountdown && (
          <div
            className={`p-4 rounded-xl ${
              deadlineUrgency === "overdue"
                ? "bg-red-500/20 border border-red-500"
                : deadlineUrgency === "critical"
                  ? "bg-red-500/20 border border-red-500/50"
                  : deadlineUrgency === "warning"
                    ? "bg-amber-500/20 border border-amber-500/50"
                    : "bg-emerald-500/20 border border-emerald-500/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-400">
                  Deadline de Limpieza
                </div>
                <div
                  className={`text-2xl font-mono font-bold ${
                    deadlineUrgency === "overdue" ||
                    deadlineUrgency === "critical"
                      ? "text-red-400"
                      : deadlineUrgency === "warning"
                        ? "text-amber-400"
                        : "text-emerald-400"
                  }`}
                >
                  {deadlineCountdown}
                </div>
              </div>
              {deadlineUrgency === "overdue" && (
                <div className="text-4xl animate-pulse">⚠️</div>
              )}
            </div>
          </div>
        )}

        <LargeTouchButton
          onClick={handleStartChecklist}
          disabled={!villaId}
          fullWidth
          size="xl"
        >
          Comenzar Checklist
        </LargeTouchButton>
      </div>
    );
  }

  // Start screen for non-villa checklists
  if (!started) {
    return (
      <div className="space-y-6">
        <MobileHeader
          title={template.name_es}
          subtitle={template.description || undefined}
          showBack
          backHref="/staff/checklist"
        />

        <div className="bg-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-slate-400">Tareas</span>
            <span className="text-2xl font-bold">{items.length}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Tiempo estimado</span>
            <span className="text-2xl font-bold">
              ~{template.estimated_minutes} min
            </span>
          </div>
        </div>

        <LargeTouchButton onClick={handleStartChecklist} fullWidth size="xl">
          Comenzar Checklist
        </LargeTouchButton>
      </div>
    );
  }

  // Active checklist - Single item view mode
  if (viewMode === "single") {
    const currentItem = items[currentItemIndex];
    const hasNext = currentItemIndex < items.length - 1;
    const hasPrev = currentItemIndex > 0;

    return (
      <div className="flex flex-col min-h-[calc(100vh-180px)]">
        {/* Progress bar at top */}
        <div className="sticky top-0 bg-slate-900 pb-4 z-10">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={() => setViewMode("list")}
              className="text-sm text-cyan-400 min-h-[44px] flex items-center"
            >
              Ver lista
            </button>
            <span className="text-sm font-medium">
              {currentItemIndex + 1} / {items.length}
            </span>
            <div className="text-sm font-mono text-cyan-400">{elapsedTime}</div>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-cyan-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Current item - Full screen */}
        <div className="flex-1 flex flex-col">
          <div className="bg-slate-800 rounded-xl p-6 flex-1 flex flex-col">
            {/* Task text */}
            <div className="text-xl font-medium mb-6">
              {currentItem.task_es}
            </div>

            {/* Photo section */}
            {currentItem.photo_required && (
              <div className="flex-1 mb-6">
                {currentItem.photo_url ? (
                  <div className="relative h-full min-h-[200px]">
                    <img
                      src={currentItem.photo_url}
                      alt="Foto de verificacion"
                      className="w-full h-full object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        const newItems = [...items];
                        newItems[currentItemIndex].photo_url = undefined;
                        setItems(newItems);
                      }}
                      className="absolute top-3 right-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <PhotoUpload
                    context={type}
                    taskId={`${activeChecklistId}_${currentItemIndex}`}
                    onUploadComplete={(url) =>
                      handlePhotoUpload(currentItemIndex, url)
                    }
                    onUploadError={() => handlePhotoError(currentItemIndex)}
                  />
                )}
              </div>
            )}

            {/* Large completion button */}
            <button
              onClick={() => handleToggleItem(currentItemIndex)}
              className={`min-h-[72px] rounded-xl font-bold text-lg transition-all active:scale-95 flex items-center justify-center gap-3 ${
                currentItem.completed
                  ? "bg-emerald-500 text-white"
                  : "bg-slate-700 text-white"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  currentItem.completed
                    ? "bg-white border-white"
                    : "border-slate-400"
                }`}
              >
                {currentItem.completed && (
                  <svg
                    className="w-5 h-5 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={3}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              {currentItem.completed ? "Completado" : "Marcar Completado"}
            </button>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex gap-3 pt-4">
          <LargeTouchButton
            onClick={() => setCurrentItemIndex(currentItemIndex - 1)}
            disabled={!hasPrev}
            variant="secondary"
            className="flex-1"
          >
            Anterior
          </LargeTouchButton>
          {hasNext ? (
            <LargeTouchButton
              onClick={() => setCurrentItemIndex(currentItemIndex + 1)}
              className="flex-1"
            >
              Siguiente
            </LargeTouchButton>
          ) : (
            <LargeTouchButton
              onClick={handleComplete}
              loading={saving}
              variant="success"
              className="flex-1"
            >
              Enviar
            </LargeTouchButton>
          )}
        </div>
      </div>
    );
  }

  // Active checklist - List view (default)
  return (
    <div className="space-y-4 pb-32">
      {/* Header with timer */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">{template.name_es}</h1>
          {villaId && (
            <p className="text-sm text-cyan-400 uppercase">
              {villaId.replace("_", " ")}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {/* Cleaning Deadline */}
          {deadlineCountdown && type.includes("villa") && (
            <div
              className={`px-3 py-2 rounded-xl ${
                deadlineUrgency === "overdue"
                  ? "bg-red-500/20 border border-red-500 animate-pulse"
                  : deadlineUrgency === "critical"
                    ? "bg-red-500/20 border border-red-500/50"
                    : deadlineUrgency === "warning"
                      ? "bg-amber-500/20 border border-amber-500/50"
                      : "bg-slate-800"
              }`}
            >
              <div className="text-[10px] text-slate-400">Deadline</div>
              <div
                className={`text-sm font-mono font-bold ${
                  deadlineUrgency === "overdue" ||
                  deadlineUrgency === "critical"
                    ? "text-red-400"
                    : deadlineUrgency === "warning"
                      ? "text-amber-400"
                      : "text-emerald-400"
                }`}
              >
                {deadlineCountdown}
              </div>
            </div>
          )}
          {/* Timer */}
          <div className="bg-slate-800 px-3 py-2 rounded-xl">
            <div className="text-[10px] text-slate-400">Tiempo</div>
            <div className="text-sm font-mono font-bold text-cyan-400">
              {elapsedTime}
            </div>
          </div>
        </div>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setViewMode("list")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "list"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Lista
        </button>
        <button
          onClick={() => setViewMode("single")}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
            viewMode === "single"
              ? "bg-cyan-500 text-white"
              : "bg-slate-800 text-slate-400"
          }`}
        >
          Uno a uno
        </button>
      </div>

      {/* Progress */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Progreso</span>
          <span className="text-sm font-bold">
            {completedCount}/{items.length}
          </span>
        </div>
        <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-cyan-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Pending Photos Indicator */}
      {totalPendingPhotoCount > 0 && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <svg
            className="w-4 h-4 text-amber-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <span className="text-xs text-amber-400 flex-1">
            {totalPendingPhotoCount} foto(s) pendiente(s) de subir
          </span>
          {isOnline && (
            <button
              onClick={handleRetryPendingPhotos}
              className="text-xs text-amber-400 hover:text-amber-300 underline"
            >
              Reintentar
            </button>
          )}
        </div>
      )}

      {/* Offline Indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/20 rounded-lg">
          <svg
            className="w-4 h-4 text-red-400 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 000-7.072m-2.828 2.828a1 1 0 010 1.415M9.879 9.879a3 3 0 014.242 4.242"
            />
          </svg>
          <span className="text-xs text-red-400">
            Sin conexion - fotos se subiran automaticamente
          </span>
        </div>
      )}

      {/* Items - Large touch targets */}
      <div className="space-y-3">
        {items.map((item, index) => (
          <div
            key={index}
            className={`bg-slate-800 rounded-xl transition-colors ${
              item.completed
                ? "bg-emerald-500/10 border border-emerald-500/30"
                : ""
            }`}
          >
            <button
              onClick={() => {
                if (item.photo_required) {
                  setExpandedItem(expandedItem === index ? null : index);
                } else {
                  handleToggleItem(index);
                }
              }}
              className="w-full text-left p-4 min-h-[72px]"
            >
              <div className="flex items-center gap-4">
                {/* Large Checkbox - 56px */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleItem(index);
                  }}
                  className={`w-14 h-14 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors cursor-pointer active:scale-95 ${
                    item.completed
                      ? "bg-emerald-500 border-emerald-500 text-white"
                      : "border-slate-500 active:border-cyan-500"
                  }`}
                >
                  {item.completed && (
                    <svg
                      className="w-7 h-7"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-base ${
                      item.completed ? "line-through text-slate-500" : ""
                    }`}
                  >
                    {item.task_es}
                  </div>
                  {item.photo_required && (
                    <div
                      className={`text-xs mt-1 flex items-center gap-1 ${
                        item.photo_url
                          ? "text-emerald-400"
                          : item.photo_pending
                            ? "text-amber-400"
                            : "text-amber-400"
                      }`}
                    >
                      📷{" "}
                      {item.photo_url
                        ? "Foto subida"
                        : item.photo_pending
                          ? "Foto pendiente"
                          : "Foto requerida"}
                    </div>
                  )}
                </div>
                {item.photo_required && (
                  <svg
                    className={`w-6 h-6 text-slate-400 transition-transform flex-shrink-0 ${
                      expandedItem === index ? "rotate-180" : ""
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                )}
              </div>
            </button>

            {/* Expanded photo section */}
            {item.photo_required && expandedItem === index && (
              <div className="px-4 pb-4 pt-0">
                {item.photo_url ? (
                  <div className="relative">
                    <img
                      src={item.photo_url}
                      alt="Foto de verificacion"
                      className="w-full aspect-video object-cover rounded-xl"
                    />
                    <button
                      onClick={() => {
                        const newItems = [...items];
                        newItems[index].photo_url = undefined;
                        setItems(newItems);
                      }}
                      className="absolute top-3 right-3 w-12 h-12 bg-red-500 rounded-full flex items-center justify-center text-white active:scale-95"
                    >
                      <svg
                        className="w-6 h-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                ) : (
                  <PhotoUpload
                    context={type}
                    taskId={`${activeChecklistId}_${index}`}
                    checklistId={activeChecklistId || undefined}
                    itemIndex={index}
                    onUploadComplete={(url) => handlePhotoUpload(index, url)}
                    onUploadError={() => handlePhotoError(index)}
                  />
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Sticky bottom action bar */}
      <div className="fixed bottom-[72px] left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 safe-area-bottom">
        <LargeTouchButton
          onClick={handleComplete}
          loading={saving}
          disabled={completedCount === 0}
          fullWidth
          variant="success"
          size="xl"
        >
          {totalPendingPhotoCount > 0
            ? `Enviar (${totalPendingPhotoCount} fotos pendientes)`
            : "Enviar Checklist"}
        </LargeTouchButton>
      </div>
    </div>
  );
}
