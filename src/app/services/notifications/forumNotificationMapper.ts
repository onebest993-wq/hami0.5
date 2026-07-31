import type { ForumNotification, NotificationType as ForumNotificationType } from '@/app/services/forum/forumTypes';
import {
    deriveNotificationCategory,
    type NotificationModel,
    type NotificationType,
} from '@/app/infrastructure/notificationModel';

function mapForumTypeToAppType(forumType: ForumNotificationType): NotificationType {
    switch (forumType) {
        case 'best_answer':
            return 'forum_solved';
        case 'mention':
            return 'forum_mention';
        case 'follow':
        case 'upvote':
        case 'new_post':
        case 'comment':
        case 'reply':
        case 'report_update':
        case 'system':
        case 'new_document':
        default:
            return 'forum_reply';
    }
}

function mapAppTypeToForumType(
    appType: NotificationType,
    payload?: Record<string, unknown>,
): ForumNotificationType {
    const preserved = payload?.forumType;
    if (typeof preserved === 'string') {
        return preserved as ForumNotificationType;
    }
    switch (appType) {
        case 'forum_mention':
            return 'mention';
        case 'forum_solved':
            return 'best_answer';
        default:
            return 'reply';
    }
}

/** تسمية فرعية للواجهة حسب نوع حدث المنتدى الأصلي */
export function forumEventLabel(forumType: unknown): string | null {
    switch (forumType) {
        case 'mention':
            return 'إشارة';
        case 'best_answer':
            return 'إجابة مميزة';
        case 'follow':
            return 'متابع جديد';
        case 'upvote':
            return 'تفاعل';
        case 'new_post':
            return 'منشور جديد';
        case 'comment':
        case 'reply':
            return 'رد';
        case 'report_update':
            return 'تحديث بلاغ';
        default:
            return null;
    }
}

/** تحويل إشعار منتدى → NotificationModel بنفس المعرّف (مصدر واحد للحقيقة). */
export function mapForumNotificationToModel(n: ForumNotification): NotificationModel {
    const postId = n.postId ?? n.id;
    return {
        id: n.id,
        title: n.title,
        message: n.message,
        type: mapForumTypeToAppType(n.type),
        category: 'forum',
        direction: 'incoming',
        isRead: n.read,
        createdAt: n.createdAt,
        actionPayload: {
            postId,
            questionId: postId,
            forumType: n.type,
            ...(n.dedupeKey ? { dedupeKey: n.dedupeKey } : {}),
            ...(typeof n.activityCount === 'number' ? { activityCount: n.activityCount } : {}),
        },
    };
}

/** NotificationModel → ForumNotification (للوحة المنتدى). */
export function mapModelToForumNotification(
    model: NotificationModel,
    userId: string,
): ForumNotification | null {
    if (deriveNotificationCategory(model) !== 'forum') return null;
    const payload = model.actionPayload ?? {};
    const postId = String(payload.postId ?? payload.questionId ?? model.id);
    return {
        id: model.id,
        userId,
        type: mapAppTypeToForumType(model.type, payload),
        title: model.title,
        message: model.message,
        postId,
        read: model.isRead,
        createdAt: model.createdAt,
        dedupeKey: typeof payload.dedupeKey === 'string' ? payload.dedupeKey : undefined,
        activityCount: typeof payload.activityCount === 'number' ? payload.activityCount : undefined,
    };
}
