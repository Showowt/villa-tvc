"use client";

import { useState, useRef } from "react";

export interface TaskItemData {
  id: string;
  task: string;
  task_es: string;
  photo_required: boolean;
  completed?: boolean;
  photo_url?: string;
  notes?: string;
  // For pool tasks with readings
  has_reading?: boolean;
  reading_type?: "chlorine" | "ph" | "temperature";
  reading_value?: number;
}

interface TaskItemProps {
  task: TaskItemData;
  index: number;
  onToggle: (taskId: string, completed: boolean) => void;
  onPhotoUpload: (taskId: string, photoUrl: string) => void;
  onPhotoRemove: (taskId: string) => void;
  onReadingChange?: (taskId: string, value: number) => void;
  onNotesChange?: (taskId: string, notes: string) => void;
  context?: string; // "housekeeping", "maintenance", "pool"
  disabled?: boolean;
  showEstimate?: boolean;
  estimatedMinutes?: number;
}

export function TaskItem({
  task,
  index,
  onToggle,
  onPhotoUpload,
  onPhotoRemove,
  onReadingChange,
  onNotesChange,
  context = "general",
  disabled = false,
  showEstimate = false,
  estimatedMinutes,
}: TaskItemProps) {
  const [uploading, setUploading] = useState(false);
  const [showNotes, setShowNotes] = useState(false);
  const [localNotes, setLocalNotes] = useState(task.notes || "");
  const [localReading, setLocalReading] = useState(
    task.reading_value?.toString() || "",
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("context", context);
      formData.append("taskId", task.id);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.success && data.url) {
        onPhotoUpload(task.id, data.url);
      } else {
        alert(data.error || "Error subiendo foto");
      }
    } catch (error) {
      console.error("[TaskItem] Upload error:", error);
      alert("Error subiendo foto");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleReadingBlur = () => {
    if (onReadingChange && localReading) {
      const value = parseFloat(localReading);
      if (!isNaN(value)) {
        onReadingChange(task.id, value);
      }
    }
  };

  const handleNotesBlur = () => {
    if (onNotesChange && localNotes !== task.notes) {
      onNotesChange(task.id, localNotes);
    }
  };

  const getReadingRange = () => {
    switch (task.reading_type) {
      case "chlorine":
        return { min: 1.0, max: 3.0, unit: "ppm", label: "Cloro" };
      case "ph":
        return { min: 7.2, max: 7.6, unit: "", label: "pH" };
      case "temperature":
        return { min: 25, max: 30, unit: "°C", label: "Temp" };
      default:
        return null;
    }
  };

  const isReadingInRange = () => {
    const range = getReadingRange();
    if (!range || !localReading) return true;
    const value = parseFloat(localReading);
    return value >= range.min && value <= range.max;
  };

  return (
    <div
      className={`flex items-start gap-3 py-2.5 px-3 rounded-lg transition-all ${
        task.completed
          ? "bg-emerald-50 border border-emerald-200"
          : "bg-white border border-slate-100 hover:border-slate-200"
      } ${disabled ? "opacity-60" : ""}`}
    >
      {/* Checkbox */}
      <button
        onClick={() => !disabled && onToggle(task.id, !task.completed)}
        disabled={disabled}
        className={`w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${
          task.completed
            ? "bg-emerald-500 text-white"
            : "bg-slate-100 border-2 border-slate-300 hover:border-emerald-400"
        } ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {task.completed && (
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={3}
              d="M5 13l4 4L19 7"
            />
          </svg>
        )}
      </button>

      {/* Task content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">{index + 1}.</span>
          <span
            className={`text-sm ${
              task.completed
                ? "text-emerald-700 line-through"
                : "text-slate-700"
            }`}
          >
            {task.task_es}
          </span>
        </div>

        {/* Reading input for pool tasks */}
        {task.has_reading && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-slate-500">
              {getReadingRange()?.label}:
            </span>
            <input
              type="number"
              step="0.1"
              value={localReading}
              onChange={(e) => setLocalReading(e.target.value)}
              onBlur={handleReadingBlur}
              disabled={disabled}
              placeholder={`${getReadingRange()?.min}-${getReadingRange()?.max}`}
              className={`w-20 px-2 py-1 text-sm border rounded-lg ${
                localReading && !isReadingInRange()
                  ? "border-rose-300 bg-rose-50 text-rose-700"
                  : "border-slate-200"
              } ${disabled ? "bg-slate-100" : ""}`}
            />
            <span className="text-xs text-slate-400">
              {getReadingRange()?.unit}
            </span>
            {localReading && !isReadingInRange() && (
              <span className="text-xs text-rose-500 font-medium">
                ⚠️ Fuera de rango
              </span>
            )}
          </div>
        )}

        {/* Photo preview */}
        {task.photo_url && (
          <div className="mt-2 relative inline-block">
            <img
              src={task.photo_url}
              alt="Task photo"
              className="w-16 h-16 object-cover rounded-lg border border-slate-200"
            />
            {!disabled && (
              <button
                onClick={() => onPhotoRemove(task.id)}
                className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white rounded-full text-xs flex items-center justify-center hover:bg-rose-600"
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Notes */}
        {showNotes && (
          <div className="mt-2">
            <textarea
              value={localNotes}
              onChange={(e) => setLocalNotes(e.target.value)}
              onBlur={handleNotesBlur}
              disabled={disabled}
              placeholder="Notas adicionales..."
              className="w-full px-2 py-1 text-sm border border-slate-200 rounded-lg resize-none"
              rows={2}
            />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 flex-shrink-0">
        {showEstimate && estimatedMinutes && (
          <span className="text-xs text-slate-400 px-1">
            {estimatedMinutes}m
          </span>
        )}

        {/* Notes toggle */}
        <button
          onClick={() => setShowNotes(!showNotes)}
          className={`p-1.5 rounded-lg transition-colors ${
            showNotes || localNotes
              ? "bg-blue-100 text-blue-600"
              : "text-slate-400 hover:bg-slate-100"
          }`}
          title="Notas"
        >
          📝
        </button>

        {/* Photo indicator/upload */}
        {task.photo_required && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileSelect}
              className="hidden"
            />
            <button
              onClick={() =>
                !disabled && !uploading && fileInputRef.current?.click()
              }
              disabled={disabled || uploading}
              className={`p-1.5 rounded-lg transition-colors ${
                task.photo_url
                  ? "bg-emerald-100 text-emerald-600"
                  : uploading
                    ? "bg-amber-100 text-amber-600 animate-pulse"
                    : "bg-amber-50 text-amber-500 hover:bg-amber-100"
              } ${disabled ? "cursor-not-allowed" : ""}`}
              title={
                task.photo_url
                  ? "Foto subida"
                  : "Foto requerida - clic para subir"
              }
            >
              {uploading ? "⏳" : task.photo_url ? "✅📷" : "📷"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Wrapper component for a list of tasks
interface TaskListProps {
  tasks: TaskItemData[];
  onTasksChange: (tasks: TaskItemData[]) => void;
  context?: string;
  title?: string;
  icon?: string;
  disabled?: boolean;
  showEstimates?: boolean;
}

export function TaskList({
  tasks,
  onTasksChange,
  context = "general",
  title,
  icon,
  disabled = false,
  showEstimates = false,
}: TaskListProps) {
  const handleToggle = (taskId: string, completed: boolean) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, completed } : t,
    );
    onTasksChange(updated);
  };

  const handlePhotoUpload = (taskId: string, photoUrl: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, photo_url: photoUrl } : t,
    );
    onTasksChange(updated);
  };

  const handlePhotoRemove = (taskId: string) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, photo_url: undefined } : t,
    );
    onTasksChange(updated);
  };

  const handleReadingChange = (taskId: string, value: number) => {
    const updated = tasks.map((t) =>
      t.id === taskId ? { ...t, reading_value: value } : t,
    );
    onTasksChange(updated);
  };

  const handleNotesChange = (taskId: string, notes: string) => {
    const updated = tasks.map((t) => (t.id === taskId ? { ...t, notes } : t));
    onTasksChange(updated);
  };

  const completedCount = tasks.filter((t) => t.completed).length;
  const totalCount = tasks.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Header */}
      {title && (
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {icon && <span className="text-xl">{icon}</span>}
            <span className="font-bold text-slate-900">{title}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium text-slate-600">
              {completedCount}/{totalCount}
            </span>
            <div className="w-20 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Tasks */}
      <div className="p-3 space-y-2 max-h-[500px] overflow-y-auto">
        {tasks.map((task, index) => (
          <TaskItem
            key={task.id}
            task={task}
            index={index}
            onToggle={handleToggle}
            onPhotoUpload={handlePhotoUpload}
            onPhotoRemove={handlePhotoRemove}
            onReadingChange={handleReadingChange}
            onNotesChange={handleNotesChange}
            context={context}
            disabled={disabled}
            showEstimate={showEstimates}
            estimatedMinutes={
              (task as TaskItemData & { estimated_minutes?: number })
                .estimated_minutes
            }
          />
        ))}
      </div>

      {/* Footer with progress */}
      {progressPct === 100 && (
        <div className="px-4 py-2 bg-emerald-50 border-t border-emerald-200 text-center">
          <span className="text-sm font-bold text-emerald-600">
            ✅ Todas las tareas completadas
          </span>
        </div>
      )}
    </div>
  );
}
