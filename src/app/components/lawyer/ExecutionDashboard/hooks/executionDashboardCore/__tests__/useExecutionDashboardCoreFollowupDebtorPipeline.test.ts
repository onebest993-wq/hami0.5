import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardCoreFollowupDebtorPipeline } from '../useExecutionDashboardCoreFollowupDebtorPipeline';

const useExecutionDashboardDebtorWorkspaceContextMock = vi.fn();
const useActiveDebtorProfileMock = vi.fn();
const useExecutionDashboardEmployeeAssignmentCoerciveStateMock = vi.fn();
const useSeizureLogEntityDataMock = vi.fn();
const useUnifiedSeizureLogMock = vi.fn();
const useExecutionDashboardFollowupTabAssemblyMock = vi.fn();
const useDebtorScopedTimelineMock = vi.fn();
const resolveDebtorEntityKindMock = vi.fn();
const isLegalEntityDebtorKindMock = vi.fn();
const isLawyerRepresentingDebtorMock = vi.fn();
const resolveFollowupFlagsForDebtorContextMock = vi.fn();
const applyDebtorDeathFollowupOverlayMock = vi.fn();
const executionTimelineVisibilityFromFollowupMock = vi.fn();
const resolveExecutionTimelineFilterOptionsMock = vi.fn();
const useExecutionDashboardActiveTimelineFilterNormalizeMock = vi.fn();
const useExecutionDashboardDebtorBrowserTabsClampMock = vi.fn();
const useExecutionDashboardPartiesExtraPanelsResetMock = vi.fn();
const useExecutionDashboardUnifiedModalPersonalTabRedirectMock = vi.fn();
const useExecutionResidentialGraceClearedListenerMock = vi.fn();

vi.mock('../useExecutionDashboardDebtorWorkspaceContext', () => ({
    useExecutionDashboardDebtorWorkspaceContext: (...args: unknown[]) =>
        useExecutionDashboardDebtorWorkspaceContextMock(...args),
}));

vi.mock('../../useActiveDebtorProfile', () => ({
    useActiveDebtorProfile: (...args: unknown[]) => useActiveDebtorProfileMock(...args),
}));

vi.mock('../useExecutionDashboardEmployeeAssignmentCoerciveState', () => ({
    useExecutionDashboardEmployeeAssignmentCoerciveState: (...args: unknown[]) =>
        useExecutionDashboardEmployeeAssignmentCoerciveStateMock(...args),
}));

vi.mock('../../useSeizureLogEntityData', () => ({
    useSeizureLogEntityData: (...args: unknown[]) => useSeizureLogEntityDataMock(...args),
}));

vi.mock('../../useUnifiedSeizureLog', () => ({
    useUnifiedSeizureLog: (...args: unknown[]) => useUnifiedSeizureLogMock(...args),
}));

vi.mock('../useExecutionDashboardFollowupTabAssembly', () => ({
    useExecutionDashboardFollowupTabAssembly: (...args: unknown[]) =>
        useExecutionDashboardFollowupTabAssemblyMock(...args),
}));

vi.mock('../../useDebtorScopedTimeline', () => ({
    useDebtorScopedTimeline: (...args: unknown[]) => useDebtorScopedTimelineMock(...args),
}));

vi.mock('@/app/utils/debtorEntityKindUtils', () => ({
    resolveDebtorEntityKind: (...args: unknown[]) => resolveDebtorEntityKindMock(...args),
    isLegalEntityDebtorKind: (...args: unknown[]) => isLegalEntityDebtorKindMock(...args),
}));

vi.mock('@/app/utils/debtorAgentRepresentationUtils', () => ({
    isLawyerRepresentingDebtor: (...args: unknown[]) => isLawyerRepresentingDebtorMock(...args),
}));

vi.mock('@/app/utils/executionDomainIsolation', () => ({
    resolveFollowupFlagsForDebtorContext: (...args: unknown[]) =>
        resolveFollowupFlagsForDebtorContextMock(...args),
}));

vi.mock('@/app/utils/partyDeathFollowupOverlay', () => ({
    applyDebtorDeathFollowupOverlay: (...args: unknown[]) =>
        applyDebtorDeathFollowupOverlayMock(...args),
}));

vi.mock('@/app/utils/timelineCategoryFilter', () => ({
    executionTimelineVisibilityFromFollowup: (...args: unknown[]) =>
        executionTimelineVisibilityFromFollowupMock(...args),
    resolveExecutionTimelineFilterOptions: (...args: unknown[]) =>
        resolveExecutionTimelineFilterOptionsMock(...args),
}));

