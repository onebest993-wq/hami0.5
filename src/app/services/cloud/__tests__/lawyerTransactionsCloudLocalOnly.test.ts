import { beforeEach, describe, expect, it, vi } from 'vitest';

const isLawyerWorkCloudLive = vi.fn(() => false);
const kvGet = vi.fn();
const kvGetByPrefix = vi.fn();
const kvSet = vi.fn();

vi.mock('@/app/services/settings/lawyerWorkCloudGate', async (importOriginal) => {
    const actual = await importOriginal<typeof import('@/app/services/settings/lawyerWorkCloudGate')>();
    return {
        ...actual,
        isLawyerWorkCloudLive: () => isLawyerWorkCloudLive(),
    };
});

vi.mock('@/app/services/cloud/lawyerCloudKv', () => ({
    lawyerCloudKv: {
        get: (...args: unknown[]) => kvGet(...args),
        getByPrefix: (...args: unknown[]) => kvGetByPrefix(...args),
        set: (...args: unknown[]) => kvSet(...args),
        del: vi.fn(),
    },
}));

vi.mock('@/app/services/storage/readSecureOrDrainLegacySync', () => ({
    persistSecurePayloadWhenReady: vi.fn(async () => undefined),
    readSecurePayloadWhenReady: vi.fn(async () => '[]'),
    readSecureOrDrainLegacySync: vi.fn(() => null),
    writeSecureAndClearLegacySync: vi.fn(),
}));

describe('lawyerTransactionsCloud — لا شبكة بلا مزامنة عمل', () => {
    beforeEach(() => {
        isLawyerWorkCloudLive.mockReturnValue(false);
        kvGet.mockReset();
        kvGetByPrefix.mockReset();
        kvSet.mockReset();
    });

    it('getTransactions يقرأ محلياً فقط ولا يلمس KV', async () => {
        const { TransactionDB } = await import('@/app/services/cloud/lawyerTransactionsCloud');
        const rows = await TransactionDB.getTransactions('u1');
        expect(Array.isArray(rows)).toBe(true);
        expect(kvGetByPrefix).not.toHaveBeenCalled();
        expect(kvSet).not.toHaveBeenCalled();
    });

    it('saveTransaction يحفظ محلياً بلا KV', async () => {
        const { TransactionDB } = await import('@/app/services/cloud/lawyerTransactionsCloud');
        await TransactionDB.saveTransaction({
            id: 'tx-1',
            userId: 'u1',
            title: 'محلي',
            createdAt: new Date().toISOString(),
        });
        expect(kvSet).not.toHaveBeenCalled();
    });

    it('saveState للخيوط لا يدفع KV والمزامنة مطفأة', async () => {
        const { TransactionsThreadingDB } = await import(
            '@/app/services/cloud/lawyerTransactionsCloud'
        );
        await TransactionsThreadingDB.saveState('u1', {
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
        });
        expect(kvSet).not.toHaveBeenCalled();
        expect(kvGet).not.toHaveBeenCalled();
    });

    it('عند تفعيل المزامنة يُسمح بـ KV للخيوط', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        kvSet.mockResolvedValue(undefined);
        const { TransactionsThreadingDB } = await import(
            '@/app/services/cloud/lawyerTransactionsCloud'
        );
        await TransactionsThreadingDB.saveState('u1', {
            transactions: [],
            tasks: [],
            financeRecords: [],
            documents: [],
        });
        expect(kvSet).toHaveBeenCalled();
        expect(String(kvSet.mock.calls[0]?.[0])).toContain('transactionsThreading:u1:state');
    });
});
