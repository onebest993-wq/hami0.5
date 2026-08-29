import { describe, expect, it, vi } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import {
    isEligibleInAppPopup,
    mergeIncomingPopupQueue,
    toIncomingNotificationPopup,
} from '@/app/hooks/lawyerDashboard/incomingNotificationPopupModel';

vi.mock('@/app/services/notifications/notificationAlertPolicy', async (importOriginal) => {
    const actual =
        await importOriginal<typeof import('@/app/services/notifications/notificationAlertPolicy')>();
    return {
        ...actual,
        shouldShowChannelInApp: (channel: string) => channel === 'community',
    };
});

function makeNotif(overrides: Partial<NotificationModel> = {}): NotificationModel {
    return {
        id: 'p-1',
        title: 'رد جديد',
        message: 'نص المنبث',
        type: 'forum_reply',
        isRead: false,
        createdAt: '2026-08-25T00:00:00.000Z',
        ...overrides,
    };
}

describe('incomingNotificationPopupModel', () => {
    it('toIncomingNotificationPopup ينقل الحقول والقناة', () => {
        const popup = toIncomingNotificationPopup(makeNotif());
        expect(popup).toEqual({
            id: 'p-1',
            title: 'رد جديد',
            message: 'نص المنبث',
            createdAt: '2026-08-25T00:00:00.000Z',
            channel: 'community',
        });
    });

    it('isEligibleInAppPopup يرفض المقروء والقنوات خارج الوارد', () => {
        expect(isEligibleInAppPopup(makeNotif())).toBe(true);
        expect(isEligibleInAppPopup(makeNotif({ isRead: true }))).toBe(false);
        expect(isEligibleInAppPopup(makeNotif({ type: 'deadline', category: 'task' }))).toBe(false);
    });

    it('mergeIncomingPopupQueue يضع الأحدث أولاً ويحدّ العدد ويتجاهل المكرر', () => {
        const prev = [toIncomingNotificationPopup(makeNotif({ id: 'old' }))];
        const next = mergeIncomingPopupQueue(prev, [
            makeNotif({ id: 'old' }),
            makeNotif({ id: 'n2' }),
            makeNotif({ id: 'n1' }),
        ]);
        expect(next.map((p) => p.id)).toEqual(['n1', 'n2']);
    });
});
