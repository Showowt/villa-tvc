"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

interface GuestProfile {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  country: string | null;
  language: string;
  total_stays: number;
  total_nights: number;
  total_spent: number;
  first_stay: string | null;
  last_stay: string | null;
  allergies: string[];
  dietary_preferences: string[];
  special_dates: SpecialDate[];
  tags: string[];
  is_vip: boolean;
  vip_reason: string | null;
  internal_notes: string | null;
}

interface SpecialDate {
  type: string;
  date: string;
  name?: string;
}

interface OccasionTask {
  id: string;
  booking_id: string;
  villa_id: string;
  occasion_type: string;
  occasion_details: string;
  department: string;
  task_title: string;
  task_title_es: string;
  task_date: string;
  status: string;
  priority: number;
}

interface TodayArrival {
  id: string;
  villa_id: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  num_adults: number;
  is_returning_guest: boolean;
  detected_occasions: DetectedOccasion[];
  guest_profile: GuestProfile | null;
}

interface DetectedOccasion {
  type: string;
  details: string;
  detailsEs: string;
}

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

const OCCASION_EMOJIS: Record<string, string> = {
  birthday: "🎂",
  anniversary: "💍",
  honeymoon: "💑",
  celebration: "🎉",
  proposal: "💎",
  baby_shower: "👶",
  graduation: "🎓",
  retirement: "🏖️",
  welcome_back: "👋",
  vip_arrival: "⭐",
  special_dietary: "🥗",
  other: "✨",
};

const OCCASION_NAMES_ES: Record<string, string> = {
  birthday: "Cumpleaños",
  anniversary: "Aniversario",
  honeymoon: "Luna de Miel",
  celebration: "Celebración",
  proposal: "Propuesta",
  baby_shower: "Baby Shower",
  graduation: "Graduación",
  retirement: "Jubilación",
  welcome_back: "Bienvenida",
  vip_arrival: "Llegada VIP",
  special_dietary: "Dieta Especial",
  other: "Ocasión Especial",
};

const DEPARTMENT_COLORS: Record<string, string> = {
  kitchen: "bg-orange-100 text-orange-800 border-orange-200",
  bar: "bg-purple-100 text-purple-800 border-purple-200",
  housekeeping: "bg-blue-100 text-blue-800 border-blue-200",
  concierge: "bg-green-100 text-green-800 border-green-200",
  management: "bg-red-100 text-red-800 border-red-200",
};

const DEPARTMENT_NAMES_ES: Record<string, string> = {
  kitchen: "Cocina",
  bar: "Bar",
  housekeeping: "Housekeeping",
  concierge: "Concierge",
  management: "Gerencia",
};

