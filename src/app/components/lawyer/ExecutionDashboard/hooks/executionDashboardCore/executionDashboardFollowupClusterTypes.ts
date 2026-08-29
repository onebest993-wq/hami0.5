import type { Debtor, ExecutionFile } from '@/app/types/execution';

type ActiveWorkspaceDebtorForFollowup = { d: Debtor; isPrimary?: boolean; key?: string } | null;

/**
 * أنواع مدخلات مسار المتابعة/الإشعار — كانت مرفقة بهوك ميت؛ تُستورد من مسارات الحفظ/المطالبة.
 */
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
