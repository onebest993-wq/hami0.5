import type { FinanceRecord, Transaction, TransactionDocument, TransactionTask } from './types';
import { InMemoryTransactionsThreadingRepository, type TransactionsThreadingRepository } from './repository';

async function loadThreadingDb() {
    const { TransactionsThreadingDB } = await import('@/app/services/lawyer-cloud');
    return TransactionsThreadingDB;
}

export class PersistentTransactionsThreadingRepository implements TransactionsThreadingRepository {
  private inner: InMemoryTransactionsThreadingRepository;
  private loadPromise: Promise<void> | null = null;

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

  private async ensureLoaded() {
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const TransactionsThreadingDB = await loadThreadingDb();
      const state = await TransactionsThreadingDB.getState(this.userId);
      if (!state) return;
      this.inner.replace({
        transactions: Array.isArray(state.transactions) ? (state.transactions as Transaction[]) : [],
        tasks: Array.isArray(state.tasks) ? (state.tasks as TransactionTask[]) : [],
        financeRecords: Array.isArray(state.financeRecords) ? (state.financeRecords as FinanceRecord[]) : [],
        documents: Array.isArray(state.documents) ? (state.documents as TransactionDocument[]) : [],
      });
    })();
    return this.loadPromise;
  }

  private async persist() {
    const dump = this.inner.dump();
    const TransactionsThreadingDB = await loadThreadingDb();
    await TransactionsThreadingDB.saveState(this.userId, dump);
  }

  async listTransactions(): Promise<Transaction[]> {
    await this.ensureLoaded();
    return await this.inner.listTransactions();
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    await this.ensureLoaded();
    return await this.inner.getTransaction(id);
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    await this.ensureLoaded();
    await this.inner.saveTransaction(transaction);
    await this.persist();
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    await this.ensureLoaded();
    const tx = await this.inner.updateTransaction(id, updates);
    await this.persist();
    return tx;
  }

  async listTasks(transactionId: string): Promise<TransactionTask[]> {
    await this.ensureLoaded();
    return await this.inner.listTasks(transactionId);
  }

  async getTask(id: string): Promise<TransactionTask | undefined> {
    await this.ensureLoaded();
    return await this.inner.getTask(id);
  }

  async saveTask(task: TransactionTask): Promise<void> {
    await this.ensureLoaded();
    await this.inner.saveTask(task);
    await this.persist();
  }

  async updateTask(id: string, updates: Partial<TransactionTask>): Promise<TransactionTask> {
    await this.ensureLoaded();
    const t = await this.inner.updateTask(id, updates);
    await this.persist();
    return t;
  }

  async deleteTask(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.inner.deleteTask(id);
    await this.persist();
  }

  async listFinanceRecords(transactionId: string): Promise<FinanceRecord[]> {
    await this.ensureLoaded();
    return await this.inner.listFinanceRecords(transactionId);
  }

  async getFinanceRecord(id: string): Promise<FinanceRecord | undefined> {
    await this.ensureLoaded();
    return await this.inner.getFinanceRecord(id);
  }

  async saveFinanceRecord(record: FinanceRecord): Promise<void> {
    await this.ensureLoaded();
    await this.inner.saveFinanceRecord(record);
    await this.persist();
  }

  async updateFinanceRecord(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord> {
    await this.ensureLoaded();
    const r = await this.inner.updateFinanceRecord(id, updates);
    await this.persist();
    return r;
  }

  async deleteFinanceRecord(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.inner.deleteFinanceRecord(id);
    await this.persist();
  }

  async listDocuments(transactionId: string): Promise<TransactionDocument[]> {
    await this.ensureLoaded();
    return await this.inner.listDocuments(transactionId);
  }

  async getDocument(id: string): Promise<TransactionDocument | undefined> {
    await this.ensureLoaded();
    return await this.inner.getDocument(id);
  }

  async saveDocument(doc: TransactionDocument): Promise<void> {
    await this.ensureLoaded();
    await this.inner.saveDocument(doc);
    await this.persist();
  }

  async deleteDocument(id: string): Promise<void> {
    await this.ensureLoaded();
    await this.inner.deleteDocument(id);
    await this.persist();
  }
}

