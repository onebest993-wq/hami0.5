import { describe, expect, it, vi, beforeEach } from 'vitest';
import { isTransactionsChunkLoadError } from '../transactionsChunkLoadError';
import { createTransactionsDetailsReveal } from '../transactionsDetailsReveal';
import { scheduleTransactionsIdle } from '../transactionsFeatureLoader';

vi.mock('../transactionsFeatureLoader', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../transactionsFeatureLoader')>();
    return {
        ...actual,
        prefetchTransactionsDetailsScreen: vi.fn(() => Promise.resolve()),
    };
});

import { prefetchTransactionsDetailsScreen } from '../transactionsFeatureLoader';

describe('isTransactionsChunkLoadError', () => {
    it('يميّز فشل مقطع Vite عن خطأ رسم', () => {
        expect(
            isTransactionsChunkLoadError(
                new Error('Failed to fetch dynamically imported module: /assets/foo.js'),
            ),
        ).toBe(true);
        expect(isTransactionsChunkLoadError(Object.assign(new Error('load'), { name: 'ChunkLoadError' }))).toBe(
            true,
        );
        expect(isTransactionsChunkLoadError(new Error("Cannot read properties of null (reading 'id')"))).toBe(
            false,
        );
    });
});

describe('createTransactionsDetailsReveal', () => {
    beforeEach(() => {
        vi.mocked(prefetchTransactionsDetailsScreen).mockReset();
        vi.mocked(prefetchTransactionsDetailsScreen).mockResolvedValue(undefined);
    });

    it('لا ينزع القائمة حتى يجهز المقطع', async () => {
        const go = vi.fn();
        const onChunkFailed = vi.fn();
        const { reveal } = createTransactionsDetailsReveal({ go, onChunkFailed });
        reveal('tx-1');
        expect(go).not.toHaveBeenCalled();
        await Promise.resolve();
        expect(go).toHaveBeenCalledWith('tx-1');
        expect(onChunkFailed).not.toHaveBeenCalled();
    });

    it('يلغي فتحاً قديماً بعد invalidate', async () => {
        let resolvePrefetch: () => void = () => undefined;
        vi.mocked(prefetchTransactionsDetailsScreen).mockImplementation(
            () =>
                new Promise((resolve) => {
                    resolvePrefetch = () => resolve(undefined);
                }),
        );
        const go = vi.fn();
        const { reveal, invalidate } = createTransactionsDetailsReveal({
            go,
            onChunkFailed: vi.fn(),
        });
        reveal('tx-old');
        invalidate();
        resolvePrefetch();
        await Promise.resolve();
        expect(go).not.toHaveBeenCalled();
    });
});

describe('scheduleTransactionsIdle', () => {
    it('يستخدم requestIdleCallback عند توفره', () => {
        const work = vi.fn();
        const ric = vi.fn((cb: IdleRequestCallback) => {
            cb({ didTimeout: false, timeRemaining: () => 12 } as IdleDeadline);
            return 7;
        });
        const original = window.requestIdleCallback;
        window.requestIdleCallback = ric as typeof window.requestIdleCallback;
        const cancel = vi.fn();
        window.cancelIdleCallback = cancel;
        const stop = scheduleTransactionsIdle(work);
        expect(ric).toHaveBeenCalled();
        expect(work).toHaveBeenCalledTimes(1);
        stop();
        expect(cancel).toHaveBeenCalledWith(7);
        window.requestIdleCallback = original;
    });
});
