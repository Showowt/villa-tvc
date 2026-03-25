"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  ReceivedItem,
  DeliveryPhoto,
  DiscrepancyItem,
  PendingPurchaseOrder,
  POItemForReceiving,
} from "@/types/receiving";

export default function StaffReceivingPage() {
  const [pendingOrders, setPendingOrders] = useState<PendingPurchaseOrder[]>(
    [],
  );
  const [selectedOrder, setSelectedOrder] =
    useState<PendingPurchaseOrder | null>(null);
  const [receivedItems, setReceivedItems] = useState<ReceivedItem[]>([]);
  const [discrepancyNotes, setDiscrepancyNotes] = useState("");
  const [deliveryPhotos, setDeliveryPhotos] = useState<DeliveryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPendingOrders = useCallback(async () => {
    const supabase = createBrowserClient();
    const { data, error } = await supabase
      .from("purchase_orders")
      .select("*")
      .in("status", ["sent", "approved", "pending"])
      .order("delivery_date", { ascending: true });

    if (error) {
      console.error("[loadPendingOrders]", error);
    } else {
      const orders: PendingPurchaseOrder[] = (data || []).map((po) => ({
        id: po.id,
        order_number: `PO-${po.id.slice(0, 8).toUpperCase()}`,
        order_date: po.created_at || undefined,
        delivery_date: po.delivery_date,
        status: po.status || "pending",
        items: (po.items as POItemForReceiving[]) || [],
        total_cost: po.total_cost || 0,
        transport_cost: po.transport_cost || 0,
        supplier_notes: po.notes,
        created_at: po.created_at,
      }));
      setPendingOrders(orders);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPendingOrders();
  }, [loadPendingOrders]);

  const selectOrder = (order: PendingPurchaseOrder) => {
    setSelectedOrder(order);
    const items: ReceivedItem[] = (order.items || []).map((item) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.name_es || item.name,
      ordered_qty: item.quantity,
      received_qty: item.quantity,
      unit: item.unit,
      unit_cost: item.unit_cost,
      notes: "",
    }));
    setReceivedItems(items);
    setDiscrepancyNotes("");
    setDeliveryPhotos([]);
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

  const discrepancyStats = receivedItems.reduce(
    (acc, item) => {
      acc.totalOrdered += item.ordered_qty;
      acc.totalReceived += item.received_qty;
      if (item.received_qty < item.ordered_qty) {
        acc.itemsShort++;
        acc.totalShortage += item.ordered_qty - item.received_qty;
        acc.estimatedLoss +=
          (item.ordered_qty - item.received_qty) * (item.unit_cost || 0);
      }
      return acc;
    },
    {
      totalOrdered: 0,
      totalReceived: 0,
      itemsShort: 0,
      totalShortage: 0,
      estimatedLoss: 0,
    },
  );

  const discrepancyPct =
    discrepancyStats.totalOrdered > 0
      ? Math.round(
          ((discrepancyStats.totalOrdered - discrepancyStats.totalReceived) /
            discrepancyStats.totalOrdered) *
            100 *
            10,
        ) / 10
      : 0;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingPhoto(true);
    const newPhotos: DeliveryPhoto[] = [];

    for (const file of Array.from(files)) {
      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("context", "purchase-order-delivery");
        formData.append("taskId", selectedOrder?.id || "unknown");

        const response = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });

        if (response.ok) {
          const data = await response.json();
          newPhotos.push({
            url: data.url,
            path: data.path,
            uploaded_at: new Date().toISOString(),
          });
        }
      } catch (error) {
        console.error("[handlePhotoUpload]", error);
      }
    }

    setDeliveryPhotos([...deliveryPhotos, ...newPhotos]);
    setUploadingPhoto(false);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removePhoto = (index: number) => {
    const updated = [...deliveryPhotos];
    updated.splice(index, 1);
    setDeliveryPhotos(updated);
  };

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
          received_by: "00000000-0000-0000-0000-000000000000",
          discrepancy_notes: discrepancyNotes || undefined,
          delivery_photos: deliveryPhotos,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        let alertMessage = data.message;
        if (data.items_with_shortage && data.items_with_shortage.length > 0) {
          alertMessage +=
            "\n\nFaltantes:\n" +
            data.items_with_shortage
              .map(
                (item: DiscrepancyItem) =>
                  `- ${item.ingredient_name}: ${item.shortage_qty} unidades (${item.shortage_pct}%)`,
              )
              .join("\n");
        }
        alert(alertMessage);
        setSelectedOrder(null);
        setReceivedItems([]);
        setDeliveryPhotos([]);
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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header fijo */}
      <header className="bg-emerald-600 text-white px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📦</span>
          <div>
            <h1 className="font-bold text-lg">Recepcion de Pedidos</h1>
            <p className="text-emerald-100 text-xs">
              Confirmar entregas de proveedores
            </p>
          </div>
        </div>
      </header>

      <div className="p-4 pb-24">
        {!selectedOrder ? (
          <>
            {/* Lista de ordenes */}
            <div className="mb-4">
              <h2 className="text-sm font-bold text-slate-600 mb-2">
                ORDENES PENDIENTES ({pendingOrders.length})
              </h2>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center">
                <div className="text-5xl mb-3">✅</div>
                <p className="text-slate-600 font-medium">
                  No hay entregas pendientes
                </p>
                <p className="text-slate-400 text-sm">
                  Todas las ordenes han sido recibidas
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    onClick={() => selectOrder(order)}
                    className="bg-white rounded-xl p-4 border border-slate-200 active:bg-slate-50 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-slate-900">
                        {order.order_number}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                          order.status === "sent"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {order.status === "sent" ? "Enviada" : "Pendiente"}
                      </span>
                    </div>
                    <div className="text-sm text-slate-500">
                      {order.items.length} productos
                    </div>
                    <div className="text-sm font-medium text-slate-700">
                      ${(order.total_cost || 0).toLocaleString("es-CO")} COP
                    </div>
                    {order.delivery_date && (
                      <div className="text-xs text-slate-400 mt-1">
                        Entrega:{" "}
                        {new Date(order.delivery_date).toLocaleDateString(
                          "es-CO",
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Formulario de recepcion */}
            <div className="mb-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-900">
                    {selectedOrder.order_number}
                  </h2>
                  <p className="text-sm text-slate-500">
                    Ingresa las cantidades recibidas
                  </p>
                </div>
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="text-slate-400 p-2 -mr-2"
                >
                  <span className="text-xl">✕</span>
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4">
              {receivedItems.map((item, index) => {
                const diff = item.received_qty - item.ordered_qty;
                const isShort = diff < 0;
                return (
                  <div
                    key={item.ingredient_id}
                    className={`bg-white rounded-xl p-4 border ${isShort ? "border-rose-200 bg-rose-50" : "border-slate-200"}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {item.ingredient_name}
                        </div>
                        <div className="text-sm text-slate-500">
                          Ordenado: {item.ordered_qty} {item.unit}
                        </div>
                      </div>
                      {isShort && (
                        <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">
                          FALTA: {Math.abs(diff)}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <label className="text-sm text-slate-600">
                        Recibido:
                      </label>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() =>
                            updateReceivedQty(
                              index,
                              Math.max(0, item.received_qty - 1),
                            )
                          }
                          className="w-10 h-10 bg-slate-100 rounded-lg font-bold text-xl"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.received_qty}
                          onChange={(e) =>
                            updateReceivedQty(
                              index,
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className={`w-20 h-10 text-center font-bold text-lg border rounded-lg ${
                            isShort
                              ? "border-rose-300 text-rose-700"
                              : "border-slate-200"
                          }`}
                        />
                        <button
                          onClick={() =>
                            updateReceivedQty(index, item.received_qty + 1)
                          }
                          className="w-10 h-10 bg-slate-100 rounded-lg font-bold text-xl"
                        >
                          +
                        </button>
                        <span className="text-slate-500 ml-1">{item.unit}</span>
                      </div>
                    </div>

                    {isShort && (
                      <input
                        type="text"
                        value={item.notes || ""}
                        onChange={(e) => updateItemNotes(index, e.target.value)}
                        placeholder="Razon del faltante..."
                        className="w-full mt-2 px-3 py-2 border border-rose-200 rounded-lg text-sm"
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fotos de entrega */}
            <div className="bg-white rounded-xl p-4 border border-slate-200 mb-4">
              <h3 className="font-bold text-slate-900 mb-2 flex items-center gap-2">
                <span>📸</span> Fotos de Entrega
              </h3>

              <div className="flex flex-wrap gap-2">
                {deliveryPhotos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={photo.url}
                      alt={`Foto ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => removePhoto(index)}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs"
                    >
                      ✕
                    </button>
                  </div>
                ))}

                <label className="w-20 h-20 border-2 border-dashed border-slate-300 rounded-lg flex items-center justify-center cursor-pointer">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    onChange={handlePhotoUpload}
                    className="hidden"
                    disabled={uploadingPhoto}
                  />
                  {uploadingPhoto ? (
                    <div className="animate-spin w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full" />
                  ) : (
                    <span className="text-3xl text-slate-400">+</span>
                  )}
                </label>
              </div>
            </div>

            {/* Alerta de discrepancias */}
            {hasDiscrepancies && (
              <div
                className={`rounded-xl p-4 mb-4 ${
                  discrepancyPct >= 10
                    ? "bg-rose-100 border border-rose-200"
                    : "bg-amber-100 border border-amber-200"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-xl">
                    {discrepancyPct >= 10 ? "🚨" : "⚠️"}
                  </span>
                  <div className="flex-1">
                    <h4
                      className={`font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                    >
                      {discrepancyStats.itemsShort} items con faltante
                    </h4>
                    <div className="grid grid-cols-2 gap-2 my-2">
                      <div
                        className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-200" : "bg-amber-200"}`}
                      >
                        <div
                          className={`font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                        >
                          {discrepancyPct}%
                        </div>
                        <div className="text-xs text-slate-600">
                          Discrepancia
                        </div>
                      </div>
                      <div
                        className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-200" : "bg-amber-200"}`}
                      >
                        <div
                          className={`font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                        >
                          $
                          {discrepancyStats.estimatedLoss.toLocaleString(
                            "es-CO",
                          )}
                        </div>
                        <div className="text-xs text-slate-600">Perdida</div>
                      </div>
                    </div>

                    {discrepancyPct >= 10 && (
                      <p className="text-sm text-rose-600 mb-2">
                        Se notificara a gerencia automaticamente
                      </p>
                    )}

                    <textarea
                      value={discrepancyNotes}
                      onChange={(e) => setDiscrepancyNotes(e.target.value)}
                      placeholder="Describe las discrepancias..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                      rows={2}
                    />
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Boton fijo inferior */}
      {selectedOrder && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4">
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (hasDiscrepancies && !discrepancyNotes)}
              className={`flex-1 py-3 text-white rounded-xl font-bold disabled:opacity-50 ${
                hasDiscrepancies
                  ? discrepancyPct >= 10
                    ? "bg-rose-500"
                    : "bg-amber-500"
                  : "bg-emerald-500"
              }`}
            >
              {submitting ? "Enviando..." : "Confirmar Recepcion"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
