// ============================================
// QR CODE MANAGEMENT PAGE (Issue 67)
// View and print QR codes for all villas
// ============================================

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface Villa {
  id: string;
  name: string;
  nameEs: string;
  number: number;
}

interface QRData {
  villa_id: string;
  villa_info: Villa;
  menu_url: string;
  qr_code: {
    url: string;
    url_png: string;
    size: number;
  };
  wifi: {
    network: string;
    password: string;
  };
}

const VILLAS: Villa[] = [
  { id: "villa1", name: "Villa 1", nameEs: "Casa del Mar", number: 1 },
  { id: "villa2", name: "Villa 2", nameEs: "Casa del Sol", number: 2 },
  { id: "villa3", name: "Villa 3", nameEs: "Casa del Cielo", number: 3 },
  { id: "villa4", name: "Villa 4", nameEs: "Casa del Viento", number: 4 },
  { id: "villa5", name: "Villa 5", nameEs: "Casa del Bosque", number: 5 },
  { id: "villa6", name: "Villa 6", nameEs: "Casa del Rio", number: 6 },
  { id: "villa7", name: "Villa 7", nameEs: "Casa Coral", number: 7 },
  { id: "villa8", name: "Villa 8", nameEs: "Casa Palmera", number: 8 },
  { id: "villa9", name: "Villa 9", nameEs: "Casa Caracol", number: 9 },
  { id: "villa10", name: "Villa 10", nameEs: "Casa Arena", number: 10 },
  { id: "villa11", name: "Villa 11", nameEs: "Casa Estrella", number: 11 },
];

const COMMON_AREAS: Villa[] = [
  { id: "pool", name: "Pool Area", nameEs: "Zona de Piscina", number: 0 },
  { id: "beach", name: "Beach", nameEs: "Playa", number: 0 },
  { id: "common", name: "Common Area", nameEs: "Area Comun", number: 0 },
];

