import {
    persistSecurePayloadWhenReady,
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
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

    const sanitized = sanitizeTransactionsThreadingSaveInput(userId, {
        transactions: state.transactions,
        tasks: state.tasks,
        financeRecords: [],
        documents: state.documents,
    });
    return {
        ...sanitized,
        updatedAt: String(state.updatedAt ?? ''),
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

function persistThreadingPayload(key: string, payload: string): void {
    writeSecureAndClearLegacySync(key, payload);
    void persistSecurePayloadWhenReady(key, payload);
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
        financeRecords: [],
        documents: mergeThreadingRecordsById(local.documents, remote.documents),
    };
}

export function mirrorTransactionsThreadingLocalSync(
    userId: string,
    input: TransactionsThreadingSaveInput,
): void {
    const state = sanitizeTransactionsThreadingSaveInput(userId, input);
    persistThreadingPayload(getTransactionsThreadingLocalKey(userId), JSON.stringify(state));
}

export function peekTransactionsThreadingState(userId: string): TransactionsThreadingState | null {
    const key = getTransactionsThreadingLocalKey(userId);
    try {
        const raw = readSecureOrDrainLegacySync(key);
        if (raw == null) return null;
        return parseTransactionsThreadingState(userId, JSON.parse(raw));
    } catch {
        return null;
    }
}

export {
    getTransactionsThreadingLocalKey,
    parseTransactionsThreadingState,
};
