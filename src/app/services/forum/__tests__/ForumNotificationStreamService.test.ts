import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/app/services/SecureAPIClient', () => ({
    SecureAPIClient: {
        fetchSecureResponse: vi.fn(() =>
            Promise.resolve({
                ok: false,
                body: null,
            }),
        ),
    },
}));

vi.mock('@/app/services/forum/forumNotificationEvents', () => ({
    emitForumUnreadCount: vi.fn(),
}));

vi.mock('@/app/services/PushNotificationService', () => ({
    PushNotificationService: { notifyForumActivity: vi.fn() },
}));

import { ForumNotificationStreamService } from '@/app/services/forum/ForumNotificationStreamService';

describe('ForumNotificationStreamService acquire/release', () => {
    beforeEach(() => {
        ForumNotificationStreamService._resetForTests();
    });

    afterEach(() => {
        ForumNotificationStreamService._resetForTests();
    });

    it('keeps stream alive until last subscriber releases', () => {
        const releaseA = ForumNotificationStreamService.acquire('user-1');
        expect(ForumNotificationStreamService.isRunning()).toBe(true);

        const releaseB = ForumNotificationStreamService.acquire('user-1');
        releaseA();
        expect(ForumNotificationStreamService.isRunning()).toBe(true);

        releaseB();
        expect(ForumNotificationStreamService.isRunning()).toBe(false);
    });
});
