import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';

const ensureTransactionsUserBound = vi.fn();
const warmKeys = vi.fn(async () => undefined);

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    ensureTransactionsUserBound: (...args: unknown[]) => ensureTransactionsUserBound(...args),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        warmKeys: (...args: unknown[]) => warmKeys(...args),
    },
}));

describe('warmTransactionsDiskRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يربط المستخدم فوراً ويسخّن مفاتيح التشفير المحلية', () => {
        warmTransactionsDiskRead('lawyer-1');
        expect(ensureTransactionsUserBound).toHaveBeenCalledWith('lawyer-1');
        expect(warmKeys).toHaveBeenCalledWith([
            'hami:transactions:v1',
            'hami:transactionsThreading:v1:lawyer-1',
        ]);
    });

    it('يتجاهل userId فارغ', () => {
        warmTransactionsDiskRead('');
        warmTransactionsDiskRead(null);
        expect(ensureTransactionsUserBound).not.toHaveBeenCalled();
        expect(warmKeys).not.toHaveBeenCalled();
    });
});
