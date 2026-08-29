/**
 * يعترض fetch() العالمي ويوقّع تلقائياً كل طلب same-origin /api/* عبر SecureAPIClient.
 * SecureAPIClient ديناميكي — استيراده الثابت كان يسحب vendor-supabase إلى lawyer-home-paint
 * عبر apply → localOnlyNetworkIsolation → هذا الحارس.
 *
 * XMLHttpRequest و sendBeacon و EventSource لا يمرّون بـ fetch: بدون هذا الغلاف يُرسل طلب
 * unsigned إلى /api المحمي. الخادم يرفضه (requireWifeUser)، والحارس يغلق المسار
 * على العميل أيضاً.
 */
import { isNetworkUrlAllowed, LocalOnlyNetworkError } from '@/app/services/settings/localOnlyGuard';
import { isWifeGuardNativeApiPath } from '@/app/security/wifePublicApi';
import {
    captureWifeNativeFetch,
    peekWifeNativeFetch,
    resetWifeNativeFetchForTests,
    setWifeNativeFetchForTests,
} from '@/app/security/wifeNativeFetch';
import {
    resetWifeLocalDebugEventStateForTests,
    shouldShortCircuitLocalDebugEvent,
} from '@/app/security/wifeFetchGuardLocalDebug';

export { setWifeNativeFetchForTests };

let wifeFetchGuardInstalled = false;
let nativeXhrOpen: typeof XMLHttpRequest.prototype.open | null = null;
let nativeXhrSetHeader: typeof XMLHttpRequest.prototype.setRequestHeader | null = null;
let nativeXhrSend: typeof XMLHttpRequest.prototype.send | null = null;
let nativeSendBeacon: typeof Navigator.prototype.sendBeacon | null = null;
let nativeEventSource: typeof EventSource | null = null;

const xhrTargetUrl = new WeakMap<XMLHttpRequest, string>();
const xhrHasWifeSignature = new WeakMap<XMLHttpRequest, boolean>();

const UNSIGNED_PROTECTED_XHR_ERROR = 'WIFE: unsigned XHR to a protected /api route is blocked';
const UNSIGNED_PROTECTED_EVENT_SOURCE_ERROR =
    'WIFE: unsigned EventSource to a protected /api route is blocked';

function fetchSecureResponse(url: string, options: RequestInit): Promise<Response> {
    return import('@/app/services/SecureAPIClient').then((m) =>
        m.SecureAPIClient.fetchSecureResponse(url, options),
    );
}

function resolveFetchCall(
    input: RequestInfo | URL,
    init?: RequestInit,
): { url: string; options: RequestInit } {
    if (input instanceof Request) {
        const headers = new Headers(input.headers);
        if (init?.headers) {
            new Headers(init.headers).forEach((value, key) => headers.set(key, value));
        }
        return {
            url: input.url,
            options: {
                method: init?.method ?? input.method,
                headers,
                body: init?.body ?? input.body,
                signal: init?.signal ?? input.signal,
                credentials: init?.credentials ?? input.credentials,
                cache: init?.cache ?? input.cache,
                redirect: init?.redirect ?? input.redirect,
                referrer: init?.referrer ?? input.referrer,
                referrerPolicy: init?.referrerPolicy ?? input.referrerPolicy,
                integrity: init?.integrity ?? input.integrity,
                keepalive: init?.keepalive ?? input.keepalive,
                mode: init?.mode ?? input.mode,
            },
        };
    }

    const url = typeof input === 'string' ? input : input.toString();
    return { url, options: init ?? {} };
}

function hasWifeSignature(headers: HeadersInit | undefined): boolean {
    if (!headers) return false;
    const normalized = new Headers(headers);
    return Boolean(normalized.get('x-wife-signature') ?? normalized.get('X-WIFE-Signature'));
}

function resolveUrl(rawUrl: string): URL | null {
    const base =
        typeof window !== 'undefined' && typeof window.location?.origin === 'string'
            ? window.location.origin
            : 'http://localhost';
    try {
        return new URL(rawUrl, base);
    } catch {
        return null;
    }
}

export function isWifeProtectedApiUrl(rawUrl: string): boolean {
    if (typeof window === 'undefined') return false;
    const resolved = resolveUrl(rawUrl);
    if (!resolved) return false;
    if (resolved.origin !== window.location.origin) return false;
    if (!resolved.pathname.startsWith('/api/')) return false;
    return !isWifeGuardNativeApiPath(resolved.pathname);
}

