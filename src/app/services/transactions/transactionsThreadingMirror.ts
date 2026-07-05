import SecureStoreService from '@/app/services/SecureStoreService';
import type {
    TransactionsThreadingSaveInput,
    TransactionsThreadingState,
} from '@/app/services/cloud/lawyerTransactionTypes';

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

export function mirrorTransactionsThreadingLocalSync(
    userId: string,
    input: TransactionsThreadingSaveInput,
): void {
    if (typeof localStorage === 'undefined') return;
    const key = getTransactionsThreadingLocalKey(userId);
    const state: TransactionsThreadingState = {
        schemaVersion: 1,
        userId,
        updatedAt: new Date().toISOString(),
        transactions: Array.isArray(input.transactions) ? input.transactions : [],
        tasks: Array.isArray(input.tasks) ? input.tasks : [],
        financeRecords: Array.isArray(input.financeRecords) ? input.financeRecords : [],
        documents: Array.isArray(input.documents) ? input.documents : [],
    };
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
