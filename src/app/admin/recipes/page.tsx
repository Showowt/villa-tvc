"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import Link from "next/link";

interface MenuItem {
  id: string;
  name: string;
  name_es: string;
  category: string;
  price: number;
}

interface Ingredient {
  id: string;
  name: string;
  name_es: string;
  unit: string;
  cost_per_unit: number;
  category: string;
}

interface Recipe {
  id: string;
  menu_item_id: string;
  ingredient_id: string;
  quantity: number;
  unit: string;
  notes: string | null;
  is_optional: boolean;
  ingredient?: Ingredient;
}

export default function RecipesAdminPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // New ingredient form
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecipe, setNewRecipe] = useState({
    ingredient_id: "",
    quantity: 0,
    unit: "",
    notes: "",
    is_optional: false,
  });

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const supabase = createBrowserClient();

  // Load menu items and ingredients on mount
  useEffect(() => {
    async function loadData() {
      try {
        const [menuRes, ingRes] = await Promise.all([
          supabase
            .from("menu_items")
            .select("id, name, name_es, category, price")
            .eq("is_active", true)
            .order("category")
            .order("name"),
          supabase
            .from("ingredients")
            .select("id, name, name_es, unit, cost_per_unit, category")
            .eq("is_active", true)
            .order("category")
            .order("name"),
        ]);

        if (menuRes.data) setMenuItems(menuRes.data);
        if (ingRes.data) setIngredients(ingRes.data);
      } catch (error) {
        console.error("[RecipesAdmin] Error loading data:", error);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [supabase]);

  // Load recipes when item selected
  const loadRecipes = useCallback(
    async (itemId: string) => {
      const { data, error } = await supabase
        .from("recipes")
        .select(
          `
        id,
        menu_item_id,
        ingredient_id,
        quantity,
        unit,
        notes,
        is_optional,
        ingredient:ingredients(id, name, name_es, unit, cost_per_unit, category)
      `,
        )
        .eq("menu_item_id", itemId)
        .order("created_at");

      if (error) {
        console.error("[RecipesAdmin] Error loading recipes:", error);
        return;
      }

      setRecipes(
        (data || []).map((r) => ({
          ...r,
          ingredient: Array.isArray(r.ingredient)
            ? r.ingredient[0]
            : r.ingredient,
        })),
      );
    },
    [supabase],
  );

  useEffect(() => {
    if (selectedItem) {
      loadRecipes(selectedItem.id);
    }
  }, [selectedItem, loadRecipes]);

  // Filter menu items
  const filteredItems = menuItems.filter((item) => {
    const matchesCategory =
      categoryFilter === "all" || item.category === categoryFilter;
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.name_es.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate total cost for selected item
  const totalCost = recipes.reduce((sum, r) => {
    const cost = r.ingredient
      ? Number(r.quantity) * Number(r.ingredient.cost_per_unit)
      : 0;
    return sum + cost;
  }, 0);
  const transportCost = totalCost * 0.15;
  const margin = selectedItem
    ? Number(selectedItem.price) - totalCost - transportCost
    : 0;
  const marginPct = selectedItem
    ? (margin / Number(selectedItem.price)) * 100
    : 0;

  // Add new recipe ingredient
  const handleAddRecipe = async () => {
    if (!selectedItem || !newRecipe.ingredient_id || newRecipe.quantity <= 0) {
      setMessage({ type: "error", text: "Please fill all required fields" });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from("recipes").insert({
        menu_item_id: selectedItem.id,
        ingredient_id: newRecipe.ingredient_id,
        quantity: newRecipe.quantity,
        unit:
          newRecipe.unit ||
          ingredients.find((i) => i.id === newRecipe.ingredient_id)?.unit ||
          "",
        notes: newRecipe.notes || null,
        is_optional: newRecipe.is_optional,
      });

      if (error) throw error;

      setMessage({ type: "success", text: "Ingredient added to recipe" });
      setNewRecipe({
        ingredient_id: "",
        quantity: 0,
        unit: "",
        notes: "",
        is_optional: false,
      });
      setShowAddForm(false);
      loadRecipes(selectedItem.id);
    } catch (error) {
      console.error("[RecipesAdmin] Error adding recipe:", error);
      setMessage({ type: "error", text: "Failed to add ingredient" });
    } finally {
      setSaving(false);
    }
  };

  // Update recipe quantity
  const handleUpdateQuantity = async (recipeId: string, quantity: number) => {
    if (quantity <= 0) return;

    try {
      const { error } = await supabase
        .from("recipes")
        .update({ quantity })
        .eq("id", recipeId);

      if (error) throw error;

      setRecipes((prev) =>
        prev.map((r) => (r.id === recipeId ? { ...r, quantity } : r)),
      );
    } catch (error) {
      console.error("[RecipesAdmin] Error updating quantity:", error);
      setMessage({ type: "error", text: "Failed to update quantity" });
    }
  };

  // Delete recipe ingredient
  const handleDeleteRecipe = async (recipeId: string) => {
    if (!confirm("Remove this ingredient from the recipe?")) return;

    try {
      const { error } = await supabase
        .from("recipes")
        .delete()
        .eq("id", recipeId);

      if (error) throw error;

      setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
      setMessage({ type: "success", text: "Ingredient removed" });
    } catch (error) {
      console.error("[RecipesAdmin] Error deleting recipe:", error);
      setMessage({ type: "error", text: "Failed to remove ingredient" });
    }
  };

  const formatCOP = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const categories = [...new Set(menuItems.map((i) => i.category))];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Recipe Manager
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Edit ingredients for each menu item. Changes update P&L
                calculations in real-time.
              </p>
            </div>
            <Link
              href="/ops/dishes"
              className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 transition-all"
            >
              Back to Dish P&L
            </Link>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div
            className={`mb-4 p-4 rounded-xl border ${
              message.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            {message.text}
            <button
              onClick={() => setMessage(null)}
              className="ml-4 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Menu Items List */}
          <div className="lg:col-span-1 bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200">
              <h2 className="font-bold text-slate-900 mb-3">Menu Items</h2>

              {/* Search */}
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm mb-3"
              />

              {/* Category Filter */}
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => setCategoryFilter("all")}
                  className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
                    categoryFilter === "all"
                      ? "bg-[#0A0A0F] text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  All
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition-all ${
                      categoryFilter === cat
                        ? "bg-[#0A0A0F] text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {cat.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>

            <div className="max-h-[600px] overflow-y-auto">
              {filteredItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setSelectedItem(item)}
                  className={`w-full px-4 py-3 text-left border-b border-slate-100 hover:bg-slate-50 transition-all ${
                    selectedItem?.id === item.id ? "bg-blue-50" : ""
                  }`}
                >
                  <div className="font-semibold text-slate-900">
                    {item.name}
                  </div>
                  <div className="text-xs text-slate-500 flex justify-between">
                    <span className="capitalize">
                      {item.category.replace("_", " ")}
                    </span>
                    <span className="font-bold">{formatCOP(item.price)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Recipe Editor */}
          <div className="lg:col-span-2">
            {selectedItem ? (
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                {/* Item Header */}
                <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">
                        {selectedItem.name}
                      </h2>
                      <p className="text-slate-500">{selectedItem.name_es}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-black text-slate-900">
                        {formatCOP(selectedItem.price)}
                      </div>
                      <div className="text-xs text-slate-500 capitalize">
                        {selectedItem.category.replace("_", " ")}
                      </div>
                    </div>
                  </div>

                  {/* Cost Summary */}
                  <div className="grid grid-cols-4 gap-3 mt-4">
                    <div className="bg-rose-50 rounded-lg p-3 border border-rose-200">
                      <div className="text-[10px] text-rose-600 font-bold">
                        INGREDIENT COST
                      </div>
                      <div className="text-lg font-black text-rose-700">
                        {formatCOP(totalCost)}
                      </div>
                    </div>
                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div className="text-[10px] text-amber-600 font-bold">
                        TRANSPORT (15%)
                      </div>
                      <div className="text-lg font-black text-amber-700">
                        {formatCOP(transportCost)}
                      </div>
                    </div>
                    <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-200">
                      <div className="text-[10px] text-emerald-600 font-bold">
                        MARGIN
                      </div>
                      <div className="text-lg font-black text-emerald-700">
                        {formatCOP(margin)}
                      </div>
                    </div>
                    <div
                      className={`rounded-lg p-3 border ${
                        marginPct >= 60
                          ? "bg-emerald-50 border-emerald-200"
                          : marginPct >= 40
                            ? "bg-amber-50 border-amber-200"
                            : "bg-rose-50 border-rose-200"
                      }`}
                    >
                      <div
                        className={`text-[10px] font-bold ${
                          marginPct >= 60
                            ? "text-emerald-600"
                            : marginPct >= 40
                              ? "text-amber-600"
                              : "text-rose-600"
                        }`}
                      >
                        MARGIN %
                      </div>
                      <div
                        className={`text-lg font-black ${
                          marginPct >= 60
                            ? "text-emerald-700"
                            : marginPct >= 40
                              ? "text-amber-700"
                              : "text-rose-700"
                        }`}
                      >
                        {marginPct.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recipe Ingredients */}
                <div className="p-5">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-900">
                      Recipe Ingredients ({recipes.length})
                    </h3>
                    <button
                      onClick={() => setShowAddForm(!showAddForm)}
                      className="px-4 py-2 bg-[#0A0A0F] text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all"
                    >
                      {showAddForm ? "Cancel" : "+ Add Ingredient"}
                    </button>
                  </div>

                  {/* Add Form */}
                  {showAddForm && (
                    <div className="bg-slate-50 rounded-xl p-4 mb-4 border border-slate-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                        <div className="col-span-2">
                          <label className="text-xs font-bold text-slate-600 mb-1 block">
                            Ingredient
                          </label>
                          <select
                            value={newRecipe.ingredient_id}
                            onChange={(e) =>
                              setNewRecipe((prev) => ({
                                ...prev,
                                ingredient_id: e.target.value,
                                unit:
                                  ingredients.find(
                                    (i) => i.id === e.target.value,
                                  )?.unit || "",
                              }))
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                          >
                            <option value="">Select ingredient...</option>
                            {ingredients.map((ing) => (
                              <option key={ing.id} value={ing.id}>
                                {ing.name} ({ing.unit}) -{" "}
                                {formatCOP(ing.cost_per_unit)}/{ing.unit}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">
                            Quantity
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={newRecipe.quantity || ""}
                            onChange={(e) =>
                              setNewRecipe((prev) => ({
                                ...prev,
                                quantity: parseFloat(e.target.value) || 0,
                              }))
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="e.g. 0.2"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-bold text-slate-600 mb-1 block">
                            Unit
                          </label>
                          <input
                            type="text"
                            value={newRecipe.unit}
                            onChange={(e) =>
                              setNewRecipe((prev) => ({
                                ...prev,
                                unit: e.target.value,
                              }))
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                            placeholder="kg, L, unit"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={handleAddRecipe}
                          disabled={saving}
                          className="px-6 py-2 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
                        >
                          {saving ? "Adding..." : "Add to Recipe"}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Ingredients Table */}
                  {recipes.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-slate-500 border-b border-slate-200">
                          <th className="pb-2 text-left">Ingredient</th>
                          <th className="pb-2 text-right">Qty</th>
                          <th className="pb-2 text-right">Unit Cost</th>
                          <th className="pb-2 text-right">Line Cost</th>
                          <th className="pb-2 text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {recipes.map((recipe) => {
                          const lineCost = recipe.ingredient
                            ? Number(recipe.quantity) *
                              Number(recipe.ingredient.cost_per_unit)
                            : 0;
                          return (
                            <tr
                              key={recipe.id}
                              className="border-b border-slate-100"
                            >
                              <td className="py-3">
                                <div className="font-semibold text-slate-900">
                                  {recipe.ingredient?.name || "Unknown"}
                                </div>
                                <div className="text-xs text-slate-500">
                                  {recipe.ingredient?.name_es}
                                </div>
                              </td>
                              <td className="py-3 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={recipe.quantity}
                                  onChange={(e) =>
                                    handleUpdateQuantity(
                                      recipe.id,
                                      parseFloat(e.target.value) || 0,
                                    )
                                  }
                                  className="w-20 px-2 py-1 text-right border border-slate-200 rounded text-sm"
                                />
                                <span className="ml-1 text-slate-500">
                                  {recipe.unit}
                                </span>
                              </td>
                              <td className="py-3 text-right text-slate-600">
                                {formatCOP(
                                  Number(recipe.ingredient?.cost_per_unit || 0),
                                )}
                                /{recipe.ingredient?.unit}
                              </td>
                              <td className="py-3 text-right font-bold text-rose-600">
                                {formatCOP(lineCost)}
                              </td>
                              <td className="py-3 text-center">
                                <button
                                  onClick={() => handleDeleteRecipe(recipe.id)}
                                  className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-50 font-bold">
                          <td className="py-3 text-slate-900" colSpan={3}>
                            Total Ingredient Cost
                          </td>
                          <td className="py-3 text-right text-rose-700">
                            {formatCOP(totalCost)}
                          </td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  ) : (
                    <div className="text-center py-8 text-slate-500">
                      <p className="mb-2">No ingredients added yet.</p>
                      <p className="text-xs">
                        Click &quot;Add Ingredient&quot; to start building this
                        recipe.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 p-12 text-center">
                <div className="text-4xl mb-4">Recipe</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">
                  Select a Menu Item
                </h3>
                <p className="text-slate-500">
                  Choose an item from the left to view and edit its recipe.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
