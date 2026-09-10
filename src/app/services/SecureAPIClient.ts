import { readCsrfTokenFromDocument } from '@/app/security/csrfSession';
import { fetchKvProxyGuarded, isKvProxyUrl } from './kvProxyGuard';
import { assertNetworkAllowed } from '@/app/services/settings/localOnlyGuard';
import { isSameOriginApiBlocked } from '@/app/services/network/sameOriginApiProbe';
import { readClientAccessTokenFallback } from '@/app/services/auth/localSigningToken';
/*
 * الورقتان لا المحور. الاستيراد من `bffAuthClient` كان يُغلق دائرة ثابتة: هذا
 * الملفّ ← المحور ← هذا الملفّ. والدالّتان لا تسكنان المحور أصلاً — إحداهما إعادة
 * تصدير من `bffAuthFlags`، والأخرى نُقلت إلى `bffWifeSign` ولا تحتاج هذا العميل.
 */
import { isBffAuthEnabled } from '@/app/utils/bffAuthFlags';
import { SecureFetchError } from '@/app/services/SecureFetchError';
import { captureWifeNativeFetch } from '@/app/security/wifeNativeFetch';
import { isWifeBootstrapApiPath, isWifeUnsignedApiPath } from '@/app/security/wifePublicApi';
import {
    isNetworkFeatureProtectedPath,
    noteProtectedPathForbidden,
    resolveDeniedNetworkFeatureResponse,
} from './secureApiNetworkFeatures';
import { attachWifeClientHeaders } from './secureApiWifeSigning';

export { SecureFetchError } from '@/app/services/SecureFetchError';

type NativeFetch = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

function isWhitelistedRoute(pathname: string): boolean {
    return isWifeUnsignedApiPath(pathname);
}

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

function shouldRetryHqAuthOnce(pathname: string): boolean {
    /* إعادة 401 لمسارات المقر تضاعف سجل المتصفح — الجلسة تُجهَّز قبل التركيب */
    if (pathname.startsWith('/api/admin/')) return false;
    return (
        pathname.startsWith('/api/auth/lawyer-verification') ||
        pathname.startsWith('/api/forum/stats') ||
        pathname.startsWith('/api/forum/ban') ||
        pathname.startsWith('/api/forum/reports')
    );
}

function shouldMarkAuthFailure(pathname: string): boolean {
    if (isWifeBootstrapApiPath(pathname) || isWifeUnsignedApiPath(pathname)) return false;
    if (pathname === '/api/security/csrf' || pathname === '/api/security/wife-sign') return false;
    /* مقر القيادة يعيد المحاولة بنبضه — إيقاف 30ث كان يُظهر «بلا جلسة» ثم يتصل بعد التأخير */
    if (pathname.startsWith('/api/admin/')) return false;
    return true;
}

/** بعد إقلاع جلسة المقر/الدخول — لا تُحبس الشبكة بسبب 401 سابق */
export function clearSecureApiAuthPause(): void {
    clearAuthPause();
}

/** للاختبارات فقط */
export function resetAuthPauseForTests(): void {
    clearAuthPause();
}

function getNativeFetch(): NativeFetch {
    return captureWifeNativeFetch();
}

function normalizeMethod(method: string | undefined): string {
    return (method ?? 'GET').toUpperCase();
}

