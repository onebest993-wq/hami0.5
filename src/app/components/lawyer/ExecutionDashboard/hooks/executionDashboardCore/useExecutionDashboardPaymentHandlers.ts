/** تسديد الإضبارة + الوعاء الموحّد + حاسبة السداد */
import { useCallback, useMemo } from 'react';
import { buildCreditorDebtRows, distributePaymentProRata } from '@/app/utils/creditorPaymentProRata';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { guardCreditorAgentMutation } from '@/app/components/lawyer/ExecutionDashboard/helpers/executionAgentPrivilege';
import { toastAfterExecutionPersist } from '@/app/components/lawyer/ExecutionDashboard/helpers/toastAfterExecutionPersist';
import { normalizePaymentAmountInput } from './normalizePaymentAmountInput';
import { useExecutionDashboardPaymentSecondaryHandlers } from './useExecutionDashboardPaymentSecondaryHandlers';
import type {
    FinancialLedgerEntry,
    UseExecutionDashboardPaymentHandlersParams,
} from './useExecutionDashboardPaymentHandlers.types';

export type { FinancialLedgerEntry, UseExecutionDashboardPaymentHandlersParams } from './useExecutionDashboardPaymentHandlers.types';
export { normalizePaymentAmountInput } from './normalizePaymentAmountInput';

