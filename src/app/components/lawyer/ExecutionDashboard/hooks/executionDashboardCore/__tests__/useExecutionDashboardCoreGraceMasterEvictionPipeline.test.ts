import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardCoreGraceMasterEvictionPipeline } from '../useExecutionDashboardCoreGraceMasterEvictionPipeline';

const getResidentialVacateDeadlineMaxIsoMock = vi.fn();
const isVacateDeadlinePassedMock = vi.fn();
const hasApprovedLawyerFeePayoutMock = vi.fn();
const hasApprovedUnifiedCollectionMock = vi.fn();
const applyEarnerFinancialPersonalCoerciveOverlayMock = vi.fn();
const useExecutionDashboardGraceAndSummoningMock = vi.fn();
const useEarnerFinancialPersonalCoerciveFlagsMock = vi.fn();
const useExecutionDashboardOtherPartyMirrorMock = vi.fn();
const useStatuteOfLimitationsMock = vi.fn();
const useMasterStateMock = vi.fn();
const useExecutionDashboardCoerciveUiStateMock = vi.fn();
const useDossierDeathStatusMock = vi.fn();
const useEvictionProcedureLockHintMock = vi.fn();
const useEvictionBadgesMock = vi.fn();
const useExecutionDashboardGraceLifecycleEffectsMock = vi.fn();

vi.mock('@/app/utils/executionModuleStrategies', () => ({
    getResidentialVacateDeadlineMaxIso: (...args: unknown[]) =>
        getResidentialVacateDeadlineMaxIsoMock(...args),
    isVacateDeadlinePassed: (...args: unknown[]) => isVacateDeadlinePassedMock(...args),
}));

vi.mock('@/app/utils/executorDecisionReadQueries', () => ({
    hasApprovedLawyerFeePayout: (...args: unknown[]) => hasApprovedLawyerFeePayoutMock(...args),
    hasApprovedUnifiedCollection: (...args: unknown[]) =>
        hasApprovedUnifiedCollectionMock(...args),
}));

vi.mock('@/app/utils/earnerPersonalCoerciveFinancialGate', () => ({
    applyEarnerFinancialPersonalCoerciveOverlay: (...args: unknown[]) =>
        applyEarnerFinancialPersonalCoerciveOverlayMock(...args),
}));

vi.mock('../useExecutionDashboardGraceAndSummoning', () => ({
    useExecutionDashboardGraceAndSummoning: (...args: unknown[]) =>
        useExecutionDashboardGraceAndSummoningMock(...args),
}));

vi.mock('../../executionDashboardEarnerFinancialCoerciveGate', () => ({
    useEarnerFinancialPersonalCoerciveFlags: (...args: unknown[]) =>
        useEarnerFinancialPersonalCoerciveFlagsMock(...args),
}));

vi.mock('../useExecutionDashboardOtherPartyMirror', () => ({
    useExecutionDashboardOtherPartyMirror: (...args: unknown[]) =>
        useExecutionDashboardOtherPartyMirrorMock(...args),
}));

vi.mock('../../useStatuteOfLimitations', () => ({
    useStatuteOfLimitations: (...args: unknown[]) => useStatuteOfLimitationsMock(...args),
}));

vi.mock('../../useMasterState', () => ({
    useMasterState: (...args: unknown[]) => useMasterStateMock(...args),
}));

vi.mock('../useExecutionDashboardCoerciveUiState', () => ({
    useExecutionDashboardCoerciveUiState: (...args: unknown[]) =>
        useExecutionDashboardCoerciveUiStateMock(...args),
}));

vi.mock('../../useDossierDeathStatus', () => ({
    useDossierDeathStatus: (...args: unknown[]) => useDossierDeathStatusMock(...args),
}));

vi.mock('../../useEvictionProcedureLockHint', () => ({
    useEvictionProcedureLockHint: (...args: unknown[]) =>
        useEvictionProcedureLockHintMock(...args),
}));

vi.mock('../../useEvictionBadges', () => ({
    useEvictionBadges: (...args: unknown[]) => useEvictionBadgesMock(...args),
}));

vi.mock('../useExecutionDashboardTimelineAndGraceSync', () => ({
    useExecutionDashboardGraceLifecycleEffects: (...args: unknown[]) =>
        useExecutionDashboardGraceLifecycleEffectsMock(...args),
}));

