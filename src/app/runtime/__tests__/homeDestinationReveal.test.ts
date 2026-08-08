import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
    getHomeDestinationRevealTimeoutMs,
    resetHomeDestinationRevealForTests,
    whenHomeDestinationReady,
    HOME_DESTINATION_REVEALED_SESSION_KEY,
} from '@/app/runtime/homeDestinationReveal';

vi.mock('@/app/runtime/deferredAppStyles', () => ({
    ensureDeferredAppStylesLoaded: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/bootstrap/homeDockBootGate', () => ({
    waitForHomeDockBootChunk: vi.fn(() => Promise.resolve()),
}));

vi.mock('@/app/components/lawyer/dashboard/HomeForumSignalsIsland', () => ({
    default: () => null,
}));

vi.mock('@/app/components/lawyer/dashboard/CommandCenterOverlays', () => ({
    CommandCenterOverlays: () => null,
}));

describe('homeDestinationReveal', () => {
    beforeEach(() => {
        resetHomeDestinationRevealForTests();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('يكشف فوراً إذا سبق الكشف في الجلسة', async () => {
        sessionStorage.setItem(HOME_DESTINATION_REVEALED_SESSION_KEY, '1');
        await expect(whenHomeDestinationReady()).resolves.toBeUndefined();
    });

    it('ينتظر الأصول الحرجة ثم يعلّم الجلسة', async () => {
        const promise = whenHomeDestinationReady(500);
        await vi.runAllTimersAsync();
        await promise;
        expect(sessionStorage.getItem(HOME_DESTINATION_REVEALED_SESSION_KEY)).toBe('1');
    });

    it('يحترم مهلة قصوى على الويب', () => {
        expect(getHomeDestinationRevealTimeoutMs()).toBeGreaterThan(0);
    });
});
