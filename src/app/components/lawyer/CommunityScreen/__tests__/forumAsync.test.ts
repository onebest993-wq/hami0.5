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
});
