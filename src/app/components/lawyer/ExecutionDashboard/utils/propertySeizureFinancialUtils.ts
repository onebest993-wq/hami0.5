// @ts-nocheck
import type { SeizedProperty } from '@/app/types/execution';
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

export function resolvePropertySaleProceedsIqd(p: SeizedProperty): number {
    const pick = (...vals: unknown[]): number => {
        for (const v of vals) {
            const n = Number(v);
            if (Number.isFinite(n) && n > 0) return Math.trunc(n);
        }
        return 0;
    };
    return pick(
        p.finalAwardAmountIqd,
        p.award?.awardAmountIqd,
        p.initialAwardAmountIqd,
        p.estimatedPriceIqd,
        p.expertEstimatedAmountIqd
    );
}

export function propertyProceedsTrustPaymentId(propertyId: string): string {
    return `pay-property-proceeds-${String(propertyId || '').trim()}`;
}

export type PropertyProceedsTrustCreditResult = {
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
    propertyId: string;
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
        source: 'property_sale_proceeds',
        seizedPropertyId: input.propertyId,
        note: input.description || 'حصيلة بيع — عقار',
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
 * يُحدّث المبلغ إذا تغيّر سعر البيع في بطاقة العقار.
 */
export function creditPropertySaleProceedsToTrustLedger(input: {
    executionId: string;
    property: SeizedProperty;
    at?: string;
    totalOwedIqd?: number;
    ledgerParams?: UnifiedLedgerTotalParams;
}): PropertyProceedsTrustCreditResult {
    const exId = String(input.executionId || '').trim();
    const propertyId = String(input.property?.id || '').trim();
    if (!exId || !propertyId) {
        return { ok: false, amount: 0, created: false, updated: false };
    }

    const amount = resolvePropertySaleProceedsIqd(input.property);
    if (amount <= 0) {
        return { ok: false, amount: 0, created: false, updated: false };
    }

    const paymentId = propertyProceedsTrustPaymentId(propertyId);
    const at = String(input.at || new Date().toISOString());
    const key = storageKey(exId);
    const store = parseUnifiedLedgerFromStorage(storageCache.get(key)) ?? emptyStore();
    const totalOwed = resolveTotalOwedForStore(store, input.totalOwedIqd, input.ledgerParams);

    const desc = [
        String(input.property.propertyNumber || '').trim(),
        String(input.property.district || '').trim(),
    ]
        .filter(Boolean)
        .join(' — ');
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
                propertyId,
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

/** مزامنة كل العقارات المباعة — إنشاء أو تصحيح حصيلة البيع */
export function syncSoldPropertyProceedsToTrustLedger(
    executionId: string,
    properties: SeizedProperty[],
    opts?: { totalOwedIqd?: number; ledgerParams?: UnifiedLedgerTotalParams }
): PropertyProceedsTrustCreditResult[] {
    const exId = String(executionId || '').trim();
    if (!exId) return [];
    const results: PropertyProceedsTrustCreditResult[] = [];
    for (const p of properties) {
        if (String(p.status || '') !== 'sold') continue;
        const row = creditPropertySaleProceedsToTrustLedger({
            executionId: exId,
            property: p,
            totalOwedIqd: opts?.totalOwedIqd,
            ledgerParams: opts?.ledgerParams,
        });
        if (row.ok) results.push(row);
    }
    return results;
}

/** إيداع/تصحيح حصيلة البيع مع حساب إجمالي الوعاء من المركز المالي */
export function creditPropertyProceedsForExecution(
    executionId: string,
    property: SeizedProperty,
    ledgerParams: UnifiedLedgerTotalParams,
    at?: string
): PropertyProceedsTrustCreditResult {
    const exId = String(executionId || '').trim();
    if (!exId) return { ok: false, amount: 0, created: false, updated: false };
    const totals = resolveUnifiedLedgerFinancialTotals(exId, ledgerParams, (k) =>
        storageCache.get(k)
    );
    return creditPropertySaleProceedsToTrustLedger({
        executionId: exId,
        property,
        at,
        totalOwedIqd: totals.totalOwedUnified,
        ledgerParams,
    });
}

/** للتحقق: هل رصيد الأمانات يغطي حصيلة عقار مباع؟ */
export function propertyProceedsLedgerGapIqd(
    executionId: string,
    property: SeizedProperty
): { expected: number; credited: number; gap: number } {
    const expected = resolvePropertySaleProceedsIqd(property);
    const exId = String(executionId || '').trim();
    if (!exId || expected <= 0) return { expected, credited: 0, gap: expected };
    const store = parseUnifiedLedgerFromStorage(storageCache.get(storageKey(exId))) ?? emptyStore();
    const pid = propertyProceedsTrustPaymentId(String(property.id || ''));
    const row = (store.payments || []).find((p) => String(p.id || '') === pid);
    const credited = row ? Math.trunc(Number(row.amount) || 0) : 0;
    return { expected, credited, gap: Math.max(0, expected - credited) };
}
