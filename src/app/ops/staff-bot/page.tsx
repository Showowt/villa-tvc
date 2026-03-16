"use client";

import { useState, useRef, useEffect } from "react";
import type { BotMessage } from "@/lib/ops/types";

const STARTERS = [
  "Como hago un Moscow Mule?",
  "Opciones sin gluten",
  "Protocolo de limpieza villa",
  "Horarios del barco",
  "Protocolo de emergencia",
  "Protocolo de alergias",
  "Como hago una Margarita?",
  "Precio del Mojito?",
];

export default function StaffBotPage() {
  const [messages, setMessages] = useState<BotMessage[]>([
    {
      role: "bot",
      text: "Hola! 🏝️ Soy el asistente de TVC. Pregúntame sobre recetas, procedimientos, horarios, alergias, o cualquier cosa operacional.",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const msg = text || input;
    if (!msg.trim() || isLoading) return;

    // Add user message
    const userMessage: BotMessage = {
      role: "user",
      text: msg,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/ops/staff-bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: msg,
          history: messages.slice(-10).map((m) => ({
            role: m.role === "user" ? "user" : "assistant",
            text: m.text,
          })),
        }),
      });

      const data = await response.json();

      const botMessage: BotMessage = {
        role: "bot",
        text:
          data.response ||
          "Error al procesar. Contacta a Akil: +57 316 055 1387",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch {
      const errorMessage: BotMessage = {
        role: "bot",
        text: "⚠️ Error de conexión. Por favor contacta a Akil directamente: +57 316 055 1387",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderText = (text: string) => {
    // Parse markdown-like bold
    return text.split("**").map((part, j) =>
      j % 2 === 1 ? (
        <strong key={j} className="font-bold">
          {part}
        </strong>
      ) : (
        part
      ),
    );
  };

  return (
    <div>
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-xl font-extrabold">🤖 Back-of-House Staff Bot</h1>
          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            CLAUDE AI POWERED
          </span>
        </div>
        <p className="text-slate-500 text-xs">
          El staff pregunta al bot en vez de Akil. Recetas, procedimientos,
          horarios, protocolos de alergias — instantáneo, en español.
        </p>
      </div>

      {/* Stats bar */}
      <div className="bg-gradient-to-r from-[#0A0A0F] to-[#1a1a2e] rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="text-white/60 text-xs">
            <span className="text-[#00D4FF] font-bold">~50</span> preguntas/día
          </div>
          <div className="w-px h-4 bg-white/20" />
          <div className="text-white/60 text-xs">
            <span className="text-emerald-400 font-bold">15-20 hrs</span>{" "}
            ahorradas/semana
          </div>
        </div>
        <div className="text-white/40 text-[10px]">
          Powered by Claude AI + TVC Knowledge Base
        </div>
      </div>

      <div className="flex flex-col h-[480px]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3.5 bg-slate-100 rounded-xl mb-2.5">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} mb-2`}
            >
              <div
                className={`max-w-[85%] px-3.5 py-2.5 rounded-xl text-xs leading-relaxed whitespace-pre-line shadow-sm ${
                  m.role === "user"
                    ? "bg-[#0A0A0F] text-white rounded-br-sm"
                    : "bg-white text-slate-900 rounded-bl-sm border border-slate-200"
                }`}
              >
                {renderText(m.text)}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start mb-2">
              <div className="bg-white px-4 py-3 rounded-xl rounded-bl-sm border border-slate-200 shadow-sm">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full bg-[#00B4FF] animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          <div ref={endRef} />
        </div>

        {/* Quick starters */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              onClick={() => handleSend(s)}
              disabled={isLoading}
              className="px-2.5 py-1.5 rounded-full border border-[#00B4FF]/30 bg-[#00B4FF]/5 text-[#0066CC] text-[10px] font-semibold hover:bg-[#00B4FF]/15 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {s}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Pregunta algo... (recetas, protocolos, horarios)"
            disabled={isLoading}
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-[13px] outline-none focus:border-[#00B4FF] focus:ring-1 focus:ring-[#00B4FF]/20 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <button
            onClick={() => handleSend()}
            disabled={isLoading || !input.trim()}
            className="px-5 py-2.5 rounded-xl bg-[#0A0A0F] text-white font-bold text-[13px] hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>...</span>
              </>
            ) : (
              "Enviar"
            )}
          </button>
        </div>
      </div>

      {/* Escalation notice */}
      <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start gap-2">
          <span className="text-lg">📞</span>
          <div>
            <div className="text-xs font-bold text-amber-800">
              Escalación automática
            </div>
            <div className="text-[11px] text-amber-700">
              Si el bot no tiene la información, automáticamente sugiere
              contactar a Akil (+57 316 055 1387).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
