// @ts-nocheck
/** تسديد الإضبارة + الوعاء الموحّد + حاسبة السداد */
import { useCallback, useEffect, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { buildCreditorDebtRows, distributePaymentProRata } from '@/app/utils/creditorPaymentProRata';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';

export type FinancialLedgerEntry = {
    id: string;
    date: string;
    type: 'payment' | 'fee' | 'settlement';
    amount: number;
    description: string;
    balance: number;
};

export type UseExecutionDashboardPaymentHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
    paymentAmount: string;
    paymentDate: string;
    remaining: number;
    paidDebt: number;
    totalOwed: number;
    totalWithExecutionFee: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    financialLedger: FinancialLedgerEntry[];
    financialLedgerRef: MutableRefObject<FinancialLedgerEntry[]>;
    paidDebtRef: MutableRefObject<number>;
    seizedAssetsSnapshotRef: MutableRefObject<unknown>;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        event: import('@/app/types/execution').TimelineEvent,
        options?: { mergePatch?: Record<string, unknown> },
    ) => void;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: (message: string, type?: string) => void;
    setPaidDebt: Dispatch<SetStateAction<number>>;
    setFinancialLedger: Dispatch<SetStateAction<FinancialLedgerEntry[]>>;
    setPaymentAmount: Dispatch<SetStateAction<string>>;
    setPaymentDate: Dispatch<SetStateAction<string>>;
    setShowPaymentModal: (show: boolean) => void;
};

