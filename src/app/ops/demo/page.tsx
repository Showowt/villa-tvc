"use client";

import { useState } from "react";
import Link from "next/link";
import { useLanguage } from "@/lib/i18n/context";

interface DemoStep {
  id: number;
  title: { en: string; es: string };
  description: { en: string; es: string };
  features: { en: string[]; es: string[] };
  link?: string;
  tips?: { en: string[]; es: string[] };
  icon: string;
  category: "overview" | "qc" | "revenue" | "ai" | "staff";
}

const OWNER_DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: { en: "Platform Overview", es: "Resumen de la Plataforma" },
    description: {
      en: "Welcome to TVC Operations Intelligence - your AI-powered hotel management system. This platform centralizes all operations, quality control, revenue tracking, and staff management in one place.",
      es: "Bienvenido a TVC Inteligencia Operativa - tu sistema de gestión hotelera impulsado por IA. Esta plataforma centraliza todas las operaciones, control de calidad, seguimiento de ingresos y gestión del personal en un solo lugar.",
    },
    features: {
      en: [
        "10 integrated modules for complete hotel management",
        "Real-time data sync with Supabase cloud database",
        "AI-powered chatbots for staff and guest assistance",
        "Quality control workflows with photo verification",
        "Revenue tracking and F&B profit/loss analysis",
      ],
      es: [
        "10 módulos integrados para gestión hotelera completa",
        "Sincronización de datos en tiempo real con base de datos Supabase",
        "Chatbots con IA para asistencia a personal y huéspedes",
        "Flujos de control de calidad con verificación fotográfica",
        "Seguimiento de ingresos y análisis de pérdidas/ganancias A&B",
      ],
    },
    tips: {
      en: [
        "Use the language toggle (🇺🇸/🇨🇴) in the header to switch between English and Spanish",
        "The navigation bar shows all available modules - click any to explore",
      ],
      es: [
        "Usa el selector de idioma (🇺🇸/🇨🇴) en el encabezado para cambiar entre inglés y español",
        "La barra de navegación muestra todos los módulos disponibles - haz clic en cualquiera para explorar",
      ],
    },
    link: "/ops",
    icon: "📊",
    category: "overview",
  },
  {
    id: 2,
    title: {
      en: "Housekeeping Quality Control",
      es: "Control de Calidad de Limpieza",
    },
    description: {
      en: "The Housekeeping QC module lets you monitor, approve, and manage all cleaning tasks across the property. Staff complete checklists with photos, and you review/approve them here.",
      es: "El módulo de Control de Calidad de Limpieza te permite monitorear, aprobar y gestionar todas las tareas de limpieza en la propiedad. El personal completa checklists con fotos, y tú los revisas/apruebas aquí.",
    },
    features: {
      en: [
        "📅 WEEK VIEW: See the entire week at a glance - which days have completed checklists, which are pending",
        "⏳ PENDING TAB: Review checklists waiting for QC approval with photo verification",
        "✅ HISTORY TAB: See all approved/rejected checklists with quality scores",
        "📦 INVENTORY TAB: Track cleaning supplies with minimum stock alerts",
        "🔐 ADMIN MODE (code: 2027): Add/edit/delete custom tasks and update inventory",
      ],
      es: [
        "📅 VISTA SEMANAL: Ve toda la semana de un vistazo - qué días tienen checklists completados, cuáles están pendientes",
        "⏳ PESTAÑA PENDIENTES: Revisa checklists esperando aprobación QC con verificación fotográfica",
        "✅ PESTAÑA HISTORIAL: Ve todos los checklists aprobados/rechazados con calificaciones de calidad",
        "📦 PESTAÑA INVENTARIO: Rastrea suministros de limpieza con alertas de stock mínimo",
        "🔐 MODO ADMIN (código: 2027): Agregar/editar/eliminar tareas personalizadas y actualizar inventario",
      ],
    },
    tips: {
      en: [
        "Click on any day in the week view to see that day's villa status",
        "The 23 common area tasks are in execution order (Breakfast → Pool → Day Beds → Mirador → Lobby → Bathroom)",
        "Villa cleaning types: Retouch (15min), Occupied (30min), Arriving (45min), Leaving (35min)",
        "Stars (★) indicate quality score - tap to rate before approving",
      ],
      es: [
        "Haz clic en cualquier día de la vista semanal para ver el estado de las villas de ese día",
        "Las 23 tareas de áreas comunes están en orden de ejecución (Desayuno → Piscina → Day Beds → Mirador → Lobby → Baño)",
        "Tipos de limpieza de villa: Retoque (15min), Ocupada (30min), Llegada (45min), Salida (35min)",
        "Las estrellas (★) indican calificación de calidad - toca para calificar antes de aprobar",
      ],
    },
    link: "/ops/housekeeping",
    icon: "🧹",
    category: "qc",
  },
  {
    id: 3,
    title: {
      en: "Maintenance Quality Control",
      es: "Control de Calidad de Mantenimiento",
    },
    description: {
      en: "The Maintenance QC module tracks all maintenance tasks, pool chemical readings, and critical issues. Each day has specific tasks, and pool readings are required 3x daily.",
      es: "El módulo de Control de Calidad de Mantenimiento rastrea todas las tareas de mantenimiento, lecturas de químicos de piscina y problemas críticos. Cada día tiene tareas específicas, y las lecturas de piscina son requeridas 3 veces al día.",
    },
    features: {
      en: [
        "📅 WEEK VIEW: See maintenance completion status for each day of the week",
        "🏊 POOL CHECKS: Track 3x daily readings (8am, 2pm, 8pm) for chlorine, pH, and temperature",
        "⏳ PENDING TAB: Review maintenance checklists waiting for approval",
        "⚠️ CRITICAL TAB: Priority issues sorted by occupied villas first",
        "📦 INVENTORY TAB: Track maintenance supplies (chlorine, filters, light bulbs, etc.)",
        "🔐 ADMIN MODE (code: 2027): Add/edit tasks for any day of the week",
      ],
      es: [
        "📅 VISTA SEMANAL: Ve el estado de completación de mantenimiento para cada día de la semana",
        "🏊 REVISIONES DE PISCINA: Rastrea lecturas 3 veces al día (8am, 2pm, 8pm) para cloro, pH y temperatura",
        "⏳ PESTAÑA PENDIENTES: Revisa checklists de mantenimiento esperando aprobación",
        "⚠️ PESTAÑA CRÍTICOS: Problemas prioritarios ordenados por villas ocupadas primero",
        "📦 PESTAÑA INVENTARIO: Rastrea suministros de mantenimiento (cloro, filtros, bombillos, etc.)",
        "🔐 MODO ADMIN (código: 2027): Agregar/editar tareas para cualquier día de la semana",
      ],
    },
    tips: {
      en: [
        "Pool chemical ranges: Chlorine 1.0-3.0 ppm, pH 7.2-7.6, Temp 25-30°C",
        "Critical issues affecting occupied villas appear with red badges",
        "Each day has different maintenance tasks (e.g., Monday: A/C filters, Tuesday: Solar panels, etc.)",
        "You can create a maintenance work order directly from a housekeeping QC if issues are found",
      ],
      es: [
        "Rangos de químicos de piscina: Cloro 1.0-3.0 ppm, pH 7.2-7.6, Temp 25-30°C",
        "Los problemas críticos que afectan villas ocupadas aparecen con insignias rojas",
        "Cada día tiene diferentes tareas de mantenimiento (ej: Lunes: filtros A/C, Martes: paneles solares, etc.)",
        "Puedes crear una orden de mantenimiento directamente desde un QC de limpieza si se encuentran problemas",
      ],
    },
    link: "/ops/maintenance",
    icon: "🔧",
    category: "qc",
  },
  {
    id: 4,
    title: { en: "Occupancy Dashboard", es: "Dashboard de Ocupación" },
    description: {
      en: "View current and upcoming occupancy, check-ins, check-outs, and which villas are occupied. This data drives the housekeeping and maintenance priorities.",
      es: "Ve la ocupación actual y próxima, check-ins, check-outs y qué villas están ocupadas. Estos datos impulsan las prioridades de limpieza y mantenimiento.",
    },
    features: {
      en: [
        "Real-time villa occupancy status",
        "Today's check-ins and check-outs",
        "Weekly occupancy calendar view",
        "Guest count and villa details",
        "Integration with Cloudbeds PMS",
      ],
      es: [
        "Estado de ocupación de villas en tiempo real",
        "Check-ins y check-outs de hoy",
        "Vista de calendario de ocupación semanal",
        "Conteo de huéspedes y detalles de villas",
        "Integración con Cloudbeds PMS",
      ],
    },
    link: "/ops/occupancy",
    icon: "📅",
    category: "overview",
  },
  {
    id: 5,
    title: { en: "F&B Profit & Loss", es: "Pérdidas y Ganancias A&B" },
    description: {
      en: "Track food and beverage costs, revenue, and profit margins. See which dishes are most profitable and identify opportunities to optimize the menu.",
      es: "Rastrea costos de alimentos y bebidas, ingresos y márgenes de ganancia. Ve qué platos son más rentables e identifica oportunidades para optimizar el menú.",
    },
    features: {
      en: [
        "Cost per dish breakdown",
        "Revenue per menu item",
        "Profit margin analysis",
        "Ingredient cost tracking",
        "Menu optimization suggestions",
      ],
      es: [
        "Desglose de costo por plato",
        "Ingresos por ítem del menú",
        "Análisis de margen de ganancia",
        "Seguimiento de costo de ingredientes",
        "Sugerencias de optimización del menú",
      ],
    },
    link: "/ops/fb-pl",
    icon: "💰",
    category: "revenue",
  },
  {
    id: 6,
    title: { en: "Revenue Dashboard", es: "Dashboard de Ingresos" },
    description: {
      en: "Track all revenue streams including room bookings, F&B, activities, and services. See trends, compare periods, and identify growth opportunities.",
      es: "Rastrea todas las fuentes de ingresos incluyendo reservas de habitaciones, A&B, actividades y servicios. Ve tendencias, compara períodos e identifica oportunidades de crecimiento.",
    },
    features: {
      en: [
        "Total revenue by category",
        "Daily/weekly/monthly trends",
        "Revenue per guest metrics",
        "Service upsell tracking",
        "Comparison with previous periods",
      ],
      es: [
        "Ingresos totales por categoría",
        "Tendencias diarias/semanales/mensuales",
        "Métricas de ingresos por huésped",
        "Seguimiento de upsell de servicios",
        "Comparación con períodos anteriores",
      ],
    },
    link: "/ops/revenue",
    icon: "🚀",
    category: "revenue",
  },
  {
    id: 7,
    title: {
      en: "Staff Bot (AI Assistant)",
      es: "Bot de Staff (Asistente IA)",
    },
    description: {
      en: "The AI-powered Staff Bot helps your team find answers instantly. Staff can ask questions about SOPs, procedures, and policies in natural language.",
      es: "El Bot de Staff impulsado por IA ayuda a tu equipo a encontrar respuestas instantáneamente. El personal puede hacer preguntas sobre SOPs, procedimientos y políticas en lenguaje natural.",
    },
    features: {
      en: [
        "Natural language Q&A in Spanish and English",
        "SOP and procedure lookup",
        "Task guidance and checklists",
        "Escalation to management when needed",
        "24/7 availability for staff questions",
      ],
      es: [
        "Preguntas y respuestas en lenguaje natural en español e inglés",
        "Búsqueda de SOPs y procedimientos",
        "Guía de tareas y checklists",
        "Escalación a gerencia cuando sea necesario",
        "Disponibilidad 24/7 para preguntas del personal",
      ],
    },
    link: "/ops/staff-bot",
    icon: "🤖",
    category: "ai",
  },
  {
    id: 8,
    title: {
      en: "Booking Bot (Guest AI)",
      es: "Bot de Reservas (IA para Huéspedes)",
    },
    description: {
      en: "The Booking Bot handles guest inquiries via WhatsApp. It can answer questions, provide information, and assist with bookings 24/7.",
      es: "El Bot de Reservas maneja consultas de huéspedes vía WhatsApp. Puede responder preguntas, proporcionar información y asistir con reservas 24/7.",
    },
    features: {
      en: [
        "WhatsApp integration for guest messaging",
        "Automated responses in Spanish and English",
        "Booking inquiries and availability",
        "Activity and service recommendations",
        "Smart escalation to human staff",
      ],
      es: [
        "Integración con WhatsApp para mensajes de huéspedes",
        "Respuestas automatizadas en español e inglés",
        "Consultas de reservas y disponibilidad",
        "Recomendaciones de actividades y servicios",
        "Escalación inteligente a personal humano",
      ],
    },
    link: "/ops/booking-bot",
    icon: "🤝",
    category: "ai",
  },
  {
    id: 9,
    title: {
      en: "Welcome Guide Generator",
      es: "Generador de Guía de Bienvenida",
    },
    description: {
      en: "Generate personalized welcome guides for arriving guests. Include villa-specific information, activities, dining options, and local recommendations.",
      es: "Genera guías de bienvenida personalizadas para huéspedes que llegan. Incluye información específica de la villa, actividades, opciones de comida y recomendaciones locales.",
    },
    features: {
      en: [
        "AI-generated personalized content",
        "Villa-specific instructions",
        "Activity and tour suggestions",
        "Dining and bar information",
        "Local area recommendations",
      ],
      es: [
        "Contenido personalizado generado por IA",
        "Instrucciones específicas de la villa",
        "Sugerencias de actividades y tours",
        "Información de comedor y bar",
        "Recomendaciones del área local",
      ],
    },
    link: "/ops/welcome-guide",
    icon: "📄",
    category: "ai",
  },
  {
    id: 10,
    title: { en: "Requirements Tracker", es: "Rastreador de Requisitos" },
    description: {
      en: "Track all pending requirements, projects, and improvements. Keep a prioritized list of what needs to be done across all departments.",
      es: "Rastrea todos los requisitos, proyectos y mejoras pendientes. Mantén una lista priorizada de lo que necesita hacerse en todos los departamentos.",
    },
    features: {
      en: [
        "Department-wise requirement tracking",
        "Priority levels (urgent, high, normal, low)",
        "Progress status updates",
        "Deadline management",
        "Team assignment",
      ],
      es: [
        "Seguimiento de requisitos por departamento",
        "Niveles de prioridad (urgente, alta, normal, baja)",
        "Actualizaciones de estado de progreso",
        "Gestión de fechas límite",
        "Asignación de equipo",
      ],
    },
    link: "/ops/requirements",
    icon: "📋",
    category: "overview",
  },
];

