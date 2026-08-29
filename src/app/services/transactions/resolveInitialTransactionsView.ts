import type { Transaction } from '@/app/modules/transactionsThreading/types';

type TransactionsHubView = 'list' | 'details';

export function resolveInitialTransactionsView(
    initialTransactionId: string | undefined,
    transactions: Transaction[],
): { view: TransactionsHubView; selectedId: string | null; missingFocusId: boolean } {
    const focusId = initialTransactionId?.trim();
    if (!focusId) {
        return { view: 'list', selectedId: null, missingFocusId: false };
    }
    const exists = transactions.some((tx) => tx.id === focusId);
    if (!exists) {
        return { view: 'list', selectedId: null, missingFocusId: true };
    }
    return { view: 'details', selectedId: focusId, missingFocusId: false };
}
