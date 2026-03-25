"use client";

import { useEffect } from "react";

export default function ChecklistError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Checklist Error]", error);
  }, [error]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="text-5xl mb-4">✅</div>
        <h2 className="text-xl font-bold text-white mb-2">
          Error al cargar checklists
        </h2>
        <p className="text-sm text-slate-400 mb-6">
          No pudimos cargar los checklists. Verifica tu conexion e intenta de
          nuevo.
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
            className="w-full py-3 bg-slate-700 text-white rounded-xl font-medium text-base hover:bg-slate-600 transition-colors min-h-[56px]"
          >
            Recargar pagina
          </button>
        </div>
      </div>
    </div>
  );
}
