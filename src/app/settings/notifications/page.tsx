"use client";

// ============================================
// TVC NOTIFICATION SETTINGS PAGE
// Configure push notifications per user
// ============================================

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface NotificationPreferences {
  id: string;
  user_id: string;
  low_stock_enabled: boolean;
  cleaning_deadline_enabled: boolean;
  checklist_submitted_enabled: boolean;
  task_assigned_enabled: boolean;
  escalation_enabled: boolean;
  order_placed_enabled: boolean;
  maintenance_alert_enabled: boolean;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  prefer_push: boolean;
  fallback_to_whatsapp: boolean;
}

const NOTIFICATION_TYPES = [
  {
    key: "low_stock_enabled",
    label: "Inventario Bajo",
    description: "Alertas cuando un ingrediente esta por debajo del minimo",
    icon: "📦",
  },
  {
    key: "cleaning_deadline_enabled",
    label: "Deadlines de Limpieza",
    description: "Alertas 30 minutos antes de la llegada de huespedes",
    icon: "🧹",
  },
  {
    key: "checklist_submitted_enabled",
    label: "Checklists Completados",
    description: "Cuando un staff completa un checklist",
    icon: "✅",
  },
  {
    key: "task_assigned_enabled",
    label: "Tareas Asignadas",
    description: "Cuando te asignan una nueva tarea",
    icon: "📋",
  },
  {
    key: "escalation_enabled",
    label: "Escalaciones",
    description: "Alertas urgentes que requieren atencion inmediata",
    icon: "🚨",
  },
  {
    key: "order_placed_enabled",
    label: "Nuevos Pedidos",
    description: "Cuando un huesped hace un pedido de comida/bebidas",
    icon: "🍽️",
  },
  {
    key: "maintenance_alert_enabled",
    label: "Alertas de Mantenimiento",
    description: "Problemas reportados que requieren reparacion",
    icon: "🔧",
  },
];

