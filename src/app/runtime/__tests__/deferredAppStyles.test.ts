import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    ensureDeferredAppStylesLoaded,
    isDeferredAppStylesLoaded,
    resetDeferredAppStylesForTests,
    scheduleDeferredAppStyles,
} from '@/app/runtime/deferredAppStyles';

vi.mock('@/styles/deferred-app.css', () => ({}));

describe('deferredAppStyles', () => {
    beforeEach(() => {
        resetDeferredAppStylesForTests();
        vi.stubGlobal(
            'requestAnimationFrame',
            (cb: FrameRequestCallback) => window.setTimeout(() => cb(0), 0) as unknown as number,
        );
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        resetDeferredAppStylesForTests();
    });

    it('ensureDeferredAppStylesLoaded يحمّل الحزمة مرة واحدة', async () => {
        expect(isDeferredAppStylesLoaded()).toBe(false);
        await ensureDeferredAppStylesLoaded();
        expect(isDeferredAppStylesLoaded()).toBe(true);
        expect(document.documentElement.dataset.hamiDeferredApp).toBe('1');
        await ensureDeferredAppStylesLoaded();
        expect(isDeferredAppStylesLoaded()).toBe(true);
    });

    it('scheduleDeferredAppStyles لا يرمي ويعيد الاستخدام الآمن', async () => {
        scheduleDeferredAppStyles();
        scheduleDeferredAppStyles();
        await ensureDeferredAppStylesLoaded();
        expect(isDeferredAppStylesLoaded()).toBe(true);
    });
});
