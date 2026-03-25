// ============================================
// GUEST FEEDBACK SURVEY PAGE (Issue 77)
// Post-stay survey with NPS and ratings
// ============================================

"use client";

import { useState } from "react";

interface FeedbackForm {
  guest_name: string;
  guest_email: string;
  overall_rating: number;
  cleanliness_rating: number;
  service_rating: number;
  food_rating: number;
  nps_score: number;
  comment: string;
  highlights: string[];
  improvements: string[];
}

const HIGHLIGHTS_OPTIONS = [
  { id: "beach", es: "Playa privada", en: "Private beach" },
  { id: "staff", es: "Servicio del personal", en: "Staff service" },
  { id: "food", es: "Comida y bebidas", en: "Food and drinks" },
  { id: "pool", es: "Piscina", en: "Pool" },
  { id: "villas", es: "Diseno de las villas", en: "Villa design" },
  { id: "sunset", es: "Atardeceres", en: "Sunsets" },
  { id: "quiet", es: "Tranquilidad", en: "Peacefulness" },
  { id: "excursions", es: "Excursiones", en: "Excursions" },
];

const IMPROVEMENT_OPTIONS = [
  { id: "wifi", es: "WiFi", en: "WiFi" },
  { id: "ac", es: "Aire acondicionado", en: "Air conditioning" },
  { id: "food_variety", es: "Variedad de comida", en: "Food variety" },
  { id: "activities", es: "Actividades", en: "Activities" },
  { id: "communication", es: "Comunicacion", en: "Communication" },
  { id: "transport", es: "Transporte al muelle", en: "Dock transport" },
  { id: "cleaning", es: "Limpieza", en: "Cleaning" },
];

