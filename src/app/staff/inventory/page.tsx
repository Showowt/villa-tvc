"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type Ingredient = Tables<"ingredients">;

export default function StaffInventoryPage() {
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    loadIngredients();
  }, []);

  const loadIngredients = async () => {
    const supabase = createBrowserClient();

    const { data } = await supabase
      .from("ingredients")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (data) {
      setIngredients(data);
      // Initialize counts with current stock
      const initialCounts: Record<string, string> = {};
      data.forEach((ing) => {
        initialCounts[ing.id] = ing.current_stock?.toString() || "0";
      });
      setCounts(initialCounts);
    }

    setLoading(false);
  };

  const categories = [
    { key: "all", label: "Todos" },
    { key: "protein", label: "Proteínas" },
    { key: "produce", label: "Vegetales" },
    { key: "dairy", label: "Lácteos" },
    { key: "dry_goods", label: "Secos" },
    { key: "beverages", label: "Bebidas" },
    { key: "alcohol", label: "Alcohol" },
    { key: "cleaning", label: "Limpieza" },
  ];

  const filteredIngredients =
    activeCategory === "all"
      ? ingredients
      : ingredients.filter((i) => i.category === activeCategory);

  const handleCountChange = (id: string, value: string) => {
    setCounts((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    setSuccess(false);

    try {
      const supabase = createBrowserClient();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        alert("Por favor inicia sesión");
        return;
      }

      // Get user profile
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!profile) {
        alert("Usuario no encontrado");
        return;
      }

      // Insert inventory logs for changed items
      const logs = Object.entries(counts)
        .filter(([id, count]) => {
          const ingredient = ingredients.find((i) => i.id === id);
          return ingredient && parseFloat(count) !== ingredient.current_stock;
        })
        .map(([ingredientId, count]) => {
          const ingredient = ingredients.find((i) => i.id === ingredientId);
          return {
            ingredient_id: ingredientId,
            quantity_counted: parseFloat(count),
            previous_quantity: ingredient?.current_stock || 0,
            variance: parseFloat(count) - (ingredient?.current_stock || 0),
            counted_by: profile.id,
          };
        });

      if (logs.length > 0) {
        const { error } = await supabase.from("inventory_logs").insert(logs);

        if (error) {
          console.error("Error saving inventory:", error);
          alert("Error al guardar. Intenta de nuevo.");
          return;
        }
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);

      // Reload to get updated stock
      await loadIngredients();
    } catch (error) {
      console.error("Error:", error);
      alert("Error al guardar. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Inventario</h1>
          <p className="text-xs text-slate-400">Conteo diario de stock</p>
        </div>
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="px-4 py-2 bg-cyan-500 text-white rounded-lg font-medium text-sm hover:bg-cyan-600 transition-colors disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Guardar"}
        </button>
      </div>

      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          ✓ Inventario guardado exitosamente
        </div>
      )}

      {/* Category Filter */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              activeCategory === cat.key
                ? "bg-cyan-500 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Ingredients List */}
      <div className="space-y-2">
        {filteredIngredients.map((ingredient) => {
          const currentCount = parseFloat(counts[ingredient.id] || "0");
          const isLow =
            ingredient.min_stock && currentCount < ingredient.min_stock;

          return (
            <div
              key={ingredient.id}
              className={`bg-slate-800 rounded-xl p-3 ${
                isLow ? "border border-red-500/30" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {ingredient.name_es}
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-2">
                    <span>{ingredient.unit}</span>
                    {isLow && (
                      <span className="text-red-400">
                        (Mín: {ingredient.min_stock})
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      handleCountChange(
                        ingredient.id,
                        Math.max(0, currentCount - 1).toString(),
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-lg text-lg hover:bg-slate-600 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={counts[ingredient.id] || "0"}
                    onChange={(e) =>
                      handleCountChange(ingredient.id, e.target.value)
                    }
                    className="w-16 h-8 bg-slate-700 border border-slate-600 rounded-lg text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    min="0"
                    step="0.1"
                  />
                  <button
                    onClick={() =>
                      handleCountChange(
                        ingredient.id,
                        (currentCount + 1).toString(),
                      )
                    }
                    className="w-8 h-8 flex items-center justify-center bg-slate-700 rounded-lg text-lg hover:bg-slate-600 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Summary Footer */}
      <div className="fixed bottom-20 left-0 right-0 bg-slate-900/95 border-t border-slate-700 p-4">
        <div className="flex justify-between text-sm">
          <span className="text-slate-400">
            {filteredIngredients.length} ingredientes
          </span>
          <span className="text-slate-400">
            {
              filteredIngredients.filter(
                (i) =>
                  i.min_stock && parseFloat(counts[i.id] || "0") < i.min_stock,
              ).length
            }{" "}
            bajo stock
          </span>
        </div>
      </div>
    </div>
  );
}
