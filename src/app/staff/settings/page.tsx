"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";
import { useRouter } from "next/navigation";

// ═══════════════════════════════════════════════════════════════
// TVC STAFF SETTINGS - Issue #10
// Configuracion de atajos rapidos y pagina de inicio
// ═══════════════════════════════════════════════════════════════

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string | null;
  default_landing_page: string | null;
}

interface LandingPageOption {
  value: string;
  label: string;
  icon: string;
  description: string;
  roles: string[];
  departments: string[];
}

const LANDING_PAGE_OPTIONS: LandingPageOption[] = [
  {
    value: "/staff/tasks",
    label: "Mis Tareas",
    icon: "📋",
    description: "Lista de tareas del dia",
    roles: ["staff", "manager", "owner"],
    departments: ["all"],
  },
  {
    value: "/staff/pos",
    label: "Punto de Venta",
    icon: "🧾",
    description: "Tomar ordenes rapidamente",
    roles: ["staff", "manager"],
    departments: ["kitchen", "front_desk"],
  },
  {
    value: "/staff/checklist",
    label: "Checklists",
    icon: "✅",
    description: "Checklists de limpieza y areas",
    roles: ["staff", "manager"],
    departments: ["housekeeping", "pool", "maintenance"],
  },
  {
    value: "/staff/kitchen",
    label: "Cocina",
    icon: "👨‍🍳",
    description: "Desperdicios, botellas, cierre",
    roles: ["staff", "manager"],
    departments: ["kitchen"],
  },
  {
    value: "/staff/bar",
    label: "Bar",
    icon: "🍸",
    description: "Dashboard de bar",
    roles: ["staff", "manager"],
    departments: ["kitchen"],
  },
  {
    value: "/staff/maintenance",
    label: "Mantenimiento",
    icon: "🔧",
    description: "Tareas de mantenimiento",
    roles: ["staff", "manager"],
    departments: ["maintenance"],
  },
  {
    value: "/staff/inventory",
    label: "Inventario",
    icon: "📦",
    description: "Control de inventario",
    roles: ["staff", "manager"],
    departments: ["kitchen", "housekeeping"],
  },
  {
    value: "/ops",
    label: "Operaciones",
    icon: "📊",
    description: "Dashboard de operaciones",
    roles: ["manager", "owner"],
    departments: ["all"],
  },
  {
    value: "/dashboard",
    label: "Dashboard Principal",
    icon: "🏠",
    description: "Vista ejecutiva",
    roles: ["owner"],
    departments: ["all"],
  },
];

const QUICK_ACTION_OPTIONS = [
  { value: "/staff/tasks", label: "Tareas", icon: "📋" },
  { value: "/staff/pos", label: "POS", icon: "🧾" },
  { value: "/staff/checklist", label: "Checklists", icon: "✅" },
  { value: "/staff/inventory", label: "Inventario", icon: "📦" },
  { value: "/staff/kitchen", label: "Cocina", icon: "👨‍🍳" },
  { value: "/staff/bar", label: "Bar", icon: "🍸" },
  { value: "/staff/maintenance", label: "Mantenimiento", icon: "🔧" },
  { value: "/staff/linen", label: "Ropa Blanca", icon: "🛏️" },
  { value: "/staff/services", label: "Servicios", icon: "🛎️" },
  { value: "/staff/bot", label: "Asistente AI", icon: "🤖" },
  { value: "/staff/training", label: "Entrenamiento", icon: "📚" },
];

