import type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '@/app/services/cloud/lawyerTransactionTypes';
import {
    TransactionStatus,
    TransactionTaskStatus,
    type Transaction,
    type TransactionDocument,
    type TransactionTask,
} from '@/app/modules/transactionsThreading/types';
import {
    sanitizeTransactionCreateFields,
    sanitizeTransactionDocumentOwnerTag,
    sanitizeTransactionDocumentTitle,
    sanitizeTransactionDocumentType,
    sanitizeTransactionId,
    sanitizeTransactionIsoTimestamp,
    sanitizeTransactionOfficialReference,
    sanitizeTransactionTaskNotes,
    sanitizeTransactionTaskTitle,
    sanitizeTransactionUserId,
} from '@/app/services/transactions/transactionsInputSecurity';

const MAX_TRANSACTIONS = 400;
const MAX_TASKS = 1_500;
const MAX_DOCUMENTS = 1_500;

function sanitizeTransactionStatus(value: unknown): TransactionStatus {
    if (value === TransactionStatus.Paused || value === TransactionStatus.Completed) return value;
    return TransactionStatus.Active;
}

function sanitizeTaskStatus(value: unknown): TransactionTaskStatus {
    if (
        value === TransactionTaskStatus.InProgress ||
        value === TransactionTaskStatus.Blocked ||
        value === TransactionTaskStatus.Done
    ) {
        return value;
    }
    return TransactionTaskStatus.Pending;
}

function optionalIso(value: unknown): string | null | undefined {
    if (value === undefined) return undefined;
    if (value === null) return null;
    const raw = sanitizeTransactionIsoTimestamp(value, '');
    return raw.length > 0 ? raw : null;
}

function sanitizeTransactionRecord(tx: Transaction): Transaction | null {
    const id = sanitizeTransactionId(tx.id);
    if (!id) return null;
    const fields = sanitizeTransactionCreateFields({
        title: tx.title ?? '',
        clientName: tx.clientName ?? '',
        targetDepartment: tx.targetDepartment ?? '',
    });
    const createdAt = sanitizeTransactionIsoTimestamp(tx.createdAt, new Date().toISOString());
    const row: Transaction = {
        id,
        title: fields.title,
        clientName: fields.clientName,
        targetDepartment: fields.targetDepartment,
        status: sanitizeTransactionStatus(tx.status),
        agreedFees: 0,
        createdAt,
        updatedAt: sanitizeTransactionIsoTimestamp(tx.updatedAt, createdAt),
    };
    const archivedAt = optionalIso(tx.archivedAt);
    const deletedAt = optionalIso(tx.deletedAt);
    if (archivedAt !== undefined) row.archivedAt = archivedAt;
    if (deletedAt !== undefined) row.deletedAt = deletedAt;
    return row;
}

function sanitizeTaskRecord(task: TransactionTask): TransactionTask | null {
    const id = sanitizeTransactionId(task.id);
    const transactionId = sanitizeTransactionId(task.transactionId);
    if (!id || !transactionId) return null;
    const createdAt = sanitizeTransactionIsoTimestamp(task.createdAt, new Date().toISOString());
    const parentId = task.parentTaskId == null ? null : sanitizeTransactionId(task.parentTaskId);
    return {
        id,
        transactionId,
        title: sanitizeTransactionTaskTitle(task.title ?? ''),
        status: sanitizeTaskStatus(task.status),
        parentTaskId: parentId || null,
        notes: sanitizeTransactionTaskNotes(task.notes),
        deadline: task.deadline == null ? null : optionalIso(task.deadline) ?? null,
        officialReference: sanitizeTransactionOfficialReference(task.officialReference),
        createdAt,
        completedAt: task.completedAt == null ? null : optionalIso(task.completedAt) ?? null,
    };
}

function sanitizeDocumentRecord(doc: TransactionDocument): TransactionDocument | null {
    const id = sanitizeTransactionId(doc.id);
    const transactionId = sanitizeTransactionId(doc.transactionId);
    if (!id || !transactionId) return null;
    return {
        id,
        transactionId,
        type: sanitizeTransactionDocumentType(doc.type),
        title: sanitizeTransactionDocumentTitle(doc.title ?? ''),
        ownerTag: sanitizeTransactionDocumentOwnerTag(doc.ownerTag),
        uploadedAt: sanitizeTransactionIsoTimestamp(doc.uploadedAt, new Date().toISOString()),
    };
}

/** يعقّم حمولة الحالة قبل الكتابة المحلية/السحابية — المالية المهجورة تُفرَّغ دائماً */
export function sanitizeTransactionsThreadingSaveInput(
    userId: string,
    input: TransactionsThreadingSaveInput,
): TransactionsThreadingState {
    return {
        schemaVersion: 1,
        userId: sanitizeTransactionUserId(userId),
        updatedAt: new Date().toISOString(),
        transactions: (Array.isArray(input.transactions) ? (input.transactions as Transaction[]) : [])
            .map(sanitizeTransactionRecord)
            .filter((row): row is Transaction => row != null)
            .slice(0, MAX_TRANSACTIONS),
        tasks: (Array.isArray(input.tasks) ? (input.tasks as TransactionTask[]) : [])
            .map(sanitizeTaskRecord)
            .filter((row): row is TransactionTask => row != null)
            .slice(0, MAX_TASKS),
        financeRecords: [],
        documents: (Array.isArray(input.documents) ? (input.documents as TransactionDocument[]) : [])
            .map(sanitizeDocumentRecord)
            .filter((row): row is TransactionDocument => row != null)
            .slice(0, MAX_DOCUMENTS),
    };
}














