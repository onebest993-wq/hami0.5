import { requireWifeUser } from '../security/bffAuth.ts';
import { isPlatformAdminUserId } from '../security/roleResolver.ts';
import { wifeJsonResponse } from '../security/wifeSecurityHeaders.ts';

export async function requirePlatformAdmin(
  request: Request,
): Promise<{ ok: true; userId: string } | { ok: false; response: Response }> {
  const auth = await requireWifeUser(request);
  if (!auth.ok) return auth;
  if (!(await isPlatformAdminUserId(auth.userId))) {
    return {
      ok: false,
      response: wifeJsonResponse(403, { ok: false, error: 'Unauthorized Access' }),
    };
  }
  return auth;
}
