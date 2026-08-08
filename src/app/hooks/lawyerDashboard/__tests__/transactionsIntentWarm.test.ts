import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    registerTransactionsWarmUserId,
    warmTransactionsOnHover,
    warmTransactionsOnOpen,
} from '@/app/hooks/lawyerDashboard/transactionsIntentWarm';

const loadTransactionsHubModule = vi.fn(() => Promise.resolve({}));
const warmTransactionsThreadingStore = vi.fn(() => Promise.resolve());

vi.mock('@/app/runtime/transactionsHubLoader', () => ({
    loadTransactionsHubModule: () => loadTransactionsHubModule(),
    prefetchTransactionsHubModule: vi.fn(),
}));

vi.mock('@/app/services/transactions/transactionsCloudLoader', () => ({
    prefetchTransactionsCloudModule: vi.fn(),
}));

vi.mock('@/app/runtime/mobileRuntimePolicy', () => ({
    scheduleIdleWork: (fn: () => void) => fn(),
}));

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    warmTransactionsThreadingStore: (...args: unknown[]) => warmTransactionsThreadingStore(...args),
    ensureTransactionsUserBound: vi.fn(),
}));

describe('transactionsIntentWarm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يحمّل chunk المعاملات عند hover', () => {
        warmTransactionsOnHover();
        expect(loadTransactionsHubModule).toHaveBeenCalledTimes(1);
    });

    it('يُحمّي المخزن عند hover مع userId مسجّل', () => {
        const unregister = registerTransactionsWarmUserId('lawyer-1');
        warmTransactionsOnHover();
        expect(warmTransactionsThreadingStore).toHaveBeenCalledWith('lawyer-1');
        unregister();
    });

    it('يُحمّي المخزن عند الفتح مع userId', () => {
        warmTransactionsOnOpen('lawyer-1');
        expect(loadTransactionsHubModule).toHaveBeenCalled();
        expect(warmTransactionsThreadingStore).toHaveBeenCalledWith('lawyer-1');
    });

    it('يتخطى warm المخزن بدون userId', () => {
        warmTransactionsOnOpen(null);
        expect(warmTransactionsThreadingStore).not.toHaveBeenCalled();
    });
});
