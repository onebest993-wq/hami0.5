/**
 * HttpOnly CSRF Set-Cookie builders — single source for API routes.
 */
import { CSRF_COOKIE_NAME } from '@/app/security/csrfConstants';

export { CSRF_COOKIE_NAME };

export function isSecureRequest(request: Request): boolean {
  return (
    request.url.startsWith('https://') ||
    (request.headers.get('x-forwarded-proto') ?? '').toLowerCase() === 'https'
  );
}

export function buildCsrfSetCookie(token: string, secure: boolean): string {
  const flags = [`${CSRF_COOKIE_NAME}=${encodeURIComponent(token)}`, 'Path=/', 'SameSite=Strict', 'Max-Age=86400'];
  if (secure) flags.push('Secure');
  flags.push('HttpOnly');
  return flags.join('; ');
}

export function buildCsrfClearCookie(secure: boolean): string {
  const flags = [`${CSRF_COOKIE_NAME}=`, 'Path=/', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) flags.push('Secure');
  flags.push('HttpOnly');
  return flags.join('; ');
}
