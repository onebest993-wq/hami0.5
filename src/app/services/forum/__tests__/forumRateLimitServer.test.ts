import { describe, it, expect, beforeEach, vi } from 'vitest';

const consumeRateLimitSlotMock = vi.fn();

vi.mock('@/app/api/security/wifeRateLimitStore', () => ({
    consumeRateLimitSlot: (...args: unknown[]) => consumeRateLimitSlotMock(...args),
}));

import { checkForumActionRateLimit } from '../forumRateLimitServer';

describe('checkForumActionRateLimit (server)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        consumeRateLimitSlotMock.mockResolvedValue(true);
    });

    it('يرفض userId فارغاً', async () => {
        expect(await checkForumActionRateLimit('', 'post')).toBe(false);
        expect(consumeRateLimitSlotMock).not.toHaveBeenCalled();
    });

    it('يستدعي consumeRateLimitSlot لمنشور', async () => {
        expect(await checkForumActionRateLimit('user-1', 'post')).toBe(true);
        expect(consumeRateLimitSlotMock).toHaveBeenCalledWith('user-1', {
            scope: 'forum:post:burst',
            maxRequests: 1,
            windowMs: 30_000,
        });
    });

    it('يتطلب قواعد متعددة للتعليق', async () => {
        consumeRateLimitSlotMock.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
        expect(await checkForumActionRateLimit('user-1', 'comment')).toBe(false);
        expect(consumeRateLimitSlotMock).toHaveBeenCalledTimes(2);
    });

    it('يرفض عند امتلاء أي bucket', async () => {
        consumeRateLimitSlotMock.mockResolvedValue(false);
        expect(await checkForumActionRateLimit('user-1', 'upvote')).toBe(false);
    });

    it('يمرّر postId للبلاغ', async () => {
        await checkForumActionRateLimit('user-1', 'report', { postId: 'p1' });
        expect(consumeRateLimitSlotMock).toHaveBeenCalledWith('user-1:p1', expect.objectContaining({
            scope: 'forum:report',
        }));
    });
});
