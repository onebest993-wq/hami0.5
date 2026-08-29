import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TransactionStatus,
  TransactionTaskStatus,
} from '@/app/modules/transactionsThreading/types';

vi.mock('@/app/components/ui/smartToastBus', () => ({
  SmartToast: { error: vi.fn(), success: vi.fn() },
}));

vi.mock('@/app/hooks/useIncrementalCalendarSync', () => ({
  bumpThreadingCalendarSync: vi.fn(),
}));

describe('transactions store scoped patches', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('completeTask يحدّث المهمة محلياً دون إعادة جلب القائمة', async () => {
    const listTasks = vi.fn(async () => []);
    const listDocuments = vi.fn(async () => []);

    vi.doMock('@/app/modules/transactionsThreading/persistentRepository', () => ({
      PersistentTransactionsThreadingRepository: vi.fn().mockImplementation(() => ({
        saveTransaction: vi.fn(async () => undefined),
        listTransactions: vi.fn(async () => []),
        listTasks,
        listDocuments,
        getTask: vi.fn(),
        saveTask: vi.fn(),
        updateTask: vi.fn(),
        deleteTask: vi.fn(),
        getDocument: vi.fn(),
        saveDocument: vi.fn(),
        deleteDocument: vi.fn(),
        getTransaction: vi.fn(),
        updateTransaction: vi.fn(),
      })),
    }));

    const { ensureTransactionsUserBound, useTransactionsThreadingStore } = await import(
      '@/app/modules/transactionsThreading/store'
    );

    ensureTransactionsUserBound('lawyer-patch-1');

    const now = '2026-01-01T00:00:00.000Z';
    const task = {
      id: 't1',
      transactionId: 'tx-1',
      title: 'مهمة',
      status: TransactionTaskStatus.Pending,
      parentTaskId: null,
      notes: null,
      deadline: null,
      officialReference: null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
    };

    useTransactionsThreadingStore.setState({
      userId: 'lawyer-patch-1',
      transactions: [
        {
          id: 'tx-1',
          title: 'معاملة',
          clientName: 'موكل',
          targetDepartment: 'دائرة',
          status: TransactionStatus.Active,
          agreedFees: 0,
          createdAt: now,
          updatedAt: now,
        },
      ],
      tasksByTransactionId: { 'tx-1': [task] },
      documentsByTransactionId: {},
    });

    const { TransactionsThreadingService } = await import(
      '@/app/modules/transactionsThreading/service'
    );
    const completeSpy = vi
      .spyOn(TransactionsThreadingService.prototype, 'completeTask')
      .mockResolvedValue({
        ...task,
        status: TransactionTaskStatus.Done,
        completedAt: '2026-01-02T00:00:00.000Z',
        officialReference: null,
      });

    await useTransactionsThreadingStore.getState().completeTask('t1', null);

    expect(completeSpy).toHaveBeenCalledWith('t1', null);
    expect(listTasks).not.toHaveBeenCalled();
    expect(listDocuments).not.toHaveBeenCalled();
    expect(useTransactionsThreadingStore.getState().tasksByTransactionId['tx-1']?.[0]?.status).toBe(
      TransactionTaskStatus.Done,
    );
  });

  it('refreshTransactionData يجلب المهام والمستمسكات', async () => {
    const listTasks = vi.fn(async () => []);
    const listDocuments = vi.fn(async () => []);

    vi.doMock('@/app/modules/transactionsThreading/persistentRepository', () => ({
      PersistentTransactionsThreadingRepository: vi.fn().mockImplementation(() => ({
        listTasks,
        listDocuments,
      })),
    }));

    const { ensureTransactionsUserBound, useTransactionsThreadingStore } = await import(
      '@/app/modules/transactionsThreading/store'
    );
    ensureTransactionsUserBound('lawyer-patch-2');

    const listTasksSpy = vi
      .spyOn(
        (await import('@/app/modules/transactionsThreading/service')).TransactionsThreadingService
          .prototype,
        'listTasks',
      )
      .mockResolvedValue([]);
    const listDocsSpy = vi
      .spyOn(
        (await import('@/app/modules/transactionsThreading/service')).TransactionsThreadingService
          .prototype,
        'listDocuments',
      )
      .mockResolvedValue([]);

    await useTransactionsThreadingStore.getState().refreshTransactionData('tx-x');

    expect(listTasksSpy).toHaveBeenCalledWith('tx-x');
    expect(listDocsSpy).toHaveBeenCalledWith('tx-x');
  });
});
