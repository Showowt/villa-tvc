import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import {
  inventorySubmitSchema,
  validateApiRequest,
  parseNumericInput,
} from "@/lib/validation";
import { notifyLowStock } from "@/lib/push-notifications";

interface SubmitResult {
  success: number;
  errors: string[];
  duplicates: string[];
  updated: string[];
}

// POST - Submit inventory counts with deduplication + idempotency
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Preprocess items to coerce quantity_counted to numbers
    if (body.items && Array.isArray(body.items)) {
      body.items = body.items.map((item: { quantity_counted?: unknown }) => ({
        ...item,
        quantity_counted: parseNumericInput(item.quantity_counted, 0),
      }));
    }

    // Validate with Zod schema
    const validation = validateApiRequest(inventorySubmitSchema, body);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: validation.error,
          details: validation.details,
          message:
            "Datos de inventario invalidos. Verifica que las cantidades sean numeros positivos.",
        },
        { status: 400 },
      );
    }

    const { items, counted_by, idempotency_key } = validation.data;

    const supabase = createServerClient();
    const now = new Date().toISOString();
    const today = now.split("T")[0];

    // Issue #62: Check idempotency key to prevent duplicate submissions
    if (idempotency_key) {
      const { data: existingKey } = await supabase
        .from("idempotency_keys")
        .select("response")
        .eq("key", idempotency_key)
        .maybeSingle();

      if (existingKey?.response) {
        // Return cached response for duplicate request
        const cachedResponse = existingKey.response as Record<string, unknown>;
        return NextResponse.json({
          ...cachedResponse,
          cached: true,
          message: "Solicitud duplicada - devolviendo resultado anterior",
        });
      }
    }

    const results: SubmitResult = {
      success: 0,
      errors: [],
      duplicates: [],
      updated: [],
    };

    // Get all today's counts for this user in one query (optimization)
    const { data: existingLogs } = await supabase
      .from("inventory_logs")
      .select("id, ingredient_id, quantity_counted")
      .eq("counted_by", counted_by)
      .eq("count_date", today);

    const existingLogsMap = new Map(
      existingLogs?.map((log) => [log.ingredient_id, log]) || [],
    );

    for (const item of items) {
      // Get current stock to calculate variance
      const { data: ingredient } = await supabase
        .from("ingredients")
        .select("current_stock, name_es")
        .eq("id", item.ingredient_id)
        .single();

      if (!ingredient) {
        results.errors.push(`Ingrediente ${item.ingredient_id} no encontrado`);
        continue;
      }

      const existingLog = existingLogsMap.get(item.ingredient_id);

      if (existingLog) {
        // Update existing entry instead of creating duplicate
        const previousQty = ingredient.current_stock || 0;
        const variance = item.quantity_counted - previousQty;

        const { error: updateError } = await supabase
          .from("inventory_logs")
          .update({
            quantity_counted: item.quantity_counted,
            previous_quantity: previousQty,
            variance,
            notes: item.notes || null,
            counted_at: now,
          })
          .eq("id", existingLog.id);

        if (updateError) {
          results.errors.push(
            `Error actualizando ${ingredient.name_es}: ${updateError.message}`,
          );
          continue;
        }

        // Update current stock on ingredient
        await supabase
          .from("ingredients")
          .update({
            current_stock: item.quantity_counted,
            last_updated: now,
            updated_by: counted_by,
          })
          .eq("id", item.ingredient_id);

        results.updated.push(ingredient.name_es);
        results.success++;
        continue;
      }

      const previousQty = ingredient.current_stock || 0;
      const variance = item.quantity_counted - previousQty;

      // Insert new inventory log with count_date
      const { error: logError } = await supabase.from("inventory_logs").insert({
        ingredient_id: item.ingredient_id,
        counted_by,
        quantity_counted: item.quantity_counted,
        previous_quantity: previousQty,
        variance,
        notes: item.notes || null,
        counted_at: now,
        count_date: today,
      });

      if (logError) {
        // Check if it's a duplicate constraint error
        if (logError.code === "23505") {
          results.duplicates.push(ingredient.name_es);
          results.errors.push(
            `Ya contaste ${ingredient.name_es} hoy. Edita el conteo existente.`,
          );
        } else {
          results.errors.push(
            `Error guardando ${ingredient.name_es}: ${logError.message}`,
          );
        }
        continue;
      }

      // Update current stock on ingredient
      const { error: updateError } = await supabase
        .from("ingredients")
        .update({
          current_stock: item.quantity_counted,
          last_updated: now,
          updated_by: counted_by,
        })
        .eq("id", item.ingredient_id);

      if (updateError) {
        results.errors.push(
          `Error actualizando stock de ${ingredient.name_es}: ${updateError.message}`,
        );
        continue;
      }

      results.success++;
    }

    // Get low stock items
    const { data: allIngredients } = await supabase
      .from("ingredients")
      .select("name_es, current_stock, min_stock, unit")
      .eq("is_active", true);

    const lowStock =
      allIngredients?.filter(
        (i) =>
          i.min_stock !== null &&
          i.current_stock !== null &&
          i.current_stock < i.min_stock,
      ) || [];

    // Send push notifications for low stock items
    if (lowStock.length > 0) {
      try {
        for (const item of lowStock.slice(0, 3)) {
          // Limit to 3 notifications
          await notifyLowStock(
            item.name_es,
            item.current_stock || 0,
            item.min_stock || 0,
            item.unit,
          );
        }
      } catch (notifyError) {
        console.error(
          "[inventory/submit] Low stock notification error:",
          notifyError,
        );
        // Don't fail the request if notification fails
      }
    }

    const response = {
      success: true,
      results,
      lowStockAlerts: lowStock.map((i) => ({
        name: i.name_es,
        current: i.current_stock,
        minimum: i.min_stock,
        unit: i.unit,
      })),
      message: buildResponseMessage(results),
    };

    // Store idempotency key with response for future duplicate detection
    if (idempotency_key) {
      await supabase
        .from("idempotency_keys")
        .insert({
          key: idempotency_key,
          user_id: counted_by,
          endpoint: "/api/inventory/submit",
          response: response,
          expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        })
        .catch(() => {
          // Ignore errors storing idempotency key - not critical
        });
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[inventory/submit]", error);
    return NextResponse.json(
      { error: "Error al guardar inventario" },
      { status: 500 },
    );
  }
}

