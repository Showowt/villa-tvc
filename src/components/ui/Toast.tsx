"use client";

import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
  ReactNode,
} from "react";

// Toast types
type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: Toast[];
  addToast: (type: ToastType, message: string, duration?: number) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Toast Provider Component
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback(
    (type: ToastType, message: string, duration = 4000) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      setToasts((prev) => [...prev, { id, type, message, duration }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

// Hook to use toast
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast debe usarse dentro de ToastProvider");
  }
  return context;
}

// Toast Container
function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

// Individual Toast Item
function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(toast.id), 300);
    }, toast.duration || 4000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onRemove]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const config = {
    success: {
      bg: "bg-emerald-500/20",
      border: "border-emerald-500/30",
      text: "text-emerald-400",
      icon: "✓",
    },
    error: {
      bg: "bg-red-500/20",
      border: "border-red-500/30",
      text: "text-red-400",
      icon: "✕",
    },
    warning: {
      bg: "bg-amber-500/20",
      border: "border-amber-500/30",
      text: "text-amber-400",
      icon: "⚠",
    },
    info: {
      bg: "bg-cyan-500/20",
      border: "border-cyan-500/30",
      text: "text-cyan-400",
      icon: "ℹ",
    },
  };

  const { bg, border, text, icon } = config[toast.type];

  return (
    <div
      onClick={handleDismiss}
      className={`
        pointer-events-auto cursor-pointer
        ${bg} ${border} ${text}
        border rounded-xl px-4 py-3
        flex items-center gap-3
        transition-all duration-300
        ${isExiting ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"}
        animate-slide-up
      `}
    >
      <span className="text-lg flex-shrink-0">{icon}</span>
      <span className="text-sm font-medium flex-1">{toast.message}</span>
      <button
        onClick={handleDismiss}
        className="text-slate-400 hover:text-white transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </div>
  );
}

// Convenience functions for common toast messages
export const toastMessages = {
  // Success messages
  saved: "Guardado exitosamente",
  submitted: "Enviado correctamente",
  completed: "Completado",
  synced: "Sincronizado con el servidor",

  // Error messages
  networkError: "Error de conexion. Intenta de nuevo.",
  saveError: "Error al guardar. Intenta de nuevo.",
  loadError: "Error al cargar datos",
  authError: "Sesion expirada. Por favor inicia sesion.",

  // Validation error messages (Issue #61)
  validationError: "Por favor corrige los errores del formulario",
  requiredFields: "Todos los campos requeridos deben completarse",
  invalidQuantity: "Cantidad debe ser un numero positivo",
  invalidDate: "Formato de fecha invalido",
  invalidPhone: "Numero de telefono invalido",
  invalidEmail: "Correo electronico invalido",
  guestCountExceeded: "Numero de huespedes excede la capacidad",
  missingPhotos: "Faltan fotos requeridas",

  // Warning messages
  offline:
    "Sin conexion. Los cambios se guardaran cuando vuelvas a estar en linea.",
  unsavedChanges: "Tienes cambios sin guardar",
  lowStock: "Alerta: Producto bajo minimo",

  // Info messages
  loading: "Cargando...",
  processing: "Procesando...",
  queued: "Guardado en cola. Se enviara automaticamente.",
};
