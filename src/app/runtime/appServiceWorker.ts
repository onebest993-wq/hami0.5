let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const APP_SHELL_CACHE_NAME = 'legal-system-v1.1.0';
const SW_WARM_READY_ATTR = 'data-hami-sw-warm-ready';

function canRegisterServiceWorker(): boolean {
    return (
        import.meta.env.PROD &&
        typeof window !== 'undefined' &&
        typeof navigator !== 'undefined' &&
        'serviceWorker' in navigator
    );
}

async function waitForServiceWorkerControl(timeoutMs = 8_000): Promise<void> {
    if (!('serviceWorker' in navigator) || navigator.serviceWorker.controller) return;

    await new Promise<void>((resolve) => {
        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            navigator.serviceWorker.removeEventListener('controllerchange', finish);
            window.clearTimeout(timeoutId);
            resolve();
        };
        const timeoutId = window.setTimeout(finish, timeoutMs);
        navigator.serviceWorker.addEventListener('controllerchange', finish, { once: true });
    });
}

function sameOriginPathFromUrl(rawUrl: string): string | null {
    try {
        const url = new URL(rawUrl, window.location.origin);
        if (url.origin !== window.location.origin) return null;
        return `${url.pathname}${url.search}`;
    } catch {
        return null;
    }
}

async function warmControlledAppShellAssets(): Promise<void> {
    const urls = new Set<string>(['/', '/index.html', '/manifest.json', '/favicon.svg']);
    const cache = 'caches' in window ? await caches.open(APP_SHELL_CACHE_NAME).catch(() => null) : null;

    for (const node of Array.from(
        document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
            'script[src],link[rel="modulepreload"][href],link[rel="stylesheet"][href]',
        ),
    )) {
        const rawUrl = node instanceof HTMLScriptElement ? node.src : node.href;
        const next = sameOriginPathFromUrl(rawUrl);
        if (next) urls.add(next);
    }

    const mainModuleScript = document.querySelector<HTMLScriptElement>('script[type="module"][src]');
    const mainModulePath = mainModuleScript?.src ? sameOriginPathFromUrl(mainModuleScript.src) : null;
    if (mainModulePath) urls.add(mainModulePath);

    for (const entry of performance.getEntriesByType('resource')) {
        const next = sameOriginPathFromUrl(entry.name);
        if (next) urls.add(next);
    }

    await Promise.all(
        Array.from(urls).map(async (url) => {
            try {
                const response = await fetch(url, {
                    credentials: 'same-origin',
                    cache: 'reload',
                });
                if (response.ok && cache) {
                    await cache.put(url, response.clone());
                }
            } catch {
                /* ignore */
            }
        }),
    );

    if (cache && mainModulePath) {
        const cachedMain = await cache.match(mainModulePath);
        if (cachedMain) {
            document.documentElement.setAttribute(SW_WARM_READY_ATTR, '1');
            return;
        }
        document.documentElement.setAttribute(SW_WARM_READY_ATTR, '0');
        return;
    }

    document.documentElement.setAttribute(SW_WARM_READY_ATTR, '1');
}

export function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!canRegisterServiceWorker()) return Promise.resolve(null);
    if (registerPromise) return registerPromise;

    registerPromise = navigator.serviceWorker
        .register('/sw.js', { scope: '/', updateViaCache: 'none' })
        .then((registration) => {
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }

            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });

            void navigator.serviceWorker.ready
                .then(() => waitForServiceWorkerControl())
                .then(() => warmControlledAppShellAssets())
                .catch(() => undefined);

            return registration;
        })
        .catch(() => null);

    return registerPromise;
}
