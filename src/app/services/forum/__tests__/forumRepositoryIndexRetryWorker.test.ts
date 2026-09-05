import { afterEach, describe, expect, it, vi } from 'vitest';

const flush = vi.fn(async () => []);

vi.mock('@/app/services/forum/forumRepositoryIndexQueue', () => ({
    flushForumRepositoryIndexQueue: () => flush(),
}));

const {
    startForumRepositoryIndexRetryWorker,
    stopForumRepositoryIndexRetryWorker,
} = await import('@/app/services/forum/forumRepositoryIndexRetryWorker');

describe('عامل إعادة فهرسة المستودع', () => {
    afterEach(() => {
        stopForumRepositoryIndexRetryWorker();
        vi.useRealTimers();
        flush.mockReset();
        flush.mockResolvedValue([]);
    });

    it('يفرّغ فوراً ثم يعيد المحاولة بعد ثانيتين', async () => {
        vi.useFakeTimers();
        startForumRepositoryIndexRetryWorker();
        await vi.advanceTimersByTimeAsync(0);
        expect(flush).toHaveBeenCalledTimes(1);
        await vi.advanceTimersByTimeAsync(2_000);
        expect(flush).toHaveBeenCalledTimes(2);
    });

    it('يعيد المحاولة عند online', async () => {
        vi.useFakeTimers();
        startForumRepositoryIndexRetryWorker();
        await vi.advanceTimersByTimeAsync(0);
        flush.mockClear();
        window.dispatchEvent(new Event('online'));
        expect(flush).toHaveBeenCalledTimes(1);
    });

    it('يتوقف عن الجدولة بعد stop', async () => {
        vi.useFakeTimers();
        startForumRepositoryIndexRetryWorker();
        await vi.advanceTimersByTimeAsync(0);
        stopForumRepositoryIndexRetryWorker();
        flush.mockClear();
        await vi.advanceTimersByTimeAsync(120_000);
        expect(flush).not.toHaveBeenCalled();
    });
});
