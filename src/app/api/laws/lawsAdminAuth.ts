import { requireWifeUser, type WifeAuthResult } from '../security/bffAuth.ts';
import { isPlatformAdminUserId } from '../security/roleResolver.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';

export async function requirePlatformAdmin(request: Request): Promise<WifeAuthResult> {
  const auth = await requireWifeUser(request);
  if (auth.ok === false) return auth;
  if (!(await isPlatformAdminUserId(auth.userId))) {
    return {
      ok: false as const,
      response: wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' }),
    };
  }
  return auth;
}
