"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";

type Checklist = Tables<"checklists">;

interface ChecklistItem {
  task: string;
  task_es: string;
  photo_required: boolean;
  completed?: boolean;
  photo_url?: string;
  notes?: string;
}

interface ChecklistWithDetails extends Checklist {
  assigned_user?: { name: string } | null;
  approved_by_user?: { name: string } | null;
  template?: {
    name: string;
    name_es: string;
    department: string;
    items: Json;
    estimated_minutes: number | null;
  } | null;
}

interface Stats {
  pending: number;
  approvedToday: number;
  rejectedToday: number;
  completedThisWeek: number;
  avgQualityScore: number;
}

interface OccupancyInfo {
  villa_id: string;
  status: "occupied" | "arriving" | "leaving" | "empty";
  guest_name?: string;
}

interface HousekeepingTask {
  id: string;
  task: string;
  task_es: string;
  area: string;
  order: number;
  photo_required: boolean;
  estimated_minutes: number;
}

interface WeekDay {
  date: string;
  dayName: string;
  dayNameEs: string;
  isToday: boolean;
  commonAreasComplete: boolean;
  villasComplete: number;
  villasPending: number;
  checklists: ChecklistWithDetails[];
}

interface InventoryItem {
  id: string;
  name: string;
  name_es: string;
  unit: string;
  current_stock: number;
  min_stock: number;
  category: string;
}

const ADMIN_CODE = "2027";

const VILLAS = [
  { id: "villa_1", name: "Villa 1", type: "Garden View" },
  { id: "villa_2", name: "Villa 2", type: "Garden View" },
  { id: "villa_3", name: "Villa 3", type: "Pool View" },
  { id: "villa_4", name: "Villa 4", type: "Pool View" },
  { id: "villa_5", name: "Villa 5", type: "Ocean View" },
  { id: "villa_6", name: "Villa 6", type: "Ocean View" },
  { id: "villa_7", name: "Villa 7", type: "Premium Ocean" },
  { id: "villa_8", name: "Villa 8", type: "Premium Ocean" },
  { id: "villa_9", name: "Villa 9", type: "Honeymoon Suite" },
  { id: "villa_10", name: "Villa 10", type: "Honeymoon Suite" },
  { id: "main_house", name: "Casa Principal", type: "Main House" },
];

const CHECKLIST_TYPES = [
  { key: "all", label: "Todos", icon: "📋" },
  { key: "villa_retouch", label: "Retoque", icon: "✨" },
  { key: "villa_occupied", label: "Ocupada", icon: "🛏️" },
  { key: "villa_empty_arriving", label: "Llegada", icon: "🚪" },
  { key: "villa_leaving", label: "Salida", icon: "👋" },
  { key: "common_area", label: "Áreas Comunes", icon: "🏢" },
];

// Default common area tasks in ORDER (from PDF Goal #2)
const DEFAULT_COMMON_AREA_TASKS: HousekeepingTask[] = [
  {
    id: "ca1",
    task: "Clear breakfast area",
    task_es: "Limpiar área de desayuno",
    area: "breakfast",
    order: 1,
    photo_required: true,
    estimated_minutes: 20,
  },
  {
    id: "ca2",
    task: "Remove garbage from breakfast area",
    task_es: "Retirar basura del área de desayuno",
    area: "breakfast",
    order: 2,
    photo_required: false,
    estimated_minutes: 5,
  },
  {
    id: "ca3",
    task: "Organize and wipe down tables",
    task_es: "Organizar y limpiar mesas",
    area: "breakfast",
    order: 3,
    photo_required: false,
    estimated_minutes: 15,
  },
  {
    id: "ca4",
    task: "Sweep breakfast area",
    task_es: "Barrer área de desayuno",
    area: "breakfast",
    order: 4,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca5",
    task: "Clear pool area",
    task_es: "Limpiar área de piscina",
    area: "pool",
    order: 5,
    photo_required: true,
    estimated_minutes: 20,
  },
  {
    id: "ca6",
    task: "Wipe down pool beds",
    task_es: "Limpiar camas de piscina",
    area: "pool",
    order: 6,
    photo_required: false,
    estimated_minutes: 15,
  },
  {
    id: "ca7",
    task: "Organize curtains and pillows at pool",
    task_es: "Organizar cortinas y almohadas de piscina",
    area: "pool",
    order: 7,
    photo_required: true,
    estimated_minutes: 10,
  },
  {
    id: "ca8",
    task: "Organize day beds",
    task_es: "Organizar day beds",
    area: "daybeds",
    order: 8,
    photo_required: true,
    estimated_minutes: 15,
  },
  {
    id: "ca9",
    task: "Wipe down day beds",
    task_es: "Limpiar day beds",
    area: "daybeds",
    order: 9,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca10",
    task: "Organize curtains and pillows at day beds",
    task_es: "Organizar cortinas y almohadas de day beds",
    area: "daybeds",
    order: 10,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca11",
    task: "Clear Mirador",
    task_es: "Limpiar Mirador",
    area: "mirador",
    order: 11,
    photo_required: true,
    estimated_minutes: 15,
  },
  {
    id: "ca12",
    task: "Remove garbage from Mirador",
    task_es: "Retirar basura del Mirador",
    area: "mirador",
    order: 12,
    photo_required: false,
    estimated_minutes: 5,
  },
  {
    id: "ca13",
    task: "Organize and wipe down Mirador tables",
    task_es: "Organizar y limpiar mesas del Mirador",
    area: "mirador",
    order: 13,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca14",
    task: "Sweep Mirador",
    task_es: "Barrer Mirador",
    area: "mirador",
    order: 14,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca15",
    task: "Organize Lobby area",
    task_es: "Organizar área del Lobby",
    area: "lobby",
    order: 15,
    photo_required: true,
    estimated_minutes: 20,
  },
  {
    id: "ca16",
    task: "Remove garbage from Lobby",
    task_es: "Retirar basura del Lobby",
    area: "lobby",
    order: 16,
    photo_required: false,
    estimated_minutes: 5,
  },
  {
    id: "ca17",
    task: "Wipe down Lobby tables",
    task_es: "Limpiar mesas del Lobby",
    area: "lobby",
    order: 17,
    photo_required: false,
    estimated_minutes: 10,
  },
  {
    id: "ca18",
    task: "Sweep and mop Lobby",
    task_es: "Barrer y trapear Lobby",
    area: "lobby",
    order: 18,
    photo_required: true,
    estimated_minutes: 20,
  },
  {
    id: "ca19",
    task: "Clean Lobby bathroom",
    task_es: "Limpiar baño del Lobby",
    area: "lobby_bathroom",
    order: 19,
    photo_required: true,
    estimated_minutes: 15,
  },
  {
    id: "ca20",
    task: "Refill toilet paper (2 rolls each holder)",
    task_es: "Rellenar papel higiénico (2 rollos por porta)",
    area: "lobby_bathroom",
    order: 20,
    photo_required: false,
    estimated_minutes: 5,
  },
  {
    id: "ca21",
    task: "Empty garbage in bathroom",
    task_es: "Vaciar basura del baño",
    area: "lobby_bathroom",
    order: 21,
    photo_required: false,
    estimated_minutes: 3,
  },
  {
    id: "ca22",
    task: "Refill soap and lotion",
    task_es: "Rellenar jabón y loción",
    area: "lobby_bathroom",
    order: 22,
    photo_required: false,
    estimated_minutes: 5,
  },
  {
    id: "ca23",
    task: "Refill paper towels",
    task_es: "Rellenar toallas de papel",
    area: "lobby_bathroom",
    order: 23,
    photo_required: false,
    estimated_minutes: 3,
  },
];

