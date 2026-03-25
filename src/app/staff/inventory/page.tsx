"use client";

// ═══════════════════════════════════════════════════════════════
// TVC STAFF INVENTORY PAGE — MOBILE-FIRST WITH DEDUPLICATION
// Issues #2, #3, #9, #62 — P0 Fixes + Duplicate Prevention
// ═══════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";
import { useToast } from "@/components/ui/Toast";
import { parseNumericInput, coercedPositiveNumber } from "@/lib/validation";
import {
  SkeletonInventoryItem,
  ButtonLoader,
} from "@/components/ui/LoadingSkeleton";
import {
  ApiError,
  normalizeApiError,
  type ApiErrorType,
} from "@/components/ui/ApiError";
import { useOnlineStatus } from "@/lib/api";
import MobileHeader from "@/components/staff/MobileHeader";
import LargeTouchButton from "@/components/staff/LargeTouchButton";
import PullToRefresh from "@/components/staff/PullToRefresh";
import QuantityInput from "@/components/staff/QuantityInput";

// Extended ingredient type with today's count status (Issue #62)
type Ingredient = Tables<"ingredients"> & {
  counted_today?: boolean;
  todays_count?: number | null;
  todays_count_time?: string | null;
  todays_log_id?: string | null;
  is_low_stock?: boolean;
};

interface InventoryApiResponse {
  success: boolean;
  inventory: Record<string, Ingredient[]>;
  total_items: number;
  counted_today: number;
  progress_percent: number;
}

// Validation error state per ingredient
type ValidationErrors = Record<string, string | null>;

// Category configuration with icons
const CATEGORIES = [
  { key: "all", label: "Todos", icon: "📦" },
  { key: "protein", label: "Proteinas", icon: "🥩" },
  { key: "produce", label: "Vegetales", icon: "🥬" },
  { key: "dairy", label: "Lacteos", icon: "🧀" },
  { key: "dry_goods", label: "Secos", icon: "🌾" },
  { key: "beverages", label: "Bebidas", icon: "🥤" },
  { key: "alcohol", label: "Alcohol", icon: "🍷" },
  { key: "cleaning", label: "Limpieza", icon: "🧴" },
];

