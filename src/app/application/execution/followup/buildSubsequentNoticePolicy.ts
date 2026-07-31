import type { DebtorSummonsProfile } from '@/app/utils/debtorSummonsProfile';
import {
    isEarnerLikeSummonsBranch,
    isEmployeeMonetaryFinancialPath,
} from '@/app/utils/debtorSummonsProfile';

export type BuildSubsequentNoticePolicyInput = {
    debtorSummonsProfile: DebtorSummonsProfile | string | null;
    followupDebtorSummonsProfile: DebtorSummonsProfile | string | null;
    isEvictionExecutionModule: boolean;
    isDebtorGovernmentEmployee: boolean;
    isDebtorRetired: boolean;
    followupIsDebtorGovernmentEmployee: boolean;
    followupIsDebtorRetired: boolean;
    unifiedCollectionApproved: boolean;
    notificationCount: number;
    forcedAttendanceIssued: boolean;
    summoningRound: number;
    isEvictionGraceExpiredNow: boolean;
    isGracePeriodExpiredNow: boolean;
    debtorAttendedVoluntarily: boolean;
    voluntaryAttendanceCount: number;
    forcedPathAttendanceSecured: boolean;
    debtorForcedToAttend: boolean;
    investigationMemoIssued: boolean;
    debtorArrested: boolean;
    executionExecutorCoerciveUnlock?: boolean;
    executionNoticeVoluntaryPeriodEndDeclared?: boolean;
    executionEvictionVoluntaryPeriodEndDeclared?: boolean;
    executionEvictionLastSummonsForCollection?: boolean;
    executionEvictionLastCollectionSummonsBranch?: string;
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    isEvictionGraceEffectivelyExpired: boolean;
    debtorNotifiedForEvictionGrace: boolean;
    activeCoerciveActions: string[];
    monetaryExecutionStrictPathFlag: boolean;
    isAlimonyClaim: boolean;
    activeDebtorIsDeceased: boolean;
    debtorBrowserTabsMode: boolean;
    activeWorkspaceDebtorForFollowup: { isPrimary?: boolean; key?: string } | null;
    executionGarnishmentAmount?: string | number | null;
    perDebtorGarnishments?: Record<string, unknown>;
};

