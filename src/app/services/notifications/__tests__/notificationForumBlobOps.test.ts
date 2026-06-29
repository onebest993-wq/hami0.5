import { describe, expect, it } from 'vitest';
import {
    extractForumNotificationsFromModels,
    markForumReadInModels,
    mergeLegacyForumIntoModels,
    upsertForumIntoModels,
} from '@/app/services/notifications/notificationForumBlobOps';
import {
    mapForumNotificationToModel,
    mapModelToForumNotification,
} from '@/app/services/notifications/forumNotificationMapper';
import type { ForumNotification } from '@/app/services/lawyer-cloud';

function makeForum(partial: Partial<ForumNotification> = {}): ForumNotification {
    return {
        id: 'f-1',
        userId: 'user-1',
        type: 'reply',
        title: 'رد',
        message: 'نص',
        postId: 'p-1',
        read: false,
        createdAt: '2026-06-01T00:00:00.000Z',
        ...partial,
    };
}

describe('notificationForumBlobOps', () => {
    it('roundtrip forum ↔ model يحافظ على المعرّف والنوع', () => {
        const forum = makeForum({ type: 'mention', dedupeKey: 'dk-1', activityCount: 3 });
        const model = mapForumNotificationToModel(forum);
        const back = mapModelToForumNotification(model, 'user-1');
        expect(back?.id).toBe('f-1');
        expect(back?.type).toBe('mention');
        expect(back?.dedupeKey).toBe('dk-1');
        expect(back?.activityCount).toBe(3);
    });

    it('upsertForumIntoModels يدمج في blob بدون تكرار', () => {
        const models = upsertForumIntoModels([], makeForum());
        expect(models).toHaveLength(1);
        const again = upsertForumIntoModels(models, makeForum({ message: 'محدّث' }));
        expect(again).toHaveLength(1);
        expect(again[0]!.message).toBe('محدّث');
    });

    it('markForumReadInModels يُعلّم isRead في blob', () => {
        const models = upsertForumIntoModels([], makeForum());
        const read = markForumReadInModels(models, 'user-1', 'f-1');
        expect(read[0]!.isRead).toBe(true);
        const forum = extractForumNotificationsFromModels(read, 'user-1')[0];
        expect(forum?.read).toBe(true);
    });

    it('mergeLegacyForumIntoModels يدمج legacy prefix مع blob', () => {
        const blob = upsertForumIntoModels([], makeForum({ id: 'sys-forum' }));
        const legacy = [makeForum({ id: 'legacy-1', message: 'قديم' })];
        const merged = mergeLegacyForumIntoModels(blob, legacy);
        expect(merged.length).toBe(2);
    });
});
