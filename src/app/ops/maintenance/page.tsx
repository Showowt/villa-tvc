"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables, Json } from "@/types/database";

type Checklist = Tables<"checklists">;

interface ChecklistItem {
  id?: string;
  task: string;
  task_es: string;
  photo_required: boolean;
  completed?: boolean;
  photo_url?: string;
  notes?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  chlorine_level?: number;
  ph_level?: number;
  temperature?: number;
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
  avgApprovalTime: number;
  poolChecksToday: number;
}

interface CriticalIssue {
  id: string;
  villa_id: string;
  description: string;
  priority: "high" | "urgent";
  reported_at: string | null;
}

interface WeekDay {
  date: string;
  dayName: string;
  dayNameEs: string;
  isToday: boolean;
  maintenanceType: string;
  poolChecks: { "8am": boolean; "2pm": boolean; "8pm": boolean };
  maintenanceComplete: boolean;
  checklists: ChecklistWithDetails[];
}

interface MaintenanceTask {
  id: string;
  task: string;
  task_es: string;
  day: string;
  priority: "low" | "normal" | "high" | "urgent";
  photo_required: boolean;
  estimated_minutes?: number;
}

const ADMIN_CODE = "2027";

const DAYS_ES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

const DAYS_EN = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
];

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
];

const MAINTENANCE_TYPES = [
  "maintenance_monday",
  "maintenance_tuesday",
  "maintenance_wednesday",
  "maintenance_thursday",
  "maintenance_friday",
  "maintenance_saturday",
  "maintenance_sunday",
  "pool_8am",
  "pool_2pm",
  "pool_8pm",
] as const;

// Default maintenance tasks by day (from PDF)
const DEFAULT_TASKS: { [key: string]: MaintenanceTask[] } = {
  monday: [
    {
      id: "mon1",
      task: "Check all A/C filters",
      task_es: "Revisar filtros de A/C",
      day: "monday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 30,
    },
    {
      id: "mon2",
      task: "Test all light switches",
      task_es: "Probar todos los interruptores de luz",
      day: "monday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 20,
    },
    {
      id: "mon3",
      task: "Inspect outdoor furniture",
      task_es: "Inspeccionar muebles exteriores",
      day: "monday",
      priority: "normal",
      photo_required: true,
      estimated_minutes: 15,
    },
    {
      id: "mon4",
      task: "Check water pressure all villas",
      task_es: "Revisar presión de agua en todas las villas",
      day: "monday",
      priority: "high",
      photo_required: false,
      estimated_minutes: 25,
    },
  ],
  tuesday: [
    {
      id: "tue1",
      task: "Garden irrigation system check",
      task_es: "Revisar sistema de riego del jardín",
      day: "tuesday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 20,
    },
    {
      id: "tue2",
      task: "Clean all gutters",
      task_es: "Limpiar todas las canaletas",
      day: "tuesday",
      priority: "normal",
      photo_required: true,
      estimated_minutes: 45,
    },
    {
      id: "tue3",
      task: "Test emergency lights",
      task_es: "Probar luces de emergencia",
      day: "tuesday",
      priority: "high",
      photo_required: false,
      estimated_minutes: 15,
    },
  ],
  wednesday: [
    {
      id: "wed1",
      task: "Check all door locks",
      task_es: "Revisar todas las cerraduras",
      day: "wednesday",
      priority: "high",
      photo_required: false,
      estimated_minutes: 30,
    },
    {
      id: "wed2",
      task: "Inspect roof tiles",
      task_es: "Inspeccionar tejas del techo",
      day: "wednesday",
      priority: "normal",
      photo_required: true,
      estimated_minutes: 25,
    },
    {
      id: "wed3",
      task: "Test smoke detectors",
      task_es: "Probar detectores de humo",
      day: "wednesday",
      priority: "urgent",
      photo_required: false,
      estimated_minutes: 20,
    },
  ],
  thursday: [
    {
      id: "thu1",
      task: "Deep clean pool filters",
      task_es: "Limpieza profunda de filtros de piscina",
      day: "thursday",
      priority: "high",
      photo_required: true,
      estimated_minutes: 60,
    },
    {
      id: "thu2",
      task: "Check all plumbing",
      task_es: "Revisar toda la plomería",
      day: "thursday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 40,
    },
    {
      id: "thu3",
      task: "Inspect electrical panels",
      task_es: "Inspeccionar paneles eléctricos",
      day: "thursday",
      priority: "high",
      photo_required: true,
      estimated_minutes: 20,
    },
  ],
  friday: [
    {
      id: "fri1",
      task: "Check gas lines and tanks",
      task_es: "Revisar líneas y tanques de gas",
      day: "friday",
      priority: "urgent",
      photo_required: true,
      estimated_minutes: 25,
    },
    {
      id: "fri2",
      task: "Test all ceiling fans",
      task_es: "Probar todos los ventiladores de techo",
      day: "friday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 20,
    },
    {
      id: "fri3",
      task: "Inspect pest control areas",
      task_es: "Inspeccionar áreas de control de plagas",
      day: "friday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 15,
    },
  ],
  saturday: [
    {
      id: "sat1",
      task: "Weekend guest area walkthrough",
      task_es: "Recorrido de áreas de huéspedes de fin de semana",
      day: "saturday",
      priority: "high",
      photo_required: true,
      estimated_minutes: 30,
    },
    {
      id: "sat2",
      task: "Check outdoor lighting",
      task_es: "Revisar iluminación exterior",
      day: "saturday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 20,
    },
    {
      id: "sat3",
      task: "Pool equipment full check",
      task_es: "Revisión completa de equipo de piscina",
      day: "saturday",
      priority: "high",
      photo_required: true,
      estimated_minutes: 30,
    },
  ],
  sunday: [
    {
      id: "sun1",
      task: "Light maintenance day - walkthrough",
      task_es: "Día de mantenimiento ligero - recorrido",
      day: "sunday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 20,
    },
    {
      id: "sun2",
      task: "Check emergency supplies",
      task_es: "Revisar suministros de emergencia",
      day: "sunday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 15,
    },
  ],
};

