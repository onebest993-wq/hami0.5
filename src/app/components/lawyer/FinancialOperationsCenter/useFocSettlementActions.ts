import { useCallback } from 'react';
import { SmartDialog } from '@/app/components/ui/SmartDialog';
import type { TimelineEventType } from '@/app/types/execution';
import { applyOngoingAlimonyBreachAccrual } from './alimonyOngoingAccrual';
import { applySettlementBreachCancellation } from './settlementGuarantorGate';
import {
    SETTLEMENT_DEFAULT_DUE_DAYS,
    clearSettlementFromStore,
    promptSettlementSalaryConflictChoice,
    resolveSettlementBlockedBySalarySeizure,
} from './settlementSalaryExclusion';
import type { LocalPaymentRow, PendingSettlement, UnifiedLedgerStore } from './types';
import {
    addDaysToYmd,
    addMonthsToYmd,
    extractYmd,
    formatNumberInput,
    invalidPositiveAmountMessage,
    parseAmount,
    shouldShowSettlementDueActions,
} from './utils';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';

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

export interface UseFocSettlementActionsParams {
    store: UnifiedLedgerStore;
    persist: (next: UnifiedLedgerStore) => void;
    getLatestLedgerStore: () => UnifiedLedgerStore;
    notify: NotifyFn;
    recordFinancialTimelineNote: RecordFinancialTimelineNoteFn;

    settlementInput: string;
    setSettlementInput: (value: string) => void;
    settlementDueDateInput: string;
    setSettlementDueDateInput: (value: string) => void;
    setShowSettlementEviction: (value: boolean) => void;
    setSettlementPanelOpen: (value: boolean) => void;

    remainingUnified: number;
    trustBalance: number;
    principalBasisAmount: number;
    isAlimonyClaim: boolean;
    ongoingMonthlyAlimonyEffective: number;
    isEvictionFundsModule: boolean;
    setIsEvictionCollectionRequested: (value: boolean) => void;

    salarySeizureRegistryAssets: unknown[];
    salarySeizureActive: boolean;

    onFundsLedgerPayment?: (args: {
        amount: number;
        kind: 'full' | 'partial';
        description: string;
    }) => void;
    onClearSalarySeizurePath?: () => void;
    onMonthlySettlementPaid?: (args: { dueDate: string; nextDueDate: string; amount: number }) => void;
    onMonthlySettlementDefault?: (args: { dueDate: string; amount: number }) => void;
    onAlimonyOngoingAccrued?: (args: {
        dueDate: string;
        accruedAmount: number;
        billableDays: number;
        newPrincipalTotal: number;
        monthlyRate: number;
    }) => void;
}

export interface UseFocSettlementActionsResult {
    ensureDefaultSettlementDueDate: () => void;
    registerSettlementPlan: () => Promise<boolean>;
    markPendingSettlementPaid: () => void;
    cancelPendingSettlement: () => void;
    endSettlementSimple: () => void;
    activateSettlementPanel: () => void;
    deactivateSettlementPanel: () => void;
}

/**
 * دورة حياة التسوية (تسجيل / دفع / إلغاء / إنهاء) وتفعيل لوحة التسوية —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
 */
