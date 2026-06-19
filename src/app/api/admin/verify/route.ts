import { requireWifeUser } from '../../security/bffAuth.ts';
import { isAdminUserId } from '../../security/adminCheck.ts';
import { extractUserTokenFromRequest } from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireWifeUser(request);
    if (!auth.ok) return auth.response;

    const token = extractUserTokenFromRequest(request);
    const isAdmin = await isAdminUserId(auth.userId, token);

    return wifeJsonResponse(200, { ok: true, isAdmin });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal admin verify error' });
  }
}
