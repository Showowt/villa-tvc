"use client";

// ═══════════════════════════════════════════════════════════════
// TVC LOADING SKELETON — COMPLETE SKELETON SYSTEM
// Issue #2 — NO LOADING STATES
// P0 Day 1 Fix: Staff sees proper loading indicators
// ═══════════════════════════════════════════════════════════════

import { cn } from "@/lib/utils";

interface SkeletonProps {
  className?: string;
  variant?: "default" | "shimmer";
}

// Base skeleton with shimmer animation
export function Skeleton({ className, variant = "shimmer" }: SkeletonProps) {
  return (
    <div
      className={cn(
        "rounded-lg bg-slate-700/50",
        variant === "shimmer" &&
          "animate-shimmer bg-gradient-shimmer bg-[length:200%_100%]",
        variant === "default" && "animate-pulse",
        className,
      )}
    />
  );
}

// ═══════════════════════════════════════════════════════════════
// SKELETON VARIANTS — Pre-built patterns for common layouts
// ═══════════════════════════════════════════════════════════════

export type SkeletonVariant =
  | "card"
  | "list"
  | "table"
  | "text"
  | "avatar"
  | "task"
  | "checklist"
  | "stats"
  | "inventory"
  | "chat"
  | "property-map";

interface LoadingSkeletonProps {
  variant: SkeletonVariant;
  count?: number;
  className?: string;
}

export function LoadingSkeleton({
  variant,
  count = 1,
  className,
}: LoadingSkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  switch (variant) {
    case "card":
      return (
        <div className={cn("space-y-3", className)}>
          {items.map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      );

    case "list":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <SkeletonListItem key={i} />
          ))}
        </div>
      );

    case "table":
      return (
        <div className={cn("space-y-1", className)}>
          <SkeletonTableHeader />
          {items.map((i) => (
            <SkeletonTableRow key={i} />
          ))}
        </div>
      );

    case "text":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <SkeletonText key={i} />
          ))}
        </div>
      );

    case "avatar":
      return (
        <div className={cn("flex gap-2", className)}>
          {items.map((i) => (
            <SkeletonAvatar key={i} />
          ))}
        </div>
      );

    case "task":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <SkeletonTaskItem key={i} />
          ))}
        </div>
      );

    case "checklist":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <SkeletonChecklistItem key={i} />
          ))}
        </div>
      );

    case "stats":
      return <SkeletonStats className={className} />;

    case "inventory":
      return (
        <div className={cn("space-y-2", className)}>
          {items.map((i) => (
            <SkeletonInventoryItem key={i} />
          ))}
        </div>
      );

    case "chat":
      return (
        <div className={cn("space-y-3", className)}>
          {items.map((i) => (
            <SkeletonChatMessage key={i} isUser={i % 2 === 0} />
          ))}
        </div>
      );

    case "property-map":
      return <SkeletonPropertyMap className={className} />;

    default:
      return <Skeleton className={className} />;
  }
}

// ═══════════════════════════════════════════════════════════════
// INDIVIDUAL SKELETON COMPONENTS
// ═══════════════════════════════════════════════════════════════

export function SkeletonCard() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 space-y-3">
      <Skeleton className="h-5 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-20" />
      </div>
    </div>
  );
}

export function SkeletonListItem() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
      <Skeleton className="w-10 h-10 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="w-6 h-6 rounded-full" />
    </div>
  );
}

export function SkeletonTableHeader() {
  return (
    <div className="bg-slate-700/50 rounded-t-lg p-3 flex gap-4">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
    </div>
  );
}

export function SkeletonTableRow() {
  return (
    <div className="bg-slate-800/50 border-b border-slate-700/30 p-3 flex gap-4 items-center">
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-4 w-1/4" />
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonText() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-4 w-4/6" />
    </div>
  );
}

export function SkeletonAvatar({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-14 h-14",
  };

  return <Skeleton className={cn("rounded-full", sizeClasses[size])} />;
}

export function SkeletonTaskItem() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-center gap-3">
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <Skeleton className="h-6 w-16 rounded-full" />
    </div>
  );
}

export function SkeletonChecklistItem() {
  return (
    <div className="bg-slate-800 rounded-xl p-4 flex items-start gap-3">
      <Skeleton className="w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-1/4" />
      </div>
    </div>
  );
}

