import type { Transaction, TransactionDocument, TransactionTask } from './types';
import { PersistentTransactionsThreadingRepository } from './persistentRepository';
import { InMemoryTransactionsThreadingRepository, type TransactionsThreadingRepository } from './repository';
import { TransactionsThreadingService } from './service';
import { peekTransactionsThreadingState } from '@/app/services/transactions/transactionsThreadingMirror';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    groupThreadingSeedForStore,
    type ThreadingRepositorySeed,
} from './transactionsThreadingStoreSeed';

export type TransactionsThreadingStoreSlice = {
    userId: string | null;
    transactions: Transaction[];
    tasksByTransactionId: Record<string, TransactionTask[]>;
    documentsByTransactionId: Record<string, TransactionDocument[]>;
};

export let repo: TransactionsThreadingRepository = new InMemoryTransactionsThreadingRepository({
    transactions: [],
    tasks: [],
    financeRecords: [],
    documents: [],
});
export let service = new TransactionsThreadingService(repo);
export let boundUserId: string | null = null;

let patchStore: ((patch: Partial<TransactionsThreadingStoreSlice>) => void) | null = null;
let patchStoreFn:
    | ((fn: (state: TransactionsThreadingStoreSlice) => Partial<TransactionsThreadingStoreSlice>) => void)
    | null = null;
let readTransactionCount: (() => number) | null = null;
let readFallbackUserId: (() => string | null) | null = null;

export function registerTransactionsThreadingStoreBridge(bridge: {
    patchStore: (patch: Partial<TransactionsThreadingStoreSlice>) => void;
    patchStoreFn: (
        fn: (state: TransactionsThreadingStoreSlice) => Partial<TransactionsThreadingStoreSlice>,
    ) => void;
    readTransactionCount: () => number;
    readFallbackUserId: () => string | null;
}): void {
    patchStore = bridge.patchStore;
    patchStoreFn = bridge.patchStoreFn;
    readTransactionCount = bridge.readTransactionCount;
    readFallbackUserId = bridge.readFallbackUserId;
}

function reseedStoreFromMirrorIfEmpty(userId: string): void {
    if ((readTransactionCount?.() ?? 0) > 0) return;

    const mirrored = peekTransactionsThreadingState(userId);
    if (!mirrored) return;

    const seed: ThreadingRepositorySeed = {
        transactions: mirrored.transactions as Transaction[],
        tasks: mirrored.tasks as TransactionTask[],
        financeRecords: [],
        documents: mirrored.documents as TransactionDocument[],
    };
    repo = new PersistentTransactionsThreadingRepository(userId, seed);
    service = new TransactionsThreadingService(repo);
    const grouped = groupThreadingSeedForStore(seed);
    patchStore?.({
        userId,
        transactions: grouped.transactions,
        tasksByTransactionId: grouped.tasksByTransactionId,
        documentsByTransactionId: grouped.documentsByTransactionId,
    });
}

export function bindTransactionsUser(next: string): void {
    if (boundUserId === next) {
        reseedStoreFromMirrorIfEmpty(next);
        return;
    }

    boundUserId = next;
    const mirrored = peekTransactionsThreadingState(next);
    const seed: ThreadingRepositorySeed | undefined = mirrored
        ? {
              transactions: mirrored.transactions as Transaction[],
              tasks: mirrored.tasks as TransactionTask[],
              financeRecords: [],
              documents: mirrored.documents as TransactionDocument[],
          }
        : undefined;

    repo = new PersistentTransactionsThreadingRepository(next, seed);
    service = new TransactionsThreadingService(repo);

    const grouped = seed ? groupThreadingSeedForStore(seed) : null;
    patchStore?.({
        userId: next,
        transactions: grouped?.transactions ?? [],
        tasksByTransactionId: grouped?.tasksByTransactionId ?? {},
        documentsByTransactionId: grouped?.documentsByTransactionId ?? {},
    });
}

/** ربط فوري للمستخدم — قبل أي إضافة/حفظ */
export function ensureTransactionsUserBound(userId: string): void {
    const next = userId?.trim();
    if (!next) return;
    bindTransactionsUser(next);
}

export function rollbackOptimisticTransaction(txId: string): void {
    patchStoreFn?.((state) => ({
        transactions: state.transactions.filter((item) => item.id !== txId),
    }));
    SmartToast.error('تعذر حفظ المعاملة — حاول مرة أخرى');
}

export function syncThreadingToCalendar(): void {
    const lawyerId = boundUserId ?? readFallbackUserId?.() ?? null;
    if (!lawyerId) return;
    void import('@/app/hooks/useIncrementalCalendarSync')
        .then((m) => m.bumpThreadingCalendarSync(lawyerId))
        .catch(() => undefined);
}
