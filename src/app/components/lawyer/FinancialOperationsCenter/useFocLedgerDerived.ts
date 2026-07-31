import { useMemo } from 'react';
import { resolveAlimonyFinancialBreakdown, isPastAlimonyOnlyClaim } from '@/app/utils/alimonyFinancialBreakdown';
import type { PastAlimonyClaimSnapshot } from '@/app/utils/alimonyFinancialBreakdown';
import {
    resolveOngoingAlimonyMonthlyDisplay,
    shouldSuppressOngoingAlimonyMonthlyUi,
    type AlimonyBeneficiaryDeathState,
} from '@/app/utils/alimonyBeneficiaryDeathUtils';
import type { ExecutionFile } from '@/app/types/execution';
import { getLocalTodayYmd } from '@/app/utils/executionStateMachine';
import { isFinancialDebtCollectionClaim } from '@/app/utils/followupSpecializationVisibility';
import type { UnifiedCollectionDecisionState } from '@/app/utils/executorDecisionContracts';
import { resolveSettlementUxTier } from './settlementUxMatrix';
import { resolveSettlementContext, type SettlementContext } from './settlementContext';
import { hasActiveSalarySeizurePath } from './settlementSalaryExclusion';
import {
    computeTotalOwedUnifiedFromStore,
    extractYmd,
    hasFrozenLedgerRows,
    isUnifiedLedgerLocked,
    parseAmount,
    resolvePrincipalBasisFromStore,
    resolveSettlementDuePhase,
    shouldShowSettlementDueActions,
    type UnifiedLedgerTotalParams,
} from './utils';
import type { UnifiedLedgerStore } from './types';

export interface UseFocLedgerDerivedParams {
    store: UnifiedLedgerStore;
    ledgerTotalParams: UnifiedLedgerTotalParams;
    executionId?: string;

    claimType: string;
    claimTypes?: string[];

    isAlimonyClaim: boolean;
    alimonyCalculated?: {
        baseAccumulation?: number;
        wifeBaseAccumulation?: number;
        childrenBaseAccumulation?: number;
        baseDurationDays?: number;
        baseDurationMonths?: number;
        pastAccumulation?: number;
        pastDurationDays?: number;
        pastDurationMonths?: number;
        totalAccumulated?: number;
    } | null;
    past_wife_alimony?: number;
    past_children_alimony?: number;
    pastAlimonyClaim?: PastAlimonyClaimSnapshot | null;
    monthly_wife_alimony?: number;
    monthly_children_alimony?: number;
    monthlyAlimony: number;
    children_count?: number;
    alimony_beneficiary_death?: AlimonyBeneficiaryDeathState | null;
    alimony_blob?: Record<string, unknown> | null;
    activeDebtorIsDeceased: boolean;

    evictionLawyerFeeWaivedAtIntake: boolean;
    courtOrderedFeesSafe: number;
    isEvictionFundsModule: boolean;
    employeeDebtor: boolean;

    unifiedCollectionExecutorApproved: boolean;
    unifiedCollectionDecisionState: UnifiedCollectionDecisionState;
    isEvictionCollectionRequested: boolean;

    salarySeizureRegistryAssets: unknown[];
    settlementPanelOpen: boolean;
    showSettlementEviction: boolean;
    settlementInput: string;
}

export interface UseFocLedgerDerivedResult {
    sumLawyer: number;
    alimonyBreakdown: ReturnType<typeof resolveAlimonyFinancialBreakdown> | null;
    isPastAlimonyOnly: boolean;
    ongoingAlimonyDisplay: { total: number; beneficiaryKind: string; detailLines: string[] };
    ongoingMonthlyAlimonyTotal: number;
    showOngoingAlimonyMonthlySection: boolean;
    ongoingMonthlyAlimonyEffective: number;
    principalBasisAmount: number;
    baseDossierAmount: number;
    totalOwedUnified: number;
    sumDebtPaidLocal: number;
    hasPaymentRows: boolean;
    remainingUnified: number;
    debtEditLockReason: string | null;
    forceSettlementBuriedOnly: boolean;
    settlementUxTier: ReturnType<typeof resolveSettlementUxTier>;
    trustBalanceUnified: number;
    trustBalance: number;
    showEvictionLedger: boolean;
    hasApprovedUnifiedCollectionDecision: boolean;
    hasPendingUnifiedCollection: boolean;
    canApplySettlementAny: boolean;
    currentYmd: string;
    pendingSettlementDueYmd: string;
    pendingSettlementDuePhase: ReturnType<typeof resolveSettlementDuePhase>;
    showSettlementDueActions: boolean;
    settlementInProgress: boolean;
    salarySeizureActive: boolean;
    settlementContext: SettlementContext;
    showEmployeeCollectionStandard: boolean;
    showNonEmployeePhase2Standard: boolean;
    approvedRequestNeedsResubmit: boolean;
    canShowDisburse: boolean;
    canSubmitEvictionPhase2: boolean;
    hideEvictionTotalsInChrome: boolean;
}

