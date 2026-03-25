"use client";

import { useEffect, useState, useCallback } from "react";
import { createBrowserClient } from "@/lib/supabase/client";
import type { Tables } from "@/types/database";

type DelegationSetting = Tables<"delegation_settings">;
type User = Tables<"users">;

const DEPARTMENTS = [
  { value: "housekeeping", label: "Limpieza", labelEn: "Housekeeping" },
  { value: "kitchen", label: "Cocina", labelEn: "Kitchen" },
  { value: "maintenance", label: "Mantenimiento", labelEn: "Maintenance" },
  { value: "pool", label: "Piscina", labelEn: "Pool" },
  { value: "management", label: "Gerencia", labelEn: "Management" },
];

const CHECKLIST_TYPES = [
  { value: "villa_retouch", label: "Retoque de Villa" },
  { value: "villa_occupied", label: "Villa Ocupada" },
  { value: "villa_empty_arriving", label: "Villa Vacia (Llegada)" },
  { value: "villa_leaving", label: "Villa Salida" },
  { value: "pool_8am", label: "Piscina 8am" },
  { value: "pool_2pm", label: "Piscina 2pm" },
  { value: "pool_8pm", label: "Piscina 8pm" },
  { value: "breakfast_setup", label: "Preparacion Desayuno" },
  { value: "common_area", label: "Areas Comunes" },
];