const STAFF_DEMO_STEPS: DemoStep[] = [
  {
    id: 1,
    title: { en: "Staff Login", es: "Inicio de Sesión del Personal" },
    description: {
      en: "Staff members log in using their assigned credentials. Each staff member has a unique login that tracks their completed checklists.",
      es: "Los miembros del personal inician sesión usando sus credenciales asignadas. Cada miembro del personal tiene un login único que rastrea sus checklists completados.",
    },
    features: {
      en: [
        "Secure PIN or password login",
        "Role-based access (housekeeping, maintenance, F&B)",
        "Personal task dashboard",
        "Checklist history per staff member",
      ],
      es: [
        "Inicio de sesión seguro con PIN o contraseña",
        "Acceso basado en roles (limpieza, mantenimiento, A&B)",
        "Dashboard de tareas personal",
        "Historial de checklists por miembro del personal",
      ],
    },
    link: "/staff/login",
    icon: "🔐",
    category: "staff",
  },
  {
    id: 2,
    title: { en: "Daily Checklists", es: "Checklists Diarios" },
    description: {
      en: "Staff complete their assigned checklists by checking off tasks and uploading required photos. Each checklist is specific to their role and the day's needs.",
      es: "El personal completa sus checklists asignados marcando tareas y subiendo fotos requeridas. Cada checklist es específico para su rol y las necesidades del día.",
    },
    features: {
      en: [
        "Step-by-step task completion",
        "Photo upload for required items (tap 📸 to take photo)",
        "Notes field for observations",
        "Timer showing completion time",
        "Submit for QC approval when done",
      ],
      es: [
        "Completación de tareas paso a paso",
        "Subida de fotos para ítems requeridos (toca 📸 para tomar foto)",
        "Campo de notas para observaciones",
        "Temporizador mostrando tiempo de completación",
        "Enviar para aprobación QC cuando termine",
      ],
    },
    tips: {
      en: [
        "Complete tasks in order - they're organized for efficiency",
        "Take clear, well-lit photos for verification",
        "Add notes if you find any issues that need attention",
        "Don't forget to submit when all tasks are complete!",
      ],
      es: [
        "Completa las tareas en orden - están organizadas para eficiencia",
        "Toma fotos claras y bien iluminadas para verificación",
        "Agrega notas si encuentras problemas que necesitan atención",
        "¡No olvides enviar cuando todas las tareas estén completas!",
      ],
    },
    link: "/staff/checklist",
    icon: "✅",
    category: "staff",
  },
  {
    id: 3,
    title: { en: "Inventory Reporting", es: "Reporte de Inventario" },
    description: {
      en: "Staff report inventory levels when completing tasks. If supplies are running low, mark them in the inventory section so management can reorder.",
      es: "El personal reporta niveles de inventario al completar tareas. Si los suministros están bajos, márcalos en la sección de inventario para que gerencia pueda reordenar.",
    },
    features: {
      en: [
        "Quick stock level updates",
        "Low stock alerts auto-generated",
        "Category-based inventory (cleaning, bathroom, linens)",
        "Easy quantity adjustment",
      ],
      es: [
        "Actualizaciones rápidas de nivel de stock",
        "Alertas de bajo stock auto-generadas",
        "Inventario basado en categorías (limpieza, baño, blancos)",
        "Ajuste fácil de cantidades",
      ],
    },
    link: "/staff/inventory",
    icon: "📦",
    category: "staff",
  },
  {
    id: 4,
    title: { en: "Staff AI Assistant", es: "Asistente IA para Staff" },
    description: {
      en: "The Staff Bot is available 24/7 to answer questions. Ask about procedures, SOPs, or any hotel policy in natural language.",
      es: "El Bot de Staff está disponible 24/7 para responder preguntas. Pregunta sobre procedimientos, SOPs o cualquier política del hotel en lenguaje natural.",
    },
    features: {
      en: [
        "Ask questions in Spanish or English",
        "Get instant answers about procedures",
        "Find SOPs and policies quickly",
        "Request help from management if needed",
      ],
      es: [
        "Haz preguntas en español o inglés",
        "Obtén respuestas instantáneas sobre procedimientos",
        "Encuentra SOPs y políticas rápidamente",
        "Solicita ayuda de gerencia si es necesario",
      ],
    },
    tips: {
      en: [
        "Be specific in your questions for better answers",
        "You can ask about any hotel procedure or policy",
        "The bot learns and improves over time",
      ],
      es: [
        "Sé específico en tus preguntas para mejores respuestas",
        "Puedes preguntar sobre cualquier procedimiento o política del hotel",
        "El bot aprende y mejora con el tiempo",
      ],
    },
    link: "/staff/bot",
    icon: "🤖",
    category: "staff",
  },
  {
    id: 5,
    title: { en: "Daily Tasks View", es: "Vista de Tareas Diarias" },
    description: {
      en: "See all your assigned tasks for today at a glance. Tasks are organized by priority and area, making it easy to plan your workday.",
      es: "Ve todas tus tareas asignadas para hoy de un vistazo. Las tareas están organizadas por prioridad y área, facilitando la planificación de tu día de trabajo.",
    },
    features: {
      en: [
        "Today's task list by priority",
        "Area-based task grouping",
        "Completion status tracking",
        "Quick access to start checklists",
      ],
      es: [
        "Lista de tareas de hoy por prioridad",
        "Agrupación de tareas por área",
        "Seguimiento de estado de completación",
        "Acceso rápido para iniciar checklists",
      ],
    },
    link: "/staff/tasks",
    icon: "📋",
    category: "staff",
  },
];