// Villa cleaning tasks by type - ACTUAL SOP FROM TVC FORMS
const VILLA_TASKS = {
  // RETOQUE - Quick refresh cleaning
  retouch: [
    {
      task: "Organize closet",
      task_es: "Organizar closet",
      photo_required: false,
    },
    { task: "Vacuum floor", task_es: "Aspirar piso", photo_required: false },
    { task: "Mop floor", task_es: "Trapear piso", photo_required: false },
    {
      task: "Clean bathroom floor",
      task_es: "Limpiar piso del baño",
      photo_required: false,
    },
    { task: "Clean toilet", task_es: "Limpiar poceta", photo_required: false },
    { task: "Clean sink", task_es: "Limpiar lavamanos", photo_required: false },
    {
      task: "Organize bathroom products",
      task_es: "Ordenar productos baño",
      photo_required: false,
    },
    {
      task: "Make bed (if needed)",
      task_es: "Tender cama si es necesario",
      photo_required: false,
    },
    { task: "Remove trash", task_es: "Sacar basura", photo_required: false },
    {
      task: "Organize A/C remote",
      task_es: "Organizar control A/C",
      photo_required: false,
    },
    {
      task: "Set A/C to 23°C",
      task_es: "Dejar A/C 23°C",
      photo_required: false,
    },
    { task: "Turn off lights", task_es: "Apagar luces", photo_required: false },
    {
      task: "Close doors and windows",
      task_es: "Cerrar puertas y ventanas",
      photo_required: true,
    },
  ],
  // OCUPADA - Occupied villa daily cleaning
  occupied: [
    {
      task: "Organize closet",
      task_es: "Organizar closet",
      photo_required: false,
    },
    {
      task: "Organize nightstand",
      task_es: "Organizar mesa de noche",
      photo_required: false,
    },
    {
      task: "Clean all surfaces",
      task_es: "Limpiar todas las superficies",
      photo_required: false,
    },
    {
      task: "Organize mini-fridge",
      task_es: "Organizar nevera",
      photo_required: false,
    },
    { task: "Vacuum floor", task_es: "Aspirar piso", photo_required: false },
    { task: "Mop floor", task_es: "Trapear piso", photo_required: false },
    {
      task: "Clean bathroom floor",
      task_es: "Limpiar piso del baño",
      photo_required: false,
    },
    { task: "Clean toilet", task_es: "Limpiar poceta", photo_required: true },
    { task: "Clean sink", task_es: "Limpiar lavamanos", photo_required: false },
    { task: "Clean shower", task_es: "Limpiar ducha", photo_required: true },
    { task: "Make bed", task_es: "Tender cama", photo_required: true },
    {
      task: "Change towels",
      task_es: "Cambiar toallas",
      photo_required: false,
    },
    {
      task: "Replace toiletries if needed",
      task_es: "Reponer amenidades si necesario",
      photo_required: false,
    },
    { task: "Remove trash", task_es: "Sacar basura", photo_required: false },
    {
      task: "Check lamps and lights",
      task_es: "Verificar lamparas y luces",
      photo_required: false,
    },
    {
      task: "Report any damages",
      task_es: "Reportar daños",
      photo_required: false,
    },
    {
      task: "Set A/C to 23°C",
      task_es: "Dejar A/C 23°C",
      photo_required: false,
    },
    {
      task: "Turn off lights when done",
      task_es: "Apagar luces al terminar",
      photo_required: false,
    },
    {
      task: "Close doors and windows",
      task_es: "Cerrar puertas y ventanas",
      photo_required: true,
    },
  ],
  // VACÍA (LLEGADA) - Empty villa for arriving guests - DEEP CLEAN
  arriving: [
    {
      task: "Remove bedding and mattress protector",
      task_es: "Quitar sábanas y protector colchón",
      photo_required: false,
    },
    {
      task: "Put fresh mattress protector",
      task_es: "Poner protector nuevo",
      photo_required: false,
    },
    {
      task: "Make bed with fresh linens",
      task_es: "Tender cama con sábanas limpias",
      photo_required: true,
    },
    {
      task: "Clean closet inside",
      task_es: "Limpiar closet por dentro",
      photo_required: false,
    },
    {
      task: "Clean all surfaces and furniture",
      task_es: "Limpiar todas las superficies y muebles",
      photo_required: false,
    },
    {
      task: "Clean mini-fridge inside",
      task_es: "Limpiar nevera por dentro",
      photo_required: false,
    },
    {
      task: "Vacuum floor thoroughly",
      task_es: "Aspirar piso a fondo",
      photo_required: false,
    },
    {
      task: "Mop floor thoroughly",
      task_es: "Trapear piso a fondo",
      photo_required: true,
    },
    {
      task: "Clean bathroom floor with bleach",
      task_es: "Limpiar piso baño con cloro",
      photo_required: false,
    },
    {
      task: "Deep clean toilet",
      task_es: "Limpiar poceta profundamente",
      photo_required: true,
    },
    {
      task: "Deep clean sink",
      task_es: "Limpiar lavamanos profundamente",
      photo_required: false,
    },
    {
      task: "Deep clean shower",
      task_es: "Limpiar ducha profundamente",
      photo_required: true,
    },
    {
      task: "Clean mirrors",
      task_es: "Limpiar espejos",
      photo_required: false,
    },
    {
      task: "Set fresh towels (2 bath, 2 hand, 1 floor)",
      task_es: "Poner toallas nuevas (2 baño, 2 mano, 1 piso)",
      photo_required: true,
    },
    {
      task: "Set toiletries (soap, shampoo, conditioner, lotion)",
      task_es: "Poner amenidades (jabón, shampoo, acondicionador, loción)",
      photo_required: true,
    },
    {
      task: "Set toilet paper (2 rolls)",
      task_es: "Poner papel higiénico (2 rollos)",
      photo_required: false,
    },
    {
      task: "Set insect repellent",
      task_es: "Poner repelente",
      photo_required: false,
    },
    {
      task: "Check all lamps and lights work",
      task_es: "Verificar todas las lamparas y luces",
      photo_required: false,
    },
    {
      task: "Check fan works",
      task_es: "Verificar ventilador funciona",
      photo_required: false,
    },
    {
      task: "Check hot water",
      task_es: "Verificar agua caliente",
      photo_required: false,
    },
    {
      task: "Set A/C to 22°C",
      task_es: "Configurar A/C a 22°C",
      photo_required: false,
    },
    {
      task: "Final walkthrough inspection",
      task_es: "Inspección final completa",
      photo_required: true,
    },
    {
      task: "Close and lock all windows",
      task_es: "Cerrar y asegurar ventanas",
      photo_required: true,
    },
  ],
  // SALIDA - Checkout deep cleaning
  leaving: [
    {
      task: "Strip all bedding",
      task_es: "Quitar todas las sábanas",
      photo_required: false,
    },
    {
      task: "Remove mattress protector",
      task_es: "Quitar protector de colchón",
      photo_required: false,
    },
    {
      task: "Check for guest belongings",
      task_es: "Revisar pertenencias olvidadas",
      photo_required: false,
    },
    {
      task: "Remove all towels",
      task_es: "Retirar todas las toallas",
      photo_required: false,
    },
    { task: "Empty trash", task_es: "Vaciar basura", photo_required: false },
    {
      task: "Empty and clean mini-fridge",
      task_es: "Vaciar y limpiar nevera",
      photo_required: false,
    },
    {
      task: "Report any damages found",
      task_es: "Reportar daños encontrados",
      photo_required: true,
    },
    {
      task: "Clean all surfaces and furniture",
      task_es: "Limpiar todas las superficies y muebles",
      photo_required: false,
    },
    { task: "Vacuum floor", task_es: "Aspirar piso", photo_required: false },
    {
      task: "Mop floor with disinfectant",
      task_es: "Trapear piso con desinfectante",
      photo_required: false,
    },
    {
      task: "Deep clean bathroom floor",
      task_es: "Limpiar piso baño profundamente",
      photo_required: false,
    },
    {
      task: "Deep clean toilet with bleach",
      task_es: "Limpiar poceta con cloro",
      photo_required: true,
    },
    {
      task: "Deep clean sink",
      task_es: "Limpiar lavamanos profundamente",
      photo_required: false,
    },
    {
      task: "Deep clean shower with bleach",
      task_es: "Limpiar ducha con cloro",
      photo_required: true,
    },
    {
      task: "Clean mirrors",
      task_es: "Limpiar espejos",
      photo_required: false,
    },
    {
      task: "Check minibar/fridge inventory",
      task_es: "Revisar inventario minibar/nevera",
      photo_required: false,
    },
    { task: "Turn off A/C", task_es: "Apagar A/C", photo_required: false },
    {
      task: "Turn off all lights",
      task_es: "Apagar todas las luces",
      photo_required: false,
    },
    {
      task: "Lock all doors and windows",
      task_es: "Cerrar todas las puertas y ventanas",
      photo_required: true,
    },
  ],
};

