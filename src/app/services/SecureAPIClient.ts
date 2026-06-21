import { RequestSigningService } from './RequestSigningService';
import { supabase } from '@/app/lib/supabase-client';
import { readCsrfTokenFromDocument } from '@/app/security/csrfSession';
import { getOrCreateDeviceId } from '@/app/security/deviceId';
import { fetchKvProxyGuarded, isKvProxyUrl } from './kvProxyGuard';
import { assertNetworkAllowed } from '@/app/services/settings/localOnlyGuard';
import {
    readDevMockAccessToken,
} from '@/app/utils/authStorage';
import { isBffAuthEnabled, fetchBffWifeSignedHeaders } from '@/app/utils/bffAuthClient';

type NativeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const WIFE_NATIVE_FETCH = Symbol.for('WIFE_NATIVE_FETCH');
const WHITELISTED_ROUTES = ['/api/public'] as const;

let authPauseUntil = 0;
const AUTH_PAUSE_MS = 30_000;

function markAuthFailure(): void {
    authPauseUntil = Date.now() + AUTH_PAUSE_MS;
}

function clearAuthPause(): void {
    authPauseUntil = 0;
}

function isAuthPaused(): boolean {
    return Date.now() < authPauseUntil;
}

function getNativeFetch(): NativeFetch {
    const g = globalThis as unknown as Record<string | symbol, unknown>;
    const existing = g[WIFE_NATIVE_FETCH];
    if (typeof existing === 'function') return existing as NativeFetch;
    const f = globalThis.fetch.bind(globalThis) as NativeFetch;
    g[WIFE_NATIVE_FETCH] = f;
    return f;
}

function normalizeMethod(method: string | undefined): string {
    return (method ?? 'GET').toUpperCase();
}

function mergeHeaders(a: HeadersInit | undefined, b: HeadersInit): HeadersInit {
    if (!a) return b;
    const out = new Headers(a);
    const add = new Headers(b);
    add.forEach((v, k) => out.set(k, v));
    return out;
}

function resolveUrl(url: string): URL {
    const base =
        typeof window !== 'undefined' && window.location?.origin
            ? window.location.origin
            : 'http://localhost';
    return new URL(url, base);
}

function isWhitelistedRoute(pathname: string): boolean {
    return WHITELISTED_ROUTES.some((route) => pathname.startsWith(route));
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
}

function isSameOriginApiRoute(resolved: URL): boolean {
    if (typeof window === 'undefined') return false;
    return resolved.origin === window.location.origin && isApiRoute(resolved.pathname);
}