export function normalizePaymentAmountInput(raw: string): number {
    const normalized = String(raw || '')
        .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
        .replace(/[\u06F0-\u06F9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
        .replace(/[^\d.]/g, '');
    return Math.max(0, Math.round(parseFloat(normalized) || 0));
}

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
}: UseExecutionDashboardPaymentHandlersParams) {
    const handlePayment = useCallback(() => {
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

        pushTimelineEvent(
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

        showToast(`✅ تم تسجيل التسديد: ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
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
    ]);

    const handlePaymentFromCalculator = useCallback(
        (amount: number) => {
            const newPaidDebt = paidDebt + amount;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            if (executionId && amount > 0) {
                try {
                    void import('@/app/services/auditLogPublisher').then(({ AuditLog }) => {
                        const data = executionDataRef.current as Record<string, unknown> | undefined;
                        const caseNo =
                            (data?.executionCaseNumber as string | undefined) ||
                            (data?.caseNo as string | undefined) ||
                            String(executionId);
                        AuditLog.execution.paymentReceived({
                            executionId,
                            amount,
                            caseNo,
                        });
                    });
                } catch {
                    /* silent */
                }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const ledgerEntry: FinancialLedgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'payment',
                amount,
                description: 'سداد دفعة نقدية',
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const calcSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '💵 تم سداد دفعة نقدية',
                    description: `تم سداد دفعة نقدية بقيمة ${amount.toLocaleString('ar-IQ')} دينار. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} دينار.`,
                    type: 'payment',
                    source: 'حاسبة السداد',
                    snapshot: calcSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } },
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast(`✅ تم تسجيل السداد: ${amount.toLocaleString('ar-IQ')} د.ع`, 'success');
        },
        [
            executionDataRef,
            executionId,
            financialLedger,
            nextTimelineId,
            paidDebt,
            pushTimelineEvent,
            seizedAssetsSnapshotRef,
            setFinancialLedger,
            setPaidDebt,
            showToast,
            totalOwed,
        ],
    );

    const handleFundsLedgerPayment = useCallback(
        ({
            amount,
            kind,
            description,
        }: {
            amount: number;
            kind: 'full' | 'partial';
            description: string;
        }) => {
            if (!amount || amount <= 0) return;
            const newPaid = paidDebtRef.current + amount;
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaid,
                    });
                }
            }
            const newRemaining =
                totalWithExecutionFee -
                (newPaid + paidCourtFees + paidDirectorateFees + paidClientFees);
            const ledgerEntry: FinancialLedgerEntry = {
                id: nextTimelineId(),
                date: new Date().toISOString(),
                type: 'payment',
                amount,
                description: `${description} (${kind === 'full' ? 'تسديد كامل' : 'جزئي'})`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedgerRef.current];
            const ts = new Date().toISOString();
            const evId = nextTimelineId();
            const fundsSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaid, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: evId,
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title:
                        kind === 'full'
                            ? '✅ إغلاق الوعاء المالي الموحّد'
                            : '💰 تسديد من الوعاء الموحّد',
                    description: `${description}. المبلغ: ${amount.toLocaleString('ar-IQ')} د.ع. المتبقي في اللوحة: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'payment',
                    source: 'إدارة الأموال والمصاريف',
                    snapshot: fundsSnap,
                },
                { mergePatch: { paidDebt: newPaid, financialLedger: nextLedger } },
            );
            setFinancialLedger(nextLedger);
            showToast(
                kind === 'full'
                    ? '✅ تم تسجيل التسديد الكامل للوعاء الموحّد'
                    : `✅ تم تسجيل دفعة ${amount.toLocaleString('ar-IQ')} د.ع`,
                'success',
            );
        },
        [
            executionDataRef,
            executionId,
            financialLedgerRef,
            nextTimelineId,
            paidCourtFees,
            paidClientFees,
            paidDebtRef,
            paidDirectorateFees,
            pushTimelineEvent,
            seizedAssetsSnapshotRef,
            setFinancialLedger,
            setPaidDebt,
            showToast,
            totalWithExecutionFee,
        ],
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const ce = e as CustomEvent<{ executionId?: string; amount?: number }>;
            const evId = String(ce.detail?.executionId ?? '').trim();
            const myId = String(executionData?.id ?? executionId ?? '').trim();
            if (!evId || evId !== myId) return;
            const amt = Number(ce.detail?.amount ?? 0);
            if (!Number.isFinite(amt) || amt <= 0) return;
            const newPaid = Math.max(0, paidDebtRef.current - amt);
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaid,
                    });
                }
            }
            setFinancialLedger((prev) => {
                const next = prev.length > 0 ? prev.slice(1) : prev;
                queueMicrotask(() =>
                    persistExecutionMerge({ paidDebt: newPaid, financialLedger: next }),
                );
                return next;
            });
        };
        window.addEventListener('hami-unified-ledger-payment-undo', handler as EventListener);
        return () =>
            window.removeEventListener('hami-unified-ledger-payment-undo', handler as EventListener);
    }, [executionData?.id, executionId, paidDebtRef, persistExecutionMerge, setPaidDebt, setFinancialLedger]);

    const handleSettlementFromCalculator = useCallback(
        (downPayment: number, monthlyInstallment: number) => {
            const newPaidDebt = paidDebt + downPayment;
            if (executionId) {
                const current = storageCache.get(executionStorageKey(executionId));
                if (current && typeof current === 'object') {
                    storageCache.set(executionStorageKey(executionId), {
                        ...current,
                        paidDebt: newPaidDebt,
                    });
                }
            }

            const newRemaining = totalOwed - newPaidDebt;
            const months =
                monthlyInstallment > 0 && newRemaining > 0
                    ? Math.ceil(newRemaining / monthlyInstallment)
                    : 0;

            const ledgerEntry: FinancialLedgerEntry = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                type: 'settlement',
                amount: downPayment,
                description: `تسوية قانونية — دفعة مقدمة. القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} د.ع؛ الأقساط المتوقعة: ${months} شهر`,
                balance: newRemaining,
            };
            const nextLedger = [ledgerEntry, ...financialLedger];
            const ts = new Date().toISOString();
            const settlementSnap = buildExecutionTimelineSnapshot({
                executionData: executionDataRef.current
                    ? { ...executionDataRef.current, paidDebt: newPaidDebt, financialLedger: nextLedger }
                    : null,
                financialLedger: nextLedger,
                seizedAssets: seizedAssetsSnapshotRef.current,
            });
            pushTimelineEvent(
                {
                    id: nextTimelineId(),
                    date: ts.slice(0, 10),
                    timestamp: ts,
                    title: '📅 تم إبرام تسوية قانونية',
                    description: `تم إبرام تسوية قانونية. الدفعة المقدمة: ${downPayment.toLocaleString('ar-IQ')} دينار، القسط الشهري: ${monthlyInstallment.toLocaleString('ar-IQ')} دينار، عدد الأقساط المتوقعة: ${months} شهر. المتبقي: ${newRemaining.toLocaleString('ar-IQ')} د.ع`,
                    type: 'settlement',
                    source: 'حاسبة التسوية',
                    snapshot: settlementSnap,
                },
                { mergePatch: { paidDebt: newPaidDebt, financialLedger: nextLedger } },
            );
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);

            showToast('✅ تم إبرام التسوية بنجاح', 'success');
        },
        [
            executionDataRef,
            executionId,
            financialLedger,
            nextTimelineId,
            paidDebt,
            pushTimelineEvent,
            seizedAssetsSnapshotRef,
            setFinancialLedger,
            setPaidDebt,
            showToast,
            totalOwed,
        ],
    );

    return {
        handlePayment,
        handlePaymentFromCalculator,
        handleFundsLedgerPayment,
        handleSettlementFromCalculator,
    };
}