async function awaitWithAbort<T>(promise: Promise<T>, signal: AbortSignal | null | undefined): Promise<T> {
    if (!signal) return promise;
    if (signal.aborted) {
        const aborted = new DOMException('Aborted', 'AbortError');
        throw aborted;
    }
    return await new Promise<T>((resolve, reject) => {
        const onAbort = () => {
            reject(new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', onAbort, { once: true });
        promise.then(
            (value) => {
                signal.removeEventListener('abort', onAbort);
                resolve(value);
            },
            (error) => {
                signal.removeEventListener('abort', onAbort);
                reject(error);
            },
        );
    });
}

function mergeHeaders(a: HeadersInit | undefined, b: HeadersInit): HeadersInit {
    if (!a) return b;
    const out = new Headers(a);
    const add = new Headers(b);
    add.forEach((v, k) => out.set(k, v));
    return out;
}

/**
 * أصل الـAPI للبناء الأصلي.
 *
 * في الويب يبقى **فارغاً**، فتُحلّ النداءات على أصل الوثيقة تماماً كما كانت.
 * أمّا داخل WebView الخاص بـCapacitor فأصل الوثيقة `https://localhost`
 * (`capacitor.config.ts` → `androidScheme: 'https'` بلا `server.url`)، وهو خادم
 * محلي يخدّم الأصول المحزومة فحسب. فكل مسار نسبي `/api/*` يقصد خادماً غير موجود
 * ويرتدّ ٤٠٤ — وهذا يشمل **تسعة عشر عائلة مسارات** لا المصادقة وحدها: المنتدى
 * ومشاركة القضايا وطلبات المساعدة ورفع الملفات وkv-proxy وملفات التنفيذ والدعاوى
 * والإشعارات وأحداث الخط الزمني ونقاط العمل والملاحظات العامة…
 *
 * أي أن الحزمة الأصلية اليوم لا تصل إلى أي طرف خلفي إطلاقاً. القيمة الفارغة تُبقي
 * ذلك كما هو؛ وضبطها هو ما يجعل التطبيق الأصلي ممكناً أصلاً.
 *
 * ⚠️ الأصل وحده — أي مسار داخل القيمة إعدادٌ خاطئ يُتجاهل بدل أن يُركَّب على
 * المسارات فينتج عناوين صامتة الخطأ.
 */
function readConfiguredApiOrigin(): string {
    const raw = String(import.meta.env?.VITE_API_ORIGIN ?? '').trim();
    if (!raw) return '';
    try {
        const parsed = new URL(raw);
        if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
        return parsed.origin;
    } catch {
        return '';
    }
}

function documentOrigin(): string {
    return typeof window !== 'undefined' && window.location?.origin
        ? window.location.origin
        : 'http://localhost';
}

function isApiRoute(pathname: string): boolean {
    return pathname.startsWith('/api/');
}

/** هل هذا العنوان مسار API نسبي يخصّنا؟ — وحده يُنسب إلى أصل الـAPI المضبوط */
function isRelativeApiEndpoint(endpoint: string): boolean {
    return endpoint.startsWith('/api/');
}

function resolveUrl(url: string): URL {
    const configured = readConfiguredApiOrigin();
    const base = configured && isRelativeApiEndpoint(url) ? configured : documentOrigin();
    return new URL(url, base);
}

/**
 * هل الوجهة هي **واجهتنا** نحن؟ — يحكم توقيع WIFE وإرسال كوكيز الجلسة معاً.
 *
 * كان اسمها `isSameOriginApiRoute` وكان ذلك دقيقاً ما دامت الواجهة على أصل
 * الوثيقة. مع أصل API مضبوط لم يعد «نفس الأصل» وصفاً صحيحاً، والاسم الذي يصف
 * غير ما يفعل يُضلّل مراجعةً كاملة — وهو ما وقع فعلاً في
 * `originsAreSameSite` (انظر FINDING-009). فالاسم يتبع الدلالة.
 *
 * وحين لا يُضبط أصل API يبقى المنطق حرفياً كما كان: مقارنة بأصل الوثيقة، و`false`
 * إن غاب `window`.
 */
function isOwnApiRoute(resolved: URL): boolean {
    if (!isApiRoute(resolved.pathname)) return false;
    const configured = readConfiguredApiOrigin();
    if (configured) return resolved.origin === configured;
    if (typeof window === 'undefined') return false;
    return resolved.origin === window.location.origin;
}

/**
 * توكن التوقيع: جلسة Supabase الحيّة، ثم المخزَّن محلياً (قبل اكتمال getSession)،
 * ثم جلسة الشِل/الضيف عند فتح الواجهة محلياً. لا يخلط HMAC العميل مع BFF.
 */
export async function getCurrentAccessToken(): Promise<string | null> {
    const { supabase } = await import('@/app/lib/supabase-client');
    const { data } = await supabase.auth.getSession();
    const live = data.session?.access_token?.trim() ?? '';
    if (live) return live;
    return readClientAccessTokenFallback();
}

function tryParseJson(text: string): unknown {
    try {
        return JSON.parse(text) as unknown;
    } catch {
        return text;
    }
}

function resolveFetchTimeoutMs(body: BodyInit | null | undefined): number {
    if (body instanceof FormData) return 120_000;
    if (body instanceof Blob && body.size > 512_000) return 120_000;
    return 12_000;
}

function isCsrfSafeMethod(method: string): boolean {
    return method === 'GET' || method === 'HEAD' || method === 'OPTIONS';
}

async function ensureCsrfBeforeMutatingWifeRequest(
    method: string,
    pathname: string,
    signal: AbortSignal | null | undefined,
): Promise<void> {
    if (isCsrfSafeMethod(method) || pathname === '/api/security/csrf') return;
    const { ensureCsrfSessionReady } = await import('@/app/security/ensureCsrfSessionReady');
    await awaitWithAbort(ensureCsrfSessionReady(), signal);
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

        /*
         * الوجهة الفعلية للطلب. بلا أصل API مضبوط تبقى `endpoint` كما وردت حرفياً
         * — نسبيةً كانت أو مطلقة — فالويب لا يتغيّر. ومع الضبط يُرسَل العنوان
         * المطلق، إذ لا يُحلّ النسبي إلا على أصل الوثيقة.
         */
        const requestTarget =
            readConfiguredApiOrigin() && isRelativeApiEndpoint(endpoint)
                ? resolved.toString()
                : endpoint;

        const method = normalizeMethod(options.method);
        const wireBody = options.body;
        const shouldSign =
            isOwnApiRoute(resolved) &&
            !isWifeUnsignedApiPath(pathname) &&
            !isWifeBootstrapApiPath(pathname);
        if (shouldSign && isAuthPaused()) {
            throw new SecureFetchError('unauthenticated', 401, '', resolved.toString());
        }
        if (shouldSign && isSameOriginApiBlocked()) {
            throw new SecureFetchError('api_unavailable', 503, '', resolved.toString());
        }
        const deniedLocal = shouldSign ? resolveDeniedNetworkFeatureResponse(pathname) : null;
        if (deniedLocal) {
            return deniedLocal;
        }
        let nextHeaders: HeadersInit = mergeHeaders(options.headers, { Accept: 'application/json' });

        const FETCH_TIMEOUT_MS = resolveFetchTimeoutMs(wireBody);
        const useTimeout = typeof window !== 'undefined';
        const controller = useTimeout ? new AbortController() : null;
        let didTimeout = false;
        let timeoutId: number | undefined;
        if (controller) {
            timeoutId = window.setTimeout(() => {
                didTimeout = true;
                controller.abort();
            }, FETCH_TIMEOUT_MS);
            const upstreamSignal = options.signal;
            if (upstreamSignal) {
                if (upstreamSignal.aborted) controller.abort();
                else upstreamSignal.addEventListener('abort', () => controller.abort(), { once: true });
            }
        }

        try {
            if (shouldSign) {
                try {
                    await ensureCsrfBeforeMutatingWifeRequest(method, pathname, controller?.signal);
                    nextHeaders = await attachWifeClientHeaders({
                        resolvedUrl: resolved.toString(),
                        method,
                        wireBody,
                        nextHeaders,
                        token: await awaitWithAbort(getCurrentAccessToken(), controller?.signal),
                        bffMode: isBffAuthEnabled(),
                        authPaused: isAuthPaused(),
                        signal: controller?.signal,
                    });
                } catch (signErr) {
                    if (
                        signErr instanceof SecureFetchError &&
                        signErr.status === 401 &&
                        shouldMarkAuthFailure(pathname)
                    ) {
                        markAuthFailure();
                    }
                    throw signErr;
                }
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
                credentials: isOwnApiRoute(resolved) ? 'include' : options.credentials,
                signal: controller?.signal ?? options.signal,
            };

            if (!controller) {
                return await nativeFetch(requestTarget, nextOptions);
            }

            const fetchInit = { ...nextOptions, signal: controller.signal };
            let response: Response;
            if (isKvProxyUrl(requestTarget)) {
                response = await fetchKvProxyGuarded(requestTarget, fetchInit, nativeFetch);
            } else {
                response = await nativeFetch(requestTarget, fetchInit);
            }
            if (shouldSign && response.status === 403 && isNetworkFeatureProtectedPath(pathname)) {
                const clone = response.clone();
                const bodyText = await clone.text().catch(() => '');
                noteProtectedPathForbidden(pathname, response, bodyText);
            }
            return response;
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
            if (timeoutId !== undefined) window.clearTimeout(timeoutId);
        }
    }

    static async fetchSecure<T = unknown>(
        endpoint: string,
        options: RequestInit = {},
        _legacyContext?: unknown,
    ): Promise<T> {
        const resolved = resolveUrl(endpoint);
        if (isAuthPaused()) {
            throw new SecureFetchError('unauthenticated', 401, '', resolved.toString());
        }
        const pathname = resolved.pathname;
        let response = await this.fetchSecureResponse(endpoint, options, _legacyContext);
        if (!response.ok && response.status === 401 && shouldRetryHqAuthOnce(pathname)) {
            try {
                const { ensureCsrfSessionReady } = await import('@/app/security/ensureCsrfSessionReady');
                await ensureCsrfSessionReady({ force: true });
            } catch {
                /* الجلسة المحلية أفضل جهد */
            }
            response = await this.fetchSecureResponse(endpoint, options, _legacyContext);
        }
        const text = await response.text().catch(() => '');

        if (!response.ok) {
            if (response.status === 401 && shouldMarkAuthFailure(pathname)) {
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
