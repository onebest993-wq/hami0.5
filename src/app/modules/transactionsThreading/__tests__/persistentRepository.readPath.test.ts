import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';

const getState = vi.fn(async () => null);
const saveState = vi.fn(async () => undefined);

vi.mock('@/app/services/cloud/lawyerTransactionsCloud', () => ({
    TransactionsThreadingDB: {
        getState: (...args: unknown[]) => getState(...args),
        saveState: (...args: unknown[]) => saveState(...args),
    },
}));

vi.mock('@/app/services/transactions/transactionsThreadingMirror', () => ({
    mirrorTransactionsThreadingLocalSync: vi.fn(),
}));

vi.mock('@/app/services/transactions/transactionsThreadingDumpBridge', () => ({
    emitTransactionsThreadingDump: vi.fn(),
}));

const seedTx = {
    id: 'tx-1',
    title: 'معاملة',
    clientName: 'موكل',
    targetDepartment: 'دائرة',
    status: TransactionStatus.Active,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('PersistentTransactionsThreadingRepository — مسار القراءة بلا سحابة', () => {
    beforeEach(() => {
        getState.mockClear();
        saveState.mockClear();
    });

    it('list/get لا تستدعي TransactionsThreadingDB', async () => {
        const { PersistentTransactionsThreadingRepository } = await import(
            '@/app/modules/transactionsThreading/persistentRepository'
        );
        const repo = new PersistentTransactionsThreadingRepository('lawyer-1', {
            transactions: [seedTx],
        });

        await expect(repo.listTransactions()).resolves.toHaveLength(1);
        await expect(repo.getTransaction('tx-1')).resolves.toMatchObject({ id: 'tx-1' });
        await expect(repo.listTasks('tx-1')).resolves.toEqual([]);
        await expect(repo.getTask('missing')).resolves.toBeUndefined();
        await expect(repo.listDocuments('tx-1')).resolves.toEqual([]);
        await expect(repo.getDocument('missing')).resolves.toBeUndefined();

        await Promise.resolve();
        expect(getState).not.toHaveBeenCalled();
        expect(saveState).not.toHaveBeenCalled();
    });

    it('الحفظ يدمج السحابة قبل الكتابة', async () => {
        const { PersistentTransactionsThreadingRepository } = await import(
            '@/app/modules/transactionsThreading/persistentRepository'
        );
        const repo = new PersistentTransactionsThreadingRepository('lawyer-1', {
            transactions: [seedTx],
        });

        await repo.saveTransaction({
            ...seedTx,
            title: 'محدّثة',
            updatedAt: '2026-01-02T00:00:00.000Z',
        });

        await vi.waitFor(() => {
            expect(getState).toHaveBeenCalledWith('lawyer-1');
        });
    });
});
