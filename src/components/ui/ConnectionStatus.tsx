// ═══════════════════════════════════════════════════════════════
// CONNECTION STATUS INDICATOR
// Shows realtime connection state with visual feedback
// Issue #81 — SUPABASE REALTIME NOT CONFIGURED
// ═══════════════════════════════════════════════════════════════

"use client";

import { useEffect, useState } from "react";
import {
  onRealtimeStatusChange,
  type ConnectionStatus,
} from "@/lib/supabase-realtime";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface ConnectionStatusIndicatorProps {
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════
// STATUS CONFIG
// ═══════════════════════════════════════════════════════════════

const STATUS_CONFIG: Record<
  ConnectionStatus,
  {
    color: string;
    bgColor: string;
    borderColor: string;
    label: string;
    labelEs: string;
    icon: string;
    pulse: boolean;
  }
> = {
  connected: {
    color: "#10B981",
    bgColor: "#10B98120",
    borderColor: "#10B98150",
    label: "Connected",
    labelEs: "Conectado",
    icon: "●",
    pulse: false,
  },
  connecting: {
    color: "#F59E0B",
    bgColor: "#F59E0B20",
    borderColor: "#F59E0B50",
    label: "Connecting...",
    labelEs: "Conectando...",
    icon: "◐",
    pulse: true,
  },
  disconnected: {
    color: "#EF4444",
    bgColor: "#EF444420",
    borderColor: "#EF444450",
    label: "Disconnected",
    labelEs: "Desconectado",
    icon: "○",
    pulse: false,
  },
  error: {
    color: "#EF4444",
    bgColor: "#EF444420",
    borderColor: "#EF444450",
    label: "Connection Error",
    labelEs: "Error de Conexión",
    icon: "✕",
    pulse: true,
  },
};

const SIZE_CONFIG = {
  sm: { dot: 6, text: 9, padding: "2px 6px" },
  md: { dot: 8, text: 10, padding: "4px 10px" },
  lg: { dot: 10, text: 12, padding: "6px 12px" },
};

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export function ConnectionStatusIndicator({
  size = "sm",
  showLabel = false,
  className = "",
}: ConnectionStatusIndicatorProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const unsubscribe = onRealtimeStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const config = STATUS_CONFIG[status];
  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: showLabel ? sizeConfig.padding : undefined,
        background: showLabel ? config.bgColor : undefined,
        border: showLabel ? `1px solid ${config.borderColor}` : undefined,
        borderRadius: showLabel ? 12 : undefined,
      }}
      title={`${config.label} / ${config.labelEs}`}
    >
      <span
        style={{
          display: "inline-block",
          width: sizeConfig.dot,
          height: sizeConfig.dot,
          borderRadius: "50%",
          background: config.color,
          boxShadow: `0 0 ${sizeConfig.dot}px ${config.color}40`,
          animation: config.pulse ? "pulse 1.5s infinite" : undefined,
        }}
      />
      {showLabel && (
        <span
          style={{
            fontSize: sizeConfig.text,
            fontWeight: 600,
            color: config.color,
            whiteSpace: "nowrap",
          }}
        >
          {config.labelEs}
        </span>
      )}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FLOATING STATUS INDICATOR (for pages)
// ═══════════════════════════════════════════════════════════════

interface FloatingConnectionStatusProps {
  position?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
  autoHideWhenConnected?: boolean;
  autoHideDelay?: number;
}

export function FloatingConnectionStatus({
  position = "bottom-right",
  autoHideWhenConnected = true,
  autoHideDelay = 3000,
}: FloatingConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");
  const [visible, setVisible] = useState(true);
  const [wasDisconnected, setWasDisconnected] = useState(false);

  useEffect(() => {
    const unsubscribe = onRealtimeStatusChange((newStatus) => {
      setStatus(newStatus);

      // Track if we were ever disconnected (to show reconnection feedback)
      if (newStatus === "disconnected" || newStatus === "error") {
        setWasDisconnected(true);
        setVisible(true);
      }

      // Auto-hide when connected (after showing briefly)
      if (newStatus === "connected" && autoHideWhenConnected) {
        if (wasDisconnected) {
          // Show "connected" briefly after reconnection
          setVisible(true);
          setTimeout(() => {
            setVisible(false);
          }, autoHideDelay);
        } else {
          // First connection, hide immediately
          setTimeout(() => {
            setVisible(false);
          }, 1000);
        }
      }
    });
    return unsubscribe;
  }, [autoHideWhenConnected, autoHideDelay, wasDisconnected]);

  if (!visible && status === "connected") {
    return null;
  }

  const positionStyles: Record<string, React.CSSProperties> = {
    "top-left": { top: 12, left: 12 },
    "top-right": { top: 12, right: 12 },
    "bottom-left": { bottom: 12, left: 12 },
    "bottom-right": { bottom: 12, right: 12 },
  };

  const config = STATUS_CONFIG[status];

  return (
    <div
      style={{
        position: "fixed",
        ...positionStyles[position],
        zIndex: 1000,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 12px",
        background: "white",
        border: `1px solid ${config.borderColor}`,
        borderRadius: 8,
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
        animation: "slideIn 0.3s ease",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: config.color,
          animation: config.pulse ? "pulse 1.5s infinite" : undefined,
        }}
      />
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          color: config.color,
        }}
      >
        {status === "connected"
          ? "✓ En Línea"
          : status === "connecting"
            ? "Reconectando..."
            : status === "error"
              ? "Error de conexión"
              : "Sin conexión"}
      </span>
      <style>{`
        @keyframes slideIn {
          from { transform: translateY(10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.9); }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INLINE STATUS (for headers/navs)
// ═══════════════════════════════════════════════════════════════

export function InlineConnectionStatus() {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected");

  useEffect(() => {
    const unsubscribe = onRealtimeStatusChange(setStatus);
    return unsubscribe;
  }, []);

  const config = STATUS_CONFIG[status];

  // Only show when not connected
  if (status === "connected") {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          padding: "2px 6px",
          background: config.bgColor,
          borderRadius: 6,
          fontSize: 9,
          fontWeight: 600,
          color: config.color,
        }}
      >
        <span
          style={{
            width: 5,
            height: 5,
            borderRadius: "50%",
            background: config.color,
          }}
        />
        LIVE
      </span>
    );
  }

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "2px 8px",
        background: config.bgColor,
        borderRadius: 6,
        fontSize: 9,
        fontWeight: 600,
        color: config.color,
        animation: config.pulse ? "statusPulse 1.5s infinite" : undefined,
      }}
    >
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: "50%",
          background: config.color,
        }}
      />
      {status === "connecting" ? "..." : status === "error" ? "!" : "○"}
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT EXPORT
// ═══════════════════════════════════════════════════════════════

export default ConnectionStatusIndicator;