export default function QRCodesPage() {
  const [selectedVilla, setSelectedVilla] = useState<string | null>(null);
  const [qrData, setQrData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Fetch QR data for selected villa
  useEffect(() => {
    if (!selectedVilla) {
      setQrData(null);
      return;
    }

    setLoading(true);
    fetch(`/api/qr/${selectedVilla}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setQrData(data.data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [selectedVilla]);

  // Download all QR cards PDF
  const downloadAllCards = async () => {
    setGeneratingPDF(true);
    try {
      const response = await fetch("/api/qr/cards?format=cards");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "tvc-qr-cards.pdf";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Download single villa card
  const downloadSingleCard = async (villaId: string) => {
    try {
      const response = await fetch(
        `/api/qr/cards?format=single&villa=${villaId}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `tvc-qr-${villaId}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading PDF:", error);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Link
            href="/ops"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg
              className="w-6 h-6"
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
          <h1 className="text-2xl font-bold text-white">
            Codigos QR para Menu
          </h1>
        </div>
        <p className="text-slate-400">
          Genera e imprime codigos QR para ordenar desde cada villa
        </p>
      </div>

      {/* Actions Bar */}
      <div className="bg-slate-800 rounded-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={downloadAllCards}
            disabled={generatingPDF}
            className="flex items-center gap-2 px-4 py-2 bg-tvc-turquoise text-white rounded-lg font-medium hover:bg-tvc-turquoise/80 transition-colors disabled:opacity-50"
          >
            {generatingPDF ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Generando...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Descargar Todas las Tarjetas (PDF)
              </>
            )}
          </button>
        </div>

        <Link
          href="/kitchen/orders"
          className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
          Ver Pedidos de Cocina
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Villa List */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="text-lg font-semibold text-white mb-3">Villas</h2>
          <div className="space-y-2">
            {VILLAS.map((villa) => (
              <button
                key={villa.id}
                onClick={() => setSelectedVilla(villa.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  selectedVilla === villa.id
                    ? "bg-tvc-turquoise/20 border border-tvc-turquoise text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{villa.name}</div>
                  <div className="text-sm text-slate-400">{villa.nameEs}</div>
                </div>
                <svg
                  className={`w-5 h-5 ${
                    selectedVilla === villa.id
                      ? "text-tvc-turquoise"
                      : "text-slate-500"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-white mb-3 mt-6">
            Areas Comunes
          </h2>
          <div className="space-y-2">
            {COMMON_AREAS.map((area) => (
              <button
                key={area.id}
                onClick={() => setSelectedVilla(area.id)}
                className={`w-full flex items-center justify-between p-3 rounded-lg transition-all ${
                  selectedVilla === area.id
                    ? "bg-tvc-gold/20 border border-tvc-gold text-white"
                    : "bg-slate-800 border border-slate-700 text-slate-300 hover:border-slate-600"
                }`}
              >
                <div className="text-left">
                  <div className="font-medium">{area.nameEs}</div>
                  <div className="text-sm text-slate-400">{area.name}</div>
                </div>
                <svg
                  className={`w-5 h-5 ${
                    selectedVilla === area.id
                      ? "text-tvc-gold"
                      : "text-slate-500"
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </button>
            ))}
          </div>
        </div>

        {/* QR Preview */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="bg-slate-800 rounded-xl p-8 flex items-center justify-center h-96">
              <div className="animate-spin w-8 h-8 border-3 border-tvc-turquoise border-t-transparent rounded-full" />
            </div>
          ) : qrData ? (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              {/* Header */}
              <div className="bg-tvc-deep p-4 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">
                  {qrData.villa_info.name}
                </h2>
                <p className="text-tvc-turquoise">{qrData.villa_info.nameEs}</p>
              </div>

              <div className="p-6 flex flex-col items-center">
                {/* QR Code */}
                <div className="bg-white p-4 rounded-xl mb-6">
                  <img
                    src={qrData.qr_code.url}
                    alt={`QR Code for ${qrData.villa_info.name}`}
                    className="w-64 h-64"
                  />
                </div>

                {/* Instructions */}
                <div className="text-center mb-6">
                  <p className="text-white font-medium">
                    Escanea para ordenar comida y bebidas
                  </p>
                  <p className="text-slate-400 text-sm">
                    Scan to order food & drinks
                  </p>
                </div>

                {/* Menu URL */}
                <div className="w-full bg-slate-700 rounded-lg p-3 mb-6">
                  <p className="text-xs text-slate-400 mb-1">URL del Menu:</p>
                  <code className="text-tvc-turquoise text-sm break-all">
                    {qrData.menu_url}
                  </code>
                </div>

                {/* WiFi Info */}
                <div className="w-full bg-slate-700/50 rounded-lg p-4 mb-6">
                  <h3 className="text-white font-medium mb-2">
                    WiFi Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-400">Red / Network:</span>
                      <p className="text-white font-mono">
                        {qrData.wifi.network}
                      </p>
                    </div>
                    <div>
                      <span className="text-slate-400">
                        Contrasena / Password:
                      </span>
                      <p className="text-white font-mono">
                        {qrData.wifi.password}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    onClick={() => downloadSingleCard(qrData.villa_id)}
                    className="flex items-center gap-2 px-4 py-2 bg-tvc-turquoise text-white rounded-lg font-medium hover:bg-tvc-turquoise/80 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Descargar PDF
                  </button>
                  <a
                    href={qrData.qr_code.url}
                    download={`qr-${qrData.villa_id}.svg`}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                      />
                    </svg>
                    Solo QR (SVG)
                  </a>
                  <Link
                    href={qrData.menu_url}
                    target="_blank"
                    className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg font-medium hover:bg-slate-600 transition-colors"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Ver Menu
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl p-8 flex flex-col items-center justify-center h-96 text-slate-500">
              <svg
                className="w-16 h-16 mb-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
              <p className="text-lg font-medium mb-2">Selecciona una villa</p>
              <p className="text-sm">
                Elige una villa o area comun para ver su codigo QR
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="mt-8 bg-slate-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Instrucciones de Impresion
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-tvc-turquoise/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-tvc-turquoise font-bold">1</span>
            </div>
            <div>
              <h3 className="text-white font-medium">Descargar PDF</h3>
              <p className="text-slate-400">
                Descarga todas las tarjetas en un solo PDF o individualmente
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-tvc-turquoise/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-tvc-turquoise font-bold">2</span>
            </div>
            <div>
              <h3 className="text-white font-medium">Imprimir en Cartulina</h3>
              <p className="text-slate-400">
                Usa papel grueso (200gsm) para mejor durabilidad
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="w-8 h-8 bg-tvc-turquoise/20 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-tvc-turquoise font-bold">3</span>
            </div>
            <div>
              <h3 className="text-white font-medium">Colocar en Villas</h3>
              <p className="text-slate-400">
                Ubicar en mesa de noche o area de comedor de cada villa
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
