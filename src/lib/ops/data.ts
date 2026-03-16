// ═══════════════════════════════════════════════════════════════
// TVC OPERATIONS INTELLIGENCE v3 — Data Layer
// ═══════════════════════════════════════════════════════════════

import type {
  Dish,
  Drink,
  ConsumptionItem,
  VillaChecklist,
  TransportConfig,
  Upsell,
  RequirementCategory,
} from "./types";

// ─── Transport Cost Model ───
export const TRANSPORT: TransportConfig = {
  boatFuelPerTrip: 35000, // COP per round trip to Cartagena
  staffTimePerTrip: 25000, // COP opportunity cost (staff away 1.5-2 hrs)
  avgTripsPerWeek: 4, // Current trips
  optimalTripsPerWeek: 2, // With better forecasting
  perKgSurcharge: 500, // Estimated per-kg transport cost for bulk
};

// ═══════════════════════════════════════════════════════════════
// DRINKS DATA (Bar P&L)
// ═══════════════════════════════════════════════════════════════
export const DRINKS: Drink[] = [
  {
    id: "d1",
    name: "Margarita",
    price: 44000,
    category: "Cocktails",
    ordersPerWeek: 25,
    ingredients: [
      { name: "Tequila (Olmeca)", qty: "60ml", cost: 7200, transport: 60 },
      { name: "Triple Sec", qty: "30ml", cost: 2400, transport: 30 },
      { name: "Fresh lime juice", qty: "30ml", cost: 1200, transport: 20 },
      { name: "Salt", qty: "pinch", cost: 50, transport: 5 },
      { name: "Ice", qty: "cup", cost: 500, transport: 10 },
    ],
  },
  {
    id: "d2",
    name: "Moscow Mule",
    price: 44000,
    category: "Cocktails",
    ordersPerWeek: 20,
    ingredients: [
      { name: "Vodka (Absolut)", qty: "60ml", cost: 5500, transport: 60 },
      { name: "Ginger Beer", qty: "150ml", cost: 3500, transport: 40 },
      { name: "Fresh lime juice", qty: "15ml", cost: 600, transport: 10 },
      { name: "Ice", qty: "cup", cost: 500, transport: 10 },
      { name: "Garnish (lime+mint)", qty: "each", cost: 400, transport: 5 },
    ],
  },
  {
    id: "d3",
    name: "Mojito",
    price: 44000,
    category: "Cocktails",
    ordersPerWeek: 22,
    ingredients: [
      { name: "White Rum (Bacardi)", qty: "60ml", cost: 4800, transport: 60 },
      { name: "Fresh mint", qty: "8 leaves", cost: 800, transport: 10 },
      { name: "Lime juice", qty: "30ml", cost: 1200, transport: 20 },
      { name: "Sugar syrup", qty: "15ml", cost: 300, transport: 5 },
      { name: "Soda water", qty: "100ml", cost: 400, transport: 10 },
      { name: "Ice", qty: "cup", cost: 500, transport: 10 },
    ],
  },
  {
    id: "d4",
    name: "Cuba Libre",
    price: 44000,
    category: "Cocktails",
    ordersPerWeek: 18,
    ingredients: [
      { name: "White Rum (Bacardi)", qty: "60ml", cost: 4800, transport: 60 },
      { name: "Coca-Cola", qty: "200ml", cost: 1500, transport: 30 },
      { name: "Fresh lime", qty: "1 wedge", cost: 400, transport: 5 },
      { name: "Ice", qty: "cup", cost: 500, transport: 10 },
    ],
  },
  {
    id: "d5",
    name: "Gin & Tonic",
    price: 44000,
    category: "Cocktails",
    ordersPerWeek: 15,
    ingredients: [
      { name: "Hendrick's Gin", qty: "60ml", cost: 10500, transport: 60 },
      { name: "Tonic water", qty: "150ml", cost: 2000, transport: 30 },
      { name: "Cucumber/lime", qty: "garnish", cost: 500, transport: 5 },
      { name: "Ice", qty: "cup", cost: 500, transport: 10 },
    ],
  },
  {
    id: "d6",
    name: "Glass of Wine",
    price: 35000,
    category: "Wine",
    ordersPerWeek: 12,
    ingredients: [
      {
        name: "Wine (Santa Carolina)",
        qty: "150ml",
        cost: 6000,
        transport: 40,
      },
    ],
  },
  {
    id: "d7",
    name: "Beer",
    price: 22000,
    category: "Beer",
    ordersPerWeek: 45,
    ingredients: [
      { name: "Beer bottle", qty: "1 unit", cost: 4000, transport: 30 },
    ],
  },
  {
    id: "d8",
    name: "Premium Shot",
    price: 44000,
    category: "Spirits",
    ordersPerWeek: 10,
    ingredients: [
      { name: "Premium spirit", qty: "45ml", cost: 12000, transport: 40 },
    ],
  },
  {
    id: "d9",
    name: "Shot (Standard)",
    price: 30000,
    category: "Spirits",
    ordersPerWeek: 15,
    ingredients: [
      { name: "Standard spirit", qty: "45ml", cost: 5000, transport: 30 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// FOOD DATA
// ═══════════════════════════════════════════════════════════════
export const DISHES: Dish[] = [
  {
    id: "f1",
    name: "Coconut Fish Fantasy",
    price: 75000,
    category: "Specialties",
    ordersPerWeek: 15,
    ingredients: [
      { name: "Fish fillet", qty: "250g", cost: 12000, transport: 125 },
      { name: "Coconut milk", qty: "200ml", cost: 3500, transport: 100 },
      { name: "Coconut rice", qty: "200g", cost: 2800, transport: 100 },
      { name: "Passion fruit", qty: "2 units", cost: 1500, transport: 75 },
      { name: "Plantains", qty: "2 units", cost: 1200, transport: 150 },
      { name: "Mixed greens", qty: "80g", cost: 1800, transport: 40 },
      { name: "Seasonings", qty: "misc", cost: 2200, transport: 25 },
    ],
  },
  {
    id: "f2",
    name: "Caribbean Lobster",
    price: 180000,
    category: "Specialties",
    ordersPerWeek: 5,
    ingredients: [
      { name: "Whole lobster", qty: "1 unit", cost: 65000, transport: 300 },
      { name: "Butter", qty: "50g", cost: 2500, transport: 25 },
      { name: "Coconut rice", qty: "200g", cost: 2800, transport: 100 },
      { name: "Salad", qty: "150g", cost: 3500, transport: 75 },
      { name: "Plantains", qty: "2", cost: 1200, transport: 150 },
      { name: "Dressing+garnish", qty: "misc", cost: 3500, transport: 40 },
    ],
  },
  {
    id: "f3",
    name: "Grilled Chicken",
    price: 65000,
    category: "Specialties",
    ordersPerWeek: 18,
    ingredients: [
      { name: "Chicken breast", qty: "250g", cost: 8000, transport: 125 },
      { name: "Coconut rice", qty: "200g", cost: 2800, transport: 100 },
      { name: "Salad", qty: "120g", cost: 2500, transport: 60 },
      { name: "Plantains", qty: "2", cost: 1200, transport: 150 },
      { name: "Seasonings", qty: "misc", cost: 1800, transport: 25 },
    ],
  },
  {
    id: "f4",
    name: "Beef Burger",
    price: 52000,
    category: "Main",
    ordersPerWeek: 20,
    ingredients: [
      { name: "Beef patty", qty: "200g", cost: 10000, transport: 100 },
      { name: "Bun", qty: "1", cost: 2000, transport: 40 },
      { name: "Toppings", qty: "mix", cost: 2000, transport: 50 },
      { name: "Cheese", qty: "30g", cost: 1500, transport: 15 },
      { name: "Sauces+fries", qty: "misc", cost: 3300, transport: 85 },
    ],
  },
  {
    id: "f5",
    name: "Empanadas (3pc)",
    price: 22000,
    category: "Starters",
    ordersPerWeek: 30,
    ingredients: [
      { name: "Shells+filling", qty: "3 units", cost: 6000, transport: 135 },
      { name: "Oil+sauce", qty: "portion", cost: 1300, transport: 25 },
    ],
  },
  {
    id: "f6",
    name: "Island Beef Plate",
    price: 65000,
    category: "Specialties",
    ordersPerWeek: 12,
    ingredients: [
      { name: "Beef cut", qty: "200g", cost: 15000, transport: 100 },
      { name: "Vegetables+rice", qty: "400g", cost: 5800, transport: 175 },
      { name: "Sauce+salad", qty: "150g", cost: 5700, transport: 75 },
    ],
  },
];

// ═══════════════════════════════════════════════════════════════
// UPSELLS & COMMISSIONS DATA
// ═══════════════════════════════════════════════════════════════
export const UPSELLS: Upsell[] = [
  {
    id: "u1",
    name: "Rosario Islands Excursion",
    type: "excursion",
    price: 350000,
    cost: 180000,
    commission: 0,
    isPartner: false,
    frequency: "3x/week",
    emoji: "🏝️",
  },
  {
    id: "u2",
    name: "Sunset Bay Tour (Pescadito)",
    type: "boating",
    price: 200000,
    cost: 85000,
    commission: 0,
    isPartner: false,
    frequency: "4x/week",
    emoji: "🌅",
  },
  {
    id: "u3",
    name: "Colibri ONE Yacht (group)",
    type: "boating",
    price: 450000,
    cost: 180000,
    commission: 0,
    isPartner: false,
    frequency: "2x/week",
    emoji: "🛥️",
  },
  {
    id: "u4",
    name: "Night Boat to Cartagena",
    type: "boating",
    price: 150000,
    cost: 60000,
    commission: 0,
    isPartner: false,
    frequency: "3x/week",
    emoji: "🌃",
  },
  {
    id: "u5",
    name: "Local Lancha Transfer",
    type: "transport",
    price: 50000,
    cost: 20000,
    commission: 0,
    isPartner: false,
    frequency: "daily",
    emoji: "🚤",
  },
  {
    id: "u6",
    name: "Island Moto Rental",
    type: "partner",
    price: 80000,
    cost: 0,
    commission: 15,
    isPartner: true,
    partnerName: "Moto guys",
    frequency: "5x/week",
    emoji: "🏍️",
  },
  {
    id: "u7",
    name: "Lanchero (partner boats)",
    type: "partner",
    price: 40000,
    cost: 0,
    commission: 15,
    isPartner: true,
    partnerName: "Lancheros",
    frequency: "daily",
    emoji: "⛵",
  },
  {
    id: "u8",
    name: "Van Airport Transfer",
    type: "partner",
    price: 120000,
    cost: 0,
    commission: 10,
    isPartner: true,
    partnerName: "Van drivers",
    frequency: "4x/week",
    emoji: "🚐",
  },
  {
    id: "u9",
    name: "Jet Ski Rental",
    type: "opportunity",
    price: 200000,
    cost: 0,
    commission: 20,
    isPartner: false,
    partnerName: "NOT YET PARTNERED",
    frequency: "potential",
    emoji: "🏄",
  },
  {
    id: "u10",
    name: "Palenque Cultural Trip",
    type: "excursion",
    price: 250000,
    cost: 100000,
    commission: 0,
    isPartner: false,
    frequency: "1x/week",
    emoji: "🎭",
  },
  {
    id: "u11",
    name: "Private Bottomless Brunch",
    type: "event",
    price: 150000,
    cost: 55000,
    commission: 0,
    isPartner: false,
    frequency: "2x/week",
    emoji: "🥂",
  },
  {
    id: "u12",
    name: "4-Course Private Dinner",
    type: "event",
    price: 235000,
    cost: 90000,
    commission: 0,
    isPartner: false,
    frequency: "1x/week",
    emoji: "🕯️",
  },
];

// ═══════════════════════════════════════════════════════════════
// REQUIREMENTS MAP
// ═══════════════════════════════════════════════════════════════
export const REQUIREMENTS: RequirementCategory[] = [
  {
    cat: "COST",
    items: [
      {
        need: "Food costing / margins",
        module: "Dish P&L",
        status: "built",
        phase: 1,
      },
      {
        need: "Drink costing / margins",
        module: "Bar P&L",
        status: "built",
        phase: 1,
      },
      {
        need: "Transport cost per item",
        module: "Transport Layer",
        status: "built",
        phase: 1,
      },
      {
        need: "Tighter budgeting",
        module: "Budget Forecaster",
        status: "phase2",
        phase: 2,
      },
    ],
  },
  {
    cat: "SALES",
    items: [
      {
        need: "Social media → conversion",
        module: "Villa Bot (IG/WhatsApp)",
        status: "built",
        phase: 1,
      },
      {
        need: "Website → conversion",
        module: "Villa Bot (Web Chat)",
        status: "built",
        phase: 1,
      },
      {
        need: "Bot books, not person",
        module: "Booking Flow Bot",
        status: "new",
        phase: 1,
      },
      {
        need: "OTA management (Expedia)",
        module: "OTA Connector",
        status: "phase2",
        phase: 2,
      },
      {
        need: "Sales outreach funnel",
        module: "PHANTOM for TVC",
        status: "phase2",
        phase: 2,
      },
    ],
  },
  {
    cat: "REVENUE MAXIMIZATION",
    items: [
      {
        need: "Minimize food waste",
        module: "Person-Nights Engine",
        status: "built",
        phase: 1,
      },
      {
        need: "Optimize cost per dish",
        module: "Dish P&L + Transport",
        status: "built",
        phase: 1,
      },
      {
        need: "Optimize cost per drink",
        module: "Bar P&L + Transport",
        status: "built",
        phase: 1,
      },
      {
        need: "Pricing optimization",
        module: "Consumption Analytics",
        status: "phase2",
        phase: 2,
      },
      {
        need: "Upselling (excursions, boats)",
        module: "Revenue Maximizer",
        status: "new",
        phase: 1,
      },
      {
        need: "Commission tracking (motos, lanchas, vans)",
        module: "Partner Commission Engine",
        status: "new",
        phase: 1,
      },
      {
        need: "New partnerships (jetskis, hotels)",
        module: "Partner Opportunity Pipeline",
        status: "new",
        phase: 1,
      },
    ],
  },
  {
    cat: "OPERATIONS",
    items: [
      {
        need: "Cleaning quality control",
        module: "Housekeeping QC",
        status: "built",
        phase: 1,
      },
      {
        need: "Kitchen quality control",
        module: "Kitchen QC Checklist",
        status: "new",
        phase: 1,
      },
      {
        need: "Check-in procedures",
        module: "Check-in SOP Bot",
        status: "new",
        phase: 1,
      },
      {
        need: "Check-out procedures",
        module: "Check-out SOP Bot",
        status: "new",
        phase: 1,
      },
      {
        need: "Maintenance systems",
        module: "Maintenance Tracker",
        status: "phase2",
        phase: 2,
      },
      {
        need: "Guest food inventory",
        module: "Person-Nights Engine",
        status: "built",
        phase: 1,
      },
      {
        need: "Staff food tracking",
        module: "Staff Consumption Module",
        status: "new",
        phase: 1,
      },
      {
        need: "Cleaning supplies inventory",
        module: "Supply Forecaster",
        status: "built",
        phase: 1,
      },
      {
        need: "Staff SOP questions",
        module: "Back-of-House Bot",
        status: "built",
        phase: 1,
      },
    ],
  },
  {
    cat: "COMMUNICATIONS",
    items: [
      {
        need: "Human-sounding responses all platforms",
        module: "Villa AI Concierge",
        status: "built",
        phase: 1,
      },
      {
        need: "WhatsApp guest communication",
        module: "Twilio WhatsApp Bot",
        status: "built",
        phase: 1,
      },
      {
        need: "Language barrier (ES↔EN↔FR)",
        module: "Translation Bridge",
        status: "new",
        phase: 1,
      },
      {
        need: "Booking through bot",
        module: "Cloudbeds Integration",
        status: "new",
        phase: 1,
      },
    ],
  },
];

// ─── Consumption per person-night ───
export const CONSUMPTION: Record<string, ConsumptionItem[]> = {
  breakfast: [
    { item: "Coffee", unit: "g", perPN: 15, costPer: 120, emoji: "☕" },
    { item: "Fresh Juice", unit: "ml", perPN: 300, costPer: 8, emoji: "🧃" },
    { item: "Eggs", unit: "units", perPN: 2, costPer: 800, emoji: "🥚" },
    { item: "Bread/Arepa", unit: "units", perPN: 2, costPer: 500, emoji: "🍞" },
    { item: "Fresh Fruit", unit: "g", perPN: 150, costPer: 8, emoji: "🍉" },
    { item: "Butter", unit: "g", perPN: 15, costPer: 30, emoji: "🧈" },
    { item: "Milk", unit: "ml", perPN: 100, costPer: 5, emoji: "🥛" },
  ],
  beverage: [
    {
      item: "Bottled Water",
      unit: "L",
      perPN: 1.5,
      costPer: 2000,
      emoji: "💧",
    },
    { item: "Ice", unit: "bags", perPN: 0.5, costPer: 5000, emoji: "🧊" },
    { item: "Sodas", unit: "units", perPN: 0.8, costPer: 2500, emoji: "🥤" },
    { item: "Beer", unit: "units", perPN: 1.2, costPer: 4000, emoji: "🍺" },
  ],
  supplies: [
    {
      item: "Toilet Paper",
      unit: "rolls",
      perPN: 0.3,
      costPer: 3000,
      emoji: "🧻",
    },
    { item: "Soap Bar", unit: "units", perPN: 0.2, costPer: 2500, emoji: "🧼" },
    { item: "Shampoo", unit: "ml", perPN: 30, costPer: 40, emoji: "🧴" },
    {
      item: "Bath Towels",
      unit: "sets",
      perPN: 0.5,
      costPer: 8000,
      emoji: "🛁",
    },
  ],
};

// ─── Villa checklist ───
export const VILLA_CHECKLIST: VillaChecklist = {
  bedroom: [
    { task: "Beds made with fresh linens", photo: true },
    { task: "Pillows fluffed and arranged", photo: false },
    { task: "No stains on sheets or pillowcases", photo: true },
    { task: "AC unit tested and working", photo: false },
    { task: "Ceiling fan operational", photo: false },
    { task: "Closet empty and clean", photo: false },
  ],
  bathroom: [
    { task: "Toilet scrubbed and sanitized", photo: true },
    { task: "Shower cleaned, no mold", photo: true },
    { task: "Soap bar placed (x2)", photo: true },
    { task: "Shampoo bottle placed", photo: false },
    { task: "Fresh towels placed (x4)", photo: true },
    { task: "Toilet paper (2 rolls minimum)", photo: false },
    { task: "Mirror cleaned, streak-free", photo: false },
  ],
  living: [
    { task: "All surfaces dusted", photo: false },
    { task: "Floor swept and mopped", photo: false },
    { task: "Decor items in correct position", photo: true },
    { task: "Mural undamaged", photo: false },
    { task: "Light switches all working", photo: false },
    { task: "WiFi card on table", photo: true },
  ],
  patio: [
    { task: "Patio swept clean", photo: false },
    { task: "Furniture wiped down", photo: false },
    { task: "No debris or trash", photo: true },
    { task: "Plants watered", photo: false },
  ],
  final: [
    { task: "Welcome water bottles placed (x2)", photo: true },
    { task: "Glasses clean on tray", photo: false },
    { task: "Door lock functioning", photo: false },
    { task: "Smell check - fresh and clean", photo: false },
    { task: "Remote controls present and working", photo: false },
  ],
};

// ─── Villa list ───
export const VILLAS = [
  { id: 1, name: "Villa 1", type: "Garden View" },
  { id: 2, name: "Villa 2", type: "Garden View" },
  { id: 3, name: "Villa 3", type: "Garden View" },
  { id: 4, name: "Villa 4", type: "Garden View" },
  { id: 5, name: "Villa 5", type: "Garden View" },
  { id: 6, name: "Villa 6", type: "Deluxe" },
  { id: 7, name: "Villa 7", type: "Deluxe" },
  { id: 8, name: "Villa 8", type: "Deluxe" },
  { id: 9, name: "Villa 9", type: "Deluxe" },
  { id: 10, name: "Villa 10", type: "ADA" },
];

// ─── Staff Bot Knowledge Base (for Claude context) ───
export const STAFF_BOT_KNOWLEDGE = `
# TVC Back-of-House Staff Knowledge Base

## COCKTAILS — Recetas Completas

### Margarita ($44,000 COP)
**Ingredientes:**
- 60ml Tequila (Olmeca)
- 30ml Triple Sec
- 30ml Jugo de limón fresco
- Sal para el borde
- Hielo

**Pasos:**
1. Pasar limón por el borde del vaso
2. Hundir en sal
3. En coctelera: tequila + triple sec + jugo de limón + hielo
4. Agitar 15 segundos
5. Servir colado

**Costo:** $11,400 COP | **Margen:** 74%

### Moscow Mule ($44,000 COP)
**Ingredientes:**
- 60ml Vodka (Absolut)
- 150ml Ginger Beer
- 15ml Jugo de limón fresco
- Hielo
- Rodaja de limón + menta para decorar

**Pasos:**
1. Llenar copper mug con hielo
2. Agregar vodka
3. Exprimir limón fresco
4. Completar con ginger beer
5. Decorar con rodaja de limón y menta

**Costo:** $10,500 COP | **Margen:** 76%

### Mojito ($44,000 COP)
**Ingredientes:**
- 60ml Ron blanco (Bacardi)
- 8 hojas de menta fresca
- 30ml Jugo de limón
- 15ml Jarabe de azúcar
- 100ml Agua con gas
- Hielo

**Pasos:**
1. En vaso alto, machacar menta con jarabe (suave, no destruir)
2. Agregar jugo de limón
3. Llenar con hielo
4. Agregar ron
5. Completar con agua con gas
6. Decorar con menta y limón

**Costo:** $8,000 COP | **Margen:** 82%

### Cuba Libre ($44,000 COP)
**Ingredientes:**
- 60ml Ron blanco (Bacardi)
- 200ml Coca-Cola
- 1 rodaja de limón
- Hielo

**Pasos:**
1. Vaso alto con hielo
2. Agregar ron
3. Completar con Coca-Cola
4. Exprimir y dejar rodaja de limón

**Costo:** $7,200 COP | **Margen:** 84%

### Gin & Tonic ($44,000 COP)
**Ingredientes:**
- 60ml Gin (Hendrick's)
- 150ml Agua tónica
- Pepino o limón para decorar
- Hielo

**Pasos:**
1. Vaso ancho con hielo
2. Agregar gin
3. Verter tónica suavemente
4. Decorar con pepino o limón

**Costo:** $13,500 COP | **Margen:** 69%

## HORARIOS OPERATIVOS

### Barco
- **→ TVC desde Cartagena:** 3:00 PM / 6:30 PM
- **→ Cartagena desde TVC:** 8:00 AM / 11:00 AM
- **Punto de encuentro:** Muelle Pegasus
- **Embarcaciones:** Pescadito (8 pax) / Colibri ONE (20 pax, eventos)

### Servicio
- **Check-in:** 3:00 PM
- **Check-out:** 11:00 AM
- **Desayuno:** 7:30 AM - 10:30 AM
- **Almuerzo:** 12:00 PM - 3:00 PM
- **Cena:** 6:30 PM - 10:00 PM
- **Bar:** 11:00 AM - 12:00 AM

### Staff
- **Turno mañana:** 6:00 AM - 2:00 PM
- **Turno tarde:** 2:00 PM - 10:00 PM
- **Guardia nocturna:** 10:00 PM - 6:00 AM

## PROTOCOLOS DE SEGURIDAD

### Emergencias
1. **Médica:** Llamar 123 + Akil (+57 316 055 1387)
2. **Incendio:** Evacuar a zona de piscina, usar extintor si es seguro
3. **Tormenta eléctrica:** Todos al interior, cerrar patios
4. **Huésped herido:** Botiquín en recepción, NO mover si es grave

### Alergias (CRÍTICO)
1. SIEMPRE preguntar al sentarse: "¿Alguna alergia alimentaria?"
2. Marcar pedido con 🔴 si hay alergia
3. Informar a cocina ANTES de preparar
4. Sustituciones comunes:
   - Gluten → arroz de coco, plátano, yuca
   - Lácteos → leche de coco
   - Mariscos → pollo o carne
   - Nueces → verificar salsas y postres
5. **Si no estás seguro → NO SERVIR → preguntar al chef**

## MENÚ SIN GLUTEN
✅ Vegan Buddha Bowl ($52K)
✅ Grilled Chicken Tropicale ($65K)
✅ Coconut Fish Fantasy ($75K)
✅ Patacones ($22K)
✅ Caribbean Lobster ($180K)
✅ Arroz con coco
✅ Ensaladas (verificar aderezo)

⚠️ EVITAR: Empanadas, sandwiches, hamburguesas (pan), wraps

## LIMPIEZA DE VILLA

### Checklist Completo
1. Recoger basura y sábanas usadas
2. Barrer y trapear todos los pisos
3. Baño completo (sanitario, ducha, espejos)
4. Hacer camas con sábanas nuevas
5. Colocar amenities:
   - Jabón x2
   - Shampoo
   - Papel higiénico x2 rollos
6. Toallas nuevas x4
7. Botellas de agua de bienvenida x2
8. Limpiar superficies y espejos
9. Verificar AC y ventilador
10. WiFi card visible en mesa

### Fotos Requeridas
📸 Cama hecha
📸 Baño limpio
📸 Amenities colocados
📸 Patio/exterior

## WIFI
- **Red:** TVC_Guest
- **Password:** En tarjeta de cada villa
- **Backup:** Router en oficina principal

## CONTACTOS IMPORTANTES
- **Akil (Manager):** +57 316 055 1387
- **Emergencias Colombia:** 123
- **Hospital más cercano:** Hospital Bocagrande
- **Electricista:** +57 XXX XXX XXXX
- **Plomero:** +57 XXX XXX XXXX

## EXCURSIONES Y SERVICIOS

### TVC Propios
- **Rosario Islands:** $350,000/persona - Full day island hopping
- **Sunset Bay Tour:** $200,000/persona - Atardecer en el Pescadito
- **Colibri ONE:** $450,000/persona - Yacht para grupos
- **Night Boat:** $150,000/persona - Regreso nocturno a Cartagena
- **Private Dinner:** $235,000/persona - 4 platos con el chef

### Partners (Comisión)
- **Moto rental:** $80,000 - 15% comisión
- **Lancheros:** $40,000 - 15% comisión
- **Van aeropuerto:** $120,000 - 10% comisión
`;
