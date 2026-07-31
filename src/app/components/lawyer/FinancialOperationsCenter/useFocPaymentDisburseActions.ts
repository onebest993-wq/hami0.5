import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { TimelineEventType } from '@/app/types/execution';
import { splitAmountEqually } from '@/app/components/lawyer/ExecutionCreationView/hooks/executionFormUtils';
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
    formatIqdDisplay,
    formatNumberInput,
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

export interface FocGhuramaaEligibleCreditor {
    creditorId: string;
    creditorName: string;
    debtBeforeDistribution: number;
    remainingDebt: number;
}

export interface FocGhuramaaContext {
    canOpen: boolean;
    available: number;
    totalDebt: number;
    eligible: FocGhuramaaEligibleCreditor[];
    note: string | null;
}

export interface FocGhuramaaManualDistribution {
    ok: boolean;
    sum: number;
    remainingAfter: number;
    rows: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        amountDistributed: number;
    }>;
    validationNote: string | null;
    partialWarning: string | null;
    isEqualMode: boolean;
}

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

    onApplyGhuramaaDistribution?: (args: {
        transactionId: string;
        dateIso: string;
        totalAmountDistributed: number;
        distributionDetails: Array<{
            creditorId: string;
            creditorName: string;
            debtBeforeDistribution: number;
            amountDistributed: number;
        }>;
    }) => void;
    canShowGhuramaaDivision: boolean;
    ghuramaaCreditors?: Array<{
        creditorId: string;
        creditorName: string;
        debtBeforeDistribution: number;
        remainingDebt: number;
    }>;
    ghuramaaModalOpen: boolean;
    setGhuramaaModalOpen: (value: boolean) => void;
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

    ghuramaaContext: FocGhuramaaContext;
    ghuramaaManual: FocGhuramaaManualDistribution;
    ghuramaaShareInputs: Record<string, string>;
    setGhuramaaShareInput: (creditorId: string, raw: string) => void;
    applyGhuramaaEqualSplit: () => void;
    openGhuramaaModal: () => void;
    applyGhuramaaDistribution: () => void;
}

