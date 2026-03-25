"use client";

import { useState, useRef, useCallback } from "react";

interface PullToRefreshProps {
  children: React.ReactNode;
  onRefresh: () => Promise<void>;
  disabled?: boolean;
}

export default function PullToRefresh({
  children,
  onRefresh,
  disabled = false,
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const PULL_THRESHOLD = 80;
  const MAX_PULL = 120;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing) return;
      // Only activate if scrolled to top
      if (containerRef.current && containerRef.current.scrollTop === 0) {
        startY.current = e.touches[0].clientY;
      }
    },
    [disabled, isRefreshing],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || isRefreshing || startY.current === 0) return;

      const currentY = e.touches[0].clientY;
      const diff = currentY - startY.current;

      if (diff > 0) {
        // Apply resistance to make it feel more natural
        const resistance = 0.5;
        const distance = Math.min(diff * resistance, MAX_PULL);
        setPullDistance(distance);
      }
    },
    [disabled, isRefreshing],
  );

  const handleTouchEnd = useCallback(async () => {
    if (disabled || isRefreshing) return;

    if (pullDistance > PULL_THRESHOLD) {
      setIsRefreshing(true);
      setPullDistance(PULL_THRESHOLD / 2);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }

    startY.current = 0;
  }, [disabled, isRefreshing, pullDistance, onRefresh]);

  const indicatorOpacity = Math.min(pullDistance / PULL_THRESHOLD, 1);
  const indicatorScale = 0.5 + indicatorOpacity * 0.5;
  const rotation = isRefreshing ? 360 : (pullDistance / PULL_THRESHOLD) * 180;

  return (
    <div
      ref={containerRef}
      className="relative overflow-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull indicator */}
      <div
        className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center transition-all duration-200 z-10"
        style={{
          top: pullDistance - 40,
          opacity: indicatorOpacity,
          transform: `translateX(-50%) scale(${indicatorScale})`,
        }}
      >
        <div
          className={`w-10 h-10 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center ${
            isRefreshing ? "animate-spin" : ""
          }`}
          style={{
            transform: `rotate(${rotation}deg)`,
          }}
        >
          <svg
            className="w-5 h-5 text-cyan-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
      </div>

      {/* Content */}
      <div
        className="transition-transform duration-200"
        style={{ transform: `translateY(${pullDistance}px)` }}
      >
        {children}
      </div>
    </div>
  );
}
