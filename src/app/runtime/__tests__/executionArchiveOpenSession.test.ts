import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
    ensureExecutionArchiveOpenReady,
    prefetchExecutionArchiveOpen,
    resetExecutionArchiveOpenSessionForTests,
} from '@/app/runtime/executionArchiveOpenSession';

const hubMocks = vi.hoisted(() => ({
    loadExecutionArchiveHubModule: vi.fn(() => Promise.resolve({})),
    prefetchExecutionArchiveContent: vi.fn(),
}));

vi.mock('@/app/runtime/hubArchiveLoader', () => hubMocks);
vi.mock(
    '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry',
    () => ({ LawyerDashboardExecutionOverlayEntry: () => null }),
);

describe('executionArchiveOpenSession', () => {
    beforeEach(() => {
        resetExecutionArchiveOpenSessionForTests();
        vi.clearAllMocks();
    });

    it('ensure يعيد استخدام نفس الوعد', async () => {
        const a = ensureExecutionArchiveOpenReady();
        const b = ensureExecutionArchiveOpenReady();
        expect(a).toBe(b);
        await expect(a).resolves.toBe(true);
        expect(hubMocks.loadExecutionArchiveHubModule).toHaveBeenCalledTimes(1);
    });

    it('prefetch يطلق التحميل دون رمي', () => {
        expect(() => prefetchExecutionArchiveOpen()).not.toThrow();
        expect(hubMocks.prefetchExecutionArchiveContent).toHaveBeenCalled();
    });
});