function installWifeXhrAndBeaconGuard(): void {
    if (typeof XMLHttpRequest !== 'undefined' && !nativeXhrOpen) {
        nativeXhrOpen = XMLHttpRequest.prototype.open;
        nativeXhrSetHeader = XMLHttpRequest.prototype.setRequestHeader;
        nativeXhrSend = XMLHttpRequest.prototype.send;

        XMLHttpRequest.prototype.open = function (
            this: XMLHttpRequest,
            method: string,
            url: string | URL,
            async?: boolean,
            username?: string | null,
            password?: string | null,
        ) {
            xhrTargetUrl.set(this, String(url));
            xhrHasWifeSignature.set(this, false);
            return nativeXhrOpen!.call(this, method, url, async !== false, username, password);
        } as typeof XMLHttpRequest.prototype.open;

        XMLHttpRequest.prototype.setRequestHeader = function (
            this: XMLHttpRequest,
            name: string,
            value: string,
        ) {
            if (name.toLowerCase() === 'x-wife-signature' && value.trim()) {
                xhrHasWifeSignature.set(this, true);
            }
            return nativeXhrSetHeader!.call(this, name, value);
        };

        XMLHttpRequest.prototype.send = function (
            this: XMLHttpRequest,
            body?: Document | XMLHttpRequestBodyInit | null,
        ) {
            const target = xhrTargetUrl.get(this) ?? '';
            if (isWifeProtectedApiUrl(target) && !xhrHasWifeSignature.get(this)) {
                this.abort();
                throw new Error(UNSIGNED_PROTECTED_XHR_ERROR);
            }
            return nativeXhrSend!.call(this, body);
        };
    }

    if (typeof navigator !== 'undefined' && !nativeSendBeacon) {
        const existingBeacon =
            typeof navigator.sendBeacon === 'function'
                ? navigator.sendBeacon.bind(navigator)
                : null;
        nativeSendBeacon = existingBeacon ?? ((_url: string | URL, _data?: BodyInit | null) => false);
        navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
            if (isWifeProtectedApiUrl(String(url))) return false;
            return existingBeacon ? existingBeacon(url, data) : false;
        };
    }

    if (typeof EventSource !== 'undefined' && typeof window !== 'undefined' && !nativeEventSource) {
        const Native = EventSource;
        nativeEventSource = Native;
        const WifeGuardedEventSource = function WifeGuardedEventSource(
            this: EventSource,
            url: string | URL,
            eventSourceInitDict?: EventSourceInit,
        ) {
            if (isWifeProtectedApiUrl(String(url))) {
                throw new Error(UNSIGNED_PROTECTED_EVENT_SOURCE_ERROR);
            }
            return new Native(url, eventSourceInitDict);
        } as unknown as typeof EventSource;
        WifeGuardedEventSource.prototype = Native.prototype;
        Object.setPrototypeOf(WifeGuardedEventSource, Native);
        window.EventSource = WifeGuardedEventSource;
    }
}

function resetWifeXhrAndBeaconGuard(): void {
    if (nativeXhrOpen) {
        XMLHttpRequest.prototype.open = nativeXhrOpen;
        nativeXhrOpen = null;
    }
    if (nativeXhrSetHeader) {
        XMLHttpRequest.prototype.setRequestHeader = nativeXhrSetHeader;
        nativeXhrSetHeader = null;
    }
    if (nativeXhrSend) {
        XMLHttpRequest.prototype.send = nativeXhrSend;
        nativeXhrSend = null;
    }
    if (nativeSendBeacon && typeof navigator !== 'undefined') {
        navigator.sendBeacon = nativeSendBeacon;
        nativeSendBeacon = null;
    }
    if (nativeEventSource && typeof window !== 'undefined') {
        window.EventSource = nativeEventSource;
        nativeEventSource = null;
    }
}

export function installWifeFetchGuard(): void {
    if (typeof window === 'undefined') return;
    if (wifeFetchGuardInstalled) return;

    const nativeFetch = captureWifeNativeFetch();
    installWifeXhrAndBeaconGuard();

    globalThis.fetch = async (input, init) => {
        const { url, options } = resolveFetchCall(input, init);
        if (shouldShortCircuitLocalDebugEvent(url)) {
            return new Response(null, { status: 204, statusText: 'Local debug endpoint disabled' });
        }
        if (!isNetworkUrlAllowed(url)) {
            return Promise.reject(new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط'));
        }
        if (!isWifeProtectedApiUrl(url) || hasWifeSignature(options.headers)) {
            return nativeFetch(input as RequestInfo, init);
        }
        return fetchSecureResponse(url, options);
    };

    wifeFetchGuardInstalled = true;
    try {
        document.documentElement.dataset.hamiWifeFetch = '1';
    } catch {
        /* ignore */
    }
}

export function resetWifeFetchGuardForTests(): void {
    if (typeof window === 'undefined') return;
    const native = peekWifeNativeFetch();
    if (native) globalThis.fetch = native;
    resetWifeNativeFetchForTests();
    wifeFetchGuardInstalled = false;
    resetWifeXhrAndBeaconGuard();
    resetWifeLocalDebugEventStateForTests();
    try {
        delete document.documentElement.dataset.hamiWifeFetch;
    } catch {
        /* ignore */
    }
}
