import { inputSanitizer } from './InputSanitizerService';
import { RequestSigningService } from './RequestSigningService';
import { supabase } from '@/app/lib/supabase-client';
import { fetchKvProxyGuarded, isKvProxyUrl } from './kvProxyGuard';

type NativeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

const WIFE_NATIVE_FETCH = Symbol.for('WIFE_NATIVE_FETCH');
const WHITELISTED_ROUTES = ['/api/public'] as const;

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
    const token = data.session?.access_token?.trim() ?? '';
    return token || null;
}

function isJsonContentType(headers: HeadersInit | undefined): boolean {
    if (!headers) return false;
    const normalized = new Headers(headers);
    const contentType = normalized.get('Content-Type') ?? normalized.get('content-type') ?? '';
    return contentType.toLowerCase().includes('application/json');
}

function sanitizeJsonStringBody(body: string): string {
    try {
        const parsed = JSON.parse(body) as unknown;
        const sanitized = inputSanitizer.sanitizeUnknown(parsed);
        return JSON.stringify(sanitized);
    } catch {
        return inputSanitizer.sanitizePotentialHTML(body);
    }
}

function sanitizeRequestBody(options: RequestInit): BodyInit | null | undefined {
    const body = options.body;
    if (typeof body !== 'string') return body;
    if (!isJsonContentType(options.headers)) return body;
    return sanitizeJsonStringBody(body);
}

async function sanitizeRequestBodyAsync(options: RequestInit): Promise<BodyInit | null | undefined> {
    const body = options.body;
    if (typeof body === 'string') {
        return sanitizeRequestBody(options);
    }

    if (body instanceof Blob) {
        const blobType = body.type.toLowerCase();
        const shouldSanitizeAsJson = isJsonContentType(options.headers) || blobType.includes('application/json');
        if (!shouldSanitizeAsJson) return body;
        const text = await body.text();
        const sanitized = sanitizeJsonStringBody(text);
        return new Blob([sanitized], { type: body.type || 'application/json' });
    }

    return body;
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

function toUrlString(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.toString();
    return input.url;
}

export class SecureAPIClient {
    static async fetchSecureResponse(
        endpoint: string,
        options: RequestInit = {},
        _legacyContext?: unknown,
    ): Promise<Response> {
        void _legacyContext;
        const nativeFetch = getNativeFetch();
        const resolved = resolveUrl(endpoint);
        const pathname = resolved.pathname;

        // Rate limiting و Honeypot Detection: تُدار Server-side فقط عبر wifeValidator
        // الـ Frontend لا يعتمد عليهما كطبقة أمنية

        const method = normalizeMethod(options.method);
        const sanitizedBody = await sanitizeRequestBodyAsync(options);
        const shouldSign = isSameOriginApiRoute(resolved);
        let nextHeaders: HeadersInit = mergeHeaders(options.headers, { Accept: 'application/json' });

        if (shouldSign) {
            const token = await getCurrentAccessToken();
            if (!token) {
                throw new Error('WIFE signing requires an authenticated Supabase session token.');
            }

            let contentHash: string | undefined;
            let signingPayload: string;
            if (sanitizedBody instanceof FormData) {
                const file = pickFormDataFile(sanitizedBody);
                if (file) {
                    contentHash = await sha256HexFromFile(file);
                    signingPayload = contentHash;
                } else {
                    const stable = await bodyToSign(sanitizedBody);
                    contentHash = await sha256HexFromString(stable);
                    signingPayload = contentHash;
                }
            } else {
                signingPayload = await bodyToSign(sanitizedBody);
            }
            const signedHeaders = await RequestSigningService.createSignedHeaders(
                method,
                resolved.toString(),
                signingPayload,
                token,
                contentHash,
            );

            const merged = new Headers(nextHeaders);
            if (!merged.has('Authorization') && !merged.has('authorization')) {
                merged.set('Authorization', `Bearer ${token}`);
            }
            Object.entries(signedHeaders).forEach(([k, v]) => merged.set(k, v));
            nextHeaders = merged;
        }

        if (shouldSign || !isWhitelistedRoute(pathname)) {
            const merged = new Headers(nextHeaders);
            if (typeof document !== 'undefined') {
                const meta = document.querySelector('meta[name="x-csrf-token"]');
                const csrfValue = meta?.getAttribute('content');
                if (csrfValue && !merged.has('x-csrf-token') && !merged.has('X-CSRF-Token')) {
                    merged.set('x-csrf-token', csrfValue);
                }
            }
            nextHeaders = merged;
        }

        const nextOptions: RequestInit = {
            ...options,
            body: sanitizedBody,
            headers: nextHeaders,
        };

        const FETCH_TIMEOUT_MS = 12_000;
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
            throw new SecureFetchError(`HTTP ${response.status}`, response.status, text, resolved.toString());
        }

        return tryParseJson(text) as T;
    }
}
