// ═══════════════════════════════════════════════════════════════════════════════
// TVC OFFLINE MODULE — Complete offline support for island deployment
// IndexedDB storage, queue management, sync handling, status tracking
// ═══════════════════════════════════════════════════════════════════════════════

const DB_NAME = "tvc-offline-db";
const DB_VERSION = 2;
const QUEUE_STORE = "offline-queue";
const CACHE_STORE = "data-cache";
const SYNC_LOG_STORE = "sync-log";

// ─── TYPES ───

export interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retries: number;
  maxRetries: number;
  priority: "high" | "normal" | "low";
  description?: string;
}

export interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiry: number;
  version: number;
}

export interface SyncLogEntry {
  id: string;
  timestamp: number;
  action:
    | "sync_start"
    | "sync_complete"
    | "sync_failed"
    | "item_synced"
    | "item_failed";
  details: string;
  queueId?: string;
}

export interface OfflineStatus {
  isOnline: boolean;
  queueLength: number;
  lastSyncAt: number | null;
  syncInProgress: boolean;
  pendingChanges: number;
}

export interface SyncResult {
  synced: number;
  failed: number;
  remaining: number;
  errors: Array<{ id: string; error: string }>;
}

// ─── DATABASE INITIALIZATION ───

let dbInstance: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      dbInstance = request.result;

      // Handle connection close
      dbInstance.onclose = () => {
        dbInstance = null;
      };

      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Queue store
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
        queueStore.createIndex("priority", "priority", { unique: false });
      }

      // Cache store
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cacheStore = db.createObjectStore(CACHE_STORE, {
          keyPath: "key",
        });
        cacheStore.createIndex("expiry", "expiry", { unique: false });
        cacheStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Sync log store
      if (!db.objectStoreNames.contains(SYNC_LOG_STORE)) {
        const syncStore = db.createObjectStore(SYNC_LOG_STORE, {
          keyPath: "id",
        });
        syncStore.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
  });
}

// ─── QUEUE OPERATIONS ───