// Maintenance inventory minimums
const INVENTORY_ITEMS = [
  {
    id: "inv1",
    name: "Pool Chlorine",
    name_es: "Cloro para Piscina",
    unit: "kg",
    min_stock: 5,
    category: "pool",
  },
  {
    id: "inv2",
    name: "pH Regulator",
    name_es: "Regulador de pH",
    unit: "L",
    min_stock: 3,
    category: "pool",
  },
  {
    id: "inv3",
    name: "A/C Filters",
    name_es: "Filtros de A/C",
    unit: "units",
    min_stock: 10,
    category: "hvac",
  },
  {
    id: "inv4",
    name: "Light Bulbs LED",
    name_es: "Bombillas LED",
    unit: "units",
    min_stock: 20,
    category: "electrical",
  },
  {
    id: "inv5",
    name: "Plumbing Tape",
    name_es: "Cinta de Plomería",
    unit: "rolls",
    min_stock: 5,
    category: "plumbing",
  },
  {
    id: "inv6",
    name: "WD-40",
    name_es: "WD-40",
    unit: "cans",
    min_stock: 3,
    category: "general",
  },
  {
    id: "inv7",
    name: "Paint Touch-up White",
    name_es: "Pintura Retoque Blanco",
    unit: "L",
    min_stock: 2,
    category: "general",
  },
  {
    id: "inv8",
    name: "Silicone Sealant",
    name_es: "Sellador de Silicona",
    unit: "tubes",
    min_stock: 4,
    category: "general",
  },
];

const POOL_RANGES = {
  chlorine: { min: 1.0, max: 3.0, unit: "ppm" },
  ph: { min: 7.2, max: 7.6, unit: "" },
  temperature: { min: 25, max: 30, unit: "°C" },
};

