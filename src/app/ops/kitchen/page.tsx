// ============================================
// KITCHEN DISPLAY PAGE (Issue 67)
// Real-time order display for kitchen staff
// ============================================

"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";

interface Order {
  id: string;
  menu_item_id: string;
  quantity: number;
  villa_id: string;
  status: string;
  special_instructions: string | null;
  guest_name: string | null;
  created_at: string;
  menu_items: {
    name: string;
    name_es: string;
    category: string;
    prep_time_minutes: number | null;
  };
}

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-yellow-500",
  preparing: "bg-blue-500",
  ready: "bg-green-500",
  delivered: "bg-gray-500",
  cancelled: "bg-red-500",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  preparing: "Preparando",
  ready: "Listo",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>("pending");

  const loadOrders = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/menu/orders?status=${selectedStatus === "all" ? "all" : selectedStatus}`,
      );
      const data = await response.json();
      if (data.success) {
        setOrders(data.data || []);
      }
    } catch (error) {
      console.error("[Kitchen] Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStatus]);

  useEffect(() => {
    loadOrders();
    // Refresh every 10 seconds
    const interval = setInterval(loadOrders, 10000);
    return () => clearInterval(interval);
  }, [loadOrders]);

  const updateStatus = async (orderId: string, newStatus: string) => {
    try {
      const response = await fetch("/api/menu/orders", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order_id: orderId, status: newStatus }),
      });
      const data = await response.json();
      if (data.success) {
        loadOrders();
      }
    } catch (error) {
      console.error("[Kitchen] Error updating status:", error);
    }
  };

  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      pending: "preparing",
      preparing: "ready",
      ready: "delivered",
    };
    return flow[current] || null;
  };

  const getTimeSince = (timestamp: string): string => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Ahora";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  // Group orders by villa
  const ordersByVilla = orders.reduce(
    (acc, order) => {
      const villa = order.villa_id || "unknown";
      if (!acc[villa]) acc[villa] = [];
      acc[villa].push(order);
      return acc;
    },
    {} as Record<string, Order[]>,
  );

  return (
    <div className="min-h-screen bg-slate-900 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Cocina TVC</h1>
          <p className="text-slate-400 text-sm">Pedidos desde QR Menu</p>
        </div>
        <div className="flex gap-2">
          {["pending", "preparing", "ready", "all"].map((status) => (
            <button
              key={status}
              onClick={() => setSelectedStatus(status)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedStatus === status
                  ? "bg-white text-slate-900"
                  : "bg-slate-800 text-white hover:bg-slate-700"
              }`}
            >
              {status === "all" ? "Todos" : STATUS_LABELS[status] || status}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full" />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-slate-500">
          <div className="text-6xl mb-4">🍽️</div>
          <p className="text-lg">
            No hay pedidos {STATUS_LABELS[selectedStatus]?.toLowerCase()}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Object.entries(ordersByVilla).map(([villa, villaOrders]) => (
            <div
              key={villa}
              className="bg-slate-800 rounded-xl overflow-hidden"
            >
              {/* Villa Header */}
              <div className="bg-slate-700 px-4 py-3 flex items-center justify-between">
                <span className="text-white font-semibold">
                  {villa.replace("villa", "Villa ")}
                </span>
                <span className="text-slate-400 text-sm">
                  {villaOrders.length} items
                </span>
              </div>

              {/* Orders */}
              <div className="p-4 space-y-3">
                {villaOrders.map((order) => {
                  const nextStatus = getNextStatus(order.status);
                  const isUrgent =
                    order.status === "pending" &&
                    Date.now() - new Date(order.created_at).getTime() >
                      10 * 60000;

                  return (
                    <div
                      key={order.id}
                      className={`p-3 rounded-lg ${
                        isUrgent
                          ? "bg-red-900/50 border border-red-500"
                          : "bg-slate-700/50"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <span className="text-white font-medium">
                            {order.quantity}x {order.menu_items?.name_es}
                          </span>
                          {order.guest_name && (
                            <div className="text-slate-400 text-xs">
                              {order.guest_name}
                            </div>
                          )}
                        </div>
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium text-white ${STATUS_COLORS[order.status]}`}
                        >
                          {STATUS_LABELS[order.status]}
                        </span>
                      </div>

                      {order.special_instructions && (
                        <div className="text-yellow-400 text-xs mb-2 p-2 bg-yellow-500/10 rounded">
                          📝 {order.special_instructions}
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 text-xs">
                          ⏱️ {getTimeSince(order.created_at)}
                        </span>
                        {nextStatus && (
                          <button
                            onClick={() => updateStatus(order.id, nextStatus)}
                            className={`px-3 py-1 rounded text-xs font-medium text-white ${STATUS_COLORS[nextStatus]} hover:opacity-80`}
                          >
                            → {STATUS_LABELS[nextStatus]}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Auto-refresh indicator */}
      <div className="fixed bottom-4 right-4 text-slate-500 text-xs">
        Auto-actualiza cada 10s
      </div>
    </div>
  );
}
