import { afterEach, describe, expect, it, vi } from 'vitest';
import {
    prefetchHubArchiveIntentDebounced,
    prefetchHubArchiveIntentImmediate,
    resetHubArchivePrefetchGateForTests,
    scheduleTransactionHubTileIdlePrefetch,
} from '@/app/hooks/lawyerDashboard/hubArchivePrefetchGate';

const prefetchHubArchiveIntent = vi.fn();
vi.mock('@/app/hooks/lawyerDashboard/lawyerDashboardIntentPrefetch', () => ({
    prefetchHubArchiveIntent: (...args: unknown[]) => prefetchHubArchiveIntent(...args),
}));

describe('hubArchivePrefetchGate', () => {
    afterEach(() => {
        vi.clearAllMocks();
        resetHubArchivePrefetchGateForTests();
        vi.useRealTimers();
    });

    it('debounced يستدعي hover مرة واحدة ضمن cooldown', () => {
        prefetchHubArchiveIntentDebounced('transaction');
        prefetchHubArchiveIntentDebounced('transaction');
        expect(prefetchHubArchiveIntent).toHaveBeenCalledTimes(1);
        expect(prefetchHubArchiveIntent).toHaveBeenCalledWith('transaction', 'hover', undefined);
    });

    it('immediate يستدعي open مع userId', () => {
        prefetchHubArchiveIntentDebounced('transaction');
        prefetchHubArchiveIntentImmediate('transaction', 'lawyer-1');
        expect(prefetchHubArchiveIntent).toHaveBeenCalledTimes(2);
        expect(prefetchHubArchiveIntent).toHaveBeenLastCalledWith('transaction', 'open', 'lawyer-1');
    });

    it('scheduleTransactionHubTileIdlePrefetch مرة واحدة', () => {
        vi.useFakeTimers();
        if (typeof window.requestIdleCallback !== 'function') {
            (window as Window & { requestIdleCallback: typeof requestIdleCallback }).requestIdleCallback = (
                cb: IdleRequestCallback,
            ) => {
                cb({ didTimeout: false, timeRemaining: () => 50 } as IdleDeadline);
                return 1;
            };
        }
        scheduleTransactionHubTileIdlePrefetch();
        scheduleTransactionHubTileIdlePrefetch();
        expect(prefetchHubArchiveIntent).toHaveBeenCalledTimes(1);
    });
});
