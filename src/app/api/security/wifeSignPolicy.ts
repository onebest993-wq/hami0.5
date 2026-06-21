/**
 * Policy for /api/security/wife-sign — allowlist only same-origin /api/* (no bootstrap oracle abuse).
 */

const BLOCKED_WIFE_SIGN_PATHS = new Set<string>([
  '/api/security/wife-sign',
  '/api/auth/login',
  '/api/auth/logout',
  '/api/auth/refresh',
  '/api/auth/session',
]);

/** @returns canonical pathname if allowed; null if rejected */
export function resolveAllowedWifeSignTarget(request: Request, targetUrl: string): string | null {
  const trimmed = targetUrl.trim();
  if (!trimmed) return null;

  const requestOrigin = new URL(request.url).origin;
  let resolved: URL;
  try {
    resolved = new URL(trimmed, requestOrigin);
  } catch {
    return null;
  }

  if (resolved.origin !== requestOrigin) return null;

  const pathname = resolved.pathname;
  if (!pathname.startsWith('/api/')) return null;
  if (BLOCKED_WIFE_SIGN_PATHS.has(pathname)) return null;

  const query = resolved.searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isBlockedWifeSignPath(pathname: string): boolean {
  return BLOCKED_WIFE_SIGN_PATHS.has(pathname);
}
