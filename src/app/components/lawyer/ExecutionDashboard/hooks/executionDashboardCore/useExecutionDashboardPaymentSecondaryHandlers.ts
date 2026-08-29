/** تسديد من الحاسبة / الوعاء الموحّد / التسوية + undo */
import { useCallback, useEffect, type MutableRefObject, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { buildExecutionTimelineSnapshot } from '@/app/utils/buildExecutionTimelineSnapshot';
import { storageCache } from '@/app/utils/storageCache';
import { executionStorageKey } from '@/app/utils/executionStorageKeys';
import { guardCreditorAgentMutation } from '@/app/components/lawyer/ExecutionDashboard/helpers/executionAgentPrivilege';
import { toastAfterExecutionPersist } from '@/app/components/lawyer/ExecutionDashboard/helpers/toastAfterExecutionPersist';
import type { FinancialLedgerEntry } from './useExecutionDashboardPaymentHandlers.types';

export type UseExecutionDashboardPaymentSecondaryHandlersParams = {
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    executionId: string | undefined;
    executionData: ExecutionFile | null | undefined;
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
    ) => boolean | void;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string) => void;
    setPaidDebt: Dispatch<SetStateAction<number>>;
    setFinancialLedger: Dispatch<SetStateAction<FinancialLedgerEntry[]>>;
    isRepresentingDebtor?: boolean;
};

export function useExecutionDashboardPaymentSecondaryHandlers({
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
    isRepresentingDebtor = false,
}: UseExecutionDashboardPaymentSecondaryHandlersParams) {
    const handlePaymentFromCalculator = useCallback(
        (amount: number) => {
            if (
                !guardCreditorAgentMutation({
                    isRepresentingDebtor,
                    showToast,
                    actionLabel: 'تسجيل التسديد',
                })
            ) {
                return;
            }
            const newPaidDebt = paidDebt + amount;
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
            const persisted = pushTimelineEvent(
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
            if (
                !toastAfterExecutionPersist(
                    persisted,
                    showToast,
                    `✅ تم تسجيل السداد: ${amount.toLocaleString('ar-IQ')} د.ع`,
                )
            ) {
                return;
            }
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);
        },
        [
            executionDataRef,
            financialLedger,
            nextTimelineId,
            paidDebt,
            pushTimelineEvent,
            seizedAssetsSnapshotRef,
            setFinancialLedger,
            setPaidDebt,
            showToast,
            totalOwed,
            isRepresentingDebtor,
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
            if (
                !guardCreditorAgentMutation({
                    isRepresentingDebtor,
                    showToast,
                    actionLabel: 'تسجيل التسديد',
                })
            ) {
                return;
            }
            if (!amount || amount <= 0) return;
            const prevPaid = paidDebtRef.current;
            const newPaid = prevPaid + amount;
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
            const persisted = pushTimelineEvent(
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
            if (
                !toastAfterExecutionPersist(
                    persisted,
                    showToast,
                    kind === 'full'
                        ? '✅ تم تسجيل التسديد الكامل للوعاء الموحّد'
                        : `✅ تم تسجيل دفعة ${amount.toLocaleString('ar-IQ')} د.ع`,
                )
            ) {
                return;
            }
            paidDebtRef.current = newPaid;
            setPaidDebt(newPaid);
            setFinancialLedger(nextLedger);
        },
        [
            executionDataRef,
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
            isRepresentingDebtor,
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
            if (
                !guardCreditorAgentMutation({
                    isRepresentingDebtor,
                    showToast,
                    actionLabel: 'تسجيل التسوية/التسديد',
                })
            ) {
                return;
            }
            const newPaidDebt = paidDebt + downPayment;
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
            const persisted = pushTimelineEvent(
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
            if (!toastAfterExecutionPersist(persisted, showToast, '✅ تم إبرام التسوية بنجاح')) {
                return;
            }
            setPaidDebt(newPaidDebt);
            setFinancialLedger(nextLedger);
        },
        [
            executionDataRef,
            financialLedger,
            nextTimelineId,
            paidDebt,
            pushTimelineEvent,
            seizedAssetsSnapshotRef,
            setFinancialLedger,
            setPaidDebt,
            showToast,
            totalOwed,
            isRepresentingDebtor,
        ],
    );

    return {
        handlePaymentFromCalculator,
        handleFundsLedgerPayment,
        handleSettlementFromCalculator,
    };
}
