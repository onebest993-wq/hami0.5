import SecureStoreService from '@/app/services/SecureStoreService';
import { lawyerCloudKv } from '@/app/services/cloud/lawyerCloudKv';
import type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '@/app/services/cloud/lawyerTransactionTypes';
import {
    getTransactionsThreadingLocalKey,
    parseTransactionsThreadingState,
    peekTransactionsThreadingState,
} from '@/app/services/transactions/transactionsThreadingMirror';

export type { TransactionsThreadingState, TransactionsThreadingSaveInput } from '@/app/services/cloud/lawyerTransactionTypes';

const TRANSACTIONS_LOCAL_KEY = 'hami:transactions:v1';

function serializeTransaction(tx: unknown): unknown {
    return JSON.parse(JSON.stringify(tx));
}

function reviveDates(obj: unknown): unknown {
    if (!obj || typeof obj !== 'object') return obj;
    const record = obj as Record<string, unknown>;
    for (const key of Object.keys(record)) {
        const val = record[key];
        if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(val)) {
            record[key] = new Date(val);
        } else if (Array.isArray(val)) {
            record[key] = val.map(reviveDates);
        } else if (val && typeof val === 'object') {
            record[key] = reviveDates(val);
        }
    }
    return record;
}

async function loadLocalTransactions(): Promise<unknown[]> {
    try {
        const raw = await SecureStoreService.getItem(TRANSACTIONS_LOCAL_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.map(reviveDates) : [];
    } catch {
        try {
            const raw = localStorage.getItem(TRANSACTIONS_LOCAL_KEY);
            if (!raw) return [];
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed.map(reviveDates) : [];
        } catch {
            return [];
        }
    }
}

async function saveLocalTransactions(transactions: unknown[]): Promise<void> {
    const payload = JSON.stringify(transactions.map(serializeTransaction));
    try {
        await SecureStoreService.setItem(TRANSACTIONS_LOCAL_KEY, payload);
    } catch {
        try {
            localStorage.setItem(TRANSACTIONS_LOCAL_KEY, payload);
        } catch {
            /* optional mirror */
        }
    }
}

function mergeTransactions(local: unknown[], remote: unknown[]): unknown[] {
    const map = new Map<string, unknown>();
    for (const t of local) {
        if (t && typeof t === 'object' && 'id' in t) map.set(String((t as { id: unknown }).id), t);
    }
    for (const t of remote) {
        if (!t || typeof t !== 'object' || !('id' in t)) continue;
        const id = String((t as { id: unknown }).id);
        const prev = map.get(id) as { updatedAt?: unknown } | undefined;
        if (!prev) {
            map.set(id, t);
            continue;
        }
        const prevTime = prev.updatedAt ? new Date(String(prev.updatedAt)).getTime() : 0;
        const nextTime =
            (t as { updatedAt?: unknown }).updatedAt
                ? new Date(String((t as { updatedAt?: unknown }).updatedAt)).getTime()
                : 0;
        map.set(id, nextTime > prevTime ? t : prev);
    }
    return Array.from(map.values());
}

export const TransactionDB = {
    async getTransactions(userId: string): Promise<unknown[]> {
        const local = await loadLocalTransactions();
        const userLocal = local.filter(
            (t) => t && typeof t === 'object' && (t as { userId?: unknown }).userId === userId,
        );
        try {
            const res = await lawyerCloudKv.getByPrefix(`transactions:${userId}:`);
            const remote = Array.isArray(res)
                ? res
                      .filter((t) => t && typeof t === 'object' && typeof (t as { id?: unknown }).id === 'string')
                      .map(reviveDates)
                : [];
            const merged = mergeTransactions(userLocal, remote);
            await saveLocalTransactions(merged);
            return merged.sort(
                (a, b) =>
                    new Date(String((b as { createdAt?: unknown }).createdAt ?? 0)).getTime() -
                    new Date(String((a as { createdAt?: unknown }).createdAt ?? 0)).getTime(),
            );
        } catch {
            return userLocal.sort(
                (a, b) =>
                    new Date(String((b as { createdAt?: unknown }).createdAt ?? 0)).getTime() -
                    new Date(String((a as { createdAt?: unknown }).createdAt ?? 0)).getTime(),
            );
        }
    },

    async saveTransaction(transaction: unknown): Promise<void> {
        if (
            !transaction ||
            typeof transaction !== 'object' ||
            !(transaction as { userId?: unknown }).userId ||
            !(transaction as { id?: unknown }).id
        ) {
            throw new Error('userId و id مطلوبان');
        }
        const tx = transaction as { userId: string; id: string };
        const local = await loadLocalTransactions();
        const merged = mergeTransactions(local, [transaction]);
        try {
            await lawyerCloudKv.set(
                `transactions:${tx.userId}:${tx.id}`,
                serializeTransaction(transaction),
            );
        } catch {
            /* Cloud-First */
        }
        await saveLocalTransactions(merged);
    },

    async updateTransaction(transaction: unknown): Promise<void> {
        await this.saveTransaction(transaction);
    },
};

let threadingKvMergeInflight = new Map<string, Promise<void>>();

function kickTransactionsThreadingKvMerge(
    userId: string,
    localBaseline: TransactionsThreadingState | null,
): void {
    if (threadingKvMergeInflight.has(userId)) return;
    const job = (async () => {
        try {
            const remote = await lawyerCloudKv.get(`transactionsThreading:${userId}:state`);
            if (!remote || typeof remote !== 'object') return;
            const parsedRemote = parseTransactionsThreadingState(userId, remote);
            if (!parsedRemote) return;
            const lTime =
                localBaseline && Number.isFinite(Date.parse(localBaseline.updatedAt))
                    ? Date.parse(localBaseline.updatedAt)
                    : 0;
            const rTime = Number.isFinite(Date.parse(parsedRemote.updatedAt))
                ? Date.parse(parsedRemote.updatedAt)
                : 0;
            const merged = parsedRemote && rTime >= lTime ? parsedRemote : localBaseline;
            if (merged) {
                await saveLocalTransactionsThreadingState(userId, merged);
            }
        } catch {
            /* مزامنة خلفية */
        } finally {
            threadingKvMergeInflight.delete(userId);
        }
    })();
    threadingKvMergeInflight.set(userId, job);
}

async function loadLocalTransactionsThreadingState(userId: string): Promise<TransactionsThreadingState | null> {
    const key = getTransactionsThreadingLocalKey(userId);
    try {
        const raw = await SecureStoreService.getItem(key);
        if (!raw) return null;
        return parseTransactionsThreadingState(userId, JSON.parse(raw));
    } catch {
        try {
            const raw = localStorage.getItem(key);
            if (!raw) return null;
            return parseTransactionsThreadingState(userId, JSON.parse(raw));
        } catch {
            return null;
        }
    }
}

async function saveLocalTransactionsThreadingState(
    userId: string,
    state: TransactionsThreadingState,
): Promise<void> {
    const key = getTransactionsThreadingLocalKey(userId);
    const payload = JSON.stringify(state);
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(key, payload);
        } catch {
            /* ignore mirror write */
        }
    }
    void SecureStoreService.setItem(key, payload).catch(() => undefined);
}

export const TransactionsThreadingDB = {
    async getState(userId: string): Promise<TransactionsThreadingState | null> {
        const mirrored = peekTransactionsThreadingState(userId);
        if (mirrored) {
            kickTransactionsThreadingKvMerge(userId, mirrored);
            return mirrored;
        }

        const local = await loadLocalTransactionsThreadingState(userId);
        kickTransactionsThreadingKvMerge(userId, local);
        return local;
    },

    async saveState(userId: string, input: TransactionsThreadingSaveInput): Promise<void> {
        const state: TransactionsThreadingState = {
            schemaVersion: 1,
            userId,
            updatedAt: new Date().toISOString(),
            transactions: Array.isArray(input.transactions) ? input.transactions : [],
            tasks: Array.isArray(input.tasks) ? input.tasks : [],
            financeRecords: Array.isArray(input.financeRecords) ? input.financeRecords : [],
            documents: Array.isArray(input.documents) ? input.documents : [],
        };
        await saveLocalTransactionsThreadingState(userId, state);
        void lawyerCloudKv.set(`transactionsThreading:${userId}:state`, state).catch(() => undefined);
    },
};