export function useExecutionDashboardPaymentHandlers({
    executionDataRef,
    executionId,
    executionData,
    paymentAmount,
    paymentDate,
    remaining,
    paidDebt,
    totalOwed,
    totalWithExecutionFee,
    paidCourtFees,
    paidDirectorateFees,
    paidClientFees,
    financialLedger,
    financialLedgerRef,
    paidDebtRef,
    seizedAssetsSnapshotRef,
    nextTimelineId,
    pushTimelineEvent,
    persistExecutionMerge,
    showToast,
    setPaidDebt,
    setFinancialLedger,
    setPaymentAmount,
    setPaymentDate,
    setShowPaymentModal,
    isRepresentingDebtor = false,
}: UseExecutionDashboardPaymentHandlersParams) {
    const handlePayment = useCallback(() => {
        if (
            !guardCreditorAgentMutation({
                isRepresentingDebtor,
                showToast,
                actionLabel: 'تسجيل التسديد',
            })
        ) {
            return;
        }
        const amount = normalizePaymentAmountInput(paymentAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
            showToast('يرجى إدخال مبلغ صحيح', 'warning');
            return;
        }
        if (amount > remaining) {
            showToast(
                `لا يمكن تسديد مبلغ يتجاوز المتبقي (${remaining.toLocaleString('ar-IQ')} د.ع)`,
                'warning',
            );
            return;
        }

        const fileSnap = executionDataRef.current as Record<string, unknown> | null;
        const debtRows = buildCreditorDebtRows(fileSnap);
        const distribution = distributePaymentProRata(amount, debtRows);

        const creditorsList = [
            ...((fileSnap?.creditors as Array<Record<string, unknown>> | undefined) ?? []),
        ];
        const pmBase = (fileSnap?.party_multiplicity as Record<string, unknown> | undefined) ?? {};
        const additionalCreditorsList = [
            ...((pmBase.additionalCreditors as Array<Record<string, unknown>> | undefined) ?? []),
        ];

        for (const alloc of distribution.allocations) {
            if (alloc.isAdditional) {
                const idx = additionalCreditorsList.findIndex(
                    (c) => String(c.id) === alloc.creditorId,
                );
                if (idx >= 0) {
                    const prevPaid = Number(additionalCreditorsList[idx].paid_amount) || 0;
                    additionalCreditorsList[idx] = {
                        ...additionalCreditorsList[idx],
                        paid_amount: prevPaid + alloc.amount,
                    };
                }
            } else {
                const idx = creditorsList.findIndex((c) => String(c.id) === alloc.creditorId);
                if (idx >= 0) {
                    const prevPaid = Number(creditorsList[idx].paid_amount) || 0;
                    creditorsList[idx] = {
                        ...creditorsList[idx],
                        paid_amount: prevPaid + alloc.amount,
                    };
                }
            }
        }

        const payYmd = paymentDate?.trim() || getLocalTodayYmd();
        const payTs = `${payYmd}T12:00:00.000Z`;
        const splitSummary =
            distribution.allocations.length > 1
                ? distribution.allocations
                      .map(
                          (a) =>
                              `${a.creditorName}: ${a.amount.toLocaleString('ar-IQ')} د.ع${
                                  a.isClient ? ' (موكلي → المركز المالي)' : ''
                              }`,
                      )
                      .join(' · ')
                : '';

        const nextPaid = paidDebt + amount;
        const newBalance = Math.max(0, remaining - amount);
        const ledgerEntry: FinancialLedgerEntry = {
            id: Date.now().toString(),
            date: payTs,
            type: 'payment',
            amount,
            description: splitSummary
                ? `تسديد إجمالي — توزيع تلقائي: ${splitSummary}`
                : 'تسديد إجمالي للإضبارة',
            balance: newBalance,
        };
        const nextLedger = [ledgerEntry, ...financialLedger];

        const partyMultiplicityPatch =
            additionalCreditorsList.length > 0 || pmBase.isSolidaryLiability != null
                ? {
                      party_multiplicity: {
                          ...pmBase,
                          additionalCreditors: additionalCreditorsList,
                      },
                  }
                : {};

        const mergePatch: Record<string, unknown> = {
            paidDebt: nextPaid,
            financialLedger: nextLedger,
            creditors: creditorsList,
            creditor: creditorsList[0] ?? fileSnap?.creditor,
            ...partyMultiplicityPatch,
        };

        const paySnap = buildExecutionTimelineSnapshot({
            executionData: executionDataRef.current
                ? { ...executionDataRef.current, ...mergePatch }
                : null,
            financialLedger: nextLedger,
            seizedAssets: seizedAssetsSnapshotRef.current,
        });

        const clientNote =
            distribution.clientCreditorTotal > 0
                ? ` — مبلغ موكلي المُرحَّل للمركز المالي: ${distribution.clientCreditorTotal.toLocaleString('ar-IQ')} د.ع`
                : '';

        const persisted = pushTimelineEvent(
            {
                id: nextTimelineId(),
                date: payYmd,
                timestamp: payTs,
                title: newBalance === 0 ? '✅ تسديد كامل للمديونية' : '💰 تسديد للمديونية',
                description: `تم تسجيل تسديد بمبلغ ${amount.toLocaleString('ar-IQ')} د.ع.${splitSummary ? `\n${splitSummary}` : ''}\nالمتبقي: ${newBalance.toLocaleString('ar-IQ')} د.ع${clientNote}`,
                type: 'payment',
                source: 'تسديد الإضبارة',
                snapshot: paySnap,
            },
            { mergePatch },
        );
        if (
            !toastAfterExecutionPersist(
                persisted,
                showToast,
                `✅ تم تسجيل التسديد: ${amount.toLocaleString('ar-IQ')} د.ع`,
            )
        ) {
            return;
        }
        setPaidDebt(nextPaid);
        setFinancialLedger(nextLedger);

        const exId = String(executionId ?? executionDataRef.current?.id ?? '').trim();
        if (distribution.clientCreditorTotal > 0 && exId) {
            const clientPaymentRow = {
                id: `pay-client-creditor-${Date.now()}`,
                amount: distribution.clientCreditorTotal,
                at: payTs,
                kind: 'partial' as const,
                entryType: 'collect' as const,
            };
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-unified-ledger-external-collect', {
                        detail: { executionId: exId, payment: clientPaymentRow },
                    }),
                );
            } catch {
                /* ignore */
            }
        }

        setPaymentAmount('');
        setPaymentDate(getLocalTodayYmd());
        setShowPaymentModal(false);
    }, [
        executionDataRef,
        executionId,
        financialLedger,
        nextTimelineId,
        paidDebt,
        paymentAmount,
        paymentDate,
        pushTimelineEvent,
        remaining,
        seizedAssetsSnapshotRef,
        setFinancialLedger,
        setPaidDebt,
        setPaymentAmount,
        setPaymentDate,
        setShowPaymentModal,
        showToast,
        isRepresentingDebtor,
    ]);

    const {
        handlePaymentFromCalculator,
        handleFundsLedgerPayment,
        handleSettlementFromCalculator,
    } = useExecutionDashboardPaymentSecondaryHandlers({
        executionDataRef,
        executionId,
        executionData,
        paidDebt,
        totalOwed,
        totalWithExecutionFee,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        financialLedger,
        financialLedgerRef,
        paidDebtRef,
        seizedAssetsSnapshotRef,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        setPaidDebt,
        setFinancialLedger,
        isRepresentingDebtor,
    });

    return useMemo(
        () => ({
            handlePayment,
            handlePaymentFromCalculator,
            handleFundsLedgerPayment,
            handleSettlementFromCalculator,
        }),
        [
            handlePayment,
            handlePaymentFromCalculator,
            handleFundsLedgerPayment,
            handleSettlementFromCalculator,
        ],
    );
}
