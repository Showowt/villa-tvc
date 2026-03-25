"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  compressImage,
  blobToBase64,
  uploadPhoto,
  addPendingPhoto,
  initPhotoSync,
  type CompressionResult,
} from "@/lib/image-compression";

// ─── TYPES ───

interface PhotoUploadProps {
  onUploadComplete: (url: string, path: string) => void;
  onUploadError?: (error: string) => void;
  context?: string;
  taskId?: string;
  checklistId?: string;
  itemIndex?: number;
  disabled?: boolean;
  className?: string;
}

type UploadStatus =
  | "idle"
  | "compressing"
  | "uploading"
  | "success"
  | "pending"
  | "error";

interface UploadProgress {
  status: UploadStatus;
  progress: number;
  message: string;
  originalSize?: number;
  compressedSize?: number;
}

// ─── COMPONENT ───

export default function PhotoUpload({
  onUploadComplete,
  onUploadError,
  context = "general",
  taskId,
  checklistId,
  itemIndex,
  disabled = false,
  className = "",
}: PhotoUploadProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
    message: "",
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize photo sync and online status
  useEffect(() => {
    const cleanup = initPhotoSync();

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      cleanup();
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Queue for later upload
  const queueForLaterUpload = useCallback(
    async (compressed: CompressionResult, error?: string) => {
      try {
        const base64 = await blobToBase64(compressed.blob);
        await addPendingPhoto({
          checklistId: checklistId || "unknown",
          itemIndex: itemIndex ?? 0,
          blobData: base64,
          context,
          taskId: taskId || "unknown",
        });

        setUploadProgress({
          status: "pending",
          progress: 100,
          message: error
            ? `Error: ${error}. Foto guardada para subir despues.`
            : "Sin conexion. Foto guardada para subir despues.",
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        });
      } catch {
        setUploadProgress({
          status: "error",
          progress: 0,
          message: "Error al guardar foto localmente",
        });
        onUploadError?.("Error al guardar foto localmente");
      }
    },
    [checklistId, itemIndex, context, taskId, onUploadError],
  );

  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Reset state
      setUploadProgress({
        status: "compressing",
        progress: 10,
        message: "Comprimiendo imagen...",
      });
      setPreview(null);

      try {
        // Compress image with new compression system
        const compressed = await compressImage(file);

        setUploadProgress({
          status: "compressing",
          progress: 40,
          message: `Comprimido: ${formatBytes(compressed.originalSize)} -> ${formatBytes(compressed.compressedSize)}`,
          originalSize: compressed.originalSize,
          compressedSize: compressed.compressedSize,
        });

        // Create preview
        const previewUrl = URL.createObjectURL(compressed.blob);
        setPreview(previewUrl);

        // Check if online
        if (!navigator.onLine) {
          await queueForLaterUpload(compressed);
          return;
        }

        // Upload
        setUploadProgress((prev) => ({
          ...prev,
          status: "uploading",
          progress: 50,
          message: "Subiendo...",
        }));

        const result = await uploadPhoto(
          compressed.blob,
          context,
          taskId || "task",
          (progress) => {
            setUploadProgress((prev) => ({
              ...prev,
              progress: 50 + progress * 0.5,
              message: `Subiendo... ${Math.round(progress)}%`,
            }));
          },
        );

        if (result.success && result.url && result.path) {
          setUploadProgress({
            status: "success",
            progress: 100,
            message: "Foto subida correctamente",
          });
          onUploadComplete(result.url, result.path);

          // Clear preview after success
          setTimeout(() => {
            setPreview(null);
            setUploadProgress({ status: "idle", progress: 0, message: "" });
          }, 2000);
        } else {
          // Upload failed - queue for later
          await queueForLaterUpload(compressed, result.error);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Error desconocido";
        setUploadProgress({
          status: "error",
          progress: 0,
          message: errorMessage,
        });
        onUploadError?.(errorMessage);
      }

      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [context, taskId, onUploadComplete, onUploadError, queueForLaterUpload],
  );

  const handleRetry = useCallback(() => {
    setUploadProgress({ status: "idle", progress: 0, message: "" });
    setPreview(null);
  }, []);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileSelect}
        disabled={disabled || uploadProgress.status === "uploading"}
        className="hidden"
      />

      {/* Preview */}
      {preview && (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-800">
          <img
            src={preview}
            alt="Vista previa"
            className="w-full h-full object-cover"
          />
          {uploadProgress.status === "success" && (
            <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          )}
          {uploadProgress.status === "pending" && (
            <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress bar */}
      {uploadProgress.status !== "idle" &&
        uploadProgress.status !== "error" && (
          <div className="space-y-1">
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  uploadProgress.status === "success"
                    ? "bg-emerald-500"
                    : uploadProgress.status === "pending"
                      ? "bg-amber-500"
                      : "bg-cyan-500"
                }`}
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-slate-400">{uploadProgress.message}</p>
          </div>
        )}

      {/* Error state with retry */}
      {uploadProgress.status === "error" && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-sm text-red-400 mb-2">{uploadProgress.message}</p>
          <button
            onClick={handleRetry}
            className="px-3 py-1.5 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 transition-colors"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Offline indicator */}
      {!isOnline && uploadProgress.status === "idle" && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
          <svg
            className="w-4 h-4 text-amber-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m-2.828-2.828a5 5 0 000-7.072m-2.828 2.828a1 1 0 010 1.415M9.879 9.879a3 3 0 014.242 4.242"
            />
          </svg>
          <span className="text-xs text-amber-400">
            Sin conexion - fotos se subiran automaticamente
          </span>
        </div>
      )}

      {/* Upload button */}
      {uploadProgress.status === "idle" && (
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="w-full py-3 px-4 bg-slate-800 border border-slate-700 rounded-lg text-slate-400 hover:bg-slate-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Tomar / Subir Foto</span>
        </button>
      )}
    </div>
  );
}

// ─── HELPER FUNCTIONS ───

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
