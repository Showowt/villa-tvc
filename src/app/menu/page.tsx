// ============================================
// PUBLIC MENU PAGE (Issue 67)
// Main menu entry point - allows villa selection
// ============================================

import { createServerClient } from "@/lib/supabase/client";
import { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Menu | Tiny Village Cartagena",
  description:
    "Explore our Caribbean-inspired menu. Order food and drinks directly to your villa.",
  openGraph: {
    title: "Menu | Tiny Village Cartagena",
    description:
      "Fresh, local cuisine delivered to your villa. Order via QR code.",
    type: "website",
  },
};

// Villa data with names in Spanish and English
const VILLAS = [
  { id: "villa1", name: "Villa 1", nameEs: "Casa del Mar" },
  { id: "villa2", name: "Villa 2", nameEs: "Casa del Sol" },
  { id: "villa3", name: "Villa 3", nameEs: "Casa del Cielo" },
  { id: "villa4", name: "Villa 4", nameEs: "Casa del Viento" },
  { id: "villa5", name: "Villa 5", nameEs: "Casa del Bosque" },
  { id: "villa6", name: "Villa 6", nameEs: "Casa del Rio" },
  { id: "villa7", name: "Villa 7", nameEs: "Casa Coral" },
  { id: "villa8", name: "Villa 8", nameEs: "Casa Palmera" },
  { id: "villa9", name: "Villa 9", nameEs: "Casa Caracol" },
  { id: "villa10", name: "Villa 10", nameEs: "Casa Arena" },
  { id: "villa11", name: "Villa 11", nameEs: "Casa Estrella" },
];

const COMMON_AREAS = [
  { id: "pool", name: "Pool Area", nameEs: "Zona de Piscina" },
  { id: "beach", name: "Beach", nameEs: "Playa" },
  { id: "common", name: "Common Area", nameEs: "Area Comun" },
];

async function getMenuCategories() {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from("menu_items")
      .select("category")
      .eq("is_active", true);

    if (error) throw error;

    const categories = [...new Set(data?.map((item) => item.category) || [])];
    return categories;
  } catch {
    return [];
  }
}

export default async function MenuPage() {
  const categories = await getMenuCategories();

  return (
    <div className="min-h-screen bg-tvc-void">
      {/* Header */}
      <header className="bg-tvc-deep border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-6 text-center">
          <h1 className="font-display text-3xl text-white font-bold mb-2">
            TVC Menu
          </h1>
          <p className="text-tvc-turquoise">Tiny Village Cartagena</p>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        {/* Language Selection */}
        <div className="flex justify-center gap-4 mb-8">
          <span className="px-4 py-2 bg-tvc-turquoise/20 text-tvc-turquoise rounded-full text-sm">
            Espanol
          </span>
          <span className="px-4 py-2 bg-white/5 text-white/60 rounded-full text-sm">
            English
          </span>
        </div>

        {/* Instructions */}
        <div className="bg-white/5 rounded-xl p-6 mb-8 border border-white/10">
          <h2 className="text-white font-semibold mb-3 text-center">
            Donde te encuentras? / Where are you?
          </h2>
          <p className="text-white/60 text-sm text-center">
            Selecciona tu villa para ordenar comida y bebidas con entrega
            directa.
          </p>
        </div>

        {/* Villas Grid */}
        <section className="mb-8">
          <h3 className="text-white/80 text-sm font-medium mb-4 uppercase tracking-wider">
            Villas
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {VILLAS.map((villa) => (
              <Link
                key={villa.id}
                href={`/menu/${villa.id}`}
                className="group bg-white/5 hover:bg-tvc-turquoise/20 border border-white/10 hover:border-tvc-turquoise/50 rounded-xl p-4 transition-all duration-200"
              >
                <div className="text-white font-semibold group-hover:text-tvc-turquoise transition-colors">
                  {villa.name}
                </div>
                <div className="text-white/50 text-sm">{villa.nameEs}</div>
              </Link>
            ))}
          </div>
        </section>

        {/* Common Areas */}
        <section className="mb-8">
          <h3 className="text-white/80 text-sm font-medium mb-4 uppercase tracking-wider">
            Areas Comunes / Common Areas
          </h3>
          <div className="grid grid-cols-1 gap-3">
            {COMMON_AREAS.map((area) => (
              <Link
                key={area.id}
                href={`/menu/${area.id}`}
                className="group bg-white/5 hover:bg-tvc-gold/20 border border-white/10 hover:border-tvc-gold/50 rounded-xl p-4 transition-all duration-200 flex items-center justify-between"
              >
                <div>
                  <div className="text-white font-semibold group-hover:text-tvc-gold transition-colors">
                    {area.nameEs}
                  </div>
                  <div className="text-white/50 text-sm">{area.name}</div>
                </div>
                <svg
                  className="w-5 h-5 text-white/30 group-hover:text-tvc-gold transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            ))}
          </div>
        </section>

        {/* Menu Preview */}
        {categories.length > 0 && (
          <section className="mb-8">
            <h3 className="text-white/80 text-sm font-medium mb-4 uppercase tracking-wider">
              Nuestro Menu / Our Menu
            </h3>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <span
                  key={category}
                  className="px-3 py-1 bg-white/5 text-white/60 rounded-full text-sm capitalize"
                >
                  {category.replace("_", " ")}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Info Footer */}
        <footer className="text-center text-white/40 text-sm mt-12 pb-8">
          <p className="mb-2">Entrega estimada: 15-20 minutos</p>
          <p>Estimated delivery: 15-20 minutes</p>
        </footer>
      </main>
    </div>
  );
}
