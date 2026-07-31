import type { SeizedMovable } from '@/app/types/execution';
import { storageCache } from '@/app/utils/storageCache';
import {
    emptyStore,
    parseUnifiedLedgerFromStorage,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
    type UnifiedLedgerTotalParams,
} from '@/app/slices/financial/ledgerPublic';
import {
    persistReconciledTrustStore,
    pickFirstPositiveIqd,
    resolveTotalOwedForStore,
    seizureProceedsLedgerGapIqd,
    upsertTrustCollectPayment,
    type SeizureTrustCollectCreditResult,
} from './seizureFinancialTrustLedgerUtils';

export function resolveMovableSaleProceedsIqd(m: SeizedMovable): number {
    return pickFirstPositiveIqd(
        m.finalAwardAmountIqd,
        m.award?.awardAmountIqd,
        m.initialAwardAmountIqd
    );
}

export function movableProceedsTrustPaymentId(movableId: string): string {
    return `pay-movable-proceeds-${String(movableId || '').trim()}`;
}

export type MovableProceedsTrustCreditResult = SeizureTrustCollectCreditResult;

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

/**
 * مزامنة جذرية: حصيلة البيع = مبلغ الإحالة/الرسo في الأمانات، ويُخصم من المتبقي عبر collect.
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
    const upsert = upsertTrustCollectPayment({
        store,
        paymentId,
        amount,
        at,
        totalOwed,
        findExistingIndex: (payments) => payments.findIndex((p) => String(p.id || '') === paymentId),
        buildNewRow: () =>
            buildProceedsPaymentRow({
                paymentId,
                amount,
                at,
                movableId,
                description: desc ? `حصيلة بيع: ${desc}` : undefined,
            }),
    });

    if (upsert.unchanged) {
        return { ok: true, amount, created: false, updated: false, paymentId };
    }

    persistReconciledTrustStore(exId, upsert.store, upsert.paymentRow as Record<string, unknown> | undefined);
    return { ok: true, amount, created: upsert.created, updated: upsert.updated, paymentId };
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
    return seizureProceedsLedgerGapIqd(
        executionId,
        expected,
        movableProceedsTrustPaymentId(String(movable.id || ''))
    );
}
