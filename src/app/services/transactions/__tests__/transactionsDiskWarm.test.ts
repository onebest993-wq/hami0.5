import { describe, expect, it, vi, beforeEach } from 'vitest';
import { warmTransactionsDiskRead } from '@/app/services/transactions/transactionsDiskWarm';

const ensureTransactionsUserBound = vi.fn();
const warmKeys = vi.fn(async () => undefined);
const isUnreadSync = vi.fn(() => true);

vi.mock('@/app/modules/transactionsThreading/store', () => ({
    ensureTransactionsUserBound: (...args: unknown[]) => ensureTransactionsUserBound(...args),
}));

vi.mock('@/app/services/SecureStoreService', () => ({
    default: {
        warmKeys: (...args: unknown[]) => warmKeys(...args),
        isUnreadSync: (...args: unknown[]) => isUnreadSync(...args),
    },
}));

describe('warmTransactionsDiskRead', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يربط فوراً ويسخّن مفتاح الخيوط فقط ثم يعيد الربط بعد الفك', async () => {
        warmTransactionsDiskRead('lawyer-1');
        expect(ensureTransactionsUserBound).toHaveBeenCalledTimes(1);
        expect(ensureTransactionsUserBound).toHaveBeenCalledWith('lawyer-1');
        expect(warmKeys.mock.calls[0]?.[0]).toEqual(['hami:transactionsThreading:v1:lawyer-1']);
        await vi.waitFor(() => {
            expect(ensureTransactionsUserBound).toHaveBeenCalledTimes(2);
        });
    });

    it('إن فُكّ المفتاح مسبقاً لا يعيد warmKeys ويُعلن الجاهزية', () => {
        isUnreadSync.mockReturnValueOnce(false);
        const onReady = vi.fn();
        window.addEventListener('hami:tx-threading-disk-ready', onReady);
        warmTransactionsDiskRead('lawyer-1');
        expect(warmKeys).not.toHaveBeenCalled();
        expect(ensureTransactionsUserBound).toHaveBeenCalledTimes(1);
        expect(onReady).toHaveBeenCalledTimes(1);
        window.removeEventListener('hami:tx-threading-disk-ready', onReady);
    });

    it('يتجاهل userId فارغ', () => {
        warmTransactionsDiskRead('');
        warmTransactionsDiskRead(null);
        expect(ensureTransactionsUserBound).not.toHaveBeenCalled();
        expect(warmKeys).not.toHaveBeenCalled();
    });
});