export function buildSubsequentNoticePolicy(input: BuildSubsequentNoticePolicyInput) {
    const earnerForcedActionUnlocked = (() => {
        if (!isEarnerLikeSummonsBranch(input.debtorSummonsProfile as DebtorSummonsProfile)) return false;
        if (input.isEvictionExecutionModule && input.isDebtorGovernmentEmployee) return false;
        if (input.forcedAttendanceIssued) return false;
        if (input.summoningRound >= 2) return true;
        if (
            input.isEvictionExecutionModule &&
            !input.isDebtorGovernmentEmployee &&
            !input.isDebtorRetired &&
            input.unifiedCollectionApproved &&
            input.executionEvictionLastSummonsForCollection === true &&
            input.executionEvictionLastCollectionSummonsBranch === 'coercive'
        ) {
            return true;
        }
        const graceDone = input.isEvictionExecutionModule
            ? input.isEvictionGraceExpiredNow
            : input.isGracePeriodExpiredNow;
        if (!graceDone || input.debtorAttendedVoluntarily) return false;
        return true;
    })();

    const followupEarnerForcedActionUnlocked = (() => {
        if (!isEarnerLikeSummonsBranch(input.followupDebtorSummonsProfile as DebtorSummonsProfile)) return false;
        if (input.isEvictionExecutionModule && input.followupIsDebtorGovernmentEmployee) return false;
        if (input.forcedAttendanceIssued) return false;
        if (input.summoningRound >= 2) return true;
        if (
            input.isEvictionExecutionModule &&
            !input.followupIsDebtorGovernmentEmployee &&
            !input.followupIsDebtorRetired &&
            input.unifiedCollectionApproved &&
            input.executionEvictionLastSummonsForCollection === true &&
            input.executionEvictionLastCollectionSummonsBranch === 'coercive'
        ) {
            return true;
        }
        const graceDone = input.isEvictionExecutionModule
            ? input.isEvictionGraceExpiredNow
            : input.isGracePeriodExpiredNow;
        if (!graceDone || input.debtorAttendedVoluntarily) return false;
        return true;
    })();

    const baseSubsequentNoticeUnlocked = (() => {
        const voluntaryEndGeneral =
            !input.isEvictionExecutionModule &&
            Boolean(
                input.executionNoticeVoluntaryPeriodEndDeclared ||
                    input.noticeVoluntaryPeriodEndOptimistic,
            );
        const memoFirstVoluntaryCycle = input.notificationCount === 1;
        if (input.debtorSummonsProfile === 'employee_monetary') {
            return (
                input.debtorAttendedVoluntarily ||
                voluntaryEndGeneral ||
                (!memoFirstVoluntaryCycle && input.activeCoerciveActions.includes('salary')) ||
                (!memoFirstVoluntaryCycle &&
                    input.isGracePeriodExpiredNow &&
                    input.activeCoerciveActions.length > 0)
            );
        }
        return (
            input.voluntaryAttendanceCount > 0 ||
            voluntaryEndGeneral ||
            input.forcedPathAttendanceSecured ||
            input.debtorForcedToAttend ||
            input.investigationMemoIssued ||
            input.debtorArrested ||
            (!memoFirstVoluntaryCycle &&
                input.isGracePeriodExpiredNow &&
                input.activeCoerciveActions.length > 0)
        );
    })();

    const evictionSubsequentNoticeUnlocked =
        input.isEvictionExecutionModule &&
        input.debtorNotifiedForEvictionGrace &&
        input.notificationCount >= 1 &&
        (input.notificationCount >= 2 || input.isEvictionGraceEffectivelyExpired);

    const subsequentNoticeUnlocked =
        baseSubsequentNoticeUnlocked ||
        evictionSubsequentNoticeUnlocked ||
        Boolean(input.executionExecutorCoerciveUnlock);

    const noticeKindGoalStrictBinding =
        !input.isEvictionExecutionModule &&
        (input.followupDebtorSummonsProfile === 'employee_monetary' ||
            input.followupDebtorSummonsProfile === 'earner_like');

    const employeeAssignmentTabEnabled = input.notificationCount >= 1 && !input.activeDebtorIsDeceased;

    const employeeFinancialSalaryOnlyCoercive =
        isEmployeeMonetaryFinancialPath(input.debtorSummonsProfile as DebtorSummonsProfile);
    const monetaryCoerciveLimitedOnly =
        input.monetaryExecutionStrictPathFlag &&
        !input.isAlimonyClaim &&
        !employeeFinancialSalaryOnlyCoercive;

    const followupEmployeeFinancialSalaryOnlyCoercive =
        isEmployeeMonetaryFinancialPath(input.followupDebtorSummonsProfile as DebtorSummonsProfile);
    const followupMonetaryCoerciveLimitedOnly =
        input.monetaryExecutionStrictPathFlag &&
        !input.isAlimonyClaim &&
        !followupEmployeeFinancialSalaryOnlyCoercive;

    const followupGarnishmentAmountPreview = (() => {
        if (!input.debtorBrowserTabsMode || !input.activeWorkspaceDebtorForFollowup) {
            return input.executionGarnishmentAmount;
        }
        if (input.activeWorkspaceDebtorForFollowup.isPrimary) {
            return input.executionGarnishmentAmount;
        }
        const preview = input.perDebtorGarnishments?.[input.activeWorkspaceDebtorForFollowup.key || ''];
        return preview != null && String(preview) !== '' ? String(preview) : undefined;
    })();

    return {
        earnerForcedActionUnlocked,
        followupEarnerForcedActionUnlocked,
        baseSubsequentNoticeUnlocked,
        evictionSubsequentNoticeUnlocked,
        subsequentNoticeUnlocked,
        noticeKindGoalStrictBinding,
        employeeAssignmentTabEnabled,
        employeeFinancialSalaryOnlyCoercive,
        monetaryCoerciveLimitedOnly,
        followupEmployeeFinancialSalaryOnlyCoercive,
        followupMonetaryCoerciveLimitedOnly,
        followupGarnishmentAmountPreview,
    };
}
