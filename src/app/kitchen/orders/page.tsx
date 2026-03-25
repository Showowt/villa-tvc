// ============================================
// KITCHEN ORDERS DISPLAY (Issue 67)
// Real-time order management for kitchen staff
// Villa number prominent, time tracking, status flow
// ============================================

"use client";

import { useEffect, useState, useCallback, useRef } from "react";

interface MenuItem {
  name: string;
  name_es: string;
  category: string;
  prep_time_minutes: number | null;
}

interface Order {
  id: string;
  menu_item_id: string;
  quantity: number;
  villa_id: string;
  status: string;
  special_instructions: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  created_at: string;
  menu_items: MenuItem;
}

interface GroupedOrder {
  villa_id: string;
  orders: Order[];
  oldest_order_time: string;
  total_items: number;
}

const STATUS_CONFIG: Record<
  string,
  { color: string; bgColor: string; label: string; labelEs: string }
> = {
  pending: {
    color: "text-yellow-400",
    bgColor: "bg-yellow-500",
    label: "Pending",
    labelEs: "Pendiente",
  },
  preparing: {
    color: "text-blue-400",
    bgColor: "bg-blue-500",
    label: "Preparing",
    labelEs: "Preparando",
  },
  ready: {
    color: "text-green-400",
    bgColor: "bg-green-500",
    label: "Ready",
    labelEs: "Listo",
  },
  delivered: {
    color: "text-slate-400",
    bgColor: "bg-slate-500",
    label: "Delivered",
    labelEs: "Entregado",
  },
  cancelled: {
    color: "text-red-400",
    bgColor: "bg-red-500",
    label: "Cancelled",
    labelEs: "Cancelado",
  },
};

const VILLA_NAMES: Record<string, string> = {
  villa1: "Villa 1",
  villa2: "Villa 2",
  villa3: "Villa 3",
  villa4: "Villa 4",
  villa5: "Villa 5",
  villa6: "Villa 6",
  villa7: "Villa 7",
  villa8: "Villa 8",
  villa9: "Villa 9",
  villa10: "Villa 10",
  villa11: "Villa 11",
  pool: "Piscina",
  beach: "Playa",
  common: "Area Comun",
};

