/**
 * Service Worker - للإشعارات والتخزين المؤقت
 * 
 * الوظيفة:
 * - Push Notifications (إشعارات حتى عند إغلاق التطبيق)
 * - Background Sync
 * - Cache Management
 * 
 * @version 1.0.0
 * @date 2026-03-06
 */

const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `legal-system-${CACHE_VERSION}`;
const swLog = (...args) => globalThis.console.log(...args);
const swError = (...args) => globalThis.console.error(...args);

/** مسارات آمنة للتخزين المؤقت — لا API ولا استجابات ديناميكية */
const CACHEABLE_PATHS = new Set([
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.svg',
  '/hami-boot-shell.css',
  '/hami-boot.js',
  '/hami-home-static-shell.css',
]);

function shouldCacheRequest(request) {
  try {
    const u = new URL(request.url);
    if (request.method !== 'GET') return false;
    if (u.origin !== self.location.origin) return false;
    if (u.pathname.startsWith('/api/')) return false;
    if (CACHEABLE_PATHS.has(u.pathname)) return true;
    if (u.pathname.startsWith('/assets/') && /\.(js|css|woff2?|png|svg|ico|webp|json)(\?|$)/i.test(u.pathname)) {
      return true;
    }
    if (u.pathname.startsWith('/static-law-data/v1/') && u.pathname.endsWith('.json')) {
      return true;
    }
  } catch (_) {
    return false;
  }
  return false;
}

function isDocumentRequest(request) {
  return request.mode === 'navigate' || request.destination === 'document';
}

async function putInCache(request, response) {
  if (!response || response.status !== 200 || !shouldCacheRequest(request)) return response;
  const cache = await caches.open(CACHE_NAME);
  await cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    return putInCache(request, response);
  } catch (_) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (isDocumentRequest(request)) {
      const fallback = await caches.match('/');
      if (fallback) return fallback;
      return new Response('Service is unavailable.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }
    return new Response('', { status: 504 });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => putInCache(request, response))
    .catch(() => null);

  if (cached) {
    return cached;
  }

  const response = await network;
  return (
    response ??
    new Response('', {
      status: 504,
    })
  );
}

// =====================================================
// Install Event
// =====================================================

self.addEventListener('install', (event) => {
  swLog('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        swLog('[Service Worker] Caching static assets');
        return cache.addAll(Array.from(CACHEABLE_PATHS));
      })
      .then(() => {
        swLog('[Service Worker] Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        swError('[Service Worker] Install failed:', error);
      })
  );
});

// =====================================================
// Activate Event
// =====================================================

self.addEventListener('activate', (event) => {
  swLog('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              swLog('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        swLog('[Service Worker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// =====================================================
// Fetch Event (Network-First Strategy)
// =====================================================

function isViteDevBypass(request) {
  try {
    const u = new URL(request.url);
    if (u.origin !== self.location.origin) return true;
    const p = u.pathname;
    if (p.startsWith('/assets/')) return false;
    if (
      p.startsWith('/@') ||
      p.startsWith('/src/') ||
      p.includes('/node_modules/.vite/') ||
      /\.(tsx?|jsx?|css)(\?|$)/i.test(p)
    ) {
      return true;
    }
    if (u.search.includes('?t=') || u.search.includes('&t=')) return true;
  } catch (_) {
    return false;
  }
  return false;
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  // تجاهل الطلبات الخارجية
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  if (isViteDevBypass(event.request)) {
    return;
  }

  const url = new URL(event.request.url);
  if (isDocumentRequest(event.request)) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  if (url.pathname.startsWith('/assets/') || CACHEABLE_PATHS.has(url.pathname)) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.pathname.startsWith('/static-law-data/v1/')) {
    event.respondWith(staleWhileRevalidate(event.request));
    return;
  }

  if (url.pathname === '/static-law-data/manifest.json') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  event.respondWith(networkFirst(event.request));
});

// =====================================================
// Push Notification Event
// =====================================================

function isSwSessionMuted(prefs) {
  if (!prefs || typeof prefs.sessionMutedUntil !== 'number') return false;
  return Date.now() < prefs.sessionMutedUntil;
}

async function readSwNotificationPrefs() {
  try {
    const cache = await caches.open('hami-notification-prefs-v1');
    const res = await cache.match('https://hami.local/notification-prefs');
    if (!res) return null;
    const parsed = await res.json();
    return parsed && parsed.notifications ? parsed.notifications : null;
  } catch (_e) {
    return null;
  }
}

self.addEventListener('push', (event) => {
  swLog('[Service Worker] Push notification received');
  
  let data = {
    title: 'نظام الملف القانوني',
    body: 'لديك تحديث جديد',
    icon: '/hami-logo.png',
    badge: '/hami-logo-transparent.png',
    tag: 'default',
    data: {}
  };

  // محاولة قراءة البيانات من الإشعار
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (_e) {
      data.body = event.data.text();
    }
  }

  const prefsPromise = readSwNotificationPrefs();

  event.waitUntil(
    prefsPromise.then((prefs) => {
      const muted = isSwSessionMuted(prefs) || prefs?.masterEnabled === false;
      const soundOn = !muted && prefs?.soundMaster !== false;

      const options = {
        body: data.body,
        icon: data.icon,
        badge: data.badge,
        tag: data.tag,
        data: data.data,
        silent: !soundOn,
        vibrate: soundOn && prefs?.vibrateMaster !== false ? [200, 100, 200] : undefined,
        requireInteraction: false,
        actions: [
          {
            action: 'open',
            title: 'فتح'
          },
          {
            action: 'close',
            title: 'إغلاق'
          }
        ]
      };

      return self.registration.showNotification(data.title, options);
    }),
  );
});

// =====================================================
// Notification Click Event
// =====================================================

self.addEventListener('notificationclick', (event) => {
  swLog('[Service Worker] Notification clicked:', event.action);
  
  event.notification.close();

  if (event.action === 'open' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // إذا كان التطبيق مفتوح، ركّز عليه
          for (const client of clientList) {
            if (client.url === '/' && 'focus' in client) {
              return client.focus();
            }
          }
          
          // وإلا افتح نافذة جديدة
          if (clients.openWindow) {
            return clients.openWindow('/');
          }
        })
    );
  }
});

// =====================================================
// Background Sync Event
// =====================================================

self.addEventListener('sync', (event) => {
  swLog('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-legal-data') {
    event.waitUntil(
      syncLegalData()
    );
  }
});

async function syncLegalData() {
  swLog('[Service Worker] Syncing legal data...');
  
  try {
    // يمكن إضافة منطق المزامنة هنا
    swLog('[Service Worker] Data synced successfully');
  } catch (error) {
    swError('[Service Worker] Sync failed:', error);
    throw error; // سيعيد المحاولة تلقائياً
  }
}

// =====================================================
// Message Event (للتواصل مع التطبيق)
// =====================================================

self.addEventListener('message', (event) => {
  swLog('[Service Worker] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => caches.delete(cacheName))
          );
        })
        .then(() => {
          event.ports[0].postMessage({ success: true });
        })
    );
  }
});

swLog('[Service Worker] Script loaded successfully');