// Issue #62: Generate unique idempotency key for deduplication
function generateIdempotencyKey(): string {
  return `inv_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
}

export default function StaffInventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<ApiErrorType | null>(null);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [progress, setProgress] = useState({ counted: 0, total: 0 });
  // Issue #62: Edit confirmation modal state
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingEdit, setPendingEdit] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const { addToast } = useToast();
  const isOnline = useOnlineStatus();

  // Issue #62: Debounce tracking to prevent rapid submits
  const lastSubmitRef = useRef<number>(0);
  const pendingSubmitRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idempotencyKeyRef = useRef<string | null>(null);

  // Initialize user on mount
  useEffect(() => {
    initializeUser();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const initializeUser = async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const supabase = createBrowserClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (profile) {
        setUserId(profile.id);
        await loadIngredients(profile.id);
      }
    } catch (err) {
      console.error("[Inventory] Error initializing:", err);
      const apiError = normalizeApiError(err);
      setFetchError(apiError);
    } finally {
      setLoading(false);
    }
  };

  const loadIngredients = useCallback(
    async (userIdParam?: string) => {
      setFetchError(null);

      try {
        const uid = userIdParam || userId;
        // Issue #62: Use API that returns today's count status
        const url = uid
          ? `/api/inventory/submit?user_id=${uid}`
          : "/api/inventory/submit";

        const response = await fetch(url);
        const data: InventoryApiResponse = await response.json();

        if (data.success && data.inventory) {
          // Flatten categorized inventory to single array
          const allIngredients: Ingredient[] = Object.values(
            data.inventory,
          ).flat();

          setIngredients(allIngredients);
          setProgress({
            counted: data.counted_today,
            total: data.total_items,
          });

          // Initialize counts - use today's count if exists, else current stock
          const initialCounts: Record<string, string> = {};
          allIngredients.forEach((ing) => {
            if (ing.counted_today && ing.todays_count !== null) {
              initialCounts[ing.id] = ing.todays_count.toString();
            } else {
              initialCounts[ing.id] = ing.current_stock?.toString() || "0";
            }
          });
          setCounts(initialCounts);
          setErrors({}); // Clear errors on reload
        }
      } catch (err) {
        console.error("[Inventory] Error loading:", err);
        const apiError = normalizeApiError(err);
        setFetchError(apiError);
      }
    },
    [userId],
  );

  const handleRefresh = async () => {
    await loadIngredients();
  };

  // Filter ingredients
  const filteredIngredients = ingredients.filter((i) => {
    const matchesCategory =
      activeCategory === "all" || i.category === activeCategory;
    const matchesSearch =
      searchQuery === "" ||
      i.name_es.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCountChange = useCallback((id: string, value: string) => {
    setCounts((prev) => ({ ...prev, [id]: value }));

    // Validate the input
    const result = coercedPositiveNumber.safeParse(value);
    if (!result.success) {
      setErrors((prev) => ({
        ...prev,
        [id]: "Cantidad debe ser un numero positivo",
      }));
    } else {
      setErrors((prev) => ({ ...prev, [id]: null }));
    }
  }, []);

  const handleNumericChange = useCallback(
    (id: string, value: number) => {
      handleCountChange(id, value.toString());
    },
    [handleCountChange],
  );

  // Issue #62: Debounced submit handler to prevent duplicate submissions
  const handleSubmit = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastSubmit = now - lastSubmitRef.current;

    // Prevent rapid double-submits (< 2 seconds apart)
    if (timeSinceLastSubmit < 2000) {
      // Queue the submit for later
      if (pendingSubmitRef.current) {
        clearTimeout(pendingSubmitRef.current);
      }
      pendingSubmitRef.current = setTimeout(() => {
        handleSubmit();
      }, 2000 - timeSinceLastSubmit);
      addToast("info", "Procesando solicitud anterior...");
      return;
    }

    // Check online status
    if (!isOnline) {
      addToast(
        "warning",
        "Sin conexion. Guardado para cuando vuelvas a conectarte.",
      );
      return;
    }

    // Client-side validation before submit
    const validationErrors: ValidationErrors = {};
    let hasErrors = false;

    Object.entries(counts).forEach(([id, value]) => {
      const result = coercedPositiveNumber.safeParse(value);
      if (!result.success) {
        validationErrors[id] = "Cantidad debe ser un numero positivo";
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(validationErrors);
      addToast("error", "Corrige los errores antes de guardar");
      return;
    }

    if (saving || !userId) {
      if (!userId) {
        addToast("error", "Por favor inicia sesion");
      }
      return;
    }

    setSaving(true);
    lastSubmitRef.current = now;

    // Issue #62: Generate new idempotency key for this submission
    idempotencyKeyRef.current = generateIdempotencyKey();

    try {
      // Find items that changed
      const changedItems = Object.entries(counts)
        .filter(([id, count]) => {
          const ingredient = ingredients.find((i) => i.id === id);
          if (!ingredient) return false;

          const numericCount = parseNumericInput(count, 0);

          // If already counted today, check if value changed from today's count
          if (ingredient.counted_today && ingredient.todays_count !== null) {
            return numericCount !== ingredient.todays_count;
          }
          // Otherwise check against current stock
          return numericCount !== ingredient.current_stock;
        })
        .map(([ingredientId, count]) => ({
          ingredient_id: ingredientId,
          quantity_counted: parseNumericInput(count, 0),
        }));

      if (changedItems.length === 0) {
        addToast("info", "Sin cambios para guardar");
        setSaving(false);
        return;
      }

      const response = await fetch("/api/inventory/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: changedItems,
          counted_by: userId,
          idempotency_key: idempotencyKeyRef.current,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error("API Error:", data);
        addToast("error", data.message || "Error al guardar inventario");
        return;
      }

      // Issue #62: Check for cached response (duplicate request)
      if (data.cached) {
        addToast("info", "Ya se guardo este conteo");
      } else {
        addToast("success", data.message || "Inventario guardado");
      }

      // Show low stock alerts
      if (data.lowStockAlerts && data.lowStockAlerts.length > 0) {
        addToast(
          "warning",
          `${data.lowStockAlerts.length} item(s) bajo stock minimo`,
        );
      }

      // Reload to get updated status
      await loadIngredients();
    } catch (error) {
      console.error("[inventory] Submit error:", error);
      addToast("error", "Error de conexion. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  }, [
    counts,
    ingredients,
    userId,
    saving,
    isOnline,
    addToast,
    loadIngredients,
  ]);

  // Issue #62: Handle edit of existing count
  const handleEditExisting = useCallback(
    (ingredientId: string, ingredientName: string) => {
      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (ingredient?.counted_today) {
        setPendingEdit({ id: ingredientId, name: ingredientName });
        setShowEditConfirm(true);
      }
    },
    [ingredients],
  );

  const confirmEdit = useCallback(() => {
    if (pendingEdit) {
      setEditingItem(pendingEdit.id);
      setExpandedItem(pendingEdit.id); // Also expand for editing
    }
    setShowEditConfirm(false);
    setPendingEdit(null);
  }, [pendingEdit]);

  const cancelEdit = useCallback(() => {
    setShowEditConfirm(false);
    setPendingEdit(null);
  }, []);

  // Issue #62: Handle single item update (PATCH)
  const handleUpdateSingleItem = useCallback(
    async (ingredientId: string) => {
      if (!userId) return;

      const ingredient = ingredients.find((i) => i.id === ingredientId);
      if (!ingredient?.todays_log_id) return;

      // Validate the input
      const result = coercedPositiveNumber.safeParse(counts[ingredientId]);
      if (!result.success) {
        addToast("error", "Cantidad invalida");
        return;
      }

      setSaving(true);

      try {
        const response = await fetch("/api/inventory/submit", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            log_id: ingredient.todays_log_id,
            quantity_counted: parseNumericInput(counts[ingredientId] || "0", 0),
            counted_by: userId,
          }),
        });

        const data = await response.json();

        if (data.success) {
          addToast("success", data.message);
          setEditingItem(null);
          setExpandedItem(null);
          await loadIngredients();
        } else {
          addToast("error", data.error || "Error al actualizar");
        }
      } catch (error) {
        console.error("[inventory] Update error:", error);
        addToast("error", "Error de conexion");
      } finally {
        setSaving(false);
      }
    },
    [userId, ingredients, counts, addToast, loadIngredients],
  );

  const lowStockCount = filteredIngredients.filter(
    (i) => i.min_stock && parseNumericInput(counts[i.id], 0) < i.min_stock,
  ).length;

  const errorCount = Object.values(errors).filter(Boolean).length;
  const countedTodayCount = filteredIngredients.filter(
    (i) => i.counted_today,
  ).length;

  // Loading state with skeleton
  if (loading) {
    return (
      <div className="space-y-4 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-6 w-32 bg-slate-700/50 rounded animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
            <div className="h-3 w-24 bg-slate-700/50 rounded mt-2 animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
          </div>
          <div className="h-11 w-24 bg-slate-700/50 rounded-xl animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]" />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="h-12 w-24 bg-slate-700/50 rounded-xl animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]"
            />
          ))}
        </div>
        <div className="space-y-3">
          <SkeletonInventoryItem />
          <SkeletonInventoryItem />
          <SkeletonInventoryItem />
          <SkeletonInventoryItem />
          <SkeletonInventoryItem />
        </div>
      </div>
    );
  }

  // Error state
  if (fetchError) {
    return (
      <ApiError error={fetchError} onRetry={initializeUser} className="mt-8" />
    );
  }

  // Not logged in state
  if (!userId) {
    return (
      <div className="p-4 text-center">
        <p className="text-slate-400">Por favor inicia sesion</p>
      </div>
    );
  }

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4 pb-36 animate-fade-in">
        {/* Offline indicator */}
        {!isOnline && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-center gap-2">
            <span className="text-amber-400">📡</span>
            <span className="text-sm text-amber-400">
              Sin conexion - Los cambios se guardaran cuando vuelvas
            </span>
          </div>
        )}

        {/* Header */}
        <MobileHeader
          title="Inventario"
          subtitle="Conteo diario de stock"
          rightAction={
            <LargeTouchButton
              onClick={handleSubmit}
              loading={saving}
              size="md"
              variant="primary"
            >
              <ButtonLoader loading={saving} loadingText="...">
                Guardar
              </ButtonLoader>
            </LargeTouchButton>
          }
        />

        {/* Issue #62: Progress Bar - Show daily count progress */}
        <div className="bg-slate-800 rounded-xl p-3">
          <div className="flex justify-between text-xs text-slate-400 mb-1">
            <span>Progreso de hoy</span>
            <span>
              {progress.counted}/{progress.total} items (
              {progress.total > 0
                ? Math.round((progress.counted / progress.total) * 100)
                : 0}
              %)
            </span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
              style={{
                width: `${progress.total > 0 ? (progress.counted / progress.total) * 100 : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Issue #62: Edit Confirmation Modal */}
        {showEditConfirm && pendingEdit && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-800 rounded-xl p-4 max-w-sm w-full animate-scale-in">
              <h3 className="font-semibold text-lg mb-2">Editar conteo</h3>
              <p className="text-slate-400 text-sm mb-4">
                Ya contaste{" "}
                <span className="text-white">{pendingEdit.name}</span> hoy.
                Deseas editar el conteo existente?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelEdit}
                  className="flex-1 px-4 py-3 bg-slate-700 text-white rounded-xl text-sm font-medium active:scale-95"
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmEdit}
                  className="flex-1 px-4 py-3 bg-cyan-500 text-white rounded-xl text-sm font-medium active:scale-95"
                >
                  Editar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Search bar */}
        <div className="relative">
          <svg
            className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            placeholder="Buscar ingrediente..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-slate-400"
            >
              <svg
                className="w-5 h-5"
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
          )}
        </div>

        {/* Category tabs - Horizontal scroll with large touch targets */}
        <div className="overflow-x-auto -mx-4 px-4">
          <div className="flex gap-2 pb-2">
            {CATEGORIES.map((cat) => {
              const count =
                cat.key === "all"
                  ? ingredients.length
                  : ingredients.filter((i) => i.category === cat.key).length;
              return (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl text-sm font-medium transition-all active:scale-95 flex items-center gap-2 min-h-[48px] ${
                    activeCategory === cat.key
                      ? "bg-cyan-500 text-white"
                      : "bg-slate-800 text-slate-400 active:bg-slate-700"
                  }`}
                >
                  <span className="text-lg">{cat.icon}</span>
                  <span>{cat.label}</span>
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full ${
                      activeCategory === cat.key
                        ? "bg-cyan-600"
                        : "bg-slate-700"
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Low stock alert */}
        {lowStockCount > 0 && (
          <div className="p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl text-amber-400 text-sm flex items-center gap-2">
            <svg
              className="w-5 h-5 flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <span>
              <strong>{lowStockCount}</strong> item(s) bajo stock minimo
            </span>
          </div>
        )}

        {/* Ingredients List - Large touch targets */}
        <div className="space-y-3">
          {filteredIngredients.map((ingredient) => {
            const currentCount = parseNumericInput(counts[ingredient.id], 0);
            const isLow =
              ingredient.min_stock && currentCount < ingredient.min_stock;
            const hasError = Boolean(errors[ingredient.id]);
            const isExpanded = expandedItem === ingredient.id;
            const countedToday = ingredient.counted_today;
            const isEditing = editingItem === ingredient.id;

            return (
              <div
                key={ingredient.id}
                className={`bg-slate-800 rounded-xl transition-all ${
                  hasError
                    ? "border-2 border-red-500"
                    : isLow
                      ? "border-2 border-amber-500/50"
                      : countedToday && !isEditing
                        ? "border-2 border-emerald-500/50"
                        : ""
                }`}
              >
                {/* Main row */}
                <button
                  onClick={() => {
                    // Issue #62: If already counted, show edit confirmation
                    if (countedToday && !isEditing && !isExpanded) {
                      handleEditExisting(ingredient.id, ingredient.name_es);
                    } else {
                      setExpandedItem(isExpanded ? null : ingredient.id);
                    }
                  }}
                  className="w-full p-4 text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-base truncate">
                          {ingredient.name_es}
                        </span>
                        {/* Issue #62: "Ya contado hoy" indicator */}
                        {countedToday && !isEditing && (
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded flex-shrink-0">
                            Ya contado
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                        <span>{ingredient.unit}</span>
                        {isLow && !hasError && (
                          <span className="text-amber-400 font-medium">
                            Min: {ingredient.min_stock}
                          </span>
                        )}
                        {countedToday && ingredient.todays_count_time && (
                          <span className="text-emerald-400/60">
                            {new Date(
                              ingredient.todays_count_time,
                            ).toLocaleTimeString("es", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                      {hasError && (
                        <div className="text-xs text-red-400 mt-1 flex items-center gap-1">
                          <svg
                            className="w-3 h-3"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          {errors[ingredient.id]}
                        </div>
                      )}
                    </div>

                    {/* Quick +/- buttons or Edit button for counted items */}
                    {countedToday && !isEditing ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditExisting(ingredient.id, ingredient.name_es);
                        }}
                        className="px-4 py-2 bg-slate-700 text-slate-300 rounded-xl text-sm font-medium active:scale-95 flex items-center gap-2"
                      >
                        <span>Editar</span>
                        <span className="text-emerald-400">
                          ({ingredient.todays_count})
                        </span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCountChange(
                              ingredient.id,
                              Math.max(0, currentCount - 1).toString(),
                            );
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-slate-700 rounded-xl text-xl font-bold active:scale-95 active:bg-slate-600"
                          aria-label="Decrementar"
                        >
                          -
                        </button>
                        <div className="w-16 text-center">
                          <div
                            className={`text-xl font-bold ${
                              hasError
                                ? "text-red-400"
                                : isLow
                                  ? "text-amber-400"
                                  : "text-white"
                            }`}
                          >
                            {currentCount}
                          </div>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCountChange(
                              ingredient.id,
                              (currentCount + 1).toString(),
                            );
                          }}
                          className="w-12 h-12 flex items-center justify-center bg-cyan-500 rounded-xl text-xl font-bold active:scale-95 active:bg-cyan-600"
                          aria-label="Incrementar"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </button>

                {/* Expanded - Large number input with numeric keypad */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 border-t border-slate-700">
                    <div className="pt-4">
                      <QuantityInput
                        value={currentCount}
                        onChange={(val) =>
                          handleNumericChange(ingredient.id, val)
                        }
                        min={0}
                        step={ingredient.unit === "kg" ? 0.1 : 1}
                        unit={ingredient.unit}
                        size="xl"
                      />
                    </div>
                    {ingredient.min_stock && (
                      <div className="mt-4 text-center">
                        <span className="text-xs text-slate-400">
                          Stock minimo:{" "}
                        </span>
                        <span
                          className={`text-sm font-bold ${isLow ? "text-amber-400" : "text-emerald-400"}`}
                        >
                          {ingredient.min_stock} {ingredient.unit}
                        </span>
                      </div>
                    )}
                    {/* Issue #62: Update button for editing existing counts */}
                    {isEditing && ingredient.todays_log_id && (
                      <div className="mt-4">
                        <LargeTouchButton
                          onClick={() => handleUpdateSingleItem(ingredient.id)}
                          loading={saving}
                          fullWidth
                          variant="primary"
                          size="md"
                        >
                          {saving ? "Actualizando..." : "Actualizar conteo"}
                        </LargeTouchButton>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Empty state */}
        {filteredIngredients.length === 0 && (
          <div className="bg-slate-800 rounded-xl p-8 text-center">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-slate-400">No se encontraron ingredientes</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setActiveCategory("all");
              }}
              className="mt-4 text-cyan-400 text-sm min-h-[44px]"
            >
              Limpiar filtros
            </button>
          </div>
        )}

        {/* Sticky Summary Footer */}
        <div className="fixed bottom-[72px] left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 p-4 safe-area-bottom">
          <div className="flex justify-between items-center mb-3">
            <span className="text-slate-400">
              {filteredIngredients.length} ingredientes
            </span>
            <div className="flex gap-3">
              {errorCount > 0 && (
                <span className="text-red-400 font-medium">
                  {errorCount} errores
                </span>
              )}
              <span className="text-emerald-400 font-medium">
                {countedTodayCount} contados
              </span>
              {lowStockCount > 0 && (
                <span className="text-amber-400 font-medium">
                  {lowStockCount} bajo
                </span>
              )}
            </div>
          </div>
          <LargeTouchButton
            onClick={handleSubmit}
            loading={saving}
            fullWidth
            variant="success"
            size="lg"
            disabled={errorCount > 0}
          >
            Guardar Inventario
          </LargeTouchButton>
        </div>
      </div>
    </PullToRefresh>
  );
}
