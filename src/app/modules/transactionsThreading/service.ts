import type { TransactionsThreadingRepository } from './repository';
import { createThreadingId } from './ids';
import {
  FinanceRecordType,
  TransactionStatus,
  TransactionTaskStatus,
  type FinanceRecord,
  type Transaction,
  type TransactionDocument,
  type TransactionDocumentOwnerTag,
  type TransactionTask,
  type TransactionTaskNode,
} from './types';

export function buildTaskTree(flatTasks: TransactionTask[]): TransactionTaskNode[] {
  const nodeById = new Map<string, TransactionTaskNode>();
  for (const task of flatTasks) {
    nodeById.set(task.id, { ...task, children: [] });
  }

  const roots: TransactionTaskNode[] = [];

  const isCycle = (childId: string, parentId: string) => {
    const visited = new Set<string>([childId]);
    let cursor: TransactionTaskNode | undefined = nodeById.get(parentId);
    while (cursor) {
      if (visited.has(cursor.id)) return true;
      visited.add(cursor.id);
      cursor = cursor.parentTaskId ? nodeById.get(cursor.parentTaskId) : undefined;
    }
    return false;
  };

  for (const node of nodeById.values()) {
    if (!node.parentTaskId) {
      roots.push(node);
      continue;
    }

    const parent = nodeById.get(node.parentTaskId);
    if (!parent) {
      roots.push({ ...node, parentTaskId: null });
      continue;
    }

    if (isCycle(node.id, parent.id)) {
      roots.push({ ...node, parentTaskId: null });
      continue;
    }

    parent.children.push(node);
  }

  const sortByCreatedAt = (a: TransactionTaskNode, b: TransactionTaskNode) =>
    a.createdAt.localeCompare(b.createdAt);

  const sortDeep = (nodes: TransactionTaskNode[]) => {
    nodes.sort(sortByCreatedAt);
    for (const n of nodes) sortDeep(n.children);
  };

  sortDeep(roots);
  return roots;
}

