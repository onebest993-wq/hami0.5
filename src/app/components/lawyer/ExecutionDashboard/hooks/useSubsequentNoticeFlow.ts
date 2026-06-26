import { useMemo } from 'react';
import type { Debtor, ExecutionFile } from '@/app/types/execution';
import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import {
    isEarnerLikeSummonsBranch,
    isEmployeeMonetaryFinancialPath,
} from '@/app/utils/debtorSummonsProfile';
import {
    isGracePeriodExpired,
    calculateDaysRemaining,
} from '@/app/utils/executionStateMachine';
import { getEmployeeAssignmentForDebtorKey } from '@/app/utils/employeeSummonsAssignment';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';

export function useSubsequentNoticeFlow(
    executionData: ExecutionFile | null | undefined,
    executionId: string | undefined,
    decisionsReloadEpoch: number,
    debtorSummonsProfile: DebtorSummonsProfile | string | null,
    followupDebtorSummonsProfile: DebtorSummonsProfile | string | null,
    isEvictionExecutionModule: boolean,
    isDebtorGovernmentEmployee: boolean,
    isDebtorRetired: boolean,
    followupIsDebtorGovernmentEmployee: boolean,
    followupIsDebtorRetired: boolean,
    unifiedCollectionApproved: boolean,
    notificationCount: number,
    forcedAttendanceIssued: boolean,
    summoningRound: number,
    isEvictionGraceExpiredNow: boolean,
    isGracePeriodExpiredNow: boolean,
    debtorAttendedVoluntarily: boolean,
    voluntaryAttendanceCount: number,
    debtorNotificationDate: string | null,
    manualGraceCalendarExtra: boolean,
    lawyerStartedPostNoticeExecution: boolean,
    noticeVoluntaryPeriodEndOptimistic: boolean,
    voluntaryEndOptimistic: boolean,
    isEvictionGraceEffectivelyExpired: boolean,
    effectiveDebtors: Debtor[],
    activeCoerciveActions: string[],
    forcedPathAttendanceSecured: boolean,
    debtorForcedToAttend: boolean,
    investigationMemoIssued: boolean,
    debtorArrested: boolean,
    activeDebtorNoticeScope: { absenceBadgeDismissed?: boolean; [key: string]: unknown },
    debtorSummonsMarkerLocal: { id?: string } | null,
    monetaryExecutionStrictPathFlag: boolean,
    isAlimonyClaim: boolean,
    debtorBrowserTabsMode: boolean,
    activeWorkspaceDebtorForFollowup: { d: Debtor; isPrimary?: boolean; key?: string } | null,
    executionExtras: { perDebtorGarnishments?: Record<string, unknown>; [key: string]: unknown },
    unifiedSummonsTargetDebtorKey: string | null,
    activeDebtorIsDeceased: boolean,
    primaryDebtorKeyResolved: string | null,
    debtorNotifiedForEvictionGrace: boolean,
) {
    const earnerForcedActionUnlocked = useMemo(() => {
        if (!isEarnerLikeSummonsBranch(debtorSummonsProfile as DebtorSummonsProfile)) return false;
        if (isEvictionExecutionModule && isDebtorGovernmentEmployee) return false;
        if (forcedAttendanceIssued) return false;
        if (summoningRound >= 2) return true;
        if (
            isEvictionExecutionModule &&
            !isDebtorGovernmentEmployee &&
            !isDebtorRetired &&
            unifiedCollectionApproved &&
            executionData?.eviction_last_summons_for_collection === true &&
            executionData?.eviction_last_collection_summons_branch === 'coercive'
        ) {
            return true;
        }
        const graceDone = isEvictionExecutionModule ? isEvictionGraceExpiredNow : isGracePeriodExpiredNow;
        if (!graceDone || debtorAttendedVoluntarily) return false;
        return true;
    }, [
        debtorSummonsProfile,
        isEvictionExecutionModule,
        isDebtorGovernmentEmployee,
        isDebtorRetired,
        unifiedCollectionApproved,
        executionData?.eviction_last_summons_for_collection,
        executionData?.eviction_last_collection_summons_branch,
        notificationCount,
        forcedAttendanceIssued,
        summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily,
    ]);

    const followupEarnerForcedActionUnlocked = useMemo(() => {
        if (!isEarnerLikeSummonsBranch(followupDebtorSummonsProfile as DebtorSummonsProfile)) return false;
        if (isEvictionExecutionModule && followupIsDebtorGovernmentEmployee) return false;
        if (forcedAttendanceIssued) return false;
        if (summoningRound >= 2) return true;
        if (
            isEvictionExecutionModule &&
            !followupIsDebtorGovernmentEmployee &&
            !followupIsDebtorRetired &&
            unifiedCollectionApproved &&
            executionData?.eviction_last_summons_for_collection === true &&
            executionData?.eviction_last_collection_summons_branch === 'coercive'
        ) {
            return true;
        }
        const graceDone = isEvictionExecutionModule ? isEvictionGraceExpiredNow : isGracePeriodExpiredNow;
        if (!graceDone || debtorAttendedVoluntarily) return false;
        return true;
    }, [
        followupDebtorSummonsProfile,
        isEvictionExecutionModule,
        followupIsDebtorGovernmentEmployee,
        followupIsDebtorRetired,
        unifiedCollectionApproved,
        executionData?.eviction_last_summons_for_collection,
        executionData?.eviction_last_collection_summons_branch,
        forcedAttendanceIssued,
        summoningRound,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        debtorAttendedVoluntarily,
    ]);

    const baseSubsequentNoticeUnlocked = useMemo(() => {
        const voluntaryEndGeneral =
            !isEvictionExecutionModule &&
            Boolean(
                executionData?.notice_voluntary_period_end_declared ||
                    noticeVoluntaryPeriodEndOptimistic
            );
        const memoFirstVoluntaryCycle = notificationCount === 1;
        if (debtorSummonsProfile === 'employee_monetary') {
            return (
                debtorAttendedVoluntarily ||
                voluntaryEndGeneral ||
                (!memoFirstVoluntaryCycle && activeCoerciveActions.includes('salary')) ||
                (!memoFirstVoluntaryCycle &&
                    isGracePeriodExpiredNow &&
                    activeCoerciveActions.length > 0)
            );
        }
        return (
            voluntaryAttendanceCount > 0 ||
            voluntaryEndGeneral ||
            forcedPathAttendanceSecured ||
            debtorForcedToAttend ||
            investigationMemoIssued ||
            debtorArrested ||
            (!memoFirstVoluntaryCycle &&
                isGracePeriodExpiredNow &&
                activeCoerciveActions.length > 0)
        );
    }, [
        debtorSummonsProfile,
        debtorAttendedVoluntarily,
        activeCoerciveActions,
        isGracePeriodExpiredNow,
        voluntaryAttendanceCount,
        forcedPathAttendanceSecured,
        debtorForcedToAttend,
        investigationMemoIssued,
        debtorArrested,
        isEvictionExecutionModule,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        notificationCount,
    ]);

    const evictionSubsequentNoticeUnlocked =
        isEvictionExecutionModule &&
        debtorNotifiedForEvictionGrace &&
        notificationCount >= 1 &&
        (notificationCount >= 2 || isEvictionGraceEffectivelyExpired);

    const subsequentNoticeUnlocked =
        baseSubsequentNoticeUnlocked ||
        evictionSubsequentNoticeUnlocked ||
        Boolean(executionData?.executor_coercive_unlock);

    const anyExecutorDecisionResolvedForMemoBadge = useMemo(() => {
        const ex = executionData?.id ?? executionId;
        if (!ex) return false;
        return readExecutorDecisionsArray(ex).some((r) => {
            const o = String((r as { executorOutcome?: string }).executorOutcome || '')
                .trim()
                .toLowerCase();
            return o === 'approved' || o === 'alternative';
        });
    }, [executionData?.id, executionId, decisionsReloadEpoch]);

    const primaryDebtorTaklifActive = useMemo(() => {
        if (!executionData) return false;
        const pk = primaryDebtorKeyResolved;
        const emp = getEmployeeAssignmentForDebtorKey(executionData, pk, pk);
        return Boolean(
            emp &&
                (emp.phase === 'active' ||
                    emp.phase === 'absent_declared' ||
                    emp.phase === 'investigation_pending' ||
                    emp.phase === 'warrant_ui')
        );
    }, [
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        primaryDebtorKeyResolved,
    ]);

    const primaryMemoNoticeBadge = useMemo(() => {
        if (notificationCount !== 1 || subsequentNoticeUnlocked) return null;
        if (debtorAttendedVoluntarily || voluntaryAttendanceCount > 0) return null;
        if (lawyerStartedPostNoticeExecution) return null;
        if (
            !isEvictionExecutionModule &&
            (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic)
        ) {
            return null;
        }
        if (
            isEvictionExecutionModule &&
            (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic)
        ) {
            return null;
        }
        if (anyExecutorDecisionResolvedForMemoBadge) return null;
        if (primaryDebtorTaklifActive) return null;
        const extra = isEvictionExecutionModule ? 0 : manualGraceCalendarExtra ? 1 : 0;
        const anchor = isEvictionExecutionModule
            ? executionData?.eviction_first_notice_date ||
              executionData?.debtorNotificationDate ||
              debtorNotificationDate ||
              null
            : executionData?.execution_memo_anchor_date ||
              executionData?.debtorNotificationDate ||
              debtorNotificationDate ||
              null;
        if (!anchor) return null;
        const expired = isGracePeriodExpired(anchor, new Date(), extra);
        const remaining = calculateDaysRemaining(anchor, new Date(), extra);
        return { anchor, remaining, graceExpired: expired };
    }, [
        notificationCount,
        subsequentNoticeUnlocked,
        isEvictionExecutionModule,
        executionData?.eviction_first_notice_date,
        executionData?.debtorNotificationDate,
        executionData?.execution_memo_anchor_date,
        debtorNotificationDate,
        manualGraceCalendarExtra,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        lawyerStartedPostNoticeExecution,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
    ]);

    const primaryDebtorNoticeYmdResolved = useMemo(() => {
        const d0 = effectiveDebtors[0] as Debtor | undefined;
        return (
            debtorNotificationDate ||
            executionData?.debtorNotificationDate ||
            d0?.notificationDate ||
            null
        );
    }, [debtorNotificationDate, executionData?.debtorNotificationDate, effectiveDebtors]);

    const showDebtorUnservedMemoBadge =
        notificationCount === 0 &&
        !primaryDebtorNoticeYmdResolved &&
        !debtorAttendedVoluntarily &&
        voluntaryAttendanceCount === 0 &&
        !(executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic) &&
        !(executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic);

    const shouldWarnOnMemoClick = useMemo(() => {
        if (debtorAttendedVoluntarily || voluntaryAttendanceCount > 0) return false;
        if (lawyerStartedPostNoticeExecution) return false;
        const graceExpired = isEvictionExecutionModule ? isEvictionGraceExpiredNow : isGracePeriodExpiredNow;
        if (graceExpired) return false;
        const periodEnded = isEvictionExecutionModule
            ? (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic)
            : (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic);
        if (periodEnded) return false;
        return true;
    }, [
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        lawyerStartedPostNoticeExecution,
        isEvictionExecutionModule,
        isEvictionGraceExpiredNow,
        isGracePeriodExpiredNow,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
    ]);

    const primaryDebtorAbsenceBadge = useMemo(() => {
        if (activeDebtorNoticeScope.absenceBadgeDismissed) return null;
        if (lawyerStartedPostNoticeExecution) return null;
        if (primaryDebtorTaklifActive) return null;
        const noVoluntaryAttendance =
            !debtorAttendedVoluntarily && voluntaryAttendanceCount === 0;
        if (!noVoluntaryAttendance) return null;

        const voluntaryEndNonEviction =
            !isEvictionExecutionModule &&
            notificationCount === 1 &&
            (executionData?.notice_voluntary_period_end_declared || noticeVoluntaryPeriodEndOptimistic);

        const voluntaryEndEviction =
            isEvictionExecutionModule &&
            notificationCount === 1 &&
            (executionData?.eviction_voluntary_period_end_declared || voluntaryEndOptimistic);

        if (!voluntaryEndNonEviction && !voluntaryEndEviction) return null;
        if (!subsequentNoticeUnlocked) return null;

        const rose =
            'backdrop-blur-sm bg-rose-500/25 text-rose-200 px-2 py-0.5 rounded-lg text-[9px] border border-rose-400/35 font-bold';
        return { label: 'عدم حضور المدين', className: rose };
    }, [
        notificationCount,
        subsequentNoticeUnlocked,
        activeDebtorNoticeScope.absenceBadgeDismissed,
        lawyerStartedPostNoticeExecution,
        debtorAttendedVoluntarily,
        voluntaryAttendanceCount,
        primaryDebtorTaklifActive,
        isEvictionExecutionModule,
        executionData?.notice_voluntary_period_end_declared,
        noticeVoluntaryPeriodEndOptimistic,
        executionData?.eviction_voluntary_period_end_declared,
        voluntaryEndOptimistic,
    ]);

    const showDebtorSummonsAttendanceBadge = useMemo(
        () =>
            Boolean(subsequentNoticeUnlocked) &&
            !primaryDebtorTaklifActive &&
            !debtorAttendedVoluntarily &&
            voluntaryAttendanceCount === 0 &&
            !lawyerStartedPostNoticeExecution &&
            Boolean(
                executionData?.debtor_summons_marker?.id ||
                    debtorSummonsMarkerLocal?.id ||
                    notificationCount >= 2
            ),
        [
            subsequentNoticeUnlocked,
            primaryDebtorTaklifActive,
            debtorAttendedVoluntarily,
            voluntaryAttendanceCount,
            lawyerStartedPostNoticeExecution,
            executionData?.debtor_summons_marker?.id,
            debtorSummonsMarkerLocal?.id,
            notificationCount,
        ]
    );

    const noticeKindGoalStrictBinding =
        !isEvictionExecutionModule &&
        (followupDebtorSummonsProfile === 'employee_monetary' ||
            followupDebtorSummonsProfile === 'earner_like');

    const employeeAssignmentTabEnabled = notificationCount >= 1 && !activeDebtorIsDeceased;

    const resolvedEmployeeSummonsAssignment = useMemo(() => {
        if (!executionData) return null;
        return getEmployeeAssignmentForDebtorKey(
            executionData,
            unifiedSummonsTargetDebtorKey,
            primaryDebtorKeyResolved
        );
    }, [
        unifiedSummonsTargetDebtorKey,
        executionData,
        executionData?.employee_summons_assignments_by_debtor,
        executionData?.employee_summons_assignment,
        primaryDebtorKeyResolved,
    ]);

    const showEmployeeAssignmentCoerciveBlock = useMemo(() => {
        const a = resolvedEmployeeSummonsAssignment;
        if (!a) return false;
        return (
            a.phase === 'absent_declared' ||
            a.phase === 'investigation_pending' ||
            a.phase === 'warrant_ui'
        );
    }, [resolvedEmployeeSummonsAssignment]);

    const employeeFinancialSalaryOnlyCoercive = isEmployeeMonetaryFinancialPath(debtorSummonsProfile as DebtorSummonsProfile);

    const monetaryCoerciveLimitedOnly =
        monetaryExecutionStrictPathFlag && !isAlimonyClaim && !employeeFinancialSalaryOnlyCoercive;

    const followupEmployeeFinancialSalaryOnlyCoercive =
        isEmployeeMonetaryFinancialPath(followupDebtorSummonsProfile as DebtorSummonsProfile);
    const followupMonetaryCoerciveLimitedOnly =
        monetaryExecutionStrictPathFlag &&
        !isAlimonyClaim &&
        !followupEmployeeFinancialSalaryOnlyCoercive;

    const followupGarnishmentAmountPreview = useMemo(() => {
        if (!debtorBrowserTabsMode || !activeWorkspaceDebtorForFollowup) {
            return executionData?.garnishmentAmount;
        }
        if (activeWorkspaceDebtorForFollowup.isPrimary) {
            return executionData?.garnishmentAmount;
        }
        const g =
            executionExtras.perDebtorGarnishments?.[activeWorkspaceDebtorForFollowup.key];
        return g != null && String(g) !== '' ? String(g) : undefined;
    }, [
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        executionData?.garnishmentAmount,
        executionExtras.perDebtorGarnishments,
    ]);

    return {
        earnerForcedActionUnlocked,
        followupEarnerForcedActionUnlocked,
        baseSubsequentNoticeUnlocked,
        evictionSubsequentNoticeUnlocked,
        subsequentNoticeUnlocked,
        anyExecutorDecisionResolvedForMemoBadge,
        primaryDebtorTaklifActive,
        primaryMemoNoticeBadge,
        primaryDebtorNoticeYmdResolved,
        showDebtorUnservedMemoBadge,
        shouldWarnOnMemoClick,
        primaryDebtorAbsenceBadge,
        showDebtorSummonsAttendanceBadge,
        noticeKindGoalStrictBinding,
        employeeAssignmentTabEnabled,
        resolvedEmployeeSummonsAssignment,
        showEmployeeAssignmentCoerciveBlock,
        employeeFinancialSalaryOnlyCoercive,
        monetaryCoerciveLimitedOnly,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupMonetaryCoerciveLimitedOnly,
        followupGarnishmentAmountPreview,
    };
}
