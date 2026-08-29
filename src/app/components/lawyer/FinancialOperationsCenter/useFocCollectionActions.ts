import { useCallback, useEffect, useRef } from 'react';
import type { TimelineEventType } from '@/app/types/execution';
import { appendEvictionExecutorRequest } from '@/app/utils/executorSeizureDecisionQueue';
import {
    applyManualDebtTotalsEdit,
    computeTotalOwedUnifiedFromStore,
    formatNumberInput,
    freezeLedgerForCollection,
    hasFrozenLedgerRows,
    parseAmount,
    resolvePrincipalBasisFromStore,
    type UnifiedLedgerTotalParams,
} from './utils';
import type { UnifiedLedgerStore } from './types';

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

export interface UseFocCollectionActionsParams {
    persist: (next: UnifiedLedgerStore) => void;
    getLatestLedgerStore: () => UnifiedLedgerStore;
    ledgerTotalParams: UnifiedLedgerTotalParams;
    notify: NotifyFn;
    recordFinancialTimelineNote: RecordFinancialTimelineNoteFn;
    executionId?: string;
    isEvictionFundsModule: boolean;

    unifiedCollectionExecutorApproved: boolean;
    setIsEvictionCollectionRequested: (value: boolean) => void;

    totalOwedUnified: number;
    remainingUnified: number;
    debtEditLockReason: string | null;

    debtEditTotalInput: string;
    setDebtEditTotalInput: (value: string) => void;
    debtEditRemainingInput: string;
    setDebtEditRemainingInput: (value: string) => void;
    setDebtEditOpen: (value: boolean) => void;

    onManualDebtTotalsUpdated?: (payload: {
        principalSnapshot: number;
        totalOwed: number;
        remaining: number;
    }) => void;
    onAfterCollectionRequestSubmitted?: () => void;
    onEvictionLedgerActivated?: () => void;
    evictionLedgerActivatedPersisted?: boolean;
}

/** أول تفعيل لوعاء التخلية من الاستحصال — يُبلَّغ الأب لفتح تبويب الأصول والسجل الزمني */
export function shouldNotifyParentEvictionLedgerActivated(
    isEvictionFundsModule: boolean,
    alreadyActivated: boolean,
): boolean {
    return Boolean(isEvictionFundsModule) && !alreadyActivated;
}

export interface UseFocCollectionActionsResult {
    openDebtEditModal: () => void;
    applyDebtTotalsEdit: () => void;
    submitCollectionRequest: () => void;
}

/**
 * طلب الاستحصال (الوعاء الموحّد) + تعديل إجمالي الدين يدوياً + مزامنة تجميد الوعاء
 * وإعادة ضبطه عند تغيّر الوعاء بعد موافقة سابقة —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
 */
