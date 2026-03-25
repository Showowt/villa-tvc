// ═══════════════════════════════════════════════════════════════════════════════
// TVC SERVICE WORKER — OFFLINE-FIRST + PUSH NOTIFICATIONS
// Network-first with cache fallback + offline submission queue + push delivery
// ═══════════════════════════════════════════════════════════════════════════════

const CACHE_VERSION = 'v3';
const STATIC_CACHE = `tvc-static-${CACHE_VERSION}`;
const DATA_CACHE = `tvc-data-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

// Static assets to cache on install (App Shell)
const STATIC_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/staff/tasks',
  '/staff/checklist',
  '/staff/inventory',
  '/staff/bot',
  '/staff/kitchen',
  '/staff/services',
  '/staff/training',
  '/staff/pos',
  '/staff/linen',
  '/settings/notifications',
  '/tvc-assets/icon-192.png',
  '/tvc-assets/icon-512.png'
];

// API routes to cache responses (critical operational data)
const CACHEABLE_API_ROUTES = [
  '/api/tasks',
  '/api/checklist',
  '/api/inventory',
  '/api/ops/staff',
  '/api/ops/villa-status',
  '/api/menu/orders',
  '/api/dashboard/operations',
  '/api/dashboard/schedule'
];

// Notification type to page URL mapping
const NOTIFICATION_URLS = {
  low_stock: '/staff/inventory',
  cleaning_deadline: '/staff/checklist',
  checklist_submitted: '/ops/housekeeping',
  task_assigned: '/staff/tasks',
  escalation: '/ops/management',
  order_placed: '/staff/kitchen',
  maintenance_alert: '/ops/maintenance',
  system: '/staff/tasks'
};

// ─── INSTALL: Cache static assets ───
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      // Cache static assets one by one to handle failures gracefully
      const cachePromises = STATIC_ASSETS.map(async (url) => {
        try {
          await cache.add(url);
        } catch (error) {
          console.warn(`[SW] Failed to cache: ${url}`, error);
        }
      });

      await Promise.all(cachePromises);

      // Force immediate activation
      await self.skipWaiting();
      console.log('[SW] Installed and static assets cached');
    })()
  );
});

// ─── ACTIVATE: Clean old caches ───
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Delete old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name.startsWith('tvc-') && name !== STATIC_CACHE && name !== DATA_CACHE)
          .map((name) => {
            console.log('[SW] Deleting old cache:', name);
            return caches.delete(name);
          })
      );

      // Take control of all clients immediately
      await self.clients.claim();
      console.log('[SW] Activated and controlling all clients');
    })()
  );
});

// ─── FETCH: Handle all requests ───
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-HTTP requests and browser extensions
  if (!url.protocol.startsWith('http')) {
    return;
  }

  // Handle POST/PUT/PATCH/DELETE requests - queue for offline sync
  if (request.method !== 'GET') {
    event.respondWith(handleMutatingRequest(request.clone()));
    return;
  }

  // Handle API requests - network first with cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests (HTML pages) - network first
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigation(request));
    return;
  }

  // Handle static assets - stale-while-revalidate
  event.respondWith(handleStaticAsset(request));
});

// ─── NETWORK FIRST WITH CACHE FALLBACK (for API) ───
async function handleApiRequest(request) {
  const url = new URL(request.url);
  const isCacheable = CACHEABLE_API_ROUTES.some(route => url.pathname.startsWith(route));

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for cacheable routes
    if (networkResponse.ok && isCacheable) {
      const cache = await caches.open(DATA_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Network failed - try cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Return cached data with offline header
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-TVC-Offline', 'true');
      headers.set('X-TVC-Cached-At', cachedResponse.headers.get('date') || 'unknown');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers
      });
    }

    // No cache available
    return new Response(
      JSON.stringify({
        error: true,
        offline: true,
        message: 'Sin conexion. Los datos se sincronizaran cuando vuelvas a estar en linea.',
        message_en: 'Offline. Data will sync when you reconnect.'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ─── NAVIGATION HANDLER ───
async function handleNavigation(request) {
  try {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      // Cache successful navigations
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    // Try cached version
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline page
    const offlinePage = await caches.match(OFFLINE_URL);
    if (offlinePage) {
      return offlinePage;
    }

    // Last resort
    return new Response(
      '<html><body><h1>Sin Conexion</h1><p>No hay conexion a internet.</p></body></html>',
      { headers: { 'Content-Type': 'text/html' } }
    );
  }
}

// ─── STATIC ASSET HANDLER (Stale-While-Revalidate) ───
async function handleStaticAsset(request) {
  const cachedResponse = await caches.match(request);

  // Return cached version immediately if available
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => null);

  if (cachedResponse) {
    // Return cached and update in background
    fetchPromise.catch(() => {});
    return cachedResponse;
  }

  // No cache - wait for network
  try {
    const networkResponse = await fetchPromise;
    if (networkResponse) {
      return networkResponse;
    }
  } catch (error) {
    // Network failed
  }

  return new Response('Offline', { status: 503 });
}

// ─── HANDLE MUTATING REQUESTS (POST/PUT/DELETE) ───
async function handleMutatingRequest(request) {
  try {
    // Try network first
    const response = await fetch(request);
    return response;
  } catch (error) {
    // Network failed - queue for later sync
    const requestData = {
      id: `queue-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries()),
      body: await request.text(),
      timestamp: Date.now()
    };

    // Notify all clients to store in IndexedDB
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'QUEUE_OFFLINE_REQUEST',
        data: requestData
      });
    });

    return new Response(
      JSON.stringify({
        success: true,
        queued: true,
        queueId: requestData.id,
        message: 'Guardado sin conexion. Se enviara automaticamente cuando vuelvas a estar en linea.',
        message_en: 'Saved offline. Will be sent automatically when you reconnect.'
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// ─── BACKGROUND SYNC ───
self.addEventListener('sync', (event) => {
  if (event.tag === 'tvc-sync-queue') {
    event.waitUntil(triggerClientSync());
  }
});

async function triggerClientSync() {
  const clients = await self.clients.matchAll();
  clients.forEach(client => {
    client.postMessage({ type: 'SYNC_OFFLINE_QUEUE' });
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUSH NOTIFICATIONS
// ═══════════════════════════════════════════════════════════════════════════════

// ─── PUSH EVENT: Receive and display notification ───
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('[SW] Push event without data');
    return;
  }

  try {
    const data = event.data.json();

    // Build notification options
    const options = {
      body: data.body || 'Nueva notificacion de TVC',
      icon: '/tvc-assets/icon-192.png',
      badge: '/tvc-assets/badge-72.png',
      vibrate: getVibrationPattern(data.type),
      tag: data.tag || `tvc-${data.type}-${Date.now()}`,
      renotify: true,
      requireInteraction: isUrgent(data.type),
      timestamp: Date.now(),
      data: {
        url: data.url || getDefaultUrl(data.type),
        type: data.type,
        ...data.data
      },
      actions: getNotificationActions(data.type)
    };

    // Add image if provided
    if (data.image) {
      options.image = data.image;
    }

    event.waitUntil(
      Promise.all([
        // Show the notification
        self.registration.showNotification(
          data.title || getDefaultTitle(data.type),
          options
        ),
        // Update badge count
        updateBadgeCount(1)
      ])
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);

    // Show fallback notification
    event.waitUntil(
      self.registration.showNotification('TVC Operaciones', {
        body: 'Tienes una nueva notificacion',
        icon: '/tvc-assets/icon-192.png',
        tag: 'tvc-fallback'
      })
    );
  }
});

// ─── NOTIFICATION CLICK: Navigate to relevant page ───
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notificationData = event.notification.data || {};

  // Handle action buttons
  if (action === 'close' || action === 'dismiss') {
    return;
  }

  // Determine URL to open
  let urlToOpen = notificationData.url || '/staff/tasks';

  // Handle specific actions
  if (action === 'view_details' && notificationData.detailsUrl) {
    urlToOpen = notificationData.detailsUrl;
  } else if (action === 'mark_done' && notificationData.taskId) {
    // Handle task completion
    urlToOpen = `/staff/tasks?complete=${notificationData.taskId}`;
  }

  event.waitUntil(
    (async () => {
      // Try to find an existing window
      const clientList = await clients.matchAll({
        type: 'window',
        includeUncontrolled: true
      });

      // Look for an existing window we can focus
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        if (clientUrl.origin === self.location.origin) {
          // Navigate existing window
          await client.navigate(urlToOpen);
          await client.focus();

          // Update badge count
          await updateBadgeCount(-1);

          // Track click
          trackNotificationClick(notificationData);

          return;
        }
      }

      // No existing window - open new one
      await clients.openWindow(urlToOpen);
      await updateBadgeCount(-1);
      trackNotificationClick(notificationData);
    })()
  );
});

