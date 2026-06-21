import type { ForumNotification, NotificationType } from '@/app/services/lawyer-cloud';
import { AuditLog } from '@/app/services/auditLogPublisher';

const SYNC_STORAGE_PREFIX = 'hami:forum:notif-synced:';
const SYNC_CAP = 400;

function loadSyncedIds(userId: string): Set<string> {
    if (typeof window === 'undefined') return new Set();
    try {
        const raw = window.sessionStorage.getItem(`${SYNC_STORAGE_PREFIX}${userId}`);
        if (!raw) return new Set();
        const parsed = JSON.parse(raw) as string[];
        return new Set(Array.isArray(parsed) ? parsed : []);
    } catch {
        return new Set();
    }
}

function saveSyncedIds(userId: string, ids: Set<string>): void {
    if (typeof window === 'undefined') return;
    try {
        const arr = [...ids].slice(-SYNC_CAP);
        window.sessionStorage.setItem(`${SYNC_STORAGE_PREFIX}${userId}`, JSON.stringify(arr));
    } catch {
        /* ignore */
    }
}

function mapForumTypeToAudit(forumType: NotificationType): 'forum_reply' | 'forum_mention' | 'forum_solved' {
    switch (forumType) {
        case 'best_answer':
            return 'forum_solved';
        case 'mention':
            return 'forum_mention';
        default:
            return 'forum_reply';
    }
}

/** مزامنة تنبيهات المنتدى مع لوحة الإشعارات الرئيسية (عميل فقط) */
export function syncForumNotificationsToAppStore(userId: string, notifications: ForumNotification[]): number {
    if (typeof window === 'undefined' || !userId) return 0;
    const synced = loadSyncedIds(userId);
    let added = 0;

    for (const n of notifications) {
        if (synced.has(n.id)) continue;
        synced.add(n.id);
        if (n.read) continue;

        AuditLog.forum.incomingActivity({
            postId: n.postId ?? n.id,
            title: n.title,
            message: n.message,
            dedupeKey: n.dedupeKey ?? `forum:${n.type}:${n.userId}:${n.postId ?? n.id}:${n.createdAt}`,
            auditType: mapForumTypeToAudit(n.type),
        });
        added += 1;
    }

    saveSyncedIds(userId, synced);
    return added;
}

export const FORUM_UNREAD_CHANGED_EVENT = 'hami:forum-unread-changed';

export function emitForumUnreadCount(count: number, options?: { refresh?: boolean }): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(FORUM_UNREAD_CHANGED_EVENT, { detail: { count, refresh: options?.refresh === true } }),
    );
}