export class TransactionsThreadingService {
  constructor(
    private readonly repo: TransactionsThreadingRepository,
    private readonly idFactory: () => string = createThreadingId,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async createTransaction(input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Promise<Transaction> {
    const now = this.now();
    const tx: Transaction = {
      ...input,
      id: this.idFactory(),
      createdAt: now,
      updatedAt: now,
    };
    await this.repo.saveTransaction(tx);
    return tx;
  }

  async addTask(input: {
    transactionId: string;
    title: string;
    status?: TransactionTaskStatus;
    parentTaskId?: string | null;
    notes?: string | null;
    deadline?: string | null;
  }): Promise<TransactionTask> {
    const tx = await this.repo.getTransaction(input.transactionId);
    if (!tx) throw new Error('Transaction not found');

    const parentTaskId = input.parentTaskId ?? null;
    if (parentTaskId) {
      const parent = await this.repo.getTask(parentTaskId);
      if (!parent || parent.transactionId !== input.transactionId) throw new Error('Invalid parentTaskId');
    }

    const task: TransactionTask = {
      id: this.idFactory(),
      transactionId: input.transactionId,
      title: input.title,
      status: input.status ?? TransactionTaskStatus.Pending,
      parentTaskId,
      notes: input.notes ?? null,
      deadline: input.deadline ?? null,
      officialReference: null,
      createdAt: this.now(),
      completedAt: null,
    };

    await this.repo.saveTask(task);
    await this.repo.updateTransaction(input.transactionId, { updatedAt: this.now() });
    return task;
  }

  async updateTaskStatus(taskId: string, status: TransactionTaskStatus): Promise<TransactionTask> {
    const existing = await this.repo.getTask(taskId);
    if (!existing) throw new Error('Task not found');

    const completedAt = status === TransactionTaskStatus.Done ? existing.completedAt ?? this.now() : null;
    const updated = await this.repo.updateTask(taskId, { status, completedAt });
    await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
    return updated;
  }

  async updateTask(taskId: string, updates: { title?: string; deadline?: string | null }): Promise<TransactionTask> {
    const existing = await this.repo.getTask(taskId);
    if (!existing) throw new Error('Task not found');
    const next: Partial<TransactionTask> = {};
    if (typeof updates.title === 'string') next.title = updates.title.trim();
    if (updates.deadline !== undefined) next.deadline = updates.deadline;
    const updated = await this.repo.updateTask(taskId, next);
    await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
    return updated;
  }

  async deleteTask(taskId: string): Promise<void> {
    const existing = await this.repo.getTask(taskId);
    if (!existing) return;
    await this.repo.deleteTask(taskId);
    await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
  }

  async completeTask(taskId: string, officialReference?: string | null): Promise<TransactionTask> {
    const existing = await this.repo.getTask(taskId);
    if (!existing) throw new Error('Task not found');
    const ref = officialReference?.trim() ? officialReference.trim() : null;
    const updated = await this.repo.updateTask(taskId, {
      status: TransactionTaskStatus.Done,
      completedAt: existing.completedAt ?? this.now(),
      officialReference: ref,
    });
    await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
    return updated;
  }

  async setTransactionStatus(transactionId: string, status: TransactionStatus): Promise<Transaction> {
    const tx = await this.repo.getTransaction(transactionId);
    if (!tx) throw new Error('Transaction not found');
    return this.repo.updateTransaction(transactionId, { status, updatedAt: this.now() });
  }

  async setTransactionAgreedFees(transactionId: string, agreedFees: number): Promise<Transaction> {
    const tx = await this.repo.getTransaction(transactionId);
    if (!tx) throw new Error('Transaction not found');
    return this.repo.updateTransaction(transactionId, { agreedFees, updatedAt: this.now() });
  }

  async listTransactions(): Promise<Transaction[]> {
    return this.repo.listTransactions();
  }

  async listTasks(transactionId: string): Promise<TransactionTask[]> {
    return this.repo.listTasks(transactionId);
  }

  async listFinanceRecords(transactionId: string): Promise<FinanceRecord[]> {
    return this.repo.listFinanceRecords(transactionId);
  }

  async addFinanceRecord(input: {
    transactionId: string;
    type: FinanceRecordType;
    amount: number;
    description: string;
    date?: string;
  }): Promise<FinanceRecord> {
    const tx = await this.repo.getTransaction(input.transactionId);
    if (!tx) throw new Error('Transaction not found');

    const record: FinanceRecord = {
      id: this.idFactory(),
      transactionId: input.transactionId,
      type: input.type,
      amount: input.amount,
      description: input.description,
      date: input.date ?? this.now(),
    };

    await this.repo.saveFinanceRecord(record);
    await this.repo.updateTransaction(input.transactionId, { updatedAt: this.now() });
    return record;
  }

  async updateFinanceRecord(
    id: string,
    updates: { type?: FinanceRecordType; amount?: number; description?: string; date?: string },
  ): Promise<FinanceRecord> {
    const existing = await this.repo.getFinanceRecord(id);
    if (!existing) throw new Error('Finance record not found');
    const next: Partial<FinanceRecord> = {};
    if (updates.type) next.type = updates.type;
    if (typeof updates.amount === 'number') next.amount = updates.amount;
    if (typeof updates.description === 'string') next.description = updates.description.trim();
    if (typeof updates.date === 'string') next.date = updates.date;
    const updated = await this.repo.updateFinanceRecord(id, next);
    await this.repo.updateTransaction(updated.transactionId, { updatedAt: this.now() });
    return updated;
  }

  async deleteFinanceRecord(id: string): Promise<void> {
    const existing = await this.repo.getFinanceRecord(id);
    await this.repo.deleteFinanceRecord(id);
    if (existing) await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
  }

  async listDocuments(transactionId: string): Promise<TransactionDocument[]> {
    return this.repo.listDocuments(transactionId);
  }

  async addDocument(input: {
    transactionId: string;
    title: string;
    ownerTag: TransactionDocumentOwnerTag;
    type?: string;
    uploadedAt?: string;
  }): Promise<TransactionDocument> {
    const tx = await this.repo.getTransaction(input.transactionId);
    if (!tx) throw new Error('Transaction not found');

    const doc: TransactionDocument = {
      id: this.idFactory(),
      transactionId: input.transactionId,
      type: input.type ?? 'مستمسك',
      title: input.title,
      ownerTag: input.ownerTag,
      uploadedAt: input.uploadedAt ?? this.now(),
    };

    await this.repo.saveDocument(doc);
    await this.repo.updateTransaction(input.transactionId, { updatedAt: this.now() });
    return doc;
  }

  async deleteDocument(id: string): Promise<void> {
    const existing = await this.repo.getDocument(id);
    await this.repo.deleteDocument(id);
    if (existing) await this.repo.updateTransaction(existing.transactionId, { updatedAt: this.now() });
  }
}