// ─── NOTIFICATION CLOSE: Track dismissals ───
self.addEventListener('notificationclose', (event) => {
  const notificationData = event.notification.data || {};

  // Track dismissal for analytics (optional)
  console.log('[SW] Notification dismissed:', notificationData.type);
});

// ─── HELPER: Get vibration pattern based on type ───
function getVibrationPattern(type) {
  switch (type) {
    case 'escalation':
    case 'cleaning_deadline':
      return [200, 100, 200, 100, 200]; // Urgent pattern
    case 'order_placed':
      return [100, 50, 100, 50, 100]; // Quick alert
    case 'task_assigned':
      return [150, 100, 150]; // Standard alert
    default:
      return [100, 50, 100]; // Default
  }
}

// ─── HELPER: Check if notification is urgent ───
function isUrgent(type) {
  return ['escalation', 'cleaning_deadline', 'maintenance_alert'].includes(type);
}

// ─── HELPER: Get default URL for notification type ───
function getDefaultUrl(type) {
  return NOTIFICATION_URLS[type] || '/staff/tasks';
}

// ─── HELPER: Get default title for notification type ───
function getDefaultTitle(type) {
  const titles = {
    low_stock: 'Inventario Bajo',
    cleaning_deadline: 'Deadline Limpieza',
    checklist_submitted: 'Checklist Completado',
    task_assigned: 'Nueva Tarea',
    escalation: 'Escalacion Urgente',
    order_placed: 'Nuevo Pedido',
    maintenance_alert: 'Alerta Mantenimiento',
    system: 'TVC Operaciones'
  };
  return titles[type] || 'TVC Operaciones';
}

