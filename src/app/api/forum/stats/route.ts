import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { getForumStats } from '../../../services/lawyer-cloud.ts';
import { canManageForumAdmin } from '../adminAuth.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await verifyWifeSignature(request, userToken))) return wifeSignatureFailedResponse(request);

    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await canManageForumAdmin(requesterId))) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح لك' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const stats = await getForumStats();

    return new Response(JSON.stringify({ ok: true, stats }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
