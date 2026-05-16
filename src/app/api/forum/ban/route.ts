import {
  extractUserTokenFromRequest,
  isTokenAuthorized,
  verifyWifeSignature,
  wifeForbiddenResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator';
import { sanitizePayload } from '../../security/sanitizer';
import { BanDB, type BanRecord } from '@/app/services/lawyer-cloud';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    return JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

function isAdmin(token: string): boolean {
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  const role = (payload as Record<string, unknown>).role;
  const appMeta = payload.app_metadata as Record<string, unknown> | undefined;
  const userMeta = payload.user_metadata as Record<string, unknown> | undefined;
  return role === 'SUPER_ADMIN' || appMeta?.role === 'SUPER_ADMIN' || userMeta?.role === 'SUPER_ADMIN';
}

function getAdminUserId(token: string): string {
  const payload = decodeJwtPayload(token);
  return (payload?.sub as string) || '';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse();
    if (!(await verifyWifeSignature(request, userToken))) return wifeForbiddenResponse();
    if (!isAdmin(userToken)) {
      return new Response(JSON.stringify({ ok: false, error: 'غير مصرح لك' }), {
        status: 403, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    const bannedUsers = await BanDB.listBannedUsers();
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
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse();
    if (!(await verifyWifeSignature(request, userToken))) return wifeForbiddenResponse();
    if (!isAdmin(userToken)) {
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
        bannedBy: getAdminUserId(userToken),
        bannedAt: new Date().toISOString(),
        expiresAt: typeof payload.expiresAt === 'string' ? payload.expiresAt : undefined,
      };
      await BanDB.banUser(record);
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
      await BanDB.unbanUser(payload.userId);
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
