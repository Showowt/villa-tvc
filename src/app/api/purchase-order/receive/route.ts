import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/client";
import type {
  ReceivedItem,
  DeliveryPhoto,
  DiscrepancyItem,
  ReceivePOResponse,
} from "@/types/receiving";

// Umbral para crear alerta de discrepancia (10%)
const DISCREPANCY_ALERT_THRESHOLD = 10;

interface ReceivePORequest {
  purchase_order_id: string;
  received_items: ReceivedItem[];
  received_by: string;
  discrepancy_notes?: string;
  delivery_photos?: DeliveryPhoto[];
}

export async function POST(request: Request) {
  try {
    const body: ReceivePORequest = await request.json();
    const {
      purchase_order_id,
      received_items,
      received_by,
      discrepancy_notes,
      delivery_photos,
    } = body;

    // Validacion de campos requeridos
    if (!purchase_order_id || !received_items || !received_by) {
      return NextResponse.json(
        {
          error:
            "Campos requeridos: purchase_order_id, received_items, received_by",
        },
        { status: 400 },
      );
    }

    if (received_items.length === 0) {
      return NextResponse.json(
        { error: "La lista de items recibidos no puede estar vacia" },
        { status: 400 },
      );
    }

    const supabase = createServerClient();

    // Obtener la orden de compra para validar y obtener datos
    const { data: purchaseOrder, error: poFetchError } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("id", purchase_order_id)
      .single();

    if (poFetchError || !purchaseOrder) {
      return NextResponse.json(
        { error: "Orden de compra no encontrada" },
        { status: 404 },
      );
    }

    if (purchaseOrder.status === "received") {
      return NextResponse.json(
        { error: "Esta orden ya fue recibida anteriormente" },
        { status: 400 },
      );
    }

    // Calcular discrepancias
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalShortageValue = 0;
    const itemsWithShortage: DiscrepancyItem[] = [];

    for (const item of received_items) {
      totalOrdered += item.ordered_qty;
      totalReceived += item.received_qty;

      if (item.received_qty < item.ordered_qty) {
        const shortageQty = item.ordered_qty - item.received_qty;
        const shortagePct = (shortageQty / item.ordered_qty) * 100;
        const estimatedLoss = shortageQty * (item.unit_cost || 0);
        totalShortageValue += estimatedLoss;

        itemsWithShortage.push({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          ordered_qty: item.ordered_qty,
          received_qty: item.received_qty,
          shortage_qty: shortageQty,
          shortage_pct: Math.round(shortagePct * 100) / 100,
          estimated_loss: estimatedLoss,
        });
      }
    }

    // Calcular porcentaje global de discrepancia
    const discrepancyPct =
      totalOrdered > 0
        ? Math.round(
            ((totalOrdered - totalReceived) / totalOrdered) * 100 * 100,
          ) / 100
        : 0;

    const hasDiscrepancies = itemsWithShortage.length > 0;

    // Actualizar orden de compra con informacion de recepcion
    const { error: poError } = await supabase
      .from("purchase_orders")
      .update({
        status: "received",
        received_at: new Date().toISOString(),
        received_by,
        received_items: received_items,
        has_discrepancies: hasDiscrepancies,
        discrepancy_notes: discrepancy_notes || null,
        delivery_photos: delivery_photos || [],
        discrepancy_pct: discrepancyPct,
        updated_at: new Date().toISOString(),
      })
      .eq("id", purchase_order_id);

    if (poError) {
      console.error("[receive PO] Error actualizando orden:", poError);
      return NextResponse.json(
        { error: "Error al actualizar la orden de compra" },
        { status: 500 },
      );
    }

    // Actualizar inventario con cantidades RECIBIDAS
    for (const item of received_items) {
      if (item.received_qty > 0) {
        // Obtener stock actual
        const { data: ingredient } = await supabase
          .from("ingredients")
          .select("current_stock, supplier")
          .eq("id", item.ingredient_id)
          .single();

        const currentStock = ingredient?.current_stock || 0;
        const newStock = currentStock + item.received_qty;

        // Actualizar stock del ingrediente
        await supabase
          .from("ingredients")
          .update({
            current_stock: newStock,
            last_updated: new Date().toISOString(),
            updated_by: received_by,
          })
          .eq("id", item.ingredient_id);

        // Registrar cambio en inventory_logs
        await supabase.from("inventory_logs").insert({
          ingredient_id: item.ingredient_id,
          quantity_counted: newStock,
          previous_quantity: currentStock,
          variance: item.received_qty,
          counted_by: received_by,
          notes: `Recepcion PO: +${item.received_qty} ${item.unit || ""}${
            item.ordered_qty !== item.received_qty
              ? ` (ordenado: ${item.ordered_qty}, falta: ${item.ordered_qty - item.received_qty})`
              : ""
          }${item.notes ? ` - ${item.notes}` : ""}`,
        });
      }
    }

    // Crear alerta si discrepancia > umbral
    let alertCreated = false;
    if (discrepancyPct >= DISCREPANCY_ALERT_THRESHOLD) {
      // Determinar proveedor desde los items originales
      const poItems = purchaseOrder.items as { supplier?: string }[] | null;
      const supplierName = poItems?.[0]?.supplier || "Proveedor desconocido";

      const { error: alertError } = await supabase
        .from("delivery_discrepancy_alerts")
        .insert({
          purchase_order_id,
          supplier_name: supplierName,
          discrepancy_pct: discrepancyPct,
          total_ordered: totalOrdered,
          total_received: totalReceived,
          shortage_value: totalShortageValue,
          items_affected: itemsWithShortage,
          alert_status: "pending",
        });

      if (alertError) {
        console.error("[receive PO] Error creando alerta:", alertError);
      } else {
        alertCreated = true;
        console.log(
          `[receive PO] Alerta creada: ${discrepancyPct}% discrepancia, perdida estimada: $${totalShortageValue.toLocaleString()}`,
        );
      }

      // Actualizar rendimiento del proveedor
      await updateSupplierPerformance(
        supabase,
        supplierName,
        totalOrdered,
        totalReceived,
        hasDiscrepancies,
      );
    }

    // Construir mensaje de respuesta
    let message = "Entrega recibida exitosamente. Inventario actualizado.";
    if (hasDiscrepancies) {
      message = `Entrega recibida con ${itemsWithShortage.length} item(s) con faltantes.`;
      if (alertCreated) {
        message += ` Alerta creada para gerencia (${discrepancyPct.toFixed(1)}% discrepancia).`;
      }
    }

    const response: ReceivePOResponse = {
      success: true,
      has_discrepancies: hasDiscrepancies,
      discrepancy_pct: discrepancyPct,
      message,
      alert_created: alertCreated,
      items_with_shortage: hasDiscrepancies ? itemsWithShortage : undefined,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[receive PO] Error general:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

// Funcion auxiliar para actualizar el rendimiento del proveedor
async function updateSupplierPerformance(
  supabase: ReturnType<typeof createServerClient>,
  supplierName: string,
  itemsOrdered: number,
  itemsReceived: number,
  hasDiscrepancy: boolean,
) {
  try {
    const itemsShort = Math.max(0, itemsOrdered - itemsReceived);
    const discrepancyPct =
      itemsOrdered > 0
        ? Math.round((itemsShort / itemsOrdered) * 100 * 100) / 100
        : 0;

    // Verificar si ya existe el proveedor
    const { data: existing } = await supabase
      .from("supplier_performance")
      .select("*")
      .eq("supplier_name", supplierName)
      .single();

    if (existing) {
      // Actualizar registro existente
      const newTotalOrders = (existing.total_orders || 0) + 1;
      const newOrdersWithDiscrepancies =
        (existing.orders_with_discrepancies || 0) + (hasDiscrepancy ? 1 : 0);
      const newTotalItemsOrdered =
        (existing.total_items_ordered || 0) + itemsOrdered;
      const newTotalItemsShort = (existing.total_items_short || 0) + itemsShort;
      const newAvgDiscrepancyPct =
        newTotalItemsOrdered > 0
          ? Math.round(
              (newTotalItemsShort / newTotalItemsOrdered) * 100 * 100,
            ) / 100
          : 0;
      const newReliabilityScore = 100 - newAvgDiscrepancyPct;

      await supabase
        .from("supplier_performance")
        .update({
          total_orders: newTotalOrders,
          orders_with_discrepancies: newOrdersWithDiscrepancies,
          total_items_ordered: newTotalItemsOrdered,
          total_items_short: newTotalItemsShort,
          avg_discrepancy_pct: newAvgDiscrepancyPct,
          reliability_score: newReliabilityScore,
          last_order_date: new Date().toISOString(),
          last_discrepancy_date: hasDiscrepancy
            ? new Date().toISOString()
            : existing.last_discrepancy_date,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      // Crear nuevo registro
      await supabase.from("supplier_performance").insert({
        supplier_name: supplierName,
        total_orders: 1,
        orders_with_discrepancies: hasDiscrepancy ? 1 : 0,
        total_items_ordered: itemsOrdered,
        total_items_short: itemsShort,
        avg_discrepancy_pct: discrepancyPct,
        reliability_score: 100 - discrepancyPct,
        last_order_date: new Date().toISOString(),
        last_discrepancy_date: hasDiscrepancy ? new Date().toISOString() : null,
      });
    }
  } catch (error) {
    console.error("[updateSupplierPerformance] Error:", error);
    // No lanzamos error para no afectar la operacion principal
  }
}

// GET - Obtener alertas de discrepancia pendientes
export async function GET() {
  try {
    const supabase = createServerClient();

    const { data: alerts, error } = await supabase
      .from("delivery_discrepancy_alerts")
      .select("*")
      .eq("alert_status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      alerts: alerts || [],
      count: alerts?.length || 0,
    });
  } catch (error) {
    console.error("[GET discrepancy alerts]", error);
    return NextResponse.json(
      { error: "Error al obtener alertas de discrepancia" },
      { status: 500 },
    );
  }
}