export default function MaintenanceQCPage() {
  const [checklists, setChecklists] = useState<ChecklistWithDetails[]>([]);
  const [historyChecklists, setHistoryChecklists] = useState<
    ChecklistWithDetails[]
  >([]);
  const [selected, setSelected] = useState<ChecklistWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "pending" | "week" | "history" | "critical" | "inventory"
  >("week");
  const [qcNotes, setQcNotes] = useState("");
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [criticalIssues, setCriticalIssues] = useState<CriticalIssue[]>([]);
  const [occupiedVillas, setOccupiedVillas] = useState<string[]>([]);
  const [weekData, setWeekData] = useState<WeekDay[]>([]);
  const [selectedDay, setSelectedDay] = useState<WeekDay | null>(null);

  // Admin mode
  const [adminCode, setAdminCode] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [customTasks, setCustomTasks] = useState<{
    [key: string]: MaintenanceTask[];
  }>({});

  // New task form
  const [newTask, setNewTask] = useState({
    task: "",
    task_es: "",
    day: "monday",
    priority: "normal" as "low" | "normal" | "high" | "urgent",
    photo_required: false,
    estimated_minutes: 15,
  });

  const [stats, setStats] = useState<Stats>({
    pending: 0,
    approvedToday: 0,
    rejectedToday: 0,
    completedThisWeek: 0,
    avgApprovalTime: 0,
    poolChecksToday: 0,
  });

  // Build week data
  const buildWeekData = useCallback(
    (allChecklists: ChecklistWithDetails[]): WeekDay[] => {
      const today = new Date();
      const week: WeekDay[] = [];

      for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - today.getDay() + i); // Start from Sunday
        const dateStr = date.toISOString().split("T")[0];
        const dayIndex = date.getDay();
        const dayEn = DAYS_EN[dayIndex];

        const dayChecklists = allChecklists.filter((c) => c.date === dateStr);
        const maintenanceType = `maintenance_${dayEn}`;

        const poolChecks = {
          "8am": dayChecklists.some(
            (c) => c.type === "pool_8am" && c.status === "approved",
          ),
          "2pm": dayChecklists.some(
            (c) => c.type === "pool_2pm" && c.status === "approved",
          ),
          "8pm": dayChecklists.some(
            (c) => c.type === "pool_8pm" && c.status === "approved",
          ),
        };

        const maintenanceComplete = dayChecklists.some(
          (c) => c.type === maintenanceType && c.status === "approved",
        );

        week.push({
          date: dateStr,
          dayName: DAYS_EN[dayIndex],
          dayNameEs: DAYS_ES[dayIndex],
          isToday: dateStr === today.toISOString().split("T")[0],
          maintenanceType,
          poolChecks,
          maintenanceComplete,
          checklists: dayChecklists,
        });
      }

      return week;
    },
    [],
  );

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();
    const today = new Date().toISOString().split("T")[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekStartStr = weekStart.toISOString().split("T")[0];
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    const weekEndStr = weekEnd.toISOString().split("T")[0];

    // Get all checklists for this week
    const { data: weekChecklists } = await supabase
      .from("checklists")
      .select("*")
      .gte("date", weekStartStr)
      .lte("date", weekEndStr)
      .in("type", MAINTENANCE_TYPES)
      .order("date", { ascending: true });

    // Get pending checklists
    const { data: pendingData, error: pendingError } = await supabase
      .from("checklists")
      .select("*")
      .eq("status", "complete")
      .is("approved_at", null)
      .in("type", MAINTENANCE_TYPES)
      .order("completed_at", { ascending: false });

    if (pendingError) {
      console.error("[loadData] pendingError:", pendingError);
    }

    // Get history
    const { data: historyData } = await supabase
      .from("checklists")
      .select("*")
      .in("status", ["approved", "rejected"])
      .gte("date", weekStartStr)
      .in("type", MAINTENANCE_TYPES)
      .order("updated_at", { ascending: false })
      .limit(50);

    // Get today's occupancy
    const { data: occupancyData } = await supabase
      .from("daily_occupancy")
      .select("villas_occupied")
      .eq("date", today)
      .single();

    setOccupiedVillas((occupancyData?.villas_occupied || []) as string[]);

    // Get critical issues
    const { data: criticalData } = await supabase
      .from("checklists")
      .select("*")
      .eq("status", "pending")
      .in("type", MAINTENANCE_TYPES)
      .or("notes.ilike.%ORDEN%,notes.ilike.%urgente%,notes.ilike.%urgent%")
      .order("created_at", { ascending: false });

    const criticalList: CriticalIssue[] = (criticalData || [])
      .filter((c) => {
        const items = parseItems(c.items);
        return items.some(
          (i) => i.priority === "urgent" || i.priority === "high",
        );
      })
      .map((c) => {
        const items = parseItems(c.items);
        const urgentItem = items.find(
          (i) => i.priority === "urgent" || i.priority === "high",
        );
        return {
          id: c.id,
          villa_id: c.villa_id || "general",
          description:
            urgentItem?.task_es ||
            urgentItem?.task ||
            "Problema de mantenimiento",
          priority: urgentItem?.priority as "high" | "urgent",
          reported_at: c.created_at,
        };
      });

    setCriticalIssues(criticalList);

    // Get stats
    const { count: approvedTodayCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${today}T00:00:00`)
      .in("type", MAINTENANCE_TYPES);

    const { count: rejectedTodayCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "rejected")
      .gte("updated_at", `${today}T00:00:00`)
      .in("type", MAINTENANCE_TYPES);

    const { count: completedWeekCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("date", weekStartStr)
      .in("type", MAINTENANCE_TYPES);

    const { count: poolChecksCount } = await supabase
      .from("checklists")
      .select("*", { count: "exact", head: true })
      .eq("status", "approved")
      .gte("approved_at", `${today}T00:00:00`)
      .in("type", ["pool_8am", "pool_2pm", "pool_8pm"]);

    setStats({
      pending: pendingData?.length || 0,
      approvedToday: approvedTodayCount || 0,
      rejectedToday: rejectedTodayCount || 0,
      completedThisWeek: completedWeekCount || 0,
      avgApprovalTime: 0,
      poolChecksToday: poolChecksCount || 0,
    });

    // Build week view
    const allChecklists = [...(weekChecklists || []), ...(pendingData || [])];
    const week = buildWeekData(allChecklists);
    setWeekData(week);

    // Set today as selected day by default
    const todayDay = week.find((d) => d.isToday);
    if (todayDay && !selectedDay) {
      setSelectedDay(todayDay);
    }

    // Enrich checklists with user data
    const userIds = [
      ...new Set([
        ...(pendingData || []).map((c) => c.assigned_to).filter(Boolean),
        ...(pendingData || []).map((c) => c.approved_by).filter(Boolean),
      ]),
    ] as string[];

    const { data: usersData } =
      userIds.length > 0
        ? await supabase.from("users").select("id, name").in("id", userIds)
        : { data: [] };

    const usersMap = new Map((usersData || []).map((u) => [u.id, u]));

    const enrichChecklists = (data: Checklist[]): ChecklistWithDetails[] =>
      data.map((checklist) => ({
        ...checklist,
        assigned_user: checklist.assigned_to
          ? usersMap.get(checklist.assigned_to) || null
          : null,
        approved_by_user: checklist.approved_by
          ? usersMap.get(checklist.approved_by) || null
          : null,
        template: null,
      }));

    setChecklists(enrichChecklists(pendingData || []));
    setHistoryChecklists(enrichChecklists(historyData || []));

    if ((pendingData || []).length > 0 && !selected) {
      setSelected(enrichChecklists(pendingData || [])[0]);
    }

    setLoading(false);
  }, [buildWeekData, selected, selectedDay]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load custom tasks from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("tvc_maintenance_custom_tasks");
    if (saved) {
      try {
        setCustomTasks(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading custom tasks:", e);
      }
    }
  }, []);

  const saveCustomTasks = (tasks: { [key: string]: MaintenanceTask[] }) => {
    localStorage.setItem("tvc_maintenance_custom_tasks", JSON.stringify(tasks));
    setCustomTasks(tasks);
  };

  const handleAdminLogin = () => {
    if (adminCode === ADMIN_CODE) {
      setIsAdmin(true);
      setShowAdminModal(false);
      setAdminCode("");
    } else {
      alert("Código incorrecto");
    }
  };

  const handleAddTask = () => {
    if (!newTask.task || !newTask.task_es) {
      alert("Por favor completa todos los campos");
      return;
    }

    const taskId = `custom_${Date.now()}`;
    const task: MaintenanceTask = {
      id: taskId,
      ...newTask,
    };

    const dayTasks = customTasks[newTask.day] || [];
    const updated = {
      ...customTasks,
      [newTask.day]: [...dayTasks, task],
    };

    saveCustomTasks(updated);
    setShowAddTaskModal(false);
    setNewTask({
      task: "",
      task_es: "",
      day: "monday",
      priority: "normal",
      photo_required: false,
      estimated_minutes: 15,
    });
  };

  const handleEditTask = () => {
    if (!editingTask) return;

    const dayTasks = customTasks[editingTask.day] || [];
    const updated = {
      ...customTasks,
      [editingTask.day]: dayTasks.map((t) =>
        t.id === editingTask.id ? editingTask : t,
      ),
    };

    saveCustomTasks(updated);
    setShowEditTaskModal(false);
    setEditingTask(null);
  };

  const handleDeleteTask = (task: MaintenanceTask) => {
    if (!confirm(`¿Eliminar tarea: ${task.task_es}?`)) return;

    const dayTasks = customTasks[task.day] || [];
    const updated = {
      ...customTasks,
      [task.day]: dayTasks.filter((t) => t.id !== task.id),
    };

    saveCustomTasks(updated);
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
      loadData();
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
      loadData();
    }

    setProcessing(false);
  };

  const getTypeInfo = (type: string) => {
    if (type.startsWith("maintenance_")) {
      const day = type.replace("maintenance_", "");
      const dayIndex = DAYS_EN.indexOf(day);
      return {
        label: `Mantenimiento ${DAYS_ES[dayIndex] || day}`,
        icon: "🔧",
        color: "#3B82F6",
      };
    }
    if (type === "pool_8am")
      return { label: "Piscina 8:00 AM", icon: "🌅", color: "#F59E0B" };
    if (type === "pool_2pm")
      return { label: "Piscina 2:00 PM", icon: "☀️", color: "#F97316" };
    if (type === "pool_8pm")
      return { label: "Piscina 8:00 PM", icon: "🌙", color: "#8B5CF6" };
    return { label: type, icon: "📋", color: "#6B7280" };
  };

  const parseItems = (items: Json): ChecklistItem[] => {
    if (!items || !Array.isArray(items)) return [];
    return items as unknown as ChecklistItem[];
  };

  const getPriorityBadge = (priority?: string) => {
    switch (priority) {
      case "urgent":
        return (
          <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] font-bold rounded">
            🚨 URGENTE
          </span>
        );
      case "high":
        return (
          <span className="px-1.5 py-0.5 bg-amber-100 text-amber-600 text-[10px] font-bold rounded">
            ⚠️ ALTA
          </span>
        );
      case "low":
        return (
          <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold rounded">
            BAJA
          </span>
        );
      default:
        return null;
    }
  };

  const getChemicalStatus = (
    value: number | undefined,
    type: "chlorine" | "ph" | "temperature",
  ) => {
    if (value === undefined) return null;
    const range = POOL_RANGES[type];
    const isOk = value >= range.min && value <= range.max;
    return (
      <span
        className={`px-2 py-1 rounded text-xs font-bold ${isOk ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}
      >
        {value}
        {range.unit} {isOk ? "✓" : "⚠️"}
      </span>
    );
  };

  const getVillaName = (villaId: string | null) => {
    if (!villaId) return "General";
    const villa = VILLAS.find((v) => v.id === villaId);
    return villa ? villa.name : villaId.replace("_", " ");
  };

  const isVillaOccupied = (villaId: string | null) => {
    if (!villaId) return false;
    return occupiedVillas.includes(villaId);
  };

  const getTasksForDay = (dayName: string): MaintenanceTask[] => {
    const defaults = DEFAULT_TASKS[dayName] || [];
    const custom = customTasks[dayName] || [];
    return [...defaults, ...custom];
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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            🔧 Maintenance Quality Control
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Vista semanal completa • Tareas diarias • Control de piscina •
            Inventario
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin ? (
            <Badge color="#10B981">🔓 Admin Mode</Badge>
          ) : (
            <button
              onClick={() => setShowAdminModal(true)}
              className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
            >
              🔐 Admin
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="text-2xl font-black text-amber-500">
            {stats.pending}
          </div>
          <div className="text-xs text-slate-500 font-medium">Pendientes</div>
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
          <div className="text-2xl font-black text-cyan-500">
            {stats.poolChecksToday}/3
          </div>
          <div className="text-xs text-slate-500 font-medium">Piscina Hoy</div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div
            className={`text-2xl font-black ${criticalIssues.length > 0 ? "text-red-500" : "text-emerald-500"}`}
          >
            {criticalIssues.length}
          </div>
          <div className="text-xs text-slate-500 font-medium">Críticos</div>
        </div>
      </div>

      {/* Critical Issues Alert */}
      {criticalIssues.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xl">🚨</span>
            <span className="font-bold text-red-800">
              Problemas Críticos ({criticalIssues.length})
            </span>
          </div>
          <div className="space-y-2">
            {criticalIssues.slice(0, 3).map((issue) => (
              <div
                key={issue.id}
                className="flex items-center justify-between bg-white rounded-lg p-2 border border-red-100"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={
                      issue.priority === "urgent"
                        ? "text-red-500"
                        : "text-amber-500"
                    }
                  >
                    {issue.priority === "urgent" ? "🚨" : "⚠️"}
                  </span>
                  <span className="text-sm font-medium text-slate-700">
                    {getVillaName(issue.villa_id)}
                  </span>
                  <span className="text-sm text-slate-500">
                    {issue.description}
                  </span>
                </div>
                {isVillaOccupied(issue.villa_id) && (
                  <Badge color="#EF4444">🏠 OCUPADA</Badge>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
        <button
          onClick={() => setActiveTab("week")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "week"
              ? "bg-blue-500 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          📅 Vista Semanal
        </button>
        <button
          onClick={() => setActiveTab("pending")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "pending"
              ? "bg-amber-500 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          📋 Pendientes ({checklists.length})
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "history"
              ? "bg-slate-700 text-white"
              : "bg-white text-slate-600 border border-slate-200"
          }`}
        >
          📜 Historial
        </button>
        <button
          onClick={() => setActiveTab("critical")}
          className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
            activeTab === "critical"
              ? "bg-red-500 text-white"
              : "bg-white text-red-600 border border-red-200"
          }`}
        >
          🚨 Críticos ({criticalIssues.length})
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

      {/* WEEK VIEW TAB */}
      {activeTab === "week" && (
        <div className="space-y-6">
          {/* Week Calendar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">
                📅 Semana de Mantenimiento
              </h2>
              {isAdmin && (
                <button
                  onClick={() => setShowAddTaskModal(true)}
                  className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm font-bold hover:bg-emerald-600 transition-colors"
                >
                  ➕ Agregar Tarea
                </button>
              )}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekData.map((day) => (
                <button
                  key={day.date}
                  onClick={() => setSelectedDay(day)}
                  className={`p-3 rounded-lg border text-center transition-all ${
                    selectedDay?.date === day.date
                      ? "bg-blue-500 text-white border-blue-500"
                      : day.isToday
                        ? "bg-blue-50 border-blue-200"
                        : "bg-white border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div
                    className={`text-xs font-bold ${selectedDay?.date === day.date ? "text-white" : "text-slate-500"}`}
                  >
                    {day.dayNameEs.slice(0, 3).toUpperCase()}
                  </div>
                  <div
                    className={`text-lg font-black ${selectedDay?.date === day.date ? "text-white" : "text-slate-900"}`}
                  >
                    {new Date(day.date + "T12:00:00").getDate()}
                  </div>
                  <div className="flex justify-center gap-0.5 mt-1">
                    <span
                      className={`w-2 h-2 rounded-full ${day.maintenanceComplete ? "bg-emerald-400" : "bg-slate-300"}`}
                    />
                    <span
                      className={`w-2 h-2 rounded-full ${day.poolChecks["8am"] ? "bg-amber-400" : "bg-slate-300"}`}
                    />
                    <span
                      className={`w-2 h-2 rounded-full ${day.poolChecks["2pm"] ? "bg-orange-400" : "bg-slate-300"}`}
                    />
                    <span
                      className={`w-2 h-2 rounded-full ${day.poolChecks["8pm"] ? "bg-purple-400" : "bg-slate-300"}`}
                    />
                  </div>
                  {day.isToday && (
                    <div
                      className={`text-[10px] font-bold mt-1 ${selectedDay?.date === day.date ? "text-white" : "text-blue-500"}`}
                    >
                      HOY
                    </div>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-4 mt-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />{" "}
                Mantenimiento
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-400" /> Pool 8AM
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-400" /> Pool 2PM
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-purple-400" /> Pool 8PM
              </span>
            </div>
          </div>

          {/* Selected Day Details */}
          {selectedDay && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">
                    {selectedDay.dayNameEs} -{" "}
                    {new Date(
                      selectedDay.date + "T12:00:00",
                    ).toLocaleDateString("es-CO", {
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tareas de mantenimiento programadas
                  </p>
                </div>
                <div className="flex gap-2">
                  <Badge
                    color={
                      selectedDay.maintenanceComplete ? "#10B981" : "#F59E0B"
                    }
                  >
                    🔧{" "}
                    {selectedDay.maintenanceComplete ? "Completo" : "Pendiente"}
                  </Badge>
                </div>
              </div>

              {/* Pool Checks Status */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div
                  className={`p-3 rounded-lg border ${selectedDay.poolChecks["8am"] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="text-lg font-bold">🌅 8:00 AM</div>
                  <div
                    className={`text-sm font-semibold ${selectedDay.poolChecks["8am"] ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {selectedDay.poolChecks["8am"]
                      ? "✓ Completado"
                      : "Pendiente"}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${selectedDay.poolChecks["2pm"] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="text-lg font-bold">☀️ 2:00 PM</div>
                  <div
                    className={`text-sm font-semibold ${selectedDay.poolChecks["2pm"] ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {selectedDay.poolChecks["2pm"]
                      ? "✓ Completado"
                      : "Pendiente"}
                  </div>
                </div>
                <div
                  className={`p-3 rounded-lg border ${selectedDay.poolChecks["8pm"] ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}
                >
                  <div className="text-lg font-bold">🌙 8:00 PM</div>
                  <div
                    className={`text-sm font-semibold ${selectedDay.poolChecks["8pm"] ? "text-emerald-600" : "text-slate-500"}`}
                  >
                    {selectedDay.poolChecks["8pm"]
                      ? "✓ Completado"
                      : "Pendiente"}
                  </div>
                </div>
              </div>

              {/* Daily Tasks */}
              <h4 className="text-sm font-bold text-slate-600 mb-3 uppercase tracking-wide">
                Tareas del {selectedDay.dayNameEs}
              </h4>
              <div className="space-y-2">
                {getTasksForDay(selectedDay.dayName).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                        🔧
                      </div>
                      <div>
                        <div className="font-medium text-slate-900 flex items-center gap-2">
                          {task.task_es}
                          {getPriorityBadge(task.priority)}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2">
                          <span>⏱️ ~{task.estimated_minutes} min</span>
                          {task.photo_required && (
                            <span>📸 Foto requerida</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isAdmin && task.id.startsWith("custom_") && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setEditingTask(task);
                            setShowEditTaskModal(true);
                          }}
                          className="p-1 text-blue-500 hover:bg-blue-50 rounded"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDeleteTask(task)}
                          className="p-1 text-red-500 hover:bg-red-50 rounded"
                        >
                          🗑️
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {getTasksForDay(selectedDay.dayName).length === 0 && (
                  <div className="text-center py-8 text-slate-400">
                    No hay tareas programadas para este día
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PENDING TAB */}
      {activeTab === "pending" &&
        (checklists.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <div className="text-5xl mb-3">✅</div>
            <p className="text-slate-600 font-semibold text-lg">
              ¡Mantenimiento al día!
            </p>
            <p className="text-sm text-slate-400 mt-1">
              No hay checklists pendientes de aprobación
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-1 space-y-2">
              <div className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Pendientes ({checklists.length})
              </div>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {checklists.map((checklist) => {
                  const items = parseItems(checklist.items);
                  const completedCount = items.filter(
                    (i) => i.completed,
                  ).length;
                  const typeInfo = getTypeInfo(checklist.type);

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
                          <div className="font-bold text-sm text-slate-900 flex items-center gap-2">
                            <span>{typeInfo.icon}</span>
                            <span>{typeInfo.label}</span>
                          </div>
                        </div>
                        <Badge color={typeInfo.color}>
                          {checklist.type.includes("pool")
                            ? "Piscina"
                            : "Diario"}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
                        <span>
                          👤 {checklist.assigned_user?.name || "Staff"}
                        </span>
                        <span>
                          ✅ {completedCount}/{items.length}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="lg:col-span-2">
              {selected ? (
                <div className="bg-white rounded-xl border border-slate-200 p-5">
                  <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
                    <div>
                      <div className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                        <span>{getTypeInfo(selected.type).icon}</span>
                        {getTypeInfo(selected.type).label}
                      </div>
                      <div className="text-sm text-slate-500 mt-1">
                        👤 {selected.assigned_user?.name || "Staff"} • 📅{" "}
                        {new Date(selected.date).toLocaleDateString("es-CO", {
                          weekday: "long",
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <Badge color="#F59E0B">Pendiente</Badge>
                  </div>

                  {/* Pool Chemical Readings */}
                  {selected.type.includes("pool") && (
                    <div className="bg-cyan-50 rounded-lg p-4 mb-4">
                      <div className="text-xs font-semibold text-cyan-800 mb-2">
                        🧪 Lecturas Químicas
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        {(() => {
                          const items = parseItems(selected.items);
                          const poolItem = items.find(
                            (i) =>
                              i.chlorine_level !== undefined ||
                              i.ph_level !== undefined,
                          );
                          return (
                            <>
                              <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">
                                  Cloro
                                </div>
                                {getChemicalStatus(
                                  poolItem?.chlorine_level,
                                  "chlorine",
                                ) || (
                                  <span className="text-xs text-slate-400">
                                    N/A
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1">
                                  1.0-3.0 ppm
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">
                                  pH
                                </div>
                                {getChemicalStatus(
                                  poolItem?.ph_level,
                                  "ph",
                                ) || (
                                  <span className="text-xs text-slate-400">
                                    N/A
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1">
                                  7.2-7.6
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-slate-500 mb-1">
                                  Temp
                                </div>
                                {getChemicalStatus(
                                  poolItem?.temperature,
                                  "temperature",
                                ) || (
                                  <span className="text-xs text-slate-400">
                                    N/A
                                  </span>
                                )}
                                <div className="text-[10px] text-slate-400 mt-1">
                                  25-30°C
                                </div>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  )}

                  {/* Items */}
                  <div className="space-y-2 mb-4 max-h-[300px] overflow-y-auto">
                    {parseItems(selected.items).map((item, idx) => (
                      <div
                        key={idx}
                        className={`flex items-start gap-3 p-3 rounded-lg ${
                          item.completed ? "bg-emerald-50" : "bg-rose-50"
                        }`}
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
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm ${item.completed ? "text-slate-700" : "text-rose-700 font-medium"}`}
                            >
                              {item.task_es || item.task}
                            </span>
                            {getPriorityBadge(item.priority)}
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
                            className={`text-xs px-2 py-1 rounded font-bold flex-shrink-0 ${
                              item.photo_url
                                ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200"
                                : "bg-amber-100 text-amber-600"
                            }`}
                          >
                            📸 {item.photo_url ? "VER" : "FALTA"}
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* QC Notes */}
                  <div className="mb-4">
                    <label className="text-xs font-semibold text-slate-600 block mb-1">
                      Notas del QC:
                    </label>
                    <textarea
                      value={qcNotes}
                      onChange={(e) => setQcNotes(e.target.value)}
                      placeholder="Observaciones de control de calidad..."
                      className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-20 focus:outline-none focus:border-[#00B4FF]"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4 border-t border-slate-100">
                    <button
                      onClick={handleApprove}
                      disabled={processing}
                      className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {processing ? (
                        <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                      ) : (
                        <>✅ Aprobar</>
                      )}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(true)}
                      disabled={processing}
                      className="px-6 py-3 bg-rose-100 text-rose-600 rounded-xl font-bold text-sm hover:bg-rose-200 disabled:opacity-50"
                    >
                      ❌ Rechazar
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 bg-white rounded-xl border border-slate-200 text-slate-400">
                  ← Selecciona un checklist
                </div>
              )}
            </div>
          </div>
        ))}

      {/* HISTORY TAB */}
      {activeTab === "history" && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Tipo
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Staff
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Estado
                  </th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {historyChecklists.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-slate-400">
                      No hay historial
                    </td>
                  </tr>
                ) : (
                  historyChecklists.map((c) => (
                    <tr
                      key={c.id}
                      className="border-b border-slate-100 hover:bg-slate-50"
                    >
                      <td className="px-4 py-3">
                        {getTypeInfo(c.type).icon} {getTypeInfo(c.type).label}
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
                      <td className="px-4 py-3 text-slate-500">
                        {c.approved_at
                          ? new Date(c.approved_at).toLocaleString("es-CO", {
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
      )}

      {/* CRITICAL TAB */}
      {activeTab === "critical" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            🚨 Problemas Críticos
          </h2>
          {criticalIssues.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <div className="text-4xl mb-2">✅</div>
              <p>No hay problemas críticos</p>
            </div>
          ) : (
            <div className="space-y-3">
              {criticalIssues.map((issue) => (
                <div
                  key={issue.id}
                  className={`p-4 rounded-lg border ${issue.priority === "urgent" ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">
                        {issue.priority === "urgent" ? "🚨" : "⚠️"}
                      </span>
                      <div>
                        <div className="font-bold text-slate-900 flex items-center gap-2">
                          {getVillaName(issue.villa_id)}
                          {isVillaOccupied(issue.villa_id) && (
                            <Badge color="#EF4444">🏠 OCUPADA</Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          {issue.description}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {issue.reported_at
                            ? new Date(issue.reported_at).toLocaleString(
                                "es-CO",
                              )
                            : "—"}
                        </p>
                      </div>
                    </div>
                    <Badge
                      color={
                        issue.priority === "urgent" ? "#EF4444" : "#F59E0B"
                      }
                    >
                      {issue.priority === "urgent" ? "URGENTE" : "ALTA"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* INVENTORY TAB */}
      {activeTab === "inventory" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            📦 Inventario de Mantenimiento
          </h2>
          <p className="text-sm text-slate-500 mb-4">
            Materiales mínimos necesarios para operación
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {INVENTORY_ITEMS.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-4 rounded-lg bg-slate-50 border border-slate-200"
              >
                <div>
                  <div className="font-medium text-slate-900">
                    {item.name_es}
                  </div>
                  <div className="text-xs text-slate-500">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-600">
                    Mín: {item.min_stock} {item.unit}
                  </div>
                  <div className="text-xs text-slate-400">{item.category}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Admin Login Modal */}
      {showAdminModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              🔐 Acceso Admin
            </h3>
            <p className="text-sm text-slate-500 mb-4">
              Ingresa el código para editar tareas
            </p>
            <input
              type="password"
              value={adminCode}
              onChange={(e) => setAdminCode(e.target.value)}
              placeholder="Código de acceso"
              className="w-full p-3 border border-slate-200 rounded-lg text-center text-2xl tracking-widest font-mono focus:outline-none focus:border-[#00B4FF]"
              maxLength={4}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowAdminModal(false);
                  setAdminCode("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdminLogin}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold"
              >
                Entrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              ➕ Nueva Tarea
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Tarea (Español)
                </label>
                <input
                  type="text"
                  value={newTask.task_es}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task_es: e.target.value })
                  }
                  placeholder="Descripción de la tarea"
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Task (English)
                </label>
                <input
                  type="text"
                  value={newTask.task}
                  onChange={(e) =>
                    setNewTask({ ...newTask, task: e.target.value })
                  }
                  placeholder="Task description"
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Día
                  </label>
                  <select
                    value={newTask.day}
                    onChange={(e) =>
                      setNewTask({ ...newTask, day: e.target.value })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                  >
                    {DAYS_EN.slice(1)
                      .concat(DAYS_EN[0])
                      .map((day, idx) => (
                        <option key={day} value={day}>
                          {DAYS_ES[(idx + 1) % 7]}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Prioridad
                  </label>
                  <select
                    value={newTask.priority}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        priority: e.target.value as
                          | "low"
                          | "normal"
                          | "high"
                          | "urgent",
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Minutos Est.
                  </label>
                  <input
                    type="number"
                    value={newTask.estimated_minutes}
                    onChange={(e) =>
                      setNewTask({
                        ...newTask,
                        estimated_minutes: parseInt(e.target.value) || 15,
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
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">
                      📸 Foto requerida
                    </span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTaskModal(false)}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddTask}
                className="flex-1 py-3 bg-emerald-500 text-white rounded-xl font-semibold"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-slate-900 mb-4">
              ✏️ Editar Tarea
            </h3>
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Tarea (Español)
                </label>
                <input
                  type="text"
                  value={editingTask.task_es}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, task_es: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 block mb-1">
                  Task (English)
                </label>
                <input
                  type="text"
                  value={editingTask.task}
                  onChange={(e) =>
                    setEditingTask({ ...editingTask, task: e.target.value })
                  }
                  className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    Prioridad
                  </label>
                  <select
                    value={editingTask.priority}
                    onChange={(e) =>
                      setEditingTask({
                        ...editingTask,
                        priority: e.target.value as
                          | "low"
                          | "normal"
                          | "high"
                          | "urgent",
                      })
                    }
                    className="w-full p-3 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-[#00B4FF]"
                  >
                    <option value="low">Baja</option>
                    <option value="normal">Normal</option>
                    <option value="high">Alta</option>
                    <option value="urgent">Urgente</option>
                  </select>
                </div>
                <div className="flex items-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editingTask.photo_required}
                      onChange={(e) =>
                        setEditingTask({
                          ...editingTask,
                          photo_required: e.target.checked,
                        })
                      }
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <span className="text-sm text-slate-600">📸 Foto</span>
                  </label>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditTaskModal(false);
                  setEditingTask(null);
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleEditTask}
                className="flex-1 py-3 bg-blue-500 text-white rounded-xl font-semibold"
              >
                Guardar
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
              alt="Foto"
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
              Indica el motivo del rechazo
            </p>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
              className="w-full p-3 border border-slate-200 rounded-lg text-sm resize-none h-28 focus:outline-none focus:border-[#00B4FF]"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason("");
                }}
                className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-semibold"
              >
                Cancelar
              </button>
              <button
                onClick={handleReject}
                disabled={!rejectReason.trim() || processing}
                className="flex-1 py-3 bg-rose-500 text-white rounded-xl font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {processing ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  "Confirmar"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
