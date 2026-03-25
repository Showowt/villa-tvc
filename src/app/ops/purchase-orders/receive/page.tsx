"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import type {
  ReceivedItem,
  DeliveryPhoto,
  DiscrepancyItem,
  PendingPurchaseOrder,
  POItemForReceiving,
} from "@/types/receiving";

export default function ReceivePurchaseOrderPage() {
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
    // Inicializar items recibidos con cantidades ordenadas
    const items: ReceivedItem[] = (order.items || []).map((item) => ({
      ingredient_id: item.ingredient_id,
      ingredient_name: item.name_es || item.name,
      ordered_qty: item.quantity,
      received_qty: item.quantity, // Por defecto igual a ordenado
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

  // Calcular estadisticas de discrepancia
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
        } else {
          console.error("Error subiendo foto");
        }
      } catch (error) {
        console.error("[handlePhotoUpload]", error);
      }
    }

    setDeliveryPhotos([...deliveryPhotos, ...newPhotos]);
    setUploadingPhoto(false);

    // Limpiar input
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
          received_by: "00000000-0000-0000-0000-000000000000", // TODO: Obtener de auth
          discrepancy_notes: discrepancyNotes || undefined,
          delivery_photos: deliveryPhotos,
        }),
      });

      if (response.ok) {
        const data = await response.json();

        // Construir mensaje para el usuario
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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto pb-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          <span className="text-2xl">📦</span> Recepcion de Pedidos
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Confirmar entrega de ordenes de compra y actualizar inventario
        </p>
      </div>

      {!selectedOrder ? (
        <>
          {/* Lista de ordenes pendientes */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
            <div className="p-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">
                Ordenes Pendientes de Recepcion ({pendingOrders.length})
              </h2>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <div className="text-4xl mb-2">✅</div>
                <p>No hay ordenes pendientes de recepcion</p>
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
                          <Badge
                            color={
                              order.status === "sent" ? "#3B82F6" : "#9CA3AF"
                            }
                          >
                            {order.status === "sent" ? "Enviada" : "Pendiente"}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-500">
                          {order.items.length} items | Total: $
                          {(order.total_cost || 0).toLocaleString("es-CO")} COP
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
                      <button className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors">
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
          {/* Formulario de recepcion */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4">
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
                className="text-slate-400 hover:text-slate-600 p-2"
              >
                <span className="text-lg">✕</span>
              </button>
            </div>

            <div className="p-4 overflow-x-auto">
              {/* Tabla de items */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 font-medium text-slate-600">
                      Ingrediente
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600 w-24">
                      Ordenado
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600 w-28">
                      Recibido
                    </th>
                    <th className="text-center py-2 font-medium text-slate-600 w-24">
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
                    const isShort = diff < 0;
                    return (
                      <tr
                        key={item.ingredient_id}
                        className={`border-b border-slate-50 ${isShort ? "bg-rose-50/50" : ""}`}
                      >
                        <td className="py-3">
                          <span className="font-medium">
                            {item.ingredient_name}
                          </span>
                          <span className="text-slate-400 text-xs ml-1">
                            ({item.unit})
                          </span>
                        </td>
                        <td className="text-center py-3 text-slate-500">
                          {item.ordered_qty}
                        </td>
                        <td className="text-center py-3">
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.received_qty}
                            onChange={(e) =>
                              updateReceivedQty(
                                index,
                                parseFloat(e.target.value) || 0,
                              )
                            }
                            className={`w-20 px-2 py-1.5 border rounded-lg text-center font-medium ${
                              diff !== 0
                                ? isShort
                                  ? "border-rose-300 bg-rose-50 text-rose-700"
                                  : "border-emerald-300 bg-emerald-50 text-emerald-700"
                                : "border-slate-200"
                            }`}
                          />
                        </td>
                        <td className="text-center py-3">
                          {diff !== 0 && (
                            <span
                              className={`font-bold ${
                                isShort ? "text-rose-600" : "text-emerald-600"
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
                            value={item.notes || ""}
                            onChange={(e) =>
                              updateItemNotes(index, e.target.value)
                            }
                            placeholder={isShort ? "Razon del faltante..." : ""}
                            className={`w-full px-2 py-1.5 border rounded-lg text-sm ${
                              isShort ? "border-rose-200" : "border-slate-200"
                            }`}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Seccion de fotos */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 p-4">
            <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
              <span>📸</span> Fotos de Entrega
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Documenta la entrega con fotos del producto recibido
            </p>

            {/* Grid de fotos */}
            <div className="flex flex-wrap gap-3 mb-4">
              {deliveryPhotos.map((photo, index) => (
                <div key={index} className="relative group">
                  <img
                    src={photo.url}
                    alt={`Foto ${index + 1}`}
                    className="w-24 h-24 object-cover rounded-lg border border-slate-200"
                  />
                  <button
                    onClick={() => removePhoto(index)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full text-xs font-bold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}

              {/* Boton agregar foto */}
              <label className="w-24 h-24 border-2 border-dashed border-slate-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#00B4FF] hover:bg-slate-50 transition-colors">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
                {uploadingPhoto ? (
                  <div className="animate-spin w-6 h-6 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
                ) : (
                  <>
                    <span className="text-2xl text-slate-400">+</span>
                    <span className="text-xs text-slate-400">Agregar</span>
                  </>
                )}
              </label>
            </div>
          </div>

          {/* Alerta de discrepancias */}
          {hasDiscrepancies && (
            <div
              className={`rounded-xl border p-4 mb-4 ${
                discrepancyPct >= 10
                  ? "bg-rose-50 border-rose-200"
                  : "bg-amber-50 border-amber-200"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">
                  {discrepancyPct >= 10 ? "🚨" : "⚠️"}
                </span>
                <div className="flex-1">
                  <h3
                    className={`font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                  >
                    {discrepancyPct >= 10
                      ? "Discrepancia Critica Detectada"
                      : "Discrepancias Detectadas"}
                  </h3>

                  {/* Estadisticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-3">
                    <div
                      className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-100" : "bg-amber-100"}`}
                    >
                      <div
                        className={`text-lg font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                      >
                        {discrepancyPct}%
                      </div>
                      <div
                        className={`text-xs ${discrepancyPct >= 10 ? "text-rose-600" : "text-amber-600"}`}
                      >
                        Discrepancia
                      </div>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-100" : "bg-amber-100"}`}
                    >
                      <div
                        className={`text-lg font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                      >
                        {discrepancyStats.itemsShort}
                      </div>
                      <div
                        className={`text-xs ${discrepancyPct >= 10 ? "text-rose-600" : "text-amber-600"}`}
                      >
                        Items con faltante
                      </div>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-100" : "bg-amber-100"}`}
                    >
                      <div
                        className={`text-lg font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                      >
                        {discrepancyStats.totalShortage}
                      </div>
                      <div
                        className={`text-xs ${discrepancyPct >= 10 ? "text-rose-600" : "text-amber-600"}`}
                      >
                        Unidades faltantes
                      </div>
                    </div>
                    <div
                      className={`p-2 rounded-lg ${discrepancyPct >= 10 ? "bg-rose-100" : "bg-amber-100"}`}
                    >
                      <div
                        className={`text-lg font-bold ${discrepancyPct >= 10 ? "text-rose-700" : "text-amber-700"}`}
                      >
                        $
                        {discrepancyStats.estimatedLoss.toLocaleString("es-CO")}
                      </div>
                      <div
                        className={`text-xs ${discrepancyPct >= 10 ? "text-rose-600" : "text-amber-600"}`}
                      >
                        Perdida estimada
                      </div>
                    </div>
                  </div>

                  {discrepancyPct >= 10 && (
                    <p
                      className={`text-sm mb-3 ${discrepancyPct >= 10 ? "text-rose-600" : "text-amber-600"}`}
                    >
                      <strong>Se creara una alerta automatica</strong> para
                      gerencia debido a la discrepancia mayor al 10%.
                    </p>
                  )}

                  <textarea
                    value={discrepancyNotes}
                    onChange={(e) => setDiscrepancyNotes(e.target.value)}
                    placeholder="Documenta las discrepancias: productos danados, faltantes, sustituciones, etc."
                    className={`w-full px-3 py-2 border rounded-lg text-sm ${
                      discrepancyPct >= 10
                        ? "border-rose-200 focus:ring-rose-500"
                        : "border-amber-200 focus:ring-amber-500"
                    }`}
                    rows={3}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Botones de accion */}
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedOrder(null)}
              className="flex-1 px-4 py-3 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || (hasDiscrepancies && !discrepancyNotes)}
              className={`flex-1 px-4 py-3 text-white rounded-lg font-bold transition-colors disabled:opacity-50 ${
                hasDiscrepancies
                  ? discrepancyPct >= 10
                    ? "bg-rose-500 hover:bg-rose-600"
                    : "bg-amber-500 hover:bg-amber-600"
                  : "bg-emerald-500 hover:bg-emerald-600"
              }`}
            >
              {submitting
                ? "Procesando..."
                : hasDiscrepancies
                  ? discrepancyPct >= 10
                    ? "Confirmar con Alerta"
                    : "Confirmar con Discrepancias"
                  : "Confirmar Recepcion"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