export default function KitchenOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<string>("active");
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const previousOrderCountRef = useRef<number>(0);

  // Load orders
  const loadOrders = useCallback(async () => {
    try {
      const statusParam =
        selectedFilter === "active"
          ? "pending,preparing,ready"
          : selectedFilter === "all"
            ? "all"
            : selectedFilter;

      const response = await fetch(`/api/menu/orders?status=${statusParam}`);
      const data = await response.json();

      if (data.success) {
        const newOrders = data.data || [];

        // Check for new orders and play sound
        if (soundEnabled && newOrders.length > previousOrderCountRef.current) {
          const newPendingOrders = newOrders.filter(
            (o: Order) => o.status === "pending",
          ).length;
          const oldPendingOrders = orders.filter(
            (o) => o.status === "pending",
          ).length;

          if (newPendingOrders > oldPendingOrders) {
            playNotificationSound();
          }
        }

        previousOrderCountRef.current = newOrders.length;
        setOrders(newOrders);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error("[Kitchen] Error loading orders:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedFilter, soundEnabled, orders]);

  // Play notification sound for new orders
  const playNotificationSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Autoplay blocked, user needs to interact first
      });
    }
  };

  // Update order status
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

  // Update all orders for a villa
  const updateVillaOrders = async (villaId: string, newStatus: string) => {
    const villaOrders = orders.filter(
      (o) =>
        o.villa_id === villaId &&
        o.status !== "delivered" &&
        o.status !== "cancelled",
    );

    for (const order of villaOrders) {
      await updateStatus(order.id, newStatus);
    }
  };

  // Get next status in workflow
  const getNextStatus = (current: string): string | null => {
    const flow: Record<string, string> = {
      pending: "preparing",
      preparing: "ready",
      ready: "delivered",
    };
    return flow[current] || null;
  };

  // Calculate time since order
  const getTimeSince = (
    timestamp: string,
  ): { text: string; isUrgent: boolean } => {
    const diff = Date.now() - new Date(timestamp).getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 1) return { text: "Ahora", isUrgent: false };
    if (minutes < 10) return { text: `${minutes}m`, isUrgent: false };
    if (minutes < 15) return { text: `${minutes}m`, isUrgent: true };

    const hours = Math.floor(minutes / 60);
    if (hours < 1) return { text: `${minutes}m`, isUrgent: true };

    return { text: `${hours}h ${minutes % 60}m`, isUrgent: true };
  };

  // Group orders by villa
  const groupOrdersByVilla = (ordersList: Order[]): GroupedOrder[] => {
    const grouped: Record<string, Order[]> = {};

    for (const order of ordersList) {
      const villa = order.villa_id || "unknown";
      if (!grouped[villa]) grouped[villa] = [];
      grouped[villa].push(order);
    }

    return Object.entries(grouped).map(([villa_id, villaOrders]) => ({
      villa_id,
      orders: villaOrders.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      ),
      oldest_order_time: villaOrders.reduce(
        (oldest, order) =>
          new Date(order.created_at) < new Date(oldest)
            ? order.created_at
            : oldest,
        villaOrders[0].created_at,
      ),
      total_items: villaOrders.reduce((sum, o) => sum + o.quantity, 0),
    }));
  };

  // Auto-refresh
  useEffect(() => {
    loadOrders();
    const interval = setInterval(loadOrders, 8000); // Every 8 seconds
    return () => clearInterval(interval);
  }, [loadOrders]);

  // Get grouped and sorted orders
  const groupedOrders = groupOrdersByVilla(orders).sort((a, b) => {
    // Sort by urgency (oldest first)
    return (
      new Date(a.oldest_order_time).getTime() -
      new Date(b.oldest_order_time).getTime()
    );
  });

  // Count orders by status
  const pendingCount = orders.filter((o) => o.status === "pending").length;
  const preparingCount = orders.filter((o) => o.status === "preparing").length;
  const readyCount = orders.filter((o) => o.status === "ready").length;

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Hidden audio element for notifications */}
      <audio
        ref={audioRef}
        src="data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2teleWcsQ6ja4tZoHzI7qvDy3HdGKkWu9Pjdclg4T7T19dlqWD1StvX12WxaPVO39fjYbVs/VLj2+dlvXEBVufb52W9cQFW59vnZb1xAVbn2+dlvXEBVufb52W9cQFW59vnZb1xAVbn2+dlvXEA="
        preload="auto"
      />

      {/* Header */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Title and Stats */}
            <div className="flex items-center gap-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Cocina TVC</h1>
                <p className="text-slate-400 text-sm">Pedidos en vivo</p>
              </div>

              {/* Quick Stats */}
              <div className="hidden md:flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
                  <span className="text-yellow-400 font-medium">
                    {pendingCount} pendiente{pendingCount !== 1 && "s"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-blue-400 font-medium">
                    {preparingCount} preparando
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-green-400 font-medium">
                    {readyCount} listo{readyCount !== 1 && "s"}
                  </span>
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-2 rounded-lg transition-colors ${
                  soundEnabled
                    ? "bg-green-500/20 text-green-400"
                    : "bg-slate-800 text-slate-500"
                }`}
                title={soundEnabled ? "Sonido activado" : "Sonido desactivado"}
              >
                {soundEnabled ? (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                  </svg>
                )}
              </button>

              {/* Filter Buttons */}
              <div className="flex bg-slate-800 rounded-lg p-1">
                {[
                  { value: "active", label: "Activos" },
                  { value: "pending", label: "Pendientes" },
                  { value: "preparing", label: "Preparando" },
                  { value: "ready", label: "Listos" },
                  { value: "all", label: "Todos" },
                ].map((filter) => (
                  <button
                    key={filter.value}
                    onClick={() => setSelectedFilter(filter.value)}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      selectedFilter === filter.value
                        ? "bg-white text-slate-900"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-10 h-10 border-3 border-white border-t-transparent rounded-full" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
            <div className="text-7xl mb-6">🍽️</div>
            <p className="text-xl font-medium">No hay pedidos</p>
            <p className="text-slate-600 mt-2">
              Los nuevos pedidos apareceran automaticamente
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {groupedOrders.map((group) => {
              const timeInfo = getTimeSince(group.oldest_order_time);
              const hasUrgent = group.orders.some(
                (o) =>
                  o.status === "pending" && getTimeSince(o.created_at).isUrgent,
              );

              return (
                <div
                  key={group.villa_id}
                  className={`bg-slate-900 rounded-xl overflow-hidden border-2 transition-all ${
                    hasUrgent
                      ? "border-red-500 shadow-lg shadow-red-500/20"
                      : "border-slate-800"
                  }`}
                >
                  {/* Villa Header - PROMINENT */}
                  <div
                    className={`px-4 py-3 flex items-center justify-between ${
                      hasUrgent ? "bg-red-500/20" : "bg-slate-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-2xl font-bold ${
                          hasUrgent ? "text-red-400" : "text-white"
                        }`}
                      >
                        {VILLA_NAMES[group.villa_id] || group.villa_id}
                      </span>
                      {hasUrgent && (
                        <span className="px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded animate-pulse">
                          URGENTE
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-lg font-semibold ${
                          timeInfo.isUrgent ? "text-red-400" : "text-slate-400"
                        }`}
                      >
                        {timeInfo.text}
                      </span>
                      <p className="text-xs text-slate-500">
                        {group.total_items} item{group.total_items !== 1 && "s"}
                      </p>
                    </div>
                  </div>

                  {/* Orders List */}
                  <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
                    {group.orders.map((order) => {
                      const nextStatus = getNextStatus(order.status);
                      const orderTime = getTimeSince(order.created_at);
                      const statusConfig =
                        STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;

                      return (
                        <div
                          key={order.id}
                          className={`p-3 rounded-lg bg-slate-800/50 ${
                            orderTime.isUrgent && order.status === "pending"
                              ? "ring-1 ring-red-500"
                              : ""
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <span className="text-white font-semibold">
                                {order.quantity}x
                              </span>{" "}
                              <span className="text-white">
                                {order.menu_items?.name_es || "Item"}
                              </span>
                              {order.guest_name && (
                                <p className="text-xs text-slate-400 mt-1">
                                  Para: {order.guest_name}
                                </p>
                              )}
                            </div>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${statusConfig.bgColor} text-white`}
                            >
                              {statusConfig.labelEs}
                            </span>
                          </div>

                          {/* Special Instructions */}
                          {order.special_instructions && (
                            <div className="mb-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-xs">
                              <span className="font-medium">Nota:</span>{" "}
                              {order.special_instructions}
                            </div>
                          )}

                          {/* Time and Action */}
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-xs ${
                                orderTime.isUrgent
                                  ? "text-red-400 font-medium"
                                  : "text-slate-500"
                              }`}
                            >
                              {orderTime.text}
                            </span>
                            {nextStatus && (
                              <button
                                onClick={() =>
                                  updateStatus(order.id, nextStatus)
                                }
                                className={`px-3 py-1.5 rounded text-xs font-semibold text-white transition-transform hover:scale-105 active:scale-95 ${
                                  STATUS_CONFIG[nextStatus]?.bgColor ||
                                  "bg-blue-500"
                                }`}
                              >
                                {STATUS_CONFIG[nextStatus]?.labelEs ||
                                  nextStatus}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Villa Quick Actions */}
                  <div className="p-3 border-t border-slate-800 flex gap-2">
                    <button
                      onClick={() =>
                        updateVillaOrders(group.villa_id, "preparing")
                      }
                      className="flex-1 py-2 bg-blue-500/20 text-blue-400 rounded-lg text-sm font-medium hover:bg-blue-500/30 transition-colors"
                    >
                      Todo Preparando
                    </button>
                    <button
                      onClick={() => updateVillaOrders(group.villa_id, "ready")}
                      className="flex-1 py-2 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-500/30 transition-colors"
                    >
                      Todo Listo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur border-t border-slate-800 px-4 py-2">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-sm">
          <span className="text-slate-500">
            Ultima actualizacion: {lastUpdate.toLocaleTimeString("es-CO")}
          </span>
          <span className="text-slate-500">Auto-refresco cada 8 segundos</span>
        </div>
      </footer>
    </div>
  );
}
