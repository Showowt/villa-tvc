"use client";

// ═══════════════════════════════════════════════════════════════
// TVC API ERROR COMPONENT
// Issue #3 — NO ERROR HANDLING UI
// P0 Day 1 Fix: Proper API error handling with retry logic
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

export interface ApiErrorType {
  code:
    | "NETWORK"
    | "TIMEOUT"
    | "SERVER"
    | "AUTH"
    | "NOT_FOUND"
    | "VALIDATION"
    | "UNKNOWN";
  message: string;
  statusCode?: number;
  retryable: boolean;
}

interface ApiErrorProps {
  error: ApiErrorType;
  onRetry?: () => Promise<void>;
  cachedData?: unknown;
  onUseCachedData?: () => void;
  className?: string;
  compact?: boolean;
}

// Error configurations in Spanish
const ERROR_CONFIG: Record<
  ApiErrorType["code"],
  {
    icon: string;
    title: string;
    description: string;
    color: string;
  }
> = {
  NETWORK: {
    icon: "📡",
    title: "Sin conexion a internet",
    description: "Verifica tu conexion e intenta de nuevo.",
    color: "amber",
  },
  TIMEOUT: {
    icon: "⏱️",
    title: "La solicitud tardo demasiado",
    description: "El servidor esta tardando en responder. Intenta de nuevo.",
    color: "amber",
  },
  SERVER: {
    icon: "🖥️",
    title: "Error del servidor",
    description:
      "Hubo un problema en el servidor. Intenta de nuevo en unos minutos.",
    color: "red",
  },
  AUTH: {
    icon: "🔐",
    title: "Sesion expirada",
    description: "Tu sesion ha expirado. Por favor inicia sesion nuevamente.",
    color: "amber",
  },
  NOT_FOUND: {
    icon: "🔍",
    title: "No encontrado",
    description: "El recurso solicitado no existe o fue eliminado.",
    color: "slate",
  },
  VALIDATION: {
    icon: "⚠️",
    title: "Datos invalidos",
    description:
      "Algunos datos enviados no son validos. Revisa e intenta de nuevo.",
    color: "amber",
  },
  UNKNOWN: {
    icon: "❓",
    title: "Error inesperado",
    description: "Ocurrio un error inesperado. Por favor intenta de nuevo.",
    color: "red",
  },
};