export function useFocCollectionActions(
    params: UseFocCollectionActionsParams
): UseFocCollectionActionsResult {
    const {
        persist,
        getLatestLedgerStore,
        ledgerTotalParams,
        notify,
        recordFinancialTimelineNote,
        executionId,
        isEvictionFundsModule,
        unifiedCollectionExecutorApproved,
        setIsEvictionCollectionRequested,
        totalOwedUnified,
        remainingUnified,
        debtEditLockReason,
        debtEditTotalInput,
        setDebtEditTotalInput,
        debtEditRemainingInput,
        setDebtEditRemainingInput,
        setDebtEditOpen,
        onManualDebtTotalsUpdated,
        onAfterCollectionRequestSubmitted,
        onEvictionLedgerActivated,
        evictionLedgerActivatedPersisted,
    } = params;

    const openDebtEditModal = useCallback(() => {
        setDebtEditTotalInput(formatNumberInput(String(Math.round(totalOwedUnified))));
        setDebtEditRemainingInput(formatNumberInput(String(Math.round(remainingUnified))));
        setDebtEditOpen(true);
    }, [remainingUnified, setDebtEditOpen, setDebtEditRemainingInput, setDebtEditTotalInput, totalOwedUnified]);

    const applyDebtTotalsEdit = useCallback(() => {
        if (debtEditLockReason) {
            notify(debtEditLockReason, 'warning');
            return;
        }
        const total = parseAmount(debtEditTotalInput);
        const remaining = parseAmount(debtEditRemainingInput);
        const current = getLatestLedgerStore();
        const result = applyManualDebtTotalsEdit(current, ledgerTotalParams, total, remaining);
        if (!result.ok) {
            notify('reason' in result ? result.reason : 'تعذّر تعديل المبالغ يدوياً.', 'warning');
            return;
        }
        persist(result.store);
        const principalSnapshot = resolvePrincipalBasisFromStore(result.store, ledgerTotalParams);
        onManualDebtTotalsUpdated?.({
            principalSnapshot,
            totalOwed: Math.max(0, Math.round(total)),
            remaining: Math.max(0, Math.round(remaining)),
        });
        recordFinancialTimelineNote(
            '✏️ تعديل الدين',
            `إجمالي الدين: ${Math.round(total).toLocaleString('ar-IQ')} د.ع — المتبقي: ${Math.round(remaining).toLocaleString('ar-IQ')} د.ع`
        );
        setDebtEditOpen(false);
        notify('تم تحديث إجمالي الدين والمتبقي.', 'success');
    }, [
        debtEditLockReason,
        debtEditRemainingInput,
        debtEditTotalInput,
        getLatestLedgerStore,
        ledgerTotalParams,
        notify,
        onManualDebtTotalsUpdated,
        persist,
        recordFinancialTimelineNote,
        setDebtEditOpen,
    ]);

    useEffect(() => {
        if (!unifiedCollectionExecutorApproved || !executionId) return;
        const current = getLatestLedgerStore();
        const frozen = freezeLedgerForCollection(current, executionId, ledgerTotalParams);
        const withSnapshot =
            typeof frozen.collectionRequestedTotal === 'number' && frozen.collectionRequestedTotal > 0
                ? frozen
                : {
                      ...frozen,
                      collectionRequestedTotal: computeTotalOwedUnifiedFromStore(frozen, ledgerTotalParams),
                  };
        if (
            !hasFrozenLedgerRows(withSnapshot, executionId) &&
            typeof withSnapshot.collectionRequestedTotal !== 'number'
        ) {
            return;
        }
        const unchanged =
            hasFrozenLedgerRows(current, executionId) === hasFrozenLedgerRows(withSnapshot, executionId) &&
            Math.abs(
                (current.collectionRequestedTotal ?? 0) - (withSnapshot.collectionRequestedTotal ?? 0)
            ) <= 0.001;
        if (!unchanged) persist(withSnapshot);
    }, [executionId, ledgerTotalParams, persist, unifiedCollectionExecutorApproved, getLatestLedgerStore]);

    const vesselMismatchHandledRef = useRef<string | null>(null);

    useEffect(() => {
        if (!unifiedCollectionExecutorApproved || !executionId) return;
        const current = getLatestLedgerStore();
        if (!current.collectionRequestActive) return;
        if (current.collectionRequestedTotal === null) return;
        const currentTotal = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        if (Math.abs(currentTotal - current.collectionRequestedTotal) <= 0.001) return;

        const noticeKey = `${executionId}:${current.collectionRequestedTotal}:${currentTotal}`;
        if (vesselMismatchHandledRef.current === noticeKey) return;
        vesselMismatchHandledRef.current = noticeKey;

        persist({
            ...current,
            collectionRequestActive: false,
            collectionRequestedTotal: currentTotal,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(false);
        notify('تم تعديل الوعاء بعد موافقة سابقة — يلزم إعادة تقديم طلب الاستحصال.', 'info');
    }, [
        executionId,
        getLatestLedgerStore,
        isEvictionFundsModule,
        ledgerTotalParams,
        notify,
        persist,
        totalOwedUnified,
        unifiedCollectionExecutorApproved,
        setIsEvictionCollectionRequested,
    ]);

    const submitCollectionRequest = useCallback(() => {
        const current = getLatestLedgerStore();
        const submitTotal = computeTotalOwedUnifiedFromStore(current, ledgerTotalParams);
        const submitRemaining = Math.max(
            0,
            submitTotal -
                Math.min(
                    Math.max(0, current.payments.reduce((paid, row) => {
                        const amt = Number.isFinite(row.amount) ? row.amount : 0;
                        const et = (row.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement';
                        return et === 'disburse' ? paid : paid + amt;
                    }, 0)),
                    submitTotal
                )
        );
        if (submitTotal <= 0 || current.completed) return;
        const appended = appendEvictionExecutorRequest({
            executionId,
            title: 'طلب استحصال — الوعاء الموحّد (أتعاب + مصاريف)',
            body: `طلب استحصال الأتعاب والمصاريف في الوعاء الموحّد.\nإجمالي المطلوب: ${submitTotal.toLocaleString('ar-IQ')} د.ع.\nالمتبقي: ${submitRemaining.toLocaleString('ar-IQ')} د.ع.`,
            requestKind: 'unified_collection',
        });
        if (!appended) {
            notify('تعذر تسجيل الطلب أو يوجد طلب مماثل قيد المعالجة لدى المنفذ.', 'warning');
            return;
        }
        const frozen =
            executionId != null
                ? freezeLedgerForCollection(current, executionId, ledgerTotalParams)
                : current;
        const frozenTotal = computeTotalOwedUnifiedFromStore(frozen, ledgerTotalParams);
        const alreadyActivated =
            Boolean(frozen.evictionLedgerActivated) || Boolean(evictionLedgerActivatedPersisted);
        persist({
            ...frozen,
            collectionRequestActive: true,
            collectionRequestedTotal: Math.max(submitTotal, frozenTotal),
            evictionLedgerActivated: isEvictionFundsModule ? true : frozen.evictionLedgerActivated,
        });
        if (isEvictionFundsModule) setIsEvictionCollectionRequested(true);
        if (shouldNotifyParentEvictionLedgerActivated(isEvictionFundsModule, alreadyActivated)) {
            onEvictionLedgerActivated?.();
        }
        recordFinancialTimelineNote(
            '📨 طلب استحصال — الوعاء الموحّد',
            `تم تقديم طلب استحصال بإجمالي ${Math.max(submitTotal, frozenTotal).toLocaleString('ar-IQ')} د.ع — المتبقي ${submitRemaining.toLocaleString('ar-IQ')} د.ع.`,
            'decision'
        );
        onAfterCollectionRequestSubmitted?.();
    }, [
        executionId,
        getLatestLedgerStore,
        isEvictionFundsModule,
        ledgerTotalParams,
        notify,
        onAfterCollectionRequestSubmitted,
        onEvictionLedgerActivated,
        evictionLedgerActivatedPersisted,
        persist,
        recordFinancialTimelineNote,
        setIsEvictionCollectionRequested,
    ]);

    return {
        openDebtEditModal,
        applyDebtTotalsEdit,
        submitCollectionRequest,
    };
}
