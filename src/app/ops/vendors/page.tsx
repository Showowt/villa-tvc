"use client";

import { useState, useEffect, useCallback } from "react";
import { Badge } from "@/components/ops/Badge";
import { StatCard } from "@/components/ops/StatCard";
import {
  createBrowserClient,
  isBrowserClientAvailable,
} from "@/lib/supabase/client";
import { useLanguage } from "@/lib/i18n/context";

interface Vendor {
  id: string;
  name: string;
  name_es: string | null;
  contact_name: string | null;
  specialty: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  rate_description: string | null;
  hourly_rate: number | null;
  response_time: string | null;
  last_used: string | null;
  rating: number | null;
  total_jobs: number;
  notes: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface VendorJob {
  id: string;
  vendor_id: string;
  description: string;
  description_es: string | null;
  villa_id: string | null;
  status: string;
  priority: string;
  cost: number | null;
  notes: string | null;
  created_at: string;
  completed_at: string | null;
}

const SPECIALTY_ICONS: Record<string, string> = {
  ac_repair: "❄️",
  plumbing: "🔧",
  electrical: "⚡",
  generator: "🔋",
  pool: "🏊",
  appliance: "🔌",
  carpentry: "🪚",
  painting: "🎨",
  security: "🔒",
  pest_control: "🐜",
  landscaping: "🌿",
  general: "🛠️",
};

const SPECIALTY_LABELS: Record<string, { en: string; es: string }> = {
  ac_repair: { en: "AC Repair", es: "Aire Acondicionado" },
  plumbing: { en: "Plumbing", es: "Plomeria" },
  electrical: { en: "Electrical", es: "Electricidad" },
  generator: { en: "Generator", es: "Generador" },
  pool: { en: "Pool", es: "Piscina" },
  appliance: { en: "Appliance", es: "Electrodomesticos" },
  carpentry: { en: "Carpentry", es: "Carpinteria" },
  painting: { en: "Painting", es: "Pintura" },
  security: { en: "Security", es: "Seguridad" },
  pest_control: { en: "Pest Control", es: "Control de Plagas" },
  landscaping: { en: "Landscaping", es: "Jardineria" },
  general: { en: "General", es: "General" },
};

const SPECIALTY_COLORS: Record<string, string> = {
  ac_repair: "#00B4FF",
  plumbing: "#10B981",
  electrical: "#F59E0B",
  generator: "#8B5CF6",
  pool: "#06B6D4",
  appliance: "#EC4899",
  carpentry: "#D97706",
  painting: "#6366F1",
  security: "#EF4444",
  pest_control: "#84CC16",
  landscaping: "#22C55E",
  general: "#6B7280",
};

export default function VendorsPage() {
  const { lang } = useLanguage();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorJobs, setVendorJobs] = useState<Record<string, VendorJob[]>>({});
  const [loading, setLoading] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const loadVendors = useCallback(async () => {
    if (!isBrowserClientAvailable()) {
      setConfigError(true);
      setLoading(false);
      return;
    }

    const supabase = createBrowserClient();

    try {
      const { data, error } = await supabase
        .from("vendors")
        .select("*")
        .order("rating", { ascending: false, nullsFirst: false });

      if (error) throw error;
      setVendors(data || []);

      // Load recent jobs for vendors
      const { data: jobs } = await supabase
        .from("vendor_jobs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (jobs) {
        const grouped: Record<string, VendorJob[]> = {};
        jobs.forEach((job) => {
          if (!grouped[job.vendor_id]) {
            grouped[job.vendor_id] = [];
          }
          grouped[job.vendor_id].push(job);
        });
        setVendorJobs(grouped);
      }
    } catch (error) {
      console.error("[VendorsPage] Error loading vendors:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadVendors();
  }, [loadVendors]);

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSpecialty =
      selectedSpecialty === "all" || vendor.specialty === selectedSpecialty;
    const matchesSearch =
      vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vendor.contact_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      SPECIALTY_LABELS[vendor.specialty]?.en
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      SPECIALTY_LABELS[vendor.specialty]?.es
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
    const isActive = vendor.is_active;
    return matchesSpecialty && matchesSearch && isActive;
  });

