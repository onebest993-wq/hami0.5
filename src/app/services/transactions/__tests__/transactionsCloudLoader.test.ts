import { describe, expect, it, vi, beforeEach } from 'vitest';
import {
    fetchTransactionsThreadingState,
    prefetchTransactionsCloudModule,
    resetTransactionsCloudLoaderForTests,
} from '@/app/services/transactions/transactionsCloudLoader';

vi.mock('@/app/services/cloud/lawyerTransactionsCloud', () => ({
    TransactionsThreadingDB: {
        getState: vi.fn().mockResolvedValue({
            schemaVersion: 1,
            userId: 'user-1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
        }),
    },
}));

describe('transactionsCloudLoader', () => {
    beforeEach(() => {
        resetTransactionsCloudLoaderForTests();
        vi.clearAllMocks();
    });

    it('fetchTransactionsThreadingState يُفوّض إلى TransactionsThreadingDB', async () => {
        const state = await fetchTransactionsThreadingState('user-1');
        expect(state?.userId).toBe('user-1');
    });

    it('prefetchTransactionsCloudModule لا يرمي', () => {
        expect(() => prefetchTransactionsCloudModule()).not.toThrow();
    });
});