/**
 * تجميعة القيم المُشتقّة (totals / canShow* / تفاصيل النفقة / سياق التسوية) —
 * مُستخرَجة من FinancialOperationsCenter.tsx لتقليص حجم الملف الرئيسي.
 * لا تُغيّر أي حالة (setState) — القراءة فقط من store/props/UI state.
 */
export function useFocLedgerDerived(params: UseFocLedgerDerivedParams): UseFocLedgerDerivedResult {
    const {
        store,
        ledgerTotalParams,
        executionId,
        claimType,
        claimTypes,
        isAlimonyClaim,
        alimonyCalculated,
        past_wife_alimony,
        past_children_alimony,
        pastAlimonyClaim,
        monthly_wife_alimony,
        monthly_children_alimony,
        monthlyAlimony,
        children_count,
        alimony_beneficiary_death,
        alimony_blob,
        activeDebtorIsDeceased,
        evictionLawyerFeeWaivedAtIntake,
        courtOrderedFeesSafe,
        isEvictionFundsModule,
        employeeDebtor,
        unifiedCollectionExecutorApproved,
        unifiedCollectionDecisionState,
        isEvictionCollectionRequested,
        salarySeizureRegistryAssets,
        settlementPanelOpen,
        showSettlementEviction,
        settlementInput,
    } = params;

    const sumLawyer = useMemo(
        () => store.lawyerFees.reduce((s, r) => s + (Number.isFinite(r.amount) ? r.amount : 0), 0),
        [store.lawyerFees]
    );

    const alimonyBreakdown = useMemo(() => {
        if (!isAlimonyClaim) return null;
        return resolveAlimonyFinancialBreakdown({
            alimony: alimonyCalculated ? { calculated: alimonyCalculated } : undefined,
            pastWifeAlimony: past_wife_alimony,
            pastChildrenAlimony: past_children_alimony,
            pastAlimonyClaim: pastAlimonyClaim ?? undefined,
        } as unknown as ExecutionFile);
    }, [isAlimonyClaim, alimonyCalculated, past_wife_alimony, past_children_alimony, pastAlimonyClaim]);

    const isPastAlimonyOnly = useMemo(
        () => isPastAlimonyOnlyClaim(claimType, claimTypes),
        [claimType, claimTypes]
    );

    const alimonyExecutionSnapshot = useMemo(
        () => ({
            claimType,
            claimTypes,
            monthlyWifeAlimony: monthly_wife_alimony,
            monthly_wife_alimony: monthly_wife_alimony,
            monthlyChildrenAlimony: monthly_children_alimony,
            monthly_children_alimony: monthly_children_alimony,
            monthlyAlimony,
            childrenCount: children_count,
            children_count,
            alimony_beneficiary_death: alimony_beneficiary_death ?? undefined,
            alimony: alimony_blob
                ? { ...alimony_blob, calculated: alimonyCalculated ?? alimony_blob.calculated }
                : alimonyCalculated
                  ? { calculated: alimonyCalculated }
                  : undefined,
        }),
        [
            claimType,
            claimTypes,
            monthly_wife_alimony,
            monthly_children_alimony,
            monthlyAlimony,
            children_count,
            alimony_beneficiary_death,
            alimony_blob,
            alimonyCalculated,
        ]
    );

    const ongoingAlimonyDisplay = useMemo(() => {
        if (!isAlimonyClaim || isPastAlimonyOnly) {
            return { total: 0, beneficiaryKind: '' as const, detailLines: [] as string[] };
        }
        return resolveOngoingAlimonyMonthlyDisplay(alimonyExecutionSnapshot);
    }, [alimonyExecutionSnapshot, isAlimonyClaim, isPastAlimonyOnly]);

    const ongoingMonthlyAlimonyTotal = ongoingAlimonyDisplay.total;
    const suppressOngoingAlimonyMonthly = shouldSuppressOngoingAlimonyMonthlyUi(activeDebtorIsDeceased);
    const showOngoingAlimonyMonthlySection =
        isAlimonyClaim && !isPastAlimonyOnly && !suppressOngoingAlimonyMonthly && ongoingMonthlyAlimonyTotal > 0;
    const ongoingMonthlyAlimonyEffective = suppressOngoingAlimonyMonthly ? 0 : ongoingMonthlyAlimonyTotal;

    const principalBasisAmount = resolvePrincipalBasisFromStore(store, ledgerTotalParams);
    const baseDossierFeesAmount = evictionLawyerFeeWaivedAtIntake ? 0 : courtOrderedFeesSafe;
    const baseDossierAmount = Math.max(0, principalBasisAmount + baseDossierFeesAmount);

    const totalOwedUnified = useMemo(
        () => computeTotalOwedUnifiedFromStore(store, ledgerTotalParams),
        [ledgerTotalParams, store]
    );

    const { debtPaidLocal, trustBalanceLocal } = useMemo(() => {
        let debtPaid = 0;
        let trust = 0;
        for (const r of store.payments) {
            const amt = Number.isFinite(r.amount) ? r.amount : 0;
            const et = (r.entryType ?? 'collect') as 'collect' | 'disburse' | 'settlement' | 'debt_adjustment';
            if (et === 'disburse') {
                trust -= amt;
            } else if (et === 'debt_adjustment') {
                debtPaid += amt;
            } else if (et === 'settlement') {
                debtPaid += amt;
                trust += amt;
            } else {
                debtPaid += amt;
                trust += amt;
            }
        }
        return { debtPaidLocal: debtPaid, trustBalanceLocal: trust };
    }, [store.payments]);

    const sumDebtPaidLocal = useMemo(
        () => Math.min(Math.max(0, debtPaidLocal), Math.max(0, totalOwedUnified)),
        [debtPaidLocal, totalOwedUnified]
    );
    const hasPaymentRows = store.payments.length > 0;
    const remainingUnified = Math.max(0, totalOwedUnified - sumDebtPaidLocal);

    const debtEditLockReason = useMemo(() => {
        if (!executionId) return 'لا يمكن التعديل بدون رقم إضبارة.';
        if (isUnifiedLedgerLocked(executionId, store, unifiedCollectionDecisionState)) {
            if (store.collectionRequestActive || hasFrozenLedgerRows(store, executionId)) {
                return 'الوعاء مجمّد بعد طلب الاستحصال — لا يمكن تعديل الدين حالياً.';
            }
            return 'الوعاء مقفل — لا يمكن تعديل الدين حالياً.';
        }
        return null;
    }, [executionId, store, unifiedCollectionDecisionState]);

    const forceSettlementBuriedOnly = useMemo(
        () => employeeDebtor && isFinancialDebtCollectionClaim(claimType),
        [employeeDebtor, claimType]
    );
    const settlementUxTier = useMemo(
        () => resolveSettlementUxTier(remainingUnified, { forceBuriedOnly: forceSettlementBuriedOnly }),
        [remainingUnified, forceSettlementBuriedOnly]
    );

    const trustBalanceUnified = Math.max(0, trustBalanceLocal);
    const trustBalance = trustBalanceUnified;
    const showEvictionLedger = isEvictionFundsModule;
    const hasApprovedUnifiedCollectionDecision =
        unifiedCollectionDecisionState === 'approved' || unifiedCollectionExecutorApproved;
    const hasPendingUnifiedCollection =
        unifiedCollectionDecisionState === 'pending' || store.collectionRequestActive || isEvictionCollectionRequested;

    const settlementAmountParsed = parseAmount(settlementInput);
    const canApplySettlementAny =
        Number.isFinite(settlementAmountParsed) &&
        settlementAmountParsed > 0 &&
        (isAlimonyClaim && ongoingMonthlyAlimonyEffective > 0 ? true : settlementAmountParsed <= remainingUnified);

    const currentYmd = getLocalTodayYmd();
    const pendingSettlementDueYmd = store.pendingSettlement ? extractYmd(store.pendingSettlement.dueDate) : '';
    const pendingSettlementDuePhase =
        store.pendingSettlement && pendingSettlementDueYmd
            ? resolveSettlementDuePhase(pendingSettlementDueYmd, currentYmd)
            : null;
    const showSettlementDueActions =
        Boolean(store.pendingSettlement) &&
        Boolean(pendingSettlementDueYmd) &&
        shouldShowSettlementDueActions(pendingSettlementDueYmd, currentYmd);

    const settlementInProgress = settlementPanelOpen || Boolean(store.pendingSettlement);

    const salarySeizureActive = useMemo(
        () =>
            hasActiveSalarySeizurePath({
                garnishment: store.garnishment,
                seizedAssets: salarySeizureRegistryAssets,
            }),
        [salarySeizureRegistryAssets, store.garnishment]
    );

    const settlementContext = useMemo(
        () =>
            resolveSettlementContext({
                settlementUxTier,
                remainingUnified,
                completed: store.completed,
                panelOpen: settlementPanelOpen,
                showSettlementForm: showSettlementEviction,
                pendingSettlement: store.pendingSettlement,
                pendingSettlementDueYmd,
                currentYmd,
                isFinancialDebtCollectionClaim: false,
                financialCenterTotalIqd: remainingUnified,
                settlementBreachTriggeredAt: store.settlementBreachTriggeredAt,
                salarySeizureActive,
                activeDebtorIsDeceased,
            }),
        [
            settlementUxTier,
            remainingUnified,
            store.completed,
            store.pendingSettlement,
            store.settlementBreachTriggeredAt,
            settlementPanelOpen,
            showSettlementEviction,
            pendingSettlementDueYmd,
            currentYmd,
            salarySeizureActive,
            activeDebtorIsDeceased,
        ]
    );

    const showEmployeeCollectionStandard =
        !isEvictionFundsModule &&
        employeeDebtor &&
        totalOwedUnified > 0 &&
        !store.completed &&
        store.collectionRequestActive &&
        unifiedCollectionExecutorApproved;

    const showNonEmployeePhase2Standard =
        !isEvictionFundsModule &&
        !employeeDebtor &&
        totalOwedUnified > 0 &&
        !store.completed &&
        store.collectionRequestActive &&
        unifiedCollectionExecutorApproved;

    const approvedRequestNeedsResubmit =
        hasApprovedUnifiedCollectionDecision &&
        store.collectionRequestedTotal !== null &&
        Math.abs(totalOwedUnified - store.collectionRequestedTotal) > 0.001;

    const canShowDisburse =
        trustBalanceUnified > 0 &&
        !store.completed &&
        !(store.collectionRequestActive && !unifiedCollectionExecutorApproved);

    const canSubmitEvictionPhase2 =
        isEvictionFundsModule &&
        showEvictionLedger &&
        totalOwedUnified > 0 &&
        !store.completed &&
        !store.garnishment &&
        !hasPendingUnifiedCollection &&
        (unifiedCollectionDecisionState !== 'approved' || approvedRequestNeedsResubmit);

    const hideEvictionTotalsInChrome = isEvictionFundsModule && !showEvictionLedger;

    return {
        sumLawyer,
        alimonyBreakdown,
        isPastAlimonyOnly,
        ongoingAlimonyDisplay,
        ongoingMonthlyAlimonyTotal,
        showOngoingAlimonyMonthlySection,
        ongoingMonthlyAlimonyEffective,
        principalBasisAmount,
        baseDossierAmount,
        totalOwedUnified,
        sumDebtPaidLocal,
        hasPaymentRows,
        remainingUnified,
        debtEditLockReason,
        forceSettlementBuriedOnly,
        settlementUxTier,
        trustBalanceUnified,
        trustBalance,
        showEvictionLedger,
        hasApprovedUnifiedCollectionDecision,
        hasPendingUnifiedCollection,
        canApplySettlementAny,
        currentYmd,
        pendingSettlementDueYmd,
        pendingSettlementDuePhase,
        showSettlementDueActions,
        settlementInProgress,
        salarySeizureActive,
        settlementContext,
        showEmployeeCollectionStandard,
        showNonEmployeePhase2Standard,
        approvedRequestNeedsResubmit,
        canShowDisburse,
        canSubmitEvictionPhase2,
        hideEvictionTotalsInChrome,
    };
}