  // Group vendors by specialty for better organization
  const vendorsBySpecialty: Record<string, Vendor[]> = {};
  filteredVendors.forEach((vendor) => {
    if (!vendorsBySpecialty[vendor.specialty]) {
      vendorsBySpecialty[vendor.specialty] = [];
    }
    vendorsBySpecialty[vendor.specialty].push(vendor);
  });

  const stats = {
    total: vendors.filter((v) => v.is_active).length,
    topRated: vendors.filter((v) => v.is_active && v.rating && v.rating >= 4)
      .length,
    recentJobs: Object.values(vendorJobs)
      .flat()
      .filter(
        (j) =>
          j.completed_at &&
          new Date(j.completed_at) >
            new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      ).length,
    specialties: new Set(
      vendors.filter((v) => v.is_active).map((v) => v.specialty),
    ).size,
  };

  const openWhatsApp = (phone: string, vendorName: string, issue?: string) => {
    const message = encodeURIComponent(
      lang === "es"
        ? `Hola, soy de TVC. ${issue ? `Tenemos un problema: ${issue}` : "Necesitamos asistencia tecnica."}`
        : `Hello, I'm from TVC. ${issue ? `We have an issue: ${issue}` : "We need technical assistance."}`,
    );
    const cleanPhone = phone.replace(/[^0-9+]/g, "");
    window.open(`https://wa.me/${cleanPhone}?text=${message}`, "_blank");
  };

  const callPhone = (phone: string) => {
    window.open(`tel:${phone}`, "_blank");
  };

