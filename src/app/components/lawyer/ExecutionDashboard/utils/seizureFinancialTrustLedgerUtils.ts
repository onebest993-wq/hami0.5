import { storageCache } from '@/app/utils/storageCache';
import type { LocalPaymentRow } from '@/app/components/lawyer/FinancialOperationsCenter/types';
import {
    computeTotalOwedUnifiedFromStore,
    emptyStore,
    notifyUnifiedLedgerUpdated,
    parseUnifiedLedgerFromStorage,
    recomputeUnifiedLedgerPaymentSnapshots,
    storageKey,
    type UnifiedLedgerStore,
    type UnifiedLedgerTotalParams,
} from '@/app/slices/financial/ledgerPublic';

export type SeizureTrustCollectCreditResult = {
    ok: boolean;
    amount: number;
    created: boolean;
    updated: boolean;
    paymentId?: string;
};

export function pickFirstPositiveIqd(...vals: unknown[]): number {
    for (const v of vals) {
        const n = Number(v);
        if (Number.isFinite(n) && n > 0) return Math.trunc(n);
    }
    return 0;
}

export function resolveTotalOwedForStore(
    store: UnifiedLedgerStore,
    totalOwedIqd: number | undefined,
    ledgerParams?: UnifiedLedgerTotalParams
): number {
    if (typeof totalOwedIqd === 'number' && Number.isFinite(totalOwedIqd) && totalOwedIqd > 0) {
        return Math.trunc(totalOwedIqd);
    }
    if (ledgerParams) {
        return Math.max(0, Math.trunc(computeTotalOwedUnifiedFromStore(store, ledgerParams)));
    }
    return 0;
}

export function persistReconciledTrustStore(
    exId: string,
    nextStore: UnifiedLedgerStore,
    paymentRow?: Record<string, unknown>
): void {
    storageCache.set(storageKey(exId), nextStore);
    notifyUnifiedLedgerUpdated(exId);
    if (paymentRow) {
        try {
            window.dispatchEvent(
                new CustomEvent('hami-unified-ledger-external-collect', {
                    detail: { executionId: exId, payment: paymentRow },
                })
            );
        } catch {
            /* ignore */
        }
    }
}

export function upsertTrustCollectPayment(input: {
    store: UnifiedLedgerStore;
    paymentId: string;
    amount: number;
    at: string;
    totalOwed: number;
    findExistingIndex: (payments: LocalPaymentRow[]) => number;
    buildNewRow: () => Record<string, unknown>;
}): {
    store: UnifiedLedgerStore;
    created: boolean;
    updated: boolean;
    paymentRow?: LocalPaymentRow;
    unchanged: boolean;
} {
    const payments = [...(input.store.payments || [])];
    const idx = input.findExistingIndex(payments);
    let created = false;
    let updated = false;

    if (idx >= 0) {
        const cur = payments[idx];
        const curAmt = Math.trunc(Number(cur.amount) || 0);
        if (curAmt !== input.amount) {
            payments[idx] = {
                ...cur,
                amount: input.amount,
                at: String(cur.at || input.at),
            };
            updated = true;
        }
    } else {
        payments.unshift(input.buildNewRow() as LocalPaymentRow);
        created = true;
    }

    if (!created && !updated) {
        return { store: input.store, created: false, updated: false, unchanged: true };
    }

    let nextStore: UnifiedLedgerStore = { ...input.store, payments };
    nextStore = recomputeUnifiedLedgerPaymentSnapshots(nextStore, input.totalOwed);
    const paymentRow = nextStore.payments.find((p) => String(p.id || '') === input.paymentId);
    return { store: nextStore, created, updated, paymentRow, unchanged: false };
}

export function seizureProceedsLedgerGapIqd(
    executionId: string,
    expected: number,
    paymentId: string
): { expected: number; credited: number; gap: number } {
    const exId = String(executionId || '').trim();
    if (!exId || expected <= 0) return { expected, credited: 0, gap: expected };
    const store = parseUnifiedLedgerFromStorage(storageCache.get(storageKey(exId))) ?? emptyStore();
    const row = (store.payments || []).find((p) => String(p.id || '') === paymentId);
    const credited = row ? Math.trunc(Number(row.amount) || 0) : 0;
    return { expected, credited, gap: Math.max(0, expected - credited) };
}
