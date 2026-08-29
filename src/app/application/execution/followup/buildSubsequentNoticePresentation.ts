import { calculateDaysRemaining, isGracePeriodExpired } from '@/app/utils/executionStateMachine';

export type MemoNoticeBadge = {
    anchor: string;
    remaining: number;
    graceExpired: boolean;
};

export type DebtorAbsenceBadge = {
    label: string;
    className: string;
} | null;

export type FollowupDebtorNoticeLite = {
    notificationDate?: string | null;
};

export function buildSubsequentNoticePresentation(input: {
    notificationCount: number;
    subsequentNoticeUnlocked: boolean;
    isEvictionExecutionModule: boolean;
    executionDebtorNotificationDate?: string | null;
    executionMemoAnchorDate?: string | null;
    executionEvictionFirstNoticeDate?: string | null;
    executionNoticeVoluntaryPeriodEndDeclared?: boolean;
    executionEvictionVoluntaryPeriodEndDeclared?: boolean;
    debtorNotificationDate: string | null;
    manualGraceCalendarExtra: boolean;
    debtorAttendedVoluntarily: boolean;
    voluntaryAttendanceCount: number;
    lawyerStartedPostNoticeExecution: boolean;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    anyExecutorDecisionResolvedForMemoBadge: boolean;
    primaryDebtorTaklifActive: boolean;
    activeDebtorNoticeScope: { absenceBadgeDismissed?: boolean; [key: string]: unknown };
    executionDebtorSummonsMarkerId?: string | null;
    debtorSummonsMarkerLocalId?: string | null;
    effectiveDebtors: FollowupDebtorNoticeLite[];
    isEvictionGraceExpiredNow: boolean;
    isGracePeriodExpiredNow: boolean;
    now?: Date;
}): {
    primaryMemoNoticeBadge: MemoNoticeBadge | null;
    primaryDebtorNoticeYmdResolved: string | null;
    showDebtorUnservedMemoBadge: boolean;
    shouldWarnOnMemoClick: boolean;
    primaryDebtorAbsenceBadge: DebtorAbsenceBadge;
    showDebtorSummonsAttendanceBadge: boolean;
} {
    const now = input.now ?? new Date();

    const primaryMemoNoticeBadge = (() => {
        if (input.notificationCount !== 1 || input.subsequentNoticeUnlocked) return null;
        if (input.debtorAttendedVoluntarily || input.voluntaryAttendanceCount > 0) return null;
        if (input.lawyerStartedPostNoticeExecution) return null;
        if (
            !input.isEvictionExecutionModule &&
            (input.executionNoticeVoluntaryPeriodEndDeclared || input.noticeVoluntaryPeriodEndOptimistic)
        ) {
            return null;
        }
        if (
            input.isEvictionExecutionModule &&
            (input.executionEvictionVoluntaryPeriodEndDeclared || input.voluntaryEndOptimistic)
        ) {
            return null;
        }
        if (input.anyExecutorDecisionResolvedForMemoBadge) return null;
        if (input.primaryDebtorTaklifActive) return null;

        const extra = input.isEvictionExecutionModule ? 0 : input.manualGraceCalendarExtra ? 1 : 0;
        const anchor = input.isEvictionExecutionModule
            ? input.executionEvictionFirstNoticeDate ||
              input.executionDebtorNotificationDate ||
              input.debtorNotificationDate ||
              null
            : input.executionMemoAnchorDate ||
              input.executionDebtorNotificationDate ||
              input.debtorNotificationDate ||
              null;
        if (!anchor) return null;

        return {
            anchor,
            remaining: calculateDaysRemaining(anchor, now, extra),
            graceExpired: isGracePeriodExpired(anchor, now, extra),
        };
    })();

    const primaryDebtorNoticeYmdResolved =
        input.debtorNotificationDate ||
        input.executionDebtorNotificationDate ||
        input.effectiveDebtors[0]?.notificationDate ||
        null;

    const showDebtorUnservedMemoBadge =
        input.notificationCount === 0 &&
        !primaryDebtorNoticeYmdResolved &&
        !input.debtorAttendedVoluntarily &&
        input.voluntaryAttendanceCount === 0 &&
        !(input.executionNoticeVoluntaryPeriodEndDeclared || input.noticeVoluntaryPeriodEndOptimistic) &&
        !(input.executionEvictionVoluntaryPeriodEndDeclared || input.voluntaryEndOptimistic);

    const shouldWarnOnMemoClick = (() => {
        if (input.debtorAttendedVoluntarily || input.voluntaryAttendanceCount > 0) return false;
        if (input.lawyerStartedPostNoticeExecution) return false;
        const graceExpired = input.isEvictionExecutionModule
            ? input.isEvictionGraceExpiredNow
            : input.isGracePeriodExpiredNow;
        if (graceExpired) return false;
        const periodEnded = input.isEvictionExecutionModule
            ? (input.executionEvictionVoluntaryPeriodEndDeclared || input.voluntaryEndOptimistic)
            : (input.executionNoticeVoluntaryPeriodEndDeclared || input.noticeVoluntaryPeriodEndOptimistic);
        if (periodEnded) return false;
        return true;
    })();

    const primaryDebtorAbsenceBadge = (() => {
        if (input.activeDebtorNoticeScope.absenceBadgeDismissed) return null;
        if (input.lawyerStartedPostNoticeExecution) return null;
        if (input.primaryDebtorTaklifActive) return null;
        if (input.debtorAttendedVoluntarily || input.voluntaryAttendanceCount > 0) return null;

        const voluntaryEndNonEviction =
            !input.isEvictionExecutionModule &&
            input.notificationCount === 1 &&
            (input.executionNoticeVoluntaryPeriodEndDeclared || input.noticeVoluntaryPeriodEndOptimistic);

        const voluntaryEndEviction =
            input.isEvictionExecutionModule &&
            input.notificationCount === 1 &&
            (input.executionEvictionVoluntaryPeriodEndDeclared || input.voluntaryEndOptimistic);

        if (!voluntaryEndNonEviction && !voluntaryEndEviction) return null;
        if (!input.subsequentNoticeUnlocked) return null;

        return {
            label: 'عدم حضور المدين',
            className:
                'backdrop-blur-sm bg-rose-500/25 text-rose-200 px-2 py-0.5 rounded-lg text-[9px] border border-rose-400/35 font-bold',
        };
    })();

    const showDebtorSummonsAttendanceBadge =
        Boolean(input.subsequentNoticeUnlocked) &&
        !input.primaryDebtorTaklifActive &&
        !input.debtorAttendedVoluntarily &&
        input.voluntaryAttendanceCount === 0 &&
        !input.lawyerStartedPostNoticeExecution &&
        Boolean(
            input.executionDebtorSummonsMarkerId ||
                input.debtorSummonsMarkerLocalId ||
                input.notificationCount >= 2,
        );

    return {
        primaryMemoNoticeBadge,
        primaryDebtorNoticeYmdResolved,
        showDebtorUnservedMemoBadge,
        shouldWarnOnMemoClick,
        primaryDebtorAbsenceBadge,
        showDebtorSummonsAttendanceBadge,
    };
}
