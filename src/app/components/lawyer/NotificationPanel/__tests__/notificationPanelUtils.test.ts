import { describe, expect, it } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    isSelfActionNotification,
    isIncomingNotification,
} from '@/app/services/notificationIncomingFilter';
import {
    isForumNotification,
    isSystemNotification,
} from '@/app/components/lawyer/NotificationPanel/utils/notificationFilters';
import {
    getTimeBucket,
    groupNotificationsByTime,
    formatTimeShort,
} from '@/app/components/lawyer/NotificationPanel/utils/timeGrouping';

function makeNotif(overrides: Partial<NotificationModel> = {}): NotificationModel {
    return {
        id: 'n-1',
        title: 'رد جديد',
        message: 'استشارة',
        type: 'forum_reply',
        isRead: false,
        createdAt: new Date().toISOString(),
        ...overrides,
    };
}

describe('incomingOnly', () => {
    it('يرفض إجراءات المنتدى الذاتية بالعنوان', () => {
        expect(isSelfActionNotification(makeNotif({ title: 'حذفت سؤالاً' }))).toBe(true);
        expect(isSelfActionNotification(makeNotif({ title: 'نشرت سؤالاً في المنتدى' }))).toBe(true);
    });

    it('يقبل إشعاراً وارداً حقيقياً', () => {
        expect(isIncomingNotification(makeNotif({ title: 'رد جديد على سؤالك' }))).toBe(true);
    });

    it('يرفض outgoing صريحاً', () => {
        expect(
            isSelfActionNotification(
                makeNotif({ title: 'تخصيص', direction: 'outgoing', type: 'new_document' }),
            ),
        ).toBe(true);
    });
});

describe('notificationFilters', () => {
    it('يفصل منتدى عن نظام', () => {
        expect(isForumNotification(makeNotif({ type: 'forum_mention' }))).toBe(true);
        expect(isSystemNotification(makeNotif({ type: 'system_alert' }))).toBe(true);
        expect(isForumNotification(makeNotif({ type: 'system_alert' }))).toBe(false);
    });
});

describe('timeGrouping', () => {
    it('getTimeBucket يصنّف اليوم والأمس', () => {
        const now = new Date('2026-06-13T12:00:00');
        expect(getTimeBucket('2026-06-13T08:00:00', now)).toBe('today');
        expect(getTimeBucket('2026-06-12T08:00:00', now)).toBe('yesterday');
        expect(getTimeBucket('2026-06-01T08:00:00', now)).toBe('older');
    });

    it('groupNotificationsByTime يوزّع العناصر', () => {
        const now = new Date('2026-06-13T12:00:00');
        const items = [
            makeNotif({ id: 'a', createdAt: '2026-06-13T08:00:00' }),
            makeNotif({ id: 'b', createdAt: '2026-06-12T08:00:00' }),
            makeNotif({ id: 'c', createdAt: '2026-06-01T08:00:00' }),
        ];
        const groups = groupNotificationsByTime(items, now);
        expect(groups.today).toHaveLength(1);
        expect(groups.yesterday).toHaveLength(1);
        expect(groups.older).toHaveLength(1);
        expect(formatTimeShort('2026-06-13T08:30:00').length).toBeGreaterThan(0);
    });
});
