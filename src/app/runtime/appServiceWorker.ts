import { isCapacitorNativePlatform } from '@/app/runtime/nativePlatform';

let registerPromise: Promise<ServiceWorkerRegistration | null> | null = null;
const SW_WARM_READY_ATTR = 'data-hami-sw-warm-ready';
const WARM_REPLY_TIMEOUT_MS = 10_000;

function isEmbeddedFrame(): boolean {
    try {
        return window.self !== window.top;
    } catch {
        return true;
    }
}

function canRegisterServiceWorker(): boolean {
    if (!import.meta.env.PROD) return false;
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    if (!('serviceWorker' in navigator)) return false;
    if (isEmbeddedFrame()) return false;
    /*
     * الغلاف الأصلي يقدّم الأصول من الحزمة عبر خادمه المحلي: لا شبكة تُوفَّر ولا
     * وضع دون اتصال يُكتسب. ما يبقى هو نسخة ثانية من القشرة تشغل مساحة الجهاز،
     * وطبقة قد تُقدّم قشرة الإصدار السابق بعد تحديث التطبيق.
     */
    if (isCapacitorNativePlatform()) return false;
    return true;
}

async function waitForServiceWorkerControl(timeoutMs = 8_000): Promise<boolean> {
    if (navigator.serviceWorker.controller) return true;

    return new Promise<boolean>((resolve) => {
        let settled = false;
        const finish = (controlled: boolean) => {
            if (settled) return;
            settled = true;
            navigator.serviceWorker.removeEventListener('controllerchange', onChange);
            window.clearTimeout(timeoutId);
            resolve(controlled);
        };
        const onChange = () => finish(true);
        const timeoutId = window.setTimeout(() => finish(Boolean(navigator.serviceWorker.controller)), timeoutMs);
        navigator.serviceWorker.addEventListener('controllerchange', onChange, { once: true });
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

function collectAppShellUrls(): string[] {
    const urls = new Set<string>(['/', '/index.html', '/manifest.json', '/favicon.svg']);

    for (const node of Array.from(
        document.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
            'script[src],link[rel="modulepreload"][href],link[rel="stylesheet"][href]',
        ),
    )) {
        const rawUrl = node instanceof HTMLScriptElement ? node.src : node.href;
        const next = sameOriginPathFromUrl(rawUrl);
        if (next) urls.add(next);
    }

    for (const entry of performance.getEntriesByType('resource')) {
        const next = sameOriginPathFromUrl(entry.name);
        if (next) urls.add(next);
    }

    return Array.from(urls);
}

/**
 * يُسلّم قائمة القشرة إلى العامل ليملأ ذاكرته بنفسه.
 *
 * كانت الصفحة تُعيد جلب كل أصل بـ`cache: 'reload'` عند كل إقلاع — أي تنزيل
 * ثانٍ كامل لحمولة الإقلاع، على بيانات الهاتف وبطاريته، بلا مقابل. العامل
 * يتخطى ما لديه أصلاً ويقرأ الباقي من ذاكرة HTTP.
 */
function requestAppShellWarm(worker: ServiceWorker, urls: string[]): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
        let settled = false;
        const done = (ok: boolean) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timeoutId);
            channel.port1.close();
            resolve(ok);
        };
        const channel = new MessageChannel();
        const timeoutId = window.setTimeout(() => done(false), WARM_REPLY_TIMEOUT_MS);
        channel.port1.onmessage = (event) => done(Boolean(event.data?.ok));
        try {
            worker.postMessage({ type: 'WARM_APP_SHELL', urls }, [channel.port2]);
        } catch {
            done(false);
        }
    });
}

async function warmAppShellOnFirstControl(): Promise<void> {
    const controlled = await waitForServiceWorkerControl();
    const worker = controlled ? navigator.serviceWorker.controller : null;
    if (!worker) {
        document.documentElement.setAttribute(SW_WARM_READY_ATTR, '0');
        return;
    }
    const ok = await requestAppShellWarm(worker, collectAppShellUrls());
    document.documentElement.setAttribute(SW_WARM_READY_ATTR, ok ? '1' : '0');
}

/**
 * إزالة عامل بقي من نسخة ويب سابقة داخل الغلاف الأصلي.
 *
 * الامتناع عن التسجيل لا يُزيل عاملاً مُسجَّلاً: يبقى مسيطراً على المصدر إلى
 * أن يُفكَّ تسجيله. ولو بقي بعد تحديث التطبيق لقدّم قشرة الإصدار السابق من
 * ذاكرته، وهو عطلٌ لا يفسّره شيء ظاهر للمستخدم.
 */
async function unregisterStaleNativeServiceWorker(): Promise<void> {
    try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.unregister()));
        if (!registrations.length || typeof caches === 'undefined') return;
        const names = await caches.keys();
        await Promise.all(names.filter((name) => name.startsWith('legal-system-')).map((name) => caches.delete(name)));
    } catch {
        /* لا شيء يعتمد على نجاح التنظيف */
    }
}

export function registerAppServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    if (!canRegisterServiceWorker()) {
        if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && isCapacitorNativePlatform()) {
            void unregisterStaleNativeServiceWorker();
        }
        return Promise.resolve(null);
    }
    if (registerPromise) return registerPromise;

    /*
     * تُقرأ قبل التسجيل: بعده قد يُطالب عاملٌ منتظِر بالتحكّم فتضيع الإجابة عن
     * «هل كانت هذه الصفحة مُدارة منذ البداية؟» — وعليها وحدها يتوقّف التسخين.
     */
    const wasControlledAtStart = Boolean(navigator.serviceWorker.controller);

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

            /*
             * صفحة مُدارة منذ انطلاقها جاءت أصولها عبر العامل فهي في ذاكرته.
             * التسخين لأول تحميل بعد التثبيت فقط.
             */
            if (wasControlledAtStart) {
                document.documentElement.setAttribute(SW_WARM_READY_ATTR, '1');
            } else {
                void navigator.serviceWorker.ready.then(() => warmAppShellOnFirstControl()).catch(() => undefined);
            }

            return registration;
        })
        .catch(() => null);

    return registerPromise;
}
