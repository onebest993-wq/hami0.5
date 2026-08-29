import { create } from 'zustand';
import {
    TransactionStatus,
    TransactionTaskStatus,
    type Transaction,
    type TransactionDocument,
    type TransactionDocumentOwnerTag,
    type TransactionTask,
} from './types';
import {
    collectTaskCascadeIds,
    documentListUnchanged,
    findTaskInState,
    removeTasksFromMap,
    taskListUnchanged,
    transactionListUnchanged,
    upsertDocumentMap,
    upsertTaskMap,
} from './transactionsThreadingStoreMaps';
import {
    bindTransactionsUser,
    boundUserId,
    registerTransactionsThreadingStoreBridge,
    repo,
    rollbackOptimisticTransaction,
    service,
    syncThreadingToCalendar,
} from './transactionsThreadingStoreRuntime';
import { createApplyOptimisticTask } from './transactionsThreadingStoreOptimistic';

export { ensureTransactionsUserBound } from './transactionsThreadingStoreRuntime';

let refreshTransactionsInflight: Promise<void> | null = null;
const refreshDataInflight = new Map<string, Promise<void>>();

interface TransactionsThreadingState {
  userId: string | null;
  setUserId: (userId: string) => Promise<void>;

  transactions: Transaction[];
  tasksByTransactionId: Record<string, TransactionTask[]>;
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

  addDocument: (input: {
    transactionId: string;
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
    type?: string;
    uploadedAt?: string;
  }) => Promise<TransactionDocument>;
  deleteDocument: (docId: string) => Promise<void>;

  setTransactionStatus: (transactionId: string, status: TransactionStatus) => Promise<Transaction>;
  setTransactionArchived: (transactionId: string, archived: boolean) => Promise<Transaction>;
  setTransactionDeleted: (transactionId: string, deleted: boolean) => Promise<Transaction>;
}

