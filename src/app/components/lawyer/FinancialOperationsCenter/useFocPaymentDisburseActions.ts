import { useCallback, useEffect, useRef } from 'react';
import type { TimelineEventType } from '@/app/types/execution';
import {
    executionGarnishmentDetailsStorageKey,
    executionGarnishmentFlagStorageKey,
} from '@/app/utils/executionStorageKeys';
import { storageCache } from '@/app/utils/storageCache';
import { clearSettlementFromStore, promptSettlementSalaryConflictChoice } from './settlementSalaryExclusion';
import type { ExpenseRow, LawyerFeeRow, LocalPaymentRow, UnifiedLedgerStore } from './types';
import {
    computeTotalOwedUnifiedFromStore,
    computeTrustBalanceFromPayments,
    invalidPositiveAmountMessage,
    parseAmount,
    type UnifiedLedgerTotalParams,
} from './utils';

type NotifyFn = (
    message: string,
    variant?: 'success' | 'error' | 'warning' | 'info',
    options?: { decisionsLink?: boolean }
) => void;

type RecordFinancialTimelineNoteFn = (
    title: string,
    description: string,
    type?: TimelineEventType | string
) => void;

export interface UseFocPaymentDisburseActionsParams {
    store: UnifiedLedgerStore;
    persist: (next: UnifiedLedgerStore) => void;
    getLatestLedgerStore: () => UnifiedLedgerStore;
    notify: NotifyFn;
    recordFinancialTimelineNote: RecordFinancialTimelineNoteFn;
    executionId?: string;
    ledgerTotalParams: UnifiedLedgerTotalParams;

    totalOwedUnified: number;
    remainingUnified: number;
    trustBalanceUnified: number;

    isEvictionFundsModule: boolean;
    evictionLawyerFeeWaivedAtIntake: boolean;
    setIsEvictionCollectionRequested: (value: boolean) => void;
    unifiedCollectionExecutorApproved: boolean;
    onEvictionCourtOrderedFeesActivatedFromLedger?: (totalLawyerFeesInLedger: number) => void;
    onFundsLedgerPayment?: (args: { amount: number; kind: 'full' | 'partial'; description: string }) => void;
    onCoerciveAction: (action: string) => void;

    proceedsDisburseSeizedMovableId?: string | null;
    onProceedsDisburseHandled?: () => void;
    proceedsDisburseSeizedPropertyId?: string | null;
    onProceedsDisbursePropertyHandled?: () => void;
    setDisburseModalOpen: (value: boolean) => void;

    lawyerAmountInput: string;
    setLawyerAmountInput: (value: string) => void;
    lawyerLabelInput: string;
    setLawyerLabelInput: (value: string) => void;

    expenseAmountInput: string;
    setExpenseAmountInput: (value: string) => void;
    expenseReasonInput: string;
    setExpenseReasonInput: (value: string) => void;

    disburseAmountInput: string;
    setDisburseAmountInput: (value: string) => void;

    garnishMonthlyInput: string;
    setGarnishMonthlyInput: (value: string) => void;
    garnishMemoInput: string;
    setGarnishMemoInput: (value: string) => void;
    setShowGarnishModal: (value: boolean) => void;

    repaymentInput: string;
    setRepaymentInput: (value: string) => void;
    setShowRepaymentEviction: (value: boolean) => void;
}

export interface UseFocPaymentDisburseActionsResult {
    canAddLawyerFee: boolean;
    addLawyerFee: () => void;

    canAddExpense: boolean;
    addExpense: () => void;

    canApplyDisburseAmount: boolean;
    applyDisbursementAmount: () => boolean;

    canConfirmGarnishment: boolean;
    confirmGarnishment: () => Promise<void>;
    closeGarnishModal: () => void;

    canApplyRepayment: boolean;
    repaymentExceedsRemaining: boolean;
    applyDebtRepayment: () => boolean;

    undoLastPayment: () => void;
    applyFullPayment: () => void;
    retractCollectionRequest: () => void;
}

/**
 * معاملات الدفع/الصرف/الأتعاب/المصاريف/حجز الراتب —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
 * قسمة الغرماء في useFocGhuramaaActions.ts.
 */
