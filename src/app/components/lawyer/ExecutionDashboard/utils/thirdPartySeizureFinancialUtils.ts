// @ts-nocheck
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

/** معرّف دفع واحد لكل حجز لدى الغير — يمنع الإيداع المزدوج */
export function thirdPartyFundsTrustPaymentId(seizureId: string, _decisionRowId?: string): string {
    const sid = String(seizureId || '').trim();
    if (!sid) return `pay-thirdparty-${Date.now()}`;
    return `pay-thirdparty-${sid}`;
}

function findExistingThirdPartyPaymentIndex(
    payments: Array<{ id?: string; thirdPartySeizureId?: string }>,
    seizureId: string
): number {
    const sid = String(seizureId || '').trim();
    if (!sid) return -1;
    const canonicalId = thirdPartyFundsTrustPaymentId(sid);
    const byId = payments.findIndex((p) => String(p.id || '') === canonicalId);
    if (byId >= 0) return byId;
    return payments.findIndex((p) => String(p.thirdPartySeizureId || '').trim() === sid);
}

export type ThirdPartyFundsTrustCreditResult = {
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

    const payments = [...(store.payments || [])];
    const idx = findExistingThirdPartyPaymentIndex(payments, seizureId);
    let created = false;
    let updated = false;

    if (idx >= 0) {
        const cur = payments[idx];
        const curAmt = Math.trunc(Number(cur.amount) || 0);
        if (curAmt !== amount) {
            payments[idx] = { ...cur, amount, at: String(cur.at || at) };
            updated = true;
        }
    } else {
        payments.unshift(
            buildThirdPartyFundsPaymentRow({
                paymentId,
                amount,
                at,
                thirdPartySeizureId: seizureId,
                thirdPartyName: input.thirdPartyName,
                decisionRowId: input.decisionRowId,
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
