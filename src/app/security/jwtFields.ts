export interface JwtSessionFields {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
}

export function decodeJwtPayloadBase64(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) base64 += '=';
    const decoded = atob(base64);
    return JSON.parse(decoded) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export function extractJwtSessionFields(token: string): JwtSessionFields | null {
  const payload = decodeJwtPayloadBase64(token);
  if (!payload) return null;
  const sub = typeof payload.sub === 'string' ? payload.sub.trim() : '';
  const jti = typeof payload.jti === 'string' ? payload.jti.trim() : '';
  const iatSec = typeof payload.iat === 'number' ? payload.iat : 0;
  const expSec = typeof payload.exp === 'number' ? payload.exp : 0;
  if (!sub || !jti || !iatSec || !expSec) return null;
  return { sub, jti, iat: iatSec * 1000, exp: expSec * 1000 };
}
