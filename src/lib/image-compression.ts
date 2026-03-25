/**
 * ═══════════════════════════════════════════════════════════════
 * TVC IMAGE COMPRESSION — Client-side image compression for slow connections
 * Issue #4: Photo upload on slow connection
 * ═══════════════════════════════════════════════════════════════
 *
 * Features:
 * - Compress to max 800px width
 * - JPEG quality 60%
 * - Target size < 200KB
 * - Preserve EXIF orientation
 * - IndexedDB queue for failed uploads
 * - Auto-retry when online
 */

// ─── TYPES ───

export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  width: number;
  height: number;
  compressionRatio: number;
}

export interface CompressionOptions {
  maxDimension: number;
  quality: number;
  targetSizeKB: number;
  preserveOrientation: boolean;
}

export interface PendingPhoto {
  id: string;
  checklistId: string;
  itemIndex: number;
  blobData: string; // Base64 encoded
  context: string;
  taskId: string;
  timestamp: number;
  retryCount: number;
  status: "pending" | "uploading" | "failed";
  error?: string;
}

// ─── CONSTANTS ───

const DEFAULT_OPTIONS: CompressionOptions = {
  maxDimension: 800,
  quality: 0.6,
  targetSizeKB: 200,
  preserveOrientation: true,
};

const PHOTO_QUEUE_DB = "tvc-photo-queue";
const PHOTO_QUEUE_VERSION = 1;
const PHOTO_STORE = "pending-photos";

// ─── EXIF ORIENTATION HANDLING ───

/**
 * Extract EXIF orientation from image file
 * Orientation values:
 * 1 - Normal
 * 3 - Rotated 180
 * 6 - Rotated 90 CW
 * 8 - Rotated 90 CCW
 */
async function getExifOrientation(file: File): Promise<number> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const view = new DataView(e.target?.result as ArrayBuffer);

      // Check for JPEG marker
      if (view.getUint16(0, false) !== 0xffd8) {
        resolve(1);
        return;
      }

      const length = view.byteLength;
      let offset = 2;

      while (offset < length) {
        if (view.getUint16(offset + 2, false) <= 8) {
          resolve(1);
          return;
        }
        const marker = view.getUint16(offset, false);
        offset += 2;

        if (marker === 0xffe1) {
          if (view.getUint32((offset += 2), false) !== 0x45786966) {
            resolve(1);
            return;
          }

          const little = view.getUint16((offset += 6), false) === 0x4949;
          offset += view.getUint32(offset + 4, little);
          const tags = view.getUint16(offset, little);
          offset += 2;

          for (let i = 0; i < tags; i++) {
            if (view.getUint16(offset + i * 12, little) === 0x0112) {
              resolve(view.getUint16(offset + i * 12 + 8, little));
              return;
            }
          }
        } else if ((marker & 0xff00) !== 0xff00) {
          break;
        } else {
          offset += view.getUint16(offset, false);
        }
      }
      resolve(1);
    };
    reader.readAsArrayBuffer(file.slice(0, 65536)); // Read first 64KB
  });
}

/**
 * Apply EXIF orientation to canvas
 */
function applyOrientation(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  orientation: number,
): { width: number; height: number } {
  switch (orientation) {
    case 2:
      ctx.transform(-1, 0, 0, 1, width, 0);
      return { width, height };
    case 3:
      ctx.transform(-1, 0, 0, -1, width, height);
      return { width, height };
    case 4:
      ctx.transform(1, 0, 0, -1, 0, height);
      return { width, height };
    case 5:
      ctx.transform(0, 1, 1, 0, 0, 0);
      return { width: height, height: width };
    case 6:
      ctx.transform(0, 1, -1, 0, height, 0);
      return { width: height, height: width };
    case 7:
      ctx.transform(0, -1, -1, 0, height, width);
      return { width: height, height: width };
    case 8:
      ctx.transform(0, -1, 1, 0, 0, width);
      return { width: height, height: width };
    default:
      return { width, height };
  }
}

// ─── COMPRESSION FUNCTIONS ───

/**
 * Compress image file with multiple quality passes to reach target size
 */
