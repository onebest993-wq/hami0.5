/**
 * Audit Log Publisher — إشعارات واردة فقط (منتدى، نظام، inbox).
 * سجل النشاطات (civil/criminal/execution/...) مُلغى — واجهات no-op للتوافق.
 */

import { useNotificationStore } from '@/app/stores/notificationStore';
import type {
    NotificationCategory,
    NotificationDirection,
    NotificationModel,
    NotificationType,
} from '@/app/infrastructure/NotificationRepository';
import { isActivityAuditNotificationType } from '@/app/infrastructure/NotificationRepository';
import { sanitizeNotificationDisplayMessage } from '@/app/services/notificationMessageFormat';
import { createDisabledAuditDomain } from '@/app/services/notifications/auditLogDisabledDomain';

const DEDUPE_WINDOW_MS = 30_000;
const dedupeCache = new Map<string, number>();

function shouldDedupe(dedupeKey: string | undefined, now: number): boolean {
    if (!dedupeKey) return false;
    const lastTs = dedupeCache.get(dedupeKey);
    if (lastTs && now - lastTs < DEDUPE_WINDOW_MS) return true;
    dedupeCache.set(dedupeKey, now);
    if (dedupeCache.size > 200) {
        const cutoff = now - DEDUPE_WINDOW_MS * 4;
        for (const [k, ts] of dedupeCache) {
            if (ts < cutoff) dedupeCache.delete(k);
        }
    }
    return false;
}

export function resetAuditLogDedupe(): void {
    dedupeCache.clear();
}

interface PublishParams {
    type: NotificationType;
    category: NotificationCategory;
    title: string;
    message: string;
    direction?: NotificationDirection;
    actionPayload?: Record<string, unknown>;
    dedupeKey?: string;
}

function defaultDirectionForCategory(c: NotificationCategory): NotificationDirection {
    switch (c) {
        case 'document':
            return 'outgoing';
        case 'forum':
        case 'system':
        case 'ai':
            return 'incoming';
        default:
            return 'outgoing';
    }
}

function makeId(prefix: string): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
        return `${prefix}_${crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function publish(params: PublishParams): NotificationModel | null {
    if (isActivityAuditNotificationType(params.type)) return null;

    const direction = params.direction ?? defaultDirectionForCategory(params.category);
    if (direction === 'outgoing') return null;
    if (
        params.category === 'civil' ||
        params.category === 'criminal' ||
        params.category === 'execution' ||
        params.category === 'task'
    ) {
        return null;
    }

    const now = Date.now();
    if (shouldDedupe(params.dedupeKey, now)) return null;

    const message = sanitizeNotificationDisplayMessage({
        message: params.message,
        title: params.title,
        category: params.category,
        type: params.type,
    });
    if (!message.trim()) return null;

    const notif: NotificationModel = {
        id: makeId(params.category),
        title: params.title,
        message,
        type: params.type,
        category: params.category,
        direction,
        isRead: false,
        actionPayload: {
            ...(params.actionPayload ?? {}),
            ...(params.dedupeKey ? { dedupeKey: params.dedupeKey } : {}),
        },
        createdAt: new Date(now).toISOString(),
    };

    try {
        useNotificationStore.getState().addNotification(notif);
    } catch {
        /* non-fatal */
    }
    return notif;
}

const disabled = createDisabledAuditDomain();

export const AuditLog = {
    civil: disabled,
    criminal: disabled,
    execution: disabled,
    task: disabled,
    threading: disabled,
    dossier: disabled,
    personal: disabled,
    note: disabled,
    fieldTask: disabled,
    document: disabled,

    forum: {
        replyReceived(p: { questionId: string; questionTitle: string; author?: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'رد جديد على سؤالك',
                message: `${p.questionTitle}${p.author ? ` — ${p.author}` : ''}`,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:reply:${p.questionId}:${p.author ?? ''}`,
            });
        },
        mentioned(p: { questionId: string; questionTitle: string; mentionedBy?: string }) {
            return publish({
                type: 'forum_mention',
                category: 'forum',
                title: 'ذُكرت في سؤال',
                message: `${p.questionTitle}${p.mentionedBy ? ` — ${p.mentionedBy}` : ''}`,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:mention:${p.questionId}:${p.mentionedBy ?? ''}`,
            });
        },
        solved(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_solved',
                category: 'forum',
                title: 'تم تحديد إجابة لسؤالك',
                message: p.questionTitle,
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:solved:${p.questionId}`,
            });
        },
        questionPosted(p: { questionId: string; title: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'نشرت سؤالاً في المنتدى',
                message: p.title,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:question-post:${p.questionId}`,
            });
        },
        replyPosted(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'رددت على سؤال',
                message: p.questionTitle,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:reply-post:${p.questionId}`,
            });
        },
        questionDeleted(p: { questionId: string; title?: string }) {
            return publish({
                type: 'forum_reply',
                category: 'forum',
                title: 'حذفت سؤالاً',
                message: p.title || `سؤال #${p.questionId}`,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:question-delete:${p.questionId}`,
            });
        },
        markedAsSolved(p: { questionId: string; questionTitle: string }) {
            return publish({
                type: 'forum_solved',
                category: 'forum',
                title: 'حددت أفضل إجابة',
                message: p.questionTitle,
                direction: 'outgoing',
                actionPayload: { questionId: p.questionId },
                dedupeKey: `forum:mark-solved:${p.questionId}`,
            });
        },
    },

    system: {
        announce(p: { title: string; message: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: p.title,
                message: p.message,
                direction: 'incoming',
                dedupeKey: p.dedupeKey,
            });
        },
        securityEvent(p: { title: string; message: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: p.title,
                message: p.message,
                direction: 'incoming',
                dedupeKey: p.dedupeKey,
            });
        },
        settingChanged(p: { setting: string; from?: string; to?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: 'تم تغيير إعداد',
                message: `${p.setting}${p.from && p.to ? `: ${p.from} → ${p.to}` : ''}`,
                direction: 'outgoing',
                dedupeKey: `system:setting:${p.setting}`,
            });
        },
    },

    inbox: {
        clientRequest(p: { requestId: string; clientName: string; subject?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: 'طلب جديد من موكل',
                message: `${p.clientName}${p.subject ? ` — ${p.subject}` : ''}`,
                direction: 'incoming',
                actionPayload: { requestId: p.requestId, source: 'client' },
                dedupeKey: `inbox:client-request:${p.requestId}`,
            });
        },
        documentReceived(p: { docId: string; name: string; fromClient: string }) {
            return publish({
                type: 'new_document',
                category: 'document',
                title: 'وصل مستند من موكل',
                message: `${p.name} — ${p.fromClient}`,
                direction: 'incoming',
                actionPayload: { docId: p.docId, source: 'client' },
                dedupeKey: `inbox:doc:${p.docId}`,
            });
        },
        courtNotice(p: { caseNo: string; date: string; subject: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: 'إخطار قضائي',
                message: `${p.caseNo} • ${p.subject} (${p.date})`,
                direction: 'incoming',
                actionPayload: { caseNo: p.caseNo, date: p.date },
                dedupeKey: `inbox:court:${p.caseNo}:${p.date}`,
            });
        },
        colleagueMessage(p: { from: string; subject: string; dedupeKey?: string }) {
            return publish({
                type: 'system_alert',
                category: 'system',
                title: `رسالة من ${p.from}`,
                message: p.subject,
                direction: 'incoming',
                dedupeKey: p.dedupeKey ?? `inbox:colleague:${p.from}:${p.subject.slice(0, 30)}`,
            });
        },
    },
};

export type AuditLogService = typeof AuditLog;