/**
 * معاملات الدفع/الصرف/الأتعاب/المصاريف/قسمة الغرماء —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
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
        onApplyGhuramaaDistribution,
        canShowGhuramaaDivision,
        ghuramaaCreditors,
        ghuramaaModalOpen,
        setGhuramaaModalOpen,
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

    const [ghuramaaShareInputs, setGhuramaaShareInputs] = useState<Record<string, string>>({});
    const [ghuramaaSplitMode, setGhuramaaSplitMode] = useState<'manual' | 'equal' | null>(null);

    const ghuramaaContext = useMemo((): FocGhuramaaContext => {
        const creditors = Array.isArray(ghuramaaCreditors) ? ghuramaaCreditors : [];
        const available = Math.max(0, Math.trunc(trustBalanceUnified));
        const eligible = creditors
            .map((c) => ({
                creditorId: String(c.creditorId || '').trim(),
                creditorName: String(c.creditorName || '').trim() || 'دائن',
                debtBeforeDistribution: Math.max(0, Math.trunc(c.debtBeforeDistribution)),
                remainingDebt: Math.max(0, Math.trunc(c.remainingDebt)),
            }))
            .filter((c) => c.creditorId);
        const totalDebt = eligible.reduce((s, c) => s + c.remainingDebt, 0);
        const canOpen = available > 0 && eligible.length > 0;
        const note =
            available <= 0
                ? 'رصيد الأمانات = 0.'
                : eligible.length === 0
                  ? 'لا يوجد دائنون مؤهلون للتوزيع.'
                  : null;
        return { canOpen, available, totalDebt, eligible, note };
    }, [ghuramaaCreditors, trustBalanceUnified]);

    useEffect(() => {
        if (!ghuramaaModalOpen) return;
        const next: Record<string, string> = {};
        ghuramaaContext.eligible.forEach((c) => {
            next[c.creditorId] = '';
        });
        setGhuramaaShareInputs(next);
        setGhuramaaSplitMode(null);
    }, [ghuramaaModalOpen, ghuramaaContext.eligible]);

    const ghuramaaManual = useMemo((): FocGhuramaaManualDistribution => {
        const { available, eligible } = ghuramaaContext;
        const isEqualMode = ghuramaaSplitMode === 'equal';
        const rows: FocGhuramaaManualDistribution['rows'] = [];
        let sum = 0;
        let hasInvalidField = false;
        let validationNote: string | null = null;
        let partialWarning: string | null = null;

        for (const c of eligible) {
            const raw = String(ghuramaaShareInputs[c.creditorId] ?? '').trim();
            const parsed = raw ? parseAmount(raw) : 0;
            if (raw && (!Number.isFinite(parsed) || parsed < 0)) {
                hasInvalidField = true;
                validationNote = 'أدخل مبالغاً صحيحة لحصص الدائنين.';
            }
            const amount = Number.isFinite(parsed) ? Math.max(0, Math.trunc(parsed)) : 0;
            if (amount > available) {
                hasInvalidField = true;
                validationNote = 'حصة دائن تتجاوز رصيد الأمانات المتاح.';
            }
            if (!isEqualMode && amount > c.remainingDebt) {
                hasInvalidField = true;
                validationNote = 'حصة دائن تتجاوز دينه المتبقي.';
            }
            sum += amount;
            rows.push({
                creditorId: c.creditorId,
                creditorName: c.creditorName,
                debtBeforeDistribution: c.remainingDebt,
                amountDistributed: amount,
            });
        }

        if (sum > available) {
            hasInvalidField = true;
            validationNote = 'مجموع الحصص يتجاوز رصيد الأمانات المتاح.';
        }

        const remainingAfter = Math.max(0, available - sum);
        if (!isEqualMode && sum > 0 && remainingAfter > 0) {
            partialWarning = `يوجد متبقٍ في الأمانات (${remainingAfter.toLocaleString('ar-IQ')} د.ع) — يمكنك الاستمرار أو تعديل الحصص.`;
        }
        if (isEqualMode && sum > 0 && remainingAfter > 0) {
            hasInvalidField = true;
            validationNote = 'التقسيم بالتساوي يجب أن يوزّع رصيد الأمانات بالكامل دون متبقٍ.';
        }

        const ok =
            ghuramaaContext.canOpen &&
            !hasInvalidField &&
            sum > 0 &&
            (isEqualMode ? remainingAfter === 0 : true);
        return {
            ok,
            sum,
            remainingAfter,
            rows,
            validationNote,
            partialWarning,
            isEqualMode,
        };
    }, [ghuramaaContext, ghuramaaShareInputs, ghuramaaSplitMode]);

    const setGhuramaaShareInput = useCallback((creditorId: string, raw: string) => {
        setGhuramaaSplitMode('manual');
        setGhuramaaShareInputs((prev) => ({
            ...prev,
            [creditorId]: formatNumberInput(raw),
        }));
    }, []);

    const applyGhuramaaEqualSplit = useCallback(() => {
        const { available, eligible } = ghuramaaContext;
        if (available <= 0 || eligible.length === 0) return;
        const shares = splitAmountEqually(available, eligible.length);
        const next: Record<string, string> = {};
        eligible.forEach((c, i) => {
            const amt = shares[i] ?? 0;
            next[c.creditorId] = amt > 0 ? formatIqdDisplay(amt) : '';
        });
        setGhuramaaShareInputs(next);
        setGhuramaaSplitMode('equal');
    }, [ghuramaaContext]);

    const openGhuramaaModal = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('قسمة الغرماء متاحة فقط عند وجود أكثر من دائن واحد.', 'warning');
            return;
        }
        if (trustBalanceUnified <= 0) {
            notify('لا يوجد رصيد أمانات للتوزيع.', 'warning');
            return;
        }
        if (!ghuramaaContext.canOpen) {
            notify(
                ghuramaaContext.note ||
                    'لا توجد حصص دين مسجّلة للدائنين — تأكد من إجمالي المطالبة أو حصص الدائنين في الإضبارة.',
                'warning'
            );
            return;
        }
        setGhuramaaModalOpen(true);
    }, [canShowGhuramaaDivision, ghuramaaContext, notify, setGhuramaaModalOpen, trustBalanceUnified]);

    const applyGhuramaaDistribution = useCallback(() => {
        if (!canShowGhuramaaDivision) {
            notify('لا يمكن إجراء قسمة الغرماء: لا يوجد تعدد دائنين.', 'warning');
            return;
        }
        if (!ghuramaaManual.ok) {
            notify(
                ghuramaaManual.validationNote || 'أدخل حصص الدائنين يدوياً ضمن حدود الأمانات والديون.',
                'warning'
            );
            return;
        }
        const total = Math.max(0, Math.trunc(ghuramaaManual.sum));
        const distributionRows = ghuramaaManual.rows.filter((r) => r.amountDistributed > 0);
        if (!Number.isFinite(total) || total <= 0 || distributionRows.length === 0) {
            notify('لا يوجد مبلغ قابل للتوزيع.', 'warning');
            return;
        }
        const current = getLatestLedgerStore();
        const trustBefore = computeTrustBalanceFromPayments(current.payments);
        if (total > trustBefore) {
            notify(
                `مجموع الحصص يتجاوز رصيد الأمانات (${trustBefore.toLocaleString('ar-IQ')} د.ع).`,
                'warning'
            );
            return;
        }
        const ts = new Date().toISOString();
        const transactionId = `ghr-${Date.now()}`;
        try {
            onApplyGhuramaaDistribution?.({
                transactionId,
                dateIso: ts,
                totalAmountDistributed: total,
                distributionDetails: distributionRows,
            });
        } catch {
            notify('تعذر حفظ القسمة داخل الإضبارة.', 'error');
            return;
        }
        const trustAfter = Math.max(0, trustBefore - total);
        const row: LocalPaymentRow = {
            id: `pay-ghr-${Date.now()}`,
            amount: total,
            at: ts,
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
            '⚖️ قسمة الغرماء — توزيع الأمانات',
            `تم توزيع ${total.toLocaleString('ar-IQ')} د.ع على ${distributionRows.length} دائن/دائنين — المتبقي في الأمانات ${trustAfter.toLocaleString('ar-IQ')} د.ع.`
        );
        setGhuramaaModalOpen(false);
        setGhuramaaShareInputs({});
        setGhuramaaSplitMode(null);
        setDisburseAmountInput('');
        notify(
            `تم اعتماد القسمة. المتبقي في الأمانات: ${trustAfter.toLocaleString('ar-IQ')} د.ع`,
            'success'
        );
    }, [
        canShowGhuramaaDivision,
        getLatestLedgerStore,
        ghuramaaManual,
        notify,
        onApplyGhuramaaDistribution,
        persist,
        recordFinancialTimelineNote,
        remainingUnified,
        setDisburseAmountInput,
        setGhuramaaModalOpen,
    ]);

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
        ghuramaaContext,
        ghuramaaManual,
        ghuramaaShareInputs,
        setGhuramaaShareInput,
        applyGhuramaaEqualSplit,
        openGhuramaaModal,
        applyGhuramaaDistribution,
    };
}
