"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type Language = "en" | "es";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined,
);

// All translations for the platform
const translations: Record<string, Record<Language, string>> = {
  // Navigation
  "nav.overview": { en: "Overview", es: "Resumen" },
  "nav.welcome_guide": { en: "Welcome Guide", es: "Guía de Bienvenida" },
  "nav.requirements": { en: "Requirements", es: "Requisitos" },
  "nav.fb_pl": { en: "F&B P&L", es: "P&L A&B" },
  "nav.revenue": { en: "Revenue", es: "Ingresos" },
  "nav.occupancy": { en: "Occupancy", es: "Ocupación" },
  "nav.staff_bot": { en: "Staff Bot", es: "Bot Staff" },
  "nav.booking_bot": { en: "Booking Bot", es: "Bot Reservas" },
  "nav.housekeeping": { en: "Housekeeping QC", es: "Control Limpieza" },
  "nav.maintenance": { en: "Maintenance QC", es: "Control Mantenimiento" },
  "nav.demo": { en: "Demo Guide", es: "Guía Demo" },
  "nav.property_map": { en: "Property Map", es: "Mapa Propiedad" },

  // Header
  "header.title": {
    en: "TVC Operations Intelligence",
    es: "TVC Inteligencia Operativa",
  },
  "header.subtitle": {
    en: "MACHINEMIND • v3.0 — FULL PLATFORM",
    es: "MACHINEMIND • v3.0 — PLATAFORMA COMPLETA",
  },
  "header.live": { en: "LIVE", es: "EN VIVO" },
  "header.modules": { en: "10 MODULES", es: "10 MÓDULOS" },

  // Common
  "common.pending": { en: "Pending", es: "Pendiente" },
  "common.approved": { en: "Approved", es: "Aprobado" },
  "common.rejected": { en: "Rejected", es: "Rechazado" },
  "common.today": { en: "Today", es: "Hoy" },
  "common.this_week": { en: "This Week", es: "Esta Semana" },
  "common.cancel": { en: "Cancel", es: "Cancelar" },
  "common.save": { en: "Save", es: "Guardar" },
  "common.delete": { en: "Delete", es: "Eliminar" },
  "common.edit": { en: "Edit", es: "Editar" },
  "common.add": { en: "Add", es: "Agregar" },
  "common.search": { en: "Search", es: "Buscar" },
  "common.filter": { en: "Filter", es: "Filtrar" },
  "common.all": { en: "All", es: "Todos" },
  "common.none": { en: "None", es: "Ninguno" },
  "common.yes": { en: "Yes", es: "Sí" },
  "common.no": { en: "No", es: "No" },
  "common.confirm": { en: "Confirm", es: "Confirmar" },
  "common.loading": { en: "Loading...", es: "Cargando..." },
  "common.error": { en: "Error", es: "Error" },
  "common.success": { en: "Success", es: "Éxito" },
  "common.minutes": { en: "minutes", es: "minutos" },
  "common.hours": { en: "hours", es: "horas" },
  "common.days": { en: "days", es: "días" },
  "common.staff": { en: "Staff", es: "Personal" },

  // Days of week
  "day.sunday": { en: "Sunday", es: "Domingo" },
  "day.monday": { en: "Monday", es: "Lunes" },
  "day.tuesday": { en: "Tuesday", es: "Martes" },
  "day.wednesday": { en: "Wednesday", es: "Miércoles" },
  "day.thursday": { en: "Thursday", es: "Jueves" },
  "day.friday": { en: "Friday", es: "Viernes" },
  "day.saturday": { en: "Saturday", es: "Sábado" },

  // Tabs
  "tab.week": { en: "Week", es: "Semana" },
  "tab.pending": { en: "Pending", es: "Pendientes" },
  "tab.history": { en: "History", es: "Historial" },
  "tab.inventory": { en: "Inventory", es: "Inventario" },
  "tab.critical": { en: "Critical", es: "Críticos" },

  // Housekeeping
  "hk.title": {
    en: "Housekeeping Quality Control",
    es: "Control de Calidad Limpieza",
  },
  "hk.subtitle": {
    en: "Quality control with weekly view and task management.",
    es: "Control de calidad con vista semanal y gestión de tareas.",
  },
  "hk.pending_qc": { en: "Pending QC", es: "Pendientes QC" },
  "hk.approved_today": { en: "Approved Today", es: "Aprobados Hoy" },
  "hk.rejected_today": { en: "Rejected Today", es: "Rechazados Hoy" },
  "hk.avg_quality": { en: "Avg. Quality", es: "Calidad Prom." },
  "hk.common_areas": { en: "Common Area Tasks", es: "Tareas de Áreas Comunes" },
  "hk.villa_status": { en: "Villa Status", es: "Estado de Villas" },
  "hk.execution_order": {
    en: "Execution order per PDF (Goal #2)",
    es: "Orden de ejecución según PDF (Goal #2)",
  },
  "hk.cleaning_types": { en: "Cleaning Types", es: "Tipos de Limpieza" },
  "hk.retouch": { en: "Retouch", es: "Retoque" },
  "hk.occupied": { en: "Occupied", es: "Ocupada" },
  "hk.arriving": { en: "Arriving", es: "Llegada" },
  "hk.leaving": { en: "Leaving", es: "Salida" },
  "hk.empty": { en: "Empty", es: "Vacía" },
  "hk.areas": { en: "Areas", es: "Áreas" },
  "hk.no_checklist": { en: "No checklist", es: "Sin checklist" },
  "hk.tasks": { en: "tasks", es: "tareas" },
  "hk.total": { en: "Total", es: "Total" },

  // Area names
  "area.breakfast": { en: "Breakfast Area", es: "Área de Desayuno" },
  "area.pool": { en: "Pool Area", es: "Área de Piscina" },
  "area.daybeds": { en: "Day Beds", es: "Day Beds" },
  "area.mirador": { en: "Mirador", es: "Mirador" },
  "area.lobby": { en: "Lobby", es: "Lobby" },
  "area.lobby_bathroom": { en: "Lobby Bathroom", es: "Baño del Lobby" },

  // Maintenance
  "mt.title": {
    en: "Maintenance Quality Control",
    es: "Control de Calidad Mantenimiento",
  },
  "mt.subtitle": {
    en: "Weekly maintenance tracking with pool monitoring and critical issues.",
    es: "Seguimiento semanal de mantenimiento con monitoreo de piscina y problemas críticos.",
  },
  "mt.pool_checks": { en: "Pool Checks", es: "Revisiones de Piscina" },
  "mt.daily_tasks": { en: "Daily Tasks", es: "Tareas Diarias" },
  "mt.critical_issues": { en: "Critical Issues", es: "Problemas Críticos" },
  "mt.chemicals": { en: "Pool Chemicals", es: "Químicos de Piscina" },
  "mt.chlorine": { en: "Chlorine", es: "Cloro" },
  "mt.ph": { en: "pH Level", es: "Nivel pH" },
  "mt.temperature": { en: "Temperature", es: "Temperatura" },

  // Inventory
  "inv.title": { en: "Inventory", es: "Inventario" },
  "inv.cleaning": { en: "Cleaning Inventory", es: "Inventario de Limpieza" },
  "inv.maintenance": {
    en: "Maintenance Inventory",
    es: "Inventario de Mantenimiento",
  },
  "inv.low_stock": { en: "Low Stock", es: "Bajo Mínimo" },
  "inv.items_low": { en: "items below minimum", es: "items bajo mínimo" },
  "inv.minimum": { en: "Minimum", es: "Mínimo" },
  "inv.current": { en: "Current", es: "Actual" },
  "inv.category.paper": { en: "Paper & Accessories", es: "Papel y Accesorios" },
  "inv.category.amenities": {
    en: "Villa Amenities",
    es: "Amenidades de Villa",
  },
  "inv.category.bathroom": {
    en: "Bathroom / Amenities",
    es: "Baño / Amenidades",
  },
  "inv.category.cleaning": {
    en: "Cleaning Products",
    es: "Productos de Limpieza",
  },
  "inv.category.laundry": { en: "Laundry", es: "Lavandería" },
  "inv.category.linens": { en: "Linens", es: "Blancos" },
  "inv.category.supplies": { en: "Supplies", es: "Suministros" },
  "inv.category.pool": { en: "Pool Supplies", es: "Suministros de Piscina" },
  "inv.category.hvac": { en: "HVAC", es: "HVAC" },
  "inv.category.electrical": { en: "Electrical", es: "Eléctrico" },
  "inv.category.plumbing": { en: "Plumbing", es: "Plomería" },
  "inv.category.general": { en: "General", es: "General" },

  // QC Actions
  "qc.approve": { en: "Approve", es: "Aprobar" },
  "qc.reject": { en: "Reject", es: "Rechazar" },
  "qc.quality_score": { en: "Quality Score", es: "Calificación de Calidad" },
  "qc.notes": { en: "QC Notes", es: "Notas del QC" },
  "qc.notes_optional": {
    en: "QC Notes (optional)",
    es: "Notas del QC (opcional)",
  },
  "qc.add_observations": {
    en: "Add quality control observations...",
    es: "Agregar observaciones de control de calidad...",
  },
  "qc.pending_approval": { en: "Pending Approval", es: "Pendiente Aprobación" },
  "qc.checklist_progress": {
    en: "Checklist progress",
    es: "Progreso del checklist",
  },
  "qc.staff_notes": { en: "Staff Notes", es: "Notas del Staff" },
  "qc.photo_required": { en: "Photo Required", es: "Foto Requerida" },
  "qc.view_photo": { en: "VIEW", es: "VER" },
  "qc.missing_photo": { en: "MISSING", es: "FALTA" },
  "qc.excellent": { en: "Excellent", es: "Excelente" },
  "qc.very_good": { en: "Very Good", es: "Muy Bueno" },
  "qc.acceptable": { en: "Acceptable", es: "Aceptable" },
  "qc.needs_improvement": { en: "Needs Improvement", es: "Necesita Mejora" },
  "qc.poor": { en: "Poor", es: "Deficiente" },

  // Reject modal
  "reject.title": { en: "Reject Checklist", es: "Rechazar Checklist" },
  "reject.description": {
    en: "Indicate the rejection reason. Staff will be notified and must complete the checklist again.",
    es: "Indica el motivo del rechazo. El staff recibirá esta notificación y deberá completar el checklist nuevamente.",
  },
  "reject.placeholder": {
    en: "Ex: Missing bathroom photo, bed not properly made...",
    es: "Ej: Falta foto del baño, cama no está bien tendida...",
  },
  "reject.confirm": { en: "Confirm Rejection", es: "Confirmar Rechazo" },

  // Work order modal
  "workorder.title": {
    en: "Create Maintenance Order",
    es: "Crear Orden de Mantenimiento",
  },
  "workorder.description": {
    en: "Describe the maintenance issue found.",
    es: "Describe el problema de mantenimiento encontrado.",
  },
  "workorder.placeholder": {
    en: "Ex: AC not cooling properly, bathroom leak...",
    es: "Ej: AC no enfría correctamente, gotera en el baño...",
  },
  "workorder.create": { en: "Create Order", es: "Crear Orden" },
  "workorder.priority": { en: "Priority", es: "Prioridad" },
  "workorder.priority.low": { en: "Low", es: "Baja" },
  "workorder.priority.normal": { en: "Normal", es: "Normal" },
  "workorder.priority.high": { en: "High", es: "Alta" },
  "workorder.priority.urgent": { en: "Urgent", es: "Urgente" },

  // Admin mode
  "admin.title": { en: "Admin Mode", es: "Modo Administrador" },
  "admin.enter_code": {
    en: "Enter code to edit tasks and inventory.",
    es: "Ingresa el código para editar tareas e inventario.",
  },
  "admin.access_code": { en: "Access code", es: "Código de acceso" },
  "admin.enter": { en: "Enter", es: "Entrar" },
  "admin.mode_active": { en: "Admin Mode", es: "Modo Admin" },

  // Add/Edit task modal
  "task.add_title": { en: "Add Task", es: "Agregar Tarea" },
  "task.edit_title": { en: "Edit Task", es: "Editar Tarea" },
  "task.name_es": { en: "Task (Spanish)", es: "Tarea (Español)" },
  "task.name_en": { en: "Task (English)", es: "Tarea (Inglés)" },
  "task.area": { en: "Area", es: "Área" },
  "task.time": { en: "Time (min)", es: "Tiempo (min)" },
  "task.requires_photo": { en: "Requires Photo", es: "Requiere Foto" },

  // Villa status
  "villa.occupied": { en: "Occupied", es: "Ocupada" },
  "villa.arriving_today": { en: "Arriving Today", es: "Llegada Hoy" },
  "villa.leaving_today": { en: "Leaving Today", es: "Salida Hoy" },
  "villa.empty": { en: "Empty", es: "Vacía" },

  // History table
  "history.type": { en: "Type", es: "Tipo" },
  "history.villa": { en: "Villa", es: "Villa" },
  "history.staff": { en: "Staff", es: "Staff" },
  "history.status": { en: "Status", es: "Estado" },
  "history.quality": { en: "Quality", es: "Calidad" },
  "history.date": { en: "Date", es: "Fecha" },
  "history.approved_by": { en: "Approved By", es: "Aprobado Por" },
  "history.no_data": {
    en: "No history for this filter",
    es: "No hay historial para este filtro",
  },

  // Empty states
  "empty.all_done": { en: "All caught up!", es: "¡Todo al día!" },
  "empty.no_pending_hk": {
    en: "No housekeeping checklists pending approval",
    es: "No hay checklists de housekeeping pendientes de aprobación",
  },
  "empty.no_pending_mt": {
    en: "No maintenance checklists pending approval",
    es: "No hay checklists de mantenimiento pendientes de aprobación",
  },
  "empty.select_checklist": {
    en: "← Select a checklist to review",
    es: "← Selecciona un checklist para revisar",
  },

  // Demo
  "demo.owner_title": {
    en: "Owner Demo Guide",
    es: "Guía Demo para Propietario",
  },
  "demo.staff_title": {
    en: "Staff Training Guide",
    es: "Guía de Entrenamiento para Staff",
  },
  "demo.start": { en: "Start Demo", es: "Iniciar Demo" },
  "demo.next": { en: "Next", es: "Siguiente" },
  "demo.previous": { en: "Previous", es: "Anterior" },
  "demo.finish": { en: "Finish", es: "Finalizar" },
  "demo.step": { en: "Step", es: "Paso" },
  "demo.of": { en: "of", es: "de" },

  // Footer
  "footer.powered_by": {
    en: "MachineMind AI Infrastructure — TVC Operations Intelligence v3.0",
    es: "MachineMind Infraestructura AI — TVC Inteligencia Operativa v3.0",
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tvc_language") as Language;
    if (saved && (saved === "en" || saved === "es")) {
      setLangState(saved);
    }
    setMounted(true);
  }, []);

  const setLang = (newLang: Language) => {
    setLangState(newLang);
    localStorage.setItem("tvc_language", newLang);
  };

  const t = (key: string): string => {
    const translation = translations[key];
    if (!translation) {
      console.warn(`Missing translation for key: ${key}`);
      return key;
    }
    return translation[lang] || translation.en || key;
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

// Default translation function for fallback
const defaultT = (key: string): string => {
  const translation = translations[key];
  if (!translation) return key;
  return translation.en || key;
};

// Default context value for SSR/static generation
const defaultContextValue: LanguageContextType = {
  lang: "en",
  setLang: () => {},
  t: defaultT,
};

export function useLanguage() {
  const context = useContext(LanguageContext);
  // Return default values during SSR/static generation instead of throwing
  if (context === undefined) {
    return defaultContextValue;
  }
  return context;
}

// Hook for getting translation function directly
export function useTranslation() {
  const { t, lang } = useLanguage();
  return { t, lang };
}
