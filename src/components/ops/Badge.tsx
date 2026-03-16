"use client";

interface BadgeProps {
  children: React.ReactNode;
  color?: string;
}

export function Badge({ children, color = "#00B4FF" }: BadgeProps) {
  return (
    <span
      className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide inline-block"
      style={{
        backgroundColor: `${color}18`,
        color,
      }}
    >
      {children}
    </span>
  );
}
