import type { TransactionsThreadingRepository } from './repository';
import { createThreadingId } from './ids';
import {
  sanitizeTransactionCreateFields,
  sanitizeTransactionDocumentOwnerTag,
  sanitizeTransactionDocumentTitle,
  sanitizeTransactionDocumentType,
  sanitizeTransactionOfficialReference,
  sanitizeTransactionTaskNotes,
  sanitizeTransactionTaskTitle,
} from '@/app/services/transactions/transactionsInputSecurity';
import {
  TransactionStatus,
  TransactionTaskStatus,
  type Transaction,
  type TransactionDocument,
  type TransactionDocumentOwnerTag,
  type TransactionTask,
} from './types';

export { buildTaskTree } from './taskTree';

export class TransactionsThreadingService {
  constructor(
    private readonly repo: TransactionsThreadingRepository,
    private readonly idFactory: () => string = createThreadingId,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  buildTransaction(input: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>): Transaction {
    const now = this.now();
    const sanitized = sanitizeTransactionCreateFields({
      title: input.title,
      clientName: input.clientName,
      targetDepartment: input.targetDepartment,
    });
    return {
      id: this.idFactory(),
      title: sanitized.title,
      clientName: sanitized.clientName,
      targetDepartment: sanitized.targetDepartment,
      status:
        input.status === TransactionStatus.Paused || input.status === TransactionStatus.Completed
          ? input.status
          : TransactionStatus.Active,
      agreedFees: 0,
      createdAt: now,
      updatedAt: now,
    };
  }

  async persistTransaction(transaction: Transaction): Promise<void> {
    await this.repo.saveTransaction(transaction);
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
      title: sanitizeTransactionTaskTitle(input.title),
      status: input.status ?? TransactionTaskStatus.Pending,
      parentTaskId,
      notes: sanitizeTransactionTaskNotes(input.notes),
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
    if (typeof updates.title === 'string') next.title = sanitizeTransactionTaskTitle(updates.title);
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
    const ref = sanitizeTransactionOfficialReference(officialReference);
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

  async setTransactionArchived(transactionId: string, archived: boolean): Promise<Transaction> {
    const tx = await this.repo.getTransaction(transactionId);
    if (!tx) throw new Error('Transaction not found');
    return this.repo.updateTransaction(transactionId, {
      archivedAt: archived ? this.now() : null,
      updatedAt: this.now(),
    });
  }

  async setTransactionDeleted(transactionId: string, deleted: boolean): Promise<Transaction> {
    const tx = await this.repo.getTransaction(transactionId);
    if (!tx) throw new Error('Transaction not found');
    return this.repo.updateTransaction(transactionId, {
      deletedAt: deleted ? this.now() : null,
      updatedAt: this.now(),
    });
  }

  async listTransactions(): Promise<Transaction[]> {
    return this.repo.listTransactions();
  }

  async listTasks(transactionId: string): Promise<TransactionTask[]> {
    return this.repo.listTasks(transactionId);
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
      type: sanitizeTransactionDocumentType(input.type),
      title: sanitizeTransactionDocumentTitle(input.title),
      ownerTag: sanitizeTransactionDocumentOwnerTag(input.ownerTag),
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
