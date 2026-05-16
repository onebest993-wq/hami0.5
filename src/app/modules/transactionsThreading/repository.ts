import type { FinanceRecord, Transaction, TransactionDocument, TransactionTask } from './types';

export interface TransactionsThreadingRepository {
  listTransactions(): Promise<Transaction[]>;
  getTransaction(id: string): Promise<Transaction | undefined>;
  saveTransaction(transaction: Transaction): Promise<void>;
  updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction>;

  listTasks(transactionId: string): Promise<TransactionTask[]>;
  getTask(id: string): Promise<TransactionTask | undefined>;
  saveTask(task: TransactionTask): Promise<void>;
  updateTask(id: string, updates: Partial<TransactionTask>): Promise<TransactionTask>;
  deleteTask(id: string): Promise<void>;

  listFinanceRecords(transactionId: string): Promise<FinanceRecord[]>;
  getFinanceRecord(id: string): Promise<FinanceRecord | undefined>;
  saveFinanceRecord(record: FinanceRecord): Promise<void>;
  updateFinanceRecord(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord>;
  deleteFinanceRecord(id: string): Promise<void>;

  listDocuments(transactionId: string): Promise<TransactionDocument[]>;
  getDocument(id: string): Promise<TransactionDocument | undefined>;
  saveDocument(doc: TransactionDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

export class InMemoryTransactionsThreadingRepository implements TransactionsThreadingRepository {
  private transactions: Transaction[] = [];
  private tasks: TransactionTask[] = [];
  private financeRecords: FinanceRecord[] = [];
  private documents: TransactionDocument[] = [];

  constructor(seed?: {
    transactions?: Transaction[];
    tasks?: TransactionTask[];
    financeRecords?: FinanceRecord[];
    documents?: TransactionDocument[];
  }) {
    if (seed?.transactions) this.transactions = seed.transactions.map((t) => ({ ...t }));
    if (seed?.tasks) this.tasks = seed.tasks.map((t) => ({ ...t }));
    if (seed?.financeRecords) this.financeRecords = seed.financeRecords.map((r) => ({ ...r }));
    if (seed?.documents) this.documents = seed.documents.map((d) => ({ ...d }));
  }

  dump() {
    return {
      transactions: this.transactions.map((t) => ({ ...t })),
      tasks: this.tasks.map((t) => ({ ...t })),
      financeRecords: this.financeRecords.map((r) => ({ ...r })),
      documents: this.documents.map((d) => ({ ...d })),
    };
  }

  replace(seed: {
    transactions?: Transaction[];
    tasks?: TransactionTask[];
    financeRecords?: FinanceRecord[];
    documents?: TransactionDocument[];
  }) {
    this.transactions = (seed.transactions ?? []).map((t) => ({ ...t }));
    this.tasks = (seed.tasks ?? []).map((t) => ({ ...t }));
    this.financeRecords = (seed.financeRecords ?? []).map((r) => ({ ...r }));
    this.documents = (seed.documents ?? []).map((d) => ({ ...d }));
  }

  async listTransactions(): Promise<Transaction[]> {
    return this.transactions.map((t) => ({ ...t }));
  }

  async getTransaction(id: string): Promise<Transaction | undefined> {
    const tx = this.transactions.find((t) => t.id === id);
    return tx ? { ...tx } : undefined;
  }

  async saveTransaction(transaction: Transaction): Promise<void> {
    const exists = this.transactions.some((t) => t.id === transaction.id);
    if (exists) return;
    this.transactions = [transaction, ...this.transactions].map((t) => ({ ...t }));
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const idx = this.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');
    const next = { ...this.transactions[idx], ...updates };
    this.transactions = this.transactions.map((t, i) => (i === idx ? next : t));
    return { ...next };
  }

  async listTasks(transactionId: string): Promise<TransactionTask[]> {
    return this.tasks.filter((t) => t.transactionId === transactionId).map((t) => ({ ...t }));
  }

  async getTask(id: string): Promise<TransactionTask | undefined> {
    const t = this.tasks.find((x) => x.id === id);
    return t ? { ...t } : undefined;
  }

  async saveTask(task: TransactionTask): Promise<void> {
    const exists = this.tasks.some((t) => t.id === task.id);
    if (exists) return;
    this.tasks = [...this.tasks, task].map((t) => ({ ...t }));
  }

  async updateTask(id: string, updates: Partial<TransactionTask>): Promise<TransactionTask> {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Task not found');
    const next = { ...this.tasks[idx], ...updates };
    this.tasks = this.tasks.map((t, i) => (i === idx ? next : t));
    return { ...next };
  }

  async deleteTask(id: string): Promise<void> {
    this.tasks = this.tasks.filter((t) => t.id !== id);
  }

  async listFinanceRecords(transactionId: string): Promise<FinanceRecord[]> {
    return this.financeRecords.filter((r) => r.transactionId === transactionId).map((r) => ({ ...r }));
  }

  async getFinanceRecord(id: string): Promise<FinanceRecord | undefined> {
    const r = this.financeRecords.find((x) => x.id === id);
    return r ? { ...r } : undefined;
  }

  async saveFinanceRecord(record: FinanceRecord): Promise<void> {
    const exists = this.financeRecords.some((r) => r.id === record.id);
    if (exists) return;
    this.financeRecords = [...this.financeRecords, record].map((r) => ({ ...r }));
  }

  async updateFinanceRecord(id: string, updates: Partial<FinanceRecord>): Promise<FinanceRecord> {
    const idx = this.financeRecords.findIndex((r) => r.id === id);
    if (idx === -1) throw new Error('Finance record not found');
    const next = { ...this.financeRecords[idx], ...updates };
    this.financeRecords = this.financeRecords.map((r, i) => (i === idx ? next : r));
    return { ...next };
  }

  async deleteFinanceRecord(id: string): Promise<void> {
    this.financeRecords = this.financeRecords.filter((r) => r.id !== id);
  }

  async listDocuments(transactionId: string): Promise<TransactionDocument[]> {
    return this.documents.filter((d) => d.transactionId === transactionId).map((d) => ({ ...d }));
  }

  async getDocument(id: string): Promise<TransactionDocument | undefined> {
    const d = this.documents.find((x) => x.id === id);
    return d ? { ...d } : undefined;
  }

  async saveDocument(doc: TransactionDocument): Promise<void> {
    const exists = this.documents.some((d) => d.id === doc.id);
    if (exists) return;
    this.documents = [...this.documents, doc].map((d) => ({ ...d }));
  }

  async deleteDocument(id: string): Promise<void> {
    this.documents = this.documents.filter((d) => d.id !== id);
  }
}
