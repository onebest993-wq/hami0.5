import type { Debtor, ExecutionFile } from '@/app/types/execution';
import { useDebtorSummonsProfile } from '../useDebtorSummonsProfile';
import { useSubsequentNoticeFlow } from '../useSubsequentNoticeFlow';

type ActiveWorkspaceDebtorForFollowup = { d: Debtor; isPrimary?: boolean; key?: string } | null;

export type ExecutionDashboardFollowupClusterInput = {
    effectiveDebtors: Debtor[];
    financialPrincipalAmount: number;
    financialLawyerFeesAmount: number;
    claimType: string | undefined;
    isNonFinancialClaim: boolean;
    debtorBrowserTabsMode: boolean;
    effectiveFollowupDebtorEntry: ActiveWorkspaceDebtorForFollowup;
    activeWorkspaceDebtorForFollowup: ActiveWorkspaceDebtorForFollowup;
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    isEvictionExecutionModule: boolean;
    unifiedCollectionApproved: boolean;
    notificationCount: number;
    forcedAttendanceIssued: boolean;
    summoningRound: number;
    isEvictionGraceExpiredNow: boolean;
    isGracePeriodExpiredNow: boolean;
    debtorAttendedVoluntarily: boolean;
    voluntaryAttendanceCount: number;
    debtorNotificationDate: string | null;
    manualGraceCalendarExtra: boolean;
    lawyerStartedPostNoticeExecution: boolean;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    isEvictionGraceEffectivelyExpired: boolean;
    activeCoerciveActions: string[];
    forcedPathAttendanceSecured: boolean;
    debtorForcedToAttend: boolean;
    investigationMemoIssued: boolean;
    debtorArrested: boolean;
    activeDebtorNoticeScope: { absenceBadgeDismissed?: boolean; [key: string]: unknown };
    debtorSummonsMarkerLocal: { id?: string } | null;
    monetaryExecutionStrictPathFlag: boolean;
    isAlimonyClaim: boolean;
    executionExtras: { perDebtorGarnishments?: Record<string, unknown>; [key: string]: unknown };
    unifiedSummonsTargetDebtorKey: string | null;
    activeDebtorIsDeceased: boolean;
    primaryDebtorKeyResolved: string | null;
    debtorNotifiedForEvictionGrace: boolean;
};

export function useExecutionDashboardFollowupCluster(
    input: ExecutionDashboardFollowupClusterInput,
) {
    const debtorSummonsProfileBundle = useDebtorSummonsProfile(
        input.effectiveDebtors,
        input.financialPrincipalAmount,
        input.financialLawyerFeesAmount,
        input.claimType,
        input.isNonFinancialClaim,
        input.debtorBrowserTabsMode,
        input.effectiveFollowupDebtorEntry ?? input.activeWorkspaceDebtorForFollowup,
    );

    const subsequentNoticeFlow = useSubsequentNoticeFlow(
        input.executionData,
        input.executionId,
        input.decisionsReloadEpoch,
        debtorSummonsProfileBundle.debtorSummonsProfile,
        debtorSummonsProfileBundle.followupDebtorSummonsProfile,
        input.isEvictionExecutionModule,
        debtorSummonsProfileBundle.isDebtorGovernmentEmployee,
        debtorSummonsProfileBundle.isDebtorRetired,
        debtorSummonsProfileBundle.followupIsDebtorGovernmentEmployee,
        debtorSummonsProfileBundle.followupIsDebtorRetired,
        input.unifiedCollectionApproved,
        input.notificationCount,
        input.forcedAttendanceIssued,
        input.summoningRound,
        input.isEvictionGraceExpiredNow,
        input.isGracePeriodExpiredNow,
        input.debtorAttendedVoluntarily,
        input.voluntaryAttendanceCount,
        input.debtorNotificationDate,
        input.manualGraceCalendarExtra,
        input.lawyerStartedPostNoticeExecution,
        input.noticeVoluntaryPeriodEndOptimistic,
        input.voluntaryEndOptimistic,
        input.isEvictionGraceEffectivelyExpired,
        input.effectiveDebtors,
        input.activeCoerciveActions,
        input.forcedPathAttendanceSecured,
        input.debtorForcedToAttend,
        input.investigationMemoIssued,
        input.debtorArrested,
        input.activeDebtorNoticeScope,
        input.debtorSummonsMarkerLocal,
        input.monetaryExecutionStrictPathFlag,
        input.isAlimonyClaim,
        input.debtorBrowserTabsMode,
        input.activeWorkspaceDebtorForFollowup,
        input.executionExtras,
        input.unifiedSummonsTargetDebtorKey,
        input.activeDebtorIsDeceased,
        input.primaryDebtorKeyResolved,
        input.debtorNotifiedForEvictionGrace,
    );

    return {
        debtorSummonsProfileBundle,
        ...debtorSummonsProfileBundle,
        subsequentNoticeFlow,
        ...subsequentNoticeFlow,
    };
}
