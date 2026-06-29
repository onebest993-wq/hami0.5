import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('PrefetchScheduler intent-only', () => {
    beforeEach(() => {
        document.documentElement.dataset.hamiLite = '0';
        vi.stubGlobal('requestIdleCallback', (cb: IdleRequestCallback) => {
            cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
            return 1;
        });
    });

    afterEach(() => {
        delete document.documentElement.dataset.hamiLite;
        vi.unstubAllGlobals();
        vi.resetModules();
    });

    it('enqueueWave لا يشغّل loaders', async () => {
        const loader = vi.fn(() => Promise.resolve());
        const { PrefetchScheduler } = await import('../prefetchScheduler');
        PrefetchScheduler.enqueueWave([{ id: 'test-wave', loader }], { delayMs: 0 });
        await new Promise((r) => setTimeout(r, 10));
        expect(loader).not.toHaveBeenCalled();
    });

    it('planAuthenticatedEntry لا يشغّل موجات', async () => {
        const { PrefetchScheduler } = await import('../prefetchScheduler');
        expect(() => PrefetchScheduler.planAuthenticatedEntry()).not.toThrow();
    });
});
