import type { SeizedMovable } from '@/app/types/execution';
import { storageCache } from '@/app/utils/storageCache';
import {
    computeTotalOwedUnifiedFromStore,
    emptyStore,
    notifyUnifiedLedgerUpdated,
    parseUnifiedLedgerFromStorage,
    recomputeUnifiedLedgerPaymentSnapshots,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
    type UnifiedLedgerStore,
    type UnifiedLedgerTotalParams,
} from '@/app/components/lawyer/FinancialOperationsCenter/utils';

export function resolveMovableSaleProceedsIqd(m: SeizedMovable): number {
    const pick = (...vals: unknown[]): number => {
        for (const v of vals) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return Math.trunc(n);
        }
        return 0;
    };
    return pick(
        m.finalAwardAmountIqd,
        m.award?.awardAmountIqd,
        m.initialAwardAmountIqd
    );
}

export function movableProceedsTrustPaymentId(movableId: string): string {
    return `pay-movable-proceeds-${String(movableId || '').trim()}`;
}

export type MovableProceedsTrustCreditResult = {
    ok: boolean;
    amount: number;
    created: boolean;
    updated: boolean;
    paymentId?: string;
};

function resolveTotalOwedForStore(
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

function buildProceedsPaymentRow(input: {
    paymentId: string;
    amount: number;
    at: string;
    movableId: string;
    description?: string;
}): Record<string, unknown> {
    return {
        id: input.paymentId,
        amount: input.amount,
        at: input.at,
        kind: 'partial' as const,
        entryType: 'collect' as const,
        balanceAfter: 0,
        debtBalanceAfter: 0,
        trustBalanceAfter: 0,
        source: 'movable_sale_proceeds',
        seizedMovableId: input.movableId,
        note: input.description || 'حصيلة بيع — مال منقول',
    };
}

function persistReconciledStore(exId: string, nextStore: UnifiedLedgerStore, paymentRow?: Record<string, unknown>) {
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

/**
 * مزامنة جذرية: حصيلة البيع = مبلغ الإحالة/الرسو في الأمانات، ويُخصم من المتبقي عبر collect.
 * يُحدّث المبلغ إذا تغيّر سعر البيع في بطاقة المنقول.
 */
export function creditMovableSaleProceedsToTrustLedger(input: {
    executionId: string;
    movable: SeizedMovable;
    at?: string;
    totalOwedIqd?: number;
    ledgerParams?: UnifiedLedgerTotalParams;
}): MovableProceedsTrustCreditResult {
    const exId = String(input.executionId || '').trim();
    const movableId = String(input.movable?.id || '').trim();
    if (!exId || !movableId) {
        return { ok: false, amount: 0, created: false, updated: false };
    }

    const amount = resolveMovableSaleProceedsIqd(input.movable);
    if (amount <= 0) {
        return { ok: false, amount: 0, created: false, updated: false };
    }

    const paymentId = movableProceedsTrustPaymentId(movableId);
    const at = String(input.at || new Date().toISOString());
    const key = storageKey(exId);
    const store = parseUnifiedLedgerFromStorage(storageCache.get(key)) ?? emptyStore();
    const totalOwed = resolveTotalOwedForStore(store, input.totalOwedIqd, input.ledgerParams);

    const desc = String(input.movable.movableDescription || '').trim();
    const payments = [...(store.payments || [])];
    const idx = payments.findIndex((p) => String(p.id || '') === paymentId);
    let created = false;
    let updated = false;

    if (idx >= 0) {
        const cur = payments[idx];
        const curAmt = Math.trunc(Number(cur.amount) || 0);
        if (curAmt !== amount) {
            payments[idx] = {
                ...cur,
                amount,
                at: String(cur.at || at),
            };
            updated = true;
        }
    } else {
        payments.unshift(
            buildProceedsPaymentRow({
                paymentId,
                amount,
                at,
                movableId,
                description: desc ? `حصيلة بيع: ${desc}` : undefined,
            }) as (typeof payments)[number]
        );
        created = true;
    }

    if (!created && !updated) {
        return { ok: true, amount, created: false, updated: false, paymentId };
    }

    let nextStore: UnifiedLedgerStore = { ...store, payments };
    nextStore = recomputeUnifiedLedgerPaymentSnapshots(nextStore, totalOwed);
    const row = nextStore.payments.find((p) => String(p.id || '') === paymentId);
    persistReconciledStore(exId, nextStore, row as Record<string, unknown> | undefined);

    return { ok: true, amount, created, updated, paymentId };
}

/** مزامنة كل المنقولات المباعة — إنشاء أو تصحيح حصيلة البيع */
export function syncSoldMovableProceedsToTrustLedger(
    executionId: string,
    movables: SeizedMovable[],
    opts?: { totalOwedIqd?: number; ledgerParams?: UnifiedLedgerTotalParams }
): MovableProceedsTrustCreditResult[] {
    const exId = String(executionId || '').trim();
    if (!exId) return [];
    const results: MovableProceedsTrustCreditResult[] = [];
    for (const m of movables) {
        if (String(m.status || '') !== 'sold') continue;
        const row = creditMovableSaleProceedsToTrustLedger({
            executionId: exId,
            movable: m,
            totalOwedIqd: opts?.totalOwedIqd,
            ledgerParams: opts?.ledgerParams,
        });
        if (row.ok) results.push(row);
    }
    return results;
}

/** إيداع/تصحيح حصيلة البيع مع حساب إجمالي الوعاء من المركز المالي */
export function creditMovableProceedsForExecution(
    executionId: string,
    movable: SeizedMovable,
    ledgerParams: UnifiedLedgerTotalParams,
    at?: string
): MovableProceedsTrustCreditResult {
    const exId = String(executionId || '').trim();
    if (!exId) return { ok: false, amount: 0, created: false, updated: false };
    const totals = resolveUnifiedLedgerFinancialTotals(exId, ledgerParams, (k) =>
        storageCache.get(k)
    );
    return creditMovableSaleProceedsToTrustLedger({
        executionId: exId,
        movable,
        at,
        totalOwedIqd: totals.totalOwedUnified,
        ledgerParams,
    });
}

/** للتحقق: هل رصيد الأمانات يغطي حصيلة منقول مباع؟ */
export function movableProceedsLedgerGapIqd(
    executionId: string,
    movable: SeizedMovable
): { expected: number; credited: number; gap: number } {
    const expected = resolveMovableSaleProceedsIqd(movable);
    const exId = String(executionId || '').trim();
    if (!exId || expected <= 0) return { expected, credited: 0, gap: expected };
    const store = parseUnifiedLedgerFromStorage(storageCache.get(storageKey(exId))) ?? emptyStore();
    const pid = movableProceedsTrustPaymentId(String(movable.id || ''));
    const row = (store.payments || []).find((p) => String(p.id || '') === pid);
    const credited = row ? Math.trunc(Number(row.amount) || 0) : 0;
    return { expected, credited, gap: Math.max(0, expected - credited) };
}
