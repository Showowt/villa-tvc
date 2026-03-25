"use client";

// ═══════════════════════════════════════════════════════════════
// TVC ERROR BOUNDARY — COMPLETE ERROR HANDLING SYSTEM
// Issue #3 — NO ERROR HANDLING UI
// P0 Day 1 Fix: Staff sees proper error messages in Spanish
// ═══════════════════════════════════════════════════════════════

import { Component, ErrorInfo, ReactNode } from "react";
import {
  getFromOfflineStorage,
  OfflineStorageKey,
} from "@/lib/offline-storage";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showCachedData?: boolean;
  cacheKey?: OfflineStorageKey;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  cachedData: unknown;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      cachedData: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log error to console (in production, send to error tracking service)
    console.error("[ErrorBoundary] Error capturado:", error, errorInfo);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);

    // Try to load cached data if enabled
    if (this.props.showCachedData && this.props.cacheKey) {
      const cachedData = getFromOfflineStorage(this.props.cacheKey);
      if (cachedData) {
        this.setState({ cachedData });
      }
    }
  }

  handleRetry = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      cachedData: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="text-5xl mb-4">🔧</div>
            <h2 className="text-xl font-bold text-white mb-2">
              Algo salio mal
            </h2>
            <p className="text-sm text-slate-400 mb-6">
              Ha ocurrido un error inesperado. Intenta recargar la pagina o
              volver a intentar.
            </p>

            {/* Show cached data option */}
            {this.state.cachedData && (
              <div className="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-left">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-amber-400 text-lg">📦</span>
                  <span className="text-sm font-medium text-amber-400">
                    Datos guardados disponibles
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Puedes ver los ultimos datos guardados mientras intentamos
                  reconectar.
                </p>
              </div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={this.handleRetry}
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

            {/* Development error details */}
            {process.env.NODE_ENV === "development" && this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-xs text-slate-500 cursor-pointer">
                  Detalles del error (desarrollo)
                </summary>
                <pre className="mt-2 p-3 bg-slate-800 rounded-lg text-xs text-red-400 overflow-auto max-h-40">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ═══════════════════════════════════════════════════════════════
// ERROR FALLBACK COMPONENTS — Reusable error states
// ═══════════════════════════════════════════════════════════════

interface ErrorFallbackProps {
  message?: string;
  description?: string;
  onRetry?: () => void;
  icon?: string;
}

export function ErrorFallback({
  message = "Error al cargar",
  description,
  onRetry,
  icon = "⚠️",
}: ErrorFallbackProps) {
  return (
    <div className="p-6 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{message}</h3>
      {description && (
        <p className="text-sm text-slate-400 mb-4">{description}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors min-h-[56px]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

// Network error component
export function NetworkError({
  onRetry,
  showOfflineMessage = true,
}: {
  onRetry?: () => void;
  showOfflineMessage?: boolean;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-4xl mb-3">📡</div>
      <h3 className="text-lg font-bold text-white mb-2">Sin conexion</h3>
      <p className="text-sm text-slate-400 mb-4">
        Verifica tu conexion a internet e intenta de nuevo.
      </p>
      {showOfflineMessage && (
        <p className="text-xs text-amber-400 mb-4">
          💡 Los cambios pendientes se enviaran automaticamente cuando vuelvas a
          conectarte.
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors min-h-[56px]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

// Server error component
export function ServerError({
  onRetry,
  errorCode,
}: {
  onRetry?: () => void;
  errorCode?: number;
}) {
  return (
    <div className="p-6 text-center">
      <div className="text-4xl mb-3">🖥️</div>
      <h3 className="text-lg font-bold text-white mb-2">Error del servidor</h3>
      <p className="text-sm text-slate-400 mb-4">
        El servidor no pudo procesar tu solicitud. Por favor intenta de nuevo en
        unos minutos.
      </p>
      {errorCode && (
        <p className="text-xs text-slate-500 mb-4">
          Codigo de error: {errorCode}
        </p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors min-h-[56px]"
        >
          Reintentar
        </button>
      )}
    </div>
  );
}

// Empty state component
export function EmptyState({
  icon = "📋",
  title = "No hay datos",
  description = "No se encontraron elementos",
  action,
}: {
  icon?: string;
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <div className="p-8 text-center">
      <div className="text-4xl mb-3">{icon}</div>
      <h3 className="text-lg font-bold text-white mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-4">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-3 bg-cyan-500 text-white rounded-xl font-medium hover:bg-cyan-600 transition-colors min-h-[56px]"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INLINE ERROR COMPONENT
// ═══════════════════════════════════════════════════════════════

interface InlineErrorProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function InlineError({
  message,
  onRetry,
  compact = false,
}: InlineErrorProps) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
        <span className="text-red-400 text-sm">✕</span>
        <span className="text-xs text-red-400 flex-1">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-xs text-red-400 underline hover:text-red-300"
          >
            Reintentar
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
      <div className="flex items-start gap-3">
        <span className="text-red-400 text-lg">✕</span>
        <div className="flex-1">
          <p className="text-sm text-red-400">{message}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 text-sm text-red-400 underline hover:text-red-300"
            >
              Reintentar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION STATUS BANNER
// ═══════════════════════════════════════════════════════════════

interface ConnectionBannerProps {
  isOnline: boolean;
  pendingChanges?: number;
}

export function ConnectionBanner({
  isOnline,
  pendingChanges = 0,
}: ConnectionBannerProps) {
  if (isOnline && pendingChanges === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-amber-950 px-4 py-2 text-center text-sm font-medium">
        <span className="mr-2">📡</span>
        Sin conexion - Los cambios se guardaran automaticamente
        {pendingChanges > 0 && (
          <span className="ml-2 bg-amber-600 text-white px-2 py-0.5 rounded-full text-xs">
            {pendingChanges} pendientes
          </span>
        )}
      </div>
    );
  }

  if (pendingChanges > 0) {
    return (
      <div className="fixed top-0 left-0 right-0 z-50 bg-cyan-500 text-white px-4 py-2 text-center text-sm font-medium">
        <span className="mr-2">🔄</span>
        Sincronizando {pendingChanges} cambios...
      </div>
    );
  }

  return null;
}
