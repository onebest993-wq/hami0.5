import type { Transaction } from '@/app/modules/transactionsThreading/types';

export const TRANSACTION_LIST_RENDER_BATCH = 28;

export function resolveTransactionListLimit(input: {
    total: number;
    requested: number;
    items: readonly Pick<Transaction, 'id'>[];
    ensureId?: string | null;
}): number {
    const batchFloor = Math.max(TRANSACTION_LIST_RENDER_BATCH, input.requested);
    let limit = Math.min(input.total, batchFloor);
    if (input.ensureId) {
        const index = input.items.findIndex((item) => item.id === input.ensureId);
        if (index >= 0) limit = Math.max(limit, index + 1);
    }
    return limit;
}
