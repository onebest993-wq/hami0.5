/**
 * Policy for /api/security/wife-sign — allowlist only same-origin /api/* (no bootstrap oracle abuse).
 */
import { isWifeBootstrapApiPath, isWifeUnsignedApiPath } from '@/app/security/wifePublicApi.ts';

function normalizeWifeSignPath(pathname: string): string {
  const stripped = pathname.trim().split('?')[0] ?? '/';
  if (stripped.length > 1 && stripped.endsWith('/')) return stripped.replace(/\/+$/, '');
  return stripped || '/';
}

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
  if (isWifeUnsignedApiPath(pathname)) return null;
  if (isBlockedWifeSignPath(pathname)) return null;

  const query = resolved.searchParams.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function isBlockedWifeSignPath(pathname: string): boolean {
  const normalized = normalizeWifeSignPath(pathname);
  return isWifeBootstrapApiPath(normalized);
}
