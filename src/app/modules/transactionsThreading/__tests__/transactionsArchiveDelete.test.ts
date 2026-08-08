import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';

vi.mock('@/app/components/ui/smartToastBus', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/hooks/useIncrementalCalendarSync', () => ({
    bumpThreadingCalendarSync: vi.fn(),
}));

describe('transactions store archive/delete', () => {
    beforeEach(() => {
        vi.resetModules();
    });

    it('setTransactionArchived يحدّث archivedAt في الحالة المحلية', async () => {
        const updateTransaction = vi.fn(async (_id: string, updates: Record<string, unknown>) => ({
            id: 'tx-1',
            title: 'معاملة',
            clientName: 'موكل',
            targetDepartment: 'جهة',
            status: TransactionStatus.Active,
            agreedFees: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            archivedAt: updates.archivedAt ?? null,
            deletedAt: null,
        }));

        vi.doMock('@/app/modules/transactionsThreading/persistentRepository', () => ({
            PersistentTransactionsThreadingRepository: vi.fn().mockImplementation(() => ({
                listTransactions: vi.fn(async () => []),
                getTransaction: vi.fn(async (id: string) => ({
                    id,
                    title: 'معاملة',
                    clientName: 'موكل',
                    targetDepartment: 'جهة',
                    status: TransactionStatus.Active,
                    agreedFees: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                })),
                saveTransaction: vi.fn(),
                updateTransaction,
                listTasks: vi.fn(async () => []),
                listFinanceRecords: vi.fn(async () => []),
                listDocuments: vi.fn(async () => []),
                getTask: vi.fn(),
                saveTask: vi.fn(),
                updateTask: vi.fn(),
                deleteTask: vi.fn(),
                getDocument: vi.fn(),
                saveDocument: vi.fn(),
                deleteDocument: vi.fn(),
                getFinanceRecord: vi.fn(),
                saveFinanceRecord: vi.fn(),
                updateFinanceRecord: vi.fn(),
                deleteFinanceRecord: vi.fn(),
            })),
        }));

        const { ensureTransactionsUserBound, useTransactionsThreadingStore } = await import(
            '@/app/modules/transactionsThreading/store'
        );

        const now = '2026-01-01T00:00:00.000Z';
        ensureTransactionsUserBound('lawyer-archive-1');
        useTransactionsThreadingStore.setState({
            userId: 'lawyer-archive-1',
            transactions: [
                {
                    id: 'tx-1',
                    title: 'معاملة',
                    clientName: 'موكل',
                    targetDepartment: 'جهة',
                    status: TransactionStatus.Active,
                    agreedFees: 0,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            tasksByTransactionId: {},
            financeByTransactionId: {},
            documentsByTransactionId: {},
        });

        await useTransactionsThreadingStore.getState().setTransactionArchived('tx-1', true);

        expect(updateTransaction).toHaveBeenCalled();
        const tx = useTransactionsThreadingStore.getState().transactions[0];
        expect(tx?.archivedAt).toBeTruthy();
    });

    it('setTransactionDeleted يحدّث deletedAt في الحالة المحلية', async () => {
        const updateTransaction = vi.fn(async (_id: string, updates: Record<string, unknown>) => ({
            id: 'tx-2',
            title: 'معاملة',
            clientName: 'موكل',
            targetDepartment: 'جهة',
            status: TransactionStatus.Active,
            agreedFees: 0,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-02T00:00:00.000Z',
            archivedAt: null,
            deletedAt: updates.deletedAt ?? null,
        }));

        vi.doMock('@/app/modules/transactionsThreading/persistentRepository', () => ({
            PersistentTransactionsThreadingRepository: vi.fn().mockImplementation(() => ({
                listTransactions: vi.fn(async () => []),
                getTransaction: vi.fn(async (id: string) => ({
                    id,
                    title: 'معاملة',
                    clientName: 'موكل',
                    targetDepartment: 'جهة',
                    status: TransactionStatus.Active,
                    agreedFees: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                })),
                saveTransaction: vi.fn(),
                updateTransaction,
                listTasks: vi.fn(async () => []),
                listFinanceRecords: vi.fn(async () => []),
                listDocuments: vi.fn(async () => []),
                getTask: vi.fn(),
                saveTask: vi.fn(),
                updateTask: vi.fn(),
                deleteTask: vi.fn(),
                getDocument: vi.fn(),
                saveDocument: vi.fn(),
                deleteDocument: vi.fn(),
                getFinanceRecord: vi.fn(),
                saveFinanceRecord: vi.fn(),
                updateFinanceRecord: vi.fn(),
                deleteFinanceRecord: vi.fn(),
            })),
        }));

        const { ensureTransactionsUserBound, useTransactionsThreadingStore } = await import(
            '@/app/modules/transactionsThreading/store'
        );

        const now = '2026-01-01T00:00:00.000Z';
        ensureTransactionsUserBound('lawyer-delete-1');
        useTransactionsThreadingStore.setState({
            userId: 'lawyer-delete-1',
            transactions: [
                {
                    id: 'tx-2',
                    title: 'معاملة',
                    clientName: 'موكل',
                    targetDepartment: 'جهة',
                    status: TransactionStatus.Active,
                    agreedFees: 0,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            tasksByTransactionId: {},
            financeByTransactionId: {},
            documentsByTransactionId: {},
        });

        await useTransactionsThreadingStore.getState().setTransactionDeleted('tx-2', true);

        expect(updateTransaction).toHaveBeenCalled();
        const tx = useTransactionsThreadingStore.getState().transactions.find((t) => t.id === 'tx-2');
        expect(tx?.deletedAt).toBeTruthy();
    });
});
