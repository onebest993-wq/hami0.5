import { parseCookieHeader, readIncomingCookieHeader } from './sessionCookie.ts';
import { wifeTimingSafeEqual } from './wifeTimingSafe.ts';

function parseBearerToken(authorizationHeader: string | null): string | null {
  if (!authorizationHeader) return null;
  const [scheme, token] = authorizationHeader.split(' ');
  if (!scheme || !token) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  const normalized = token.trim();
  return normalized ? normalized : null;
}

/**
 * Best-effort Supabase auth token extraction from cookie storage shapes.
 * Supports:
 * - sb-access-token (explicit token cookie)
 * - sb-*-auth-token (JSON payload used by some Supabase auth helpers)
 */
function extractTokenFromSupabaseCookies(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  const cookies = parseCookieHeader(cookieHeader);

  const hamiAccess = cookies.hami_access_token?.trim();
  if (hamiAccess) {
    try {
      return decodeURIComponent(hamiAccess);
    } catch {
      return hamiAccess;
    }
  }

  const directToken = cookies['sb-access-token']?.trim();
  if (directToken) return decodeURIComponent(directToken);

  const authTokenCookieName = Object.keys(cookies).find((name) => name.startsWith('sb-') && name.endsWith('-auth-token'));
  if (!authTokenCookieName) return null;

  const raw = decodeURIComponent(cookies[authTokenCookieName] ?? '');
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && 'access_token' in parsed) {
      const maybeToken = (parsed as { access_token?: unknown }).access_token;
      if (typeof maybeToken === 'string' && maybeToken.trim()) return maybeToken.trim();
    }
  } catch {
    // Continue to alternate format.
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (Array.isArray(parsed) && typeof parsed[0] === 'string' && parsed[0].trim()) {
      return parsed[0].trim();
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Bearer and HttpOnly cookie must agree when both are present.
 */
export function extractUserTokenFromRequest(req: Request): string | null {
  const authHeaderToken = parseBearerToken(req.headers.get('authorization') ?? req.headers.get('Authorization'));
  const cookieToken = extractTokenFromSupabaseCookies(readIncomingCookieHeader(req));

  /*
   * Bearer يغلب الكوكي في القراءة الساذجة. إن اختلفا فالهجمة الشائعة هي حقن
   * Authorization من XSS بينما الجلسة الحقيقية في HttpOnly. لا نختار أحدهما:
   * الرفض أصدق من انتحال صامت.
   */
  if (authHeaderToken && cookieToken && !wifeTimingSafeEqual(authHeaderToken, cookieToken)) {
    return null;
  }

  return authHeaderToken ?? cookieToken;
}