export default function NotificationSettingsPage() {
  const [preferences, setPreferences] =
    useState<NotificationPreferences | null>(null);
  const [activeSubscriptions, setActiveSubscriptions] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [pushSupported, setPushSupported] = useState(false);
  const [pushPermission, setPushPermission] = useState<
    "default" | "granted" | "denied"
  >("default");

  // Check push support
  useEffect(() => {
    if (typeof window !== "undefined") {
      setPushSupported("PushManager" in window && "serviceWorker" in navigator);
      if ("Notification" in window) {
        setPushPermission(Notification.permission);
      }
    }
  }, []);

  // Load user from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("tvc_staff_user");
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.id);
      } catch {
        setError("Error al cargar usuario");
      }
    } else {
      setError("No hay usuario autenticado");
    }
  }, []);

  // Load preferences
  const loadPreferences = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/notifications/preferences?userId=${userId}`,
      );
      const data = await res.json();

      if (data.success) {
        setPreferences(data.preferences);
        setActiveSubscriptions(data.activeSubscriptions || 0);
      } else {
        setError(data.message || "Error al cargar preferencias");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  // Save preferences
  async function savePreferences() {
    if (!userId || !preferences) return;

    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch("/api/notifications/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          preferences: {
            low_stock_enabled: preferences.low_stock_enabled,
            cleaning_deadline_enabled: preferences.cleaning_deadline_enabled,
            checklist_submitted_enabled:
              preferences.checklist_submitted_enabled,
            task_assigned_enabled: preferences.task_assigned_enabled,
            escalation_enabled: preferences.escalation_enabled,
            order_placed_enabled: preferences.order_placed_enabled,
            maintenance_alert_enabled: preferences.maintenance_alert_enabled,
            quiet_hours_enabled: preferences.quiet_hours_enabled,
            quiet_hours_start: preferences.quiet_hours_start,
            quiet_hours_end: preferences.quiet_hours_end,
            prefer_push: preferences.prefer_push,
            fallback_to_whatsapp: preferences.fallback_to_whatsapp,
          },
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSuccess("Preferencias guardadas");
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(data.message || "Error al guardar");
      }
    } catch {
      setError("Error de conexion");
    } finally {
      setIsSaving(false);
    }
  }

  // Request push permission
  async function requestPushPermission() {
    if (!pushSupported || !userId) return;

    try {
      const permission = await Notification.requestPermission();
      setPushPermission(permission);

      if (permission === "granted") {
        // Get service worker registration
        const registration = await navigator.serviceWorker.ready;

        // Get VAPID key
        const keyRes = await fetch("/api/notifications/subscribe");
        const keyData = await keyRes.json();

        if (!keyData.vapidPublicKey) {
          setError("Notificaciones push no configuradas");
          return;
        }

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyData.vapidPublicKey),
        });

        // Send subscription to server
        const subRes = await fetch("/api/notifications/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            subscription: subscription.toJSON(),
            deviceInfo: {
              userAgent: navigator.userAgent,
              platform: navigator.platform,
              language: navigator.language,
            },
          }),
        });

        const subData = await subRes.json();

        if (subData.success) {
          setSuccess("Notificaciones activadas");
          setActiveSubscriptions((prev) => prev + 1);
        } else {
          setError(subData.message || "Error al activar notificaciones");
        }
      }
    } catch (err) {
      console.error("Push subscription error:", err);
      setError("Error al activar notificaciones push");
    }
  }

  // Toggle preference
  function togglePreference(key: keyof NotificationPreferences) {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: !preferences[key],
    });
  }

  // Update time preference
  function updateTimePreference(key: string, value: string) {
    if (!preferences) return;
    setPreferences({
      ...preferences,
      [key]: value,
    });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-lg mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-slate-800 rounded w-3/4" />
            <div className="h-32 bg-slate-800 rounded" />
            <div className="h-32 bg-slate-800 rounded" />
          </div>
        </div>
      </div>
    );
  }

  if (error && !preferences) {
    return (
      <div className="min-h-screen bg-slate-900 p-4">
        <div className="max-w-lg mx-auto">
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-4 text-center">
            <p className="text-red-400">{error}</p>
            <Link
              href="/staff/login"
              className="mt-4 inline-block px-4 py-2 bg-slate-700 rounded-lg text-white"
            >
              Iniciar Sesion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 p-4 sticky top-0 z-10">
        <div className="max-w-lg mx-auto flex items-center gap-4">
          <Link
            href="/staff/tasks"
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <svg
              className="w-6 h-6 text-white"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <h1 className="text-lg font-semibold text-white">
            Configuracion de Notificaciones
          </h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto p-4 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-emerald-900/30 border border-emerald-500/50 rounded-lg p-3">
            <p className="text-emerald-400 text-sm">{success}</p>
          </div>
        )}

        {/* Push Status Card */}
        <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
          <h2 className="text-white font-medium mb-3 flex items-center gap-2">
            <span className="text-2xl">🔔</span>
            Notificaciones Push
          </h2>

          {!pushSupported ? (
            <p className="text-slate-400 text-sm">
              Tu navegador no soporta notificaciones push. Usa Chrome, Safari o
              Firefox para activarlas.
            </p>
          ) : pushPermission === "denied" ? (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-400 text-sm">
                Las notificaciones estan bloqueadas. Ve a la configuracion de tu
                navegador para permitirlas.
              </p>
            </div>
          ) : pushPermission === "granted" ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-emerald-400 text-sm font-medium">
                  Notificaciones Activas
                </p>
                <p className="text-slate-400 text-xs">
                  {activeSubscriptions} dispositivo(s) registrado(s)
                </p>
              </div>
              <span className="text-2xl">✅</span>
            </div>
          ) : (
            <button
              onClick={requestPushPermission}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg transition-colors"
            >
              Activar Notificaciones Push
            </button>
          )}
        </div>

        {/* Notification Types */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <h2 className="text-white font-medium p-4 border-b border-slate-700">
            Tipos de Notificacion
          </h2>

          <div className="divide-y divide-slate-700/50">
            {NOTIFICATION_TYPES.map((type) => (
              <div
                key={type.key}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-2xl">{type.icon}</span>
                  <div>
                    <p className="text-white font-medium text-sm">
                      {type.label}
                    </p>
                    <p className="text-slate-400 text-xs mt-0.5">
                      {type.description}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    togglePreference(type.key as keyof NotificationPreferences)
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    preferences?.[type.key as keyof NotificationPreferences]
                      ? "bg-emerald-600"
                      : "bg-slate-600"
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      preferences?.[type.key as keyof NotificationPreferences]
                        ? "translate-x-7"
                        : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Quiet Hours */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <div className="p-4 flex items-center justify-between border-b border-slate-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🌙</span>
              <div>
                <p className="text-white font-medium">Horas de Silencio</p>
                <p className="text-slate-400 text-xs">
                  No enviar notificaciones durante este horario
                </p>
              </div>
            </div>
            <button
              onClick={() => togglePreference("quiet_hours_enabled")}
              className={`relative w-12 h-6 rounded-full transition-colors ${
                preferences?.quiet_hours_enabled
                  ? "bg-emerald-600"
                  : "bg-slate-600"
              }`}
            >
              <span
                className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  preferences?.quiet_hours_enabled
                    ? "translate-x-7"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {preferences?.quiet_hours_enabled && (
            <div className="p-4 grid grid-cols-2 gap-4">
              <div>
                <label className="text-slate-400 text-xs block mb-1">
                  Inicio
                </label>
                <input
                  type="time"
                  value={preferences.quiet_hours_start || "22:00"}
                  onChange={(e) =>
                    updateTimePreference("quiet_hours_start", e.target.value)
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="text-slate-400 text-xs block mb-1">Fin</label>
                <input
                  type="time"
                  value={preferences.quiet_hours_end || "07:00"}
                  onChange={(e) =>
                    updateTimePreference("quiet_hours_end", e.target.value)
                  }
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
            </div>
          )}
        </div>

        {/* Delivery Preferences */}
        <div className="bg-slate-800 rounded-xl border border-slate-700 overflow-hidden">
          <h2 className="text-white font-medium p-4 border-b border-slate-700">
            Metodo de Entrega
          </h2>

          <div className="divide-y divide-slate-700/50">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📱</span>
                <div>
                  <p className="text-white font-medium text-sm">
                    Preferir Push
                  </p>
                  <p className="text-slate-400 text-xs">
                    Usar notificaciones push como primera opcion
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePreference("prefer_push")}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences?.prefer_push ? "bg-emerald-600" : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences?.prefer_push ? "translate-x-7" : "translate-x-1"
                  }`}
                />
              </button>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">💬</span>
                <div>
                  <p className="text-white font-medium text-sm">
                    Respaldo WhatsApp
                  </p>
                  <p className="text-slate-400 text-xs">
                    Enviar por WhatsApp si push falla
                  </p>
                </div>
              </div>
              <button
                onClick={() => togglePreference("fallback_to_whatsapp")}
                className={`relative w-12 h-6 rounded-full transition-colors ${
                  preferences?.fallback_to_whatsapp
                    ? "bg-emerald-600"
                    : "bg-slate-600"
                }`}
              >
                <span
                  className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                    preferences?.fallback_to_whatsapp
                      ? "translate-x-7"
                      : "translate-x-1"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          onClick={savePreferences}
          disabled={isSaving}
          className="w-full py-4 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-600 text-white font-semibold rounded-xl transition-colors"
        >
          {isSaving ? "Guardando..." : "Guardar Cambios"}
        </button>

        {/* Info */}
        <p className="text-slate-500 text-xs text-center">
          Las notificaciones urgentes (escalaciones) siempre se envian incluso
          durante horas de silencio.
        </p>
      </div>
    </div>
  );
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