export function SkeletonStats({ className }: { className?: string }) {
  return (
    <div className={cn("bg-slate-800 rounded-xl p-4", className)}>
      <div className="flex items-center justify-between mb-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-700/50 rounded-lg p-3 text-center">
            <Skeleton className="h-8 w-12 mx-auto mb-2" />
            <Skeleton className="h-3 w-16 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonInventoryItem() {
  return (
    <div className="bg-slate-800 rounded-xl p-3 flex items-center justify-between">
      <div className="flex-1 min-w-0 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/4" />
      </div>
      <div className="flex items-center gap-2 ml-3">
        <Skeleton className="w-8 h-8 rounded-lg" />
        <Skeleton className="w-16 h-8 rounded-lg" />
        <Skeleton className="w-8 h-8 rounded-lg" />
      </div>
    </div>
  );
}

export function SkeletonChatMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser ? "bg-cyan-500/20" : "bg-slate-800",
        )}
      >
        <Skeleton className="h-4 w-48 mb-1" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}

export function SkeletonPropertyMap({ className }: { className?: string }) {
  return (
    <div className={cn("h-full flex", className)}>
      {/* Map area */}
      <div className="flex-1 bg-slate-200 relative p-4">
        <Skeleton className="absolute top-4 left-4 w-9 h-9 rounded-full" />
        {/* Villa placeholders */}
        {[
          { x: 26, y: 22 },
          { x: 40, y: 18 },
          { x: 54, y: 15 },
          { x: 68, y: 24 },
          { x: 78, y: 32 },
          { x: 82, y: 45 },
          { x: 22, y: 40 },
          { x: 30, y: 55 },
        ].map((pos, i) => (
          <div
            key={i}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: "translate(-50%, -50%)",
            }}
          >
            <Skeleton className="w-14 h-11 rounded-lg" />
            <Skeleton className="w-16 h-5 mt-1 mx-auto rounded" />
          </div>
        ))}
      </div>
      {/* Sidebar */}
      <div className="w-80 bg-white p-4 space-y-4 border-l border-slate-200">
        <Skeleton className="h-8 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FULL PAGE SKELETONS
// ═══════════════════════════════════════════════════════════════

export function SkeletonStaffPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonStats />
      <div>
        <Skeleton className="h-4 w-32 mb-3" />
        <div className="space-y-2">
          <SkeletonTaskItem />
          <SkeletonTaskItem />
          <SkeletonTaskItem />
        </div>
      </div>
      <div>
        <Skeleton className="h-4 w-28 mb-3" />
        <div className="grid grid-cols-2 gap-2">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}

export function SkeletonDashboardPage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-slate-800 rounded-xl p-4">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <LoadingSkeleton variant="table" count={5} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// INLINE LOADING INDICATOR
// ═══════════════════════════════════════════════════════════════

interface InlineLoaderProps {
  message?: string;
  size?: "sm" | "md" | "lg";
}

export function InlineLoader({
  message = "Cargando...",
  size = "md",
}: InlineLoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border",
    md: "w-6 h-6 border-2",
    lg: "w-8 h-8 border-2",
  };

  const textClasses = {
    sm: "text-xs",
    md: "text-sm",
    lg: "text-base",
  };

  return (
    <div className="flex items-center justify-center gap-2 py-4">
      <div
        className={cn(
          "animate-spin rounded-full border-cyan-500 border-t-transparent",
          sizeClasses[size],
        )}
      />
      <span className={cn("text-slate-400", textClasses[size])}>{message}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FULL PAGE LOADING
// ═══════════════════════════════════════════════════════════════

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({
  message = "Cargando datos...",
}: FullPageLoaderProps) {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4">
      <div className="relative">
        <div className="w-12 h-12 rounded-full border-4 border-slate-700" />
        <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" />
      </div>
      <p className="text-slate-400 text-sm">{message}</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BUTTON LOADING STATE
// ═══════════════════════════════════════════════════════════════

interface ButtonLoaderProps {
  loading: boolean;
  children: React.ReactNode;
  loadingText?: string;
}

export function ButtonLoader({
  loading,
  children,
  loadingText = "Cargando...",
}: ButtonLoaderProps) {
  if (!loading) return <>{children}</>;

  return (
    <span className="flex items-center gap-2">
      <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      <span>{loadingText}</span>
    </span>
  );
}
