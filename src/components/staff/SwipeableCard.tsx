"use client";

import { useState, useRef, useCallback } from "react";

interface SwipeableCardProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  leftAction?: {
    label: string;
    color: string;
    icon?: React.ReactNode;
  };
  rightAction?: {
    label: string;
    color: string;
    icon?: React.ReactNode;
  };
  disabled?: boolean;
}

export default function SwipeableCard({
  children,
  onSwipeLeft,
  onSwipeRight,
  leftAction,
  rightAction,
  disabled = false,
}: SwipeableCardProps) {
  const [translateX, setTranslateX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const currentX = useRef(0);
  const cardRef = useRef<HTMLDivElement>(null);

  const SWIPE_THRESHOLD = 80;
  const MAX_SWIPE = 100;

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled) return;
      startX.current = e.touches[0].clientX;
      currentX.current = e.touches[0].clientX;
      setIsDragging(true);
    },
    [disabled],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!isDragging || disabled) return;
      currentX.current = e.touches[0].clientX;
      let diff = currentX.current - startX.current;

      // Only allow swiping in directions that have actions
      if (diff > 0 && !rightAction) diff = 0;
      if (diff < 0 && !leftAction) diff = 0;

      // Limit the swipe distance
      diff = Math.max(-MAX_SWIPE, Math.min(MAX_SWIPE, diff));

      setTranslateX(diff);
    },
    [isDragging, disabled, leftAction, rightAction],
  );

  const handleTouchEnd = useCallback(() => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    if (translateX > SWIPE_THRESHOLD && onSwipeRight) {
      // Swipe right action
      setTranslateX(MAX_SWIPE);
      setTimeout(() => {
        onSwipeRight();
        setTranslateX(0);
      }, 200);
    } else if (translateX < -SWIPE_THRESHOLD && onSwipeLeft) {
      // Swipe left action
      setTranslateX(-MAX_SWIPE);
      setTimeout(() => {
        onSwipeLeft();
        setTranslateX(0);
      }, 200);
    } else {
      // Reset position
      setTranslateX(0);
    }
  }, [isDragging, disabled, translateX, onSwipeLeft, onSwipeRight]);

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Left action (revealed when swiping right) */}
      {rightAction && (
        <div
          className={`absolute inset-y-0 left-0 flex items-center justify-start pl-4 ${rightAction.color}`}
          style={{ width: MAX_SWIPE }}
        >
          <div className="flex flex-col items-center gap-1">
            {rightAction.icon}
            <span className="text-xs font-medium">{rightAction.label}</span>
          </div>
        </div>
      )}

      {/* Right action (revealed when swiping left) */}
      {leftAction && (
        <div
          className={`absolute inset-y-0 right-0 flex items-center justify-end pr-4 ${leftAction.color}`}
          style={{ width: MAX_SWIPE }}
        >
          <div className="flex flex-col items-center gap-1">
            {leftAction.icon}
            <span className="text-xs font-medium">{leftAction.label}</span>
          </div>
        </div>
      )}

      {/* Main card content */}
      <div
        ref={cardRef}
        className={`relative bg-slate-800 rounded-xl transition-transform ${
          isDragging ? "" : "duration-200"
        }`}
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
