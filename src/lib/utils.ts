// ═══════════════════════════════════════════════════════════════
// TVC UTILS — Utility functions
// ═══════════════════════════════════════════════════════════════

// Type for class value (strings, arrays, objects)
type ClassValue =
  | string
  | number
  | boolean
  | undefined
  | null
  | ClassValue[]
  | { [key: string]: boolean | undefined | null };

// Simple clsx implementation (no external dependency)
function clsxInner(...args: ClassValue[]): string {
  let result = "";
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === "string" || typeof arg === "number") {
      result += (result ? " " : "") + arg;
    } else if (Array.isArray(arg)) {
      const inner = clsxInner(...arg);
      if (inner) {
        result += (result ? " " : "") + inner;
      }
    } else if (typeof arg === "object") {
      for (const key in arg) {
        if (Object.prototype.hasOwnProperty.call(arg, key) && arg[key]) {
          result += (result ? " " : "") + key;
        }
      }
    }
  }
  return result;
}

// cn utility for merging Tailwind classes
export function cn(...inputs: ClassValue[]): string {
  return clsxInner(inputs);
}

// Format date in Spanish
export function formatDateES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

// Format time
export function formatTimeES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Get relative time in Spanish
export function getRelativeTimeES(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "ahora";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24)
    return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  if (diffDays < 7) return `hace ${diffDays} dia${diffDays > 1 ? "s" : ""}`;
  return formatDateES(d);
}
