import SecureStoreService from '@/app/services/SecureStoreService';
import type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '@/app/services/cloud/lawyerTransactionTypes';
import { sanitizeTransactionsThreadingSaveInput } from '@/app/services/transactions/sanitizeTransactionsThreadingPersist';

const TRANSACTIONS_THREADING_LOCAL_KEY_PREFIX = 'hami:transactionsThreading:v1:';

function getTransactionsThreadingLocalKey(userId: string): string {
    return `${TRANSACTIONS_THREADING_LOCAL_KEY_PREFIX}${userId}`;
}

function parseTransactionsThreadingState(
    userId: string,
    parsed: unknown,
): TransactionsThreadingState | null {
    if (!parsed || typeof parsed !== 'object') return null;
    const state = parsed as Partial<TransactionsThreadingState>;
    if (state.userId !== userId) return null;
    if (
        !Array.isArray(state.transactions) ||
        !Array.isArray(state.tasks) ||
        !Array.isArray(state.financeRecords) ||
        !Array.isArray(state.documents)
    ) {
        return null;
    }

    return {
        schemaVersion: 1,
        userId,
        updatedAt: String(state.updatedAt ?? ''),
        transactions: state.transactions,
        tasks: state.tasks,
        financeRecords: state.financeRecords,
        documents: state.documents,
    };
}

function itemId(item: unknown): string | null {
    if (!item || typeof item !== 'object') return null;
    const id = (item as { id?: unknown }).id;
    if (typeof id === 'string' && id.trim()) return id.trim();
    if (typeof id === 'number' && Number.isFinite(id)) return String(id);
    return null;
}

function itemTime(item: unknown): number {
    if (!item || typeof item !== 'object') return 0;
    const row = item as Record<string, unknown>;
    for (const key of ['updatedAt', 'completedAt', 'uploadedAt', 'createdAt', 'date'] as const) {
        const raw = row[key];
        if (typeof raw !== 'string' || !raw.trim()) continue;
        const t = Date.parse(raw);
        if (Number.isFinite(t)) return t;
    }
    return 0;
}

/** دمج بالـ id — المحلي يفوز عند التعادل لحماية الحفظ الفوري من سحابة قديمة */
export function mergeThreadingRecordsById(local: unknown[], remote: unknown[]): unknown[] {
    const merged = new Map<string, unknown>();
    for (const item of remote) {
        const id = itemId(item);
        if (id) merged.set(id, item);
    }
    for (const item of local) {
        const id = itemId(item);
        if (!id) continue;
        const prev = merged.get(id);
        if (!prev) {
            merged.set(id, item);
            continue;
        }
        const lTime = itemTime(item);
        const rTime = itemTime(prev);
        merged.set(id, lTime >= rTime ? item : prev);
    }
    return Array.from(merged.values());
}

/**
 * دمج حالة المعاملات محلي↔سحابة دون استبدال كامل.
 * يمنع اختفاء البطاقات عندما تكون السحابة أقدم أو أنقص.
 */
export function mergeTransactionsThreadingStates(
    local: TransactionsThreadingState | null,
    remote: TransactionsThreadingState | null,
): TransactionsThreadingState | null {
    if (!local && !remote) return null;
    if (!local) return remote;
    if (!remote) return local;

    const lTime = Number.isFinite(Date.parse(local.updatedAt)) ? Date.parse(local.updatedAt) : 0;
    const rTime = Number.isFinite(Date.parse(remote.updatedAt)) ? Date.parse(remote.updatedAt) : 0;

    return {
        schemaVersion: 1,
        userId: local.userId,
        updatedAt: lTime >= rTime ? local.updatedAt : remote.updatedAt,
        transactions: mergeThreadingRecordsById(local.transactions, remote.transactions),
        tasks: mergeThreadingRecordsById(local.tasks, remote.tasks),
        financeRecords: mergeThreadingRecordsById(local.financeRecords, remote.financeRecords),
        documents: mergeThreadingRecordsById(local.documents, remote.documents),
    };
}

export function mirrorTransactionsThreadingLocalSync(
    userId: string,
    input: TransactionsThreadingSaveInput,
): void {
    if (typeof localStorage === 'undefined') return;
    const state = sanitizeTransactionsThreadingSaveInput(userId, input);
    const key = getTransactionsThreadingLocalKey(userId);
    try {
        localStorage.setItem(key, JSON.stringify(state));
    } catch {
        /* ignore mirror write */
    }
}

export function peekTransactionsThreadingState(userId: string): TransactionsThreadingState | null {
    const key = getTransactionsThreadingLocalKey(userId);
    if (typeof localStorage !== 'undefined') {
        try {
            if (localStorage.getItem(key) !== null) {
                const raw = localStorage.getItem(key);
                if (raw) return parseTransactionsThreadingState(userId, JSON.parse(raw));
            }
        } catch {
            /* fall through */
        }
    }
    try {
        const syncRaw = SecureStoreService.getItemSync(key);
        if (syncRaw != null && typeof syncRaw === 'string') {
            return parseTransactionsThreadingState(userId, JSON.parse(syncRaw));
        }
    } catch {
        /* fall through */
    }
    return null;
}

export {
    getTransactionsThreadingLocalKey,
    parseTransactionsThreadingState,
};