  const renderStars = (rating: number | null) => {
    if (!rating) return null;
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <span
            key={star}
            className={star <= rating ? "text-amber-400" : "text-slate-200"}
          >
            ★
          </span>
        ))}
      </div>
    );
  };

  const formatLastUsed = (date: string | null) => {
    if (!date) return lang === "es" ? "Nunca" : "Never";
    const d = new Date(date);
    const now = new Date();
    const diffDays = Math.floor(
      (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) return lang === "es" ? "Hoy" : "Today";
    if (diffDays === 1) return lang === "es" ? "Ayer" : "Yesterday";
    if (diffDays < 7)
      return lang === "es" ? `Hace ${diffDays} dias` : `${diffDays} days ago`;
    if (diffDays < 30)
      return lang === "es"
        ? `Hace ${Math.floor(diffDays / 7)} semanas`
        : `${Math.floor(diffDays / 7)} weeks ago`;
    return d.toLocaleDateString(lang === "es" ? "es-CO" : "en-US", {
      month: "short",
      day: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#00B4FF] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (configError) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
        <div className="text-3xl mb-3">⚠️</div>
        <h2 className="text-lg font-bold text-amber-800 mb-2">
          {lang === "es"
            ? "Base de Datos No Configurada"
            : "Database Not Configured"}
        </h2>
        <p className="text-sm text-amber-700">
          {lang === "es"
            ? "Las variables de entorno de Supabase no estan disponibles."
            : "Supabase environment variables are not available."}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-slate-900">
          {lang === "es" ? "Directorio de Tecnicos" : "Vendor Directory"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {lang === "es"
            ? "Contactos de tecnicos para mantenimiento y reparaciones"
            : "Maintenance and repair technician contacts"}
        </p>
      </div>

      {/* Stats Row */}
      <div className="flex gap-3 flex-wrap mb-5">
        <StatCard
          label={lang === "es" ? "Total Tecnicos" : "Total Vendors"}
          value={stats.total.toString()}
          sub={lang === "es" ? "Activos" : "Active"}
          color="#00B4FF"
          icon="🛠️"
        />
        <StatCard
          label={lang === "es" ? "Top Calificados" : "Top Rated"}
          value={stats.topRated.toString()}
          sub="4+ estrellas"
          color="#F59E0B"
          icon="⭐"
        />
        <StatCard
          label={lang === "es" ? "Trabajos (30 dias)" : "Jobs (30 days)"}
          value={stats.recentJobs.toString()}
          sub={lang === "es" ? "Completados" : "Completed"}
          color="#10B981"
          icon="✅"
        />
        <StatCard
          label={lang === "es" ? "Especialidades" : "Specialties"}
          value={stats.specialties.toString()}
          sub={lang === "es" ? "Cubiertas" : "Covered"}
          color="#8B5CF6"
          icon="🔧"
        />
      </div>

      {/* Emergency Banner */}
      <div className="bg-gradient-to-r from-red-500 to-red-600 rounded-xl p-4 mb-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🚨</span>
            <div>
              <div className="font-bold">
                {lang === "es" ? "Emergencia?" : "Emergency?"}
              </div>
              <div className="text-xs text-red-100">
                {lang === "es"
                  ? "Selecciona el problema para ver tecnicos recomendados"
                  : "Select the issue to see recommended vendors"}
              </div>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {["ac_repair", "plumbing", "electrical", "generator"].map(
              (specialty) => {
                const vendor = vendors.find(
                  (v) => v.specialty === specialty && v.is_active && v.rating,
                );
                return (
                  <button
                    key={specialty}
                    onClick={() => {
                      setSelectedSpecialty(specialty);
                      if (vendor && vendor.whatsapp) {
                        openWhatsApp(
                          vendor.whatsapp,
                          vendor.name,
                          SPECIALTY_LABELS[specialty]?.[lang],
                        );
                      }
                    }}
                    className="px-3 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-bold transition-colors"
                  >
                    {SPECIALTY_ICONS[specialty]}{" "}
                    {SPECIALTY_LABELS[specialty]?.[lang]}
                  </button>
                );
              },
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 mb-5">
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder={
                lang === "es"
                  ? "Buscar tecnico o especialidad..."
                  : "Search vendor or specialty..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
            />
          </div>

          {/* Specialty Filter */}
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setSelectedSpecialty("all")}
              className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                selectedSpecialty === "all"
                  ? "bg-[#0A0A0F] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {lang === "es" ? "Todos" : "All"}
            </button>
            {["ac_repair", "plumbing", "electrical", "generator", "pool"].map(
              (specialty) => (
                <button
                  key={specialty}
                  onClick={() => setSelectedSpecialty(specialty)}
                  className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${
                    selectedSpecialty === specialty
                      ? "bg-[#0A0A0F] text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {SPECIALTY_ICONS[specialty]}{" "}
                  {SPECIALTY_LABELS[specialty]?.[lang]}
                </button>
              ),
            )}
          </div>

          {/* Add Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-[#00B4FF] text-white rounded-lg text-xs font-bold hover:bg-[#0095D6] transition-colors"
          >
            + {lang === "es" ? "Agregar" : "Add"}
          </button>
        </div>
      </div>

      {/* Vendors by Specialty */}
      {selectedSpecialty === "all" ? (
        // Grouped view
        Object.entries(vendorsBySpecialty).map(
          ([specialty, specialtyVendors]) => (
            <div key={specialty} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{SPECIALTY_ICONS[specialty]}</span>
                <h2 className="text-lg font-bold text-slate-900">
                  {SPECIALTY_LABELS[specialty]?.[lang] || specialty}
                </h2>
                <Badge color={SPECIALTY_COLORS[specialty]}>
                  {specialtyVendors.length}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {specialtyVendors.map((vendor) => (
                  <VendorCard
                    key={vendor.id}
                    vendor={vendor}
                    jobs={vendorJobs[vendor.id] || []}
                    lang={lang}
                    onSelect={() => setSelectedVendor(vendor)}
                    onWhatsApp={openWhatsApp}
                    onCall={callPhone}
                    renderStars={renderStars}
                    formatLastUsed={formatLastUsed}
                  />
                ))}
              </div>
            </div>
          ),
        )
      ) : (
        // Flat view for single specialty
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVendors.map((vendor) => (
            <VendorCard
              key={vendor.id}
              vendor={vendor}
              jobs={vendorJobs[vendor.id] || []}
              lang={lang}
              onSelect={() => setSelectedVendor(vendor)}
              onWhatsApp={openWhatsApp}
              onCall={callPhone}
              renderStars={renderStars}
              formatLastUsed={formatLastUsed}
            />
          ))}
        </div>
      )}

      {filteredVendors.length === 0 && (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <div className="text-4xl mb-3">🔧</div>
          <h3 className="text-lg font-bold text-slate-700 mb-1">
            {lang === "es" ? "No hay tecnicos" : "No vendors found"}
          </h3>
          <p className="text-sm text-slate-500">
            {lang === "es"
              ? "No se encontraron tecnicos con estos filtros"
              : "No vendors match the current filters"}
          </p>
        </div>
      )}

      {/* Vendor Detail Modal */}
      {selectedVendor && (
        <VendorDetailModal
          vendor={selectedVendor}
          jobs={vendorJobs[selectedVendor.id] || []}
          lang={lang}
          onClose={() => setSelectedVendor(null)}
          onWhatsApp={openWhatsApp}
          onCall={callPhone}
          renderStars={renderStars}
          formatLastUsed={formatLastUsed}
        />
      )}

      {/* Add Vendor Modal */}
      {showAddModal && (
        <AddVendorModal
          lang={lang}
          onClose={() => setShowAddModal(false)}
          onSaved={() => {
            setShowAddModal(false);
            loadVendors();
          }}
        />
      )}
    </div>
  );
}

// =============================================================================
// VENDOR CARD COMPONENT
// =============================================================================
function VendorCard({
  vendor,
  jobs,
  lang,
  onSelect,
  onWhatsApp,
  onCall,
  renderStars,
  formatLastUsed,
}: {
  vendor: Vendor;
  jobs: VendorJob[];
  lang: "en" | "es";
  onSelect: () => void;
  onWhatsApp: (phone: string, name: string) => void;
  onCall: (phone: string) => void;
  renderStars: (rating: number | null) => React.ReactNode;
  formatLastUsed: (date: string | null) => string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-[#00B4FF] hover:shadow-md transition-all">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
              style={{
                backgroundColor: `${SPECIALTY_COLORS[vendor.specialty]}20`,
              }}
            >
              {SPECIALTY_ICONS[vendor.specialty]}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{vendor.name}</h3>
              {vendor.contact_name && (
                <p className="text-xs text-slate-500">{vendor.contact_name}</p>
              )}
            </div>
          </div>
          <div className="text-right">
            {renderStars(vendor.rating)}
            {vendor.total_jobs > 0 && (
              <p className="text-[10px] text-slate-400 mt-0.5">
                {vendor.total_jobs} {lang === "es" ? "trabajos" : "jobs"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-3">
        {/* Response Time */}
        {vendor.response_time && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">⏱️</span>
            <span className="text-xs text-slate-600">
              {lang === "es" ? "Respuesta:" : "Response:"}{" "}
              {vendor.response_time}
            </span>
          </div>
        )}

        {/* Rate */}
        {vendor.rate_description && (
          <div className="flex items-center gap-2">
            <span className="text-slate-400">💰</span>
            <span className="text-xs text-slate-600">
              {vendor.rate_description}
            </span>
          </div>
        )}

        {/* Last Used */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400">📅</span>
          <span className="text-xs text-slate-600">
            {lang === "es" ? "Ultimo uso:" : "Last used:"}{" "}
            {formatLastUsed(vendor.last_used)}
          </span>
        </div>

        {/* Notes */}
        {vendor.notes && (
          <p className="text-xs text-slate-500 line-clamp-2 bg-slate-50 p-2 rounded">
            {vendor.notes}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex gap-2">
        {vendor.whatsapp && (
          <button
            onClick={() => onWhatsApp(vendor.whatsapp!, vendor.name)}
            className="flex-1 px-3 py-2 bg-[#25D366] text-white rounded-lg text-xs font-bold hover:bg-[#1DA851] transition-colors"
          >
            WhatsApp
          </button>
        )}
        {vendor.phone && (
          <button
            onClick={() => onCall(vendor.phone!)}
            className="flex-1 px-3 py-2 bg-[#00B4FF] text-white rounded-lg text-xs font-bold hover:bg-[#0095D6] transition-colors"
          >
            {lang === "es" ? "Llamar" : "Call"}
          </button>
        )}
        <button
          onClick={onSelect}
          className="px-3 py-2 bg-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-300 transition-colors"
        >
          {lang === "es" ? "Ver" : "View"}
        </button>
      </div>
    </div>
  );
}

// =============================================================================
// VENDOR DETAIL MODAL
// =============================================================================
function VendorDetailModal({
  vendor,
  jobs,
  lang,
  onClose,
  onWhatsApp,
  onCall,
  renderStars,
  formatLastUsed,
}: {
  vendor: Vendor;
  jobs: VendorJob[];
  lang: "en" | "es";
  onClose: () => void;
  onWhatsApp: (phone: string, name: string) => void;
  onCall: (phone: string) => void;
  renderStars: (rating: number | null) => React.ReactNode;
  formatLastUsed: (date: string | null) => string;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div
                className="w-14 h-14 rounded-xl flex items-center justify-center text-2xl"
                style={{
                  backgroundColor: `${SPECIALTY_COLORS[vendor.specialty]}20`,
                }}
              >
                {SPECIALTY_ICONS[vendor.specialty]}
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  {vendor.name}
                </h2>
                {vendor.contact_name && (
                  <p className="text-sm text-slate-500">
                    {vendor.contact_name}
                  </p>
                )}
                <div className="flex items-center gap-2 mt-1">
                  <Badge color={SPECIALTY_COLORS[vendor.specialty]}>
                    {SPECIALTY_LABELS[vendor.specialty]?.[lang] ||
                      vendor.specialty}
                  </Badge>
                  {renderStars(vendor.rating)}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Contact Info */}
          <div className="grid grid-cols-2 gap-4">
            {vendor.phone && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {lang === "es" ? "Telefono" : "Phone"}
                </div>
                <p className="text-sm text-slate-700">{vendor.phone}</p>
              </div>
            )}
            {vendor.email && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  Email
                </div>
                <p className="text-sm text-slate-700">{vendor.email}</p>
              </div>
            )}
          </div>

          {/* Response Time & Rate */}
          <div className="grid grid-cols-2 gap-4">
            {vendor.response_time && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {lang === "es" ? "Tiempo de Respuesta" : "Response Time"}
                </div>
                <p className="text-sm text-slate-700">{vendor.response_time}</p>
              </div>
            )}
            {vendor.rate_description && (
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                  {lang === "es" ? "Tarifa" : "Rate"}
                </div>
                <p className="text-sm text-slate-700">
                  {vendor.rate_description}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl">
            <div className="text-center">
              <div className="text-2xl font-extrabold text-slate-900">
                {vendor.total_jobs}
              </div>
              <div className="text-xs text-slate-500">
                {lang === "es" ? "Trabajos Totales" : "Total Jobs"}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm font-bold text-slate-900">
                {formatLastUsed(vendor.last_used)}
              </div>
              <div className="text-xs text-slate-500">
                {lang === "es" ? "Ultimo Uso" : "Last Used"}
              </div>
            </div>
          </div>

          {/* Recent Jobs */}
          {jobs.length > 0 && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">
                {lang === "es" ? "Trabajos Recientes" : "Recent Jobs"} (
                {jobs.length})
              </div>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="bg-slate-50 p-3 rounded-lg flex justify-between items-center"
                  >
                    <div>
                      <p className="text-xs text-slate-700">
                        {lang === "es" ? job.description_es : job.description}
                      </p>
                      {job.villa_id && (
                        <p className="text-[10px] text-slate-500">
                          {job.villa_id}
                        </p>
                      )}
                    </div>
                    <Badge
                      color={
                        job.status === "completed"
                          ? "#10B981"
                          : job.status === "in_progress"
                            ? "#F59E0B"
                            : "#6B7280"
                      }
                    >
                      {job.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {vendor.notes && (
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">
                {lang === "es" ? "Notas" : "Notes"}
              </div>
              <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                {vendor.notes}
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
          {vendor.whatsapp && (
            <button
              onClick={() => onWhatsApp(vendor.whatsapp!, vendor.name)}
              className="flex-1 px-4 py-3 bg-[#25D366] text-white rounded-xl font-bold hover:bg-[#1DA851] transition-colors"
            >
              WhatsApp
            </button>
          )}
          {vendor.phone && (
            <button
              onClick={() => onCall(vendor.phone!)}
              className="flex-1 px-4 py-3 bg-[#00B4FF] text-white rounded-xl font-bold hover:bg-[#0095D6] transition-colors"
            >
              {lang === "es" ? "Llamar" : "Call"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// ADD VENDOR MODAL
// =============================================================================
function AddVendorModal({
  lang,
  onClose,
  onSaved,
}: {
  lang: "en" | "es";
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    contact_name: "",
    phone: "",
    whatsapp: "",
    email: "",
    specialty: "general",
    rate_description: "",
    response_time: "",
    notes: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const supabase = createBrowserClient();
      const { error } = await supabase.from("vendors").insert({
        name: formData.name,
        name_es: formData.name,
        contact_name: formData.contact_name || null,
        phone: formData.phone || null,
        whatsapp: formData.whatsapp || formData.phone || null,
        email: formData.email || null,
        specialty: formData.specialty,
        rate_description: formData.rate_description || null,
        response_time: formData.response_time || null,
        notes: formData.notes || null,
        is_active: true,
        total_jobs: 0,
      });

      if (error) throw error;
      onSaved();
    } catch (error) {
      console.error("[AddVendorModal] Error saving:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <div className="p-6 border-b border-slate-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-extrabold text-slate-900">
                {lang === "es" ? "Agregar Tecnico" : "Add Vendor"}
              </h2>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 text-xl"
              >
                ✕
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es"
                  ? "Nombre del Tecnico/Empresa *"
                  : "Vendor/Company Name *"}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                required
              />
            </div>

            {/* Contact Name */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Nombre del Contacto" : "Contact Name"}
              </label>
              <input
                type="text"
                value={formData.contact_name}
                onChange={(e) =>
                  setFormData({ ...formData, contact_name: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              />
            </div>

            {/* Phone & WhatsApp */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  {lang === "es" ? "Telefono" : "Phone"}
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="+57..."
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  WhatsApp
                </label>
                <input
                  type="tel"
                  value={formData.whatsapp}
                  onChange={(e) =>
                    setFormData({ ...formData, whatsapp: e.target.value })
                  }
                  placeholder={
                    lang === "es" ? "Si es diferente" : "If different"
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
            </div>

            {/* Specialty */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Especialidad" : "Specialty"}
              </label>
              <select
                value={formData.specialty}
                onChange={(e) =>
                  setFormData({ ...formData, specialty: e.target.value })
                }
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
              >
                {Object.entries(SPECIALTY_LABELS).map(([key, labels]) => (
                  <option key={key} value={key}>
                    {SPECIALTY_ICONS[key]} {labels[lang]}
                  </option>
                ))}
              </select>
            </div>

            {/* Rate & Response Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  {lang === "es" ? "Tarifa" : "Rate"}
                </label>
                <input
                  type="text"
                  value={formData.rate_description}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      rate_description: e.target.value,
                    })
                  }
                  placeholder="COP $XX,XXX"
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">
                  {lang === "es" ? "Tiempo de Respuesta" : "Response Time"}
                </label>
                <input
                  type="text"
                  value={formData.response_time}
                  onChange={(e) =>
                    setFormData({ ...formData, response_time: e.target.value })
                  }
                  placeholder={
                    lang === "es" ? "Ej: 2-4 horas" : "Ex: 2-4 hours"
                  }
                  className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF]"
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-xs font-bold text-slate-600 mb-1 block">
                {lang === "es" ? "Notas" : "Notes"}
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
                className="w-full px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#00B4FF] resize-none"
              />
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-slate-200 text-slate-700 rounded-xl font-bold hover:bg-slate-300 transition-colors"
            >
              {lang === "es" ? "Cancelar" : "Cancel"}
            </button>
            <button
              type="submit"
              disabled={saving || !formData.name.trim()}
              className="flex-1 px-4 py-3 bg-[#00B4FF] text-white rounded-xl font-bold hover:bg-[#0095D6] transition-colors disabled:opacity-50"
            >
              {saving
                ? lang === "es"
                  ? "Guardando..."
                  : "Saving..."
                : lang === "es"
                  ? "Guardar"
                  : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
