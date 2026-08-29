import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TransactionsThreadingService } from '@/app/modules/transactionsThreading/service';
import {
  TransactionStatus,
  TransactionTaskStatus,
  type Transaction,
} from '@/app/modules/transactionsThreading/types';

function buildTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    title: 'معاملة',
    clientName: 'موكل',
    targetDepartment: 'دائرة',
    status: TransactionStatus.Active,
    agreedFees: 0,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransactionsThreadingService — تعقيم الكتابة', () => {
  const repo = {
    getTransaction: vi.fn(),
    saveTransaction: vi.fn(),
    updateTransaction: vi.fn(),
    getTask: vi.fn(),
    saveTask: vi.fn(),
    updateTask: vi.fn(),
    deleteTask: vi.fn(),
    listTransactions: vi.fn(),
    listTasks: vi.fn(),
    listDocuments: vi.fn(),
    saveDocument: vi.fn(),
    getDocument: vi.fn(),
    deleteDocument: vi.fn(),
  };

  let service: TransactionsThreadingService;

  beforeEach(() => {
    vi.clearAllMocks();
    repo.getTransaction.mockResolvedValue(buildTx());
    repo.updateTransaction.mockImplementation(async (_id: string, patch: Partial<Transaction>) => ({
      ...buildTx(),
      ...patch,
    }));
    repo.saveTask.mockImplementation(async (task: unknown) => task);
    repo.saveDocument.mockImplementation(async (d: unknown) => d);
    service = new TransactionsThreadingService(repo as never, () => 'id-1', () => '2026-07-18T00:00:00.000Z');
  });

  it('يعقّم عنوان المهمة والملاحظات عند الإضافة', async () => {
    const task = await service.addTask({
      transactionId: 'tx-1',
      title: `  مهمة\u0007 `,
      notes: '  ملاحظة  ',
    });
    expect(task.title).toBe('مهمة');
    expect(task.notes).toBe('ملاحظة');
    expect(repo.saveTask).toHaveBeenCalled();
  });

  it('يعقّم المرجع الرسمي عند إكمال المهمة', async () => {
    repo.getTask.mockResolvedValue({
      id: 't1',
      transactionId: 'tx-1',
      title: 'م',
      status: TransactionTaskStatus.Pending,
      parentTaskId: null,
      notes: null,
      deadline: null,
      officialReference: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: null,
    });
    repo.updateTask.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
      id: 't1',
      transactionId: 'tx-1',
      title: 'م',
      status: TransactionTaskStatus.Done,
      parentTaskId: null,
      notes: null,
      deadline: null,
      createdAt: '2026-01-01T00:00:00.000Z',
      completedAt: '2026-07-18T00:00:00.000Z',
      ...patch,
    }));
    const updated = await service.completeTask('t1', '  رف-99\u0000  ');
    expect(updated.officialReference).toBe('رف-99');
  });

    it('يعقّم عنوان المهمة عند التحديث', async () => {
        repo.getTask.mockResolvedValue({
            id: 't1',
            transactionId: 'tx-1',
            title: 'قديم',
            status: TransactionTaskStatus.Pending,
            parentTaskId: null,
            notes: null,
            deadline: null,
            officialReference: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            completedAt: null,
        });
        repo.updateTask.mockImplementation(async (_id: string, patch: Record<string, unknown>) => ({
            id: 't1',
            transactionId: 'tx-1',
            title: 'قديم',
            status: TransactionTaskStatus.Pending,
            parentTaskId: null,
            notes: null,
            deadline: null,
            officialReference: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            completedAt: null,
            ...patch,
        }));
        const updated = await service.updateTask('t1', { title: `  مهمة\u0007 محدّثة  ` });
        expect(updated.title).toBe('مهمة محدّثة');
    });

  it('يعقّم عنوان المستمسك ونوعه', async () => {
    const doc = await service.addDocument({
      transactionId: 'tx-1',
      title: '  هوية\u0000  ',
      ownerTag: 'للموكل',
      type: '  بطاقة  ',
    });
        expect(doc.title).toBe('هوية');
        expect(doc.type).toBe('بطاقة');
        expect(doc.ownerTag).toBe('للموكل');
    });

    it('يصحّح ownerTag غير المسموح عند إضافة مستمسك', async () => {
        const doc = await service.addDocument({
            transactionId: 'tx-1',
            title: 'سند',
            ownerTag: 'هاكر' as never,
        });
        expect(doc.ownerTag).toBe('أخرى');
    });
});
