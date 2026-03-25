"use client";

import { useState, useEffect, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface PurchaseOrderItem {
  ingredient_id: string;
  name: string;
  qty: number;
  cost: number;
}

interface ActualItem {
  ingredient_id: string;
  name: string;
  estimated_qty: number;
  estimated_cost: number;
  actual_qty: number;
  actual_cost: number;
  variance: number;
  variance_pct: number;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  order_date: string;
  status: string;
  items: PurchaseOrderItem[];
  subtotal: number;
  transport_cost: number;
  total_cost: number;
  actual_items: ActualItem[];
  actual_subtotal: number;
  actual_total_cost: number;
  cost_variance: number;
  receipt_photos: string[];
  received_at: string | null;
}

export default function ReceiptsPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editItems, setEditItems] = useState<ActualItem[]>([]);

  const loadOrders = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .in("status", ["sent", "received"])
      .order("order_date", { ascending: false });

    if (error) {
      console.error("[loadOrders]", error);
      return;
    }

    setOrders(
      (data || []).map((o) => ({
        ...o,
        items: (o.items as PurchaseOrderItem[]) || [],
        actual_items: (o.actual_items as ActualItem[]) || [],
        receipt_photos: (o.receipt_photos as string[]) || [],
      })),
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleSelectOrder = (order: PurchaseOrder) => {
    setSelectedOrder(order);

    // Initialize edit items from estimated items if no actual items exist
    if (order.actual_items.length === 0) {
      setEditItems(
        order.items.map((item) => ({
          ingredient_id: item.ingredient_id,
          name: item.name,
          estimated_qty: item.qty,
          estimated_cost: item.cost,
          actual_qty: item.qty,
          actual_cost: item.cost,
          variance: 0,
          variance_pct: 0,
        })),
      );
    } else {
      setEditItems([...order.actual_items]);
    }
  };

  const updateItemCost = (
    idx: number,
    field: "actual_qty" | "actual_cost",
    value: number,
  ) => {
    const newItems = [...editItems];
    newItems[idx] = {
      ...newItems[idx],
      [field]: value,
    };

    // Recalculate variance
    const estimated = newItems[idx].estimated_cost;
    const actual = newItems[idx].actual_cost;
    newItems[idx].variance = actual - estimated;
    newItems[idx].variance_pct =
      estimated > 0 ? ((actual - estimated) / estimated) * 100 : 0;

    setEditItems(newItems);
  };

  const calculateTotals = () => {
    const actualSubtotal = editItems.reduce(
      (sum, item) => sum + item.actual_cost,
      0,
    );
    const estimatedSubtotal = editItems.reduce(
      (sum, item) => sum + item.estimated_cost,
      0,
    );
    const transportCost = selectedOrder?.transport_cost || 0;
    const actualTotal = actualSubtotal + transportCost;
    const estimatedTotal = estimatedSubtotal + transportCost;
    const variance = actualTotal - estimatedTotal;
    const variancePct =
      estimatedTotal > 0 ? (variance / estimatedTotal) * 100 : 0;

    return { actualSubtotal, actualTotal, variance, variancePct };
  };

  const handleSaveReceipt = async () => {
    if (!selectedOrder) return;
    setSaving(true);

    const supabase = createBrowserClient();
    const totals = calculateTotals();

    // Update purchase order with actual costs
    const { error: updateError } = await supabase
      .from("purchase_orders")
      .update({
        status: "received",
        actual_items: editItems,
        actual_subtotal: totals.actualSubtotal,
        actual_total_cost: totals.actualTotal,
        cost_variance: totals.variance,
        received_at: new Date().toISOString(),
        receipt_logged_at: new Date().toISOString(),
      })
      .eq("id", selectedOrder.id);

    if (updateError) {
      console.error("[saveReceipt]", updateError);
      setSaving(false);
      return;
    }

    // Update ingredient costs from actual prices
    for (const item of editItems) {
      if (item.actual_qty > 0) {
        const costPerUnit = item.actual_cost / item.actual_qty;
        await supabase
          .from("ingredients")
          .update({
            cost_per_unit: costPerUnit,
            last_updated: new Date().toISOString(),
          })
          .eq("id", item.ingredient_id);
      }
    }

    setSaving(false);
    setSelectedOrder(null);
    loadOrders();
  };

  const formatMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;

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
          🧾 Receipt Logging
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Log actual costs from receipts, compare with estimates, auto-update
          ingredient prices
        </p>
      </div>

      {/* Orders List */}
      {!selectedOrder && (
        <div className="space-y-3">
          {orders.length === 0 ? (
            <div className="bg-slate-50 rounded-xl p-8 text-center">
              <div className="text-3xl mb-3">📦</div>
              <div className="text-slate-600 font-medium">
                No pending orders to log
              </div>
              <p className="text-slate-400 text-sm mt-1">
                Orders with status &quot;sent&quot; or &quot;received&quot; will
                appear here
              </p>
            </div>
          ) : (
            orders.map((order) => {
              const hasActualCosts = order.actual_items.length > 0;
              return (
                <button
                  key={order.id}
                  onClick={() => handleSelectOrder(order)}
                  className="w-full bg-white rounded-xl border border-slate-200 p-4 text-left hover:border-[#00B4FF] transition-all"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-slate-900">
                        {order.order_number}
                      </div>
                      <div className="text-sm text-slate-500 mt-0.5">
                        {new Date(order.order_date).toLocaleDateString(
                          "en-US",
                          {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                        <span className="mx-2">-</span>
                        {order.items.length} items
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-slate-900">
                        {formatMoney(order.total_cost)}
                      </div>
                      <div
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          hasActualCosts
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {hasActualCosts ? "Logged" : "Pending"}
                      </div>
                    </div>
                  </div>

                  {hasActualCosts && order.cost_variance !== 0 && (
                    <div
                      className={`mt-3 p-2 rounded-lg text-sm font-medium ${
                        order.cost_variance > 0
                          ? "bg-rose-50 text-rose-700"
                          : "bg-emerald-50 text-emerald-700"
                      }`}
                    >
                      {order.cost_variance > 0
                        ? "Over budget: "
                        : "Under budget: "}
                      {formatMoney(Math.abs(order.cost_variance))}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}

      {/* Receipt Entry Form */}
      {selectedOrder && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="text-sm text-slate-500">Order</div>
              <h2 className="text-xl font-bold text-slate-900">
                {selectedOrder.order_number}
              </h2>
              <div className="text-sm text-slate-500 mt-0.5">
                {new Date(selectedOrder.order_date).toLocaleDateString(
                  "en-US",
                  {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  },
                )}
              </div>
            </div>
            <button
              onClick={() => setSelectedOrder(null)}
              className="px-3 py-1.5 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200"
            >
              Back to List
            </button>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-2 font-semibold text-slate-600">
                    Item
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-600">
                    Est. Qty
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-600">
                    Est. Cost
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-blue-600">
                    Actual Qty
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-blue-600">
                    Actual Cost
                  </th>
                  <th className="text-right py-3 px-2 font-semibold text-slate-600">
                    Variance
                  </th>
                </tr>
              </thead>
              <tbody>
                {editItems.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="py-3 px-2 font-medium text-slate-900">
                      {item.name}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-500">
                      {item.estimated_qty}
                    </td>
                    <td className="py-3 px-2 text-right text-slate-500">
                      {formatMoney(item.estimated_cost)}
                    </td>
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.actual_qty}
                        onChange={(e) =>
                          updateItemCost(
                            idx,
                            "actual_qty",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-20 text-right px-2 py-1 border border-slate-200 rounded focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        value={item.actual_cost}
                        onChange={(e) =>
                          updateItemCost(
                            idx,
                            "actual_cost",
                            parseFloat(e.target.value) || 0,
                          )
                        }
                        className="w-24 text-right px-2 py-1 border border-slate-200 rounded focus:border-blue-500 outline-none"
                      />
                    </td>
                    <td className="py-3 px-2 text-right">
                      <span
                        className={`font-medium ${
                          item.variance > 0
                            ? "text-rose-600"
                            : item.variance < 0
                              ? "text-emerald-600"
                              : "text-slate-400"
                        }`}
                      >
                        {item.variance > 0 ? "+" : ""}
                        {formatMoney(item.variance)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-xs text-slate-500 font-semibold">
                  Estimated Subtotal
                </div>
                <div className="text-lg font-bold text-slate-700">
                  {formatMoney(
                    editItems.reduce((s, i) => s + i.estimated_cost, 0),
                  )}
                </div>
              </div>
              <div>
                <div className="text-xs text-blue-600 font-semibold">
                  Actual Subtotal
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {formatMoney(calculateTotals().actualSubtotal)}
                </div>
              </div>
              <div>
                <div className="text-xs text-slate-500 font-semibold">
                  Transport
                </div>
                <div className="text-lg font-bold text-slate-700">
                  {formatMoney(selectedOrder.transport_cost)}
                </div>
              </div>
              <div>
                <div
                  className={`text-xs font-semibold ${
                    calculateTotals().variance > 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  Total Variance
                </div>
                <div
                  className={`text-lg font-bold ${
                    calculateTotals().variance > 0
                      ? "text-rose-600"
                      : "text-emerald-600"
                  }`}
                >
                  {calculateTotals().variance > 0 ? "+" : ""}
                  {formatMoney(calculateTotals().variance)}
                  <span className="text-sm font-medium ml-1">
                    ({calculateTotals().variancePct.toFixed(1)}%)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="text-sm text-slate-500">
              Saving will update ingredient costs based on actual prices paid
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-bold text-sm hover:bg-slate-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveReceipt}
                disabled={saving}
                className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Saving...
                  </>
                ) : (
                  <>✅ Save Receipt</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
