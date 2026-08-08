import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';

const ensureTransactionsUserBound = vi.fn();

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    ensureTransactionsUserBound: (...args: unknown[]) => ensureTransactionsUserBound(...args),
}));

describe('warmTransactionsDiskRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يربط المستخدم فوراً من المخزن المحلي', () => {
        warmTransactionsDiskRead('lawyer-1');
        expect(ensureTransactionsUserBound).toHaveBeenCalledWith('lawyer-1');
    });

    it('يتجاهل userId فارغ', () => {
        warmTransactionsDiskRead('');
        warmTransactionsDiskRead(null);
        expect(ensureTransactionsUserBound).not.toHaveBeenCalled();
    });
});
