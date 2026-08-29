import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TransactionStatus } from '@/app/modules/transactionsThreading/types';

const persistTransaction = vi.fn(() => new Promise<void>(() => undefined));

vi.mock('@/app/components/ui/SmartToast', () => ({
    SmartToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/modules/transactionsThreading/persistentRepository', () => ({
    PersistentTransactionsThreadingRepository: vi.fn().mockImplementation(() => ({
        saveTransaction: vi.fn(async () => undefined),
        listTasks: vi.fn(async () => []),
        listDocuments: vi.fn(async () => []),
    })),
}));

vi.mock('@/app/modules/transactionsThreading/service', async () => {
    const actual = await vi.importActual<typeof import('@/app/modules/transactionsThreading/service')>(
        '@/app/modules/transactionsThreading/service',
    );
    return {
        ...actual,
        TransactionsThreadingService: class extends actual.TransactionsThreadingService {
            persistTransaction(...args: unknown[]) {
                return persistTransaction(...args);
            }
        },
    };
});

describe('transactions createTransaction optimistic', () => {
    beforeEach(() => {
        vi.resetModules();
        vi.clearAllMocks();
        persistTransaction.mockImplementation(() => new Promise<void>(() => undefined));
    });

    it('يُحدّث القائمة فوراً دون انتظار الحفظ', async () => {
        const { ensureTransactionsUserBound, useTransactionsThreadingStore } = await import(
            '@/app/modules/transactionsThreading/store'
        );

        ensureTransactionsUserBound('lawyer-1');

        const created = await useTransactionsThreadingStore.getState().createTransaction({
            title: 'معاملة جديدة',
            clientName: 'موكل',
            targetDepartment: 'دائرة',
            status: TransactionStatus.Active,
            agreedFees: 0,
        });

        expect(created.title).toBe('معاملة جديدة');
        expect(useTransactionsThreadingStore.getState().transactions[0]?.id).toBe(created.id);
        expect(persistTransaction).toHaveBeenCalled();
    });
});