export default function DemoPage() {
  const { lang } = useLanguage();
  const [activeDemo, setActiveDemo] = useState<"owner" | "staff">("owner");
  const [currentStep, setCurrentStep] = useState(0);

  const steps = activeDemo === "owner" ? OWNER_DEMO_STEPS : STAFF_DEMO_STEPS;
  const step = steps[currentStep];

  const categoryColors = {
    overview: "bg-blue-500",
    qc: "bg-emerald-500",
    revenue: "bg-amber-500",
    ai: "bg-purple-500",
    staff: "bg-pink-500",
  };

  const categoryLabels = {
    overview: { en: "Overview", es: "Resumen" },
    qc: { en: "Quality Control", es: "Control de Calidad" },
    revenue: { en: "Revenue", es: "Ingresos" },
    ai: { en: "AI Features", es: "Funciones IA" },
    staff: { en: "Staff Tools", es: "Herramientas Staff" },
  };

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold flex items-center gap-2">
          🎓{" "}
          {lang === "en"
            ? "Demo & Training Guide"
            : "Guía de Demo y Entrenamiento"}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          {lang === "en"
            ? "Complete walkthrough of all platform features. Use language toggle (🇺🇸/🇨🇴) in header to switch languages."
            : "Recorrido completo de todas las funciones de la plataforma. Usa el selector de idioma (🇺🇸/🇨🇴) en el encabezado para cambiar idiomas."}
        </p>
      </div>

      {/* Demo Type Selector */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => {
            setActiveDemo("owner");
            setCurrentStep(0);
          }}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
            activeDemo === "owner"
              ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg"
              : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          👔 {lang === "en" ? "Owner Demo" : "Demo Propietario"}
          <div className="text-xs font-normal opacity-80 mt-1">
            {lang === "en"
              ? "10 modules • Full platform overview"
              : "10 módulos • Resumen completo de plataforma"}
          </div>
        </button>
        <button
          onClick={() => {
            setActiveDemo("staff");
            setCurrentStep(0);
          }}
          className={`flex-1 py-4 rounded-xl font-bold text-lg transition-all ${
            activeDemo === "staff"
              ? "bg-gradient-to-r from-pink-500 to-orange-500 text-white shadow-lg"
              : "bg-white border-2 border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          👷 {lang === "en" ? "Staff Training" : "Entrenamiento Staff"}
          <div className="text-xs font-normal opacity-80 mt-1">
            {lang === "en"
              ? "5 tools • Daily workflow training"
              : "5 herramientas • Entrenamiento de flujo diario"}
          </div>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-bold text-slate-700">
            {lang === "en" ? "Progress" : "Progreso"}: {currentStep + 1} /{" "}
            {steps.length}
          </span>
          <span className="text-xs text-slate-500">
            {Math.round(((currentStep + 1) / steps.length) * 100)}%{" "}
            {lang === "en" ? "complete" : "completado"}
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${activeDemo === "owner" ? "bg-blue-500" : "bg-pink-500"}`}
            style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
          />
        </div>
        {/* Step indicators */}
        <div className="flex gap-1 mt-3">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`flex-1 h-2 rounded-full transition-all ${
                idx === currentStep
                  ? activeDemo === "owner"
                    ? "bg-blue-500"
                    : "bg-pink-500"
                  : idx < currentStep
                    ? "bg-emerald-400"
                    : "bg-slate-200"
              }`}
              title={s.title[lang]}
            />
          ))}
        </div>
      </div>

      {/* Current Step Content */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
        {/* Step Header */}
        <div
          className={`px-6 py-4 ${categoryColors[step.category]} text-white`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{step.icon}</span>
              <div>
                <div className="text-xs font-medium opacity-80">
                  {lang === "en" ? "Step" : "Paso"} {currentStep + 1} •{" "}
                  {categoryLabels[step.category][lang]}
                </div>
                <h2 className="text-xl font-bold">{step.title[lang]}</h2>
              </div>
            </div>
            {step.link && (
              <Link
                href={step.link}
                className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-bold transition-all"
              >
                {lang === "en" ? "Open Module →" : "Abrir Módulo →"}
              </Link>
            )}
          </div>
        </div>

        {/* Step Body */}
        <div className="p-6">
          {/* Description */}
          <p className="text-slate-700 text-base leading-relaxed mb-6">
            {step.description[lang]}
          </p>

          {/* Features */}
          <div className="mb-6">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
              ✨ {lang === "en" ? "Key Features" : "Características Clave"}
            </h3>
            <div className="space-y-2">
              {step.features[lang].map((feature, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg"
                >
                  <span className="text-emerald-500 font-bold">✓</span>
                  <span className="text-sm text-slate-700">{feature}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tips */}
          {step.tips && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2">
                💡 {lang === "en" ? "Pro Tips" : "Consejos Pro"}
              </h3>
              <ul className="space-y-1">
                {step.tips[lang].map((tip, idx) => (
                  <li
                    key={idx}
                    className="text-sm text-amber-700 flex items-start gap-2"
                  >
                    <span>•</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-200 transition-all"
        >
          ← {lang === "en" ? "Previous" : "Anterior"}
        </button>

        <div className="text-sm text-slate-500">
          {currentStep + 1} {lang === "en" ? "of" : "de"} {steps.length}
        </div>

        <button
          onClick={() =>
            setCurrentStep(Math.min(steps.length - 1, currentStep + 1))
          }
          disabled={currentStep === steps.length - 1}
          className={`px-6 py-3 rounded-xl font-bold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
            currentStep === steps.length - 1
              ? "bg-emerald-500 text-white"
              : activeDemo === "owner"
                ? "bg-blue-500 text-white hover:bg-blue-600"
                : "bg-pink-500 text-white hover:bg-pink-600"
          }`}
        >
          {currentStep === steps.length - 1
            ? lang === "en"
              ? "✓ Complete!"
              : "✓ ¡Completo!"
            : lang === "en"
              ? "Next →"
              : "Siguiente →"}
        </button>
      </div>

      {/* Quick Access Grid */}
      <div className="mt-8">
        <h3 className="text-sm font-bold text-slate-700 mb-3">
          {lang === "en"
            ? "Quick Access to All Modules"
            : "Acceso Rápido a Todos los Módulos"}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {steps.map((s, idx) => (
            <button
              key={s.id}
              onClick={() => setCurrentStep(idx)}
              className={`p-3 rounded-lg border text-left transition-all ${
                idx === currentStep
                  ? "bg-[#0A0A0F] text-white border-[#0A0A0F]"
                  : "bg-white border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="text-lg mb-1">{s.icon}</div>
              <div
                className={`text-xs font-bold ${idx === currentStep ? "text-white" : "text-slate-700"}`}
              >
                {s.title[lang].length > 20
                  ? s.title[lang].slice(0, 18) + "..."
                  : s.title[lang]}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
