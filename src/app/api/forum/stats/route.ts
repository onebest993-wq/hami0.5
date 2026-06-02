import {
  extractUserTokenFromRequest,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { getForumStats } from '../../../services/lawyer-cloud.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse();
    if (!(await verifyWifeSignature(request, userToken))) return wifeForbiddenResponse();

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
