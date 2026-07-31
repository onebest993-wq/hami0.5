import type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '@/app/services/cloud/lawyerTransactionTypes';
import type {
    FinanceRecord,
    Transaction,
    TransactionDocument,
    TransactionTask,
} from '@/app/modules/transactionsThreading/types';
import {
    sanitizeTransactionAgreedFees,
    sanitizeTransactionCreateFields,
    sanitizeTransactionDocumentTitle,
    sanitizeTransactionDocumentType,
    sanitizeTransactionFinanceAmount,
    sanitizeTransactionFinanceDescription,
    sanitizeTransactionOfficialReference,
    sanitizeTransactionTaskNotes,
    sanitizeTransactionTaskTitle,
} from '@/app/services/transactions/transactionsInputSecurity';

function sanitizeTransactionRecord(tx: Transaction): Transaction {
    const fields = sanitizeTransactionCreateFields({
        title: tx.title ?? '',
        clientName: tx.clientName ?? '',
        targetDepartment: tx.targetDepartment ?? '',
    });
    let agreedFees = 0;
    try {
        agreedFees = sanitizeTransactionAgreedFees(Number(tx.agreedFees) || 0);
    } catch {
        agreedFees = 0;
    }
    return {
        ...tx,
        ...fields,
        agreedFees,
    };
}

function sanitizeTaskRecord(task: TransactionTask): TransactionTask {
    return {
        ...task,
        title: sanitizeTransactionTaskTitle(task.title ?? ''),
        notes: sanitizeTransactionTaskNotes(task.notes),
        officialReference: sanitizeTransactionOfficialReference(task.officialReference),
    };
}

function sanitizeFinanceRecord(record: FinanceRecord): FinanceRecord | null {
    try {
        return {
            ...record,
            amount: sanitizeTransactionFinanceAmount(Number(record.amount)),
            description: sanitizeTransactionFinanceDescription(record.description ?? ''),
        };
    } catch {
        return null;
    }
}

function sanitizeDocumentRecord(doc: TransactionDocument): TransactionDocument {
    return {
        ...doc,
        title: sanitizeTransactionDocumentTitle(doc.title ?? ''),
        type: sanitizeTransactionDocumentType(doc.type),
    };
}

/** يعقّم حمولة الحالة قبل الكتابة المحلية/السحابية */
export function sanitizeTransactionsThreadingSaveInput(
    userId: string,
    input: TransactionsThreadingSaveInput,
): TransactionsThreadingState {
    const financeRecords = (Array.isArray(input.financeRecords) ? (input.financeRecords as FinanceRecord[]) : [])
        .map(sanitizeFinanceRecord)
        .filter((r): r is FinanceRecord => r != null);

    return {
        schemaVersion: 1,
        userId,
        updatedAt: new Date().toISOString(),
        transactions: (Array.isArray(input.transactions) ? (input.transactions as Transaction[]) : []).map(
            sanitizeTransactionRecord,
        ),
        tasks: (Array.isArray(input.tasks) ? (input.tasks as TransactionTask[]) : []).map(sanitizeTaskRecord),
        financeRecords,
        documents: (Array.isArray(input.documents) ? (input.documents as TransactionDocument[]) : []).map(
            sanitizeDocumentRecord,
        ),
    };
}
