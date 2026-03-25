// ═══════════════════════════════════════════════════════════════
// TVC VILLA CONSTANTS
// Synced with Cloudbeds room names
// ═══════════════════════════════════════════════════════════════

export interface Villa {
  id: string;
  name: string;
  color: string;
  maxGuests: number;
}

export const VILLAS: Villa[] = [
  { id: "villa_aduana", name: "Aduana (Azul)", color: "#3B82F6", maxGuests: 4 },
  { id: "villa_coches", name: "Coches", color: "#6B7280", maxGuests: 4 },
  {
    id: "villa_merced",
    name: "Merced (Morada)",
    color: "#8B5CF6",
    maxGuests: 4,
  },
  { id: "villa_paz", name: "Paz (Limón)", color: "#84CC16", maxGuests: 4 },
  { id: "villa_pozo", name: "Pozo (Teal)", color: "#14B8A6", maxGuests: 5 },
  {
    id: "villa_san_pedro",
    name: "San Pedro (Magenta)",
    color: "#EC4899",
    maxGuests: 5,
  },
  {
    id: "villa_santo_domingo",
    name: "Santo Domingo (Mint)",
    color: "#10B981",
    maxGuests: 4,
  },
  {
    id: "villa_teresa",
    name: "Teresa (Amarilla)",
    color: "#F59E0B",
    maxGuests: 4,
  },
  {
    id: "villa_trinidad",
    name: "Trinidad (Durazno)",
    color: "#F97316",
    maxGuests: 4,
  },
  {
    id: "villa_unassigned",
    name: "Sin Asignar",
    color: "#9CA3AF",
    maxGuests: 0,
  },
  { id: "full_house", name: "Full House", color: "#1F2937", maxGuests: 42 },
];

export const VILLA_NAMES: Record<string, string> = Object.fromEntries(
  VILLAS.map((v) => [v.id, v.name]),
);

export const VILLA_COLORS: Record<string, string> = Object.fromEntries(
  VILLAS.map((v) => [v.id, v.color]),
);

export const MAX_PROPERTY_CAPACITY = VILLAS.filter(
  (v) => v.id !== "villa_unassigned" && v.id !== "full_house",
).reduce((sum, v) => sum + v.maxGuests, 0);

export function getVillaName(villaId: string): string {
  return VILLA_NAMES[villaId] || villaId;
}

export function getVillaColor(villaId: string): string {
  return VILLA_COLORS[villaId] || "#6B7280";
}
