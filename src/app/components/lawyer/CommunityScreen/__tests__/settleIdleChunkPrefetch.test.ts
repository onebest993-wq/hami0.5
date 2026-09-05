import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    readIdlePrefetchFailures,
    resetIdlePrefetchFailures,
    settleIdleChunkPrefetch,
} from '../settleIdleChunkPrefetch';

describe('settleIdleChunkPrefetch', () => {
    afterEach(() => {
        resetIdlePrefetchFailures();
        vi.restoreAllMocks();
    });

    it('الوعد الناجح يُسوّى بلا سجل', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        await expect(
            settleIdleChunkPrefetch('forum-test', Promise.resolve({ ok: true })),
        ).resolves.toBeUndefined();
        expect(readIdlePrefetchFailures()).toEqual([]);
        expect(warn).not.toHaveBeenCalled();
    });

    it('فشل المقطع يُسوّى ويُسمّى في السجل — لا رفض غير معالج', async () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
        const reason = new Error('chunk missing');
        await expect(
            settleIdleChunkPrefetch('forum-test', Promise.reject(reason)),
        ).resolves.toBeUndefined();
        expect(readIdlePrefetchFailures()).toEqual([
            expect.objectContaining({ label: 'forum-test', reason: 'chunk missing' }),
        ]);
        expect(warn).toHaveBeenCalledWith('[hami:prefetch] forum-test', reason);
    });
});
