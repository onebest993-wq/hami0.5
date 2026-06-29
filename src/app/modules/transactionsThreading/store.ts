import { create } from 'zustand';
import type { FinanceRecord, Transaction, TransactionDocument, TransactionTask } from './types';
import { FinanceRecordType, TransactionStatus, type TransactionDocumentOwnerTag } from './types';
import { PersistentTransactionsThreadingRepository } from './persistentRepository';
import { InMemoryTransactionsThreadingRepository, type TransactionsThreadingRepository } from './repository';
import { TransactionsThreadingService } from './service';

let repo: TransactionsThreadingRepository = new InMemoryTransactionsThreadingRepository({
  transactions: [],
  tasks: [],
  financeRecords: [],
  documents: [],
});
let service = new TransactionsThreadingService(repo);
let boundUserId: string | null = null;

function syncThreadingToCalendar(): void {
    const lawyerId = boundUserId ?? useTransactionsThreadingStore.getState().userId;
    if (!lawyerId) return;
    void import('@/app/hooks/useIncrementalCalendarSync').then((m) => {
        m.bumpThreadingCalendarSync(lawyerId);
    });
}

interface TransactionsThreadingState {
  userId: string | null;
  setUserId: (userId: string) => Promise<void>;

  transactions: Transaction[];
  tasksByTransactionId: Record<string, TransactionTask[]>;
  financeByTransactionId: Record<string, FinanceRecord[]>;
  documentsByTransactionId: Record<string, TransactionDocument[]>;

  refreshTransactions: () => Promise<void>;
  refreshTransactionData: (transactionId: string) => Promise<void>;