export async function compressImage(
  file: File,
  options: Partial<CompressionOptions> = {},
): Promise<CompressionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        // Get EXIF orientation
        let orientation = 1;
        if (opts.preserveOrientation) {
          orientation = await getExifOrientation(file);
        }

        const img = new Image();

        img.onload = async () => {
          try {
            // Calculate dimensions preserving aspect ratio
            let { width, height } = img;

            // Check if orientation swaps dimensions
            if (orientation >= 5 && orientation <= 8) {
              [width, height] = [height, width];
            }

            // Scale to max dimension
            if (width > opts.maxDimension || height > opts.maxDimension) {
              if (width > height) {
                height = Math.round((height * opts.maxDimension) / width);
                width = opts.maxDimension;
              } else {
                width = Math.round((width * opts.maxDimension) / height);
                height = opts.maxDimension;
              }
            }

            // Create canvas with corrected dimensions
            const canvas = document.createElement("canvas");

            // Set canvas size based on orientation
            if (orientation >= 5 && orientation <= 8) {
              canvas.width = height;
              canvas.height = width;
            } else {
              canvas.width = width;
              canvas.height = height;
            }

            const ctx = canvas.getContext("2d");
            if (!ctx) {
              reject(new Error("Error de canvas"));
              return;
            }

            // Apply orientation transform and get final dimensions
            ctx.save();
            const finalDims = applyOrientation(ctx, width, height, orientation);

            // Draw image
            ctx.drawImage(img, 0, 0, finalDims.width, finalDims.height);
            ctx.restore();

            // Try compression with decreasing quality to hit target size
            let quality = opts.quality;
            let blob: Blob | null = null;
            let attempts = 0;
            const maxAttempts = 5;

            while (attempts < maxAttempts) {
              blob = await new Promise<Blob | null>((res) => {
                canvas.toBlob((b) => res(b), "image/jpeg", quality);
              });

              if (!blob) {
                reject(new Error("Error al comprimir imagen"));
                return;
              }

              // Check if under target size or at minimum quality
              if (blob.size <= opts.targetSizeKB * 1024 || quality <= 0.3) {
                break;
              }

              // Reduce quality for next attempt
              quality -= 0.1;
              attempts++;
            }

            if (!blob) {
              reject(new Error("Error al generar imagen comprimida"));
              return;
            }

            resolve({
              blob,
              originalSize: file.size,
              compressedSize: blob.size,
              width: canvas.width,
              height: canvas.height,
              compressionRatio: file.size / blob.size,
            });
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error("Error al cargar imagen"));
        img.src = e.target?.result as string;
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = () => reject(new Error("Error al leer archivo"));
    reader.readAsDataURL(file);
  });
}

/**
 * Convert blob to base64 for storage
 */
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Error al convertir imagen"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Convert base64 back to blob
 */
export function base64ToBlob(base64: string): Blob {
  const parts = base64.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
}

// ─── INDEXEDDB PHOTO QUEUE ───

function openPhotoQueueDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"));
      return;
    }

    const request = indexedDB.open(PHOTO_QUEUE_DB, PHOTO_QUEUE_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(PHOTO_STORE)) {
        const store = db.createObjectStore(PHOTO_STORE, { keyPath: "id" });
        store.createIndex("checklistId", "checklistId", { unique: false });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

/**
 * Add photo to pending queue
 */
export async function addPendingPhoto(
  photo: Omit<PendingPhoto, "id" | "timestamp" | "retryCount" | "status">,
): Promise<string> {
  const db = await openPhotoQueueDB();
  const id = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

  const pendingPhoto: PendingPhoto = {
    ...photo,
    id,
    timestamp: Date.now(),
    retryCount: 0,
    status: "pending",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.add(pendingPhoto);

    request.onsuccess = () => resolve(id);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all pending photos
 */
export async function getPendingPhotos(): Promise<PendingPhoto[]> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readonly");
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending photos for a specific checklist
 */
export async function getPendingPhotosForChecklist(
  checklistId: string,
): Promise<PendingPhoto[]> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readonly");
    const store = transaction.objectStore(PHOTO_STORE);
    const index = store.index("checklistId");
    const request = index.getAll(checklistId);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get count of pending photos
 */
export async function getPendingPhotoCount(): Promise<number> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readonly");
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Update pending photo status
 */
export async function updatePendingPhoto(
  id: string,
  updates: Partial<PendingPhoto>,
): Promise<void> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error("Foto no encontrada"));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Remove photo from queue (after successful upload)
 */
export async function removePendingPhoto(id: string): Promise<void> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all pending photos
 */
export async function clearPendingPhotos(): Promise<void> {
  const db = await openPhotoQueueDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(PHOTO_STORE, "readwrite");
    const store = transaction.objectStore(PHOTO_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── UPLOAD FUNCTIONS ───

export interface UploadResult {
  success: boolean;
  url?: string;
  path?: string;
  error?: string;
}

/**
 * Upload a single photo with retry logic
 */
export async function uploadPhoto(
  blob: Blob,
  context: string,
  taskId: string,
  onProgress?: (progress: number) => void,
): Promise<UploadResult> {
  const formData = new FormData();
  formData.append("file", blob, `photo_${Date.now()}.jpg`);
  formData.append("context", context);
  formData.append("taskId", taskId);

  // Simulate progress since fetch doesn't support upload progress
  let progress = 0;
  const progressInterval = onProgress
    ? setInterval(() => {
        progress = Math.min(progress + Math.random() * 15, 90);
        onProgress(progress);
      }, 200)
    : null;

  try {
    const response = await fetch("/api/upload", {
      method: "POST",
      body: formData,
    });

    if (progressInterval) {
      clearInterval(progressInterval);
      onProgress?.(100);
    }

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      return { success: false, error: data.error || "Error al subir foto" };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.url,
      path: data.path,
    };
  } catch (error) {
    if (progressInterval) {
      clearInterval(progressInterval);
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error de conexion",
    };
  }
}

/**
 * Process pending photo queue - retry all failed uploads
 */
export async function processPendingPhotos(
  onPhotoUploaded?: (photo: PendingPhoto, result: UploadResult) => void,
  onProgress?: (processed: number, total: number) => void,
): Promise<{ uploaded: number; failed: number }> {
  const pending = await getPendingPhotos();
  let uploaded = 0;
  let failed = 0;

  for (let i = 0; i < pending.length; i++) {
    const photo = pending[i];
    onProgress?.(i + 1, pending.length);

    // Skip if too many retries
    if (photo.retryCount >= 5) {
      failed++;
      continue;
    }

    // Update status to uploading
    await updatePendingPhoto(photo.id, { status: "uploading" });

    // Convert base64 back to blob
    const blob = base64ToBlob(photo.blobData);

    // Attempt upload
    const result = await uploadPhoto(blob, photo.context, photo.taskId);

    if (result.success) {
      // Remove from queue
      await removePendingPhoto(photo.id);
      uploaded++;
      onPhotoUploaded?.(photo, result);
    } else {
      // Update retry count
      await updatePendingPhoto(photo.id, {
        status: "failed",
        retryCount: photo.retryCount + 1,
        error: result.error,
      });
      failed++;
    }
  }

  return { uploaded, failed };
}

// ─── ONLINE/OFFLINE SYNC ───

let syncInProgress = false;
let syncListeners: Array<
  (result: { uploaded: number; failed: number }) => void
> = [];

/**
 * Register a listener for sync completions
 */
export function onPhotoSyncComplete(
  callback: (result: { uploaded: number; failed: number }) => void,
): () => void {
  syncListeners.push(callback);
  return () => {
    syncListeners = syncListeners.filter((cb) => cb !== callback);
  };
}

/**
 * Initialize auto-sync when coming online
 */
export function initPhotoSync(): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    if (syncInProgress) return;

    const pendingCount = await getPendingPhotoCount();
    if (pendingCount === 0) return;

    syncInProgress = true;
    try {
      const result = await processPendingPhotos();
      syncListeners.forEach((cb) => cb(result));
    } finally {
      syncInProgress = false;
    }
  };

  window.addEventListener("online", handleOnline);

  // Also try to sync on init if online
  if (navigator.onLine) {
    handleOnline();
  }

  return () => {
    window.removeEventListener("online", handleOnline);
  };
}

/**
 * Generate unique upload ID
 */
export function generateUploadId(): string {
  return `upload_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

// ─── LEGACY EXPORTS (for backwards compatibility) ───

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
