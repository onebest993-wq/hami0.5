/**
 * إشعارات بلاغات المنتدى للمشرفين — خادم فقط (لا يُستورد من مسارات العميل).
 */
import type { ForumNotification } from '@/app/services/forum/forumTypes';
import { resolveForumNotificationDb } from '@/app/services/notifications/forumNotificationDbResolver';

function createId(): string {
    const cryptoObj = globalThis.crypto as Crypto | undefined;
    if (cryptoObj?.randomUUID) return cryptoObj.randomUUID();
    return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function snippet(text: string, max = 80): string {
    const trimmed = String(text ?? '').trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max)}…`;
}

async function pushReportNotify(
    partial: Omit<ForumNotification, 'id' | 'read' | 'createdAt'>,
    dedupeKey: string,
): Promise<void> {
    if (!partial.userId?.trim()) return;
    const db = await resolveForumNotificationDb();
    const recent = await db.getNotifications(partial.userId);
    if (recent.some((n) => n.dedupeKey === dedupeKey)) return;
    await db.addNotification({
        ...partial,
        id: createId(),
        read: false,
        createdAt: new Date().toISOString(),
        dedupeKey,
    });
}

export async function dispatchForumReportSubmitted(params: {
    postId: string;
    reporterId: string;
    reason: string;
    targetLabel?: string;
}): Promise<void> {
    if (typeof window !== 'undefined') return;
    const { postId, reporterId, reason, targetLabel = 'منشور' } = params;
    const { listForumModeratorUserIds } = await import('./forumModeratorIds');
    const moderators = await listForumModeratorUserIds();
    await Promise.allSettled(
        moderators.map(async (modId) => {
            if (modId === reporterId) return;
            await pushReportNotify(
                {
                    userId: modId,
                    type: 'report_update',
                    title: `بلاغ جديد على ${targetLabel}`,
                    message: snippet(reason, 80),
                    postId,
                },
                `forum:report-new:${postId}:${reporterId}:${modId}`,
            );
        }),
    );
}
