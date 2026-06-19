import {
  extractUserTokenFromRequest,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { ForumRepository } from '../../../services/forum/forumRepository.ts';
import type { BanRecord } from '../../../services/lawyer-cloud.ts';
import { getVerifiedTokenSubject } from '../../security/wifeValidator.ts';
import { canManageForumAdmin } from '../adminAuth.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await verifyWifeSignature(request, userToken))) return wifeSignatureFailedResponse(request);
    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await canManageForumAdmin(requesterId))) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح لك' }), {
        status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const bannedUsers = await ForumRepository.listBannedUsers();
    return new Response(JSON.stringify({ ok: true, bannedUsers }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await verifyWifeSignature(request, userToken))) return wifeSignatureFailedResponse(request);
    const requesterId = await getVerifiedTokenSubject(userToken);
    if (!requesterId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
    if (!(await canManageForumAdmin(requesterId))) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح لك' }), {
        status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const payload = sanitizePayload(await request.json());
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'action مطلوب' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (payload.action === 'ban') {
      if (typeof payload.userId !== 'string' || typeof payload.userName !== 'string' || typeof payload.reason !== 'string') {
        return new Response(JSON.stringify({ ok: false, error: 'userId, userName, reason مطلوبة' }), {
          status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
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
      return new Response(JSON.stringify({ ok: true, action: 'ban', userId: payload.userId }), {
        status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (payload.action === 'unban') {
      if (typeof payload.userId !== 'string') {
        return new Response(JSON.stringify({ ok: false, error: 'userId مطلوب' }), {
          status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
        });
      }
      await ForumRepository.unbanUser(payload.userId);
      return new Response(JSON.stringify({ ok: true, action: 'unban', userId: payload.userId }), {
        status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ ok: false, error: 'إجراء غير معروف' }), {
      status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
