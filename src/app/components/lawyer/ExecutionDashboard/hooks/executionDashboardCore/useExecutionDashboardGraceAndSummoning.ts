// @ts-nocheck
/** مهلة قانونية + إحضار جبري + رسوم التحصيل — تجميع hooks موجودة */
import { useEffect, useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { meetsEarnerPersonalCoerciveFinancialThreshold } from '@/app/utils/earnerPersonalCoerciveFinancialGate';
import { useGracePeriodCalculations } from '../useGracePeriodCalculations';
import { useForcedSummoningAndFees } from '../useForcedSummoningAndFees';

export type UseExecutionDashboardGraceAndSummoningParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    debtorNotificationDate: string | null | undefined;
    debtors: ExecutionFile['debtors'];
    effectiveDebtors: Debtor[];
    isEvictionExecutionModule: boolean;
    notificationCount: number;
    manualGraceCalendarExtra: boolean;
    voluntaryEndOptimistic: boolean;
    setVoluntaryEndOptimistic: (value: boolean) => void;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    setNoticeVoluntaryPeriodEndOptimistic: (value: boolean) => void;
    debtorBrowserTabsMode: boolean;
    effectiveFollowupDebtorEntry: { d: Debtor; isPrimary?: boolean } | null | undefined;
    activeWorkspaceDebtorForFollowup: { d: Debtor; isPrimary?: boolean } | null | undefined;
    activeTimelineEventsDebtorScoped: { title?: string; description?: string }[];
    debtorAttendedVoluntarily: boolean;
    voluntaryAttendanceCount: number;
    claimType: string | undefined;
    isAlimonyClaim: boolean;
    monetaryStrictForSummoningEngine: boolean;
    forcedAttendanceIssued: boolean;
    initiator: string | undefined;
    paidDebt: number;
    totalOwed: number;
    parsedCourtFees: number;
    financialPrincipalAmount: number;
    paidCourtFees: number;
    paidDirectorateFees: number;
    paidClientFees: number;
    /** مدين المتابعة النشط — لحساب حدّ الكاسب المالي */
    earnerGateIsEmployee?: boolean;
};

export function useExecutionDashboardGraceAndSummoning(params: UseExecutionDashboardGraceAndSummoningParams) {
    const {
        executionData,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        setVoluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        activeTimelineEventsDebtorScoped,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        initiator,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerGateIsEmployee = false,
    } = params;

    const gracePeriod = useGracePeriodCalculations(
        executionData,
        debtorNotificationDate,
        debtors,
        effectiveDebtors,
        isEvictionExecutionModule,
        notificationCount,
        manualGraceCalendarExtra,
        voluntaryEndOptimistic,
        noticeVoluntaryPeriodEndOptimistic,
    );

    useEffect(() => {
        if (executionData?.eviction_voluntary_period_end_declared === true) {
            setVoluntaryEndOptimistic(false);
        }
    }, [executionData?.eviction_voluntary_period_end_declared, setVoluntaryEndOptimistic]);

    useEffect(() => {
        if (executionData?.notice_voluntary_period_end_declared === true) {
            setNoticeVoluntaryPeriodEndOptimistic(false);
        }
    }, [executionData?.notice_voluntary_period_end_declared, setNoticeVoluntaryPeriodEndOptimistic]);

    const earnerPersonalCoerciveFinancialThresholdMet = useMemo(() => {
        if (earnerGateIsEmployee) return false;
        const shouldCalculateExecutionFeeBase =
            initiator === 'الدائن' &&
            gracePeriod.daysSinceNoticeCalculated > 7 &&
            paidDebt < totalOwed;
        const shouldCalculateExecutionFee =
            shouldCalculateExecutionFeeBase &&
            (!isEvictionExecutionModule || Boolean(executionData?.eviction_lawyer_fee_requested));
        const calculatedExecutionFee = shouldCalculateExecutionFee
            ? (financialPrincipalAmount + parsedCourtFees) * 0.03
            : 0;
        const totalWithExecutionFee = totalOwed + calculatedExecutionFee;
        const provisionalRemaining =
            totalWithExecutionFee -
            (paidDebt + paidCourtFees + paidDirectorateFees + paidClientFees);
        return meetsEarnerPersonalCoerciveFinancialThreshold(provisionalRemaining);
    }, [
        earnerGateIsEmployee,
        initiator,
        gracePeriod.daysSinceNoticeCalculated,
        paidDebt,
        totalOwed,
        isEvictionExecutionModule,
        executionData?.eviction_lawyer_fee_requested,
        financialPrincipalAmount,
        parsedCourtFees,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
    ]);

    const summoningAndFees = useForcedSummoningAndFees(
        executionData,
        effectiveDebtors,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup,
        isEvictionExecutionModule,
        gracePeriod.evictionGraceAnchorDate,
        debtorNotificationDate,
        activeTimelineEventsDebtorScoped,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        claimType,
        isAlimonyClaim,
        monetaryStrictForSummoningEngine,
        forcedAttendanceIssued,
        manualGraceCalendarExtra,
        notificationCount,
        voluntaryEndOptimistic,
        initiator,
        gracePeriod.daysSinceNoticeCalculated,
        paidDebt,
        totalOwed,
        parsedCourtFees,
        financialPrincipalAmount,
        paidCourtFees,
        paidDirectorateFees,
        paidClientFees,
        earnerPersonalCoerciveFinancialThresholdMet,
    );

    return {
        ...gracePeriod,
        ...summoningAndFees,
    };
}
