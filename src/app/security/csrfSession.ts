/**
 * CSRF session token — random double-submit (header + cookie).
 * لا يُشتق من JWT؛ SameSite cookie + header matching يمنع CSRF cross-origin.
 */

export const CSRF_COOKIE_NAME = 'hami_csrf_token';
export const CSRF_META_NAME = 'x-csrf-token';
export const CSRF_STORAGE_KEY = 'hami_csrf_session_v2';

const CSRF_TOKEN_RE = /^[A-Za-z0-9\-_]{16,128}$/;

function generateCsrfToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const binary = Array.from(bytes, (b) => String.fromCharCode(b)).join('');
  const base64 = btoa(binary);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function getOrCreateCsrfSessionToken(): string {
  if (typeof window === 'undefined') return '';
  try {
    const existing = sessionStorage.getItem(CSRF_STORAGE_KEY)?.trim();
    if (existing && CSRF_TOKEN_RE.test(existing)) return existing;
    const created = generateCsrfToken();
    sessionStorage.setItem(CSRF_STORAGE_KEY, created);
    return created;
  } catch {
    return generateCsrfToken();
  }
}

export function setCsrfSessionTokenFromServer(token: string): void {
  if (typeof window === 'undefined' || !token || !CSRF_TOKEN_RE.test(token)) return;
  try {
    sessionStorage.setItem(CSRF_STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
  applyCsrfTokenToDocument(token);
}

export function clearCsrfSessionToken(): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  try {
    const meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`);
    meta?.removeAttribute('content');
  } catch {
    /* ignore */
  }
}

export function applyCsrfTokenToDocument(token: string): void {
  if (typeof document === 'undefined' || !token) return;

  let meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`);
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', CSRF_META_NAME);
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', token);

  const secure = window.location.protocol === 'https:' ? '; secure' : '';
  document.cookie = `${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}; path=/; samesite=strict${secure}; max-age=${60 * 60 * 24}`;
}

export function readCsrfTokenFromDocument(): string | null {
  if (typeof document === 'undefined') return null;
  const meta = document.querySelector(`meta[name="${CSRF_META_NAME}"]`);
  const fromMeta = meta?.getAttribute('content')?.trim();
  if (fromMeta && CSRF_TOKEN_RE.test(fromMeta)) return fromMeta;
  return getOrCreateCsrfSessionToken();
}
