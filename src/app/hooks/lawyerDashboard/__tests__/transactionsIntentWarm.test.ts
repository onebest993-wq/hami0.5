import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    registerTransactionsWarmUserId,
    warmTransactionsCloudIdle,
    warmTransactionsOnHover,
    warmTransactionsOnOpen,
} from '@/app/hooks/lawyerDashboard/transactionsIntentWarm';

const prefetchTransactionsHubModule = vi.fn();
const prefetchTransactionsCloudModule = vi.fn();
const warmTransactionsThreadingStore = vi.fn(() => Promise.resolve());
const isLitePerformanceActive = vi.fn(() => false);

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    loadTransactionsHubModule: vi.fn(() => Promise.resolve({})),
    prefetchTransactionsHubModule: (...args: unknown[]) => prefetchTransactionsHubModule(...args),
}));

vi.mock('@/app/services/transactions/transactionsCloudLoader', () => ({
    prefetchTransactionsCloudModule: (...args: unknown[]) => prefetchTransactionsCloudModule(...args),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => fn(),
}));

vi.mock('@/app/runtime/devicePerformanceTier', () => ({
    isLitePerformanceActive: (...args: unknown[]) => isLitePerformanceActive(...args),
}));

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    warmTransactionsThreadingStore: (...args: unknown[]) => warmTransactionsThreadingStore(...args),
    ensureTransactionsUserBound: vi.fn(),
}));

describe('transactionsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        isLitePerformanceActive.mockReturnValue(false);
    });

    it('يحمّل chunk المعاملات عند hover', () => {
        warmTransactionsOnHover();
        expect(prefetchTransactionsHubModule).toHaveBeenCalledTimes(1);
    });

    it('يُحمّي المخزن عند hover مع userId مسجّل', () => {
        const unregister = registerTransactionsWarmUserId('lawyer-1');
        warmTransactionsOnHover();
        expect(warmTransactionsThreadingStore).toHaveBeenCalledWith('lawyer-1');
        unregister();
    });

    it('على lite: hover يسخّن الـ chunk فقط بلا مخزن', () => {
        isLitePerformanceActive.mockReturnValue(true);
        const unregister = registerTransactionsWarmUserId('lawyer-1');
        warmTransactionsOnHover();
        expect(prefetchTransactionsHubModule).toHaveBeenCalledTimes(1);
        expect(warmTransactionsThreadingStore).not.toHaveBeenCalled();
        unregister();
    });

    it('يُحمّي المخزن عند الفتح مع userId', () => {
        warmTransactionsOnOpen('lawyer-1');
        expect(prefetchTransactionsHubModule).toHaveBeenCalled();
        expect(warmTransactionsThreadingStore).toHaveBeenCalledWith('lawyer-1');
    });

    it('يتخطى warm المخزن بدون userId', () => {
        warmTransactionsOnOpen(null);
        expect(warmTransactionsThreadingStore).not.toHaveBeenCalled();
    });

    it('cloud idle لا يلمس المخزن', () => {
        warmTransactionsCloudIdle();
        expect(prefetchTransactionsCloudModule).toHaveBeenCalledTimes(1);
        expect(warmTransactionsThreadingStore).not.toHaveBeenCalled();
    });
});
