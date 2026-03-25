"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";

interface PurchaseOrderItem {
  ingredient_id: string;
  name: string;
  name_es: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  delivery_date: string | null;
  status: string;
  items: PurchaseOrderItem[];
  total_cost: number;
  transport_cost: number;
  supplier_notes: string | null;
}

interface ReceivedItem {
  ingredient_id: string;
  ingredient_name: string;
  ordered_qty: number;
  received_qty: number;
  notes: string;
}

export default function ReceivePurchaseOrderPage() {
  const [pendingOrders, setPendingOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const loadPendingOrders = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .eq("status", "sent")
      .order("delivery_date", { ascending: true });

    if (error) {
      console.error("[loadPendingOrders]", error);
    } else {
      setPendingOrders((data as PurchaseOrder[]) || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPendingOrders();
  }, [loadPendingOrders]);

  const selectOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);
    // Initialize received items with ordered quantities
    const items: ReceivedItem[] = (order.items || []).map((item) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.name_es || item.name,
      ordered_qty: item.quantity,
      received_qty: item.quantity, // Default to ordered quantity
      notes: "",
    }));
    setReceivedItems(items);
    setDiscrepancyNotes("");
  };

  const updateReceivedQty = (index: number, qty: number) => {
    const updated = [...receivedItems];
    updated[index].received_qty = qty;
    setReceivedItems(updated);
  };

  const updateItemNotes = (index: number, notes: string) => {
    const updated = [...receivedItems];
    updated[index].notes = notes;
    setReceivedItems(updated);
  };

  const hasDiscrepancies = receivedItems.some(
    (item) => item.ordered_qty !== item.received_qty,
  );

  const handleSubmit = async () => {
    if (!selectedOrder) return;
    setSubmitting(true);

    try {
      const response = await fetch("/api/purchase-order/receive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchase_order_id: selectedOrder.id,
          received_items: receivedItems,
          received_by: "00000000-0000-0000-0000-000000000000", // TODO: Get from auth
          discrepancy_notes: discrepancyNotes || undefined,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(
          data.has_discrepancies
            ? "Entrega recibida con discrepancias registradas"
            : "Entrega recibida exitosamente. Inventario actualizado.",
        );
        setSelectedOrder(null);
        setReceivedItems([]);
        loadPendingOrders();
      } else {
        const data = await response.json();
        alert(data.error || "Error al procesar la entrega");
      }
    } catch (error) {
      console.error("[submitReceiving]", error);
      alert("Error al procesar la entrega");
    }
    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          📦 Recepcion de Pedidos
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Confirmar entrega de ordenes de compra y actualizar inventario
        </p>
      </div>

      {!selectedOrder ? (
        <>
          {/* Pending Orders List */}
          <div className="bg-white rounded-xl border border-slate-200">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">
                Ordenes Pendientes de Recepcion ({pendingOrders.length})
              </h2>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                No hay ordenes pendientes de recepcion
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                    onClick={() => selectOrder(order)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-slate-900">
                            {order.order_number}
                          </span>
                          <Badge color="#3B82F6">Enviada</Badge>
                        </div>
                        <div className="text-sm text-slate-500">
                          {(order.items || []).length} items | Total: $
                          {(order.total_cost || 0).toLocaleString()}
                        </div>
                        {order.delivery_date && (
                          <div className="text-xs text-slate-400 mt-1">
                            Entrega esperada:{" "}
                            {new Date(order.delivery_date).toLocaleDateString(
                              "es-CO",
                            )}
                          </div>
                        )}
                      </div>
                      <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600">
                        Recibir
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          {/* Receiving Form */}
          <div className="bg-white rounded-xl border border-slate-200 mb-4">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">
                  Recibiendo: {selectedOrder.order_number}
                </h2>
                <p className="text-sm text-slate-500">
                  Verificar cantidades recibidas vs ordenadas
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕ Cancelar
              </button>
            </div>

            <div className="p-4">
              {/* Items Table */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-600">
                      Ingrediente
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600">
                      Ordenado
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600">
                      Recibido
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600">
                      Diferencia
                    </th>
                    <th className="text-left py-2 font-medium text-slate-600">
                      Notas
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {receivedItems.map((item, index) => {
                    const diff = item.received_qty - item.ordered_qty;
                    return (
                      <tr
                        key={item.ingredient_id}
                        className="border-b border-slate-50"
                      >
                        <td className="py-3">{item.ingredient_name}</td>
                        <td className="text-center py-3 text-slate-500">
                          {item.ordered_qty}
                        </td>
                        <td className="text-center py-3">
                          <input
                            type="number"
                            min="0"
                            value={item.received_qty}
                            onChange={(e) =>
                              updateReceivedQty(
                                index,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className={`w-20 px-2 py-1 border rounded text-center ${
                              diff !== 0
                                ? "border-amber-300 bg-amber-50"
                                : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="text-center py-3">
                          {diff !== 0 && (
                            <span
                              className={`font-bold ${
                                diff > 0 ? "text-emerald-600" : "text-rose-600"
                              }`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff}
                            </span>
                          )}
                        </td>
                        <td className="py-3">
                          <input
                            type="text"
                            value={item.notes}
                            onChange={(e) =>
                              updateItemNotes(index, e.target.value)
                            }
                            placeholder="Notas..."
                            className="w-full px-2 py-1 border border-slate-200 rounded text-sm"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Discrepancy Warning */}
          {hasDiscrepancies && (
            <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
              <div className="flex items-start gap-3">
                <span className="text-2xl">⚠️</span>
                <div className="flex-1">
                  <h3 className="font-bold text-amber-700">
                    Discrepancias Detectadas
                  </h3>
                  <p className="text-sm text-amber-600 mb-3">
                    Algunas cantidades recibidas difieren de las ordenadas. Por
                    favor documenta la razon.
                  </p>
                  <textarea
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    placeholder="Explica las discrepancias: productos danados, faltantes, sustituciones, etc."
                    className="w-full px-3 py-2 border border-amber-200 rounded-lg text-sm"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (hasDiscrepancies && !discrepancyNotes)}
              className="flex-1 px-4 py-3 bg-emerald-500 text-white rounded-lg font-bold hover:bg-emerald-600 disabled:opacity-50"
            >
              {submitting
                ? "Procesando..."
                : hasDiscrepancies
                  ? "Confirmar con Discrepancias"
                  : "Confirmar Recepcion"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