// Inventory items with minimums - ACTUAL TVC SUPPLIES
const DEFAULT_INVENTORY: InventoryItem[] = [
  // ===== PAPER & ACCESSORIES =====
  {
    id: "inv1",
    name: "Napkins",
    name_es: "Servilletas",
    unit: "packs",
    current_stock: 20,
    min_stock: 10,
    category: "paper",
  },
  {
    id: "inv2",
    name: "Trash Bags Large",
    name_es: "Bolsas de Basura Grande",
    unit: "units",
    current_stock: 100,
    min_stock: 50,
    category: "paper",
  },
  {
    id: "inv3",
    name: "Trash Bags Small",
    name_es: "Bolsas de Basura Pequeña",
    unit: "units",
    current_stock: 150,
    min_stock: 75,
    category: "paper",
  },
  {
    id: "inv4",
    name: "Ziploc Bags Large",
    name_es: "Ziploc Grande",
    unit: "boxes",
    current_stock: 5,
    min_stock: 3,
    category: "paper",
  },
  {
    id: "inv5",
    name: "Ziploc Bags Small",
    name_es: "Ziploc Pequeño",
    unit: "boxes",
    current_stock: 5,
    min_stock: 3,
    category: "paper",
  },
  {
    id: "inv6",
    name: "Aluminum Foil",
    name_es: "Papel Aluminio",
    unit: "rolls",
    current_stock: 8,
    min_stock: 4,
    category: "paper",
  },
  {
    id: "inv7",
    name: "Plastic Wrap",
    name_es: "Papel Film",
    unit: "rolls",
    current_stock: 6,
    min_stock: 3,
    category: "paper",
  },
  {
    id: "inv8",
    name: "Paper Towels",
    name_es: "Toallas de Papel",
    unit: "rolls",
    current_stock: 30,
    min_stock: 15,
    category: "paper",
  },

  // ===== VILLA AMENITIES (Guest Products) =====
  {
    id: "inv10",
    name: "Shampoo",
    name_es: "Shampoo",
    unit: "L",
    current_stock: 15,
    min_stock: 8,
    category: "amenities",
  },
  {
    id: "inv11",
    name: "Conditioner",
    name_es: "Acondicionador",
    unit: "L",
    current_stock: 12,
    min_stock: 6,
    category: "amenities",
  },
  {
    id: "inv12",
    name: "Body Wash",
    name_es: "Jabón Líquido Corporal",
    unit: "L",
    current_stock: 15,
    min_stock: 8,
    category: "amenities",
  },
  {
    id: "inv13",
    name: "Hand Soap",
    name_es: "Jabón de Manos",
    unit: "L",
    current_stock: 10,
    min_stock: 5,
    category: "amenities",
  },
  {
    id: "inv14",
    name: "Body Lotion",
    name_es: "Loción Corporal",
    unit: "L",
    current_stock: 10,
    min_stock: 5,
    category: "amenities",
  },
  {
    id: "inv15",
    name: "Insect Repellent",
    name_es: "Repelente",
    unit: "bottles",
    current_stock: 25,
    min_stock: 12,
    category: "amenities",
  },
  {
    id: "inv16",
    name: "Toilet Paper",
    name_es: "Papel Higiénico",
    unit: "rolls",
    current_stock: 100,
    min_stock: 50,
    category: "amenities",
  },

  // ===== CLEANING PRODUCTS =====
  {
    id: "inv20",
    name: "Bleach",
    name_es: "Cloro",
    unit: "L",
    current_stock: 20,
    min_stock: 10,
    category: "cleaning",
  },
  {
    id: "inv21",
    name: "Citronella Oil",
    name_es: "Citronella",
    unit: "L",
    current_stock: 5,
    min_stock: 3,
    category: "cleaning",
  },
  {
    id: "inv22",
    name: "Fabuloso",
    name_es: "Fabuloso",
    unit: "L",
    current_stock: 15,
    min_stock: 8,
    category: "cleaning",
  },
  {
    id: "inv23",
    name: "Dish Soap",
    name_es: "Jabón de Platos",
    unit: "L",
    current_stock: 10,
    min_stock: 5,
    category: "cleaning",
  },
  {
    id: "inv24",
    name: "Glass Cleaner",
    name_es: "Limpia Vidrios",
    unit: "L",
    current_stock: 8,
    min_stock: 4,
    category: "cleaning",
  },
  {
    id: "inv25",
    name: "Disinfectant",
    name_es: "Desinfectante",
    unit: "L",
    current_stock: 12,
    min_stock: 6,
    category: "cleaning",
  },
  {
    id: "inv26",
    name: "Toilet Cleaner",
    name_es: "Limpiador de Poceta",
    unit: "L",
    current_stock: 8,
    min_stock: 4,
    category: "cleaning",
  },

  // ===== LAUNDRY SUPPLIES =====
  {
    id: "inv30",
    name: "Fabric Softener",
    name_es: "Suavizante",
    unit: "L",
    current_stock: 15,
    min_stock: 8,
    category: "laundry",
  },
  {
    id: "inv31",
    name: "Starch Spray",
    name_es: "Varnis (Apresto)",
    unit: "cans",
    current_stock: 10,
    min_stock: 5,
    category: "laundry",
  },
  {
    id: "inv32",
    name: "Varsol/Thinner",
    name_es: "Varsol",
    unit: "L",
    current_stock: 5,
    min_stock: 2,
    category: "laundry",
  },
  {
    id: "inv33",
    name: "Laundry Detergent",
    name_es: "Detergente de Ropa",
    unit: "kg",
    current_stock: 20,
    min_stock: 10,
    category: "laundry",
  },
  {
    id: "inv34",
    name: "Stain Remover",
    name_es: "Quitamanchas",
    unit: "L",
    current_stock: 5,
    min_stock: 3,
    category: "laundry",
  },

  // ===== LINENS =====
  {
    id: "inv40",
    name: "Bath Towels",
    name_es: "Toallas de Baño",
    unit: "units",
    current_stock: 60,
    min_stock: 35,
    category: "linens",
  },
  {
    id: "inv41",
    name: "Hand Towels",
    name_es: "Toallas de Mano",
    unit: "units",
    current_stock: 50,
    min_stock: 30,
    category: "linens",
  },
  {
    id: "inv42",
    name: "Floor Towels",
    name_es: "Toallas de Piso",
    unit: "units",
    current_stock: 25,
    min_stock: 15,
    category: "linens",
  },
  {
    id: "inv43",
    name: "Bed Sheets King",
    name_es: "Sábanas King",
    unit: "sets",
    current_stock: 20,
    min_stock: 12,
    category: "linens",
  },
  {
    id: "inv44",
    name: "Bed Sheets Queen",
    name_es: "Sábanas Queen",
    unit: "sets",
    current_stock: 15,
    min_stock: 10,
    category: "linens",
  },
  {
    id: "inv45",
    name: "Pillow Cases",
    name_es: "Fundas de Almohada",
    unit: "units",
    current_stock: 60,
    min_stock: 40,
    category: "linens",
  },
  {
    id: "inv46",
    name: "Mattress Protectors King",
    name_es: "Protectores Colchón King",
    unit: "units",
    current_stock: 15,
    min_stock: 10,
    category: "linens",
  },
  {
    id: "inv47",
    name: "Mattress Protectors Queen",
    name_es: "Protectores Colchón Queen",
    unit: "units",
    current_stock: 12,
    min_stock: 8,
    category: "linens",
  },

  // ===== POOL SUPPLIES (Cross-reference with Maintenance) =====
  {
    id: "inv50",
    name: "Pool Chlorine",
    name_es: "Cloro para Piscina",
    unit: "kg",
    current_stock: 10,
    min_stock: 5,
    category: "pool",
  },
  {
    id: "inv51",
    name: "pH Regulator",
    name_es: "Regulador pH",
    unit: "L",
    current_stock: 5,
    min_stock: 3,
    category: "pool",
  },
  {
    id: "inv52",
    name: "Algaecide",
    name_es: "Algicida",
    unit: "L",
    current_stock: 5,
    min_stock: 2,
    category: "pool",
  },
];

const AREA_LABELS: { [key: string]: { en: string; es: string; icon: string } } =
  {
    breakfast: { en: "Breakfast Area", es: "Área de Desayuno", icon: "🍳" },
    pool: { en: "Pool Area", es: "Área de Piscina", icon: "🏊" },
    daybeds: { en: "Day Beds", es: "Day Beds", icon: "🛋️" },
    mirador: { en: "Mirador", es: "Mirador", icon: "🌅" },
    lobby: { en: "Lobby", es: "Lobby", icon: "🏨" },
    lobby_bathroom: { en: "Lobby Bathroom", es: "Baño del Lobby", icon: "🚽" },
  };

