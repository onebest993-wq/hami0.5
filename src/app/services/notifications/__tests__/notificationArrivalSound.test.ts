import { describe, expect, it, vi, beforeEach } from 'vitest';
import { notificationChannelFromModel } from '@/app/services/notifications/notificationChannelFromModel';
import {
    playNotificationArrivalCue,
    resetNotificationArrivalSoundForTests,
} from '@/app/services/notifications/notificationArrivalSound';

vi.mock('@/app/services/notifications/notificationAlertPolicy', () => ({
    shouldPlayChannelSound: vi.fn(() => true),
    shouldVibrateChannel: vi.fn(() => false),
}));

describe('notificationChannelFromModel', () => {
    it('يربط forum → community', () => {
        expect(
            notificationChannelFromModel({
                type: 'forum_reply',
                category: 'forum',
            }),
        ).toBe('community');
    });

    it('يربط execution → execution', () => {
        expect(
            notificationChannelFromModel({
                type: 'system_alert',
                category: 'execution',
            }),
        ).toBe('execution');
    });
});

describe('notificationArrivalSound', () => {
    beforeEach(() => {
        resetNotificationArrivalSoundForTests();
    });

    it('لا يرمي عند غياب AudioContext', async () => {
        await expect(playNotificationArrivalCue('community')).resolves.toBeUndefined();
    });

    it('معاينة النغمة لا ترمي', async () => {
        const { previewNotificationArrivalCue } = await import(
            '@/app/services/notifications/notificationArrivalSound'
        );
        await expect(previewNotificationArrivalCue()).resolves.toBeUndefined();
    });
});
