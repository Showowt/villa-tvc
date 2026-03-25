// ═══════════════════════════════════════════════════════════════
// WEEKLY REPORTS PAGE - Issues #35 & #69
// Vista de reportes semanales con exportacion y generacion
// ═══════════════════════════════════════════════════════════════

"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { StatCard } from "@/components/ops/StatCard";
import { createBrowserClient } from "@/lib/supabase/client";
import {
  getTrendIcon,
  getTrendColor,
  type WeeklyReport,
  type HistoricalComparison,
} from "@/lib/ops/financial";

// Tipos de exportacion disponibles
type ExportTable =
  | "orders"
  | "inventory"
  | "checklists"
  | "bookings"
  | "metrics"
  | "ingredients"
  | "purchase_orders";

interface ExportOption {
  key: ExportTable;
  label: string;
  icon: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  { key: "orders", label: "Pedidos F&B", icon: "🍽️" },
  { key: "inventory", label: "Inventario", icon: "📦" },
  { key: "checklists", label: "Checklists", icon: "✅" },
  { key: "bookings", label: "Reservas", icon: "🛏️" },
  { key: "metrics", label: "Metricas Diarias", icon: "📊" },
  { key: "ingredients", label: "Ingredientes", icon: "🥬" },
  { key: "purchase_orders", label: "Ordenes de Compra", icon: "🛒" },
];

