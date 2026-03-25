// ═══════════════════════════════════════════════════════════════
// TVC OFFLINE STORAGE — IndexedDB wrapper for offline queueing
// Queues submissions when offline, syncs when online
// ═══════════════════════════════════════════════════════════════

const DB_NAME = "tvc-offline-db";
const DB_VERSION = 1;
const QUEUE_STORE = "offline-queue";
const CACHE_STORE = "data-cache";

// Types
interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
  timestamp: number;
  retries: number;
}

interface CachedData {
  key: string;
  data: unknown;
  timestamp: number;
  expiry: number;
}

// Open database connection
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Queue for offline requests
      if (!db.objectStoreNames.contains(QUEUE_STORE)) {
        const queueStore = db.createObjectStore(QUEUE_STORE, { keyPath: "id" });
        queueStore.createIndex("timestamp", "timestamp", { unique: false });
      }

      // Cache for data
      if (!db.objectStoreNames.contains(CACHE_STORE)) {
        const cacheStore = db.createObjectStore(CACHE_STORE, {
          keyPath: "key",
        });
        cacheStore.createIndex("expiry", "expiry", { unique: false });
      }
    };
  });
}

// ─── QUEUE OPERATIONS ───

export async function addToQueue(
  request: Omit<QueuedRequest, "id" | "retries">,
): Promise<string> {
  const db = await openDB();
  const id = `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const queuedRequest: QueuedRequest = {
    ...request,
    id,
    retries: 0,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const addRequest = store.add(queuedRequest);

    addRequest.onsuccess = () => resolve(id);
    addRequest.onerror = () => reject(addRequest.error);
  });
}

export async function getQueuedRequests(): Promise<QueuedRequest[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readonly");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(QUEUE_STORE, "readwrite");
    const store = transaction.objectStore(QUEUE_STORE);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateQueueItem(
  id: string,
  updates: Partial<QueuedRequest>,
): Promise<void> {
  const db = await openDB();

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

// ─── CACHE OPERATIONS ───

export async function cacheData(
  key: string,
  data: unknown,
  expiryMs = 3600000,
): Promise<void> {
  const db = await openDB();
  const now = Date.now();

  const cacheEntry: CachedData = {
    key,
    data,
    timestamp: now,
    expiry: now + expiryMs,
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
  const db = await openDB();
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

export async function clearExpiredCache(): Promise<void> {
  const db = await openDB();
  const now = Date.now();

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
        cursor.continue();
      } else {
        resolve();
      }
    };
    request.onerror = () => reject(request.error);
  });
}

// ─── SYNC OPERATIONS ───

export async function syncOfflineQueue(): Promise<{
  synced: number;
  failed: number;
}> {
  const queue = await getQueuedRequests();
  let synced = 0;
  let failed = 0;

  for (const item of queue) {
    try {
      const response = await fetch(item.url, {
        method: item.method,
        headers: item.headers,
        body: item.body,
      });

      if (response.ok) {
        await removeFromQueue(item.id);
        synced++;
      } else {
        // Increment retry count
        await updateQueueItem(item.id, { retries: item.retries + 1 });
        failed++;
      }
    } catch {
      // Still offline or network error
      await updateQueueItem(item.id, { retries: item.retries + 1 });
      failed++;
    }
  }

  return { synced, failed };
}

// ─── HOOKS FOR REACT ───

export function useOfflineStatus(): boolean {
  if (typeof window === "undefined") return false;
  return !navigator.onLine;
}

// Initialize sync when coming back online
export function initOfflineSync(
  onSync?: (result: { synced: number; failed: number }) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const handleOnline = async () => {
    const result = await syncOfflineQueue();
    onSync?.(result);
  };

  // Handle messages from service worker
  const handleMessage = async (event: MessageEvent) => {
    if (event.data?.type === "SYNC_QUEUE") {
      const result = await syncOfflineQueue();
      onSync?.(result);
    } else if (event.data?.type === "OFFLINE_QUEUE") {
      await addToQueue(event.data.data);
    }
  };

  window.addEventListener("online", handleOnline);
  navigator.serviceWorker?.addEventListener("message", handleMessage);

  return () => {
    window.removeEventListener("online", handleOnline);
    navigator.serviceWorker?.removeEventListener("message", handleMessage);
  };
}
