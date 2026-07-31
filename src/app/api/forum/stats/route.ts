import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { getForumStats } from '../../../services/lawyer-cloud.ts';
import { canManageForumAdmin } from '../adminAuth.ts';
import { jsonResponse } from '../_auth.ts';

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId: requesterId } = authGate;
    if (!(await canManageForumAdmin(requesterId))) {
      return jsonResponse(403, { ok: false, error: 'غير مصرح لك' });
    }

    const stats = await getForumStats();
    return jsonResponse(200, { ok: true, stats });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Internal server error' });
  }
}
