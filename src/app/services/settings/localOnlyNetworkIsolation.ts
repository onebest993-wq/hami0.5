/**
 * قاطع شبكة على مستوى التطبيق عند «قطع الاتصال».
 * لا يغيّر إنترنت نظام التشغيل — يمنع التطبيق من فتح اتصال خارج الجهاز.
 */

import { installWifeFetchGuard } from '@/app/security/wifeFetchGuard';
import {
    assertNetworkAllowed,
    isNetworkUrlAllowed,
    LocalOnlyNetworkError,
} from '@/app/services/settings/localOnlyGuard';
import {
    persistLocalOnlyBootFlag,
    readLocalOnlyBootFlag,
    resetLocalOnlyPersistMemoForTests,
} from '@/app/services/settings/localOnlyUrlPolicy';
import {
    installLocalOnlyEgressPatches,
    resetLocalOnlyEgressPatchesForTests,
    setLocalOnlyEgressArmed,
} from '@/app/services/settings/localOnlyEgressPatches';

let isolationInstalled = false;
let nativeWebSocket: typeof WebSocket | null = null;
let nativeXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
let nativeSendBeacon: typeof navigator.sendBeacon | null = null;
let nativeEventSource: typeof EventSource | null = null;
let nativeCapacitorHttpRequest: ((options: { url?: string }) => Promise<unknown>) | null = null;
let stickyArmed = false;

export function setLocalOnlyNetworkFlag(enabled: boolean): void {
    if (typeof document === 'undefined') return;
    document.documentElement.dataset.hamiLocalOnly = enabled ? '1' : '0';
}

/** يضبط العلم فوراً ثم يركّب القاطع — قبل اكتمال setState */
export function armLocalOnlyNetworkIsolation(enabled: boolean): void {
    if (enabled) {
        persistLocalOnlyBootFlag(true);
        stickyArmed = true;
        setLocalOnlyNetworkFlag(true);
    } else {
        stickyArmed = false;
        persistLocalOnlyBootFlag(false);
        setLocalOnlyNetworkFlag(false);
    }
    installLocalOnlyNetworkIsolation();
    setLocalOnlyEgressArmed(enabled);
}

/**
 * يرفع العلم من الإعدادات المحفوظة. لا يخفضه إذا كان التسليح الصريح أو علم القرص قائماً —
 * حتى لا تُصفَّر الحماية بلقطة إعدادات قديمة.
 */
export function syncLocalOnlyFlagFromSettings(enabled: boolean): void {
    installLocalOnlyNetworkIsolation();
    if (enabled) {
        stickyArmed = true;
        persistLocalOnlyBootFlag(true);
        setLocalOnlyNetworkFlag(true);
        setLocalOnlyEgressArmed(true);
        return;
    }
    if (stickyArmed || readLocalOnlyBootFlag()) return;
    setLocalOnlyNetworkFlag(false);
    setLocalOnlyEgressArmed(false);
}

export function installLocalOnlyNetworkIsolation(): void {
    if (typeof window === 'undefined') return;
    installWifeFetchGuard();
    installLocalOnlyEgressPatches();
    if (isolationInstalled) return;

    patchWebSocket();
    patchXhrOpen();
    patchSendBeacon();
    patchEventSource();
    patchCapacitorHttp();
    if (typeof document !== 'undefined') {
        document.addEventListener('deviceready', () => patchCapacitorHttp(), { once: true });
    }

    isolationInstalled = true;
}

function patchWebSocket(): void {
    if (typeof WebSocket === 'undefined' || nativeWebSocket) return;

    const Native = WebSocket;
    nativeWebSocket = Native;

    class GuardedWebSocket extends Native {
        constructor(url: string | URL, protocols?: string | string[]) {
            assertNetworkAllowed(String(url));
            super(url, protocols);
        }
    }

    window.WebSocket = GuardedWebSocket;
}

function patchXhrOpen(): void {
    if (typeof XMLHttpRequest === 'undefined' || nativeXhrOpen) return;

    nativeXhrOpen = XMLHttpRequest.prototype.open;

    XMLHttpRequest.prototype.open = function (
        this: XMLHttpRequest,
        method: string,
        url: string | URL,
        async?: boolean,
        username?: string | null,
        password?: string | null,
    ) {
        assertNetworkAllowed(String(url));
        return nativeXhrOpen!.call(this, method, url, async ?? true, username, password);
    };
}

function patchSendBeacon(): void {
    if (typeof navigator === 'undefined' || typeof navigator.sendBeacon !== 'function' || nativeSendBeacon) {
        return;
    }

    nativeSendBeacon = navigator.sendBeacon.bind(navigator);

    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
        if (!isNetworkUrlAllowed(String(url))) return false;
        return nativeSendBeacon!(url, data);
    };
}

function patchEventSource(): void {
    if (typeof EventSource === 'undefined' || nativeEventSource) return;

    const Native = EventSource;
    nativeEventSource = Native;

    const Guarded = function GuardedEventSource(
        this: EventSource,
        url: string | URL,
        eventSourceInitDict?: EventSourceInit,
    ) {
        assertNetworkAllowed(String(url));
        return new Native(url, eventSourceInitDict);
    } as unknown as typeof EventSource;

    Guarded.prototype = Native.prototype;
    Object.defineProperties(Guarded, {
        CONNECTING: { value: Native.CONNECTING },
        OPEN: { value: Native.OPEN },
        CLOSED: { value: Native.CLOSED },
    });

    window.EventSource = Guarded;
}

function patchCapacitorHttp(): void {
    if (nativeCapacitorHttpRequest) return;
    const cap = (window as unknown as { Capacitor?: { Plugins?: { Http?: { request?: unknown } } } }).Capacitor;
    const Http = cap?.Plugins?.Http;
    if (!Http || typeof Http.request !== 'function') return;

    const native = Http.request.bind(Http) as (options: { url?: string }) => Promise<unknown>;
    nativeCapacitorHttpRequest = native;
    Http.request = (options: { url?: string }) => {
        assertNetworkAllowed(String(options?.url ?? ''));
        return native(options);
    };
}

export function resetLocalOnlyNetworkIsolationForTests(): void {
    if (typeof window === 'undefined') return;

    if (nativeWebSocket) window.WebSocket = nativeWebSocket;
    if (nativeXhrOpen) XMLHttpRequest.prototype.open = nativeXhrOpen;
    if (nativeSendBeacon && typeof navigator !== 'undefined') {
        navigator.sendBeacon = nativeSendBeacon;
    }
    if (nativeEventSource) window.EventSource = nativeEventSource;

    const cap = (window as unknown as { Capacitor?: { Plugins?: { Http?: { request?: unknown } } } }).Capacitor;
    if (nativeCapacitorHttpRequest && cap?.Plugins?.Http) {
        cap.Plugins.Http.request = nativeCapacitorHttpRequest;
    }

    isolationInstalled = false;
    nativeWebSocket = null;
    nativeXhrOpen = null;
    nativeSendBeacon = null;
    nativeEventSource = null;
    nativeCapacitorHttpRequest = null;
    stickyArmed = false;
    persistLocalOnlyBootFlag(false);
    resetLocalOnlyPersistMemoForTests();
    setLocalOnlyEgressArmed(false);
    resetLocalOnlyEgressPatchesForTests();
    try {
        delete document.documentElement.dataset.hamiLocalOnly;
    } catch {
        /* ignore */
    }
}

export { LocalOnlyNetworkError };