vi.mock('../useExecutionDashboardRuntimeSyncEffects', () => ({
    useExecutionDashboardActiveTimelineFilterNormalize: (...args: unknown[]) =>
        useExecutionDashboardActiveTimelineFilterNormalizeMock(...args),
    useExecutionDashboardDebtorBrowserTabsClamp: (...args: unknown[]) =>
        useExecutionDashboardDebtorBrowserTabsClampMock(...args),
    useExecutionDashboardPartiesExtraPanelsReset: (...args: unknown[]) =>
        useExecutionDashboardPartiesExtraPanelsResetMock(...args),
    useExecutionDashboardUnifiedModalPersonalTabRedirect: (...args: unknown[]) =>
        useExecutionDashboardUnifiedModalPersonalTabRedirectMock(...args),
    useExecutionResidentialGraceClearedListener: (...args: unknown[]) =>
        useExecutionResidentialGraceClearedListenerMock(...args),
}));

vi.mock('@/app/utils/timelineDebtorScope', () => ({
    timelineEventBelongsToDebtorWorkspace: vi.fn(),
}));

describe('useExecutionDashboardCoreFollowupDebtorPipeline', () => {
    it('wires debtor workspace, followup assembly, seizure log, and runtime bridges through explicit contracts', () => {
        const activeWorkspaceDebtorForFollowup = {
            key: 'debtor-1',
            isPrimary: true,
            d: { id: 'debtor-1', name: 'مدين أول' },
        };
        const debtorWorkspaceContext = {
            effectiveCreditors: [],
            effectiveDebtors: [{ id: 'debtor-1', name: 'مدين أول' }],
            allDebtorsUnified: [{ id: 'debtor-1', name: 'مدين أول' }],
            resolveDebtorSolidaryFlag: vi.fn(),
            allDebtorsSolidary: false,
            isSolidaryLiability: false,
            debtorWorkspaceEntries: [activeWorkspaceDebtorForFollowup],
            creditorWorkspaceEntries: [],
            creditorNamesTextList: 'دائن',
            perDebtorSolidarySplitMode: false,
            debtorLiabilityGroups: [],
            liabilityGroupTabsMode: false,
            multiDebtorMode: false,
            debtorBrowserTabsMode: true,
            activeLiabilityGroup: null,
            activeGroupEntries: [],
            activeLiabilityGroupId: null,
            allDebtorRowsForLiability: [],
            activeDebtorSolidary: false,
            activeWorkspaceDebtorForFollowup,
            primaryDebtorWorkspaceKey: 'debtor-1',
            primaryDebtorKeyResolved: 'debtor-1',
            showFollowupSolidaryDebtorTabs: false,
            effectiveFollowupDebtorEntry: activeWorkspaceDebtorForFollowup,
            followupAssignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
            mergedTimelineEventsDebtorScoped: [{ id: 'm-1' }],
            mergedTimelineRadarPreviewLimit: 3,
            assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
            unifiedSummonsTargetDebtorKey: 'debtor-1',
            activeDebtorNoticeScope: { stage: 'initial_notice' },
            scopedNotificationCount: 2,
            scopedSummonsMarker: { id: 'marker-1' },
            followupActiveDebtorNoticeScope: { stage: 'initial_notice' },
            modalActiveDebtorNoticeScope: { stage: 'initial_notice' },
        };
        useExecutionDashboardDebtorWorkspaceContextMock.mockReturnValue(debtorWorkspaceContext);
        useActiveDebtorProfileMock
            .mockReturnValueOnce({ activeDebtorIsEmployee: false, activeDebtorIsDeceased: false })
            .mockReturnValueOnce({ activeDebtorIsEmployee: true, activeDebtorIsDeceased: false });
        useExecutionDashboardEmployeeAssignmentCoerciveStateMock.mockReturnValue({
            modalResolvedEmployeeSummonsAssignment: 'government_employee',
            modalShowEmployeeAssignmentCoerciveBlock: true,
            employeeAssignmentPhaseForCoercive: 'absent_declared',
            employeeUnlocksPersonalCoerciveFromAssignment: true,
        });
        resolveDebtorEntityKindMock.mockReturnValue('person');
        isLegalEntityDebtorKindMock.mockReturnValue(false);
        isLawyerRepresentingDebtorMock.mockReturnValue(false);
        const followupModalSpecialization = {
            hideFollowupSeizureRequestsTab: false,
            hideFollowupCoerciveTab: false,
        };
        resolveFollowupFlagsForDebtorContextMock.mockReturnValue(followupModalSpecialization);
        applyDebtorDeathFollowupOverlayMock.mockImplementation((value) => value);
        useSeizureLogEntityDataMock.mockReturnValue({
            seizedPropertiesForSeizureLog: [{ id: 'property-1' }],
            seizedMovablesForSeizureLog: [{ id: 'movable-1' }],
            seizureLogExecutorDecisions: [{ id: 'decision-1' }],
        });
        const openUnifiedSeizureLog = vi.fn();
        useUnifiedSeizureLogMock.mockReturnValue({
            showUnifiedSeizureLogModal: false,
            closeUnifiedSeizureLog: vi.fn(),
            unifiedSeizureLogTab: 'property',
            setUnifiedSeizureLogTab: vi.fn(),
            unifiedSeizureLogEntries: [{ id: 'entry-1' }],
            unifiedSeizureTabCounts: { property: 1 },
            hasUnifiedSeizureLogContent: true,
            openUnifiedSeizureLog,
            thirdPartyFundsDraftById: {},
            setThirdPartyFundsDraftById: vi.fn(),
            clearThirdPartyFundsDraft: vi.fn(),
        });
        const followupTabAssembly = {
            executionDomainContext: { flags: { hideFollowupCoerciveTab: false } },
            followupSpecialization: { hideFollowupCoerciveTab: false },
            followupSpecializationEffective: { hideFollowupCoerciveTab: false },
            showPersonalCoerciveFollowupTab: true,
            showSalarySeizureInFollowupModal: true,
            followupSalarySeizureLabel: 'طلب حجز راتب (١/٥)',
            showEmployeeCompulsoryProceduresBanner: true,
            activeFollowupDebtorKey: 'debtor-1',
            personalTabUnlockByDebtor: {},
            setPersonalTabUnlockByDebtor: vi.fn(),
            employeePersonalTabUnlockStorageKey: 'unlock-1',
            custodyRemovalClaimActive: false,
            employeeCoerciveDetentionRestricted: false,
            modalEmployeeCoerciveDetentionRestricted: false,
            modalShowPersonalCoerciveFollowupTab: true,
            personalTabLockedForEmployee: false,
            modalPersonalTabLockedForEmployee: false,
            followupTabsRestricted: false,
            followupSectionTabOrder: ['personal', 'coercive'],
            followupModalTabs: [{ id: 'personal', label: 'التنفيذ الجبري الشخصي' }],
            isFollowupTabActive: vi.fn(),
            openFollowupModalPersisted: vi.fn(),
            closeFollowupModalPersisted: vi.fn(),
            persistFollowupModalViewport: vi.fn(),
            goFollowupSectionTabByDelta: vi.fn(),
        };
        useExecutionDashboardFollowupTabAssemblyMock.mockReturnValue(followupTabAssembly);
        useDebtorScopedTimelineMock.mockReturnValue({
            activeTimelineEventsDebtorScoped: [{ id: 't-1', isPinned: true }],
            timelineRadarPreviewLimit: 5,
        });
        executionTimelineVisibilityFromFollowupMock.mockReturnValue({ coercive: true });
        resolveExecutionTimelineFilterOptionsMock.mockReturnValue(['الكل', 'إجراءات']);

        const setShowDecisionsModal = vi.fn();
        const setShowExtraCreditors = vi.fn();
        const setShowExtraDebtors = vi.fn();
        const setActiveTimelineFilter = vi.fn();
        const setNotificationCount = vi.fn();
        const setDebtorSummonsMarkerLocal = vi.fn();
        const setCaseTasksPending = vi.fn();
        const setTimelineEvents = vi.fn();
        const input = {
            executionData: {
                id: 'exec-1',
                debtors: [{ id: 'debtor-1', name: 'مدين أول' }],
                party_multiplicity: { additionalDebtors: [], additionalCreditors: [], isSolidaryLiability: false },
            },
            viewExecutionData: { id: 'exec-1' },
            executionId: 'exec-1',
            decisionsStorageExecutionId: 'exec-1',
            decisionsReloadEpoch: 2,
            claimType: 'مطالبة مالية',
            creditors: [],
            debtors: [{ id: 'debtor-1', name: 'مدين أول' }],
            mergedTimelineEvents: [{ id: 'm-1' }],
            activeTimelineEvents: [{ id: 't-1', isPinned: true }],
            activeCoerciveActions: ['salary'],
            realEstateSeizureRegistryAssets: [{ id: 'property-1' }],
            salarySeizureRegistryAssets: [{ id: 'salary-1' }],
            movableSeizureRegistryAssets: [{ id: 'movable-1' }],
            thirdPartySeizureRegistryAssets: [{ id: 'third-1' }],
            thirdPartySeizuresUi: [],
            showToast: vi.fn(),
            showUnifiedExecutionModal: true,
            dossierFileKey: 'dossier-1',
            executionFileKey: 'file-key',
            setShowDecisionsModal,
            showDecisionsModal: false,
            setActiveTimelineFilter,
            setShowExtraCreditors,
            setShowExtraDebtors,
            caseTasksPendingRef: { current: [] },
            setCaseTasksPending,
            setTimelineEvents,
            persistExecutionMergeRef: { current: undefined },
            setNotificationCount,
            setDebtorSummonsMarkerLocal,
            pushTimelineEventRef: { current: null },
            nextTimelineId: () => 'next-1',
            followupOrchestrator: {
                executionDebtorTabIndex: 0,
                setExecutionDebtorTabIndex: vi.fn(),
                followupSolidaryDebtorIndex: 0,
                setFollowupSolidaryDebtorIndex: vi.fn(),
                summonsContextDebtorKey: 'debtor-1',
                openExecutionSeizuresTab: vi.fn(),
                showHeirsNotificationModal: false,
                setShowHeirsNotificationModal: vi.fn(),
                employeeCompulsoryBannerDismissed: false,
                setEmployeeCompulsoryBannerDismissed: vi.fn(),
                unifiedModalTab: 'personal',
                setUnifiedModalTab: vi.fn(),
                setShowUnifiedExecutionModal: vi.fn(),
                followupModalBodyScrollRef: { current: null },
                followupModalSectionTabsRef: { current: null },
                followupModalOpenGenerationRef: { current: 0 },
                seizureMatrixRef: { current: null },
                openSeizureRequestsTabRef: { current: null },
                setEvictionVacateDeadlineLocal: vi.fn(),
                setEvictionVacateDraft: vi.fn(),
                setEvictionResidentialGracePeriodStart: vi.fn(),
                setEvictionResidentialGraceManuallyEndedAt: vi.fn(),
                setEvictionExecutorVacateGrantApproved: vi.fn(),
                setGraceModalAllowResave: vi.fn(),
            },
        };

        const { result } = renderHook(() =>
            useExecutionDashboardCoreFollowupDebtorPipeline(input as never),
        );

        expect(useExecutionDashboardDebtorWorkspaceContextMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionData: input.executionData,
                mergedTimelineEvents: [{ id: 'm-1' }],
                setDebtorSummonsMarkerLocal,
            }),
        );
        expect(useExecutionDashboardFollowupTabAssemblyMock).toHaveBeenCalledWith(
            expect.objectContaining({
                claimType: 'مطالبة مالية',
                followupModalSpecializationEffective: followupModalSpecialization,
                dossierFileKey: 'dossier-1',
            }),
        );
        expect(useUnifiedSeizureLogMock).toHaveBeenCalledWith(
            expect.objectContaining({
                decisionsStorageExecutionId: 'exec-1',
                realEstateSeizureRegistryAssets: [{ id: 'property-1' }],
                thirdPartySeizuresUi: [],
            }),
        );
        expect(useExecutionDashboardActiveTimelineFilterNormalizeMock).toHaveBeenCalledWith(
            ['الكل', 'إجراءات'],
            setActiveTimelineFilter,
        );
        expect(useExecutionResidentialGraceClearedListenerMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionDataId: 'exec-1',
                setCaseTasksPending,
                setTimelineEvents,
            }),
        );
        expect(result.current.timelineFilterOptions).toEqual(['الكل', 'إجراءات']);
        expect(result.current.followupSectionTabOrder).toEqual(['personal', 'coercive']);
        expect(result.current.activeDebtorEntityKind).toBe('person');
        expect(result.current.timelineRadarPreviewLimit).toBe(5);
        expect(result.current.openUnifiedSeizureLog).toBe(openUnifiedSeizureLog);
    });
});
