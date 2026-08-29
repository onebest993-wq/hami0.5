import type { SeizedProperty } from '@/app/types/execution';
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
    upsertTrustCollectPayment,
    type SeizureTrustCollectCreditResult,
} from './seizureFinancialTrustLedgerUtils';

export function resolvePropertySaleProceedsIqd(p: SeizedProperty): number {
    return pickFirstPositiveIqd(
        p.finalAwardAmountIqd,
        p.award?.awardAmountIqd,
        p.initialAwardAmountIqd,
        p.estimatedPriceIqd,
        p.expertEstimatedAmountIqd
    );
}

function propertyProceedsTrustPaymentId(propertyId: string): string {
    return `pay-property-proceeds-${String(propertyId || '').trim()}`;
}

export type PropertyProceedsTrustCreditResult = SeizureTrustCollectCreditResult;

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

/**
 * مزامنة جذرية: حصيلة البيع = مبلغ الإحالة/الرسo في الأمانات، ويُخصم من المتبقي عبر collect.
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
                propertyId,
                description: desc ? `حصيلة بيع: ${desc}` : undefined,
            }),
    });

    if (upsert.unchanged) {
        return { ok: true, amount, created: false, updated: false, paymentId };
    }

    persistReconciledTrustStore(exId, upsert.store, upsert.paymentRow as Record<string, unknown> | undefined);
    return { ok: true, amount, created: upsert.created, updated: upsert.updated, paymentId };
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