export function useFocPaymentDisburseActions(
    params: UseFocPaymentDisburseActionsParams
): UseFocPaymentDisburseActionsResult {
    const {
        store,
        persist,
        getLatestLedgerStore,
        notify,
        recordFinancialTimelineNote,
        executionId,
        ledgerTotalParams,
        totalOwedUnified,
        remainingUnified,
        trustBalanceUnified,
        isEvictionFundsModule,
        evictionLawyerFeeWaivedAtIntake,
        setIsEvictionCollectionRequested,
        unifiedCollectionExecutorApproved,
        onEvictionCourtOrderedFeesActivatedFromLedger,
        onFundsLedgerPayment,
        onCoerciveAction,
        proceedsDisburseSeizedMovableId,
        onProceedsDisburseHandled,
        proceedsDisburseSeizedPropertyId,
        onProceedsDisbursePropertyHandled,
        setDisburseModalOpen,
        lawyerAmountInput,
        setLawyerAmountInput,
        lawyerLabelInput,
        setLawyerLabelInput,
        expenseAmountInput,
        setExpenseAmountInput,
        expenseReasonInput,
        setExpenseReasonInput,
        disburseAmountInput,
        setDisburseAmountInput,
        garnishMonthlyInput,
        setGarnishMonthlyInput,
        garnishMemoInput,
        setGarnishMemoInput,
        setShowGarnishModal,
        repaymentInput,
        setRepaymentInput,
        setShowRepaymentEviction,
    } = params;

    const proceedsDisburseMovableIdRef = useRef<string | null>(null);
    useEffect(() => {
        const id = String(proceedsDisburseSeizedMovableId || '').trim();
        if (id) proceedsDisburseMovableIdRef.current = id;
    }, [proceedsDisburseSeizedMovableId]);

    const proceedsDisbursePropertyIdRef = useRef<string | null>(null);
    useEffect(() => {
        const id = String(proceedsDisburseSeizedPropertyId || '').trim();
        if (id) proceedsDisbursePropertyIdRef.current = id;
    }, [proceedsDisburseSeizedPropertyId]);

    const lawyerAmountParsed = parseAmount(lawyerAmountInput);
    const expenseAmountParsed = parseAmount(expenseAmountInput);
    const garnishMonthlyParsed = parseAmount(garnishMonthlyInput);
    const repaymentAmountParsed = parseAmount(repaymentInput);
    const disburseAmountParsed = parseAmount(disburseAmountInput);

    const canAddLawyerFee = Number.isFinite(lawyerAmountParsed) && lawyerAmountParsed > 0;
    const canAddExpense = Number.isFinite(expenseAmountParsed) && expenseAmountParsed > 0;
    const canConfirmGarnishment = Number.isFinite(garnishMonthlyParsed) && garnishMonthlyParsed > 0;
    const canApplyDisburseAmount =
        Number.isFinite(disburseAmountParsed) &&
        disburseAmountParsed > 0 &&
        disburseAmountParsed <= trustBalanceUnified;
    const repaymentExceedsRemaining =
        Number.isFinite(repaymentAmountParsed) &&
        repaymentAmountParsed > 0 &&
        repaymentAmountParsed > remainingUnified;
    const canApplyRepayment =
        Number.isFinite(repaymentAmountParsed) && repaymentAmountParsed > 0 && !repaymentExceedsRemaining;

    const addLawyerFee = useCallback(() => {
        const amt = parseAmount(lawyerAmountInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ الأتعاب'), 'warning');
            return;
        }
        const row: LawyerFeeRow = {
            id: `lf-${Date.now()}`,
            amount: amt,
            label: lawyerLabelInput.trim() || 'أتعاب محاماة محكوم بها',
            at: new Date().toISOString(),
        };
        const current = getLatestLedgerStore();
        const nextLawyerFees = [row, ...current.lawyerFees];
        const nextStore = { ...current, lawyerFees: nextLawyerFees };
        persist(nextStore);
        setLawyerAmountInput('');
        setLawyerLabelInput('');
        if (isEvictionFundsModule && evictionLawyerFeeWaivedAtIntake) {
            const total = nextLawyerFees.reduce((s, r) => s + r.amount, 0);
            onEvictionCourtOrderedFeesActivatedFromLedger?.(total);
        }
        recordFinancialTimelineNote(
            '➕ إضافة أتعاب للوعاء',
            `أُضيف بند أتعاب: ${row.label} — ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
    }, [
        evictionLawyerFeeWaivedAtIntake,
        getLatestLedgerStore,
        isEvictionFundsModule,
        lawyerAmountInput,
        lawyerLabelInput,
        notify,
        onEvictionCourtOrderedFeesActivatedFromLedger,
        persist,
        recordFinancialTimelineNote,
        setLawyerAmountInput,
        setLawyerLabelInput,
    ]);

    const addExpense = useCallback(() => {
        const amt = parseAmount(expenseAmountInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ المصروف'), 'warning');
            return;
        }
        const reason = expenseReasonInput.trim() || 'مصاريف تنفيذية';
        const row: ExpenseRow = {
            id: `ex-${Date.now()}`,
            amount: amt,
            reason,
            at: new Date().toISOString(),
        };
        const current = getLatestLedgerStore();
        persist({ ...current, expenses: [row, ...current.expenses] });
        setExpenseAmountInput('');
        setExpenseReasonInput('');
        recordFinancialTimelineNote(
            '➕ إضافة مصاريف للوعاء',
            `أُضيف مصروف: ${reason} — ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
    }, [
        expenseAmountInput,
        expenseReasonInput,
        getLatestLedgerStore,
        notify,
        persist,
        recordFinancialTimelineNote,
        setExpenseAmountInput,
        setExpenseReasonInput,
    ]);

    const retractCollectionRequest = useCallback(() => {
        const current = getLatestLedgerStore();
        persist({
            ...current,
            collectionRequestActive: false,
            collectionRequestedTotal: null,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        recordFinancialTimelineNote(
            '↩️ إلغاء طلب الاستحصال',
            'تم إلغاء طلب استحصال الوعاء الموحّد والعودة لتعديل البنود.'
        );
        notify('تم إلغاء طلب الاستحصال — يمكنك تعديل البنود وإعادة التقديم.', 'success');
    }, [getLatestLedgerStore, isEvictionFundsModule, notify, persist, recordFinancialTimelineNote, setIsEvictionCollectionRequested]);

    const applyDisbursementAmount = useCallback((): boolean => {
        const amt = Math.max(0, Math.trunc(parseAmount(disburseAmountInput)));
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ الصرف'), 'warning');
            return false;
        }
        const current = getLatestLedgerStore();
        const trustBefore = computeTrustBalanceFromPayments(current.payments);
        if (amt > trustBefore) {
            notify(
                `مبلغ الصرف يتجاوز رصيد الأمانات الحالي (${trustBefore.toLocaleString('ar-IQ')} د.ع).`,
                'warning'
            );
            return false;
        }
        const trustAfter = Math.max(0, trustBefore - amt);
        const row: LocalPaymentRow = {
            id: `pay-disburse-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: 'partial',
            entryType: 'disburse',
            balanceAfter: trustAfter,
            debtBalanceAfter: remainingUnified,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...current,
            payments: [row, ...current.payments],
            completed: current.completed,
            collectionRequestActive: current.collectionRequestActive,
        });
        recordFinancialTimelineNote(
            '📤 صرف من الأمانات',
            `تم صرف ${amt.toLocaleString('ar-IQ')} د.ع من رصيد الأمانات — المتبقي في الأمانات ${trustAfter.toLocaleString('ar-IQ')} د.ع.`
        );
        if (executionId) {
            const seizedMovableId = String(proceedsDisburseMovableIdRef.current || '').trim();
            const seizedPropertyId = String(proceedsDisbursePropertyIdRef.current || '').trim();
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-trust-disbursed', {
                        detail: {
                            executionId: String(executionId),
                            ...(seizedMovableId ? { seizedMovableId } : {}),
                            ...(seizedPropertyId ? { seizedPropertyId } : {}),
                        },
                    })
                );
            } catch {
                /* ignore */
            }
            if (seizedMovableId) {
                proceedsDisburseMovableIdRef.current = null;
                onProceedsDisburseHandled?.();
            }
            if (seizedPropertyId) {
                proceedsDisbursePropertyIdRef.current = null;
                onProceedsDisbursePropertyHandled?.();
            }
        }
        setDisburseAmountInput('');
        setDisburseModalOpen(false);
        return true;
    }, [
        disburseAmountInput,
        executionId,
        getLatestLedgerStore,
        notify,
        onProceedsDisburseHandled,
        onProceedsDisbursePropertyHandled,
        persist,
        recordFinancialTimelineNote,
        remainingUnified,
        setDisburseAmountInput,
        setDisburseModalOpen,
    ]);

    const undoLastPayment = useCallback(() => {
        const current = getLatestLedgerStore();
        if (current.payments.length === 0) {
            notify('لا توجد دفعات للتراجع عنها.', 'warning');
            return;
        }
        const removed = current.payments[0];
        const [, ...restPayments] = current.payments;
        let debtPaid = 0;
        for (const r of restPayments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
            if (et === 'disburse') {
                continue;
            } else if (et === 'settlement') {
                debtPaid += amt;
            } else {
                debtPaid += amt;
            }
        }
        const debtPaidClamped = Math.min(Math.max(0, debtPaid), Math.max(0, totalOwedUnified));
        const remainingAfterUndo = Math.max(0, totalOwedUnified - debtPaidClamped);
        const next = {
            ...current,
            payments: restPayments,
            completed: remainingAfterUndo <= 0,
            collectionRequestActive:
                remainingAfterUndo > 0
                    ? current.collectionRequestActive || unifiedCollectionExecutorApproved
                    : false,
        };
        persist(next);
        if (isEvictionFundsModule && remainingAfterUndo > 0) setIsEvictionCollectionRequested(true);
        const removedAmt = Number.isFinite(removed.amount) ? removed.amount : 0;
        const removedEt = (removed.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
        if (removedAmt > 0 && removedEt !== 'disburse' && executionId) {
            try {
                window.dispatchEvent(
                    new CustomEvent('hami-unified-ledger-payment-undo', {
                        detail: { executionId, amount: removedAmt },
                    })
                );
            } catch {
                /* ignore */
            }
        }
        recordFinancialTimelineNote(
            '↩️ تراجع عن آخر دفعة',
            `تم التراجع عن آخر حركة في سجل الدفعات — المتبقي ${remainingAfterUndo.toLocaleString('ar-IQ')} د.ع.`
        );
        notify('تم التراجع عن آخر دفعة بنجاح.', 'success');
    }, [
        executionId,
        getLatestLedgerStore,
        isEvictionFundsModule,
        notify,
        persist,
        recordFinancialTimelineNote,
        setIsEvictionCollectionRequested,
        totalOwedUnified,
        unifiedCollectionExecutorApproved,
    ]);

    const applyFullPayment = useCallback(() => {
        if (remainingUnified <= 0) return;
        const amt = remainingUnified;
        const trustAfter = trustBalanceUnified + amt;
        const row: LocalPaymentRow = {
            id: `pay-full-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: 'full',
            entryType: 'collect',
            balanceAfter: 0,
            debtBalanceAfter: 0,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...store,
            payments: [row, ...store.payments],
            completed: true,
            collectionRequestActive: false,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: 'full',
            description: 'تم الدفع / تسديد كامل — الوعاء الموحّد (أتعاب + مصاريف)',
        });
        recordFinancialTimelineNote(
            '✅ تحصيل كامل للوعاء',
            `تم إغلاق الوعاء الموحّد بتحصيل ${amt.toLocaleString('ar-IQ')} د.ع.`
        );
        notify('تم تحصيل الوعاء بالكامل وإغلاقه بنجاح.', 'success');
    }, [
        isEvictionFundsModule,
        notify,
        onFundsLedgerPayment,
        persist,
        recordFinancialTimelineNote,
        remainingUnified,
        setIsEvictionCollectionRequested,
        store,
        trustBalanceUnified,
    ]);

    const applyDebtRepayment = useCallback((): boolean => {
        const current = getLatestLedgerStore();
        if (current.completed) return false;

        const totalNow = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        let debtPaidNow = 0;
        for (const r of current.payments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
            if (et === 'disburse') continue;
            if (et === 'settlement' || et === 'collect') debtPaidNow += amt;
        }
        const remainingNow = Math.max(
            0,
            totalNow - Math.min(Math.max(0, debtPaidNow), Math.max(0, totalNow))
        );
        if (remainingNow <= 0) return false;

        const amt = parseAmount(repaymentInput);
        if (!Number.isFinite(amt) || amt <= 0) {
            setShowRepaymentEviction(true);
            notify(invalidPositiveAmountMessage('مبلغ التسديد'), 'warning');
            return false;
        }
        if (amt > remainingNow) {
            notify(
                `لا يمكن تسديد مبلغ يتجاوز المتبقي. المتبقي الحالي: ${remainingNow.toLocaleString('ar-IQ')} د.ع`,
                'warning'
            );
            return false;
        }
        const debtAfter = Math.max(0, remainingNow - amt);
        const trustNow = Math.max(0, computeTrustBalanceFromPayments(current.payments) + amt);
        const row: LocalPaymentRow = {
            id: `pay-repay-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: debtAfter === 0 ? 'full' : 'partial',
            entryType: 'collect',
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustNow,
        };
        persist({
            ...current,
            payments: [row, ...current.payments],
            completed: debtAfter === 0,
            collectionRequestActive: debtAfter === 0 ? false : current.collectionRequestActive,
        });
        if (isEvictionFundsModule && debtAfter === 0) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: debtAfter === 0 ? 'full' : 'partial',
            description: 'تسديد — الوعاء الموحّد',
        });
        setRepaymentInput('');
        setShowRepaymentEviction(false);
        notify('تم تسجيل التسديد في سجل الدفعات.', 'success');
        return true;
    }, [
        getLatestLedgerStore,
        isEvictionFundsModule,
        ledgerTotalParams,
        notify,
        onFundsLedgerPayment,
        persist,
        repaymentInput,
        setIsEvictionCollectionRequested,
        setRepaymentInput,
        setShowRepaymentEviction,
    ]);

    const confirmGarnishment = useCallback(async () => {
        const monthlyDeduction = garnishMonthlyParsed;
        if (!Number.isFinite(monthlyDeduction) || monthlyDeduction <= 0) {
            notify(invalidPositiveAmountMessage('مقدار الاستقطاع الشهري'), 'warning');
            return;
        }
        if (store.pendingSettlement) {
            const { SmartDialog } = await import('@/app/components/ui/SmartDialog');
            const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
            if (choice === 'keep_settlement') {
                notify('تم الإبقاء على التسوية — أُلغي مسار حجز الراتب.', 'info');
                return;
            }
            persist(clearSettlementFromStore(getLatestLedgerStore()));
        }
        persist({ ...getLatestLedgerStore(), garnishment: true });
        if (executionId) {
            try {
                storageCache.set(executionGarnishmentFlagStorageKey(executionId), 'true');
                storageCache.set(executionGarnishmentDetailsStorageKey(executionId), {
                    monthlyDeduction,
                    memoNumber: garnishMemoInput.trim(),
                    savedAt: new Date().toISOString(),
                });
            } catch {
                /* ignore */
            }
        }
        setGarnishMonthlyInput('');
        setGarnishMemoInput('');
        setShowGarnishModal(false);
        onCoerciveAction('salary');
    }, [
        executionId,
        garnishMemoInput,
        garnishMonthlyParsed,
        getLatestLedgerStore,
        notify,
        onCoerciveAction,
        persist,
        setGarnishMemoInput,
        setGarnishMonthlyInput,
        setShowGarnishModal,
        store.pendingSettlement,
    ]);

    const closeGarnishModal = useCallback(() => {
        setGarnishMonthlyInput('');
        setGarnishMemoInput('');
        setShowGarnishModal(false);
    }, [setGarnishMemoInput, setGarnishMonthlyInput, setShowGarnishModal]);

    return {
        canAddLawyerFee,
        addLawyerFee,
        canAddExpense,
        addExpense,
        canApplyDisburseAmount,
        applyDisbursementAmount,
        canConfirmGarnishment,
        confirmGarnishment,
        closeGarnishModal,
        canApplyRepayment,
        repaymentExceedsRemaining,
        applyDebtRepayment,
        undoLastPayment,
        applyFullPayment,
        retractCollectionRequest,
    };
}