export default function StaffSettingsPage() {
  const router = useRouter();
  const { t, lang, setLang } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [selectedLandingPage, setSelectedLandingPage] = useState<string>("");
  const [selectedQuickActions, setSelectedQuickActions] = useState<string[]>([]);

  const loadProfile = useCallback(async () => {
    const supabase = createBrowserClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push("/staff/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("users")
      .select("id, name, email, role, department, default_landing_page, preferences")
      .eq("auth_id", user.id)
      .single();

    if (profileData) {
      setProfile({
        id: profileData.id,
        name: profileData.name,
        email: profileData.email,
        role: profileData.role,
        department: profileData.department,
        default_landing_page: profileData.default_landing_page,
      });

      setSelectedLandingPage(profileData.default_landing_page || "");

      // Cargar quick actions de preferencias
      const prefs = profileData.preferences as Record<string, unknown>;
      if (prefs?.quick_actions) {
        setSelectedQuickActions(prefs.quick_actions as string[]);
      } else {
        // Defaults por departamento
        setSelectedQuickActions(
          getDefaultQuickActions(profileData.department)
        );
      }
    }

    setLoading(false);
  }, [router]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);
    const supabase = createBrowserClient();

    try {
      // Obtener preferencias actuales
      const { data: currentData } = await supabase
        .from("users")
        .select("preferences")
        .eq("id", profile.id)
        .single();

      const currentPrefs =
        (currentData?.preferences as Record<string, unknown>) || {};

      // Actualizar usuario
      const { error } = await supabase
        .from("users")
        .update({
          default_landing_page: selectedLandingPage || null,
          preferences: {
            ...currentPrefs,
            quick_actions: selectedQuickActions,
            language: lang,
          },
          updated_at: new Date().toISOString(),
        })
        .eq("id", profile.id);

      if (error) {
        console.error("[Settings] Error saving:", error);
        alert("Error al guardar configuracion");
        return;
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error("[Settings] Error:", error);
      alert("Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const toggleQuickAction = (value: string) => {
    setSelectedQuickActions((prev) => {
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }
      if (prev.length >= 5) {
        // Maximo 5 acciones rapidas
        return prev;
      }
      return [...prev, value];
    });
  };

  const getFilteredLandingOptions = () => {
    if (!profile) return [];

    return LANDING_PAGE_OPTIONS.filter((option) => {
      // Verificar rol
      if (!option.roles.includes(profile.role)) return false;

      // Verificar departamento
      if (option.departments.includes("all")) return true;
      if (!profile.department) return false;
      return option.departments.includes(profile.department);
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <span className="text-2xl">⚙️</span> Configuracion
        </h1>
        <p className="text-xs text-slate-400">
          Personaliza tu experiencia en la app
        </p>
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-400 text-sm">
          Configuracion guardada exitosamente
        </div>
      )}

      {/* Profile Info */}
      <div className="bg-slate-800 rounded-xl p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 flex items-center justify-center text-lg font-bold">
            {profile?.name?.charAt(0) || "?"}
          </div>
          <div>
            <div className="font-bold">{profile?.name}</div>
            <div className="text-xs text-slate-400">
              {profile?.role === "owner"
                ? "Propietario"
                : profile?.role === "manager"
                  ? "Gerente"
                  : "Personal"}
              {profile?.department && ` • ${getDepartmentLabel(profile.department)}`}
            </div>
          </div>
        </div>
      </div>

      {/* Pagina de Inicio */}
      <div>
        <div className="text-sm font-bold mb-3 flex items-center gap-2">
          <span>🏠</span> Pagina de Inicio
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Elige donde quieres ir cuando abras la app
        </p>

        <div className="space-y-2">
          {/* Opcion automatica */}
          <button
            onClick={() => setSelectedLandingPage("")}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              selectedLandingPage === ""
                ? "bg-cyan-500/20 border-cyan-500/50"
                : "bg-slate-800 border-slate-700 hover:border-slate-600"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">🎯</span>
              <div>
                <div className="font-medium text-sm">Automatico</div>
                <div className="text-xs text-slate-400">
                  Basado en tu rol y departamento
                </div>
              </div>
              {selectedLandingPage === "" && (
                <span className="ml-auto text-cyan-400">✓</span>
              )}
            </div>
          </button>

          {/* Opciones disponibles */}
          {getFilteredLandingOptions().map((option) => (
            <button
              key={option.value}
              onClick={() => setSelectedLandingPage(option.value)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedLandingPage === option.value
                  ? "bg-cyan-500/20 border-cyan-500/50"
                  : "bg-slate-800 border-slate-700 hover:border-slate-600"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{option.icon}</span>
                <div>
                  <div className="font-medium text-sm">{option.label}</div>
                  <div className="text-xs text-slate-400">
                    {option.description}
                  </div>
                </div>
                {selectedLandingPage === option.value && (
                  <span className="ml-auto text-cyan-400">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Acciones Rapidas */}
      <div>
        <div className="text-sm font-bold mb-3 flex items-center gap-2">
          <span>⚡</span> Acciones Rapidas
        </div>
        <p className="text-xs text-slate-400 mb-3">
          Selecciona hasta 5 acciones para acceso rapido (
          {selectedQuickActions.length}/5)
        </p>

        <div className="grid grid-cols-3 gap-2">
          {QUICK_ACTION_OPTIONS.map((option) => {
            const isSelected = selectedQuickActions.includes(option.value);
            const isDisabled = !isSelected && selectedQuickActions.length >= 5;

            return (
              <button
                key={option.value}
                onClick={() => !isDisabled && toggleQuickAction(option.value)}
                disabled={isDisabled}
                className={`p-3 rounded-lg border text-center transition-colors ${
                  isSelected
                    ? "bg-cyan-500/20 border-cyan-500/50"
                    : isDisabled
                      ? "bg-slate-900 border-slate-800 opacity-50 cursor-not-allowed"
                      : "bg-slate-800 border-slate-700 hover:border-slate-600"
                }`}
              >
                <span className="text-xl block mb-1">{option.icon}</span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Idioma */}
      <div>
        <div className="text-sm font-bold mb-3 flex items-center gap-2">
          <span>🌐</span> Idioma
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setLang("es")}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              lang === "es"
                ? "bg-cyan-500 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            🇨🇴 Espanol
          </button>
          <button
            onClick={() => setLang("en")}
            className={`flex-1 py-3 rounded-lg font-medium transition-colors ${
              lang === "en"
                ? "bg-cyan-500 text-white"
                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
            }`}
          >
            🇺🇸 English
          </button>
        </div>
      </div>

      {/* Guardar */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-4 bg-cyan-500 text-white rounded-xl font-bold text-lg hover:bg-cyan-600 disabled:opacity-50 transition-colors"
      >
        {saving ? "Guardando..." : "Guardar Configuracion"}
      </button>

      {/* Cerrar Sesion */}
      <button
        onClick={async () => {
          const supabase = createBrowserClient();
          await supabase.auth.signOut();
          router.push("/staff/login");
        }}
        className="w-full py-3 bg-slate-800 text-red-400 rounded-xl font-medium hover:bg-slate-700 transition-colors"
      >
        Cerrar Sesion
      </button>
    </div>
  );
}

function getDepartmentLabel(department: string): string {
  const labels: Record<string, string> = {
    kitchen: "Cocina",
    housekeeping: "Limpieza",
    maintenance: "Mantenimiento",
    pool: "Piscina",
    front_desk: "Recepcion",
    management: "Gerencia",
  };
  return labels[department] || department;
}

function getDefaultQuickActions(department: string | null): string[] {
  switch (department) {
    case "kitchen":
      return ["/staff/pos", "/staff/inventory", "/staff/kitchen"];
    case "housekeeping":
      return ["/staff/checklist", "/staff/tasks", "/staff/linen"];
    case "maintenance":
      return ["/staff/tasks", "/staff/checklist"];
    case "pool":
      return ["/staff/checklist", "/staff/tasks"];
    case "front_desk":
      return ["/staff/tasks", "/staff/services"];
    default:
      return ["/staff/tasks", "/staff/checklist", "/staff/inventory"];
  }
}
