// ═══════════════════════════════════════════════════════════════
// TVC I18N — Full Spanish/English Translation System
// Staff sees Spanish by default, managers can toggle English
// ═══════════════════════════════════════════════════════════════

export type Language = "es" | "en";

// All translations organized by category
export const translations = {
  // ─── Common Actions ───
  "action.submit": { es: "Enviar", en: "Submit" },
  "action.save": { es: "Guardar", en: "Save" },
  "action.cancel": { es: "Cancelar", en: "Cancel" },
  "action.delete": { es: "Eliminar", en: "Delete" },
  "action.edit": { es: "Editar", en: "Edit" },
  "action.add": { es: "Agregar", en: "Add" },
  "action.approve": { es: "Aprobar", en: "Approve" },
  "action.reject": { es: "Rechazar", en: "Reject" },
  "action.confirm": { es: "Confirmar", en: "Confirm" },
  "action.retry": { es: "Reintentar", en: "Retry" },
  "action.close": { es: "Cerrar", en: "Close" },
  "action.back": { es: "Volver", en: "Back" },
  "action.next": { es: "Siguiente", en: "Next" },
  "action.previous": { es: "Anterior", en: "Previous" },
  "action.search": { es: "Buscar", en: "Search" },
  "action.filter": { es: "Filtrar", en: "Filter" },
  "action.logout": { es: "Salir", en: "Logout" },
  "action.start": { es: "Comenzar", en: "Start" },
  "action.complete": { es: "Completar", en: "Complete" },
  "action.view": { es: "Ver", en: "View" },
  "action.upload": { es: "Subir", en: "Upload" },
  "action.download": { es: "Descargar", en: "Download" },

  // ─── Navigation ───
  "nav.tasks": { es: "Tareas", en: "Tasks" },
  "nav.checklist": { es: "Checklists", en: "Checklists" },
  "nav.inventory": { es: "Inventario", en: "Inventory" },
  "nav.bot": { es: "Asistente", en: "Assistant" },
  "nav.staff_portal": { es: "Portal del Personal", en: "Staff Portal" },

  // ─── Status ───
  "status.pending": { es: "Pendiente", en: "Pending" },
  "status.in_progress": { es: "En progreso", en: "In Progress" },
  "status.complete": { es: "Completado", en: "Complete" },
  "status.approved": { es: "Aprobado", en: "Approved" },
  "status.rejected": { es: "Rechazado", en: "Rejected" },
  "status.submitted": { es: "Enviado", en: "Submitted" },
  "status.active": { es: "Activo", en: "Active" },
  "status.inactive": { es: "Inactivo", en: "Inactive" },

  // ─── Tasks Page ───
  "tasks.title": { es: "Tareas de Hoy", en: "Today's Tasks" },
  "tasks.today": { es: "Hoy", en: "Today" },
  "tasks.checklists_today": {
    es: "Checklists de Hoy",
    en: "Today's Checklists",
  },
  "tasks.quick_actions": { es: "Acciones Rapidas", en: "Quick Actions" },
  "tasks.ask_bot": { es: "Preguntar al Bot", en: "Ask the Bot" },
  "tasks.recipes_sops": {
    es: "Recetas, SOPs, etc.",
    en: "Recipes, SOPs, etc.",
  },
  "tasks.count_stock": { es: "Contar stock", en: "Count stock" },
  "tasks.no_checklists": {
    es: "No hay checklists asignados hoy",
    en: "No checklists assigned today",
  },
  "tasks.guests": { es: "Huespedes", en: "Guests" },
  "tasks.check_ins": { es: "Llegadas", en: "Check-ins" },
  "tasks.check_outs": { es: "Salidas", en: "Check-outs" },

  // ─── Checklist Page ───
  "checklist.title": { es: "Checklists", en: "Checklists" },
  "checklist.select_type": {
    es: "Selecciona el tipo de checklist para comenzar",
    en: "Select the checklist type to start",
  },
  "checklist.select_villa": {
    es: "Selecciona la Villa",
    en: "Select the Villa",
  },
  "checklist.start": { es: "Comenzar Checklist", en: "Start Checklist" },
  "checklist.complete": { es: "Completar Checklist", en: "Complete Checklist" },
  "checklist.progress": { es: "Progreso", en: "Progress" },
  "checklist.tasks": { es: "Tareas", en: "Tasks" },
  "checklist.estimated_time": { es: "Tiempo estimado", en: "Estimated time" },
  "checklist.photo_required": { es: "Foto requerida", en: "Photo required" },
  "checklist.not_found": {
    es: "Checklist no encontrado",
    en: "Checklist not found",
  },
  "checklist.missing_tasks": {
    es: "tareas con foto requerida por completar",
    en: "tasks with required photo to complete",
  },
  "checklist.saving": { es: "Guardando...", en: "Saving..." },

  // ─── Inventory Page ───
  "inventory.title": { es: "Inventario", en: "Inventory" },
  "inventory.daily_count": {
    es: "Conteo diario de stock",
    en: "Daily stock count",
  },
  "inventory.save": { es: "Guardar", en: "Save" },
  "inventory.saving": { es: "Guardando...", en: "Saving..." },
  "inventory.saved_success": {
    es: "Inventario guardado exitosamente",
    en: "Inventory saved successfully",
  },
  "inventory.items": { es: "ingredientes", en: "ingredients" },
  "inventory.low_stock": { es: "bajo stock", en: "low stock" },
  "inventory.min": { es: "Min", en: "Min" },
  "inventory.all": { es: "Todos", en: "All" },
  "inventory.proteins": { es: "Proteinas", en: "Proteins" },
  "inventory.vegetables": { es: "Vegetales", en: "Vegetables" },
  "inventory.dairy": { es: "Lacteos", en: "Dairy" },
  "inventory.dry_goods": { es: "Secos", en: "Dry Goods" },
  "inventory.beverages": { es: "Bebidas", en: "Beverages" },
  "inventory.alcohol": { es: "Alcohol", en: "Alcohol" },
  "inventory.cleaning": { es: "Limpieza", en: "Cleaning" },

  // ─── Bot Page ───
  "bot.greeting": {
    es: "¡Hola! Soy el asistente de TVC. Puedo ayudarte con:",
    en: "Hello! I'm the TVC assistant. I can help you with:",
  },
  "bot.help_recipes": {
    es: "Recetas y preparacion de platos",
    en: "Recipes and dish preparation",
  },
  "bot.help_drinks": {
    es: "Como hacer bebidas y cocteles",
    en: "How to make drinks and cocktails",
  },
  "bot.help_cleaning": {
    es: "Procedimientos de limpieza",
    en: "Cleaning procedures",
  },
  "bot.help_emergency": {
    es: "Protocolos de emergencia",
    en: "Emergency protocols",
  },
  "bot.help_boat": { es: "Horarios de lancha", en: "Boat schedules" },
  "bot.help_other": {
    es: "Cualquier otra duda operativa",
    en: "Any other operational questions",
  },
  "bot.ask_question": {
    es: "¿En que puedo ayudarte?",
    en: "How can I help you?",
  },
  "bot.placeholder": {
    es: "Escribe tu pregunta...",
    en: "Type your question...",
  },
  "bot.error": {
    es: "Lo siento, hubo un error. Por favor intenta de nuevo.",
    en: "Sorry, there was an error. Please try again.",
  },
  "bot.connection_error": {
    es: "Error de conexion. Verifica tu internet e intenta de nuevo.",
    en: "Connection error. Check your internet and try again.",
  },
  "bot.quick_mojito": {
    es: "¿Como hago un mojito?",
    en: "How do I make a mojito?",
  },
  "bot.quick_ceviche": { es: "Receta del ceviche", en: "Ceviche recipe" },
  "bot.quick_boat": { es: "Horario de lancha", en: "Boat schedule" },
  "bot.quick_emergency": { es: "Emergencia medica", en: "Medical emergency" },

  // ─── Villa Status ───
  "villa.occupied": { es: "Ocupada", en: "Occupied" },
  "villa.vacant": { es: "Vacia", en: "Vacant" },
  "villa.arriving": { es: "Llegada Hoy", en: "Arriving" },
  "villa.cleaning": { es: "Limpieza", en: "Cleaning" },
  "villa.checkout": { es: "Salida Hoy", en: "Checkout" },
  "villa.maintenance": { es: "Mantenimiento", en: "Maintenance" },

  // ─── Cleaning Status ───
  "cleaning.pending": { es: "Pendiente", en: "Pending" },
  "cleaning.in_progress": { es: "En Proceso", en: "In Progress" },
  "cleaning.submitted": {
    es: "Enviada — Esperando Aprobacion",
    en: "Submitted — Awaiting Approval",
  },
  "cleaning.approved": { es: "Lista para Huesped", en: "Ready for Guest" },

  // ─── Departments ───
  "dept.housekeeping": { es: "Limpieza", en: "Housekeeping" },
  "dept.maintenance": { es: "Mantenimiento", en: "Maintenance" },
  "dept.kitchen": { es: "Cocina", en: "Kitchen" },
  "dept.bar": { es: "Bar", en: "Bar" },
  "dept.pool": { es: "Piscina", en: "Pool" },
  "dept.reception": { es: "Recepcion", en: "Reception" },

  // ─── Time ───
  "time.today": { es: "Hoy", en: "Today" },
  "time.yesterday": { es: "Ayer", en: "Yesterday" },
  "time.this_week": { es: "Esta Semana", en: "This Week" },
  "time.minutes": { es: "minutos", en: "minutes" },
  "time.min": { es: "min", en: "min" },
  "time.hours": { es: "horas", en: "hours" },
  "time.days": { es: "dias", en: "days" },

  // ─── Errors ───
  "error.generic": {
    es: "Ha ocurrido un error inesperado",
    en: "An unexpected error occurred",
  },
  "error.network": { es: "Error de conexion", en: "Connection error" },
  "error.not_found": { es: "No encontrado", en: "Not found" },
  "error.unauthorized": { es: "No autorizado", en: "Unauthorized" },
  "error.try_again": { es: "Intenta de nuevo", en: "Try again" },
  "error.reload": { es: "Recargar pagina", en: "Reload page" },
  "error.something_wrong": { es: "Algo salio mal", en: "Something went wrong" },
  "error.user_not_found": { es: "Usuario no encontrado", en: "User not found" },
  "error.please_login": { es: "Por favor inicia sesion", en: "Please log in" },
  "error.save_failed": {
    es: "Error al guardar. Intenta de nuevo.",
    en: "Save failed. Try again.",
  },

  // ─── Success Messages ───
  "success.saved": { es: "Guardado exitosamente", en: "Saved successfully" },
  "success.submitted": {
    es: "Enviado correctamente",
    en: "Submitted successfully",
  },
  "success.completed": { es: "Completado", en: "Completed" },

  // ─── Offline ───
  "offline.title": { es: "Sin Conexion", en: "Offline" },
  "offline.message": {
    es: "No hay conexion a internet. Tus datos guardados estan seguros.",
    en: "No internet connection. Your saved data is safe.",
  },
  "offline.queued": {
    es: "Guardado en cola. Se enviara cuando vuelvas a estar en linea.",
    en: "Queued. Will be sent when you're back online.",
  },

  // ─── Days of Week ───
  "day.sunday": { es: "Domingo", en: "Sunday" },
  "day.monday": { es: "Lunes", en: "Monday" },
  "day.tuesday": { es: "Martes", en: "Tuesday" },
  "day.wednesday": { es: "Miercoles", en: "Wednesday" },
  "day.thursday": { es: "Jueves", en: "Thursday" },
  "day.friday": { es: "Viernes", en: "Friday" },
  "day.saturday": { es: "Sabado", en: "Saturday" },

  // ─── Task Templates (Spanish by default) ───
  "task.villa_full_clean": {
    es: "Limpieza completa para huesped",
    en: "Full clean for guest",
  },
  "task.villa_deep_clean": {
    es: "Limpieza profunda despues de checkout",
    en: "Deep clean after checkout",
  },
  "task.breakfast_area": {
    es: "Limpiar area de desayuno",
    en: "Clean breakfast area",
  },
  "task.pool_cleaning": { es: "Limpieza de piscina", en: "Pool cleaning" },
  "task.reception_tidy": { es: "Ordenar recepcion", en: "Tidy reception" },
  "task.bathroom_restock": { es: "Reabastecer banos", en: "Restock bathrooms" },
  "task.trash_collection": { es: "Recoger basura", en: "Collect trash" },
  "task.linen_change": { es: "Cambio de sabanas", en: "Linen change" },
  "task.towel_restock": { es: "Reabastecer toallas", en: "Restock towels" },
  "task.amenities_check": { es: "Verificar amenidades", en: "Check amenities" },

  // ─── Login ───
  "login.title": { es: "Iniciar Sesion", en: "Login" },
  "login.email": { es: "Correo electronico", en: "Email" },
  "login.password": { es: "Contrasena", en: "Password" },
  "login.submit": { es: "Entrar", en: "Login" },
  "login.logging_in": { es: "Entrando...", en: "Logging in..." },

  // ─── Header ───
  "header.staff_portal": { es: "Portal del Personal", en: "Staff Portal" },
  "header.tiny_village": {
    es: "Tiny Village Cartagena",
    en: "Tiny Village Cartagena",
  },
} as const;

export type TranslationKey = keyof typeof translations;

// Get translation by key
export function t(key: TranslationKey, lang: Language = "es"): string {
  const translation = translations[key];
  if (!translation) {
    console.warn(`[i18n] Missing translation for key: ${key}`);
    return key;
  }
  return translation[lang] || translation.es || key;
}

// Get all translations for a language
export function getTranslations(lang: Language): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(translations)) {
    result[key] = value[lang] || value.es;
  }
  return result;
}

// Format task description in Spanish
export function formatTaskES(
  villaNumber: number,
  villaName: string,
  type: "full" | "deep" | "retouch",
): string {
  const types = {
    full: "Limpieza completa para huesped",
    deep: "Limpieza profunda despues de checkout",
    retouch: "Retoque rapido",
  };
  return `🧹 Villa ${villaNumber} (${villaName}) — ${types[type]}`;
}

// Format maintenance task in Spanish
export function formatMaintenanceES(
  villaNumber: number,
  villaName: string,
  notes: string,
): string {
  return `🔧 Villa ${villaNumber} (${villaName}) — ${notes || "Mantenimiento requerido"}`;
}
