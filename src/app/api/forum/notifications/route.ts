import {
  extractUserTokenFromRequest,
  getVerifiedTokenSubject,
  isTokenAuthorized,
  assertWifeSignatureRequest,
  wifeForbiddenResponse, wifeSignatureFailedResponse,
  wifeUnauthorizedResponse,
} from '../../security/wifeValidator.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { NotificationDB } from '../../../services/lawyer-cloud.ts';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const userToken = extractUserTokenFromRequest(request);
    if (!userToken || !(await isTokenAuthorized(userToken))) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
    if (wifeBlock) return wifeBlock;

    const userId = await getVerifiedTokenSubject(userToken);
    if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const notifications = await NotificationDB.getNotifications(userId);
    const unreadCount = await NotificationDB.getUnreadCount(userId);

    return new Response(JSON.stringify({ ok: true, notifications, unreadCount }), {
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
        const wifeBlock = await assertWifeSignatureRequest(request, userToken);
    if (wifeBlock) return wifeBlock;

    const userId = await getVerifiedTokenSubject(userToken);
    if (!userId) return wifeUnauthorizedResponse({ request, reason: 'unauthorized_token' });

    const payload = sanitizePayload(await request.json());
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return new Response(JSON.stringify({ ok: false, error: 'action مطلوب' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    if (payload.action === 'mark_read' && typeof payload.notificationId === 'string') {
      await NotificationDB.markAsRead(payload.notificationId, userId);
    } else if (payload.action === 'mark_all_read') {
      await NotificationDB.markAllAsRead(userId);
    } else {
      return new Response(JSON.stringify({ ok: false, error: 'إجراء غير معروف' }), {
        status: 400, headers: { 'Content-Type': 'application/json; charset=utf-8' },
      });
    }

    return new Response(JSON.stringify({ ok: true, action: payload.action }), {
      status: 200, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  } catch {
    return new Response(JSON.stringify({ ok: false, error: 'Internal server error' }), {
      status: 500, headers: { 'Content-Type': 'application/json; charset=utf-8' },
    });
  }
}
