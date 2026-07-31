import { describe, expect, it } from 'vitest';
import { buildSubsequentNoticePolicy } from '../buildSubsequentNoticePolicy';

describe('buildSubsequentNoticePolicy', () => {
    it('unlocks employee assignment tab after first notice for living debtor', () => {
        const result = buildSubsequentNoticePolicy({
            debtorSummonsProfile: 'employee_monetary',
            followupDebtorSummonsProfile: 'employee_monetary',
            isEvictionExecutionModule: false,
            isDebtorGovernmentEmployee: true,
            isDebtorRetired: false,
            followupIsDebtorGovernmentEmployee: true,
            followupIsDebtorRetired: false,
            unifiedCollectionApproved: false,
            notificationCount: 1,
            forcedAttendanceIssued: false,
            summoningRound: 1,
            isEvictionGraceExpiredNow: false,
            isGracePeriodExpiredNow: false,
            debtorAttendedVoluntarily: false,
            voluntaryAttendanceCount: 0,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            investigationMemoIssued: false,
            debtorArrested: false,
            executionExecutorCoerciveUnlock: false,
            executionNoticeVoluntaryPeriodEndDeclared: false,
            executionEvictionVoluntaryPeriodEndDeclared: false,
            executionEvictionLastSummonsForCollection: false,
            executionEvictionLastCollectionSummonsBranch: '',
            noticeVoluntaryPeriodEndOptimistic: false,
            voluntaryEndOptimistic: false,
            isEvictionGraceEffectivelyExpired: false,
            debtorNotifiedForEvictionGrace: false,
            activeCoerciveActions: [],
            monetaryExecutionStrictPathFlag: true,
            isAlimonyClaim: false,
            activeDebtorIsDeceased: false,
            debtorBrowserTabsMode: false,
            activeWorkspaceDebtorForFollowup: null,
            executionGarnishmentAmount: '25000',
            perDebtorGarnishments: {},
        });

        expect(result.employeeAssignmentTabEnabled).toBe(true);
        expect(result.noticeKindGoalStrictBinding).toBe(true);
        expect(result.employeeFinancialSalaryOnlyCoercive).toBe(true);
    });

    it('unlocks eviction subsequent notice after effective grace expiry', () => {
        const result = buildSubsequentNoticePolicy({
            debtorSummonsProfile: 'earner_like',
            followupDebtorSummonsProfile: 'earner_like',
            isEvictionExecutionModule: true,
            isDebtorGovernmentEmployee: false,
            isDebtorRetired: false,
            followupIsDebtorGovernmentEmployee: false,
            followupIsDebtorRetired: false,
            unifiedCollectionApproved: false,
            notificationCount: 1,
            forcedAttendanceIssued: false,
            summoningRound: 1,
            isEvictionGraceExpiredNow: true,
            isGracePeriodExpiredNow: true,
            debtorAttendedVoluntarily: false,
            voluntaryAttendanceCount: 0,
            forcedPathAttendanceSecured: false,
            debtorForcedToAttend: false,
            investigationMemoIssued: false,
            debtorArrested: false,
            executionExecutorCoerciveUnlock: false,
            executionNoticeVoluntaryPeriodEndDeclared: false,
            executionEvictionVoluntaryPeriodEndDeclared: false,
            executionEvictionLastSummonsForCollection: false,
            executionEvictionLastCollectionSummonsBranch: '',
            noticeVoluntaryPeriodEndOptimistic: false,
            voluntaryEndOptimistic: false,
            isEvictionGraceEffectivelyExpired: true,
            debtorNotifiedForEvictionGrace: true,
            activeCoerciveActions: [],
            monetaryExecutionStrictPathFlag: false,
            isAlimonyClaim: false,
            activeDebtorIsDeceased: false,
            debtorBrowserTabsMode: false,
            activeWorkspaceDebtorForFollowup: null,
            executionGarnishmentAmount: undefined,
            perDebtorGarnishments: {},
        });

        expect(result.evictionSubsequentNoticeUnlocked).toBe(true);
        expect(result.subsequentNoticeUnlocked).toBe(true);
        expect(result.earnerForcedActionUnlocked).toBe(true);
    });
});