export default function HousekeepingQCPage() {
  const [checklists, setChecklists] = useState<ChecklistWithDetails[]>([]);
  const [historyChecklists, setHistoryChecklists] = useState<
    ChecklistWithDetails[]
  >([]);
  const [selected, setSelected] = useState<ChecklistWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeFilter, setActiveFilter] = useState("all");
  const [activeTab, setActiveTab] = useState<
    "week" | "pending" | "history" | "inventory"
  >("week");
  const [qcNotes, setQcNotes] = useState("");
  const [qualityScore, setQualityScore] = useState(5);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showWorkOrderModal, setShowWorkOrderModal] = useState(false);
  const [workOrderDescription, setWorkOrderDescription] = useState("");
  const [workOrderPriority, setWorkOrderPriority] = useState<
    "low" | "normal" | "high" | "urgent"
  >("normal");
  const [occupancyInfo, setOccupancyInfo] = useState<OccupancyInfo[]>([]);
  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    completedThisWeek: 0,
    avgQualityScore: 0,
  });

  // Admin mode
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [adminCode, setAdminCode] = useState("");

  // Week view
  const [weekDays, setWeekDays] = useState<WeekDay[]>([]);
  const [selectedWeekDay, setSelectedWeekDay] = useState<WeekDay | null>(null);

  // Common area tasks
  const [commonAreaTasks, setCommonAreaTasks] = useState<HousekeepingTask[]>(
    DEFAULT_COMMON_AREA_TASKS,
  );
  const [customTasks, setCustomTasks] = useState<HousekeepingTask[]>([]);

  // Task editing
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<HousekeepingTask | null>(null);
  const [newTask, setNewTask] = useState({
    task: "",
    task_es: "",
    area: "breakfast",
    photo_required: false,
    estimated_minutes: 10,
  });

  // Inventory
  const [inventory, setInventory] =
    useState<InventoryItem[]>(DEFAULT_INVENTORY);

  const housekeepingTypes = [
    "villa_retouch",
    "villa_occupied",
    "villa_empty_arriving",
    "villa_leaving",
    "common_area",
  ] as const;

  // Load custom tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tvc_housekeeping_custom_tasks");
    if (saved) {
      try {
        setCustomTasks(JSON.parse(saved));
      } catch {
        console.error("Failed to parse custom tasks");
      }
    }
    const savedInventory = localStorage.getItem("tvc_housekeeping_inventory");
    if (savedInventory) {
      try {
        setInventory(JSON.parse(savedInventory));
      } catch {
        console.error("Failed to parse inventory");
      }
    }
  }, []);

  const saveCustomTasks = (tasks: HousekeepingTask[]) => {
    localStorage.setItem(
      "tvc_housekeeping_custom_tasks",
      JSON.stringify(tasks),
    );
    setCustomTasks(tasks);
  };

  const saveInventory = (items: InventoryItem[]) => {
    localStorage.setItem("tvc_housekeeping_inventory", JSON.stringify(items));
    setInventory(items);
  };

  const generateWeekDays = useCallback(
    (checklistsData: ChecklistWithDetails[]) => {
      const days: WeekDay[] = [];
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());

      const dayNames = [
        "Sunday",
        "Monday",
        "Tuesday",
        "Wednesday",
        "Thursday",
        "Friday",
        "Saturday",
      ];
      const dayNamesEs = [
        "Domingo",
        "Lunes",
        "Martes",
        "Miércoles",
        "Jueves",
        "Viernes",
        "Sábado",
      ];

      for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const dateStr = date.toISOString().split("T")[0];
        const dayChecklists = checklistsData.filter((c) => c.date === dateStr);

        const commonAreaChecklists = dayChecklists.filter(
          (c) => c.type === "common_area",
        );
        const villaChecklists = dayChecklists.filter(
          (c) => c.type !== "common_area",
        );

        days.push({
          date: dateStr,
          dayName: dayNames[date.getDay()],
          dayNameEs: dayNamesEs[date.getDay()],
          isToday: dateStr === today.toISOString().split("T")[0],
          commonAreasComplete: commonAreaChecklists.some(
            (c) => c.status === "approved",
          ),
          villasComplete: villaChecklists.filter((c) => c.status === "approved")
            .length,
          villasPending: villaChecklists.filter(
            (c) => c.status === "pending" || c.status === "complete",
          ).length,
          checklists: dayChecklists,
        });
      }

      setWeekDays(days);
      const todayDay = days.find((d) => d.isToday);
      if (todayDay) setSelectedWeekDay(todayDay);
    },
    [],
  );

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];
    const startOfWeek = new Date();
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const weekStart = startOfWeek.toISOString().split("T")[0];

    // Get all checklists for the week
    const { data: weekData } = await supabase
      .from("checklists")
      .select("*")
      .gte("date", weekStart)
      .in("type", housekeepingTypes)
      .order("date", { ascending: true });

    // Get pending checklists
    const { data: pendingData, error: pendingError } = await supabase
      .from("checklists")
      .select("*")
      .eq("status", "complete")
      .is("approved_at", null)
      .in("type", housekeepingTypes)
      .order("completed_at", { ascending: false });

    if (pendingError) {
      console.error("[loadData] pendingError:", pendingError);
    }

    // Get history (last 7 days approved/rejected)
    const { data: historyData } = await supabase
      .from("checklists")
      .select("*")
      .in("status", ["approved", "rejected"])
      .gte("updated_at", `${weekAgo}T00:00:00`)
      .in("type", housekeepingTypes)
      .order("updated_at", { ascending: false })
      .limit(50);

    // Get today's occupancy for context
    const { data: occupancyData } = await supabase
      .from("daily_occupancy")
      .select("villas_occupied, check_ins, check_outs")
      .eq("date", today)
      .single();

    // Build occupancy info
    const villasOccupied = (occupancyData?.villas_occupied || []) as string[];
    const checkIns = (occupancyData?.check_ins || []) as string[];
    const checkOuts = (occupancyData?.check_outs || []) as string[];

    const occInfo: OccupancyInfo[] = VILLAS.map((v) => {
      const isOccupied = villasOccupied.includes(v.id);
      const isArriving = checkIns.includes(v.id);
      const isLeaving = checkOuts.includes(v.id);
      return {
        villa_id: v.id,
        status: isArriving
          ? "arriving"
          : isLeaving
            ? "leaving"
            : isOccupied
              ? "occupied"
              : "empty",
      };
    });
    setOccupancyInfo(occInfo);

    // Get stats with counts
    const { count: approvedTodayCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${today}T00:00:00`)
      .in("type", housekeepingTypes);

    const { count: rejectedTodayCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("updated_at", `${today}T00:00:00`)
      .in("type", housekeepingTypes);

    const { count: completedWeekCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${weekAgo}T00:00:00`)
      .in("type", housekeepingTypes);

    // Get avg quality score from approved checklists
    const { data: qualityData } = await supabase
      .from("checklists")
      .select("quality_score")
      .eq("status", "approved")
      .gte("approved_at", `${weekAgo}T00:00:00`)
      .in("type", housekeepingTypes)
      .not("quality_score", "is", null);

    const avgScore =
      qualityData && qualityData.length > 0
        ? qualityData.reduce((sum, c) => sum + (c.quality_score || 0), 0) /
          qualityData.length
        : 0;

    setStats({
      pending: pendingData?.length || 0,
      approvedToday: approvedTodayCount || 0,
      rejectedToday: rejectedTodayCount || 0,
      completedThisWeek: completedWeekCount || 0,
      avgQualityScore: Math.round(avgScore * 10) / 10,
    });

    // Generate week view
    generateWeekDays(weekData || []);

    if (!pendingData || pendingData.length === 0) {
      setChecklists([]);
      setHistoryChecklists(historyData || []);
      setLoading(false);
      return;
    }

    // Get unique user IDs and template IDs
    const allChecklists = [...pendingData, ...(historyData || [])];
    const userIds = [
      ...new Set([
        ...allChecklists.map((c) => c.assigned_to).filter(Boolean),
        ...allChecklists.map((c) => c.approved_by).filter(Boolean),
      ]),
    ] as string[];
    const templateIds = [
      ...new Set(allChecklists.map((c) => c.template_id).filter(Boolean)),
    ] as string[];

    // Fetch users
    const { data: usersData } =
      userIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", userIds)
        : { data: [] };

    // Fetch templates
    const { data: templatesData } =
      templateIds.length > 0
        ? await supabase
            .from("checklist_templates")
            .select("id, name, name_es, department, items, estimated_minutes")
            .in("id", templateIds)
        : { data: [] };

    // Create lookup maps
    const usersMap = new Map((usersData || []).map((u) => [u.id, u]));
    const templatesMap = new Map((templatesData || []).map((t) => [t.id, t]));

    // Combine data
    const enrichChecklists = (
      data: typeof pendingData,
    ): ChecklistWithDetails[] =>
      (data || []).map((checklist) => ({
        ...checklist,
        assigned_user: checklist.assigned_to
          ? usersMap.get(checklist.assigned_to) || null
          : null,
        approved_by_user: checklist.approved_by
          ? usersMap.get(checklist.approved_by) || null
          : null,
        template: checklist.template_id
          ? templatesMap.get(checklist.template_id) || null
          : null,
      }));

    const enrichedPending = enrichChecklists(pendingData);
    const enrichedHistory = enrichChecklists(historyData || []);

    setChecklists(enrichedPending);
    setHistoryChecklists(enrichedHistory);
    if (enrichedPending.length > 0) {
      setSelected(enrichedPending[0]);
    }
    setLoading(false);
  }, [generateWeekDays]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  const handleAdminLogin = () => {
    if (adminCode === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminCode("");
    } else {
      alert("Código incorrecto");
    }
  };

  const handleApprove = async () => {
    if (!selected) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "approved" as const,
        approved_at: new Date().toISOString(),
        quality_score: qualityScore,
        qc_notes: qcNotes || null,
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleApprove]", error);
      alert("Error al aprobar: " + error.message);
    } else {
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
      setQcNotes("");
      setQualityScore(5);
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        approvedToday: prev.approvedToday + 1,
      }));
    }

    setProcessing(false);
  };

  const handleReject = async () => {
    if (!selected || !rejectReason) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("checklists")
      .update({
        status: "rejected" as const,
        rejection_reason: rejectReason,
        qc_notes: qcNotes || null,
      })
      .eq("id", selected.id);

    if (error) {
      console.error("[handleReject]", error);
      alert("Error al rechazar: " + error.message);
    } else {
      const remaining = checklists.filter((c) => c.id !== selected.id);
      setChecklists(remaining);
      setSelected(remaining[0] || null);
      setShowRejectModal(false);
      setRejectReason("");
      setQcNotes("");
      setStats((prev) => ({
        ...prev,
        pending: prev.pending - 1,
        rejectedToday: prev.rejectedToday + 1,
      }));
    }

    setProcessing(false);
  };

  const handleCreateWorkOrder = async () => {
    if (!selected || !workOrderDescription) return;
    setProcessing(true);

    const supabase = createBrowserClient();

    const dayIndex = new Date().getDay();
    const dayTypes = [
      "maintenance_sunday",
      "maintenance_monday",
      "maintenance_tuesday",
      "maintenance_wednesday",
      "maintenance_thursday",
      "maintenance_friday",
      "maintenance_saturday",
    ] as const;

    const { error } = await supabase.from("checklists").insert({
      type: dayTypes[dayIndex],
      villa_id: selected.villa_id,
      date: new Date().toISOString().split("T")[0],
      status: "pending",
      notes: `[ORDEN DESDE HOUSEKEEPING QC] ${workOrderDescription}`,
      items: [
        {
          task: workOrderDescription,
          task_es: workOrderDescription,
          photo_required: true,
          priority: workOrderPriority,
        },
      ],
    });

    if (error) {
      console.error("[handleCreateWorkOrder]", error);
      alert("Error al crear orden: " + error.message);
    } else {
      setShowWorkOrderModal(false);
      setWorkOrderDescription("");
      setWorkOrderPriority("normal");
      alert("✅ Orden de mantenimiento creada");
    }

    setProcessing(false);
  };

  const handleAddTask = () => {
    if (!newTask.task || !newTask.task_es) return;

    const task: HousekeepingTask = {
      id: `custom_${Date.now()}`,
      task: newTask.task,
      task_es: newTask.task_es,
      area: newTask.area,
      order: commonAreaTasks.length + customTasks.length + 1,
      photo_required: newTask.photo_required,
      estimated_minutes: newTask.estimated_minutes,
    };

    saveCustomTasks([...customTasks, task]);
    setShowAddTaskModal(false);
    setNewTask({
      task: "",
      task_es: "",
      area: "breakfast",
      photo_required: false,
      estimated_minutes: 10,
    });
  };

  const handleEditTask = () => {
    if (!editingTask || !newTask.task || !newTask.task_es) return;

    const updatedTasks = customTasks.map((t) =>
      t.id === editingTask.id
        ? {
            ...t,
            task: newTask.task,
            task_es: newTask.task_es,
            area: newTask.area,
            photo_required: newTask.photo_required,
            estimated_minutes: newTask.estimated_minutes,
          }
        : t,
    );
    saveCustomTasks(updatedTasks);
    setEditingTask(null);
    setShowAddTaskModal(false);
    setNewTask({
      task: "",
      task_es: "",
      area: "breakfast",
      photo_required: false,
      estimated_minutes: 10,
    });
  };

  const handleDeleteTask = (taskId: string) => {
    if (!confirm("¿Eliminar esta tarea?")) return;
    saveCustomTasks(customTasks.filter((t) => t.id !== taskId));
  };

  const handleUpdateInventory = (itemId: string, newStock: number) => {
    const updated = inventory.map((item) =>
      item.id === itemId ? { ...item, current_stock: newStock } : item,
    );
    saveInventory(updated);
  };

  const getVillaName = (villaId: string | null) => {
    if (!villaId) return "N/A";
    const villa = VILLAS.find((v) => v.id === villaId);
    return villa ? villa.name : villaId.replace("_", " ");
  };

  const getOccupancyBadge = (villaId: string | null) => {
    if (!villaId) return null;
    const occ = occupancyInfo.find((o) => o.villa_id === villaId);
    if (!occ) return null;
    switch (occ.status) {
      case "occupied":
        return <Badge color="#10B981">🏠 Ocupada</Badge>;
      case "arriving":
        return <Badge color="#3B82F6">🚪 Llegada Hoy</Badge>;
      case "leaving":
        return <Badge color="#F59E0B">👋 Salida Hoy</Badge>;
      default:
        return <Badge color="#6B7280">Vacía</Badge>;
    }
  };

  const getTypeLabel = (type: string) => {
    const found = CHECKLIST_TYPES.find((t) => t.key === type);
    return found ? `${found.icon} ${found.label}` : type;
  };

  const parseItems = (items: Json): ChecklistItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items as unknown as ChecklistItem[];
  };

  const filteredChecklists =
    activeFilter === "all"
      ? checklists
      : checklists.filter((c) => c.type === activeFilter);

  const filteredHistory =
    activeFilter === "all"
      ? historyChecklists
      : historyChecklists.filter((c) => c.type === activeFilter);

  const allTasks = [...commonAreaTasks, ...customTasks].sort(
    (a, b) => a.order - b.order,
  );

  const renderStars = (score: number, interactive = false) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && setQualityScore(star)}
            disabled={!interactive}
            className={`text-xl transition-all ${star <= score ? "text-yellow-400" : "text-slate-200"} ${interactive ? "hover:scale-110 cursor-pointer" : ""}`}
          >
            ★
          </button>
        ))}
      </div>
    );
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
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            🧹 Housekeeping Quality Control
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Control de calidad de limpieza con vista semanal y gestión de
            tareas.
          </p>
        </div>
        <button
          onClick={() => setShowAdminModal(true)}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
            isAdmin
              ? "bg-emerald-500 text-white"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {isAdmin ? "🔓 Admin Mode" : "🔐 Admin"}
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-amber-500">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Pendientes QC
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-emerald-500">
            {stats.approvedToday}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Aprobados Hoy
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-rose-500">
            {stats.rejectedToday}
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Rechazados Hoy
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-blue-500">
            {stats.completedThisWeek}
          </div>
          <div className="text-xs text-slate-500 font-medium">Esta Semana</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-yellow-500 flex items-center gap-1">
            {stats.avgQualityScore > 0 ? stats.avgQualityScore.toFixed(1) : "—"}
            <span className="text-sm">★</span>
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Calidad Prom.
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto">
        <button
          onClick={() => setActiveTab("week")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "week"
              ? "bg-[#0A0A0F] text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          📅 Semana
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          ⏳ Pendientes ({checklists.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "history"
              ? "bg-blue-500 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          ✅ Historial
        </button>
        <button
          onClick={() => setActiveTab("inventory")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "inventory"
              ? "bg-purple-500 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          📦 Inventario
        </button>
      </div>

      {/* WEEK TAB */}
      {activeTab === "week" && (
        <div>
          {/* Week Calendar */}
          <div className="grid grid-cols-7 gap-2 mb-6">
            {weekDays.map((day) => (
              <button
                key={day.date}
                onClick={() => setSelectedWeekDay(day)}
                className={`p-3 rounded-xl border transition-all text-left ${
                  selectedWeekDay?.date === day.date
                    ? "bg-[#00B4FF]/10 border-[#00B4FF] shadow-sm"
                    : day.isToday
                      ? "bg-amber-50 border-amber-200"
                      : "bg-white border-slate-200 hover:border-slate-300"
                }`}
              >
                <div className="text-xs font-bold text-slate-500">
                  {day.dayNameEs.slice(0, 3)}
                </div>
                <div
                  className={`text-lg font-black ${day.isToday ? "text-amber-600" : "text-slate-900"}`}
                >
                  {new Date(day.date + "T12:00:00").getDate()}
                </div>
                <div className="mt-2 space-y-1">
                  <div
                    className={`text-[10px] font-bold ${day.commonAreasComplete ? "text-emerald-500" : "text-slate-400"}`}
                  >
                    {day.commonAreasComplete ? "✓ Áreas" : "○ Áreas"}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    🏠 {day.villasComplete}/
                    {day.villasComplete + day.villasPending}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Day Details */}
          {selectedWeekDay && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Common Area Tasks */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-slate-900">
                    🏢 Tareas de Áreas Comunes
                  </h3>
                  {isAdmin && (
                    <button
                      onClick={() => {
                        setEditingTask(null);
                        setNewTask({
                          task: "",
                          task_es: "",
                          area: "breakfast",
                          photo_required: false,
                          estimated_minutes: 10,
                        });
                        setShowAddTaskModal(true);
                      }}
                      className="px-3 py-1.5 bg-emerald-500 text-white rounded-lg text-xs font-bold hover:bg-emerald-600"
                    >
                      + Agregar
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-500 mb-4">
                  Orden de ejecución según PDF (Goal #2)
                </p>

                <div className="space-y-1 max-h-[400px] overflow-y-auto">
                  {Object.keys(AREA_LABELS).map((areaKey) => {
                    const areaTasks = allTasks.filter(
                      (t) => t.area === areaKey,
                    );
                    if (areaTasks.length === 0) return null;
                    const areaLabel = AREA_LABELS[areaKey];

                    return (
                      <div key={areaKey} className="mb-3">
                        <div className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-1 sticky top-0 bg-white py-1">
                          <span>{areaLabel.icon}</span>
                          <span>{areaLabel.es}</span>
                        </div>
                        {areaTasks.map((task, idx) => (
                          <div
                            key={task.id}
                            className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-slate-50 group"
                          >
                            <span className="text-xs text-slate-400 w-5">
                              {task.order}.
                            </span>
                            <span className="flex-1 text-sm text-slate-700">
                              {task.task_es}
                            </span>
                            {task.photo_required && (
                              <span className="text-xs text-amber-500">📸</span>
                            )}
                            <span className="text-xs text-slate-400">
                              {task.estimated_minutes}m
                            </span>
                            {isAdmin && task.id.startsWith("custom_") && (
                              <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                                <button
                                  onClick={() => {
                                    setEditingTask(task);
                                    setNewTask({
                                      task: task.task,
                                      task_es: task.task_es,
                                      area: task.area,
                                      photo_required: task.photo_required,
                                      estimated_minutes: task.estimated_minutes,
                                    });
                                    setShowAddTaskModal(true);
                                  }}
                                  className="text-blue-500 text-xs hover:text-blue-600"
                                >
                                  ✏️
                                </button>
                                <button
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="text-rose-500 text-xs hover:text-rose-600"
                                >
                                  🗑️
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-between text-xs text-slate-500">
                  <span>Total: {allTasks.length} tareas</span>
                  <span>
                    ~{allTasks.reduce((sum, t) => sum + t.estimated_minutes, 0)}{" "}
                    minutos
                  </span>
                </div>
              </div>

              {/* Villa Status for Selected Day */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-900 mb-4">
                  🏠 Estado de Villas - {selectedWeekDay.dayNameEs}{" "}
                  {new Date(selectedWeekDay.date + "T12:00:00").getDate()}
                </h3>

                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {VILLAS.map((villa) => {
                    const occ = occupancyInfo.find(
                      (o) => o.villa_id === villa.id,
                    );
                    const villaChecklists = selectedWeekDay.checklists.filter(
                      (c) => c.villa_id === villa.id,
                    );
                    const hasApproved = villaChecklists.some(
                      (c) => c.status === "approved",
                    );
                    const hasPending = villaChecklists.some(
                      (c) => c.status === "pending" || c.status === "complete",
                    );

                    let cleaningType = "—";
                    let cleaningTypeColor = "text-slate-400";
                    if (occ?.status === "arriving") {
                      cleaningType = "🚪 Llegada";
                      cleaningTypeColor = "text-blue-600";
                    } else if (occ?.status === "leaving") {
                      cleaningType = "👋 Salida";
                      cleaningTypeColor = "text-amber-600";
                    } else if (occ?.status === "occupied") {
                      cleaningType = "🛏️ Ocupada";
                      cleaningTypeColor = "text-emerald-600";
                    } else {
                      cleaningType = "✨ Vacía";
                      cleaningTypeColor = "text-slate-400";
                    }

                    return (
                      <div
                        key={villa.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          hasApproved
                            ? "bg-emerald-50 border-emerald-200"
                            : hasPending
                              ? "bg-amber-50 border-amber-200"
                              : "bg-slate-50 border-slate-200"
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-slate-900">
                            {villa.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            {villa.type}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className={`text-xs font-bold ${cleaningTypeColor}`}
                          >
                            {cleaningType}
                          </div>
                          <div className="text-xs text-slate-400">
                            {hasApproved
                              ? "✅ Aprobada"
                              : hasPending
                                ? "⏳ Pendiente"
                                : "○ Sin checklist"}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Villa Cleaning Type Reference with Actual Tasks */}
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-bold text-slate-600 mb-3">
                    📋 Checklists por Tipo de Limpieza (del SOP TVC):
                  </div>

                  {/* Retouch Tasks */}
                  <details className="mb-3 bg-slate-50 rounded-lg border border-slate-200">
                    <summary className="p-3 cursor-pointer font-bold text-sm flex items-center gap-2">
                      <span>✨</span>
                      <span>Retoque ({VILLA_TASKS.retouch.length} tareas)</span>
                    </summary>
                    <div className="px-3 pb-3 space-y-1">
                      {VILLA_TASKS.retouch.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="text-slate-400">•</span>
                          <span>{task.task_es}</span>
                          {task.photo_required && (
                            <span className="text-amber-500">📸</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Occupied Tasks */}
                  <details className="mb-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <summary className="p-3 cursor-pointer font-bold text-sm flex items-center gap-2 text-emerald-800">
                      <span>🛏️</span>
                      <span>
                        Ocupada ({VILLA_TASKS.occupied.length} tareas)
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-1">
                      {VILLA_TASKS.occupied.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="text-slate-400">•</span>
                          <span>{task.task_es}</span>
                          {task.photo_required && (
                            <span className="text-amber-500">📸</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Arriving Tasks */}
                  <details className="mb-3 bg-blue-50 rounded-lg border border-blue-200">
                    <summary className="p-3 cursor-pointer font-bold text-sm flex items-center gap-2 text-blue-800">
                      <span>🚪</span>
                      <span>
                        Llegada / Vacía ({VILLA_TASKS.arriving.length} tareas)
                      </span>
                    </summary>
                    <div className="px-3 pb-3 space-y-1">
                      {VILLA_TASKS.arriving.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="text-slate-400">•</span>
                          <span>{task.task_es}</span>
                          {task.photo_required && (
                            <span className="text-amber-500">📸</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>

                  {/* Leaving Tasks */}
                  <details className="mb-3 bg-amber-50 rounded-lg border border-amber-200">
                    <summary className="p-3 cursor-pointer font-bold text-sm flex items-center gap-2 text-amber-800">
                      <span>👋</span>
                      <span>Salida ({VILLA_TASKS.leaving.length} tareas)</span>
                    </summary>
                    <div className="px-3 pb-3 space-y-1">
                      {VILLA_TASKS.leaving.map((task, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-600"
                        >
                          <span className="text-slate-400">•</span>
                          <span>{task.task_es}</span>
                          {task.photo_required && (
                            <span className="text-amber-500">📸</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PENDING TAB */}
      {activeTab === "pending" && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {CHECKLIST_TYPES.map((type) => {
              const count =
                type.key === "all"
                  ? checklists.length
                  : checklists.filter((c) => c.type === type.key).length;
              return (
                <button
                  key={type.key}
                  onClick={() => setActiveFilter(type.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                    activeFilter === type.key
                      ? "bg-[#0A0A0F] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {type.icon} {type.label}
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          {filteredChecklists.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
              <div className="text-5xl mb-3">✅</div>
              <p className="text-slate-600 font-semibold text-lg">
                ¡Todo al día!
              </p>
              <p className="text-sm text-slate-400 mt-1">
                No hay checklists de housekeeping pendientes de aprobación
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Pending List */}
              <div className="lg:col-span-1 space-y-2">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                  Pendientes ({filteredChecklists.length})
                </div>
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {filteredChecklists.map((checklist) => {
                    const items = parseItems(checklist.items);
                    const completedCount = items.filter(
                      (i) => i.completed,
                    ).length;
                    const photosCount = items.filter((i) => i.photo_url).length;
                    const photosRequired = items.filter(
                      (i) => i.photo_required,
                    ).length;

                    return (
                      <button
                        key={checklist.id}
                        onClick={() => setSelected(checklist)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selected?.id === checklist.id
                            ? "bg-[#00B4FF]/10 border-[#00B4FF] shadow-sm"
                            : "bg-white border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="font-bold text-sm text-slate-900">
                              {checklist.template?.name_es ||
                                getTypeLabel(checklist.type)}
                            </div>
                            {checklist.villa_id && (
                              <div className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>
                                  📍 {getVillaName(checklist.villa_id)}
                                </span>
                                {getOccupancyBadge(checklist.villa_id)}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                          <span>
                            👤 {checklist.assigned_user?.name || "Staff"}
                          </span>
                          <span>
                            ✅ {completedCount}/{items.length}
                          </span>
                          {photosRequired > 0 && (
                            <span
                              className={
                                photosCount < photosRequired
                                  ? "text-amber-500 font-semibold"
                                  : ""
                              }
                            >
                              📸 {photosCount}/{photosRequired}
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400 mt-1">
                          {checklist.completed_at
                            ? new Date(checklist.completed_at).toLocaleString(
                                "es-CO",
                                {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  day: "numeric",
                                  month: "short",
                                },
                              )
                            : ""}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail View */}
              <div className="lg:col-span-2">
                {selected ? (
                  <div className="bg-white rounded-xl border border-slate-200 p-5">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                      <div>
                        <div className="text-xl font-extrabold text-slate-900">
                          {selected.template?.name_es ||
                            getTypeLabel(selected.type)}
                        </div>
                        <div className="text-sm text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                          {selected.villa_id && (
                            <>
                              <span>📍 {getVillaName(selected.villa_id)}</span>
                              {getOccupancyBadge(selected.villa_id)}
                            </>
                          )}
                          <span>
                            👤 {selected.assigned_user?.name || "Staff"}
                          </span>
                          {selected.duration_minutes && (
                            <span>⏱️ {selected.duration_minutes} min</span>
                          )}
                        </div>
                      </div>
                      <Badge color="#F59E0B">Pendiente Aprobación</Badge>
                    </div>

                    {/* Progress Bar */}
                    {(() => {
                      const items = parseItems(selected.items);
                      const completedCount = items.filter(
                        (i) => i.completed,
                      ).length;
                      const pct =
                        items.length > 0
                          ? (completedCount / items.length) * 100
                          : 0;
                      return (
                        <div className="mb-4">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>Progreso del checklist</span>
                            <span>
                              {completedCount}/{items.length} tareas (
                              {Math.round(pct)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full transition-all ${pct === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })()}

                    {/* Items Review */}
                    <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                      {parseItems(selected.items).map((item, idx) => (
                        <div
                          key={idx}
                          className={`flex items-start gap-3 p-3 rounded-lg ${item.completed ? "bg-emerald-50" : "bg-rose-50"}`}
                        >
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                              item.completed
                                ? "bg-emerald-500 text-white"
                                : "bg-rose-500 text-white"
                            }`}
                          >
                            {item.completed ? "✓" : "✗"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div
                              className={`text-sm ${item.completed ? "text-slate-700" : "text-rose-700 font-medium"}`}
                            >
                              {item.task_es || item.task}
                            </div>
                            {item.notes && (
                              <div className="text-xs text-slate-500 mt-1">
                                💬 {item.notes}
                              </div>
                            )}
                          </div>
                          {item.photo_required && (
                            <button
                              onClick={() => {
                                if (item.photo_url) {
                                  setSelectedPhoto(item.photo_url);
                                  setShowPhotoModal(true);
                                }
                              }}
                              className={`text-xs px-2 py-1 rounded font-bold flex-shrink-0 transition-all ${
                                item.photo_url
                                  ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200 cursor-pointer"
                                  : "bg-amber-100 text-amber-600"
                              }`}
                            >
                              📸 {item.photo_url ? "VER" : "FALTA"}
                            </button>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Staff Notes */}
                    {selected.notes && (
                      <div className="bg-slate-50 rounded-lg p-3 mb-4">
                        <div className="text-xs font-semibold text-slate-600 mb-1">
                          Notas del Staff:
                        </div>
                        <div className="text-sm text-slate-700">
                          {selected.notes}
                        </div>
                      </div>
                    )}

                    {/* Quality Score */}
                    <div className="bg-yellow-50 rounded-lg p-4 mb-4">
                      <div className="text-xs font-semibold text-slate-600 mb-2">
                        Calificación de Calidad:
                      </div>
                      {renderStars(qualityScore, true)}
                      <div className="text-xs text-slate-500 mt-1">
                        {qualityScore === 5 && "Excelente"}
                        {qualityScore === 4 && "Muy Bueno"}
                        {qualityScore === 3 && "Aceptable"}
                        {qualityScore === 2 && "Necesita Mejora"}
                        {qualityScore === 1 && "Deficiente"}
                      </div>
                    </div>

                    {/* QC Notes */}
                    <div className="mb-4">
                      <label className="text-xs font-semibold text-slate-600 block mb-1">
                        Notas del QC (opcional):
                      </label>
                      <textarea
                        value={qcNotes}
                        onChange={(e) => setQcNotes(e.target.value)}
                        placeholder="Agregar observaciones de control de calidad..."
                        className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-[#00B4FF] focus:ring-2 focus:ring-[#00B4FF]/20"
                      />
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4 border-t border-slate-100">
                      <button
                        onClick={handleApprove}
                        disabled={processing}
                        className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {processing ? (
                          <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                        ) : (
                          <>✅ Aprobar ({qualityScore}★)</>
                        )}
                      </button>
                      <button
                        onClick={() => setShowRejectModal(true)}
                        disabled={processing}
                        className="px-4 py-3 bg-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-200 transition-colors disabled:opacity-50"
                      >
                        ❌
                      </button>
                      <button
                        onClick={() => setShowWorkOrderModal(true)}
                        disabled={processing}
                        className="px-4 py-3 bg-amber-100 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-200 transition-colors disabled:opacity-50"
                        title="Crear orden de mantenimiento"
                      >
                        🔧
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-slate-200 text-slate-400">
                    ← Selecciona un checklist para revisar
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <>
          {/* Filter Tabs */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
            {CHECKLIST_TYPES.map((type) => {
              const count =
                type.key === "all"
                  ? historyChecklists.length
                  : historyChecklists.filter((c) => c.type === type.key).length;
              return (
                <button
                  key={type.key}
                  onClick={() => setActiveFilter(type.key)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                    activeFilter === type.key
                      ? "bg-[#0A0A0F] text-white"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-slate-300"
                  }`}
                >
                  {type.icon} {type.label}
                  <span className="ml-1 text-xs opacity-60">({count})</span>
                </button>
              );
            })}
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Tipo
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Villa
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Staff
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Estado
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Calidad
                    </th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600">
                      Fecha
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredHistory.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="text-center py-8 text-slate-400"
                      >
                        No hay historial para este filtro
                      </td>
                    </tr>
                  ) : (
                    filteredHistory.map((c) => (
                      <tr
                        key={c.id}
                        className="border-b border-slate-100 hover:bg-slate-50"
                      >
                        <td className="px-4 py-3">{getTypeLabel(c.type)}</td>
                        <td className="px-4 py-3">
                          {getVillaName(c.villa_id)}
                        </td>
                        <td className="px-4 py-3">
                          {c.assigned_user?.name || "Staff"}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            color={
                              c.status === "approved" ? "#10B981" : "#EF4444"
                            }
                          >
                            {c.status === "approved"
                              ? "✓ Aprobado"
                              : "✗ Rechazado"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          {c.quality_score ? (
                            <span className="text-yellow-500">
                              {"★".repeat(c.quality_score)}
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {c.approved_at
                            ? new Date(c.approved_at).toLocaleString("es-CO", {
                                day: "numeric",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : c.updated_at
                              ? new Date(c.updated_at).toLocaleString("es-CO", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })
                              : "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-slate-900">
              📦 Inventario de Limpieza
            </h3>
            <div className="text-xs text-slate-500">
              {inventory.filter((i) => i.current_stock < i.min_stock).length}{" "}
              items bajo mínimo
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              "paper",
              "amenities",
              "cleaning",
              "laundry",
              "linens",
              "pool",
            ].map((category) => {
              const categoryItems = inventory.filter(
                (i) => i.category === category,
              );
              if (categoryItems.length === 0) return null;
              const categoryLabels: {
                [key: string]: { label: string; icon: string };
              } = {
                paper: { label: "Papel y Accesorios", icon: "📜" },
                amenities: { label: "Amenidades de Villa", icon: "🧴" },
                cleaning: { label: "Productos de Limpieza", icon: "🧹" },
                laundry: { label: "Lavandería", icon: "👕" },
                linens: { label: "Blancos", icon: "🛏️" },
                pool: { label: "Piscina", icon: "🏊" },
                bathroom: { label: "Baño / Amenidades", icon: "🧴" },
                supplies: { label: "Suministros", icon: "📦" },
              };

              return (
                <div
                  key={category}
                  className="bg-white rounded-xl border border-slate-200 p-4"
                >
                  <h4 className="font-bold text-sm text-slate-700 mb-3 flex items-center gap-2">
                    <span>{categoryLabels[category]?.icon}</span>
                    <span>{categoryLabels[category]?.label}</span>
                  </h4>
                  <div className="space-y-2">
                    {categoryItems.map((item) => {
                      const isLow = item.current_stock < item.min_stock;
                      return (
                        <div
                          key={item.id}
                          className={`flex items-center justify-between p-2 rounded-lg ${
                            isLow
                              ? "bg-rose-50 border border-rose-200"
                              : "bg-slate-50"
                          }`}
                        >
                          <div className="flex-1">
                            <div
                              className={`text-sm font-medium ${isLow ? "text-rose-700" : "text-slate-700"}`}
                            >
                              {item.name_es}
                            </div>
                            <div className="text-xs text-slate-400">
                              Mín: {item.min_stock} {item.unit}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {isAdmin ? (
                              <input
                                type="number"
                                value={item.current_stock}
                                onChange={(e) =>
                                  handleUpdateInventory(
                                    item.id,
                                    parseInt(e.target.value) || 0,
                                  )
                                }
                                className={`w-16 px-2 py-1 text-sm rounded border text-center ${
                                  isLow
                                    ? "border-rose-300 bg-rose-100"
                                    : "border-slate-200"
                                }`}
                              />
                            ) : (
                              <span
                                className={`text-sm font-bold ${isLow ? "text-rose-600" : "text-slate-700"}`}
                              >
                                {item.current_stock}
                              </span>
                            )}
                            <span className="text-xs text-slate-400">
                              {item.unit}
                            </span>
                            {isLow && <span className="text-rose-500">⚠️</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Low Stock Alert Summary */}
          {inventory.filter((i) => i.current_stock < i.min_stock).length >
            0 && (
            <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-4">
              <h4 className="font-bold text-rose-700 mb-2">
                ⚠️ Items Bajo Mínimo
              </h4>
              <div className="flex flex-wrap gap-2">
                {inventory
                  .filter((i) => i.current_stock < i.min_stock)
                  .map((item) => (
                    <span
                      key={item.id}
                      className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-xs font-medium"
                    >
                      {item.name_es}: {item.current_stock}/{item.min_stock}{" "}
                      {item.unit}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODALS */}

      {/* Admin Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              🔐 Modo Administrador
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Ingresa el código para editar tareas e inventario.
            </p>
            <input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Código de acceso"
              className="w-full p-3 border border-slate-200 rounded-lg text-sm mb-4 focus:outline-none focus:border-[#00B4FF] focus:ring-2 focus:ring-[#00B4FF]/20"
              onKeyDown={(e) => e.key === "Enter" && handleAdminLogin()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminCode("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-3 bg-[#00B4FF] text-white rounded-xl font-semibold text-sm hover:bg-[#0095d6] transition-colors"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              {editingTask ? "✏️ Editar Tarea" : "➕ Agregar Tarea"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Tarea (Español)*
                </label>
                <input
                  type="text"
                  value={newTask.task_es}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task_es: e.target.value })
                  }
                  placeholder="Ej: Limpiar ventanas"
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Task (English)*
                </label>
                <input
                  type="text"
                  value={newTask.task}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task: e.target.value })
                  }
                  placeholder="Ex: Clean windows"
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Área
                </label>
                <select
                  value={newTask.area}
                  onChange={(e) =>
                    setNewTask({ ...newTask, area: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                >
                  {Object.entries(AREA_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>
                      {val.icon} {val.es}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Tiempo (min)
                  </label>
                  <input
                    type="number"
                    value={newTask.estimated_minutes}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        estimated_minutes: parseInt(e.target.value) || 10,
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                  />
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newTask.photo_required}
                      onChange={(e) =>
                        setNewTask({
                          ...newTask,
                          photo_required: e.target.checked,
                        })
                      }
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-600">
                      📸 Requiere Foto
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowAddTaskModal(false);
                  setEditingTask(null);
                  setNewTask({
                    task: "",
                    task_es: "",
                    area: "breakfast",
                    photo_required: false,
                    estimated_minutes: 10,
                  });
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={editingTask ? handleEditTask : handleAddTask}
                disabled={!newTask.task || !newTask.task_es}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-emerald-600 transition-colors"
              >
                {editingTask ? "Guardar" : "Agregar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div
          className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
          onClick={() => setShowPhotoModal(false)}
        >
          <div className="max-w-3xl max-h-[90vh] relative">
            <button
              onClick={() => setShowPhotoModal(false)}
              className="absolute -top-10 right-0 text-white text-2xl hover:text-slate-300"
            >
              ✕
            </button>
            <img
              src={selectedPhoto}
              alt="Foto del checklist"
              className="max-w-full max-h-[85vh] rounded-lg object-contain"
            />
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              ❌ Rechazar Checklist
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Indica el motivo del rechazo. El staff recibirá esta notificación
              y deberá completar el checklist nuevamente.
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Falta foto del baño, cama no está bien tendida..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-28 focus:outline-none focus:border-[#00B4FF] focus:ring-2 focus:ring-[#00B4FF]/20"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-rose-600 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Confirmar Rechazo"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Work Order Modal */}
      {showWorkOrderModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              🔧 Crear Orden de Mantenimiento
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              {selected?.villa_id && (
                <span className="font-semibold">
                  {getVillaName(selected.villa_id)} -{" "}
                </span>
              )}
              Describe el problema de mantenimiento encontrado.
            </p>
            <textarea
              value={workOrderDescription}
              onChange={(e) => setWorkOrderDescription(e.target.value)}
              placeholder="Ej: AC no enfría correctamente, gotera en el baño..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-28 focus:outline-none focus:border-[#00B4FF] focus:ring-2 focus:ring-[#00B4FF]/20"
            />
            <div className="mt-3">
              <label className="text-xs font-semibold text-slate-600 block mb-2">
                Prioridad:
              </label>
              <div className="flex gap-2">
                {(["low", "normal", "high", "urgent"] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setWorkOrderPriority(p)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      workOrderPriority === p
                        ? p === "urgent"
                          ? "bg-red-500 text-white"
                          : p === "high"
                            ? "bg-amber-500 text-white"
                            : p === "normal"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-500 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p === "urgent"
                      ? "🚨 Urgente"
                      : p === "high"
                        ? "⚠️ Alta"
                        : p === "normal"
                          ? "Normal"
                          : "Baja"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowWorkOrderModal(false);
                  setWorkOrderDescription("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateWorkOrder}
                disabled={!workOrderDescription.trim() || processing}
                className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-semibold text-sm disabled:opacity-50 hover:bg-amber-600 transition-colors flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Crear Orden"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
