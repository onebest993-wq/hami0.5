import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { isAdminUserId } from '../../security/adminCheck.ts';
import { extractUserTokenFromRequest } from '../../security/wifeValidator.ts';
import { wifeJsonResponse } from '../../security/wifeSecurityHeaders.ts';

export const runtime = 'nodejs';

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId } = authGate;

    const token = extractUserTokenFromRequest(request);
    const isAdmin = await isAdminUserId(userId, token);

    return wifeJsonResponse(200, { ok: true, isAdmin });
  } catch {
    return wifeJsonResponse(500, { ok: false, error: 'Internal admin verify error' });
  }
}