export function ApiError({
  error,
  onRetry,
  cachedData,
  onUseCachedData,
  className,
  compact = false,
}: ApiErrorProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);

  const config = ERROR_CONFIG[error.code];

  // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
  const calculateDelay = useCallback((attempt: number): number => {
    const delay = Math.min(1000 * Math.pow(2, attempt), 30000);
    return delay;
  }, []);

  // Countdown timer
  useEffect(() => {
    if (retryDelay <= 0) return;

    const timer = setInterval(() => {
      setRetryDelay((prev) => Math.max(0, prev - 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [retryDelay]);

  const handleRetry = async () => {
    if (!onRetry || isRetrying || retryDelay > 0) return;

    setIsRetrying(true);

    try {
      await onRetry();
      setRetryCount(0);
    } catch {
      // Failed - set exponential backoff
      const newCount = retryCount + 1;
      setRetryCount(newCount);

      if (newCount < 5) {
        const delay = calculateDelay(newCount);
        setRetryDelay(delay);
      }
    } finally {
      setIsRetrying(false);
    }
  };

  const colorClasses = {
    amber: {
      bg: "bg-amber-500/10",
      border: "border-amber-500/30",
      text: "text-amber-400",
      button: "bg-amber-500 hover:bg-amber-600",
    },
    red: {
      bg: "bg-red-500/10",
      border: "border-red-500/30",
      text: "text-red-400",
      button: "bg-red-500 hover:bg-red-600",
    },
    slate: {
      bg: "bg-slate-500/10",
      border: "border-slate-500/30",
      text: "text-slate-400",
      button: "bg-slate-500 hover:bg-slate-600",
    },
  };

  const colors = colorClasses[config.color as keyof typeof colorClasses];

  // Compact version for inline use
  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border",
          colors.bg,
          colors.border,
          className,
        )}
      >
        <span className="text-xl">{config.icon}</span>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", colors.text)}>
            {config.title}
          </p>
        </div>
        {error.retryable && onRetry && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || retryDelay > 0}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium text-white transition-colors",
              colors.button,
              (isRetrying || retryDelay > 0) && "opacity-50 cursor-not-allowed",
            )}
          >
            {isRetrying
              ? "..."
              : retryDelay > 0
                ? `${Math.ceil(retryDelay / 1000)}s`
                : "Reintentar"}
          </button>
        )}
      </div>
    );
  }

  // Full version
  return (
    <div
      className={cn(
        "p-6 rounded-xl border text-center",
        colors.bg,
        colors.border,
        className,
      )}
    >
      <div className="text-5xl mb-4">{config.icon}</div>
      <h3 className={cn("text-lg font-bold mb-2", colors.text)}>
        {config.title}
      </h3>
      <p className="text-sm text-slate-400 mb-1">{config.description}</p>
      {error.message && error.message !== config.description && (
        <p className="text-xs text-slate-500 mb-4">{error.message}</p>
      )}
      {error.statusCode && (
        <p className="text-xs text-slate-500 mb-4">
          Codigo: {error.statusCode}
        </p>
      )}

      {/* Retry limit message */}
      {retryCount >= 5 && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-xs text-red-400">
            Multiples intentos fallidos. Verifica tu conexion o contacta soporte
            si el problema persiste.
          </p>
        </div>
      )}

      {/* Cached data option */}
      {cachedData && onUseCachedData && (
        <div className="mb-4 p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-lg">
          <div className="flex items-center justify-center gap-2 mb-2">
            <span className="text-cyan-400">📦</span>
            <span className="text-sm font-medium text-cyan-400">
              Datos guardados disponibles
            </span>
          </div>
          <button
            onClick={onUseCachedData}
            className="text-xs text-cyan-400 underline hover:text-cyan-300"
          >
            Ver ultimos datos guardados
          </button>
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {error.retryable && onRetry && retryCount < 5 && (
          <button
            onClick={handleRetry}
            disabled={isRetrying || retryDelay > 0}
            className={cn(
              "w-full py-3 rounded-xl font-medium text-white transition-colors min-h-[56px]",
              isRetrying || retryDelay > 0
                ? "bg-slate-600 cursor-not-allowed"
                : "bg-cyan-500 hover:bg-cyan-600",
            )}
          >
            {isRetrying ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Reintentando...
              </span>
            ) : retryDelay > 0 ? (
              `Reintentar en ${Math.ceil(retryDelay / 1000)}s`
            ) : (
              "Reintentar"
            )}
          </button>
        )}

        {error.code === "AUTH" && (
          <button
            onClick={() => (window.location.href = "/login")}
            className="w-full py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors min-h-[56px]"
          >
            Iniciar sesion
          </button>
        )}

        <button
          onClick={() => window.location.reload()}
          className="w-full py-3 bg-slate-700 text-white rounded-xl font-medium hover:bg-slate-600 transition-colors min-h-[56px]"
        >
          Recargar pagina
        </button>
      </div>

      {/* Retry counter */}
      {retryCount > 0 && retryCount < 5 && (
        <p className="text-xs text-slate-500 mt-3">Intento {retryCount} de 5</p>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// API ERROR NORMALIZER
// Convert various error types to standardized ApiErrorType
// ═══════════════════════════════════════════════════════════════

export function normalizeApiError(error: unknown): ApiErrorType {
  // Network errors
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      code: "NETWORK",
      message: "No se pudo conectar al servidor",
      retryable: true,
    };
  }

  // Timeout errors
  if (error instanceof DOMException && error.name === "AbortError") {
    return {
      code: "TIMEOUT",
      message: "La solicitud excedio el tiempo de espera",
      retryable: true,
    };
  }

  // HTTP response errors
  if (error && typeof error === "object" && "status" in error) {
    const status = (error as { status: number }).status;
    const message = (error as { message?: string }).message || "";

    if (status === 401 || status === 403) {
      return {
        code: "AUTH",
        message: "Sesion no valida",
        statusCode: status,
        retryable: false,
      };
    }

    if (status === 404) {
      return {
        code: "NOT_FOUND",
        message: message || "Recurso no encontrado",
        statusCode: status,
        retryable: false,
      };
    }

    if (status === 400 || status === 422) {
      return {
        code: "VALIDATION",
        message: message || "Datos no validos",
        statusCode: status,
        retryable: false,
      };
    }

    if (status >= 500) {
      return {
        code: "SERVER",
        message: message || "Error interno del servidor",
        statusCode: status,
        retryable: true,
      };
    }
  }

  // Generic errors
  if (error instanceof Error) {
    return {
      code: "UNKNOWN",
      message: error.message,
      retryable: true,
    };
  }

  return {
    code: "UNKNOWN",
    message: "Error desconocido",
    retryable: true,
  };
}
