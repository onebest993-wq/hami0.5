import { buildContentSecurityPolicy, resolveCspMode } from './contentSecurityPolicy';

/** ترويسة واحدة — يجب تطابق vercel.json و public/_headers (انظر deployHeadersParity.test) */
export const HAMI_PERMISSIONS_POLICY =
    'geolocation=(), microphone=(self), camera=(self), payment=(), usb=(), publickey-credentials-get=(self), publickey-credentials-create=(self)';

const BASE_SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': HAMI_PERMISSIONS_POLICY,
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-site',
  'X-XSS-Protection': '0',
};

function buildSecurityHeaders(cspMode?: 'development' | 'production'): Record<string, string> {
  const mode = cspMode ?? resolveCspMode();
  const headers: Record<string, string> = {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': buildContentSecurityPolicy(mode),
  };
  if (mode === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains; preload';
  }
  return headers;
}

export function applyWifeSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries(buildSecurityHeaders())) {
    if (!headers.has(key)) headers.set(key, value);
  }
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export function wifeJsonResponse(status: number, body: Record<string, unknown>): Response {
  return applyWifeSecurityHeaders(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json; charset=utf-8' },
    }),
  );
}

export function getDevSecurityHeaders(): Record<string, string> {
  return { ...buildSecurityHeaders('development'), 'Cache-Control': 'no-store' };
}

export function getProductionSecurityHeaders(): Record<string, string> {
  return buildSecurityHeaders('production');
}
