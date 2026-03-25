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
  // ─── Staff Portal Navigation ───
  "staff.portal": { es: "Portal del Personal", en: "Staff Portal" },
  "staff.tasks": { es: "Tareas", en: "Tasks" },
  "staff.pos": { es: "POS", en: "POS" },
  "staff.checks": { es: "Checks", en: "Checks" },
  "staff.linens": { es: "Blancos", en: "Linens" },
  "staff.training": { es: "Capacitar", en: "Training" },
  "staff.logout": { es: "Salir", en: "Logout" },
  "staff.waste": { es: "Merma", en: "Waste" },
  "staff.closing": { es: "Cierre", en: "Closing" },
  "staff.offline_banner": {
    es: "Sin conexion — Los cambios se guardaran automaticamente",
    en: "Offline — Changes will be saved automatically",
  },

  // ─── Tasks Page ───
  "tasks.today": { es: "Hoy", en: "Today" },
  "tasks.guests": { es: "Huespedes", en: "Guests" },
  "tasks.check_ins": { es: "Llegadas", en: "Check-ins" },
  "tasks.check_outs": { es: "Salidas", en: "Check-outs" },
  "tasks.checklists_today": {
    es: "Checklists de Hoy",
    en: "Today's Checklists",
  },
  "tasks.no_checklists": {
    es: "No hay checklists asignados hoy",
    en: "No checklists assigned today",
  },
  "tasks.quick_actions": { es: "Acciones Rapidas", en: "Quick Actions" },
  "tasks.ask_bot": { es: "Preguntar al Bot", en: "Ask the Bot" },
  "tasks.recipes_sops": {
    es: "Recetas, SOPs, etc.",
    en: "Recipes, SOPs, etc.",
  },
  "tasks.inventory": { es: "Inventario", en: "Inventory" },
  "tasks.count_stock": { es: "Contar stock", en: "Count stock" },

  // ─── Checklist Page ───
  "checklist.title": { es: "Checklists", en: "Checklists" },
  "checklist.select_type": {
    es: "Selecciona el tipo de checklist para comenzar",
    en: "Select the checklist type to start",
  },
  "checklist.estimated_time": { es: "min", en: "min" },

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
  "inventory.ingredients": { es: "ingredientes", en: "ingredients" },
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
    es: "Hola! Soy el asistente de TVC. Puedo ayudarte con:",
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
    es: "Como hago un mojito?",
    en: "How do I make a mojito?",
  },
  "bot.quick_ceviche": { es: "Receta del ceviche", en: "Ceviche recipe" },
  "bot.quick_boat": { es: "Horario de lancha", en: "Boat schedule" },
  "bot.quick_emergency": { es: "Emergencia medica", en: "Medical emergency" },

  // ─── Status Labels ───
  "status.pending": { es: "Pendiente", en: "Pending" },
  "status.in_progress": { es: "En progreso", en: "In Progress" },
  "status.complete": { es: "Completado", en: "Complete" },
  "status.approved": { es: "Aprobado", en: "Approved" },
  "status.rejected": { es: "Rechazado", en: "Rejected" },

  // ─── Departments ───
  "dept.housekeeping": { es: "Limpieza", en: "Housekeeping" },
  "dept.maintenance": { es: "Mantenimiento", en: "Maintenance" },
  "dept.kitchen": { es: "Cocina", en: "Kitchen" },
  "dept.pool": { es: "Piscina", en: "Pool" },

  // ─── Errors ───
  "error.login_required": {
    es: "Por favor inicia sesion",
    en: "Please log in",
  },
  "error.user_not_found": { es: "Usuario no encontrado", en: "User not found" },
  "error.save_failed": {
    es: "Error al guardar. Intenta de nuevo.",
    en: "Save failed. Try again.",
  },

  // ─── Property Map ───
  "map.guests": { es: "Huespedes", en: "Guests" },
  "map.occupied": { es: "Ocupadas", en: "Occupied" },
  "map.arrivals": { es: "Llegadas", en: "Arrivals" },
  "map.capacity": { es: "Capacidad", en: "Capacity" },
  "map.villa_status": { es: "Estado Villas", en: "Villa Status" },
  "map.vip_guest": { es: "Huesped VIP", en: "VIP Guest" },
  "map.allergies": { es: "Alergias", en: "Allergies" },
  "map.select_villa": { es: "Selecciona una Villa", en: "Select a Villa" },
  "map.select_villa_desc": {
    es: "Haz click en una villa en el mapa para ver detalles, cambiar estado, o asignar huespedes.",
    en: "Click on a villa on the map to view details, change status, or assign guests.",
  },
  "map.today_summary": { es: "Resumen de Hoy", en: "Today's Summary" },
  "map.quick_actions": { es: "Acciones Rapidas", en: "Quick Actions" },
  "map.assign_guest": { es: "Asignar Huesped", en: "Assign Guest" },
  "map.move_guest": {
    es: "Mover Huesped a Otra Villa",
    en: "Move Guest to Another Villa",
  },
  "map.start_cleaning": {
    es: "Iniciar Checklist Limpieza",
    en: "Start Cleaning Checklist",
  },
  "map.report_maintenance": {
    es: "Reportar Mantenimiento",
    en: "Report Maintenance",
  },
  "map.view_guest_details": {
    es: "Ver Detalles Huesped",
    en: "View Guest Details",
  },
  "map.contact_guest": {
    es: "Contactar Huesped (WhatsApp)",
    en: "Contact Guest (WhatsApp)",
  },
  "map.process_checkout": {
    es: "Procesar Check-out → Limpieza",
    en: "Process Check-out → Cleaning",
  },
  "map.confirm_checkin": {
    es: "Confirmar Check-in → Ocupada",
    en: "Confirm Check-in → Occupied",
  },
  "map.mark_available": {
    es: "Marcar como Disponible",
    en: "Mark as Available",
  },
  "map.change": { es: "Cambiar", en: "Change" },
  "map.cleaning_status": { es: "Estado Limpieza", en: "Cleaning Status" },
  "map.specs": { es: "Especificaciones", en: "Specifications" },
  "map.beds": { es: "Camas", en: "Beds" },
  "map.sofa_bed": { es: "Sofa Cama", en: "Sofa Bed" },
  "map.capacity_label": { es: "Capacidad", en: "Capacity" },
  "map.zone": { es: "Zona", en: "Zone" },
  "map.no_guest": { es: "Sin huesped asignado", en: "No guest assigned" },
  "map.nights_remaining": { es: "noches restantes", en: "nights remaining" },
  "map.checkout_today": { es: "CHECKOUT HOY", en: "CHECKOUT TODAY" },
  "map.loading": { es: "Cargando mapa...", en: "Loading map..." },
  "map.access_road": { es: "Via de Acceso", en: "Access Road" },

  // ─── Villa Status ───
  "villa.occupied": { es: "Ocupada", en: "Occupied" },
  "villa.vacant": { es: "Vacia", en: "Vacant" },
  "villa.arriving": { es: "Llegada Hoy", en: "Arriving Today" },
  "villa.cleaning": { es: "Limpieza", en: "Cleaning" },
  "villa.checkout": { es: "Salida Hoy", en: "Checkout Today" },
  "villa.maintenance": { es: "Mantenimiento", en: "Maintenance" },

  // ─── Cleaning Status ───
  "cleaning.pending": { es: "Pendiente", en: "Pending" },
  "cleaning.in_progress": { es: "En Proceso", en: "In Progress" },
  "cleaning.submitted": {
    es: "Enviada — Esperando Aprobacion",
    en: "Submitted — Awaiting Approval",
  },
  "cleaning.approved": { es: "Lista para Huesped", en: "Ready for Guest" },

  // ─── Assign Guest Modal ───
  "modal.assign_guest": { es: "Asignar Huesped", en: "Assign Guest" },
  "modal.guest_name": { es: "Nombre del Huesped", en: "Guest Name" },
  "modal.guests_count": { es: "Huespedes", en: "Guests" },
  "modal.phone": { es: "Telefono", en: "Phone" },
  "modal.check_in": { es: "Check-in", en: "Check-in" },
  "modal.check_out": { es: "Check-out", en: "Check-out" },
  "modal.allergies": {
    es: "Alergias (separadas por coma)",
    en: "Allergies (comma separated)",
  },
  "modal.notes": { es: "Notas", en: "Notes" },
  "modal.vip_guest": { es: "Huesped VIP", en: "VIP Guest" },

  // ─── Move Guest Modal ───
  "modal.move_guest": { es: "Mover Huesped", en: "Move Guest" },
  "modal.no_available_villas": {
    es: "No hay villas disponibles",
    en: "No villas available",
  },
  "modal.move_to": { es: "Mover", en: "Move" },

  // ─── Maintenance Modal ───
  "modal.maintenance_title": {
    es: "Reportar Mantenimiento",
    en: "Report Maintenance",
  },
  "modal.problem_description": {
    es: "Descripcion del problema",
    en: "Problem description",
  },
  "modal.urgent": {
    es: "Urgente (afecta seguridad o comodidad del huesped)",
    en: "Urgent (affects guest safety or comfort)",
  },
  "modal.submit_maintenance": {
    es: "Reportar Mantenimiento",
    en: "Report Maintenance",
  },

  // ─── Status Change Modal ───
  "modal.change_status": { es: "Cambiar Estado", en: "Change Status" },

  // ─── Ops Overview Page ───
  "ops.todays_guests": { es: "Huespedes Hoy", en: "Today's Guests" },
  "ops.current_occupancy": { es: "Ocupacion actual", en: "Current occupancy" },
  "ops.weekly_food_profit": {
    es: "Ganancia Semanal F&B",
    en: "Weekly Food Profit",
  },
  "ops.with_transport": {
    es: "Con costos de transporte",
    en: "With transport costs",
  },
  "ops.weekly_transport": {
    es: "Costo Transporte Semanal",
    en: "Weekly Transport Cost",
  },
  "ops.hidden_cost": {
    es: "Costo oculto por plato",
    en: "Hidden cost per plate",
  },
  "ops.staff_questions": {
    es: "Preguntas Staff/Dia",
    en: "Staff Questions/Day",
  },
  "ops.via_bot": { es: "Via Staff Bot", en: "Via Staff Bot" },
  "ops.pending_approvals": {
    es: "Aprobaciones Pendientes",
    en: "Pending Approvals",
  },
  "ops.checklists_awaiting": {
    es: "Checklists esperando revision",
    en: "Checklists awaiting review",
  },
  "ops.low_stock_items": { es: "Items Bajo Stock", en: "Low Stock Items" },
  "ops.below_minimum": {
    es: "Por debajo del minimo",
    en: "Below minimum threshold",
  },
  "ops.db_not_configured": {
    es: "Base de Datos No Configurada",
    en: "Database Not Configured",
  },
  "ops.db_not_configured_desc": {
    es: "Las variables de entorno de Supabase no estan disponibles. Deben configurarse en Vercel y redesplegar el proyecto.",
    en: "Supabase environment variables are not available. They need to be set in Vercel and the project redeployed.",
  },
  "ops.whats_new": { es: "Novedades en v2.0", en: "What's New in v2.0" },
  "ops.whats_new_desc": {
    es: "Calendario de ocupacion diaria + costos de transporte = numeros reales, no estimaciones",
    en: "Daily occupancy calendar + transport costs = real numbers, not guesses",
  },

  // Navigation
  "nav.overview": { es: "Resumen", en: "Overview" },
  "nav.bookings": { es: "Reservas", en: "Bookings" },
  "nav.deposits": { es: "Depositos", en: "Deposits" },
  "nav.welcome_guide": { en: "Welcome Guide", es: "Guia de Bienvenida" },
  "nav.requirements": { en: "Requirements", es: "Requisitos" },
  "nav.fb_pl": { en: "F&B P&L", es: "P&L A&B" },
  "nav.revenue": { en: "Revenue", es: "Ingresos" },
  "nav.occupancy": { en: "Occupancy", es: "Ocupación" },
  "nav.schedule": { en: "Staff Schedule", es: "Horarios" },
  "nav.staff_bot": { en: "Staff Bot", es: "Bot Staff" },
  "nav.booking_bot": { en: "Booking Bot", es: "Bot Reservas" },
  "nav.housekeeping": { en: "Housekeeping QC", es: "Control Limpieza" },
  "nav.cleaning_priority": {
    en: "Cleaning Priority",
    es: "Prioridad Limpieza",
  },
  "nav.maintenance": { en: "Maintenance QC", es: "Control Mantenimiento" },
  "nav.maintenance_schedule": { en: "Maint. Calendar", es: "Calendario Mant." },
  "nav.preventive": { en: "Preventive", es: "Preventivo" },
  "nav.suppliers": { en: "Suppliers", es: "Proveedores" },
  "nav.vendors": { en: "Vendors", es: "Técnicos" },
  "nav.demo": { en: "Demo Guide", es: "Guía Demo" },
  "nav.property_map": { en: "Property Map", es: "Mapa Propiedad" },
  "nav.reports": { en: "Reports", es: "Reportes" },

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

  // ─── Onboarding (Issue #11) ───
  "onboarding.welcome": { es: "Bienvenido", en: "Welcome" },
  "onboarding.skip": { es: "Saltar tutorial", en: "Skip tutorial" },
  "onboarding.next": { es: "Siguiente", en: "Next" },
  "onboarding.back": { es: "Atras", en: "Back" },
  "onboarding.start": { es: "Comenzar a trabajar", en: "Start working" },
  "onboarding.loading": { es: "Cargando...", en: "Loading..." },
  "onboarding.redirecting": { es: "Redirigiendo...", en: "Redirecting..." },
  "onboarding.step_tasks": {
    es: "Aqui estan tus Tareas",
    en: "Here are your Tasks",
  },
  "onboarding.step_checklists": {
    es: "Como Completar un Checklist",
    en: "How to Complete a Checklist",
  },
  "onboarding.step_bot": { es: "Como Usar el Bot", en: "How to Use the Bot" },
  "onboarding.step_inventory": {
    es: "Como Registrar Inventario",
    en: "How to Log Inventory",
  },
  "onboarding.step_pos": {
    es: "Sistema de Pedidos (POS)",
    en: "Order System (POS)",
  },
  "onboarding.step_ready": { es: "Listo!", en: "Ready!" },
  "onboarding.reset_title": { es: "Repetir Tutorial", en: "Repeat Tutorial" },
  "onboarding.reset_button": {
    es: "Mostrar de nuevo",
    en: "Show again",
  },
  "onboarding.reset_desc": {
    es: "Repasa como usar las herramientas principales",
    en: "Review how to use the main tools",
  },

  // ─── Training Page ───
  "training.title": { es: "Capacitaciones", en: "Training" },
  "training.subtitle": {
    es: "Completa tus capacitaciones requeridas",
    en: "Complete your required trainings",
  },
  "training.progress": { es: "Tu Progreso", en: "Your Progress" },
  "training.required": {
    es: "Capacitaciones Requeridas",
    en: "Required Training",
  },
  "training.additional": {
    es: "Capacitaciones Adicionales",
    en: "Additional Training",
  },
  "training.required_badge": { es: "REQUERIDO", en: "REQUIRED" },
  "training.recertification": {
    es: "Recertificacion: cada",
    en: "Recertification: every",
  },
  "training.days": { es: "dias", en: "days" },
  "training.all_complete": {
    es: "Todas las capacitaciones completadas!",
    en: "All trainings completed!",
  },
  "training.no_required": {
    es: "No hay capacitaciones requeridas para tu departamento",
    en: "No required trainings for your department",
  },

  // ─── Waste Logging ───
  "waste.title": { es: "Registro de Desperdicio", en: "Waste Logging" },
  "waste.subtitle": {
    es: "Registra ingredientes perdidos o desperdiciados",
    en: "Log lost or wasted ingredients",
  },
  "waste.select_ingredient": {
    es: "Selecciona ingrediente",
    en: "Select ingredient",
  },
  "waste.quantity": { es: "Cantidad", en: "Quantity" },
  "waste.reason": { es: "Razon", en: "Reason" },
  "waste.notes": { es: "Notas (opcional)", en: "Notes (optional)" },
  "waste.photo_required": {
    es: "Foto requerida",
    en: "Photo required",
  },
  "waste.submit": { es: "Registrar Desperdicio", en: "Log Waste" },
  "waste.success": {
    es: "Desperdicio registrado correctamente",
    en: "Waste logged successfully",
  },
  "waste.reason.spoiled": { es: "Danado/Podrido", en: "Spoiled" },
  "waste.reason.overprepped": { es: "Sobre-preparado", en: "Over-prepped" },
  "waste.reason.returned": { es: "Devuelto", en: "Returned" },
  "waste.reason.expired": { es: "Vencido", en: "Expired" },
  "waste.reason.dropped": { es: "Caido/Accidente", en: "Dropped" },
  "waste.reason.other": { es: "Otro", en: "Other" },
  "waste.today_total": { es: "Total de hoy", en: "Today's total" },
  "waste.recent": { es: "Registros recientes", en: "Recent logs" },
  "waste.no_photo": {
    es: "Debes tomar una foto del desperdicio",
    en: "You must take a photo of the waste",
  },

  // ─── EOD Closing ───
  "closing.title": { es: "Cierre del Dia", en: "End of Day" },
  "closing.subtitle": {
    es: "Reconciliacion y conteo de inventario",
    en: "Reconciliation and inventory count",
  },
  "closing.shift": { es: "Turno", en: "Shift" },
  "closing.shift.day": { es: "Dia", en: "Day" },
  "closing.shift.night": { es: "Noche", en: "Night" },
  "closing.high_value_items": {
    es: "Items de Alto Valor",
    en: "High-Value Items",
  },
  "closing.expected": { es: "Esperado", en: "Expected" },
  "closing.actual": { es: "Actual", en: "Actual" },
  "closing.variance": { es: "Diferencia", en: "Variance" },
  "closing.summary": { es: "Resumen del Dia", en: "Day Summary" },
  "closing.revenue": { es: "Ingresos", en: "Revenue" },
  "closing.waste_cost": { es: "Costo Desperdicio", en: "Waste Cost" },
  "closing.staff_meals": { es: "Comidas Staff", en: "Staff Meals" },
  "closing.submit": { es: "Cerrar Dia", en: "Close Day" },
  "closing.success": { es: "Cierre completado", en: "Closing completed" },
  "closing.already_closed": {
    es: "Ya existe un cierre para hoy",
    en: "A closing already exists for today",
  },
  "closing.discrepancy_alert": {
    es: "Hay discrepancias que requieren atencion",
    en: "There are discrepancies that require attention",
  },
  "closing.no_discrepancies": {
    es: "Sin discrepancias",
    en: "No discrepancies",
  },
  "closing.notes": { es: "Notas del cierre", en: "Closing notes" },

  // ─── Staff Navigation (updated) ───
  "staff.waste": { es: "Desperdicio", en: "Waste" },
  "staff.closing": { es: "Cierre", en: "Closing" },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Default to Spanish - staff speaks Spanish
  const [lang, setLangState] = useState<Language>("es");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("tvc_language") as Language;
    if (saved && (saved === "en" || saved === "es")) {
      setLangState(saved);
    }
    // If no saved preference, keep Spanish as default
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

// Default translation function for fallback - Spanish first
const defaultT = (key: string): string => {
  const translation = translations[key];
  if (!translation) return key;
  return translation.es || translation.en || key;
};

// Default context value for SSR/static generation - Spanish first
const defaultContextValue: LanguageContextType = {
  lang: "es",
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
