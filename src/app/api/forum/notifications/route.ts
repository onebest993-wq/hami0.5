import { requireForumAuth, jsonResponse } from '../_auth.ts';
import { sanitizePayload } from '../../security/sanitizer.ts';
import { ServerNotificationDB } from '@/app/services/notifications/notificationForumStorage.server';

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object';
}

export async function GET(request: Request): Promise<Response> {
  try {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth.response;
    const { userId } = auth;

    const notifications = await ServerNotificationDB.getNotifications(userId);
    const unreadCount = await ServerNotificationDB.getUnreadCount(userId);

    return jsonResponse(200, { ok: true, notifications, unreadCount });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Internal server error' });
  }
}

export async function POST(request: Request): Promise<Response> {
  try {
    const auth = await requireForumAuth(request);
    if ('response' in auth) return auth.response;
    const { userId } = auth;

    const payload = sanitizePayload(await request.json());
    if (!isRecord(payload) || typeof payload.action !== 'string') {
      return jsonResponse(400, { ok: false, error: 'action مطلوب' });
    }

    if (payload.action === 'mark_read' && typeof payload.notificationId === 'string') {
      await ServerNotificationDB.markAsRead(payload.notificationId, userId);
    } else if (payload.action === 'dismiss' && typeof payload.notificationId === 'string') {
      await ServerNotificationDB.removeNotification(payload.notificationId, userId);
    } else if (payload.action === 'mark_all_read') {
      await ServerNotificationDB.markAllAsRead(userId);
    } else {
      return jsonResponse(400, { ok: false, error: 'إجراء غير معروف' });
    }

    return jsonResponse(200, { ok: true, action: payload.action });
  } catch {
    return jsonResponse(500, { ok: false, error: 'Internal server error' });
  }
}