export default function ReportsPage() {
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [whatsappMessage, setWhatsappMessage] = useState<string | null>(null);

  // Export state
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportTable, setExportTable] = useState<ExportTable>("orders");
  const [exportStartDate, setExportStartDate] = useState("");
  const [exportEndDate, setExportEndDate] = useState("");
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exporting, setExporting] = useState(false);

  // PDF generation state
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  // Initialize export dates
  useEffect(() => {
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);

    setExportEndDate(today.toISOString().split("T")[0]);
    setExportStartDate(thirtyDaysAgo.toISOString().split("T")[0]);
  }, []);

  const loadReports = useCallback(async () => {
    const supabase = createBrowserClient();

    const { data, error } = await supabase
      .from("weekly_reports")
      .select("*")
      .order("week_start", { ascending: false })
      .limit(12);

    if (error) {
      console.error("[loadReports]", error);
      setLoading(false);
      return;
    }

    setReports((data || []) as WeeklyReport[]);
    if (data && data.length > 0) {
      setSelectedReport(data[0] as WeeklyReport);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerateReport = async () => {
    setGenerating(true);

    try {
      const response = await fetch("/api/reports/weekly", {
        method: "POST",
      });

      const result = await response.json();

      if (result.success) {
        setWhatsappMessage(result.whatsappMessage);
        loadReports();
      } else {
        alert("Error al generar reporte: " + result.error);
      }
    } catch (error) {
      console.error("[generateReport]", error);
      alert("Error al generar reporte");
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);

    try {
      const params = new URLSearchParams({
        start: exportStartDate,
        end: exportEndDate,
        format: exportFormat,
      });

      const response = await fetch(`/api/export/${exportTable}?${params}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Error al exportar");
      }

      // Download the file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentDisposition = response.headers.get("Content-Disposition");
      const filenameMatch = contentDisposition?.match(/filename="(.+)"/);
      a.download = filenameMatch
        ? filenameMatch[1]
        : `export_${exportTable}.${exportFormat}`;

      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      setShowExportModal(false);
    } catch (error) {
      console.error("[export]", error);
      alert(error instanceof Error ? error.message : "Error al exportar datos");
    } finally {
      setExporting(false);
    }
  };

  const handleGeneratePDF = async () => {
    if (!selectedReport || !reportRef.current) return;

    setGeneratingPDF(true);

    try {
      // Dynamic import for PDF generation
      const html2canvas = (await import("html2canvas-pro")).default;
      const jsPDF = (await import("jspdf")).jsPDF;

      const element = reportRef.current;
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(
        `reporte_semanal_${selectedReport.week_start}_${selectedReport.week_end}.pdf`,
      );
    } catch (error) {
      console.error("[generatePDF]", error);
      alert("Error al generar PDF");
    } finally {
      setGeneratingPDF(false);
    }
  };

  const formatMoney = (n: number) => `$${Math.round(n).toLocaleString()}`;
  const formatPct = (n: number) => `${n.toFixed(1)}%`;

  const ComparisonDisplay = ({
    label,
    comparison,
    isMoney = false,
    isPct = false,
  }: {
    label: string;
    comparison: HistoricalComparison;
    isMoney?: boolean;
    isPct?: boolean;
  }) => {
    const icon = getTrendIcon(comparison.trend);
    const color = getTrendColor(comparison.trend);

    return (
      <div className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
        <span className="text-sm text-slate-600">{label}</span>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-900">
            {isMoney
              ? formatMoney(comparison.current)
              : isPct
                ? formatPct(comparison.current * 100)
                : comparison.current.toFixed(1)}
          </span>
          <span className={`text-xs font-bold ${color}`}>
            {icon} {comparison.change_pct >= 0 ? "+" : ""}
            {comparison.change_pct.toFixed(1)}%
          </span>
        </div>
      </div>
    );
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
      <div className="flex justify-between items-start mb-6 flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-extrabold flex items-center gap-2">
            Reportes Semanales
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Resumenes automaticos con comparaciones y exportacion
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setShowExportModal(true)}
            className="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-lg font-bold text-sm hover:bg-slate-200 flex items-center gap-2"
          >
            Exportar Datos
          </button>
          {selectedReport && (
            <button
              onClick={handleGeneratePDF}
              disabled={generatingPDF}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-lg font-bold text-sm hover:bg-blue-600 disabled:opacity-50 flex items-center gap-2"
            >
              {generatingPDF ? (
                <>
                  <span className="animate-spin">...</span>
                  Generando...
                </>
              ) : (
                <>Descargar PDF</>
              )}
            </button>
          )}
          <button
            onClick={handleGenerateReport}
            disabled={generating}
            className="px-5 py-2.5 bg-emerald-500 text-white rounded-lg font-bold text-sm hover:bg-emerald-600 disabled:opacity-50 flex items-center gap-2"
          >
            {generating ? (
              <>
                <span className="animate-spin">...</span>
                Generando...
              </>
            ) : (
              <>Generar Esta Semana</>
            )}
          </button>
        </div>
      </div>

      {/* Week Selector */}
      {reports.length > 0 && (
        <div className="flex gap-2 flex-wrap mb-6 overflow-x-auto pb-2">
          {reports.map((report) => (
            <button
              key={report.id}
              onClick={() => setSelectedReport(report)}
              className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                selectedReport?.id === report.id
                  ? "bg-[#0A0A0F] text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {new Date(report.week_start).toLocaleDateString("es-CO", {
                month: "short",
                day: "numeric",
              })}{" "}
              -{" "}
              {new Date(report.week_end).toLocaleDateString("es-CO", {
                month: "short",
                day: "numeric",
              })}
            </button>
          ))}
        </div>
      )}

      {/* Report Content */}
      {selectedReport ? (
        <div ref={reportRef} className="space-y-6 bg-white p-6 rounded-xl">
          {/* Report Header for PDF */}
          <div className="border-b border-slate-200 pb-4 mb-4 print:block hidden">
            <h2 className="text-xl font-bold">TVC Reporte Semanal</h2>
            <p className="text-slate-500">
              {selectedReport.week_start} - {selectedReport.week_end}
            </p>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              label="Ingreso Total"
              value={formatMoney(selectedReport.total_revenue)}
              sub={`Semana del ${selectedReport.week_start}`}
              color="#10B981"
              icon=""
            />
            <StatCard
              label="Ocupacion"
              value={formatPct(selectedReport.avg_occupancy_pct)}
              sub={`${selectedReport.total_guest_nights} noches`}
              color="#0066CC"
              icon=""
            />
            <StatCard
              label="RevPAR"
              value={formatMoney(selectedReport.weekly_revpar)}
              sub={`ADR: ${formatMoney(selectedReport.weekly_adr)}`}
              color="#8B5CF6"
              icon=""
            />
            <StatCard
              label="Margen F&B"
              value={formatPct(selectedReport.fb_margin_pct)}
              sub={`${selectedReport.total_orders} pedidos`}
              color="#F59E0B"
              icon=""
            />
          </div>

          {/* Revenue Breakdown */}
          <div className="bg-slate-50 rounded-xl p-5">
            <h3 className="font-bold text-slate-900 mb-4">
              Desglose de Ingresos
            </h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-black text-emerald-600">
                  {formatMoney(selectedReport.room_revenue)}
                </div>
                <div className="text-xs text-slate-500">Habitaciones</div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">
                  {formatMoney(selectedReport.fb_revenue)}
                </div>
                <div className="text-xs text-slate-500">F&B</div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600">
                  {formatMoney(selectedReport.service_revenue)}
                </div>
                <div className="text-xs text-slate-500">Servicios</div>
              </div>
            </div>
          </div>

          {/* Comparisons */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* vs Last Week */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">
                vs. Semana Anterior
              </h3>
              {selectedReport.vs_last_week && (
                <>
                  {selectedReport.vs_last_week.revenue && (
                    <ComparisonDisplay
                      label="Ingresos"
                      comparison={selectedReport.vs_last_week.revenue}
                      isMoney
                    />
                  )}
                  {selectedReport.vs_last_week.occupancy && (
                    <ComparisonDisplay
                      label="Ocupacion"
                      comparison={selectedReport.vs_last_week.occupancy}
                      isPct
                    />
                  )}
                  {selectedReport.vs_last_week.revpar && (
                    <ComparisonDisplay
                      label="RevPAR"
                      comparison={selectedReport.vs_last_week.revpar}
                      isMoney
                    />
                  )}
                </>
              )}
            </div>

            {/* vs Last Month */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">
                vs. Misma Semana Mes Anterior
              </h3>
              {selectedReport.vs_last_month && (
                <>
                  {selectedReport.vs_last_month.revenue && (
                    <ComparisonDisplay
                      label="Ingresos"
                      comparison={selectedReport.vs_last_month.revenue}
                      isMoney
                    />
                  )}
                  {selectedReport.vs_last_month.occupancy && (
                    <ComparisonDisplay
                      label="Ocupacion"
                      comparison={selectedReport.vs_last_month.occupancy}
                      isPct
                    />
                  )}
                  {selectedReport.vs_last_month.revpar && (
                    <ComparisonDisplay
                      label="RevPAR"
                      comparison={selectedReport.vs_last_month.revpar}
                      isMoney
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Top Dishes & Staff */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Top Dishes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">Top 5 Platos</h3>
              <div className="space-y-3">
                {selectedReport.top_dishes.slice(0, 5).map((dish, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        idx === 0
                          ? "bg-amber-100 text-amber-700"
                          : idx === 1
                            ? "bg-slate-100 text-slate-600"
                            : idx === 2
                              ? "bg-orange-100 text-orange-700"
                              : "bg-slate-50 text-slate-500"
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {dish.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {dish.quantity}x | {formatMoney(dish.revenue)}
                      </div>
                    </div>
                  </div>
                ))}
                {selectedReport.top_dishes.length === 0 && (
                  <p className="text-slate-400 text-sm">Sin datos de pedidos</p>
                )}
              </div>
            </div>

            {/* Staff Leaderboard */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h3 className="font-bold text-slate-900 mb-4">
                Leaderboard Staff
              </h3>
              <div className="space-y-3">
                {selectedReport.staff_leaderboard
                  .slice(0, 5)
                  .map((staff, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0
                            ? "bg-amber-100 text-amber-700"
                            : idx === 1
                              ? "bg-slate-100 text-slate-600"
                              : idx === 2
                                ? "bg-orange-100 text-orange-700"
                                : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-slate-900">
                          {staff.name}
                        </div>
                        <div className="text-xs text-slate-500 capitalize">
                          {staff.department}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-slate-900">
                          {staff.points} pts
                        </div>
                        <div className="text-xs text-slate-500">
                          QC: {staff.qc_score.toFixed(1)}
                        </div>
                      </div>
                    </div>
                  ))}
                {selectedReport.staff_leaderboard.length === 0 && (
                  <p className="text-slate-400 text-sm">Sin datos de staff</p>
                )}
              </div>
            </div>
          </div>

          {/* Operations Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="font-bold text-slate-900 mb-4">Resumen Operativo</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-black text-emerald-600">
                  {selectedReport.checklists_completed}
                </div>
                <div className="text-xs text-slate-500">
                  Checklists Completados
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-amber-600">
                  {selectedReport.maintenance_issues_opened}
                </div>
                <div className="text-xs text-slate-500">
                  Incidencias Abiertas
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-blue-600">
                  {selectedReport.maintenance_issues_closed}
                </div>
                <div className="text-xs text-slate-500">
                  Incidencias Cerradas
                </div>
              </div>
              <div>
                <div className="text-2xl font-black text-rose-600">
                  {selectedReport.maintenance_pending}
                </div>
                <div className="text-xs text-slate-500">Pendientes</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-slate-50 rounded-xl p-8 text-center">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-slate-600 font-medium">
            No hay reportes generados
          </div>
          <p className="text-slate-400 text-sm mt-1">
            Haz clic en &quot;Generar Esta Semana&quot; para crear tu primer
            reporte semanal
          </p>
        </div>
      )}

      {/* Quick Export Buttons */}
      <div className="mt-8 bg-slate-50 rounded-xl p-5">
        <h3 className="font-bold text-slate-900 mb-4">Exportacion Rapida</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                setExportTable(option.key);
                setShowExportModal(true);
              }}
              className="flex items-center gap-2 px-4 py-3 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-left"
            >
              <span className="text-xl">{option.icon}</span>
              <span className="text-sm font-medium text-slate-700">
                {option.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* WhatsApp Preview Modal */}
      {whatsappMessage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full">
            <h3 className="text-lg font-bold mb-4">
              Vista Previa Mensaje WhatsApp
            </h3>
            <div className="bg-emerald-50 rounded-xl p-4 mb-4 max-h-96 overflow-y-auto">
              <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                {whatsappMessage}
              </pre>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(whatsappMessage);
                  alert("Copiado al portapapeles!");
                }}
                className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-bold"
              >
                Copiar Mensaje
              </button>
              <button
                onClick={() => setWhatsappMessage(null)}
                className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-medium"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-bold mb-4">Exportar Datos</h3>

            {/* Table Selection */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Tipo de Datos
              </label>
              <select
                value={exportTable}
                onChange={(e) => setExportTable(e.target.value as ExportTable)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {EXPORT_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.icon} {option.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Desde
                </label>
                <input
                  type="date"
                  value={exportStartDate}
                  onChange={(e) => setExportStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Hasta
                </label>
                <input
                  type="date"
                  value={exportEndDate}
                  onChange={(e) => setExportEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Format Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Formato
              </label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="xlsx"
                    checked={exportFormat === "xlsx"}
                    onChange={() => setExportFormat("xlsx")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">Excel (.xlsx)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="format"
                    value="csv"
                    checked={exportFormat === "csv"}
                    onChange={() => setExportFormat("csv")}
                    className="w-4 h-4 text-blue-600"
                  />
                  <span className="text-sm">CSV (.csv)</span>
                </label>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                disabled={exporting}
                className="flex-1 px-4 py-2.5 bg-blue-500 text-white rounded-lg font-bold hover:bg-blue-600 disabled:opacity-50"
              >
                {exporting ? "Exportando..." : "Descargar"}
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2.5 bg-slate-100 text-slate-600 rounded-lg font-medium hover:bg-slate-200"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