export const useTransactionsThreadingStore = create<TransactionsThreadingState>((set, get) => {
  registerTransactionsThreadingStoreBridge({
    patchStore: (patch) => set(patch),
    patchStoreFn: (fn) => set((state) => ({ ...state, ...fn(state) })),
    readTransactionCount: () => get().transactions.length,
    readFallbackUserId: () => get().userId,
  });

  const commitTransaction = async (transactionId: string, run: () => Promise<Transaction>) => {
    const tx = await run();
    set((state) => ({
      transactions: state.transactions.map((item) => (item.id === transactionId ? tx : item)),
    }));
    syncThreadingToCalendar();
    return tx;
  };

  const applyOptimisticTask = createApplyOptimisticTask({
    getTaskMap: () => get().tasksByTransactionId,
    patchTaskMap: (updater) => set((state) => ({ tasksByTransactionId: updater(state.tasksByTransactionId) })),
    syncThreadingToCalendar,
  });


  return {
  userId: null,
  setUserId: async (userId) => {
    const next = userId?.trim();
    if (!next) return;
    bindTransactionsUser(next);
  },

  transactions: [],
  tasksByTransactionId: {},
  documentsByTransactionId: {},

  refreshTransactions: async () => {
    if (refreshTransactionsInflight) return refreshTransactionsInflight;
    refreshTransactionsInflight = (async () => {
      const transactions = await service.listTransactions();
      const prev = get().transactions;
      if (transactionListUnchanged(prev, transactions)) return;
      set({ transactions });
    })().finally(() => {
      refreshTransactionsInflight = null;
    });
    return refreshTransactionsInflight;
  },

  /** مهام + مستمسكات فقط — المالية لم تعد على واجهة التفاصيل */
  refreshTransactionData: async (transactionId) => {
    const existing = refreshDataInflight.get(transactionId);
    if (existing) return existing;
    const pending = (async () => {
      const [tasks, documents] = await Promise.all([
        service.listTasks(transactionId),
        service.listDocuments(transactionId),
      ]);
      const state = get();
      if (
        taskListUnchanged(state.tasksByTransactionId[transactionId], tasks) &&
        documentListUnchanged(state.documentsByTransactionId[transactionId], documents)
      ) {
        return;
      }
      set({
        tasksByTransactionId: { ...state.tasksByTransactionId, [transactionId]: tasks },
        documentsByTransactionId: { ...state.documentsByTransactionId, [transactionId]: documents },
      });
    })().finally(() => {
      refreshDataInflight.delete(transactionId);
    });
    refreshDataInflight.set(transactionId, pending);
    return pending;
  },

  createTransaction: async (input) => {
    const uid = boundUserId ?? get().userId;
    if (!uid) {
        throw new Error('transactions-user-not-bound');
    }
    if (boundUserId !== uid) {
        bindTransactionsUser(uid);
    }

    const tx = service.buildTransaction(input);
    set((state) => ({
      transactions: state.transactions.some((item) => item.id === tx.id)
        ? state.transactions
        : [tx, ...state.transactions],
    }));

    void service.persistTransaction(tx).catch(() => {
        rollbackOptimisticTransaction(tx.id);
    });

    return tx;
  },

  addTask: async (input) => {
    const task = await service.addTask(input);
    set((state) => ({
      tasksByTransactionId: upsertTaskMap(state.tasksByTransactionId, task),
    }));
    syncThreadingToCalendar();
    return task;
  },

  updateTaskStatus: async (taskId, status) =>
    applyOptimisticTask(
      taskId,
      (prev) => ({
        ...prev,
        status,
        completedAt:
          status === TransactionTaskStatus.Done ? prev.completedAt ?? new Date().toISOString() : null,
      }),
      () => service.updateTaskStatus(taskId, status),
    ),

  completeTask: async (taskId, officialReference) =>
    applyOptimisticTask(
      taskId,
      (prev) => ({
        ...prev,
        status: TransactionTaskStatus.Done,
        completedAt: prev.completedAt ?? new Date().toISOString(),
        officialReference: officialReference ?? prev.officialReference,
      }),
      () => service.completeTask(taskId, officialReference ?? null),
    ),

  updateTask: async (taskId, updates) => {
    const task = await service.updateTask(taskId, updates);
    set((state) => ({
      tasksByTransactionId: upsertTaskMap(state.tasksByTransactionId, task),
    }));
    syncThreadingToCalendar();
    return task;
  },

  deleteTaskCascade: async (taskId) => {
    const existing = findTaskInState(get().tasksByTransactionId, taskId) ?? (await repo.getTask(taskId));
    if (!existing) return;
    const transactionId = existing.transactionId;
    const toDelete = collectTaskCascadeIds(taskId, get().tasksByTransactionId[transactionId] ?? []);

    set((state) => ({
      tasksByTransactionId: removeTasksFromMap(state.tasksByTransactionId, transactionId, toDelete),
    }));

    try {
      for (const id of toDelete) {
        await service.deleteTask(id);
      }
      syncThreadingToCalendar();
    } catch (err) {
      await get().refreshTransactionData(transactionId);
      throw err;
    }
  },

  addDocument: async (input) => {
    const doc = await service.addDocument(input);
    set((state) => ({
      documentsByTransactionId: upsertDocumentMap(state.documentsByTransactionId, doc),
    }));
    return doc;
  },

  deleteDocument: async (docId) => {
    const existing = await repo.getDocument(docId);
    await service.deleteDocument(docId);
    if (existing) {
      set((state) => ({
        documentsByTransactionId: {
          ...state.documentsByTransactionId,
          [existing.transactionId]: (state.documentsByTransactionId[existing.transactionId] ?? []).filter(
            (d) => d.id !== docId,
          ),
        },
      }));
    }
  },

  setTransactionStatus: async (transactionId, status) =>
    commitTransaction(transactionId, () => service.setTransactionStatus(transactionId, status)),

  setTransactionArchived: async (transactionId, archived) =>
    commitTransaction(transactionId, () => service.setTransactionArchived(transactionId, archived)),

  setTransactionDeleted: async (transactionId, deleted) =>
    commitTransaction(transactionId, () => service.setTransactionDeleted(transactionId, deleted)),
};
});

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
