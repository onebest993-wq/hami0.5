import type { ForumNotification, NotificationType } from '@/app/services/forum/forumTypes';
import { resolveForumNotificationDb } from '@/app/services/notifications/forumNotificationDbResolver';

const DEDUPE_WINDOW_MS = 5 * 60 * 1000;
const AGGREGATABLE_TYPES: NotificationType[] = ['comment', 'reply'];

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function forumNotificationSnippet(text: string, max = 48): string {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max)}…`;
}

function aggregateTitle(type: NotificationType, count: number): string {
    if (type === 'reply') {
        return count === 1 ? 'رد جديد على تعليقك' : `${count} ردود جديدة`;
    }
    return count === 1 ? 'تعليق جديد على منشورك' : `${count} تعليقات جديدة على منشورك`;
}

function aggregateMessage(type: NotificationType, count: number, latestSnippet: string): string {
    if (count <= 1) return latestSnippet;
    return `${count} ${type === 'reply' ? 'ردود' : 'تعليقات'} — آخرها: ${latestSnippet}`;
}

function buildAggregateKey(type: NotificationType, postId: string, userId: string): string | undefined {
    if (!AGGREGATABLE_TYPES.includes(type)) return undefined;
    return `forum:agg:${type}:${postId}:${userId}`;
}

export async function pushForumNotification(
    partial: Omit<ForumNotification, 'id' | 'read' | 'createdAt'>,
    dedupeKey?: string,
): Promise<void> {
    if (!partial.userId?.trim()) return;

    const aggregateKey =
        partial.postId && AGGREGATABLE_TYPES.includes(partial.type)
            ? buildAggregateKey(partial.type, partial.postId, partial.userId)
            : undefined;
    const lookupKey = aggregateKey ?? dedupeKey;

    if (lookupKey) {
        const db = await resolveForumNotificationDb();
        const recent = await db.getNotifications(partial.userId);
        const cutoff = Date.now() - DEDUPE_WINDOW_MS;
        const existing = recent.find(
            (n) =>
                !n.read &&
                Date.parse(n.createdAt) >= cutoff &&
                (n.dedupeKey === lookupKey ||
                    (dedupeKey && n.dedupeKey === dedupeKey) ||
                    (!n.dedupeKey &&
                        n.type === partial.type &&
                        n.postId === partial.postId &&
                        AGGREGATABLE_TYPES.includes(partial.type))),
        );

        if (existing) {
            if (AGGREGATABLE_TYPES.includes(partial.type)) {
                const count = (existing.activityCount ?? 1) + 1;
                await db.updateNotification(partial.userId, existing.id, {
                    title: aggregateTitle(partial.type, count),
                    message: aggregateMessage(partial.type, count, partial.message),
                    activityCount: count,
                    createdAt: new Date().toISOString(),
                    dedupeKey: lookupKey,
                });
                return;
            }
            return;
        }
    }

    const db = await resolveForumNotificationDb();
    await db.addNotification({
        ...partial,
        dedupeKey: lookupKey ?? dedupeKey,
        activityCount: AGGREGATABLE_TYPES.includes(partial.type) ? 1 : undefined,
        id: createId(),
        read: false,
        createdAt: new Date().toISOString(),
    });
}
