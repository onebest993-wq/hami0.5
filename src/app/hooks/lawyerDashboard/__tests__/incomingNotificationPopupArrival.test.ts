import { describe, expect, it, vi, afterEach } from 'vitest';
import type { NotificationModel } from '@/app/infrastructure/NotificationRepository';
import { playNotificationArrivalCue } from '@/app/services/notifications/notificationArrivalSound';
import { announceIncomingNotificationArrival } from '@/app/hooks/lawyerDashboard/incomingNotificationPopupArrival';

vi.mock('@/app/services/notifications/notificationArrivalSound', () => ({
    playNotificationArrivalCue: vi.fn(() => Promise.resolve()),
}));

const showHamiNotification = vi.fn();
vi.mock('@/app/services/notifications/HamiNotificationBridge', () => ({
    showHamiNotification: (...args: unknown[]) => showHamiNotification(...args),
}));

function makeNotif(): NotificationModel {
    return {
        id: 'arr-1',
        title: 'رد جديد',
        message: 'نص',
        type: 'forum_reply',
        isRead: false,
        createdAt: '2026-08-25T00:00:00.000Z',
        actionPayload: { threadId: 't-1' },
    };
}

describe('incomingNotificationPopupArrival', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        showHamiNotification.mockClear();
        vi.mocked(playNotificationArrivalCue).mockClear();
    });

    it('يشغّل نغمة الوصول ولا يدفع إشعار نظام والصفحة ظاهرة', () => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
        announceIncomingNotificationArrival(makeNotif());
        expect(playNotificationArrivalCue).toHaveBeenCalledWith('community');
        expect(showHamiNotification).not.toHaveBeenCalled();
    });

    it('يدفع إشعار نظام عندما تكون الصفحة مخفية بلا نغمة داخل التطبيق', async () => {
        Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
        announceIncomingNotificationArrival(makeNotif());
        expect(playNotificationArrivalCue).not.toHaveBeenCalled();
        await vi.waitFor(() => {
            expect(showHamiNotification).toHaveBeenCalledWith(
                'community',
                expect.objectContaining({
                    title: 'رد جديد',
                    tag: 'inbox-arr-1',
                }),
            );
        });
    });
});
