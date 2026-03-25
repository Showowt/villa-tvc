/**
 * Client-side image compression utility
 * Issue #4: Photo upload compression
 * - Max dimension: 800px
 * - JPEG quality: 60%
 */

interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
}

export async function compressImage(
  file: File,
  maxDimension: number = 800,
  quality: number = 0.6,
): Promise<CompressionResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Calculate new dimensions
        let { width, height } = img;
        if (width > height) {
          if (width > maxDimension) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          }
        } else {
          if (height > maxDimension) {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");

        if (!ctx) {
          reject(new Error("Failed to get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Convert to blob
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error("Failed to compress image"));
              return;
            }
            resolve({
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
              width: Math.round(width),
              height: Math.round(height),
            });
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

/**
 * Upload queue for failed uploads that can be retried
 */
export interface UploadQueueItem {
  id: string;
  file: File;
  context?: string;
  taskId?: string;
  status: "pending" | "uploading" | "failed" | "success";
  retryCount: number;
  error?: string;
  url?: string;
}

const STORAGE_KEY = "tvc_upload_queue";

export function getUploadQueue(): UploadQueueItem[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

export function saveUploadQueue(queue: UploadQueueItem[]): void {
  if (typeof window === "undefined") return;
  try {
    // We can't serialize File objects, so we only save metadata of failed items
    const serializable = queue
      .filter((item) => item.status === "failed")
      .map((item) => ({
        id: item.id,
        context: item.context,
        taskId: item.taskId,
        status: item.status,
        retryCount: item.retryCount,
        error: item.error,
      }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage errors
  }
}

export function clearUploadQueue(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
