"use client";

// ============================================
// MENU CLIENT COMPONENT (Issue 67)
// Interactive menu with cart and ordering
// ============================================

import { useState } from "react";

interface MenuItem {
  id: string;
  name: string;
  name_es: string;
  description: string | null;
  description_es: string | null;
  price: number;
  category: string;
  photo_url: string | null;
  dietary_tags: string[] | null;
  allergens: string[] | null;
  is_available: boolean;
}

interface Promotion {
  id: string;
  name: string;
  name_es: string;
  discount_type: string;
  discount_value: number;
  applies_to: string;
  category_filter: string[] | null;
  item_ids: string[] | null;
}

interface CartItem {
  menuItem: MenuItem;
  quantity: number;
  special_instructions?: string;
}

interface Props {
  villaId: string;
  villaName: string;
  categories: Record<string, MenuItem[]>;
  categoryOrder: string[];
  categoryNames: Record<string, { en: string; es: string }>;
  promotions: Promotion[];
}

export default function MenuClient({
  villaId,
  villaName,
  categories,
  categoryOrder,
  categoryNames,
  promotions,
}: Props) {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItem.id === item.id ? { ...c, quantity: c.quantity + 1 } : c,
        );
      }
      return [...prev, { menuItem: item, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((c) =>
          c.menuItem.id === itemId ? { ...c, quantity: c.quantity - 1 } : c,
        );
      }
      return prev.filter((c) => c.menuItem.id !== itemId);
    });
  };

  const getItemQuantity = (itemId: string) => {
    return cart.find((c) => c.menuItem.id === itemId)?.quantity || 0;
  };

  const calculateDiscount = (item: MenuItem): number => {
    for (const promo of promotions) {
      const applies =
        promo.applies_to === "all" ||
        (promo.applies_to === "category" &&
          promo.category_filter?.includes(item.category)) ||
        (promo.applies_to === "items" && promo.item_ids?.includes(item.id));

      if (applies) {
        if (promo.discount_type === "percentage") {
          return item.price * (promo.discount_value / 100);
        } else if (promo.discount_type === "fixed") {
          return promo.discount_value;
        }
      }
    }
    return 0;
  };

  const cartTotal = cart.reduce((sum, item) => {
    const discount = calculateDiscount(item.menuItem);
    return sum + (item.menuItem.price - discount) * item.quantity;
  }, 0);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const submitOrder = async () => {
    setIsOrdering(true);
    setError(null);

    try {
      const response = await fetch("/api/menu/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          villa_id: villaId,
          items: cart.map((c) => ({
            menu_item_id: c.menuItem.id,
            quantity: c.quantity,
            special_instructions: c.special_instructions,
          })),
          guest_name: guestName || undefined,
          guest_phone: guestPhone || undefined,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setOrderSuccess(true);
        setCart([]);
        setIsCartOpen(false);
      } else {
        setError(data.error || "Error al enviar el pedido");
      }
    } catch (err) {
      setError("Error de conexion. Por favor intente de nuevo.");
    } finally {
      setIsOrdering(false);
    }
  };

  // Format price
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (orderSuccess) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="font-display text-2xl text-white mb-2">
            Pedido Recibido!
          </h2>
          <p className="text-white/60 mb-2">
            Tu pedido llegara a {villaName} en aproximadamente 15-20 minutos.
          </p>
          <p className="text-sm text-tvc-turquoise">
            Gracias por ordenar con TVC
          </p>
          <button
            onClick={() => setOrderSuccess(false)}
            className="mt-6 px-6 py-3 bg-tvc-turquoise text-white rounded-lg font-medium"
          >
            Ordenar Mas
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Category Navigation */}
      <div className="sticky top-[73px] z-40 bg-tvc-void border-b border-white/10 overflow-x-auto">
        <div className="flex gap-2 px-4 py-3">
          {categoryOrder.map(
            (cat) =>
              categories[cat] && (
                <a
                  key={cat}
                  href={`#${cat}`}
                  className="px-4 py-2 bg-white/10 rounded-full text-sm text-white whitespace-nowrap hover:bg-white/20 transition-colors"
                >
                  {categoryNames[cat]?.es || cat}
                </a>
              ),
          )}
        </div>
      </div>

      {/* Menu Items by Category */}
      <div className="max-w-lg mx-auto px-4 py-6 space-y-8">
        {categoryOrder.map(
          (cat) =>
            categories[cat] && (
              <section key={cat} id={cat}>
                <h2 className="font-display text-xl text-white mb-4">
                  {categoryNames[cat]?.es || cat}
                </h2>
                <div className="space-y-4">
                  {categories[cat].map((item) => {
                    const discount = calculateDiscount(item);
                    const finalPrice = item.price - discount;
                    const qty = getItemQuantity(item.id);

                    return (
                      <div
                        key={item.id}
                        className={`bg-white/5 rounded-xl p-4 ${
                          !item.is_available ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h3 className="text-white font-medium">
                              {item.name_es}
                            </h3>
                            {item.description_es && (
                              <p className="text-sm text-white/60 mt-1">
                                {item.description_es}
                              </p>
                            )}
                            {item.dietary_tags &&
                              item.dietary_tags.length > 0 && (
                                <div className="flex gap-1 mt-2">
                                  {item.dietary_tags.map((tag) => (
                                    <span
                                      key={tag}
                                      className="text-xs px-2 py-0.5 bg-tvc-turquoise/20 text-tvc-turquoise rounded"
                                    >
                                      {tag}
                                    </span>
                                  ))}
                                </div>
                              )}
                            <div className="mt-2 flex items-center gap-2">
                              {discount > 0 && (
                                <span className="text-sm text-white/40 line-through">
                                  {formatPrice(item.price)}
                                </span>
                              )}
                              <span className="text-tvc-gold font-semibold">
                                {formatPrice(finalPrice)}
                              </span>
                              {discount > 0 && (
                                <span className="text-xs px-2 py-0.5 bg-tvc-gold/20 text-tvc-gold rounded">
                                  PROMO
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Add/Remove Buttons */}
                          {item.is_available ? (
                            <div className="flex items-center gap-2">
                              {qty > 0 && (
                                <>
                                  <button
                                    onClick={() => removeFromCart(item.id)}
                                    className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white hover:bg-white/20"
                                  >
                                    -
                                  </button>
                                  <span className="w-6 text-center text-white">
                                    {qty}
                                  </span>
                                </>
                              )}
                              <button
                                onClick={() => addToCart(item)}
                                className="w-8 h-8 flex items-center justify-center bg-tvc-turquoise rounded-full text-white hover:bg-tvc-turquoise/80"
                              >
                                +
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-red-400">
                              No disponible
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ),
        )}
      </div>

      {/* Cart Button */}
      {cartCount > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-tvc-deep/95 backdrop-blur-sm border-t border-white/10">
          <button
            onClick={() => setIsCartOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between p-4 bg-tvc-turquoise rounded-xl text-white font-medium"
          >
            <span className="flex items-center gap-2">
              <span className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm">
                {cartCount}
              </span>
              Ver Carrito
            </span>
            <span>{formatPrice(cartTotal)}</span>
          </button>
        </div>
      )}

      {/* Cart Modal */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-end">
          <div className="w-full max-h-[90vh] bg-tvc-deep rounded-t-3xl overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display text-xl text-white">Tu Pedido</h2>
              <button
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 flex items-center justify-center text-white/60 hover:text-white"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-4 max-h-[40vh] overflow-y-auto">
              {cart.map((item) => {
                const discount = calculateDiscount(item.menuItem);
                const finalPrice = item.menuItem.price - discount;

                return (
                  <div
                    key={item.menuItem.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex-1">
                      <p className="text-white">{item.menuItem.name_es}</p>
                      <p className="text-sm text-tvc-gold">
                        {formatPrice(finalPrice)} x {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => removeFromCart(item.menuItem.id)}
                        className="w-8 h-8 flex items-center justify-center bg-white/10 rounded-full text-white"
                      >
                        -
                      </button>
                      <span className="w-6 text-center text-white">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => addToCart(item.menuItem)}
                        className="w-8 h-8 flex items-center justify-center bg-tvc-turquoise rounded-full text-white"
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guest Info */}
            <div className="p-4 border-t border-white/10 space-y-3">
              <input
                type="text"
                placeholder="Tu nombre (opcional)"
                value={guestName}
                onChange={(e) => setGuestName(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
              />
              <input
                type="tel"
                placeholder="Tu telefono (opcional)"
                value={guestPhone}
                onChange={(e) => setGuestPhone(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
              />
            </div>

            {error && (
              <div className="px-4 py-2 bg-red-500/20 border-t border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Order Button */}
            <div className="p-4 border-t border-white/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-white/60">Entrega a:</span>
                <span className="text-white font-medium">{villaName}</span>
              </div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-white font-semibold">Total:</span>
                <span className="text-tvc-gold text-xl font-bold">
                  {formatPrice(cartTotal)}
                </span>
              </div>
              <button
                onClick={submitOrder}
                disabled={isOrdering}
                className="w-full py-4 bg-tvc-turquoise text-white rounded-xl font-semibold disabled:opacity-50"
              >
                {isOrdering ? "Enviando..." : "Enviar Pedido"}
              </button>
              <p className="text-center text-xs text-white/40 mt-2">
                Tiempo estimado: 15-20 minutos
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