describe('useExecutionDashboardCoreGraceMasterEvictionPipeline', () => {
    it('wires grace, eviction, coercive, and lifecycle decisions through typed inputs', () => {
        useExecutionDashboardGraceAndSummoningMock.mockReturnValue({
            generalMemoGraceAnchor: '2026-07-01',
            daysSinceNoticeCalculated: 9,
            daysRemainingInGracePeriod: 0,
            isGracePeriodExpiredNow: true,
            evictionGraceAnchorDate: '2026-07-01',
            isEvictionGraceExpiredCalendar: true,
            isEvictionGraceEffectivelyExpired: true,
            daysRemainingInEvictionGrace: 0,
            isEvictionGraceExpiredNow: true,
            forcedSummoningAnalysis: { canForceSummon: true },
            shouldCalculateExecutionFee: true,
            calculatedExecutionFee: 30,
            totalWithExecutionFee: 1030,
            remaining: 850,
            isInBreach: true,
        });
        useEarnerFinancialPersonalCoerciveFlagsMock.mockReturnValue({
            earnerFinancialPersonalCoerciveActive: true,
            hideExecutiveDetentionJudgeCard: false,
        });
        applyEarnerFinancialPersonalCoerciveOverlayMock.mockImplementation(
            (specialization, gate) => ({ ...specialization, gateRemaining: gate.financialCenterTotalIqd }),
        );
        hasApprovedUnifiedCollectionMock.mockReturnValue(true);
        hasApprovedLawyerFeePayoutMock.mockReturnValue(true);
        const otherPartyCreditorMirrorProps = { mirror: true };
        useExecutionDashboardOtherPartyMirrorMock.mockReturnValue(otherPartyCreditorMirrorProps);
        useStatuteOfLimitationsMock.mockReturnValue({ expired: false });
        useMasterStateMock.mockReturnValue({
            masterState: 'active',
            executionStatusRaw: 'running',
            executionStatus: 'running',
            statusMetadata: { tone: 'amber' },
        });
        useExecutionDashboardCoerciveUiStateMock.mockReturnValue({
            coerciveUiLocked: true,
            dividedActiveDebtorCleared: false,
            executionCoerciveButtonDisabled: true,
            dossierStatusUi: 'active',
            coerciveDossierLocked: true,
            executionActionsGridLocked: true,
            executionToolsTimelineLockedUi: true,
            evictionProcedureLocked: true,
        });
        useDossierDeathStatusMock.mockReturnValue({
            isDebtorDeceasedForEvictionHeirs: false,
            creditorDeathMarked: false,
            debtorDeathMarked: false,
            creditorDeathMenuLabel: 'وفاة الدائن',
            debtorDeathMenuLabel: 'وفاة المدين',
            heirSubstitutionAllowed: true,
            ongoingAlimonyClaim: false,
            alimonyBeneficiaryProfile: null,
        });
        useEvictionProcedureLockHintMock.mockReturnValue('hint');
        useEvictionBadgesMock.mockReturnValue({
            evictionGraceBadgeInfo: { remainingDays: 0, endYmd: '2026-07-10' },
            policeAssistanceBadgeInfo: { state: 'ready' },
        });
        getResidentialVacateDeadlineMaxIsoMock.mockReturnValue('2026-07-10');
        isVacateDeadlinePassedMock.mockReturnValue(true);

        const showToast = vi.fn();
        const input = {
            executionData: {
                id: 'exec-1',
                debtorNotificationDate: '2026-07-01',
                stay_of_execution: { active: true },
            },
            executionId: 'exec-1',
            debtorNotificationDate: '2026-07-01',
            debtors: [{ id: 'debtor-1', name: 'مدين أول', notificationDate: '2026-07-01' }],
            effectiveDebtors: [{ id: 'debtor-1', name: 'مدين أول', notificationDate: '2026-07-01' }],
            isEvictionExecutionModule: true,
            notificationCount: 2,
            manualGraceCalendarExtra: true,
            voluntaryEndOptimistic: false,
            setVoluntaryEndOptimistic: vi.fn(),
            noticeVoluntaryPeriodEndOptimistic: false,
            setNoticeVoluntaryPeriodEndOptimistic: vi.fn(),
            debtorBrowserTabsMode: true,
            effectiveFollowupDebtorEntry: {
                d: { id: 'debtor-1', name: 'مدين أول' },
                isPrimary: true,
                key: 'debtor-1',
            },
            activeWorkspaceDebtorForFollowup: {
                d: { id: 'debtor-1', name: 'مدين أول' },
                isPrimary: true,
                key: 'debtor-1',
            },
            activeTimelineEventsDebtorScoped: [{ title: 'تبليغ' }],
            coercionOrchestrator: {
                debtorAttendedVoluntarily: false,
                voluntaryAttendanceCount: 0,
                summoningRound: 2,
            },
            claimType: 'تخلية',
            isAlimonyClaim: false,
            monetaryStrictForSummoningEngine: false,
            forcedAttendanceIssued: false,
            initiator: 'الدائن',
            paidDebt: 150,
            totalOwed: 1000,
            parsedCourtFees: 20,
            financialPrincipalAmount: 800,
            paidCourtFees: 0,
            paidDirectorateFees: 0,
            paidClientFees: 0,
            activeDebtorIsEmployee: false,
            followupSpecializationEffective: { hideFollowupCoerciveTab: false },
            followupModalSpecializationEffective: { hideFollowupCoerciveTab: false },
            followupModalDebtorIsEmployee: false,
            decisionsReloadEpoch: 3,
            isRepresentingDebtor: false,
            decisionsStorageExecutionId: 'exec-1',
            followupSpecialization: {
                hideFollowupCoerciveTab: false,
                hidePersonalForcedBringActivation: false,
                hidePersonalJudgePresentation: false,
            },
            showPersonalCoerciveFollowupTab: true,
            showGuarantorInSeizureFollowupTab: false,
            isPersonalStatusExecutionClaim: false,
            isAlimonyClaimType: false,
            custodyRemovalClaimActive: false,
            employeeCoerciveDetentionRestricted: false,
            remainingBalanceForSeizure: 850,
            viewExecutionData: { id: 'exec-1' },
            settlementGuarantorGate: {
                pendingSettlement: null,
                settlementBreachTriggeredAt: null,
            },
            activeDebtorIsDeceased: false,
            assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
            primaryDebtorKeyResolved: 'debtor-1',
            personalTabLockedForEmployee: false,
            lastActionDate: '2026-07-09',
            dossierLifecycleRow: { lastActionDate: '2026-07-09', dossierStatus: 'active' },
            executionPaused: false,
            isPaused: false,
            pauseReason: '',
            executionFeeAdded: false,
            activeDebtorSolidary: false,
            allDebtorsUnified: [{ cleared: false }],
            followupOrchestrator: {
                executionDebtorTabIndex: 0,
                evictionVacateDeadlineLocal: '2026-07-10',
                evictionExecutorVacateGrantApproved: true,
                evictionResidentialGracePeriodStart: '2026-07-01',
                evictionResidentialGraceManuallyEndedAt: null,
            },
            isHistoricalMode: false,
            debtorNotifiedForEvictionGrace: true,
            evictionPremisesUseResolved: 'residential',
            todayYmd: '2026-07-11',
            timelineEventsRef: { current: [] },
            gracePeriodEnded: false,
            setGracePeriodEnded: vi.fn(),
            setGracePeriodActive: vi.fn(),
            showToastRef: { current: showToast },
            showToast,
        };

        const { result } = renderHook(() =>
            useExecutionDashboardCoreGraceMasterEvictionPipeline(input as never),
        );

        expect(useExecutionDashboardGraceAndSummoningMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData: input.executionData,
                totalOwed: 1000,
                earnerGateIsEmployee: false,
            }),
        );
        expect(useExecutionDashboardOtherPartyMirrorMock).toHaveBeenCalledWith(
            expect.objectContaining({
                decisionsStorageExecutionId: 'exec-1',
                forcedSummoningCanForce: true,
                remaining: 850,
            }),
        );
        expect(useExecutionDashboardCoerciveUiStateMock).toHaveBeenCalledWith(
            expect.objectContaining({
                stayOfExecutionActive: true,
                activeDebtorCleared: false,
                isHistoricalMode: false,
            }),
        );
        expect(useExecutionDashboardGraceLifecycleEffectsMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionStatus: 'running',
                todayYmd: '2026-07-11',
                showToast,
            }),
        );
        expect(result.current.remaining).toBe(850);
        expect(result.current.unifiedCollectionApproved).toBe(true);
        expect(result.current.lawyerFeePayoutApproved).toBe(true);
        expect(result.current.notificationLayerOkEviction).toBe(true);
        expect(result.current.isResidentialVacateGraceFinished).toBe(true);
        expect(result.current.evictionVacateLayerOk).toBe(true);
        expect(result.current.evictionProcedureLockHint).toBe('hint');
        expect(result.current.otherPartyCreditorMirrorProps).toBe(otherPartyCreditorMirrorProps);
        expect(result.current.followupSpecializationWithEarnerGate).toEqual({
            hideFollowupCoerciveTab: false,
            gateRemaining: 850,
        });
    });
});
