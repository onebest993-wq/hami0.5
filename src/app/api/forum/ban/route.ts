import { requireWifeUser, unwrapWifeUser } from '../../security/bffAuth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import type { BanRecord } from '../../../services/lawyer-cloud.ts';
import { canManageForumAdmin } from '../adminAuth.ts';
import { jsonResponse } from '../_auth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId: requesterId } = authGate;
    if (!(await canManageForumAdmin(requesterId))) {
      return jsonResponse(403, { ok: false, error: 'غير مصرح لك' });
    }

    const bannedUsers = await ForumRepository.listBannedUsers();
    return jsonResponse(200, { ok: true, bannedUsers });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Internal server error' });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const authGate = unwrapWifeUser(await requireWifeUser(request));
    if ('response' in authGate) return authGate.response;
    const { userId: requesterId } = authGate;
    if (!(await canManageForumAdmin(requesterId))) {
      return jsonResponse(403, { ok: false, error: 'غير مصرح لك' });
    }

    const payload = sanitizePayload(await request.json());
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return jsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    if (payload.action === 'ban') {
      if (typeof payload.userId !== 'string' || typeof payload.userName !== 'string' || typeof payload.reason !== 'string') {
        return jsonResponse(400, { ok: false, error: 'userId, userName, reason مطلوبة' });
      }
      const record: BanRecord = {
        userId: payload.userId,
        userName: payload.userName,
        reason: payload.reason,
        bannedBy: requesterId,
        bannedAt: new Date().toISOString(),
        expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : undefined,
      };
      await ForumRepository.banUser(record);
      return jsonResponse(200, { ok: true, action: 'ban', userId: payload.userId });
    }

    if (payload.action === 'unban') {
      if (typeof payload.userId !== 'string') {
        return jsonResponse(400, { ok: false, error: 'userId مطلوب' });
      }
      await ForumRepository.unbanUser(payload.userId);
      return jsonResponse(200, { ok: true, action: 'unban', userId: payload.userId });
    }

    return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Internal server error' });
  }
}
