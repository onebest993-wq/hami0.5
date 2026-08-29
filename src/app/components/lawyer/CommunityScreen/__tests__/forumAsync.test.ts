import { describe, expect, it, vi } from 'vitest';
import { withForumAsyncTimeout } from '@/app/components/lawyer/CommunityScreen/forumAsync';

describe('withForumAsyncTimeout', () => {
    it('يُرجع النتيجة عند اكتمال الوعد بسرعة', async () => {
        await expect(withForumAsyncTimeout(Promise.resolve(['a']), 100, [])).resolves.toEqual(['a']);
    });

    it('يُرجع fallback عند تجاوز المهلة', async () => {
        vi.useFakeTimers();
        const slow = new Promise<string[]>((resolve) => {
            window.setTimeout(() => resolve(['late']), 5_000);
        });
        const pending = withForumAsyncTimeout(slow, 50, []);
        await vi.advanceTimersByTimeAsync(60);
        await expect(pending).resolves.toEqual([]);
        vi.useRealTimers();
    });

    it('يستدعي fallback كدالة عند المهلة حتى يستخدم أحدث مرجع', async () => {
        vi.useFakeTimers();
        let latest = 'old';
        const slow = new Promise<string>(() => undefined);
        const pending = withForumAsyncTimeout(slow, 50, () => latest);
        latest = 'fresh';
        await vi.advanceTimersByTimeAsync(60);
        await expect(pending).resolves.toBe('fresh');
        vi.useRealTimers();
    });

    it('لا يترك رفض الوعد الأصلي بعد المهلة دون معالجة', async () => {
        vi.useFakeTimers();
        const unhandled: unknown[] = [];
        const onUnhandled = (reason: unknown) => {
            unhandled.push(reason);
        };
        process.on('unhandledRejection', onUnhandled);
        let rejectLate: (error: Error) => void = () => undefined;
        const slow = new Promise<string>((_, reject) => {
            rejectLate = reject;
        });
        const pending = withForumAsyncTimeout(slow, 50, 'fallback');
        await vi.advanceTimersByTimeAsync(60);
        await expect(pending).resolves.toBe('fallback');
        rejectLate(new Error('late-fail'));
        await Promise.resolve();
        await Promise.resolve();
        process.off('unhandledRejection', onUnhandled);
        vi.useRealTimers();
        expect(unhandled).toEqual([]);
    });
});
