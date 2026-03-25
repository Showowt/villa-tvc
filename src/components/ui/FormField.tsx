"use client";

// ═══════════════════════════════════════════════════════════════
// FORMFIELD COMPONENT — Issue #61
// Input wrapper with validation, error display, and required indicator
// ═══════════════════════════════════════════════════════════════

import {
  forwardRef,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
  SelectHTMLAttributes,
  ReactNode,
} from "react";

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

interface BaseFieldProps {
  label: string;
  error?: string | null;
  required?: boolean;
  hint?: string;
  containerClassName?: string;
}

interface InputFieldProps
  extends
    BaseFieldProps,
    Omit<InputHTMLAttributes<HTMLInputElement>, "className"> {
  inputClassName?: string;
}

interface TextareaFieldProps
  extends
    BaseFieldProps,
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "className"> {
  inputClassName?: string;
}

interface SelectFieldProps
  extends
    BaseFieldProps,
    Omit<SelectHTMLAttributes<HTMLSelectElement>, "className"> {
  inputClassName?: string;
  children: ReactNode;
}

// ═══════════════════════════════════════════════════════════════
// BASE STYLES
// ═══════════════════════════════════════════════════════════════

const baseInputStyles = `
  w-full px-3 py-2
  bg-slate-800 border rounded-lg
  text-white placeholder:text-slate-500
  focus:outline-none focus:ring-2 focus:ring-cyan-500
  transition-colors
`;

const errorInputStyles = `
  border-red-500 focus:ring-red-500
`;

const normalInputStyles = `
  border-slate-600 hover:border-slate-500
`;

// ═══════════════════════════════════════════════════════════════
// LABEL COMPONENT
// ═══════════════════════════════════════════════════════════════

function FieldLabel({
  label,
  required,
  htmlFor,
}: {
  label: string;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="block text-sm font-medium text-slate-300 mb-1"
    >
      {label}
      {required && (
        <span className="text-red-400 ml-1" aria-label="Campo requerido">
          *
        </span>
      )}
    </label>
  );
}

// ═══════════════════════════════════════════════════════════════
// ERROR MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function FieldError({ error }: { error: string }) {
  return (
    <p
      className="mt-1 text-xs text-red-400 flex items-center gap-1"
      role="alert"
    >
      <svg
        className="w-3 h-3 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      {error}
    </p>
  );
}

// ═══════════════════════════════════════════════════════════════
// HINT MESSAGE COMPONENT
// ═══════════════════════════════════════════════════════════════

function FieldHint({ hint }: { hint: string }) {
  return <p className="mt-1 text-xs text-slate-500">{hint}</p>;
}

// ═══════════════════════════════════════════════════════════════
// INPUT FIELD
// ═══════════════════════════════════════════════════════════════

export const FormField = forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label,
      error,
      required,
      hint,
      containerClassName,
      inputClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasError = Boolean(error);

    return (
      <div className={containerClassName}>
        <FieldLabel label={label} required={required} htmlFor={inputId} />
        <input
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={`
            ${baseInputStyles}
            ${hasError ? errorInputStyles : normalInputStyles}
            ${inputClassName || ""}
          `}
          {...props}
        />
        {error && <FieldError error={error} />}
        {hint && !error && <FieldHint hint={hint} />}
      </div>
    );
  },
);

FormField.displayName = "FormField";

// ═══════════════════════════════════════════════════════════════
// TEXTAREA FIELD
// ═══════════════════════════════════════════════════════════════

export const TextareaField = forwardRef<
  HTMLTextAreaElement,
  TextareaFieldProps
>(
  (
    {
      label,
      error,
      required,
      hint,
      containerClassName,
      inputClassName,
      id,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasError = Boolean(error);

    return (
      <div className={containerClassName}>
        <FieldLabel label={label} required={required} htmlFor={inputId} />
        <textarea
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={`
            ${baseInputStyles}
            ${hasError ? errorInputStyles : normalInputStyles}
            ${inputClassName || ""}
            min-h-[80px] resize-y
          `}
          {...props}
        />
        {error && <FieldError error={error} />}
        {hint && !error && <FieldHint hint={hint} />}
      </div>
    );
  },
);

TextareaField.displayName = "TextareaField";

// ═══════════════════════════════════════════════════════════════
// SELECT FIELD
// ═══════════════════════════════════════════════════════════════

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  (
    {
      label,
      error,
      required,
      hint,
      containerClassName,
      inputClassName,
      id,
      children,
      ...props
    },
    ref,
  ) => {
    const inputId = id || `field-${label.toLowerCase().replace(/\s+/g, "-")}`;
    const hasError = Boolean(error);

    return (
      <div className={containerClassName}>
        <FieldLabel label={label} required={required} htmlFor={inputId} />
        <select
          ref={ref}
          id={inputId}
          aria-invalid={hasError}
          aria-describedby={hasError ? `${inputId}-error` : undefined}
          className={`
            ${baseInputStyles}
            ${hasError ? errorInputStyles : normalInputStyles}
            ${inputClassName || ""}
          `}
          {...props}
        >
          {children}
        </select>
        {error && <FieldError error={error} />}
        {hint && !error && <FieldHint hint={hint} />}
      </div>
    );
  },
);