function buildResponseMessage(results: SubmitResult): string {
  const parts: string[] = [];

  if (results.success > 0) {
    const newCount = results.success - results.updated.length;
    if (newCount > 0) {
      parts.push(`${newCount} items guardados`);
    }
  }

  if (results.updated.length > 0) {
    parts.push(`${results.updated.length} actualizados`);
  }

  if (results.errors.length > 0) {
    parts.push(`${results.errors.length} errores`);
  }

  return parts.join(", ") || "Sin cambios";
}

// GET - Retrieve current inventory with today's counts status
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerClient();
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const today = new Date().toISOString().split("T")[0];

    // Get all active ingredients
    const { data: ingredients, error } = await supabase
      .from("ingredients")
      .select("*")
      .eq("is_active", true)
      .order("category")
      .order("name_es");

    if (error) {
      throw error;
    }

    // Get today's counts for this user
    let todaysCounts: Record<
      string,
      { quantity_counted: number; counted_at: string; log_id: string }
    > = {};

    if (userId) {
      const { data: logs } = await supabase
        .from("inventory_logs")
        .select("id, ingredient_id, quantity_counted, counted_at")
        .eq("counted_by", userId)
        .eq("count_date", today);

      if (logs) {
        todaysCounts = logs.reduce(
          (acc, log) => {
            acc[log.ingredient_id] = {
              quantity_counted: log.quantity_counted,
              counted_at: log.counted_at || "",
              log_id: log.id,
            };
            return acc;
          },
          {} as Record<
            string,
            { quantity_counted: number; counted_at: string; log_id: string }
          >,
        );
      }
    }

    type IngredientWithStatus = NonNullable<typeof ingredients>[number] & {
      is_low_stock: boolean;
      counted_today: boolean;
      todays_count: number | null;
      todays_count_time: string | null;
      todays_log_id: string | null;
    };

    const categorized = ingredients?.reduce(
      (acc, ing) => {
        const cat = ing.category;
        if (!acc[cat]) acc[cat] = [];

        const todaysData = todaysCounts[ing.id];

        acc[cat].push({
          ...ing,
          is_low_stock:
            ing.min_stock !== null &&
            ing.current_stock !== null &&
            ing.current_stock < ing.min_stock,
          counted_today: !!todaysData,
          todays_count: todaysData?.quantity_counted ?? null,
          todays_count_time: todaysData?.counted_at ?? null,
          todays_log_id: todaysData?.log_id ?? null,
        });
        return acc;
      },
      {} as Record<string, IngredientWithStatus[]>,
    );

    // Count how many items have been counted today
    const totalItems = ingredients?.length || 0;
    const countedToday = Object.keys(todaysCounts).length;

    return NextResponse.json({
      success: true,
      inventory: categorized,
      total_items: totalItems,
      counted_today: countedToday,
      progress_percent:
        totalItems > 0 ? Math.round((countedToday / totalItems) * 100) : 0,
    });
  } catch (error) {
    console.error("[inventory/submit GET]", error);
    return NextResponse.json(
      { error: "Error al obtener inventario" },
      { status: 500 },
    );
  }
}

