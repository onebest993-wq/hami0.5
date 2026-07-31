import { storageCache } from '@/app/utils/storageCache';
import type { LocalPaymentRow } from '@/app/components/lawyer/FinancialOperationsCenter/types';
import {
    emptyStore,
    parseUnifiedLedgerFromStorage,
    resolveUnifiedLedgerFinancialTotals,
    storageKey,
    type UnifiedLedgerTotalParams,
} from '@/app/slices/financial/ledgerPublic';
import {
    persistReconciledTrustStore,
    resolveTotalOwedForStore,
    upsertTrustCollectPayment,
    type SeizureTrustCollectCreditResult,
} from './seizureFinancialTrustLedgerUtils';

/** معرّف دفع واحد لكل حجز لدى الغير — يمنع الإيداع المزدوج */
export function thirdPartyFundsTrustPaymentId(seizureId: string, _decisionRowId?: string): string {
    const sid = String(seizureId || '').trim();
    if (!sid) return `pay-thirdparty-${Date.now()}`;
    return `pay-thirdparty-${sid}`;
}

function findExistingThirdPartyPaymentIndex(
    payments: LocalPaymentRow[],
    seizureId: string
): number {
    const sid = String(seizureId || '').trim();
    if (!sid) return -1;
    const canonicalId = thirdPartyFundsTrustPaymentId(sid);
    const byId = payments.findIndex((p) => String(p.id || '') === canonicalId);
    if (byId >= 0) return byId;
    return payments.findIndex(
        (p) => String((p as LocalPaymentRow & { thirdPartySeizureId?: string }).thirdPartySeizureId || '').trim() === sid
    );
}

export type ThirdPartyFundsTrustCreditResult = SeizureTrustCollectCreditResult;

function buildThirdPartyFundsPaymentRow(input: {
    paymentId: string;
    amount: number;
    at: string;
    thirdPartySeizureId: string;
    thirdPartyName?: string;
    decisionRowId?: string;
}): Record<string, unknown> {
    const name = String(input.thirdPartyName || '').trim() || 'جهة ثالثة';
    return {
        id: input.paymentId,
        amount: input.amount,
        at: input.at,
        kind: 'partial' as const,
        entryType: 'collect' as const,
        balanceAfter: 0,
        debtBalanceAfter: 0,
        trustBalanceAfter: 0,
        source: 'third_party_seizure',
        thirdPartySeizureId: input.thirdPartySeizureId,
        decisionRowId: input.decisionRowId || undefined,
        note: `استلام أموال محجوزة لدى الغير — ${name}`,
    };
}

/** إيداع مبلغ حجز لدى الغير في الأمانات وخصمه من المتبقي */
export function creditThirdPartyFundsToTrustLedger(input: {
    executionId: string;
    amountIqd: number;
    thirdPartySeizureId: string;
    thirdPartyName?: string;
    decisionRowId?: string;
    at?: string;
    totalOwedIqd?: number;
    ledgerParams?: UnifiedLedgerTotalParams;
}): ThirdPartyFundsTrustCreditResult {
    const exId = String(input.executionId || '').trim();
    const seizureId = String(input.thirdPartySeizureId || '').trim();
    const amount = Math.max(0, Math.trunc(Number(input.amountIqd || 0)));
    if (!exId || !seizureId || amount <= 0) {
        return { ok: false, amount: 0, created: false, updated: false };
    }

    const paymentId = thirdPartyFundsTrustPaymentId(seizureId, input.decisionRowId);
    const at = String(input.at || new Date().toISOString());
    const key = storageKey(exId);
    const store = parseUnifiedLedgerFromStorage(storageCache.get(key)) ?? emptyStore();
    const totalOwed = resolveTotalOwedForStore(store, input.totalOwedIqd, input.ledgerParams);

    const upsert = upsertTrustCollectPayment({
        store,
        paymentId,
        amount,
        at,
        totalOwed,
        findExistingIndex: (payments) => findExistingThirdPartyPaymentIndex(payments, seizureId),
        buildNewRow: () =>
            buildThirdPartyFundsPaymentRow({
                paymentId,
                amount,
                at,
                thirdPartySeizureId: seizureId,
                thirdPartyName: input.thirdPartyName,
                decisionRowId: input.decisionRowId,
            }),
    });

    if (upsert.unchanged) {
        return { ok: true, amount, created: false, updated: false, paymentId };
    }

    persistReconciledTrustStore(exId, upsert.store, upsert.paymentRow as Record<string, unknown> | undefined);
    return { ok: true, amount, created: upsert.created, updated: upsert.updated, paymentId };
}

export function creditThirdPartyFundsForExecution(
    executionId: string,
    input: {
        amountIqd: number;
        thirdPartySeizureId: string;
        thirdPartyName?: string;
        decisionRowId?: string;
        at?: string;
    },
    ledgerParams: UnifiedLedgerTotalParams
): ThirdPartyFundsTrustCreditResult {
    const exId = String(executionId || '').trim();
    if (!exId) return { ok: false, amount: 0, created: false, updated: false };
    const totals = resolveUnifiedLedgerFinancialTotals(exId, ledgerParams, (k) => storageCache.get(k));
    return creditThirdPartyFundsToTrustLedger({
        executionId: exId,
        amountIqd: input.amountIqd,
        thirdPartySeizureId: input.thirdPartySeizureId,
        thirdPartyName: input.thirdPartyName,
        decisionRowId: input.decisionRowId,
        at: input.at,
        totalOwedIqd: totals.totalOwedUnified,
        ledgerParams,
    });
}
