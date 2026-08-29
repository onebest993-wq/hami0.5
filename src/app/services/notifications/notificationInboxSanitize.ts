import type {
    NotificationCategory,
    NotificationModel,
    NotificationType,
} from '@/app/infrastructure/notificationModel';
import {
    sanitizeNotificationActionPayload,
    sanitizeNotificationEntityId,
} from '@/app/services/notifications/notificationNavigateSecurity';

export const MAX_NOTIFICATION_TITLE_LEN = 200;
export const MAX_NOTIFICATION_MESSAGE_LEN = 2000;
export const MAX_NOTIFICATION_DEDUPE_KEY_LEN = 128;
export const MAX_OS_NOTIFY_QUERY_CHARS = 4_096;
export const MAX_FCM_TOKEN_LEN = 4_096;
export const MIN_FCM_TOKEN_LEN = 20;

const ALLOWED_TYPES = new Set<NotificationType>([
    'deadline',
    'system_alert',
    'ai_insight',
    'new_document',
    'audit_log_civil',
    'audit_log_criminal',
    'audit_log_execution',
    'audit_log_task',
    'forum_reply',
    'forum_mention',
    'forum_solved',
]);

const ALLOWED_CATEGORIES = new Set<NotificationCategory>([
    'civil',
    'criminal',
    'execution',
    'task',
    'forum',
    'system',
    'document',
    'ai',
]);

export function clampNotificationInboxText(raw: unknown, max: number): string {
    if (typeof raw !== 'string') return '';
    return raw.replace(/\u0000/g, '').trim().slice(0, max);
}

export function sanitizeNotificationDedupeKey(raw: unknown): string | undefined {
    const id = sanitizeNotificationEntityId(
        typeof raw === 'string' ? raw.trim().slice(0, MAX_NOTIFICATION_DEDUPE_KEY_LEN) : raw,
    );
    return id ?? undefined;
}

export function isAllowedFcmToken(token: string): boolean {
    if (token.length < MIN_FCM_TOKEN_LEN || token.length > MAX_FCM_TOKEN_LEN) return false;
    if (/[<>'"\s]/.test(token)) return false;
    return true;
}

function sanitizeCreatedAt(raw: unknown): string {
    if (typeof raw !== 'string') return new Date().toISOString();
    const t = Date.parse(raw.trim().slice(0, 40));
    if (!Number.isFinite(t)) return new Date().toISOString();
    return new Date(t).toISOString();
}

/**
 * يصفّر سجل صندوق للتخزين/الدمج: معرّف آمن، نصوص محدودة، حمولة تنقّل مُعقَّمة.
 * يُبقي مفاتيح خادم (dedupeKey / appendedBy / readSynced*) خارج قائمة التنقّل.
 */
export function sanitizeNotificationModelForPersist(
    notification: NotificationModel,
): NotificationModel | null {
    const id = sanitizeNotificationEntityId(notification.id);
    if (!id) return null;
    if (!ALLOWED_TYPES.has(notification.type)) return null;

    const title = clampNotificationInboxText(notification.title, MAX_NOTIFICATION_TITLE_LEN);
    const message = clampNotificationInboxText(notification.message, MAX_NOTIFICATION_MESSAGE_LEN);
    if (!title || !message) return null;

    const category =
        notification.category && ALLOWED_CATEGORIES.has(notification.category)
            ? notification.category
            : undefined;
    const direction =
        notification.direction === 'outgoing' || notification.direction === 'incoming'
            ? notification.direction
            : undefined;

    const rawPayload =
        notification.actionPayload && typeof notification.actionPayload === 'object'
            ? notification.actionPayload
            : {};
    const nav = sanitizeNotificationActionPayload(rawPayload);
    const dedupeKey = sanitizeNotificationDedupeKey(rawPayload.dedupeKey);
    const appendedBy = rawPayload.appendedBy === 'server' ? 'server' : undefined;
    const readSyncedBy = rawPayload.readSyncedBy === 'server' ? 'server' : undefined;
    const readSyncedAt =
        typeof rawPayload.readSyncedAt === 'string' ? sanitizeCreatedAt(rawPayload.readSyncedAt) : undefined;

    const actionPayload: Record<string, unknown> = { ...nav };
    if (dedupeKey) actionPayload.dedupeKey = dedupeKey;
    if (appendedBy) actionPayload.appendedBy = appendedBy;
    if (readSyncedBy) actionPayload.readSyncedBy = readSyncedBy;
    if (readSyncedAt) actionPayload.readSyncedAt = readSyncedAt;

    return {
        id,
        title,
        message,
        type: notification.type,
        ...(category ? { category } : {}),
        ...(direction ? { direction } : {}),
        isRead: notification.isRead === true,
        actionPayload,
        createdAt: sanitizeCreatedAt(notification.createdAt),
    };
}
