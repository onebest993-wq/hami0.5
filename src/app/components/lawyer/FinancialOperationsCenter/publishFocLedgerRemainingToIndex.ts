import { syncExecutionIndexRemainingHint } from '@/app/utils/syncExecutionIndexRemainingHint';
import type { UnifiedLedgerStore } from './types';
import {
    computeTotalOwedUnifiedFromStore,
    sumDebtPaidFromLedgerPayments,
    type UnifiedLedgerTotalParams,
} from './utils';

export function computeFocLedgerRemainingHint(
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams,
): { remaining: number; totalOwed: number } {
    const totalOwedUnified = computeTotalOwedUnifiedFromStore(store, params);
    const debtPaidRaw = sumDebtPaidFromLedgerPayments(store);
    const debtPaid = Math.min(Math.max(0, debtPaidRaw), Math.max(0, totalOwedUnified));
    return {
        totalOwed: Math.max(0, Math.round(totalOwedUnified)),
        remaining: Math.max(0, Math.round(totalOwedUnified - debtPaid)),
    };
}

/** يكتب المتبقي المحسوب من الدفتر على فهرس المخزن — بلا فك إضبارة. */
export function publishFocLedgerRemainingToIndex(
    executionId: string | undefined,
    store: UnifiedLedgerStore,
    params: UnifiedLedgerTotalParams,
): { remaining: number; totalOwed: number } | null {
    const id = String(executionId ?? '').trim();
    if (!id) return null;
    const hint = computeFocLedgerRemainingHint(store, params);
    syncExecutionIndexRemainingHint(id, hint.remaining);
    return hint;
}