export async function addToQueue(
  request: Omit<QueuedRequest, "id" | "retries" | "maxRetries"> & {
    priority?: "high" | "normal" | "low";
    maxRetries?: number;
  },
): Promise<string> {
  const db = await getDB();
  const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const queuedRequest: QueuedRequest = {
    ...request,
    id,
    retries: 0,
    maxRetries: request.maxRetries ?? 5,
    priority: request.priority ?? "normal",
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const addRequest = store.add(queuedRequest);

    addRequest.onsuccess = () => {
      notifyQueueChange();
      resolve(id);
    };
    addRequest.onerror = () => reject(addRequest.error);
  });
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const store = transaction.objectStore(QUEUE_STORE);
    const index = store.index("priority");
    const request = index.getAll();

    request.onsuccess = () => {
      // Sort by priority (high first) then by timestamp (oldest first)
      const sorted = (request.result as QueuedRequest[]).sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return a.timestamp - b.timestamp;
      });
      resolve(sorted);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.count();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => {
      notifyQueueChange();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updateQueueItem(
  id: string,
  updates: Partial<QueuedRequest>,
): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const item = getRequest.result;
      if (item) {
        const updated = { ...item, ...updates };
        const putRequest = store.put(updated);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        reject(new Error("Item not found"));
      }
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.clear();

    request.onsuccess = () => {
      notifyQueueChange();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── CACHE OPERATIONS ───

export async function cacheData(
  key: string,
  data: unknown,
  expiryMs: number = 3600000, // 1 hour default
): Promise<void> {
  const db = await getDB();
  const now = Date.now();

  const cacheEntry: CachedData = {
    key,
    data,
    timestamp: now,
    expiry: now + expiryMs,
    version: 1,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, "readwrite");
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.put(cacheEntry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const db = await getDB();
  const now = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, "readonly");
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.get(key);

    request.onsuccess = () => {
      const result = request.result as CachedData | undefined;
      if (result && result.expiry > now) {
        resolve(result.data as T);
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearExpiredCache(): Promise<number> {
  const db = await getDB();
  const now = Date.now();
  let deleted = 0;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, "readwrite");
    const store = transaction.objectStore(CACHE_STORE);
    const index = store.index("expiry");
    const range = IDBKeyRange.upperBound(now);
    const request = index.openCursor(range);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        deleted++;
        cursor.continue();
      } else {
        resolve(deleted);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearAllCache(): Promise<void> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(CACHE_STORE, "readwrite");
    const store = transaction.objectStore(CACHE_STORE);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ─── SYNC LOG OPERATIONS ───

async function addSyncLog(
  action: SyncLogEntry["action"],
  details: string,
  queueId?: string,
): Promise<void> {
  const db = await getDB();
  const entry: SyncLogEntry = {
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    action,
    details,
    queueId,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_LOG_STORE, "readwrite");
    const store = transaction.objectStore(SYNC_LOG_STORE);
    const request = store.add(entry);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getSyncLogs(limit: number = 50): Promise<SyncLogEntry[]> {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_LOG_STORE, "readonly");
    const store = transaction.objectStore(SYNC_LOG_STORE);
    const index = store.index("timestamp");
    const request = index.openCursor(null, "prev");
    const logs: SyncLogEntry[] = [];

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor && logs.length < limit) {
        logs.push(cursor.value);
        cursor.continue();
      } else {
        resolve(logs);
      }
    };
    request.onerror = () => reject(request.error);
  });
}

export async function clearOldSyncLogs(
  maxAgeMs: number = 86400000,
): Promise<void> {
  const db = await getDB();
  const cutoff = Date.now() - maxAgeMs;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(SYNC_LOG_STORE, "readwrite");
    const store = transaction.objectStore(SYNC_LOG_STORE);
    const index = store.index("timestamp");
    const range = IDBKeyRange.upperBound(cutoff);
    const request = index.openCursor(range);

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── SYNC OPERATIONS ───

let syncInProgress = false;

export async function syncOfflineQueue(
  onProgress?: (current: number, total: number) => void,
): Promise<SyncResult> {
  if (syncInProgress) {
    return { synced: 0, failed: 0, remaining: 0, errors: [] };
  }

  if (!navigator.onLine) {
    return {
      synced: 0,
      failed: 0,
      remaining: await getQueueLength(),
      errors: [],
    };
  }

  syncInProgress = true;
  await addSyncLog("sync_start", "Starting offline queue sync");
  notifySyncStatus("syncing");

  const queue = await getQueuedRequests();
  const total = queue.length;
  let synced = 0;
  let failed = 0;
  const errors: Array<{ id: string; error: string }> = [];

  for (let i = 0; i < queue.length; i++) {
    const item = queue[i];

    try {
      onProgress?.(i + 1, total);

      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body || undefined,
      });

      if (response.ok || response.status === 201) {
        await removeFromQueue(item.id);
        await addSyncLog(
          "item_synced",
          `Successfully synced ${item.url}`,
          item.id,
        );
        synced++;
      } else if (response.status >= 400 && response.status < 500) {
        // Client error - don't retry
        await removeFromQueue(item.id);
        const errorMsg = `Client error ${response.status}: ${response.statusText}`;
        await addSyncLog("item_failed", errorMsg, item.id);
        errors.push({ id: item.id, error: errorMsg });
        failed++;
      } else {
        // Server error - increment retry
        if (item.retries >= item.maxRetries) {
          await removeFromQueue(item.id);
          const errorMsg = `Max retries exceeded for ${item.url}`;
          await addSyncLog("item_failed", errorMsg, item.id);
          errors.push({ id: item.id, error: errorMsg });
          failed++;
        } else {
          await updateQueueItem(item.id, { retries: item.retries + 1 });
        }
      }
    } catch (error) {
      // Network error - increment retry
      if (item.retries >= item.maxRetries) {
        await removeFromQueue(item.id);
        const errorMsg = `Network error after ${item.maxRetries} retries`;
        await addSyncLog("item_failed", errorMsg, item.id);
        errors.push({ id: item.id, error: errorMsg });
        failed++;
      } else {
        await updateQueueItem(item.id, { retries: item.retries + 1 });
      }
    }
  }

  const remaining = await getQueueLength();
  syncInProgress = false;

  if (synced > 0 || failed > 0) {
    await addSyncLog(
      "sync_complete",
      `Sync complete: ${synced} synced, ${failed} failed, ${remaining} remaining`,
    );
  }

  notifySyncStatus(remaining > 0 ? "pending" : "idle");

  return { synced, failed, remaining, errors };
}

// ─── OFFLINE STATUS ───

export async function getOfflineStatus(): Promise<OfflineStatus> {
  const queueLength = await getQueueLength();
  const logs = await getSyncLogs(1);
  const lastSyncLog = logs.find(
    (l) => l.action === "sync_complete" || l.action === "sync_start",
  );

  return {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    queueLength,
    lastSyncAt: lastSyncLog?.timestamp ?? null,
    syncInProgress,
    pendingChanges: queueLength,
  };
}

// ─── EVENT SYSTEM ───

type OfflineEventType = "queue_change" | "sync_status" | "online_status";
type OfflineEventCallback = (data: unknown) => void;
const eventListeners: Map<
  OfflineEventType,
  Set<OfflineEventCallback>
> = new Map();

export function onOfflineEvent(
  event: OfflineEventType,
  callback: OfflineEventCallback,
): () => void {
  if (!eventListeners.has(event)) {
    eventListeners.set(event, new Set());
  }
  eventListeners.get(event)!.add(callback);

  return () => {
    eventListeners.get(event)?.delete(callback);
  };
}

function notifyQueueChange() {
  getQueueLength().then((length) => {
    eventListeners
      .get("queue_change")
      ?.forEach((cb) => cb({ queueLength: length }));
  });
}

