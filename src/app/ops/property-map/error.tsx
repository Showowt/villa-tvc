"use client";

import { useEffect } from "react";

export default function PropertyMapError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[PropertyMap Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center bg-white rounded-2xl p-8 shadow-lg">
        <div className="text-5xl mb-4">🗺️</div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          Error al cargar el mapa
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          No pudimos cargar el mapa de la propiedad. Verifica tu conexion e
          intenta de nuevo.
        </p>
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="w-full py-3 bg-cyan-500 text-white rounded-xl font-medium text-base hover:bg-cyan-600 transition-colors min-h-[56px]"
          >
            Reintentar
          </button>
          <button
            onClick={() => window.location.reload()}
            className="w-full py-3 bg-slate-200 text-slate-800 rounded-xl font-medium text-base hover:bg-slate-300 transition-colors min-h-[56px]"
          >
            Recargar pagina
          </button>
        </div>
      </div>
    </div>
  );
}
