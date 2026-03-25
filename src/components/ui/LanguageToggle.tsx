"use client";

import { useLanguage } from "@/lib/i18n/context";

interface LanguageToggleProps {
  compact?: boolean;
}

export function LanguageToggle({ compact = false }: LanguageToggleProps) {
  const { lang, setLang } = useLanguage();

  if (compact) {
    return (
      <button
        onClick={() => setLang(lang === "es" ? "en" : "es")}
        className="flex items-center justify-center min-h-[44px] min-w-[44px] text-xs font-bold text-slate-400 hover:text-white transition-colors"
        title={lang === "es" ? "Switch to English" : "Cambiar a Espanol"}
      >
        {lang === "es" ? "EN" : "ES"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
      <button
        onClick={() => setLang("es")}
        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          lang === "es"
            ? "bg-cyan-500 text-slate-900"
            : "text-slate-400 hover:text-white"
        }`}
      >
        ES
      </button>
      <button
        onClick={() => setLang("en")}
        className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
          lang === "en"
            ? "bg-cyan-500 text-slate-900"
            : "text-slate-400 hover:text-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