export default function FeedbackPage() {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState<FeedbackForm>({
    guest_name: "",
    guest_email: "",
    overall_rating: 0,
    cleanliness_rating: 0,
    service_rating: 0,
    food_rating: 0,
    nps_score: -1,
    comment: "",
    highlights: [],
    improvements: [],
  });

  const updateForm = <K extends keyof FeedbackForm>(
    key: K,
    value: FeedbackForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArrayItem = (
    key: "highlights" | "improvements",
    item: string,
  ) => {
    setForm((prev) => ({
      ...prev,
      [key]: prev[key].includes(item)
        ? prev[key].filter((i) => i !== item)
        : [...prev[key], item],
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          language: "es",
          source: "survey",
        }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
      } else {
        setError(data.error || "Error al enviar la encuesta");
      }
    } catch (err) {
      setError("Error de conexion. Por favor intente de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-tvc-void flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg
              className="w-10 h-10 text-green-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h1 className="font-display text-2xl text-white mb-4">
            Gracias por tus comentarios!
          </h1>
          <p className="text-white/60 mb-6">
            Tu opinion nos ayuda a mejorar. Esperamos verte pronto en TVC!
          </p>
          <a
            href="https://villa-tvc.vercel.app"
            className="inline-block px-6 py-3 bg-tvc-turquoise text-white rounded-lg font-medium"
          >
            Volver a TVC
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-tvc-void">
      {/* Header */}
      <header className="bg-tvc-deep border-b border-white/10">
        <div className="max-w-lg mx-auto px-4 py-6">
          <h1 className="font-display text-2xl text-white text-center">
            Encuesta de Satisfaccion
          </h1>
          <p className="text-center text-white/60 mt-2">
            Tiny Village Cartagena
          </p>
        </div>
      </header>

      {/* Progress */}
      <div className="max-w-lg mx-auto px-4 py-4">
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full ${
                s <= step ? "bg-tvc-turquoise" : "bg-white/20"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Form Steps */}
      <div className="max-w-lg mx-auto px-4 pb-8">
        {/* Step 1: Basic Info */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-white mb-2">
                Cuentanos sobre ti
              </h2>
              <p className="text-sm text-white/60">
                Tu informacion es confidencial
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-white/80 mb-2">
                  Tu nombre
                </label>
                <input
                  type="text"
                  value={form.guest_name}
                  onChange={(e) => updateForm("guest_name", e.target.value)}
                  placeholder="Juan Perez"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                />
              </div>

              <div>
                <label className="block text-sm text-white/80 mb-2">
                  Email (opcional)
                </label>
                <input
                  type="email"
                  value={form.guest_email}
                  onChange={(e) => updateForm("guest_email", e.target.value)}
                  placeholder="juan@email.com"
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40"
                />
              </div>
            </div>

            <button
              onClick={() => setStep(2)}
              disabled={!form.guest_name}
              className="w-full py-4 bg-tvc-turquoise text-white rounded-xl font-semibold disabled:opacity-50"
            >
              Continuar
            </button>
          </div>
        )}

        {/* Step 2: Ratings */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-white mb-2">
                Califica tu experiencia
              </h2>
              <p className="text-sm text-white/60">1 = Malo, 5 = Excelente</p>
            </div>

            <div className="space-y-6">
              <RatingInput
                label="Experiencia general"
                value={form.overall_rating}
                onChange={(v) => updateForm("overall_rating", v)}
              />
              <RatingInput
                label="Limpieza"
                value={form.cleanliness_rating}
                onChange={(v) => updateForm("cleanliness_rating", v)}
              />
              <RatingInput
                label="Servicio del personal"
                value={form.service_rating}
                onChange={(v) => updateForm("service_rating", v)}
              />
              <RatingInput
                label="Comida y bebidas"
                value={form.food_rating}
                onChange={(v) => updateForm("food_rating", v)}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-4 bg-white/10 text-white rounded-xl font-semibold"
              >
                Atras
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={form.overall_rating === 0}
                className="flex-1 py-4 bg-tvc-turquoise text-white rounded-xl font-semibold disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 3: NPS */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-white mb-2">
                Que tan probable es que nos recomiendes?
              </h2>
              <p className="text-sm text-white/60">
                0 = Nada probable, 10 = Muy probable
              </p>
            </div>

            <div className="grid grid-cols-11 gap-1">
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => updateForm("nps_score", n)}
                  className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium ${
                    form.nps_score === n
                      ? n >= 9
                        ? "bg-green-500 text-white"
                        : n >= 7
                          ? "bg-yellow-500 text-black"
                          : "bg-red-500 text-white"
                      : "bg-white/10 text-white/60 hover:bg-white/20"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>

            <div className="flex justify-between text-xs text-white/40">
              <span>Nada probable</span>
              <span>Muy probable</span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep(2)}
                className="flex-1 py-4 bg-white/10 text-white rounded-xl font-semibold"
              >
                Atras
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={form.nps_score < 0}
                className="flex-1 py-4 bg-tvc-turquoise text-white rounded-xl font-semibold disabled:opacity-50"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Comments */}
        {step === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-xl text-white mb-2">
                Que te gusto mas?
              </h2>
              <div className="flex flex-wrap gap-2">
                {HIGHLIGHTS_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleArrayItem("highlights", opt.id)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      form.highlights.includes(opt.id)
                        ? "bg-tvc-turquoise text-white"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {opt.es}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-display text-xl text-white mb-2">
                Que podemos mejorar?
              </h2>
              <div className="flex flex-wrap gap-2">
                {IMPROVEMENT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => toggleArrayItem("improvements", opt.id)}
                    className={`px-3 py-2 rounded-lg text-sm ${
                      form.improvements.includes(opt.id)
                        ? "bg-red-500/50 text-white"
                        : "bg-white/10 text-white/60"
                    }`}
                  >
                    {opt.es}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-2">
                Comentarios adicionales (opcional)
              </label>
              <textarea
                value={form.comment}
                onChange={(e) => updateForm("comment", e.target.value)}
                placeholder="Cuentanos mas sobre tu experiencia..."
                rows={4}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 resize-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setStep(3)}
                className="flex-1 py-4 bg-white/10 text-white rounded-xl font-semibold"
              >
                Atras
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 py-4 bg-tvc-gold text-black rounded-xl font-semibold disabled:opacity-50"
              >
                {isSubmitting ? "Enviando..." : "Enviar Encuesta"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RatingInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label className="block text-sm text-white/80 mb-3">{label}</label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`flex-1 py-3 rounded-lg text-center ${
              value >= n
                ? "bg-tvc-gold text-black"
                : "bg-white/10 text-white/40"
            }`}
          >
            <span className="text-xl">{value >= n ? "★" : "☆"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
