"use client";

import { useState, useEffect, useRef } from "react";

interface QuantityInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  label?: string;
  size?: "md" | "lg" | "xl";
}

export default function QuantityInput({
  value,
  onChange,
  min = 0,
  max = 9999,
  step = 1,
  unit,
  label,
  size = "lg",
}: QuantityInputProps) {
  const [inputValue, setInputValue] = useState(value.toString());
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(value.toString());
  }, [value]);

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);

    const numVal = parseFloat(val);
    if (!isNaN(numVal)) {
      const clampedVal = Math.max(min, Math.min(max, numVal));
      onChange(clampedVal);
    }
  };

  const handleInputBlur = () => {
    const numVal = parseFloat(inputValue);
    if (isNaN(numVal)) {
      setInputValue(value.toString());
    } else {
      const clampedVal = Math.max(min, Math.min(max, numVal));
      setInputValue(clampedVal.toString());
      onChange(clampedVal);
    }
  };

  const sizeStyles = {
    md: {
      button: "w-11 h-11 text-xl",
      input: "w-16 h-11 text-lg",
      container: "gap-2",
    },
    lg: {
      button: "w-14 h-14 text-2xl",
      input: "w-20 h-14 text-xl",
      container: "gap-3",
    },
    xl: {
      button: "w-16 h-16 text-3xl",
      input: "w-24 h-16 text-2xl",
      container: "gap-4",
    },
  };

  const styles = sizeStyles[size];

  return (
    <div className="flex flex-col items-center">
      {label && <label className="text-xs text-slate-400 mb-2">{label}</label>}
      <div className={`flex items-center ${styles.container}`}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className={`${styles.button} bg-slate-700 rounded-xl font-bold transition-all active:scale-95 active:bg-slate-600 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center`}
        >
          -
        </button>

        <div className="relative">
          <input
            ref={inputRef}
            type="number"
            inputMode="decimal"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            className={`${styles.input} bg-slate-700 border border-slate-600 rounded-xl text-center font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent`}
            min={min}
            max={max}
            step={step}
          />
          {unit && (
            <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-slate-400">
              {unit}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={handleIncrement}
          disabled={value >= max}
          className={`${styles.button} bg-cyan-500 rounded-xl font-bold transition-all active:scale-95 active:bg-cyan-600 disabled:opacity-50 disabled:active:scale-100 flex items-center justify-center`}
        >
          +
        </button>
      </div>
    </div>
  );
}