export function useFocSettlementActions(
    params: UseFocSettlementActionsParams
): UseFocSettlementActionsResult {
    const {
        store,
        persist,
        getLatestLedgerStore,
        notify,
        recordFinancialTimelineNote,
        settlementInput,
        setSettlementInput,
        settlementDueDateInput,
        setSettlementDueDateInput,
        setShowSettlementEviction,
        setSettlementPanelOpen,
        remainingUnified,
        trustBalance,
        principalBasisAmount,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        isEvictionFundsModule,
        setIsEvictionCollectionRequested,
        salarySeizureRegistryAssets,
        salarySeizureActive,
        onFundsLedgerPayment,
        onClearSalarySeizurePath,
        onMonthlySettlementPaid,
        onMonthlySettlementDefault,
        onAlimonyOngoingAccrued,
    } = params;

    const ensureDefaultSettlementDueDate = useCallback(() => {
        if (!settlementDueDateInput.trim()) {
            const dueIn30Days = addDaysToYmd(getLocalTodayYmd(), SETTLEMENT_DEFAULT_DUE_DAYS);
            if (dueIn30Days) setSettlementDueDateInput(dueIn30Days);
        }
    }, [settlementDueDateInput, setSettlementDueDateInput]);

    const registerSettlementPlan = useCallback(async (): Promise<boolean> => {
        const amt = parseAmount(settlementInput);
        const dueDate = settlementDueDateInput.trim();
        if (!Number.isFinite(amt) || amt <= 0) {
            notify(invalidPositiveAmountMessage('مبلغ التسوية'), 'warning');
            return false;
        }
        if (
            resolveSettlementBlockedBySalarySeizure({
                garnishment: store.garnishment,
                seizedAssets: salarySeizureRegistryAssets,
            })
        ) {
            const choice = await promptSettlementSalaryConflictChoice(SmartDialog.confirm);
            if (choice === 'keep_salary') {
                notify('تم الإبقاء على حجز الراتب — أُلغي تسجيل التسوية.', 'info');
                return false;
            }
            onClearSalarySeizurePath?.();
        }
        if (amt > remainingUnified && !(isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0)) {
            notify(
                `لا يمكن اعتماد تسوية تتجاوز المبلغ المتبقي. المتبقي الحالي: ${remainingUnified.toLocaleString('ar-IQ')} د.ع`,
                'warning'
            );
            return false;
        }
        if (!dueDate) {
            notify('يرجى تحديد تاريخ دفع التسوية.', 'warning');
            return false;
        }
        const periodStartYmd = addMonthsToYmd(dueDate, -1) || extractYmd(new Date().toISOString());
        const tracksOngoingAlimony = isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0;
        const pending: PendingSettlement = {
            id: `stl-${Date.now()}`,
            amount: amt,
            dueDate,
            createdAt: new Date().toISOString(),
            periodStartYmd,
            tracksOngoingAlimony,
        };
        const hadPending = Boolean(store.pendingSettlement);
        persist({
            ...getLatestLedgerStore(),
            pendingSettlement: pending,
            settlementBreachTriggeredAt: null,
        });
        recordFinancialTimelineNote(
            hadPending ? '🗓️ تحديث التسوية' : '🗓️ تم تسجيل تسوية',
            `${hadPending ? 'تم تحديث' : 'تم تسجيل'} تسوية بمبلغ ${amt.toLocaleString('ar-IQ')} د.ع بتاريخ استحقاق ${dueDate}.`,
            'settlement'
        );
        setSettlementInput('');
        setSettlementDueDateInput('');
        setShowSettlementEviction(false);
        setSettlementPanelOpen(true);
        return true;
    }, [
        settlementInput,
        settlementDueDateInput,
        store.garnishment,
        store.pendingSettlement,
        salarySeizureRegistryAssets,
        onClearSalarySeizurePath,
        remainingUnified,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        notify,
        persist,
        getLatestLedgerStore,
        recordFinancialTimelineNote,
        setSettlementInput,
        setSettlementDueDateInput,
        setShowSettlementEviction,
        setSettlementPanelOpen,
    ]);

    const markPendingSettlementPaid = useCallback(() => {
        const pending = store.pendingSettlement;
        if (!pending) {
            notify('لا توجد تسوية مسجلة للدفع.', 'warning');
            return;
        }
        const dueYmd = extractYmd(pending.dueDate);
        const todayYmd = getLocalTodayYmd();
        if (!shouldShowSettlementDueActions(dueYmd || pending.dueDate, todayYmd)) {
            notify('أزرار التسديد تظهر عند حلول موعد السداد أو بعده.', 'warning');
            return;
        }
        const amt = Math.min(Math.max(0, pending.amount), remainingUnified);
        const tracksOngoing =
            Boolean(pending.tracksOngoingAlimony) ||
            (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0);
        const settlementPayAmount = tracksOngoing
            ? Math.max(0, pending.amount)
            : amt;
        if (settlementPayAmount <= 0) {
            notify('مبلغ التسوية غير صالح أو تم استيفاؤه مسبقاً.', 'warning');
            return;
        }
        const nextDueYmd = addMonthsToYmd(dueYmd || pending.dueDate, 1) || pending.dueDate;

        if (tracksOngoing) {
            persist({
                ...store,
                pendingSettlement: {
                    ...pending,
                    id: `stl-${Date.now()}`,
                    dueDate: nextDueYmd,
                    periodStartYmd: dueYmd || pending.dueDate,
                    createdAt: new Date().toISOString(),
                },
            });
            recordFinancialTimelineNote(
                '✅ تم دفع النفقة الشهرية',
                `تم تسديد النفقة المستمرة بمبلغ ${settlementPayAmount.toLocaleString('ar-IQ')} د.ع (استحقاق ${pending.dueDate}).`,
                'settlement'
            );
            onMonthlySettlementPaid?.({
                dueDate: dueYmd || pending.dueDate,
                nextDueDate: nextDueYmd,
                amount: settlementPayAmount,
            });
            notify('تم تسجيل تسديد النفقة الشهرية — انتقل موعد السداد للشهر التالي.', 'success');
            return;
        }

        if (amt <= 0) {
            notify('مبلغ التسوية غير صالح أو تم استيفاؤه مسبقاً.', 'warning');
            return;
        }
        const debtAfter = Math.max(0, remainingUnified - amt);
        const trustAfter = trustBalance + amt;
        const row: LocalPaymentRow = {
            id: `pay-settlement-${Date.now()}`,
            amount: amt,
            at: new Date().toISOString(),
            kind: debtAfter === 0 ? 'full' : 'partial',
            entryType: 'settlement',
            balanceAfter: debtAfter,
            debtBalanceAfter: debtAfter,
            trustBalanceAfter: trustAfter,
        };
        persist({
            ...store,
            payments: [row, ...store.payments],
            pendingSettlement: {
                ...pending,
                id: `stl-${Date.now()}`,
                dueDate: nextDueYmd,
                periodStartYmd: dueYmd || pending.dueDate,
                createdAt: new Date().toISOString(),
            },
            completed: debtAfter === 0,
            collectionRequestActive: debtAfter === 0 ? false : store.collectionRequestActive,
        });
        if (isEvictionFundsModule && debtAfter === 0) setIsEvictionCollectionRequested(false);
        onFundsLedgerPayment?.({
            amount: amt,
            kind: debtAfter === 0 ? 'full' : 'partial',
            description: 'دفع تسوية مسجلة — الوعاء الموحّد',
        });
        recordFinancialTimelineNote(
            '✅ تم دفع التسوية',
            `تم دفع التسوية المسجلة بمبلغ ${amt.toLocaleString('ar-IQ')} د.ع (استحقاق ${pending.dueDate}).`,
            'settlement'
        );
        onMonthlySettlementPaid?.({
            dueDate: dueYmd || pending.dueDate,
            nextDueDate: nextDueYmd,
            amount: amt,
        });
    }, [
        store,
        remainingUnified,
        trustBalance,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        isEvictionFundsModule,
        notify,
        persist,
        recordFinancialTimelineNote,
        setIsEvictionCollectionRequested,
        onFundsLedgerPayment,
        onMonthlySettlementPaid,
    ]);

    const cancelPendingSettlement = useCallback(() => {
        const pending = store.pendingSettlement;
        if (!pending) {
            notify('لا توجد تسوية لإلغائها.', 'warning');
            return;
        }
        const todayYmd = getLocalTodayYmd();
        const dueYmd = extractYmd(pending.dueDate);
        const tracksOngoing =
            Boolean(pending.tracksOngoingAlimony) ||
            (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0);
        const canAccrueOngoing =
            tracksOngoing &&
            ongoingMonthlyAlimonyEffective > 0 &&
            Boolean(dueYmd) &&
            shouldShowSettlementDueActions(dueYmd || pending.dueDate, todayYmd);

        let nextStore: UnifiedLedgerStore;
        let accruedAmount = 0;
        let billableDays = 0;
        let newPrincipalTotal = principalBasisAmount;

        if (canAccrueOngoing) {
            const accrual = applyOngoingAlimonyBreachAccrual({
                store: getLatestLedgerStore(),
                pending,
                monthlyAmount: ongoingMonthlyAlimonyEffective || pending.amount,
                currentYmd: todayYmd,
                basePrincipal: principalBasisAmount,
            });
            nextStore = accrual.store;
            accruedAmount = accrual.accruedAmount;
            billableDays = accrual.billableDays;
            newPrincipalTotal = accrual.newPrincipalTotal;
        } else {
            nextStore = applySettlementBreachCancellation(
                getLatestLedgerStore(),
                new Date().toISOString()
            );
        }

        persist(nextStore);
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);

        if (canAccrueOngoing && accruedAmount > 0) {
            onAlimonyOngoingAccrued?.({
                dueDate: pending.dueDate,
                accruedAmount,
                billableDays,
                newPrincipalTotal,
                monthlyRate: ongoingMonthlyAlimonyEffective || pending.amount,
            });
            recordFinancialTimelineNote(
                '📈 ترحيل نفقة مستمرة للمتبقي',
                `أُضيف ${accruedAmount.toLocaleString('ar-IQ')} د.ع إلى المتبقي — ${billableDays} يوماً من النفقة الشهرية (${(ongoingMonthlyAlimonyEffective || pending.amount).toLocaleString('ar-IQ')} د.ع/شهر) بعد إخلال التسوية.`,
                'settlement'
            );
            notify(
                `تم ترحيل ${accruedAmount.toLocaleString('ar-IQ')} د.ع من النفقة المستمرة غير المسددة إلى المتبقي (${billableDays} يوماً).`,
                'warning'
            );
        }

        if (isAlimonyClaim) {
            onMonthlySettlementDefault?.({ dueDate: pending.dueDate, amount: pending.amount });
        }

        recordFinancialTimelineNote(
            '❌ إخلال التسوية',
            accruedAmount > 0
                ? `أُلغيت التسوية بعد عدم السداد — رُحِّل ${accruedAmount.toLocaleString('ar-IQ')} د.ع إلى المتبقي.`
                : `أُلغيت التسوية بمبلغ ${pending.amount.toLocaleString('ar-IQ')} د.ع بعد عدم السداد — عاد زر حجز الراتب للظهور.`,
            'settlement'
        );
        if (!canAccrueOngoing || accruedAmount <= 0) {
            notify('تم إلغاء التسوية — عاد زر حجز الراتب للظهور في تبويب الحجوزات.', 'info');
        }
    }, [
        store.pendingSettlement,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        principalBasisAmount,
        notify,
        persist,
        getLatestLedgerStore,
        recordFinancialTimelineNote,
        setSettlementPanelOpen,
        setShowSettlementEviction,
        onAlimonyOngoingAccrued,
        onMonthlySettlementDefault,
    ]);

    const endSettlementSimple = useCallback(() => {
        if (!store.pendingSettlement) {
            notify('لا توجد تسوية لإنهائها.', 'warning');
            return;
        }
        persist(clearSettlementFromStore(getLatestLedgerStore()));
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);
        recordFinancialTimelineNote('إلغاء التسوية', 'أُلغيت التسوية وعادت دورة التسوية.', 'settlement');
        notify('تم إلغاء التسوية.', 'success');
    }, [
        getLatestLedgerStore,
        notify,
        persist,
        recordFinancialTimelineNote,
        store.pendingSettlement,
        setSettlementPanelOpen,
        setShowSettlementEviction,
    ]);

    const activateSettlementPanel = useCallback(() => {
        if (salarySeizureActive) return;
        setSettlementPanelOpen(true);
        if (!store.pendingSettlement) {
            setShowSettlementEviction(true);
            ensureDefaultSettlementDueDate();
            if (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0 && !settlementInput.trim()) {
                setSettlementInput(formatNumberInput(String(ongoingMonthlyAlimonyEffective)));
            }
        }
    }, [
        store.pendingSettlement,
        ensureDefaultSettlementDueDate,
        isAlimonyClaim,
        ongoingMonthlyAlimonyEffective,
        settlementInput,
        salarySeizureActive,
        setSettlementPanelOpen,
        setShowSettlementEviction,
        setSettlementInput,
    ]);

    const deactivateSettlementPanel = useCallback(() => {
        setSettlementPanelOpen(false);
        setShowSettlementEviction(false);
    }, [setSettlementPanelOpen, setShowSettlementEviction]);

    return {
        ensureDefaultSettlementDueDate,
        registerSettlementPlan,
        markPendingSettlementPaid,
        cancelPendingSettlement,
        endSettlementSimple,
        activateSettlementPanel,
        deactivateSettlementPanel,
    };
}
