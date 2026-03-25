"use client";

import { useState, useEffect, useCallback } from "react";
import {
  initOfflineSupport,
  getOfflineStatus,
  syncOfflineQueue,
  type SyncResult,
  type OfflineStatus,
} from "@/lib/offline";

interface OfflineIndicatorProps {
  position?: "top" | "bottom";
  showPendingCount?: boolean;
  autoHideDelay?: number;
}

type IndicatorState =
  | "online"
  | "offline"
  | "syncing"
  | "synced"
  | "pending"
  | "error";

export function OfflineIndicator({
  position = "top",
  showPendingCount = true,
  autoHideDelay = 3000,
}: OfflineIndicatorProps) {
  const [state, setState] = useState<IndicatorState>("online");
  const [pendingCount, setPendingCount] = useState(0);
  const [syncedCount, setSyncedCount] = useState(0);
  const [visible, setVisible] = useState(false);
  const [lastSyncResult, setLastSyncResult] = useState<SyncResult | null>(null);

  // Handle sync completion
  const handleSync = useCallback(
    (result: SyncResult) => {
      setLastSyncResult(result);
      setSyncedCount(result.synced);
      setPendingCount(result.remaining);

      if (result.synced > 0 && result.remaining === 0) {
        setState("synced");
        setVisible(true);

        // Auto-hide after delay
        setTimeout(() => {
          setVisible(false);
          setState("online");
        }, autoHideDelay);
      } else if (result.remaining > 0) {
        setState("pending");
        setVisible(true);
      } else if (result.failed > 0 && result.synced === 0) {
        setState("error");
        setVisible(true);
      }
    },
    [autoHideDelay]
  );

  // Handle status change
  const handleStatusChange = useCallback((isOnline: boolean) => {
    if (isOnline) {
      setState("syncing");
      setVisible(true);
    } else {
      setState("offline");
      setVisible(true);
    }
  }, []);

  // Handle queue change
  const handleQueueChange = useCallback((queueLength: number) => {
    setPendingCount(queueLength);
    if (queueLength > 0) {
      setState("pending");
      setVisible(true);
    }
  }, []);

  // Initialize offline support
  useEffect(() => {
    const cleanup = initOfflineSupport({
      onSync: handleSync,
      onStatusChange: handleStatusChange,
      onQueueChange: handleQueueChange,
    });

    // Check initial status
    getOfflineStatus().then((status: OfflineStatus) => {
      if (!status.isOnline) {
        setState("offline");
        setVisible(true);
      } else if (status.queueLength > 0) {
        setState("pending");
        setPendingCount(status.queueLength);
        setVisible(true);
      }
    });

    return cleanup;
  }, [handleSync, handleStatusChange, handleQueueChange]);

  // Manual sync trigger
  const triggerSync = async () => {
    if (state === "syncing") return;
    setState("syncing");
    const result = await syncOfflineQueue();
    handleSync(result);
  };

  // Don't render if not visible
  if (!visible) return null;

  const positionClasses =
    position === "top"
      ? "top-0 left-0 right-0"
      : "bottom-0 left-0 right-0";

  const stateConfig = {
    online: {
      bg: "bg-emerald-500",
      icon: CheckIcon,
      text: "Conectado",
      textEn: "Connected",
    },
    offline: {
      bg: "bg-amber-500",
      icon: WifiOffIcon,
      text: "Sin conexion - Modo offline",
      textEn: "Offline - Working locally",
    },
    syncing: {
      bg: "bg-blue-500",
      icon: SyncIcon,
      text: "Sincronizando...",
      textEn: "Syncing...",
    },
    synced: {
      bg: "bg-emerald-500",
      icon: CheckIcon,
      text: `Sincronizado (${syncedCount} ${syncedCount === 1 ? "cambio" : "cambios"})`,
      textEn: `Synced (${syncedCount} ${syncedCount === 1 ? "change" : "changes"})`,
    },
    pending: {
      bg: "bg-amber-500",
      icon: CloudQueueIcon,
      text: `${pendingCount} ${pendingCount === 1 ? "cambio pendiente" : "cambios pendientes"}`,
      textEn: `${pendingCount} pending ${pendingCount === 1 ? "change" : "changes"}`,
    },
    error: {
      bg: "bg-red-500",
      icon: ErrorIcon,
      text: "Error de sincronizacion",
      textEn: "Sync error",
    },
  };

  const config = stateConfig[state];
  const Icon = config.icon;

  return (
    <div
      className={`fixed ${positionClasses} z-[9999] animate-slideIn`}
      role="status"
      aria-live="polite"
    >
      <div
        className={`${config.bg} px-4 py-2 flex items-center justify-center gap-3 text-white text-sm font-medium shadow-lg`}
      >
        <Icon
          className={`w-5 h-5 flex-shrink-0 ${state === "syncing" ? "animate-spin" : ""}`}
        />

        <span className="truncate">{config.text}</span>

        {showPendingCount && state === "pending" && pendingCount > 0 && (
          <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
            {pendingCount}
          </span>
        )}

        {(state === "pending" || state === "error") && navigator.onLine && (
          <button
            onClick={triggerSync}
            className="ml-2 bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-xs font-semibold transition-colors"
          >
            Reintentar
          </button>
        )}

        {state === "offline" && (
          <button
            onClick={() => setVisible(false)}
            className="ml-auto p-1 hover:bg-white/20 rounded transition-colors"
            aria-label="Cerrar"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Debug info in development */}
      {process.env.NODE_ENV === "development" && lastSyncResult && (
        <div className="bg-gray-800 text-gray-300 text-xs px-4 py-1">
          Ultimo sync: {lastSyncResult.synced} ok, {lastSyncResult.failed}{" "}
          fallidos, {lastSyncResult.remaining} pendientes
        </div>
      )}

      <style jsx>{`
        @keyframes slideIn {
          from {
            transform: translateY(${position === "top" ? "-100%" : "100%"});
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}

// Icon Components
function WifiOffIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a3 3 0 004.243 0m-4.243 0L6 18m0 0l-2.828-2.828m0 0a5 5 0 017.07-7.071M3 3l18 18"
      />
    </svg>
  );
}

function SyncIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}

function CloudQueueIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
      />
    </svg>
  );
}

function ErrorIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  );
}

export default OfflineIndicator;