export default function DelegationSettingsPage() {
  const [settings, setSettings] = useState<DelegationSetting[]>([]);
  const [managers, setManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error";
  } | null>(null);

  const loadData = useCallback(async () => {
    const supabase = createBrowserClient();

    const [settingsRes, managersRes] = await Promise.all([
      supabase.from("delegation_settings").select("*").order("department"),
      supabase
        .from("users")
        .select("*")
        .in("role", ["owner", "manager"])
        .eq("is_active", true)
        .order("name"),
    ]);

    if (settingsRes.data) setSettings(settingsRes.data);
    if (managersRes.data) setManagers(managersRes.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const updateSetting = async (
    settingId: string,
    updates: Partial<DelegationSetting>,
  ) => {
    setSaving(settingId);
    const supabase = createBrowserClient();

    const { error } = await supabase
      .from("delegation_settings")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", settingId);

    if (error) {
      console.error("Error updating setting:", error);
      showToast("Error al guardar cambios", "error");
    } else {
      showToast("Cambios guardados", "success");
      // Actualizar estado local
      setSettings((prev) =>
        prev.map((s) => (s.id === settingId ? { ...s, ...updates } : s)),
      );
    }

    setSaving(null);
  };

  const getSettingForDept = (
    dept: string | null,
  ): DelegationSetting | undefined => {
    return settings.find((s) => s.department === dept);
  };

  const globalSetting = getSettingForDept(null);

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-700 rounded w-1/3" />
          <div className="h-64 bg-slate-700 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            toast.type === "success"
              ? "bg-green-500/90 text-white"
              : "bg-red-500/90 text-white"
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">
          Configuracion de Delegacion
        </h1>
        <p className="text-white/60">
          Configura managers de respaldo, tiempos de escalacion y
          auto-aprobaciones por departamento.
        </p>
      </div>

      {/* Global Settings */}
      {globalSetting && (
        <div className="bg-slate-800 rounded-xl p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
              <span className="text-xl">🌐</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">
                Configuracion Global
              </h2>
              <p className="text-sm text-white/50">
                Valores por defecto para todos los departamentos
              </p>
            </div>
          </div>

          <TimeoutSettings
            setting={globalSetting}
            managers={managers}
            onUpdate={(updates) => updateSetting(globalSetting.id, updates)}
            saving={saving === globalSetting.id}
          />
        </div>
      )}

      {/* Department Settings */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Por Departamento</h2>

        {DEPARTMENTS.map((dept) => {
          const setting = getSettingForDept(dept.value);
          const isExpanded = expandedDept === dept.value;

          return (
            <div
              key={dept.value}
              className="bg-slate-800 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => setExpandedDept(isExpanded ? null : dept.value)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <DepartmentIcon department={dept.value} />
                  <div className="text-left">
                    <div className="font-medium text-white">{dept.label}</div>
                    <div className="text-sm text-white/50">
                      {setting?.auto_approve_enabled ? (
                        <span className="text-green-400">
                          Auto-aprobacion activa
                        </span>
                      ) : (
                        "Manual"
                      )}
                    </div>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-white/50 transition-transform ${
                    isExpanded ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 9l-7 7-7-7"
                  />
                </svg>
              </button>

              {isExpanded && setting && (
                <div className="px-6 pb-6 border-t border-slate-700">
                  <div className="pt-4">
                    <TimeoutSettings
                      setting={setting}
                      managers={managers}
                      onUpdate={(updates) => updateSetting(setting.id, updates)}
                      saving={saving === setting.id}
                      showAutoApprove
                    />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Card */}
      <div className="mt-8 bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
        <h3 className="font-medium text-blue-400 mb-2">
          Como funciona el sistema de escalaciones
        </h3>
        <ul className="text-sm text-white/70 space-y-2">
          <li className="flex items-start gap-2">
            <span className="text-yellow-400">30m</span>
            <span>
              Primer recordatorio al manager asignado. La prioridad sube un
              nivel.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-orange-400">60m</span>
            <span>
              Se notifica al manager de respaldo. Ambos managers reciben
              alertas.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-red-400">120m</span>
            <span>
              Se marca como CRITICO. Todos los managers son notificados.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-purple-400">180m</span>
            <span>
              Auto-ruta: Si esta habilitado, se auto-aprueba. Si no, queda
              marcado para revision.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
}

function DepartmentIcon({ department }: { department: string }) {
  const icons: Record<string, { emoji: string; bgColor: string }> = {
    housekeeping: { emoji: "🧹", bgColor: "bg-cyan-500/20" },
    kitchen: { emoji: "👨‍🍳", bgColor: "bg-orange-500/20" },
    maintenance: { emoji: "🔧", bgColor: "bg-yellow-500/20" },
    pool: { emoji: "🏊", bgColor: "bg-blue-500/20" },
    management: { emoji: "📊", bgColor: "bg-purple-500/20" },
  };

  const { emoji, bgColor } = icons[department] || {
    emoji: "📋",
    bgColor: "bg-slate-500/20",
  };

  return (
    <div
      className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center`}
    >
      <span className="text-xl">{emoji}</span>
    </div>
  );
}

interface TimeoutSettingsProps {
  setting: DelegationSetting;
  managers: User[];
  onUpdate: (updates: Partial<DelegationSetting>) => void;
  saving: boolean;
  showAutoApprove?: boolean;
}

function TimeoutSettings({
  setting,
  managers,
  onUpdate,
  saving,
  showAutoApprove,
}: TimeoutSettingsProps) {
  const [localValues, setLocalValues] = useState({
    primary_manager_id: setting.primary_manager_id || "",
    backup_manager_id: setting.backup_manager_id || "",
    secondary_backup_id: setting.secondary_backup_id || "",
    first_reminder_minutes: setting.first_reminder_minutes,
    backup_notify_minutes: setting.backup_notify_minutes,
    critical_escalation_minutes: setting.critical_escalation_minutes,
    auto_route_minutes: setting.auto_route_minutes,
    auto_approve_enabled: setting.auto_approve_enabled,
    auto_approve_types: setting.auto_approve_types || [],
    auto_approve_after_minutes: setting.auto_approve_after_minutes,
    notify_via_whatsapp: setting.notify_via_whatsapp,
  });

  const handleSave = () => {
    onUpdate({
      primary_manager_id: localValues.primary_manager_id || null,
      backup_manager_id: localValues.backup_manager_id || null,
      secondary_backup_id: localValues.secondary_backup_id || null,
      first_reminder_minutes: localValues.first_reminder_minutes,
      backup_notify_minutes: localValues.backup_notify_minutes,
      critical_escalation_minutes: localValues.critical_escalation_minutes,
      auto_route_minutes: localValues.auto_route_minutes,
      auto_approve_enabled: localValues.auto_approve_enabled,
      auto_approve_types: localValues.auto_approve_types,
      auto_approve_after_minutes: localValues.auto_approve_after_minutes,
      notify_via_whatsapp: localValues.notify_via_whatsapp,
    });
  };

  const toggleAutoApproveType = (type: string) => {
    setLocalValues((prev) => {
      const currentTypes = prev.auto_approve_types;
      if (currentTypes.includes(type)) {
        return {
          ...prev,
          auto_approve_types: currentTypes.filter((t) => t !== type),
        };
      }
      return {
        ...prev,
        auto_approve_types: [...currentTypes, type],
      };
    });
  };

  return (
    <div className="space-y-6">
      {/* Manager Selection */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Manager Principal
          </label>
          <select
            value={localValues.primary_manager_id}
            onChange={(e) =>
              setLocalValues({
                ...localValues,
                primary_manager_id: e.target.value,
              })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Sin asignar</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Manager de Respaldo
          </label>
          <select
            value={localValues.backup_manager_id}
            onChange={(e) =>
              setLocalValues({
                ...localValues,
                backup_manager_id: e.target.value,
              })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Sin asignar</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-white/70 mb-2">
            Respaldo Secundario
          </label>
          <select
            value={localValues.secondary_backup_id}
            onChange={(e) =>
              setLocalValues({
                ...localValues,
                secondary_backup_id: e.target.value,
              })
            }
            className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
          >
            <option value="">Sin asignar</option>
            {managers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} ({m.role})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Timeout Configuration */}
      <div>
        <h4 className="text-sm font-medium text-white/70 mb-3">
          Tiempos de Escalacion (minutos)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-white/50 mb-1">
              1er Recordatorio
            </label>
            <input
              type="number"
              min={5}
              max={120}
              value={localValues.first_reminder_minutes}
              onChange={(e) =>
                setLocalValues({
                  ...localValues,
                  first_reminder_minutes: parseInt(e.target.value) || 30,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Notif. Respaldo
            </label>
            <input
              type="number"
              min={15}
              max={180}
              value={localValues.backup_notify_minutes}
              onChange={(e) =>
                setLocalValues({
                  ...localValues,
                  backup_notify_minutes: parseInt(e.target.value) || 60,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Escalar Critico
            </label>
            <input
              type="number"
              min={30}
              max={300}
              value={localValues.critical_escalation_minutes}
              onChange={(e) =>
                setLocalValues({
                  ...localValues,
                  critical_escalation_minutes: parseInt(e.target.value) || 120,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Auto-Ruta
            </label>
            <input
              type="number"
              min={60}
              max={480}
              value={localValues.auto_route_minutes}
              onChange={(e) =>
                setLocalValues({
                  ...localValues,
                  auto_route_minutes: parseInt(e.target.value) || 180,
                })
              }
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-center"
            />
          </div>
        </div>
      </div>

      {/* Auto-Approve Settings */}
      {showAutoApprove && (
        <div className="bg-slate-700/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="font-medium text-white">Auto-Aprobacion</h4>
              <p className="text-sm text-white/50">
                Aprobar automaticamente checklists si no hay respuesta
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localValues.auto_approve_enabled}
                onChange={(e) =>
                  setLocalValues({
                    ...localValues,
                    auto_approve_enabled: e.target.checked,
                  })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-slate-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-500"></div>
            </label>
          </div>

          {localValues.auto_approve_enabled && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm text-white/70 mb-2">
                  Tipos de checklist que se auto-aprueban:
                </label>
                <div className="flex flex-wrap gap-2">
                  {CHECKLIST_TYPES.map((type) => (
                    <button
                      key={type.value}
                      onClick={() => toggleAutoApproveType(type.value)}
                      className={`px-3 py-1 rounded-full text-sm transition-colors ${
                        localValues.auto_approve_types.includes(type.value)
                          ? "bg-green-500/20 text-green-400 border border-green-500/50"
                          : "bg-slate-600/50 text-white/60 border border-slate-500/30"
                      }`}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-1">
                  Auto-aprobar despues de (minutos):
                </label>
                <input
                  type="number"
                  min={60}
                  max={480}
                  value={localValues.auto_approve_after_minutes}
                  onChange={(e) =>
                    setLocalValues({
                      ...localValues,
                      auto_approve_after_minutes:
                        parseInt(e.target.value) || 120,
                    })
                  }
                  className="w-32 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notification Settings */}
      <div className="flex items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={localValues.notify_via_whatsapp}
            onChange={(e) =>
              setLocalValues({
                ...localValues,
                notify_via_whatsapp: e.target.checked,
              })
            }
            className="w-4 h-4 rounded border-slate-500 bg-slate-700 text-green-500 focus:ring-green-500"
          />
          <span className="text-sm text-white/70">Notificar via WhatsApp</span>
        </label>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-green-500 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors flex items-center gap-2"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </div>
  );
}
