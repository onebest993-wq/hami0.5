/**
 * Service Worker — تخزين قشرة التطبيق والإشعارات الدافعة.
 *
 * لا يعمل داخل غلاف Capacitor: هناك تُقدَّم الأصول من الحزمة محلياً، فطبقة
 * تخزين ثانية تعني نسخة مكرَّرة على الجهاز وقشرة قديمة بعد كل تحديث.
 */

/**
 * يُستبدل عند البناء بختم فريد لكل حزمة (`hami-sw-cache-stamp` في vite.config).
 * بقاء رقم مكتوب باليد يعني ذاكرة تنمو بلا حدّ: كل نشرة تضيف أصولاً مُجزَّأة
 * جديدة ولا تُزيل القديمة، لأن `activate` لا يحذف إلا ما اختلف اسمه.
 */
const CACHE_VERSION = '__HAMI_SW_CACHE_VERSION__';
const CACHE_NAME = `legal-system-${CACHE_VERSION}`;

/** تشخيص عامل الخدمة صامت افتراضياً — يُفتح بـ`?hami-sw-debug=1` عند التسجيل. */
const SW_DEBUG = new URL(self.location.href).searchParams.get('hami-sw-debug') === '1';
const swLog = (...args) => {
    if (SW_DEBUG) globalThis.console.log(...args);
};
const swError = (...args) => {
    if (SW_DEBUG) globalThis.console.error(...args);
};

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

const HASHED_ASSET_RE = /\.(js|css|woff2?|png|svg|ico|webp|json)(\?|$)/i;

function shouldCacheRequest(request) {
    try {
        const u = new URL(request.url);
        if (request.method !== 'GET') return false;
        if (u.origin !== self.location.origin) return false;
        if (u.pathname.startsWith('/api/')) return false;
        if (CACHEABLE_PATHS.has(u.pathname)) return true;
        if (u.pathname.startsWith('/assets/') && HASHED_ASSET_RE.test(u.pathname)) return true;
        if (u.pathname.startsWith('/static-law-data/v1/') && u.pathname.endsWith('.json')) return true;
        if (u.pathname === '/static-law-data/manifest.json') return true;
    } catch {
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
    } catch {
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

    if (cached) return cached;

    const response = await network;
    return response ?? new Response('', { status: 504 });
}

// =====================================================
// Install
// =====================================================

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches
            .open(CACHE_NAME)
            .then(async (cache) => {
                /*
                 * ملفاً ملفاً لا `addAll`: تلك ترفض الدفعة كاملة إن سقط عنصر
                 * واحد، فيُقلع التطبيق بلا قشرة مخزَّنة أصلاً ولا يظهر السبب.
                 */
                const results = await Promise.allSettled(
                    Array.from(CACHEABLE_PATHS).map(async (path) => {
                        const response = await fetch(path, { cache: 'reload' });
                        if (!response.ok) throw new Error(`${path} → ${response.status}`);
                        await cache.put(path, response);
                    }),
                );
                for (const r of results) {
                    if (r.status === 'rejected') swError('[SW] precache miss:', r.reason);
                }
            })
            .catch((error) => swError('[SW] install failed:', error))
            .then(() => self.skipWaiting()),
    );
});

// =====================================================
// Activate
// =====================================================

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((names) =>
                Promise.all(
                    names
                        .filter((name) => name.startsWith('legal-system-') && name !== CACHE_NAME)
                        .map((name) => caches.delete(name)),
                ),
            )
            .then(() => self.clients.claim()),
    );
});

// =====================================================
// Fetch
// =====================================================

self.addEventListener('fetch', (event) => {
    const request = event.request;
    if (request.method !== 'GET') return;

    let url;
    try {
        url = new URL(request.url);
    } catch {
        return;
    }
    if (url.origin !== self.location.origin) return;

    if (isDocumentRequest(request)) {
        event.respondWith(networkFirst(request));
        return;
    }

    /*
     * ما لا نخزّنه لا نعترضه. تمريره عبر `respondWith(fetch(...))` يضيف إقلاع
     * العامل ورحلة ذهاب وإياب على كل طلب مقابل لا شيء.
     */
    if (!shouldCacheRequest(request)) return;

    if (url.pathname === '/static-law-data/manifest.json') {
        event.respondWith(networkFirst(request));
        return;
    }

    event.respondWith(staleWhileRevalidate(request));
});

// =====================================================
// Push
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
    } catch {
        return null;
    }
}

function sameOriginSwAsset(url) {
    if (typeof url !== 'string') return null;
    const t = url.trim();
    if (!t.startsWith('/') || t.startsWith('//')) return null;
    if (t.includes('..') || t.includes('\\') || t.includes('<') || t.includes(':')) return null;
    if (t.length > 128) return null;
    return t;
}

function clipOsNotifyDetail(detail) {
    try {
        const json = JSON.stringify(detail ?? {});
        if (!json || json.length > 4096) return {};
        const parsed = JSON.parse(json);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
        return parsed;
    } catch {
        return {};
    }
}

