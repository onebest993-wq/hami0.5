import { describe, expect, it, vi, beforeEach } from 'vitest';
import { TransactionsThreadingService } from '@/app/modules/transactionsThreading/service';
import {
  FinanceRecordType,
  TransactionStatus,
  TransactionTaskStatus,
  type Transaction,
} from '@/app/modules/transactionsThreading/types';
import { TransactionInputValidationError } from '@/app/services/transactions/transactionsInputSecurity';

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
    listFinanceRecords: vi.fn(),
    saveFinanceRecord: vi.fn(),
    getFinanceRecord: vi.fn(),
    updateFinanceRecord: vi.fn(),
    deleteFinanceRecord: vi.fn(),
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
    repo.saveFinanceRecord.mockImplementation(async (r: unknown) => r);
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

  it('يرفض مبلغاً مالياً سالباً', async () => {
    await expect(
      service.addFinanceRecord({
        transactionId: 'tx-1',
        type: FinanceRecordType.AdvancePayment,
        amount: -10,
        description: 'دفعة',
      }),
    ).rejects.toThrow(TransactionInputValidationError);
    expect(repo.saveFinanceRecord).not.toHaveBeenCalled();
  });

  it('يعقّم وصف المبلغ والمستمسك', async () => {
    const record = await service.addFinanceRecord({
      transactionId: 'tx-1',
      type: FinanceRecordType.Expense,
      amount: 100.456,
      description: '  مصروف\u0007  ',
    });
    expect(record.amount).toBe(100.46);
    expect(record.description).toBe('مصروف');

    const doc = await service.addDocument({
      transactionId: 'tx-1',
      title: '  هوية\u0000  ',
      ownerTag: 'للموكل',
      type: '  بطاقة  ',
    });
    expect(doc.title).toBe('هوية');
    expect(doc.type).toBe('بطاقة');
  });
});
