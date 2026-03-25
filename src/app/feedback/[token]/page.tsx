"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";

// ─────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────

interface FeedbackData {
  id: string;
  guest_name: string;
  booking_id: string | null;
  check_out_date: string | null;
  villa_id: string | null;
  status: "pending" | "submitted";
}

// ─────────────────────────────────────────────────────────────────
// Star Rating Component
// ─────────────────────────────────────────────────────────────────

function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (rating: number) => void;
  size?: "sm" | "lg";
}) {
  const [hovered, setHovered] = useState(0);

  const sizeClasses = size === "lg" ? "text-5xl" : "text-3xl";
  const gapClasses = size === "lg" ? "gap-2" : "gap-1";

  return (
    <div
      className={`flex ${gapClasses} justify-center`}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className={`${sizeClasses} transition-all duration-200 transform hover:scale-110 active:scale-95`}
          onMouseEnter={() => setHovered(star)}
          onClick={() => onChange(star)}
          aria-label={`${star} estrellas`}
        >
          <span
            className={
              star <= (hovered || value)
                ? "text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]"
                : "text-slate-600"
            }
          >
            ★
          </span>
        </button>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// NPS Slider Component
// ─────────────────────────────────────────────────────────────────

function NPSSlider({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (score: number) => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-sm text-slate-400">
        <span>Nada probable</span>
        <span>Muy probable</span>
      </div>
      <div className="flex justify-between gap-1">
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            className={`
              w-8 h-10 rounded-lg font-bold text-sm transition-all
              ${
                value === score
                  ? score <= 6
                    ? "bg-red-500 text-white"
                    : score <= 8
                      ? "bg-yellow-500 text-white"
                      : "bg-green-500 text-white"
                  : "bg-slate-700 text-slate-400 hover:bg-slate-600"
              }
            `}
          >
            {score}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-xs text-slate-500">
        <span className="text-red-400">Detractor</span>
        <span className="text-yellow-400">Neutral</span>
        <span className="text-green-400">Promotor</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Feedback Page Component
// ─────────────────────────────────────────────────────────────────

export default function FeedbackPage(props: {
  params: Promise<{ token: string }>;
}) {
  const params = use(props.params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);

  // Form state
  const [overallRating, setOverallRating] = useState(0);
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showNPS, setShowNPS] = useState(false);

  // Load feedback data
  useEffect(() => {
    loadFeedback();
  }, [params.token]);

  const loadFeedback = async () => {
    try {
      const response = await fetch(`/api/feedback/token/${params.token}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Enlace de feedback invalido");
        setLoading(false);
        return;
      }

      if (data.data.status === "submitted") {
        setSubmitted(true);
      }

      setFeedbackData(data.data);
    } catch {
      setError("Error al cargar el formulario");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (overallRating === 0) {
      setError("Por favor seleccione una calificacion");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/feedback/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: params.token,
          overall_rating: overallRating,
          nps_score: npsScore,
          comment: comment.trim() || null,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || "Error al enviar feedback");
        return;
      }

      setSubmitted(true);

      // If high rating, redirect to Google review
      if (overallRating >= 4 && data.google_review_link) {
        setTimeout(() => {
          window.location.href = data.google_review_link;
        }, 2000);
      }
    } catch {
      setError("Error al enviar feedback");
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !feedbackData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-5xl mb-4">😔</div>
          <h1 className="text-xl font-bold text-white mb-2">
            Enlace no valido
          </h1>
          <p className="text-slate-400">{error}</p>
        </div>
      </div>
    );
  }

  // Already submitted
  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        <div className="bg-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🎉</div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Gracias por su feedback!
          </h1>
          <p className="text-slate-400 mb-4">
            Su opinion nos ayuda a mejorar constantemente.
          </p>
          {overallRating >= 4 && (
            <div className="bg-teal-500/20 border border-teal-500/50 rounded-xl p-4 text-sm text-teal-300">
              <p className="mb-2">
                Si disfrusto su estancia, nos encantaria que compartiera su
                experiencia en Google.
              </p>
              <p className="text-xs text-teal-400">
                Redirigiendo a Google Reviews...
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Main feedback form
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 py-8">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="text-4xl mb-3">🏝️</div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Tiny Village Cartagena
          </h1>
          <p className="text-slate-400 text-sm">
            {feedbackData?.guest_name
              ? `Hola ${feedbackData.guest_name}!`
              : "Gracias por hospedarse con nosotros"}
          </p>
        </div>

        {/* Rating Card */}
        <div className="bg-slate-800 rounded-2xl p-6 mb-4">
          <h2 className="text-lg font-semibold text-white text-center mb-6">
            Como calificaria su estancia?
          </h2>

          <StarRating value={overallRating} onChange={setOverallRating} />

          <div className="text-center mt-4 h-6">
            {overallRating > 0 && (
              <p
                className={`text-sm font-medium ${
                  overallRating >= 4
                    ? "text-green-400"
                    : overallRating >= 3
                      ? "text-yellow-400"
                      : "text-red-400"
                }`}
              >
                {overallRating === 5 && "Excelente!"}
                {overallRating === 4 && "Muy bueno!"}
                {overallRating === 3 && "Bueno"}
                {overallRating === 2 && "Regular"}
                {overallRating === 1 && "Necesita mejorar"}
              </p>
            )}
          </div>
        </div>

        {/* NPS Section (expandable) */}
        {overallRating > 0 && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-4">
            <button
              type="button"
              onClick={() => setShowNPS(!showNPS)}
              className="w-full flex items-center justify-between text-left"
            >
              <div>
                <h3 className="text-white font-medium">
                  Recomendaria TVC a un amigo?
                </h3>
                <p className="text-xs text-slate-500">Opcional pero muy util</p>
              </div>
              <span className="text-slate-400">{showNPS ? "▲" : "▼"}</span>
            </button>

            {showNPS && (
              <div className="mt-4">
                <NPSSlider value={npsScore} onChange={setNpsScore} />
              </div>
            )}
          </div>
        )}

        {/* Comment Section */}
        {overallRating > 0 && (
          <div className="bg-slate-800 rounded-2xl p-6 mb-4">
            <h3 className="text-white font-medium mb-3">
              Algun comentario adicional?
            </h3>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                overallRating >= 4
                  ? "Que fue lo que mas le gusto?"
                  : "Como podemos mejorar?"
              }
              rows={4}
              className="w-full bg-slate-700 border border-slate-600 rounded-xl p-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-teal-500 resize-none"
            />
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-3 mb-4 text-red-300 text-sm text-center">
            {error}
          </div>
        )}

        {/* Submit Button */}
        {overallRating > 0 && (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg transition-all
              ${
                submitting
                  ? "bg-slate-700 text-slate-400 cursor-not-allowed"
                  : "bg-gradient-to-r from-teal-500 to-cyan-500 text-white hover:from-teal-400 hover:to-cyan-400 active:scale-[0.98]"
              }
            `}
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Enviando...
              </span>
            ) : (
              "Enviar Feedback"
            )}
          </button>
        )}

        {/* Privacy note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          Su feedback es confidencial y nos ayuda a mejorar nuestro servicio.
        </p>
      </div>
    </div>
  );
}
