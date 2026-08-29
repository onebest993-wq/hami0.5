import type { Transaction, TransactionDocument, TransactionTask } from './types';

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

  listDocuments(transactionId: string): Promise<TransactionDocument[]>;
  getDocument(id: string): Promise<TransactionDocument | undefined>;
  saveDocument(doc: TransactionDocument): Promise<void>;
  deleteDocument(id: string): Promise<void>;
}

export class InMemoryTransactionsThreadingRepository implements TransactionsThreadingRepository {
  private transactions: Transaction[] = [];
  private tasks: TransactionTask[] = [];
  private documents: TransactionDocument[] = [];

  constructor(seed?: {
    transactions?: Transaction[];
    tasks?: TransactionTask[];
    financeRecords?: unknown[];
    documents?: TransactionDocument[];
  }) {
    if (seed?.transactions) this.transactions = seed.transactions.map((t) => ({ ...t }));
    if (seed?.tasks) this.tasks = seed.tasks.map((t) => ({ ...t }));
    if (seed?.documents) this.documents = seed.documents.map((d) => ({ ...d }));
  }

  dump() {
    return {
      transactions: this.transactions.map((t) => ({ ...t })),
      tasks: this.tasks.map((t) => ({ ...t })),
      financeRecords: [] as unknown[],
      documents: this.documents.map((d) => ({ ...d })),
    };
  }

  replace(seed: {
    transactions?: Transaction[];
    tasks?: TransactionTask[];
    financeRecords?: unknown[];
    documents?: TransactionDocument[];
  }) {
    this.transactions = (seed.transactions ?? []).map((t) => ({ ...t }));
    this.tasks = (seed.tasks ?? []).map((t) => ({ ...t }));
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
    this.transactions = [{ ...transaction, agreedFees: 0 }, ...this.transactions].map((t) => ({ ...t }));
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<Transaction> {
    const idx = this.transactions.findIndex((t) => t.id === id);
    if (idx === -1) throw new Error('Transaction not found');
    const next = { ...this.transactions[idx], ...updates, agreedFees: 0 };
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