SelectField.displayName = "SelectField";

// ═══════════════════════════════════════════════════════════════
// QUANTITY INPUT — Numeric only with +/- buttons
// ═══════════════════════════════════════════════════════════════

interface QuantityInputProps extends BaseFieldProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}

export function QuantityInput({
  label,
  error,
  required,
  hint,
  containerClassName,
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  disabled,
}: QuantityInputProps) {
  const hasError = Boolean(error);

  const handleDecrement = () => {
    const newValue = value - step;
    if (newValue >= min) {
      onChange(newValue);
    }
  };

  const handleIncrement = () => {
    const newValue = value + step;
    if (max === undefined || newValue <= max) {
      onChange(newValue);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;

    // Allow empty input temporarily
    if (inputValue === "") {
      onChange(min);
      return;
    }

    const parsed = parseFloat(inputValue);
    if (isNaN(parsed)) return;

    // Clamp to min/max
    let newValue = parsed;
    if (newValue < min) newValue = min;
    if (max !== undefined && newValue > max) newValue = max;

    onChange(newValue);
  };

  return (
    <div className={containerClassName}>
      <FieldLabel label={label} required={required} />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || value <= min}
          className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-lg text-lg font-bold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Decrementar"
        >
          -
        </button>
        <input
          type="number"
          value={value}
          onChange={handleInputChange}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className={`
            w-20 h-10 text-center font-medium
            ${baseInputStyles}
            ${hasError ? errorInputStyles : normalInputStyles}
            [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
          `}
          aria-invalid={hasError}
        />
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || (max !== undefined && value >= max)}
          className="w-10 h-10 flex items-center justify-center bg-slate-700 rounded-lg text-lg font-bold hover:bg-slate-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Incrementar"
        >
          +
        </button>
      </div>
      {error && <FieldError error={error} />}
      {hint && !error && <FieldHint hint={hint} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// DATE PICKER — No manual entry
// ═══════════════════════════════════════════════════════════════

interface DatePickerProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  minDate?: string;
  maxDate?: string;
  disabled?: boolean;
}

export function DatePicker({
  label,
  error,
  required,
  hint,
  containerClassName,
  value,
  onChange,
  minDate,
  maxDate,
  disabled,
}: DatePickerProps) {
  const hasError = Boolean(error);

  return (
    <div className={containerClassName}>
      <FieldLabel label={label} required={required} />
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min={minDate}
        max={maxDate}
        disabled={disabled}
        className={`
          ${baseInputStyles}
          ${hasError ? errorInputStyles : normalInputStyles}
          [color-scheme:dark]
        `}
        aria-invalid={hasError}
      />
      {error && <FieldError error={error} />}
      {hint && !error && <FieldHint hint={hint} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PHONE INPUT — Format validation
// ═══════════════════════════════════════════════════════════════

interface PhoneInputProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function PhoneInput({
  label,
  error,
  required,
  hint,
  containerClassName,
  value,
  onChange,
  disabled,
}: PhoneInputProps) {
  const hasError = Boolean(error);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits, + and spaces
    const cleaned = e.target.value.replace(/[^\d+\s]/g, "");
    onChange(cleaned);
  };

  return (
    <div className={containerClassName}>
      <FieldLabel label={label} required={required} />
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
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
              d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
            />
          </svg>
        </span>
        <input
          type="tel"
          value={value}
          onChange={handleChange}
          disabled={disabled}
          placeholder="+57 300 123 4567"
          className={`
            ${baseInputStyles}
            ${hasError ? errorInputStyles : normalInputStyles}
            pl-10
          `}
          aria-invalid={hasError}
        />
      </div>
      {error && <FieldError error={error} />}
      {hint && !error && <FieldHint hint={hint} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TIME INPUT
// ═══════════════════════════════════════════════════════════════

interface TimeInputProps extends BaseFieldProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export function TimeInput({
  label,
  error,
  required,
  hint,
  containerClassName,
  value,
  onChange,
  disabled,
}: TimeInputProps) {
  const hasError = Boolean(error);

  return (
    <div className={containerClassName}>
      <FieldLabel label={label} required={required} />
      <input
        type="time"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`
          ${baseInputStyles}
          ${hasError ? errorInputStyles : normalInputStyles}
          [color-scheme:dark]
        `}
        aria-invalid={hasError}
      />
      {error && <FieldError error={error} />}
      {hint && !error && <FieldHint hint={hint} />}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// REQUIRED INPUT — Shows required indicator and validation
// ═══════════════════════════════════════════════════════════════

interface RequiredInputProps extends Omit<InputFieldProps, "required"> {
  validate?: (value: string) => string | null;
}

export function RequiredInput({
  validate,
  onChange,
  ...props
}: RequiredInputProps) {
  return <FormField required onChange={onChange} {...props} />;
}

export default FormField;
