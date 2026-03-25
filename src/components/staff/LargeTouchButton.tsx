"use client";

interface LargeTouchButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "success" | "danger" | "ghost";
  size?: "md" | "lg" | "xl";
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  className?: string;
  type?: "button" | "submit";
}

export default function LargeTouchButton({
  children,
  onClick,
  variant = "primary",
  size = "lg",
  disabled = false,
  loading = false,
  fullWidth = false,
  className = "",
  type = "button",
}: LargeTouchButtonProps) {
  const baseStyles =
    "font-medium rounded-xl transition-all active:scale-95 flex items-center justify-center gap-2 select-none";

  const variantStyles = {
    primary:
      "bg-cyan-500 text-white active:bg-cyan-600 disabled:bg-cyan-500/50",
    secondary:
      "bg-slate-700 text-white active:bg-slate-600 disabled:bg-slate-700/50",
    success:
      "bg-emerald-500 text-white active:bg-emerald-600 disabled:bg-emerald-500/50",
    danger: "bg-red-500 text-white active:bg-red-600 disabled:bg-red-500/50",
    ghost:
      "bg-transparent text-slate-400 active:bg-slate-800 disabled:text-slate-600",
  };

  const sizeStyles = {
    md: "min-h-[44px] px-4 py-2 text-sm",
    lg: "min-h-[56px] px-6 py-3 text-base",
    xl: "min-h-[64px] px-8 py-4 text-lg",
  };

  const widthStyles = fullWidth ? "w-full" : "";

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${widthStyles} ${className}`}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        children
      )}
    </button>
  );
}
