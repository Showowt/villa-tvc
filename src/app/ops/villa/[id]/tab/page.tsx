"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";

// ============================================
// VILLA TAB / CUENTA CORRIENTE (Issue #18)
// Vista de cuenta por villa durante la estadia
// ============================================

interface OrderItem {
  id: string;
  menu_item_id: string;
  menu_item_name: string;
  menu_item_name_es: string;
  category: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  order_date: string;
  order_time: string;
  is_comp: boolean;
  is_staff_meal: boolean;
  notes: string | null;
}

interface CategoryTotal {
  category: string;
  category_label: string;
  items_count: number;
  total: number;
}

interface ConsumptionData {
  villa_id: string;
  villa_name: string;
  guest_name: string | null;
  check_in: string | null;
  check_out: string | null;
  orders: OrderItem[];
  category_totals: CategoryTotal[];
  food_total: number;
  drinks_total: number;
  services_total: number;
  comp_total: number;
  grand_total: number;
  total_items: number;
}

// Iconos por categoria
const CATEGORY_ICONS: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🥜",
  cocktail: "🍹",
  mocktail: "🥤",
  beer: "🍺",
  wine: "🍷",
  spirit: "🥃",
  soft_drink: "🧃",
};

export default function VillaTabPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const villaId = resolvedParams.id;

  const [data, setData] = useState<ConsumptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInvoice, setShowInvoice] = useState(false);
  const [dateRange, setDateRange] = useState<{
    start: string;
    end: string;
  } | null>(null);

  const loadConsumption = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let url = `/api/villa/${villaId}/consumption`;
      if (dateRange) {
        url += `?start_date=${dateRange.start}&end_date=${dateRange.end}`;
      }

      const response = await fetch(url);
      const result = await response.json();

      if (!result.success) {
        setError(result.error || "Error al cargar datos");
        return;
      }

      setData(result.data);
    } catch (err) {
      console.error("[VillaTab] Error:", err);
      setError("Error de conexion");
    } finally {
      setLoading(false);
    }
  }, [villaId, dateRange]);

  useEffect(() => {
    loadConsumption();
  }, [loadConsumption]);

  // Funcion para imprimir factura
  const handlePrint = () => {
    window.print();
  };

  // Funcion para exportar CSV
  const handleExportCSV = () => {
    if (!data) return;

    const headers = [
      "Fecha",
      "Hora",
      "Item",
      "Cantidad",
      "Precio Unitario",
      "Total",
      "Cortesia",
    ];
    const rows = data.orders.map((order) => [
      order.order_date,
      order.order_time,
      order.menu_item_name_es,
      order.quantity.toString(),
      order.unit_price.toLocaleString(),
      order.total_price.toLocaleString(),
      order.is_comp ? "Si" : "No",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((r) => r.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `cuenta_${data.villa_name}_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-10 h-10 border-3 border-cyan-500 border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-slate-400">Cargando cuenta...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-900 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 text-center">
            <p className="text-red-400 font-medium">{error || "Sin datos"}</p>
            <button
              onClick={loadConsumption}
              className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30"
            >
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Vista de factura para imprimir
  if (showInvoice) {
    return (
      <div className="min-h-screen bg-white text-black p-8 print:p-4">
        <style>{`
          @media print {
            .no-print { display: none !important; }
            body { background: white !important; }
          }
        `}</style>

        {/* Header de factura */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-bold">VILLA TVC</h1>
          <p className="text-sm text-gray-600 mt-1">Isla Tintipan, Colombia</p>
          <p className="text-sm text-gray-500">NIT: XXX-XXX-XXX-X</p>
        </div>

        {/* Informacion del huesped */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h2 className="font-bold text-lg mb-2">FACTURA</h2>
            <p className="text-sm">
              <span className="text-gray-500">No.:</span>{" "}
              {new Date().getTime().toString().slice(-8)}
            </p>
            <p className="text-sm">
              <span className="text-gray-500">Fecha:</span>{" "}
              {new Date().toLocaleDateString("es-CO")}
            </p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg mb-2">HUESPED</h2>
            <p className="text-sm">{data.guest_name || "Huesped"}</p>
            <p className="text-sm">Villa {data.villa_name}</p>
            <p className="text-sm text-gray-500">
              {data.check_in} - {data.check_out}
            </p>
          </div>
        </div>

        {/* Tabla de items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="text-left py-2">Descripcion</th>
              <th className="text-center py-2">Cant.</th>
              <th className="text-right py-2">Precio</th>
              <th className="text-right py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {data.orders.map((order) => (
              <tr key={order.id} className="border-b">
                <td className="py-2">
                  {order.menu_item_name_es}
                  {order.is_comp && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Cortesia)
                    </span>
                  )}
                </td>
                <td className="text-center py-2">{order.quantity}</td>
                <td className="text-right py-2">
                  ${order.unit_price.toLocaleString()}
                </td>
                <td className="text-right py-2">
                  {order.is_comp ? (
                    <span className="line-through text-gray-400">
                      ${order.total_price.toLocaleString()}
                    </span>
                  ) : (
                    `$${order.total_price.toLocaleString()}`
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totales */}
        <div className="flex justify-end mb-8">
          <div className="w-64">
            <div className="flex justify-between py-1">
              <span>Subtotal Comida:</span>
              <span>${data.food_total.toLocaleString()}</span>
            </div>
            <div className="flex justify-between py-1">
              <span>Subtotal Bebidas:</span>
              <span>${data.drinks_total.toLocaleString()}</span>
            </div>
            {data.comp_total > 0 && (
              <div className="flex justify-between py-1 text-gray-500">
                <span>Cortesias:</span>
                <span>-${data.comp_total.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t-2 border-black font-bold text-xl">
              <span>TOTAL:</span>
              <span>${data.grand_total.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500 border-t pt-4">
          <p>Gracias por hospedarse con nosotros!</p>
          <p>www.villatvc.com | +57 XXX XXX XXXX</p>
        </div>

        {/* Botones (no imprimir) */}
        <div className="no-print fixed bottom-0 left-0 right-0 bg-slate-900 p-4 flex gap-4 justify-center">
          <button
            onClick={() => setShowInvoice(false)}
            className="px-6 py-3 bg-slate-700 text-white rounded-lg"
          >
            Volver
          </button>
          <button
            onClick={handlePrint}
            className="px-6 py-3 bg-cyan-500 text-white rounded-lg"
          >
            Imprimir
          </button>
        </div>
      </div>
    );
  }

  // Vista principal
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/ops/property-map"
              className="p-2 bg-slate-700 rounded-lg hover:bg-slate-600"
            >
              ← Mapa
            </Link>
            <div>
              <h1 className="text-xl font-bold">
                Cuenta - Villa {data.villa_name}
              </h1>
              <p className="text-sm text-slate-400">
                {data.guest_name || "Sin huesped activo"} • {data.total_items}{" "}
                items
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportCSV}
              className="px-4 py-2 bg-slate-700 rounded-lg text-sm hover:bg-slate-600"
            >
              CSV
            </button>
            <button
              onClick={() => setShowInvoice(true)}
              className="px-4 py-2 bg-cyan-500 rounded-lg text-sm font-medium hover:bg-cyan-600"
            >
              Factura
            </button>
          </div>
        </div>
      </div>

      {/* Resumen grande */}
      <div className="max-w-4xl mx-auto p-6">
        {/* Tarjeta de total */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 border border-emerald-500/30 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-400 text-sm font-medium uppercase tracking-wide">
                Total Cuenta
              </p>
              <p className="text-5xl font-black text-white mt-2">
                ${data.grand_total.toLocaleString()}
              </p>
              <p className="text-sm text-slate-400 mt-2">
                {data.check_in} - {data.check_out}
              </p>
            </div>
            <div className="text-right">
              <div className="text-6xl">💰</div>
              {data.grand_total > 500000 && (
                <div className="mt-2 px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold">
                  VIP SPENDER
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Grid de subtotales */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🍽️</div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Comida</p>
                <p className="text-2xl font-bold">
                  ${data.food_total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🍹</div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Bebidas</p>
                <p className="text-2xl font-bold">
                  ${data.drinks_total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
            <div className="flex items-center gap-3">
              <div className="text-3xl">🎁</div>
              <div>
                <p className="text-xs text-slate-400 uppercase">Cortesias</p>
                <p className="text-2xl font-bold text-emerald-400">
                  ${data.comp_total.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Desglose por categoria */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 mb-6">
          <div className="p-4 border-b border-slate-700">
            <h2 className="font-bold">Desglose por Categoria</h2>
          </div>
          <div className="divide-y divide-slate-700">
            {data.category_totals.map((cat) => (
              <div
                key={cat.category}
                className="flex items-center justify-between p-4"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">
                    {CATEGORY_ICONS[cat.category] || "📦"}
                  </span>
                  <div>
                    <p className="font-medium">{cat.category_label}</p>
                    <p className="text-xs text-slate-400">
                      {cat.items_count} items
                    </p>
                  </div>
                </div>
                <p className="text-lg font-bold">
                  ${cat.total.toLocaleString()}
                </p>
              </div>
            ))}
            {data.category_totals.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                No hay consumos registrados
              </div>
            )}
          </div>
        </div>

        {/* Lista de pedidos */}
        <div className="bg-slate-800 rounded-xl border border-slate-700">
          <div className="p-4 border-b border-slate-700 flex items-center justify-between">
            <h2 className="font-bold">Historial de Pedidos</h2>
            <span className="text-sm text-slate-400">
              {data.orders.length} registros
            </span>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {data.orders.map((order) => (
              <div
                key={order.id}
                className={`flex items-center justify-between p-4 border-b border-slate-700/50 ${
                  order.is_comp ? "bg-emerald-500/5" : ""
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className="text-2xl">
                    {CATEGORY_ICONS[order.category] || "📦"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.menu_item_name_es}</p>
                      {order.is_comp && (
                        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded text-xs">
                          CORTESIA
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400">
                      {order.order_date} {order.order_time} • {order.quantity}x
                      ${order.unit_price.toLocaleString()}
                    </p>
                  </div>
                </div>
                <p
                  className={`text-lg font-bold ${order.is_comp ? "text-emerald-400 line-through" : ""}`}
                >
                  ${order.total_price.toLocaleString()}
                </p>
              </div>
            ))}
            {data.orders.length === 0 && (
              <div className="p-12 text-center text-slate-500">
                <div className="text-4xl mb-4">📋</div>
                <p>No hay pedidos registrados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
