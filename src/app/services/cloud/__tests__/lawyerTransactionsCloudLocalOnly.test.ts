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

const persistSecurePayloadWhenReady = vi.fn(async () => undefined);
const readSecurePayloadWhenReady = vi.fn(async () => '[]');
const readSecureOrDrainLegacySync = vi.fn(() => null);

vi.mock('@/app/services/storage/readSecureOrDrainLegacySync', () => ({
    persistSecurePayloadWhenReady: (...args: unknown[]) => persistSecurePayloadWhenReady(...args),
    readSecurePayloadWhenReady: (...args: unknown[]) => readSecurePayloadWhenReady(...args),
    readSecureOrDrainLegacySync: (...args: unknown[]) => readSecureOrDrainLegacySync(...args),
    writeSecureAndClearLegacySync: vi.fn(),
}));

describe('lawyerTransactionsCloud — لا شبكة بلا مزامنة عمل', () => {
    beforeEach(() => {
        isLawyerWorkCloudLive.mockReturnValue(false);
        kvGet.mockReset();
        kvGetByPrefix.mockReset();
        kvSet.mockReset();
        persistSecurePayloadWhenReady.mockClear();
        persistSecurePayloadWhenReady.mockResolvedValue(undefined);
        readSecureOrDrainLegacySync.mockReset();
        readSecureOrDrainLegacySync.mockReturnValue(null);
        readSecurePayloadWhenReady.mockReset();
        readSecurePayloadWhenReady.mockResolvedValue('[]');
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
            documents: [],
        });
        expect(kvSet).toHaveBeenCalled();
        expect(String(kvSet.mock.calls[0]?.[0])).toContain('transactionsThreading:u1:state');
    });

    it('دمج KV يحافظ على معاملة محلية أمام سحابة أحدث فارغة', async () => {
        isLawyerWorkCloudLive.mockReturnValue(true);
        const localState = {
            schemaVersion: 1,
            userId: 'u1',
            updatedAt: '2026-01-01T00:00:00.000Z',
            transactions: [
                {
                    id: 'local-1',
                    title: 'محلية',
                    clientName: 'موكل',
                    targetDepartment: 'دائرة',
                    status: 'Active',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ],
            tasks: [],
            documents: [],
        };
        readSecureOrDrainLegacySync.mockReturnValue(JSON.stringify(localState));
        kvGet.mockResolvedValue({
            schemaVersion: 1,
            userId: 'u1',
            updatedAt: '2026-01-03T00:00:00.000Z',
            transactions: [],
            tasks: [],
            documents: [],
        });

        const { TransactionsThreadingDB } = await import(
            '@/app/services/cloud/lawyerTransactionsCloud'
        );
        await TransactionsThreadingDB.getState('u1');

        await vi.waitFor(() => {
            expect(persistSecurePayloadWhenReady).toHaveBeenCalled();
        });
        const savedRaw = persistSecurePayloadWhenReady.mock.calls.find((call) =>
            String(call[0]).includes('transactionsThreading'),
        )?.[1];
        expect(typeof savedRaw).toBe('string');
        const saved = JSON.parse(String(savedRaw)) as { transactions: Array<{ id: string }> };
        expect(saved.transactions.some((row) => row.id === 'local-1')).toBe(true);
    });
});