// ─── HELPER: Get action buttons based on type ───
function getNotificationActions(type) {
  switch (type) {
    case 'task_assigned':
      return [
        { action: 'view_details', title: 'Ver Tarea' },
        { action: 'dismiss', title: 'Cerrar' }
      ];
    case 'order_placed':
      return [
        { action: 'view_details', title: 'Ver Pedido' },
        { action: 'dismiss', title: 'Cerrar' }
      ];
    case 'escalation':
      return [
        { action: 'view_details', title: 'Atender Ahora' }
      ];
    case 'checklist_submitted':
      return [
        { action: 'view_details', title: 'Revisar' },
        { action: 'dismiss', title: 'Cerrar' }
      ];
    default:
      return [
        { action: 'view_details', title: 'Ver' },
        { action: 'dismiss', title: 'Cerrar' }
      ];
  }
}

// ─── HELPER: Update app badge count ───
async function updateBadgeCount(delta) {
  try {
    if ('setAppBadge' in navigator) {
      // Get current count from storage or clients
      const clients = await self.clients.matchAll();
      let currentCount = 0;

      for (const client of clients) {
        // Request count from client
        client.postMessage({ type: 'GET_BADGE_COUNT' });
      }

      // Simple increment/decrement
      const newCount = Math.max(0, currentCount + delta);

      if (newCount > 0) {
        await navigator.setAppBadge(newCount);
      } else {
        await navigator.clearAppBadge();
      }
    }
  } catch (error) {
    console.warn('[SW] Badge API error:', error);
  }
}

// ─── HELPER: Track notification click ───
function trackNotificationClick(data) {
  // Send to analytics endpoint (fire and forget)
  fetch('/api/notifications/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: data.type,
      action: 'click',
      timestamp: Date.now()
    })
  }).catch(() => {
    // Ignore errors - this is non-critical
  });
}

// ─── MESSAGE HANDLER (from main thread) ───
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'CACHE_URLS') {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(DATA_CACHE);
        const urls = event.data.urls || [];
        for (const url of urls) {
          try {
            const response = await fetch(url);
            if (response.ok) {
              await cache.put(url, response);
            }
          } catch (error) {
            console.warn('[SW] Failed to cache URL:', url);
          }
        }
      })()
    );
  }

  if (event.data?.type === 'CLEAR_CACHE') {
    event.waitUntil(
      (async () => {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      })()
    );
  }

  if (event.data?.type === 'BADGE_COUNT') {
    // Update badge from client
    const count = event.data.count || 0;
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count);
      } else {
        navigator.clearAppBadge();
      }
    }
  }
});

console.log('[SW] Service Worker v3 loaded with Push Notifications');