function notifySyncStatus(status: "idle" | "syncing" | "pending") {
  eventListeners.get("sync_status")?.forEach((cb) => cb({ status }));
}

function notifyOnlineStatus(isOnline: boolean) {
  eventListeners.get("online_status")?.forEach((cb) => cb({ isOnline }));
}

// ─── INITIALIZATION ───

export function initOfflineSupport(
  options: {
    onSync?: (result: SyncResult) => void;
    onStatusChange?: (isOnline: boolean) => void;
    onQueueChange?: (queueLength: number) => void;
  } = {},
): () => void {
  if (typeof window === "undefined") {
    return () => {};
  }

  const { onSync, onStatusChange, onQueueChange } = options;

  // Handle online/offline events
  const handleOnline = async () => {
    notifyOnlineStatus(true);
    onStatusChange?.(true);

    // Auto-sync when coming back online
    const result = await syncOfflineQueue();
    onSync?.(result);
  };

  const handleOffline = () => {
    notifyOnlineStatus(false);
    onStatusChange?.(false);
  };

  // Handle service worker messages
  const handleMessage = async (event: MessageEvent) => {
    if (event.data?.type === "QUEUE_OFFLINE_REQUEST") {
      await addToQueue(event.data.data);
      const length = await getQueueLength();
      onQueueChange?.(length);
    } else if (event.data?.type === "SYNC_OFFLINE_QUEUE") {
      const result = await syncOfflineQueue();
      onSync?.(result);
    }
  };

  // Attach event listeners
  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);
  navigator.serviceWorker?.addEventListener("message", handleMessage);

  // Subscribe to internal events
  const unsubQueue = onOfflineEvent("queue_change", (data) => {
    onQueueChange?.((data as { queueLength: number }).queueLength);
  });

  // Initial status check
  if (navigator.onLine) {
    // Sync any pending items on load
    syncOfflineQueue().then((result) => {
      if (result.synced > 0) {
        onSync?.(result);
      }
    });
  }

  // Cleanup function
  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
    navigator.serviceWorker?.removeEventListener("message", handleMessage);
    unsubQueue();
  };
}

// ─── OFFLINE-AWARE FETCH ───

export async function offlineFetch(
  url: string,
  options: RequestInit & {
    cacheKey?: string;
    cacheExpiry?: number;
    priority?: "high" | "normal" | "low";
    description?: string;
    queueIfOffline?: boolean;
  } = {},
): Promise<Response> {
  const {
    cacheKey,
    cacheExpiry = 3600000,
    priority = "normal",
    description,
    queueIfOffline = true,
    ...fetchOptions
  } = options;

  // For GET requests, try cache first if offline
  if ((!fetchOptions.method || fetchOptions.method === "GET") && cacheKey) {
    if (!navigator.onLine) {
      const cached = await getCachedData<unknown>(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-TVC-Offline": "true",
          },
        });
      }
    }
  }

  try {
    const response = await fetch(url, fetchOptions);

    // Cache successful GET responses
    if (
      response.ok &&
      cacheKey &&
      (!fetchOptions.method || fetchOptions.method === "GET")
    ) {
      const data = await response.clone().json();
      await cacheData(cacheKey, data, cacheExpiry);
    }

    return response;
  } catch (error) {
    // Network error
    if (
      !navigator.onLine &&
      queueIfOffline &&
      fetchOptions.method &&
      fetchOptions.method !== "GET"
    ) {
      // Queue mutating requests
      const queueId = await addToQueue({
        url,
        method: fetchOptions.method || "POST",
        headers: Object.fromEntries(
          Object.entries(fetchOptions.headers || {}).map(([k, v]) => [
            k,
            String(v),
          ]),
        ),
        body:
          typeof fetchOptions.body === "string"
            ? fetchOptions.body
            : JSON.stringify(fetchOptions.body),
        timestamp: Date.now(),
        priority,
        description,
      });

      return new Response(
        JSON.stringify({
          success: true,
          queued: true,
          queueId,
          message: "Guardado sin conexion",
        }),
        {
          status: 202,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Try cache for GET requests
    if (cacheKey && (!fetchOptions.method || fetchOptions.method === "GET")) {
      const cached = await getCachedData<unknown>(cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "X-TVC-Offline": "true",
          },
        });
      }
    }

    throw error;
  }
}

// ─── UTILITY FUNCTIONS ───

export function isOffline(): boolean {
  return typeof navigator !== "undefined" ? !navigator.onLine : false;
}

export async function prefetchForOffline(urls: string[]): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.serviceWorker?.controller
  ) {
    return;
  }

  navigator.serviceWorker.controller.postMessage({
    type: "CACHE_URLS",
    urls,
  });
}

export async function clearAllOfflineData(): Promise<void> {
  await clearQueue();
  await clearAllCache();
  await clearOldSyncLogs(0);

  // Clear service worker caches
  if (typeof navigator !== "undefined" && navigator.serviceWorker?.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "CLEAR_CACHE" });
  }
}
