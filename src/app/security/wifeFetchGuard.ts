/**
 * يعترض fetch() العالمي ويوقّع تلقائياً كل طلب same-origin /api/* عبر SecureAPIClient.
 */
import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import { isNetworkUrlAllowed, LocalOnlyNetworkError } from '@/app/services/settings/localOnlyGuard';

const WIFE_FETCH_GUARD_INSTALLED = Symbol.for('WIFE_FETCH_GUARD_INSTALLED');
const WIFE_NATIVE_FETCH = Symbol.for('WIFE_NATIVE_FETCH');
const WHITELISTED_PREFIXES = ['/api/public'] as const;
const LOCAL_DEBUG_EVENT_STORAGE_KEY = 'hami:enable-local-debug-events';
const LOCAL_DEBUG_EVENT_HOSTS = new Set(['127.0.0.1:7777', '127.0.0.1:7778']);

function resolveNativeFetch(): typeof fetch {
  const g = globalThis as unknown as Record<string | symbol, unknown>;
  const existing = g[WIFE_NATIVE_FETCH];
  if (typeof existing === 'function') return existing as typeof fetch;
  const native = globalThis.fetch.bind(globalThis);
  g[WIFE_NATIVE_FETCH] = native;
  return native;
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

function isLocalDebugEventUrl(rawUrl: string): boolean {
  const resolved = resolveUrl(rawUrl);
  if (!resolved) return false;
  return resolved.pathname === '/event' && LOCAL_DEBUG_EVENT_HOSTS.has(resolved.host);
}

function isLocalDebugEventNetworkEnabled(): boolean {
  const globalFlag = (
    globalThis as typeof globalThis & { __HAMI_ENABLE_LOCAL_DEBUG_EVENTS__?: unknown }
  ).__HAMI_ENABLE_LOCAL_DEBUG_EVENTS__;
  if (globalFlag === true) return true;

  if (typeof window === 'undefined') return false;
  try {
    const stored = window.localStorage.getItem(LOCAL_DEBUG_EVENT_STORAGE_KEY)?.trim().toLowerCase();
    return stored === '1' || stored === 'true' || stored === 'on';
  } catch {
    return false;
  }
}

export function isWifeProtectedApiUrl(rawUrl: string): boolean {
  if (typeof window === 'undefined') return false;
  const resolved = resolveUrl(rawUrl);
  if (!resolved) return false;
  if (resolved.origin !== window.location.origin) return false;
  if (!resolved.pathname.startsWith('/api/')) return false;
  return !WHITELISTED_PREFIXES.some((prefix) => resolved.pathname.startsWith(prefix));
}

export function installWifeFetchGuard(): void {
  if (typeof window === 'undefined') return;
  const g = globalThis as unknown as Record<symbol, unknown>;
  if (g[WIFE_FETCH_GUARD_INSTALLED]) return;

  const nativeFetch = resolveNativeFetch();

  globalThis.fetch = async (input, init) => {
    const { url, options } = resolveFetchCall(input, init);
    if (isLocalDebugEventUrl(url) && !isLocalDebugEventNetworkEnabled()) {
      return new Response(null, { status: 204, statusText: 'Local debug endpoint disabled' });
    }
    if (!isNetworkUrlAllowed(url)) {
      return Promise.reject(new LocalOnlyNetworkError('قطع الاتصال مفعّل — العمل محلياً فقط'));
    }
    if (!isWifeProtectedApiUrl(url) || hasWifeSignature(options.headers)) {
      return nativeFetch(input as RequestInfo, init);
    }
    return SecureAPIClient.fetchSecureResponse(url, options);
  };

  g[WIFE_FETCH_GUARD_INSTALLED] = true;
}

export function resetWifeFetchGuardForTests(): void {
  if (typeof window === 'undefined') return;
  const g = globalThis as unknown as Record<symbol, unknown>;
  const native = g[WIFE_NATIVE_FETCH];
  if (typeof native === 'function') {
    globalThis.fetch = native as typeof fetch;
  }
  try {
    window.localStorage.removeItem(LOCAL_DEBUG_EVENT_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  delete (globalThis as typeof globalThis & { __HAMI_ENABLE_LOCAL_DEBUG_EVENTS__?: unknown })
    .__HAMI_ENABLE_LOCAL_DEBUG_EVENTS__;
  delete g[WIFE_FETCH_GUARD_INSTALLED];
}
