import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardFollowupCluster } from '../useExecutionDashboardFollowupCluster';

const useDebtorSummonsProfileMock = vi.fn();
const useSubsequentNoticeFlowMock = vi.fn();

vi.mock('../../useDebtorSummonsProfile', () => ({
    useDebtorSummonsProfile: (...args: unknown[]) => useDebtorSummonsProfileMock(...args),
}));

vi.mock('../../useSubsequentNoticeFlow', () => ({
    useSubsequentNoticeFlow: (...args: unknown[]) => useSubsequentNoticeFlowMock(...args),
}));

describe('useExecutionDashboardFollowupCluster', () => {
    it('merges debtor summons bundle with subsequent notice flow output', () => {
        useDebtorSummonsProfileMock.mockReturnValue({
            debtorOccupation: 'موظف',
            isDebtorGovernmentEmployee: true,
            isDebtorFreelancer: false,
            isDebtorRetired: false,
            debtorSummonsProfile: 'employee_monetary',
            followupDebtorSummonsProfile: 'earner_like',
            followupIsDebtorGovernmentEmployee: false,
            followupIsDebtorRetired: false,
            showSalaryCaptureForEmployee: true,
        });
        useSubsequentNoticeFlowMock.mockReturnValue({
            subsequentNoticeUnlocked: true,
            noticeKindGoalStrictBinding: false,
            employeeAssignmentTabEnabled: true,
        });

        const effectiveFollowupDebtorEntry = { d: { occupation: 'كاسب' }, isPrimary: false, key: 'd-2' };
        const activeWorkspaceDebtorForFollowup = { d: { occupation: 'موظف' }, isPrimary: true, key: 'd-1' };

        const { result } = renderHook(() =>
            useExecutionDashboardFollowupCluster({
                effectiveDebtors: [{ occupation: 'موظف' }] as never[],
                financialPrincipalAmount: 1000,
                financialLawyerFeesAmount: 0,
                claimType: 'مطالبة مالية',
                isNonFinancialClaim: false,
                debtorBrowserTabsMode: true,
                effectiveFollowupDebtorEntry: effectiveFollowupDebtorEntry as never,
                activeWorkspaceDebtorForFollowup: activeWorkspaceDebtorForFollowup as never,
                executionData: null,
                executionId: 'ex-1',
                decisionsReloadEpoch: 0,
                isEvictionExecutionModule: false,
                unifiedCollectionApproved: false,
                notificationCount: 1,
                forcedAttendanceIssued: false,
                summoningRound: 1,
                isEvictionGraceExpiredNow: false,
                isGracePeriodExpiredNow: false,
                debtorAttendedVoluntarily: false,
                voluntaryAttendanceCount: 0,
                debtorNotificationDate: null,
                manualGraceCalendarExtra: false,
                lawyerStartedPostNoticeExecution: false,
                noticeVoluntaryPeriodEndOptimistic: false,
                voluntaryEndOptimistic: false,
                isEvictionGraceEffectivelyExpired: false,
                activeCoerciveActions: [],
                forcedPathAttendanceSecured: false,
                debtorForcedToAttend: false,
                investigationMemoIssued: false,
                debtorArrested: false,
                activeDebtorNoticeScope: {},
                debtorSummonsMarkerLocal: null,
                monetaryExecutionStrictPathFlag: false,
                isAlimonyClaim: false,
                executionExtras: {},
                unifiedSummonsTargetDebtorKey: null,
                activeDebtorIsDeceased: false,
                primaryDebtorKeyResolved: null,
                debtorNotifiedForEvictionGrace: false,
            }),
        );

        expect(useDebtorSummonsProfileMock).toHaveBeenCalledWith(
            [{ occupation: 'موظف' }],
            1000,
            0,
            'مطالبة مالية',
            false,
            true,
            effectiveFollowupDebtorEntry,
        );
        expect(useSubsequentNoticeFlowMock).toHaveBeenCalled();
        expect(result.current.debtorOccupation).toBe('موظف');
        expect(result.current.subsequentNoticeUnlocked).toBe(true);
        expect(result.current.debtorSummonsProfileBundle.debtorSummonsProfile).toBe('employee_monetary');
        expect(result.current.subsequentNoticeFlow.noticeKindGoalStrictBinding).toBe(false);
    });
});