  createTransaction: (
    input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Transaction>;
  addTask: (input: {
    transactionId: string;
    title: string;
    parentTaskId?: string | null;
    notes?: string | null;
    deadline?: string | null;
  }) => Promise<TransactionTask>;
  updateTaskStatus: (taskId: string, status: TransactionTask['status']) => Promise<TransactionTask>;
  completeTask: (taskId: string, officialReference?: string | null) => Promise<TransactionTask>;
  updateTask: (taskId: string, updates: { title?: string; deadline?: string | null }) => Promise<TransactionTask>;
  deleteTaskCascade: (taskId: string) => Promise<void>;

  addFinanceRecord: (input: {
    transactionId: string;
    type: FinanceRecordType;
    amount: number;
    description: string;
    date?: string;
  }) => Promise<FinanceRecord>;
  updateFinanceRecord: (recordId: string, updates: { type: FinanceRecordType; amount: number; description: string; date?: string }) => Promise<FinanceRecord>;
  deleteFinanceRecord: (recordId: string) => Promise<void>;

  addDocument: (input: {
    transactionId: string;
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
    type?: string;
    uploadedAt?: string;
  }) => Promise<TransactionDocument>;
  deleteDocument: (docId: string) => Promise<void>;

  setTransactionStatus: (transactionId: string, status: TransactionStatus) => Promise<Transaction>;
  setTransactionAgreedFees: (transactionId: string, agreedFees: number) => Promise<Transaction>;
}

export const useTransactionsThreadingStore = create<TransactionsThreadingState>((set, get) => ({
  userId: null,
  setUserId: async (userId) => {
    const next = userId?.trim();
    if (!next) return;
    if (boundUserId === next) return;
    boundUserId = next;
    repo = new PersistentTransactionsThreadingRepository(next, {
      transactions: [],
      tasks: [],
      financeRecords: [],
      documents: [],
    });
    service = new TransactionsThreadingService(repo);
    set({
      userId: next,
      transactions: [],
      tasksByTransactionId: {},
      financeByTransactionId: {},
      documentsByTransactionId: {},
    });
  },

  transactions: [],
  tasksByTransactionId: {},
  financeByTransactionId: {},
  documentsByTransactionId: {},

  refreshTransactions: async () => {
    const transactions = await service.listTransactions();
    set({ transactions });
  },

  refreshTransactionData: async (transactionId) => {
    const [tasks, finance, documents] = await Promise.all([
      service.listTasks(transactionId),
      service.listFinanceRecords(transactionId),
      service.listDocuments(transactionId),
    ]);

    set((state) => ({
      tasksByTransactionId: { ...state.tasksByTransactionId, [transactionId]: tasks },
      financeByTransactionId: { ...state.financeByTransactionId, [transactionId]: finance },
      documentsByTransactionId: { ...state.documentsByTransactionId, [transactionId]: documents },
    }));
  },

  createTransaction: async (input) => {
    const tx = await service.createTransaction(input);
    await get().refreshTransactions();
    return tx;
  },

  addTask: async (input) => {
    const task = await service.addTask(input);
    await get().refreshTransactionData(task.transactionId);
    syncThreadingToCalendar();
    return task;
  },

  updateTaskStatus: async (taskId, status) => {
    const task = await service.updateTaskStatus(taskId, status);
    await get().refreshTransactionData(task.transactionId);
    syncThreadingToCalendar();
    return task;
  },

  completeTask: async (taskId, officialReference) => {
    const task = await service.completeTask(taskId, officialReference ?? null);
    await get().refreshTransactionData(task.transactionId);
    syncThreadingToCalendar();
    return task;
  },

  updateTask: async (taskId, updates) => {
    const task = await service.updateTask(taskId, updates);
    await get().refreshTransactionData(task.transactionId);
    syncThreadingToCalendar();
    return task;
  },

  deleteTaskCascade: async (taskId) => {
    const existing = await repo.getTask(taskId);
    if (!existing) return;
    const transactionId = existing.transactionId;
    const tasks = get().tasksByTransactionId[transactionId] ?? [];
    const childrenByParent = new Map<string, string[]>();
    for (const t of tasks) {
      if (!t.parentTaskId) continue;
      const arr = childrenByParent.get(t.parentTaskId) ?? [];
      arr.push(t.id);
      childrenByParent.set(t.parentTaskId, arr);
    }
    const toDelete = new Set<string>();
    const stack = [taskId];
    while (stack.length) {
      const id = stack.pop()!;
      if (toDelete.has(id)) continue;
      toDelete.add(id);
      const kids = childrenByParent.get(id) ?? [];
      for (const k of kids) stack.push(k);
    }
    for (const id of toDelete) {
      await service.deleteTask(id);
    }
    await get().refreshTransactionData(transactionId);
    syncThreadingToCalendar();
  },

  addFinanceRecord: async (input) => {
    const record = await service.addFinanceRecord(input);
    await get().refreshTransactionData(record.transactionId);
    syncThreadingToCalendar();
    return record;
  },

  updateFinanceRecord: async (recordId, updates) => {
    const record = await service.updateFinanceRecord(recordId, updates);
    await get().refreshTransactionData(record.transactionId);
    syncThreadingToCalendar();
    return record;
  },

  deleteFinanceRecord: async (recordId) => {
    const existing = await repo.getFinanceRecord(recordId);
    await service.deleteFinanceRecord(recordId);
    if (existing) await get().refreshTransactionData(existing.transactionId);
    syncThreadingToCalendar();
  },

  addDocument: async (input) => {
    const doc = await service.addDocument(input);
    await get().refreshTransactionData(doc.transactionId);
    return doc;
  },

  deleteDocument: async (docId) => {
    const existing = await repo.getDocument(docId);
    await service.deleteDocument(docId);
    if (existing) await get().refreshTransactionData(existing.transactionId);
  },

  setTransactionStatus: async (transactionId, status) => {
    const tx = await service.setTransactionStatus(transactionId, status);
    await get().refreshTransactions();
    await get().refreshTransactionData(transactionId);
    syncThreadingToCalendar();
    return tx;
  },

  setTransactionAgreedFees: async (transactionId, agreedFees) => {
    const tx = await service.setTransactionAgreedFees(transactionId, agreedFees);
    await get().refreshTransactions();
    return tx;
  },
}));

/** تحميل مسبق بيانات المعاملات قبل فتح الـ hub — لا يغيّر الواجهة */
let warmInflight: Promise<void> | null = null;
let warmForUserId: string | null = null;

export function warmTransactionsThreadingStore(userId: string): Promise<void> {
    const uid = userId?.trim();
    if (!uid) return Promise.resolve();
    if (warmForUserId === uid && warmInflight) return warmInflight;

    warmForUserId = uid;
    const warmUid = uid;
    warmInflight = useTransactionsThreadingStore
        .getState()
        .setUserId(uid)
        .then(() => useTransactionsThreadingStore.getState().refreshTransactions())
        .catch(() => undefined)
        .then(() => {
            if (warmForUserId === warmUid) warmInflight = null;
        });

    return warmInflight;
}
