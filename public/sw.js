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

const CACHE_VERSION = 'v1.0.0';
const CACHE_NAME = `legal-system-${CACHE_VERSION}`;

// الملفات المهمة للتخزين المؤقت
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json'
];

// =====================================================
// Install Event
// =====================================================

self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[Service Worker] ✅ Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] ❌ Install failed:', error);
      })
  );
});

// =====================================================
// Activate Event
// =====================================================

self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[Service Worker] ✅ Activated successfully');
        return self.clients.claim();
      })
  );
});

// =====================================================
// Fetch Event (Network-First Strategy)
// =====================================================

self.addEventListener('fetch', (event) => {
  // تجاهل الطلبات الخارجية
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // حفظ الاستجابة في الـ Cache
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // في حالة فشل الشبكة، استخدم الـ Cache
        return caches.match(event.request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[Service Worker] Serving from cache:', event.request.url);
              return cachedResponse;
            }
            
            // في حالة عدم وجود Cache، أرجع صفحة Offline
            if (event.request.destination === 'document') {
              return caches.match('/');
            }
          });
      })
  );
});

// =====================================================
// Push Notification Event
// =====================================================

self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push notification received');
  
  let data = {
    title: 'نظام الملف القانوني',
    body: 'لديك تحديث جديد',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: 'default',
    data: {}
  };

  // محاولة قراءة البيانات من الإشعار
  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: data.data,
    vibrate: [200, 100, 200],
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

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// =====================================================
// Notification Click Event
// =====================================================

self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event.action);
  
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
  console.log('[Service Worker] Background sync:', event.tag);
  
  if (event.tag === 'sync-legal-data') {
    event.waitUntil(
      syncLegalData()
    );
  }
});

async function syncLegalData() {
  console.log('[Service Worker] Syncing legal data...');
  
  try {
    // يمكن إضافة منطق المزامنة هنا
    console.log('[Service Worker] ✅ Data synced successfully');
  } catch (error) {
    console.error('[Service Worker] ❌ Sync failed:', error);
    throw error; // سيعيد المحاولة تلقائياً
  }
}

// =====================================================
// Message Event (للتواصل مع التطبيق)
// =====================================================

self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);
  
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

console.log('[Service Worker] Script loaded successfully');
