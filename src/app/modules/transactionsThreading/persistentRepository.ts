import type { FinanceRecord, Transaction, TransactionDocument, TransactionTask } from './types';
import { mirrorTransactionsThreadingLocalSync } from '@/app/services/transactions/transactionsThreadingMirror';
import { InMemoryTransactionsThreadingRepository, type TransactionsThreadingRepository } from './repository';

async function loadThreadingDb() {
    const mod = await import('@/app/services/cloud/lawyerTransactionsCloud');
    return mod.TransactionsThreadingDB;
}

const PERSIST_DEBOUNCE_MS = 200;

function mergeById<T extends { id: string }>(local: T[], remote: T[]): T[] {
    const merged = new Map<string, T>();
    for (const item of remote) merged.set(item.id, item);
    for (const item of local) merged.set(item.id, item);
    return Array.from(merged.values());
}

export class PersistentTransactionsThreadingRepository implements TransactionsThreadingRepository {
  private inner: InMemoryTransactionsThreadingRepository;
  private hydratePromise: Promise<void> | null = null;
  private persistTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private userId: string,
    seed?: {
      transactions?: Transaction[];
      tasks?: TransactionTask[];
      financeRecords?: FinanceRecord[];
      documents?: TransactionDocument[];
    },
  ) {
    this.inner = new InMemoryTransactionsThreadingRepository(seed);
  }

  private async hydrateFromRemoteState(): Promise<void> {
    const TransactionsThreadingDB = await loadThreadingDb();
    const state = await TransactionsThreadingDB.getState(this.userId);
    if (!state) return;

    const remote = {
      transactions: Array.isArray(state.transactions) ? (state.transactions as Transaction[]) : [],
      tasks: Array.isArray(state.tasks) ? (state.tasks as TransactionTask[]) : [],
      financeRecords: Array.isArray(state.financeRecords) ? (state.financeRecords as FinanceRecord[]) : [],
      documents: Array.isArray(state.documents) ? (state.documents as TransactionDocument[]) : [],
    };

    const current = this.inner.dump();
    const hasLocal =
        current.transactions.length > 0 ||
        current.tasks.length > 0 ||
        current.financeRecords.length > 0 ||
        current.documents.length > 0;

    if (!hasLocal) {
      this.inner.replace(remote);
      return;
    }

    this.inner.replace({
      transactions: mergeById(current.transactions, remote.transactions),
      tasks: mergeById(current.tasks, remote.tasks),
      financeRecords: mergeById(current.financeRecords, remote.financeRecords),
      documents: mergeById(current.documents, remote.documents),
    });
  }

  private kickHydrate(): Promise<void> {
    if (this.hydratePromise) return this.hydratePromise;
    const seeded = this.inner.dump().transactions;
    if (seeded.length > 0) {
      this.hydratePromise = Promise.resolve();
      void this.hydrateFromRemoteState().catch(() => undefined);
      return this.hydratePromise;
    }
    this.hydratePromise = this.hydrateFromRemoteState().catch(() => undefined);
    return this.hydratePromise;
  }

  private async flushPersist(): Promise<void> {
    const dump = this.inner.dump();
    const TransactionsThreadingDB = await loadThreadingDb();
    await TransactionsThreadingDB.saveState(this.userId, dump);
  }

  private mirrorLocalSync(): void {
    mirrorTransactionsThreadingLocalSync(this.userId, this.inner.dump());
  }

  private persistMutation(): void {
    this.mirrorLocalSync();
    this.scheduleCloudPersist();
  }

  private scheduleCloudPersist(): void {
    if (this.persistTimer) clearTimeout(this.persistTimer);
    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      void this.flushPersist().catch(() => undefined);
    }, PERSIST_DEBOUNCE_MS);
  }

  async listTransactions(): Promise<Transaction[]> {
    void this.kickHydrate();
    return await this.inner.listTransactions();
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    void this.kickHydrate();
    return await this.inner.getTransaction(id);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    void this.kickHydrate();
    await this.inner.saveTransaction(transaction);
    this.persistMutation();
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    void this.kickHydrate();
    const tx = await this.inner.updateTransaction(id, updates);
    this.persistMutation();
    return tx;
  }

  async listTasks(transactionId: string): Promise<TransactionTask[]> {
    void this.kickHydrate();
    return await this.inner.listTasks(transactionId);
  }

  async getTask(id: string): Promise<TransactionTask | undefined> {
    void this.kickHydrate();
    return await this.inner.getTask(id);
  }

  async saveTask(task: TransactionTask): Promise<void> {
    void this.kickHydrate();
    await this.inner.saveTask(task);
    this.persistMutation();
  }

  async updateTask(id: string, updates: Partial<TransactionTask>): Promise<TransactionTask> {
    void this.kickHydrate();
    const t = await this.inner.updateTask(id, updates);
    this.persistMutation();
    return t;
  }

  async deleteTask(id: string): Promise<void> {
    void this.kickHydrate();
    await this.inner.deleteTask(id);
    this.persistMutation();
  }

  async listFinanceRecords(transactionId: string): Promise<FinanceRecord[]> {
    void this.kickHydrate();
    return await this.inner.listFinanceRecords(transactionId);
  }

  async getFinanceRecord(id: string): Promise<FinanceRecord | undefined> {
    void this.kickHydrate();
    return await this.inner.getFinanceRecord(id);
  }

  async saveFinanceRecord(record: FinanceRecord): Promise<void> {
    void this.kickHydrate();
    await this.inner.saveFinanceRecord(record);
    this.persistMutation();
  }

  async updateFinanceRecord(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord> {
    void this.kickHydrate();
    const r = await this.inner.updateFinanceRecord(id, updates);
    this.persistMutation();
    return r;
  }

  async deleteFinanceRecord(id: string): Promise<void> {
    void this.kickHydrate();
    await this.inner.deleteFinanceRecord(id);
    this.persistMutation();
  }

  async listDocuments(transactionId: string): Promise<TransactionDocument[]> {
    void this.kickHydrate();
    return await this.inner.listDocuments(transactionId);
  }

  async getDocument(id: string): Promise<TransactionDocument | undefined> {
    void this.kickHydrate();
    return await this.inner.getDocument(id);
  }

  async saveDocument(doc: TransactionDocument): Promise<void> {
    void this.kickHydrate();
    await this.inner.saveDocument(doc);
    this.persistMutation();
  }

  async deleteDocument(id: string): Promise<void> {
    void this.kickHydrate();
    await this.inner.deleteDocument(id);
    this.persistMutation();
  }
}