// PATCH - Update a specific inventory log entry
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { log_id, quantity_counted, notes, counted_by } = body as {
      log_id: string;
      quantity_counted: number;
      notes?: string;
      counted_by: string;
    };

    if (!log_id || quantity_counted === undefined || !counted_by) {
      return NextResponse.json(
        { error: "Se requiere log_id, quantity_counted y counted_by" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();
    const now = new Date().toISOString();

    // Get the existing log and ingredient
    const { data: existingLog } = await supabase
      .from("inventory_logs")
      .select("ingredient_id, counted_by")
      .eq("id", log_id)
      .single();

    if (!existingLog) {
      return NextResponse.json(
        { error: "Registro no encontrado" },
        { status: 404 },
      );
    }

    // Verify ownership
    if (existingLog.counted_by !== counted_by) {
      return NextResponse.json(
        { error: "No tienes permiso para editar este registro" },
        { status: 403 },
      );
    }

    // Get ingredient info
    const { data: ingredient } = await supabase
      .from("ingredients")
      .select("current_stock, name_es")
      .eq("id", existingLog.ingredient_id)
      .single();

    if (!ingredient) {
      return NextResponse.json(
        { error: "Ingrediente no encontrado" },
        { status: 404 },
      );
    }

    const previousQty = ingredient.current_stock || 0;
    const variance = quantity_counted - previousQty;

    // Update the log
    const { error: updateLogError } = await supabase
      .from("inventory_logs")
      .update({
        quantity_counted,
        previous_quantity: previousQty,
        variance,
        notes: notes || null,
        counted_at: now,
      })
      .eq("id", log_id);

    if (updateLogError) {
      return NextResponse.json(
        { error: `Error actualizando registro: ${updateLogError.message}` },
        { status: 500 },
      );
    }

    // Update ingredient stock
    await supabase
      .from("ingredients")
      .update({
        current_stock: quantity_counted,
        last_updated: now,
        updated_by: counted_by,
      })
      .eq("id", existingLog.ingredient_id);

    return NextResponse.json({
      success: true,
      message: `${ingredient.name_es} actualizado a ${quantity_counted}`,
    });
  } catch (error) {
    console.error("[inventory/submit PATCH]", error);
    return NextResponse.json(
      { error: "Error al actualizar registro" },
      { status: 500 },
    );
  }
}
