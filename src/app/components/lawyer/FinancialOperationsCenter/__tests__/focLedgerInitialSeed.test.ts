import { beforeEach, describe, expect, it, vi } from 'vitest';

const storageGet = vi.fn();
const hydrateUnifiedLedgerFromRawStorage = vi.fn();
const seedUnifiedLedgerStoreForExecution = vi.fn();
const getLatestUnifiedCollectionDecisionState = vi.fn(() => undefined);

vi.mock('@/app/utils/storageCache', () => ({
    storageCache: {
        get: (...args: unknown[]) => storageGet(...args),
        set: vi.fn(),
        invalidate: vi.fn(),
    },
}));

vi.mock('@/app/utils/executorDecisionReadQueries', () => ({
    getLatestUnifiedCollectionDecisionState: (...args: unknown[]) =>
        getLatestUnifiedCollectionDecisionState(...args),
    hasApprovedUnifiedCollection: vi.fn(() => false),
}));

vi.mock('../unifiedLedgerHydrate', async () => {
    const actual = await vi.importActual<typeof import('../unifiedLedgerHydrate')>(
        '../unifiedLedgerHydrate',
    );
    return {
        ...actual,
        hydrateUnifiedLedgerFromRawStorage: (...args: unknown[]) =>
            hydrateUnifiedLedgerFromRawStorage(...args),
        seedUnifiedLedgerStoreForExecution: (...args: unknown[]) =>
            seedUnifiedLedgerStoreForExecution(...args),
    };
});

describe('readInitialFocLedgerStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يعيد emptyStore عند غياب executionId', async () => {
        const { readInitialFocLedgerStore } = await import('../useFocLedgerStore');
        const store = readInitialFocLedgerStore(undefined, {
            principal_amount: 100,
            courtOrderedFeesSafe: 0,
            evictionLawyerFeeWaivedAtIntake: false,
            executionExpensesSumSafe: 0,
            evictionCaseExpensesSumSafe: 0,
        });
        expect(store.seeded).toBe(false);
        expect(storageGet).not.toHaveBeenCalled();
    });

    it('يرطّب من التخزين عند وجود raw — بلا empty flash', async () => {
        storageGet.mockReturnValue({ seeded: true, payments: [] });
        hydrateUnifiedLedgerFromRawStorage.mockReturnValue({
            store: { seeded: true, payments: [], lawyerFees: [], expenses: [] },
            persistImmediately: false,
        });

        const { readInitialFocLedgerStore } = await import('../useFocLedgerStore');
        const store = readInitialFocLedgerStore('exec-1', {
            principal_amount: 500,
            courtOrderedFeesSafe: 10,
            evictionLawyerFeeWaivedAtIntake: false,
            executionExpensesSumSafe: 0,
            evictionCaseExpensesSumSafe: 0,
        });

        expect(hydrateUnifiedLedgerFromRawStorage).toHaveBeenCalled();
        expect(store.seeded).toBe(true);
        expect(seedUnifiedLedgerStoreForExecution).not.toHaveBeenCalled();
    });

    it('يبذر وعاءً جديداً عند غياب التخزين', async () => {
        storageGet.mockReturnValue(null);
        seedUnifiedLedgerStoreForExecution.mockReturnValue({
            seeded: true,
            payments: [],
            lawyerFees: [],
            expenses: [],
        });

        const { readInitialFocLedgerStore } = await import('../useFocLedgerStore');
        const store = readInitialFocLedgerStore('exec-2', {
            principal_amount: 200,
            courtOrderedFeesSafe: 0,
            evictionLawyerFeeWaivedAtIntake: false,
            executionExpensesSumSafe: 5,
            evictionCaseExpensesSumSafe: 0,
        });

        expect(seedUnifiedLedgerStoreForExecution).toHaveBeenCalled();
        expect(store.seeded).toBe(true);
    });
});