// ═══════════════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export default function GuestProfilesPage() {
  const [activeTab, setActiveTab] = useState<
    "arrivals" | "profiles" | "occasions" | "vip"
  >("arrivals");
  const [arrivals, setArrivals] = useState<TodayArrival[]>([]);
  const [profiles, setProfiles] = useState<GuestProfile[]>([]);
  const [occasionTasks, setOccasionTasks] = useState<OccasionTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProfile, setSelectedProfile] = useState<GuestProfile | null>(
    null,
  );
  const [configError, setConfigError] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    if (!isBrowserClientAvailable()) {
      setConfigError(true);
      setLoading(false);
      return;
    }

    setLoading(true);
    const supabase = createBrowserClient();

    try {
      if (activeTab === "arrivals") {
        // Cargar llegadas de hoy con perfiles
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("villa_bookings")
          .select(
            `
            *,
            guest_profile:guest_profiles(*)
          `,
          )
          .eq("check_in", today)
          .not("status", "eq", "cancelled")
          .order("villa_id");

        setArrivals((data as unknown as TodayArrival[]) || []);
      } else if (activeTab === "profiles") {
        // Cargar perfiles recientes
        const { data } = await supabase
          .from("guest_profiles")
          .select("*")
          .order("updated_at", { ascending: false })
          .limit(50);

        setProfiles((data as unknown as GuestProfile[]) || []);
      } else if (activeTab === "occasions") {
        // Cargar tareas de ocasión pendientes
        const today = new Date().toISOString().split("T")[0];
        const { data } = await supabase
          .from("occasion_tasks")
          .select("*")
          .gte("task_date", today)
          .eq("status", "pending")
          .order("task_date")
          .order("priority");

        setOccasionTasks((data as unknown as OccasionTask[]) || []);
      } else if (activeTab === "vip") {
        // Cargar huéspedes VIP
        const { data } = await supabase
          .from("guest_profiles")
          .select("*")
          .eq("is_vip", true)
          .order("total_stays", { ascending: false });

        setProfiles((data as unknown as GuestProfile[]) || []);
      }
    } catch (error) {
      console.error("[loadData]", error);
    } finally {
      setLoading(false);
    }
  };

  const searchProfiles = async () => {
    if (searchTerm.length < 2) return;

    const supabase = createBrowserClient();
    const { data } = await supabase
      .from("guest_profiles")
      .select("*")
      .or(
        `name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`,
      )
      .order("total_stays", { ascending: false })
      .limit(20);

    setProfiles((data as unknown as GuestProfile[]) || []);
  };

  const completeTask = async (taskId: string) => {
    const supabase = createBrowserClient();
    await supabase
      .from("occasion_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", taskId);

    loadData();
  };

  const markAsVIP = async (profileId: string) => {
    const supabase = createBrowserClient();
    await supabase
      .from("guest_profiles")
      .update({
        is_vip: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", profileId);

    loadData();
  };

  if (configError) {
    return (
      <div className="p-6">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <div className="text-3xl mb-3">⚠️</div>
          <h2 className="text-lg font-bold text-amber-800 mb-2">
            Base de Datos No Configurada
          </h2>
          <p className="text-sm text-amber-700">
            Las variables de entorno de Supabase no están disponibles.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-slate-900 mb-1">
          👤 Perfiles de Huéspedes
        </h1>
        <p className="text-sm text-slate-500">
          Reconocimiento de huéspedes recurrentes y ocasiones especiales
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {[
          { id: "arrivals", label: "Llegadas Hoy", icon: "🛬" },
          { id: "occasions", label: "Ocasiones", icon: "🎉" },
          { id: "profiles", label: "Perfiles", icon: "👥" },
          { id: "vip", label: "VIP", icon: "⭐" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
              activeTab === tab.id
                ? "bg-[#00B4FF] text-white shadow-md"
                : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          {/* ─── TAB: LLEGADAS DE HOY ─── */}
          {activeTab === "arrivals" && (
            <div className="space-y-4">
              {arrivals.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">🏝️</div>
                  <p className="text-slate-500">
                    No hay llegadas programadas para hoy
                  </p>
                </div>
              ) : (
                arrivals.map((arrival) => (
                  <ArrivalCard
                    key={arrival.id}
                    arrival={arrival}
                    onViewProfile={() =>
                      setSelectedProfile(arrival.guest_profile)
                    }
                    onMarkVIP={() =>
                      arrival.guest_profile &&
                      markAsVIP(arrival.guest_profile.id)
                    }
                  />
                ))
              )}
            </div>
          )}

          {/* ─── TAB: TAREAS DE OCASIÓN ─── */}
          {activeTab === "occasions" && (
            <div className="space-y-4">
              {occasionTasks.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-slate-500">
                    No hay tareas de ocasión pendientes
                  </p>
                </div>
              ) : (
                occasionTasks.map((task) => (
                  <OccasionTaskCard
                    key={task.id}
                    task={task}
                    onComplete={() => completeTask(task.id)}
                  />
                ))
              )}
            </div>
          )}

          {/* ─── TAB: PERFILES ─── */}
          {activeTab === "profiles" && (
            <div>
              {/* Search */}
              <div className="mb-4 flex gap-2">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchProfiles()}
                  placeholder="Buscar por nombre, email o teléfono..."
                  className="flex-1 px-4 py-3 border border-slate-200 rounded-xl text-sm"
                />
                <button
                  onClick={searchProfiles}
                  className="px-4 py-3 bg-[#00B4FF] text-white rounded-xl font-bold text-sm"
                >
                  🔍 Buscar
                </button>
              </div>

              {/* Results */}
              <div className="space-y-3">
                {profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onClick={() => setSelectedProfile(profile)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ─── TAB: VIP ─── */}
          {activeTab === "vip" && (
            <div className="space-y-4">
              {profiles.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
                  <div className="text-4xl mb-3">⭐</div>
                  <p className="text-slate-500">
                    No hay huéspedes VIP registrados
                  </p>
                </div>
              ) : (
                profiles.map((profile) => (
                  <ProfileCard
                    key={profile.id}
                    profile={profile}
                    onClick={() => setSelectedProfile(profile)}
                    showVIPBadge
                  />
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* Profile Modal */}
      {selectedProfile && (
        <ProfileModal
          profile={selectedProfile}
          onClose={() => setSelectedProfile(null)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTES
// ═══════════════════════════════════════════════════════════════

function ArrivalCard({
  arrival,
  onViewProfile,
  onMarkVIP,
}: {
  arrival: TodayArrival;
  onViewProfile: () => void;
  onMarkVIP: () => void;
}) {
  const profile = arrival.guest_profile;
  const isReturning =
    arrival.is_returning_guest || (profile?.total_stays || 0) > 0;
  const occasions = arrival.detected_occasions || [];

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold text-slate-900">
              {arrival.guest_name}
            </span>
            {isReturning && (
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
                👋 BIENVENIDO DE VUELTA
              </span>
            )}
            {profile?.is_vip && (
              <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
                ⭐ VIP
              </span>
            )}
          </div>
          <div className="text-xs text-slate-500">
            🏠 {arrival.villa_id} • 👥 {arrival.num_adults} adultos
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-medium text-slate-600">
            {new Date(arrival.check_in).toLocaleDateString("es-CO", {
              month: "short",
              day: "numeric",
            })}{" "}
            -{" "}
            {new Date(arrival.check_out).toLocaleDateString("es-CO", {
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* Previous Stays Info */}
      {isReturning && profile && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3 mb-3">
          <div className="text-xs font-bold text-emerald-800 mb-1">
            📊 Historial del Huésped
          </div>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <div className="text-lg font-bold text-emerald-700">
                {profile.total_stays}
              </div>
              <div className="text-[10px] text-emerald-600">Estadías</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-700">
                {profile.total_nights}
              </div>
              <div className="text-[10px] text-emerald-600">Noches</div>
            </div>
            <div>
              <div className="text-lg font-bold text-emerald-700">
                {profile.last_stay
                  ? new Date(profile.last_stay).toLocaleDateString("es-CO", {
                      month: "short",
                      year: "2-digit",
                    })
                  : "-"}
              </div>
              <div className="text-[10px] text-emerald-600">Última Visita</div>
            </div>
          </div>
        </div>
      )}

      {/* Detected Occasions */}
      {occasions.length > 0 && (
        <div className="space-y-2 mb-3">
          {occasions.map((occasion, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg"
            >
              <span className="text-xl">
                {OCCASION_EMOJIS[occasion.type] || "✨"}
              </span>
              <div className="flex-1">
                <div className="text-xs font-bold text-amber-800">
                  {OCCASION_NAMES_ES[occasion.type] || occasion.type}
                </div>
                <div className="text-[10px] text-amber-600">
                  {occasion.detailsEs || occasion.details}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Allergies/Dietary */}
      {profile &&
        (profile.allergies?.length > 0 ||
          profile.dietary_preferences?.length > 0) && (
          <div className="flex flex-wrap gap-1 mb-3">
            {profile.allergies?.map((allergy, idx) => (
              <span
                key={`a-${idx}`}
                className="px-2 py-1 bg-red-50 border border-red-200 text-red-700 text-[10px] font-medium rounded-full"
              >
                ⚠️ {allergy}
              </span>
            ))}
            {profile.dietary_preferences?.map((pref, idx) => (
              <span
                key={`d-${idx}`}
                className="px-2 py-1 bg-green-50 border border-green-200 text-green-700 text-[10px] font-medium rounded-full"
              >
                🥗 {pref}
              </span>
            ))}
          </div>
        )}

      {/* Actions */}
      <div className="flex gap-2">
        {profile && (
          <button
            onClick={onViewProfile}
            className="flex-1 px-3 py-2 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold"
          >
            👤 Ver Perfil
          </button>
        )}
        {profile && !profile.is_vip && (
          <button
            onClick={onMarkVIP}
            className="px-3 py-2 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold"
          >
            ⭐ Marcar VIP
          </button>
        )}
      </div>
    </div>
  );
}

function OccasionTaskCard({
  task,
  onComplete,
}: {
  task: OccasionTask;
  onComplete: () => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl">
            {OCCASION_EMOJIS[task.occasion_type] || "✨"}
          </span>
          <div>
            <div className="font-bold text-slate-900">{task.task_title_es}</div>
            <div className="text-xs text-slate-500">
              {task.occasion_details}
            </div>
          </div>
        </div>
        <span
          className={`px-2 py-1 text-[10px] font-bold rounded-full border ${DEPARTMENT_COLORS[task.department]}`}
        >
          {DEPARTMENT_NAMES_ES[task.department]}
        </span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="text-xs text-slate-500">
          🏠 {task.villa_id} •{" "}
          {new Date(task.task_date).toLocaleDateString("es-CO", {
            weekday: "short",
            month: "short",
            day: "numeric",
          })}
        </div>
        <button
          onClick={onComplete}
          className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-xs font-bold"
        >
          ✓ Completar
        </button>
      </div>
    </div>
  );
}

function ProfileCard({
  profile,
  onClick,
  showVIPBadge = false,
}: {
  profile: GuestProfile;
  onClick: () => void;
  showVIPBadge?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white border border-slate-200 rounded-xl p-4 text-left hover:border-[#00B4FF] transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">{profile.name}</span>
          {(showVIPBadge || profile.is_vip) && (
            <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full">
              ⭐ VIP
            </span>
          )}
          {profile.total_stays > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full">
              {profile.total_stays}x
            </span>
          )}
        </div>
        <div className="text-xs text-slate-400">→</div>
      </div>
      <div className="text-xs text-slate-500">
        {profile.email || profile.phone || "Sin contacto"}
      </div>
      <div className="flex gap-2 mt-2 text-[10px] text-slate-400">
        {profile.total_stays > 0 && <span>{profile.total_stays} estadías</span>}
        {profile.total_nights > 0 && (
          <span>• {profile.total_nights} noches</span>
        )}
        {profile.country && <span>• {profile.country}</span>}
      </div>
    </button>
  );
}

function ProfileModal({
  profile,
  onClose,
}: {
  profile: GuestProfile;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50">
      <div className="bg-white rounded-t-3xl w-full max-h-[85vh] overflow-y-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-slate-900">{profile.name}</h2>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              {profile.is_vip && <span className="text-amber-500">⭐ VIP</span>}
              {profile.country && <span>📍 {profile.country}</span>}
              <span>🌐 {profile.language.toUpperCase()}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-xl"
          >
            ×
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Stats */}
          <div className="grid grid-cols-4 gap-2">
            <StatBox label="Estadías" value={profile.total_stays.toString()} />
            <StatBox label="Noches" value={profile.total_nights.toString()} />
            <StatBox
              label="Primera"
              value={
                profile.first_stay
                  ? new Date(profile.first_stay).toLocaleDateString("es-CO", {
                      month: "short",
                      year: "2-digit",
                    })
                  : "-"
              }
            />
            <StatBox
              label="Última"
              value={
                profile.last_stay
                  ? new Date(profile.last_stay).toLocaleDateString("es-CO", {
                      month: "short",
                      year: "2-digit",
                    })
                  : "-"
              }
            />
          </div>

          {/* Contact */}
          <div className="bg-slate-50 rounded-xl p-4">
            <div className="text-xs font-bold text-slate-600 mb-2">
              📧 Contacto
            </div>
            <div className="space-y-1 text-sm">
              {profile.email && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Email:</span>
                  <span className="text-slate-700">{profile.email}</span>
                </div>
              )}
              {profile.phone && (
                <div className="flex items-center gap-2">
                  <span className="text-slate-400">Teléfono:</span>
                  <span className="text-slate-700">{profile.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Allergies & Dietary */}
          {(profile.allergies?.length > 0 ||
            profile.dietary_preferences?.length > 0) && (
            <div className="bg-red-50 rounded-xl p-4">
              <div className="text-xs font-bold text-red-700 mb-2">
                ⚠️ Restricciones Alimenticias
              </div>
              <div className="flex flex-wrap gap-2">
                {profile.allergies?.map((item, idx) => (
                  <span
                    key={`a-${idx}`}
                    className="px-3 py-1 bg-white border border-red-200 text-red-700 text-sm rounded-full"
                  >
                    {item}
                  </span>
                ))}
                {profile.dietary_preferences?.map((item, idx) => (
                  <span
                    key={`d-${idx}`}
                    className="px-3 py-1 bg-white border border-green-200 text-green-700 text-sm rounded-full"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Special Dates */}
          {profile.special_dates?.length > 0 && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-700 mb-2">
                📅 Fechas Especiales
              </div>
              <div className="space-y-2">
                {profile.special_dates.map((sd, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 text-sm text-amber-800"
                  >
                    <span>{OCCASION_EMOJIS[sd.type] || "📅"}</span>
                    <span className="font-medium">
                      {OCCASION_NAMES_ES[sd.type] || sd.type}
                    </span>
                    <span className="text-amber-600">- {sd.date}</span>
                    {sd.name && (
                      <span className="text-amber-500">({sd.name})</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIP Reason */}
          {profile.is_vip && profile.vip_reason && (
            <div className="bg-amber-50 rounded-xl p-4">
              <div className="text-xs font-bold text-amber-700 mb-1">
                ⭐ Razón VIP
              </div>
              <p className="text-sm text-amber-800">{profile.vip_reason}</p>
            </div>
          )}

          {/* Internal Notes */}
          {profile.internal_notes && (
            <div className="bg-slate-50 rounded-xl p-4">
              <div className="text-xs font-bold text-slate-600 mb-1">
                📝 Notas Internas
              </div>
              <p className="text-sm text-slate-700 whitespace-pre-line">
                {profile.internal_notes}
              </p>
            </div>
          )}

          {/* Tags */}
          {profile.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {profile.tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 rounded-xl p-3 text-center">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[10px] text-slate-500">{label}</div>
    </div>
  );
}