/**
 * يُعيد access token الحالي للمستخدم من جلسة Supabase.
 * يُستخدم لتوقيع طلبات API الداخلية + استدعاءات Edge Functions المحمية.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
    const { data } = await supabase.auth.getSession();
    let token = data.session?.access_token?.trim() ?? '';
    if (!token) {
        token = readDevMockAccessToken() ?? '';
    }
    return token || null;
}

function formDataToStableString(body: FormData): string {
    const rows: Array<{ key: string; value: string }> = [];
    body.forEach((value, key) => {
        if (typeof value === 'string') {
            rows.push({ key, value });
            return;
        }
        rows.push({
            key,
            value: `[File:${value.name}:${value.size}:${value.type}]`,
        });
    });
    rows.sort((a, b) => (a.key === b.key ? a.value.localeCompare(b.value) : a.key.localeCompare(b.key)));
    return JSON.stringify(rows);
}

async function bodyToSign(body: BodyInit | null | undefined): Promise<string> {
    if (typeof body === 'string') return body;
    if (body === null || body === undefined) return '';
    if (body instanceof URLSearchParams) return body.toString();
    if (body instanceof FormData) return formDataToStableString(body);
    if (body instanceof Blob) return await body.text();
    if (body instanceof ArrayBuffer) return new TextDecoder().decode(body);
    if (ArrayBuffer.isView(body)) {
        return new TextDecoder().decode(body);
    }
    return '';
}

function bytesToHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
}

function pickFormDataFile(body: FormData): File | null {
    const direct = body.get('file');
    if (direct instanceof File) return direct;
    for (const value of body.values()) {
        if (value instanceof File) return value;
    }
    return null;
}

async function sha256HexFromFile(file: File): Promise<string> {
    const data = await file.arrayBuffer();
    const digest = await crypto.subtle.digest('SHA-256', data);
    return bytesToHex(new Uint8Array(digest));
}

async function sha256HexFromString(input: string): Promise<string> {
    const bytes = new TextEncoder().encode(input);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return bytesToHex(new Uint8Array(digest));
}

function tryParseJson(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

export class SecureFetchError extends Error {
    public readonly status: number;
    public readonly bodyText: string;
    public readonly url: string;
    constructor(message: string, status: number, bodyText: string, url: string) {
        super(message);
        this.name = 'SecureFetchError';
        this.status = status;
        this.bodyText = bodyText;
        this.url = url;
    }
}

function resolveFetchTimeoutMs(body: BodyInit | null | undefined): number {
    if (body instanceof FormData) return 120_000;
    if (body instanceof Blob && body.size > 512_000) return 120_000;
    return 12_000;
}

export class SecureAPIClient {
    static async fetchSecureResponse(
        endpoint: string,
        options: RequestInit = {},
        _legacyContext?: unknown,
    ): Promise<Response> {
        void _legacyContext;
        assertNetworkAllowed(endpoint);
        const nativeFetch = getNativeFetch();
        const resolved = resolveUrl(endpoint);
        const pathname = resolved.pathname;

        // Rate limiting و Honeypot Detection: تُدار Server-side فقط عبر wifeValidator
        // الـ Frontend لا يعتمد عليهما كطبقة أمنية

        const method = normalizeMethod(options.method);
        const wireBody = options.body;
        const shouldSign = isSameOriginApiRoute(resolved);
        let nextHeaders: HeadersInit = mergeHeaders(options.headers, { Accept: 'application/json' });

        if (shouldSign) {
            const token = await getCurrentAccessToken();
            const bffMode = isBffAuthEnabled();
            const hasClientToken = Boolean(token?.trim()) && !isAuthPaused();

            if (!bffMode && !hasClientToken) {
                throw new SecureFetchError('unauthenticated', 401, '', resolved.toString());
            }
            if (bffMode && !hasClientToken && isAuthPaused()) {
                throw new SecureFetchError('unauthenticated', 401, '', resolved.toString());
            }

            let contentHash: string | undefined;
            let signingPayload: string;
            if (wireBody instanceof FormData) {
                const file = pickFormDataFile(wireBody);
                if (file) {
                    contentHash = await sha256HexFromFile(file);
                    signingPayload = contentHash;
                } else {
                    const stable = await bodyToSign(wireBody);
                    contentHash = await sha256HexFromString(stable);
                    signingPayload = contentHash;
                }
            } else {
                signingPayload = await bodyToSign(wireBody);
            }

            let signedHeaders: Record<string, string>;
            if (bffMode && !hasClientToken) {
                signedHeaders = await fetchBffWifeSignedHeaders({
                    method,
                    url: resolved.toString(),
                    body: signingPayload,
                    contentHash,
                });
            } else {
                signedHeaders = await RequestSigningService.createSignedHeaders(
                    method,
                    resolved.toString(),
                    signingPayload,
                    token!,
                    contentHash,
                );
            }

            const merged = new Headers(nextHeaders);
            if (hasClientToken && !merged.has('Authorization') && !merged.has('authorization')) {
                merged.set('Authorization', `Bearer ${token}`);
            }
            Object.entries(signedHeaders).forEach(([k, v]) => merged.set(k, v));
            merged.set('x-wife-device-id', getOrCreateDeviceId());
            nextHeaders = merged;
        }

        if (shouldSign || !isWhitelistedRoute(pathname)) {
            const merged = new Headers(nextHeaders);
            const csrfValue = readCsrfTokenFromDocument();
            if (csrfValue && !merged.has('x-csrf-token') && !merged.has('X-CSRF-Token')) {
                merged.set('x-csrf-token', csrfValue);
            }
            nextHeaders = merged;
        }

        const nextOptions: RequestInit = {
            ...options,
            body: wireBody,
            headers: nextHeaders,
            credentials: shouldSign ? 'include' : options.credentials,
        };

        const FETCH_TIMEOUT_MS = resolveFetchTimeoutMs(wireBody);
        if (typeof window === 'undefined') {
            return await nativeFetch(endpoint, nextOptions);
        }

        const controller = new AbortController();
        let didTimeout = false;
        const timeoutId = window.setTimeout(() => {
            didTimeout = true;
            controller.abort();
        }, FETCH_TIMEOUT_MS);
        const upstreamSignal = options.signal;
        if (upstreamSignal) {
            if (upstreamSignal.aborted) controller.abort();
            else upstreamSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        try {
            const fetchInit = { ...nextOptions, signal: controller.signal };
            if (isKvProxyUrl(endpoint)) {
                return await fetchKvProxyGuarded(endpoint, fetchInit, nativeFetch);
            }
            return await nativeFetch(endpoint, fetchInit);
        } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
                if (!didTimeout) {
                    const aborted = new Error('تم إلغاء الطلب');
                    aborted.name = 'AbortError';
                    (aborted as { cause?: unknown }).cause = err;
                    throw aborted;
                }
                throw new Error('انتهت مهلة الاتصال بالخادم. حاول مرة أخرى.');
            }
            throw err;
        } finally {
            window.clearTimeout(timeoutId);
        }
    }

    static async fetchSecure<T = unknown>(
        endpoint: string,
        options: RequestInit = {},
        _legacyContext?: unknown,
    ): Promise<T> {
        const resolved = resolveUrl(endpoint);
        const response = await this.fetchSecureResponse(endpoint, options, _legacyContext);
        const text = await response.text().catch(() => '');

        if (!response.ok) {
            if (response.status === 401) {
                markAuthFailure();
            }
            if (response.status === 429) {
                throw new SecureFetchError('تم تجاوز حد الطلبات. انتظر قليلاً ثم أعد المحاولة.', 429, text, resolved.toString());
            }
            throw new SecureFetchError(`HTTP ${response.status}`, response.status, text, resolved.toString());
        }

        clearAuthPause();
        return tryParseJson(text) as T;
    }
}