function asSafePushPayload(raw) {
    const data = {
        title: 'نظام الملف القانوني',
        body: 'لديك تحديث جديد',
        icon: '/hami-logo.png',
        badge: '/hami-logo-transparent.png',
        tag: 'default',
        data: {},
    };
    if (!raw || typeof raw !== 'object') return data;
    if (typeof raw.title === 'string' && raw.title.trim()) {
        data.title = raw.title.replace(/\u0000/g, '').trim().slice(0, 200);
    }
    if (typeof raw.body === 'string' && raw.body.trim()) {
        data.body = raw.body.replace(/\u0000/g, '').trim().slice(0, 2000);
    }
    const icon = sameOriginSwAsset(raw.icon);
    if (icon) data.icon = icon;
    const badge = sameOriginSwAsset(raw.badge);
    if (badge) data.badge = badge;
    if (typeof raw.tag === 'string' && raw.tag.trim()) {
        data.tag = raw.tag.trim().slice(0, 64);
    }
    data.data = clipOsNotifyDetail(raw.data);
    return data;
}

self.addEventListener('push', (event) => {
    let data = asSafePushPayload(null);

    if (event.data) {
        try {
            data = asSafePushPayload(event.data.json());
        } catch {
            try {
                const text = event.data.text();
                if (typeof text === 'string' && text.trim()) {
                    data.body = text.replace(/\u0000/g, '').trim().slice(0, 2000);
                }
            } catch {
                /* keep defaults */
            }
        }
    }

    event.waitUntil(
        readSwNotificationPrefs().then((prefs) => {
            const muted = isSwSessionMuted(prefs) || prefs?.masterEnabled === false;
            const soundOn = !muted && prefs?.soundMaster !== false;

            return self.registration.showNotification(data.title, {
                body: data.body,
                icon: data.icon,
                badge: data.badge,
                tag: data.tag,
                data: data.data,
                silent: !soundOn,
                vibrate: soundOn && prefs?.vibrateMaster !== false ? [200, 100, 200] : undefined,
                requireInteraction: false,
                actions: [
                    { action: 'open', title: 'فتح' },
                    { action: 'close', title: 'إغلاق' },
                ],
            });
        }),
    );
});

// =====================================================
// Notification click
// =====================================================

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    if (event.action === 'close') return;

    const detail = clipOsNotifyDetail(event.notification.data || {});
    let openUrl = '/';
    try {
        const json = JSON.stringify(detail);
        const url = new URL('/', self.location.origin);
        url.searchParams.set('hamiOsNotify', encodeURIComponent(json));
        if (url.search.length <= 4100) {
            openUrl = `${url.pathname}${url.search}`;
        }
    } catch {
        openUrl = '/';
    }

    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            /*
             * `client.url` عنوان مطلق، فمقارنته بـ'/' لا تصدق أبداً — وكانت
             * النتيجة نافذة جديدة عند كل نقرة رغم أن التطبيق مفتوح.
             */
            for (const client of clientList) {
                if (new URL(client.url).origin === self.location.origin && 'focus' in client) {
                    try {
                        client.postMessage({ type: 'HAMI_NOTIFICATION_OPEN', detail });
                    } catch {
                        /* ignore */
                    }
                    return client.focus();
                }
            }
            return self.clients.openWindow ? self.clients.openWindow(openUrl) : undefined;
        }),
    );
});

// =====================================================
// Messages
// =====================================================

/**
 * تسخين القشرة بعد أول مطالبة بالتحكّم.
 *
 * أصول أول تحميل تصل قبل أن يسيطر العامل، فلا تدخل ذاكرته ولا يعمل الوضع
 * دون اتصال حتى الإقلاع التالي. يجلبها العامل بنفسه هنا، وبذاكرة HTTP لا
 * `reload`: الملفات نُزّلت للتو بترويسات طويلة الأمد فلا تُلمَس الشبكة.
 */
async function warmAppShell(urls) {
    const cache = await caches.open(CACHE_NAME);
    let warmed = 0;
    await Promise.all(
        urls.map(async (raw) => {
            let request;
            try {
                request = new Request(new URL(raw, self.location.origin).toString(), {
                    credentials: 'same-origin',
                });
            } catch {
                return;
            }
            if (!shouldCacheRequest(request)) return;
            if (await cache.match(request)) return;
            try {
                const response = await fetch(request);
                if (response.ok && response.status === 200) {
                    await cache.put(request, response);
                    warmed += 1;
                }
            } catch {
                /* الوضع دون اتصال ليس فشلاً هنا */
            }
        }),
    );
    return warmed;
}

self.addEventListener('message', (event) => {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    if (data.type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }

    if (data.type === 'WARM_APP_SHELL') {
        const port = event.ports && event.ports[0];
        const urls = Array.isArray(data.urls) ? data.urls : [];
        event.waitUntil(
            warmAppShell(urls)
                .then((warmed) => port?.postMessage({ ok: true, warmed }))
                .catch(() => port?.postMessage({ ok: false, warmed: 0 })),
        );
    }
});
