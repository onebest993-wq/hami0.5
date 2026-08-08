import { describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useExecutionDashboardCorePipelinesChain } from '../useExecutionDashboardCorePipelinesChain';

const useExecutionDashboardCoreWorkspacePipelineMock = vi.fn();
const useExecutionDashboardCoreFileMetadataBindingMock = vi.fn();
const useExecutionDashboardCoreFollowupDebtorPipelineMock = vi.fn();
const useExecutionDashboardCoreClaimFinancialLedgerPipelineMock = vi.fn();
const useExecutionDashboardCoreGraceMasterEvictionPipelineMock = vi.fn();
const useExecutionDashboardCorePersistHandlerPipelineMock = vi.fn();

vi.mock('../useExecutionDashboardCoreWorkspacePipeline', () => ({
    useExecutionDashboardCoreWorkspacePipeline: (...args: unknown[]) =>
        useExecutionDashboardCoreWorkspacePipelineMock(...args),
}));

vi.mock('../useExecutionDashboardCoreFileMetadataBinding', () => ({
    useExecutionDashboardCoreFileMetadataBinding: (...args: unknown[]) =>
        useExecutionDashboardCoreFileMetadataBindingMock(...args),
}));

vi.mock('../useExecutionDashboardCoreFollowupDebtorPipeline', () => ({
    useExecutionDashboardCoreFollowupDebtorPipeline: (...args: unknown[]) =>
        useExecutionDashboardCoreFollowupDebtorPipelineMock(...args),
}));

vi.mock('../useExecutionDashboardCoreClaimFinancialLedgerPipeline', () => ({
    useExecutionDashboardCoreClaimFinancialLedgerPipeline: (...args: unknown[]) =>
        useExecutionDashboardCoreClaimFinancialLedgerPipelineMock(...args),
}));

vi.mock('../useExecutionDashboardCoreGraceMasterEvictionPipeline', () => ({
    useExecutionDashboardCoreGraceMasterEvictionPipeline: (...args: unknown[]) =>
        useExecutionDashboardCoreGraceMasterEvictionPipelineMock(...args),
}));

vi.mock('../useExecutionDashboardCorePersistHandlerPipeline', () => ({
    useExecutionDashboardCorePersistHandlerPipeline: (...args: unknown[]) =>
        useExecutionDashboardCorePersistHandlerPipelineMock(...args),
}));

describe('useExecutionDashboardCorePipelinesChain', () => {
    it('composes the chain through builder inputs without re-owning downstream wiring', () => {
        const showToast = vi.fn();

        useExecutionDashboardCoreWorkspacePipelineMock.mockReturnValue({
            todayYmd: '2026-07-11',
            showUnifiedExecutionModal: false,
            followupOrchestrator: {
                executionDebtorTabIndex: 0,
                setExecutionDebtorTabIndex: vi.fn(),
                followupSolidaryDebtorIndex: 0,
                setFollowupSolidaryDebtorIndex: vi.fn(),
                summonsContextDebtorKey: null,
                openExecutionSeizuresTab: vi.fn(),
                showHeirsNotificationModal: false,
                setShowHeirsNotificationModal: vi.fn(),
                employeeCompulsoryBannerDismissed: false,
                setEmployeeCompulsoryBannerDismissed: vi.fn(),
                unifiedModalTab: 'correspondences',
                setUnifiedModalTab: vi.fn(),
                setShowUnifiedExecutionModal: vi.fn(),
                followupModalBodyScrollRef: { current: null },
                followupModalSectionTabsRef: { current: null },
                followupModalOpenGenerationRef: { current: null },
                seizureMatrixRef: { current: null },
                openSeizureRequestsTabRef: { current: null },
                setEvictionVacateDeadlineLocal: vi.fn(),
                setEvictionVacateDraft: vi.fn(),
                setEvictionResidentialGracePeriodStart: vi.fn(),
                setEvictionResidentialGraceManuallyEndedAt: vi.fn(),
                setEvictionExecutorVacateGrantApproved: vi.fn(),
                setGraceModalAllowResave: vi.fn(),
                setEvictionAssetsTabUnlocked: vi.fn(),
                setShowSolidaryCoerciveTargetModal: vi.fn(),
                setSolidaryCoerciveActionPending: vi.fn(),
                followupModalChipTablistRef: { current: null },
                followupModalDebtorTabsRef: { current: null },
                evictionVacateDeadlineLocal: '',
                evictionExecutorVacateGrantApproved: false,
                evictionResidentialGracePeriodStart: null,
                evictionResidentialGraceManuallyEndedAt: null,
            },
            timelineAccordionExpanded: false,
            setTimelineAccordionExpanded: vi.fn(),
            activeTimelineFilter: 'الكل',
            setActiveTimelineFilter: vi.fn(),
            gracePeriodActive: true,
            setGracePeriodActive: vi.fn(),
            gracePeriodEnded: false,
            setGracePeriodEnded: vi.fn(),
            notificationCount: 1,
            setNotificationCount: vi.fn(),
            voluntaryEndOptimistic: false,
            setVoluntaryEndOptimistic: vi.fn(),
            noticeVoluntaryPeriodEndOptimistic: false,
            setNoticeVoluntaryPeriodEndOptimistic: vi.fn(),
            forcedAttendanceIssued: false,
            setForcedAttendanceIssued: vi.fn(),
            debtorEvaded: false,
            setDebtorEvaded: vi.fn(),
            arrestWarrantUnlocked: false,
            setArrestWarrantUnlocked: vi.fn(),
            creditorAttended: true,
            executionPaused: false,
            setExecutionPaused: vi.fn(),
            showUnifiedSummonsModal: false,
            setShowUnifiedSummonsModal: vi.fn(),
            coercionOrchestrator: {
                debtorAttendedVoluntarily: false,
                voluntaryAttendanceCount: 0,
                debtorArrested: false,
                investigationPathDebtorPresent: false,
                activeNoticeState: 'initial_notice',
                summoningRound: 1,
                forcedPathAttendanceSecured: false,
                debtorForcedToAttend: false,
                investigationMemoIssued: false,
                nonInterferenceIssued: false,
                investigationCourtRequested: false,
            },
            lastActionDate: '2026-07-10',
            setLastActionDate: vi.fn(),
            showStatuteWarning: false,
            setShowStatuteWarning: vi.fn(),
            paidDebt: 0,
            paidDebtRef: { current: 0 },
            paidCourtFees: 0,
            setPaidCourtFees: vi.fn(),
            paidDirectorateFees: 0,
            setPaidDirectorateFees: vi.fn(),
            paidClientFees: 0,
            setPaidClientFees: vi.fn(),
            debtorNotificationDate: '2026-07-01',
            setDebtorNotificationDate: vi.fn(),
            manualGraceCalendarExtra: false,
            setManualGraceCalendarExtra: vi.fn(),
            timelineEvents: [],
            setTimelineEvents: vi.fn(),
            timelineEventsRef: { current: [] },
            persistExecutionMergeRef: { current: null },
            pushTimelineEventRef: { current: null },
            executionFileSnapshotRef: { current: null },
            earnerFeeCollectionSm: {},
            setEarnerFeeCollectionSm: vi.fn(),
            caseNotesLog: [],
            setCaseNotesLog: vi.fn(),
            caseNotesLogRef: { current: [] },
            caseTasksPending: [],
            setCaseTasksPending: vi.fn(),
            caseTasksPendingRef: { current: [] },
            activeTimelineEvents: [{ id: 't-1' }],
            mergedTimelineEvents: [{ id: 't-1' }],
            nextTimelineId: () => 'next-1',
            seizedAssets: [],
            setSeizedAssets: vi.fn(),
            seizedAssetsSnapshotRef: { current: [] },
            realEstateSeizureAssets: [],
            setRealEstateSeizureAssets: vi.fn(),
            realEstateSeizureSnapshotRef: { current: [] },
            thirdPartySeizureAssets: [],
            setThirdPartySeizureAssets: vi.fn(),
            thirdPartySeizureSnapshotRef: { current: [] },
            standaloneExecutionMarks: [],
            setStandaloneExecutionMarks: vi.fn(),
            standaloneExecutionMarksSnapshotRef: { current: [] },
            getMilestoneTimelineSnapshot: vi.fn(),
            seizureDraftsByDecisionId: {},
            setSeizureDraftsByDecisionId: vi.fn(),
            seizureDraftsByDecisionIdRef: { current: {} },
            activeCoerciveActions: ['salary'],
            setActiveCoerciveActions: vi.fn(),
            setShowCoerciveActionForm: vi.fn(),
            setSeizureDetailCompletion: vi.fn(),
            focusSeizurePropertyInlineRef: { current: null },
            focusSeizureMovableInlineRef: { current: null },
            focusSeizureThirdPartyInlineRef: { current: null },
            focusSeizureNoticeInlineRef: { current: null },
            approvedSeizedAssets: [],
            movableSeizureRegistryAssets: [],
            salarySeizureRegistryAssets: [{ id: 'salary-1' }],
            realEstateSeizureRegistryAssets: [{ id: 'estate-1' }],
            thirdPartySeizureRegistryAssets: [{ id: 'third-1' }],
            salarySeizureTabRows: [],
            isPaused: false,
            setIsPaused: vi.fn(),
            pauseReason: '',
            setPauseReason: vi.fn(),
            executionFeeAdded: false,
            toastVisible: false,
            toastMessage: '',
            toastType: 'success',
            toastEpoch: 0,
            showToast,
            hideToast: vi.fn(),
            showToastRef: { current: showToast },
            decisionsOrchestrator: {},
            decisionsReloadEpoch: 2,
            setDecisionsReloadEpoch: vi.fn(),
            decisionsModalBootHubTab: 'hub',
            setDecisionsModalBootHubTab: vi.fn(),
            decisionsModalBootListTab: 'list',
            setDecisionsModalBootListTab: vi.fn(),
            decisionsModalScrollToDecisionId: null,
            setDecisionsModalScrollToDecisionId: vi.fn(),
            appealsModalScrollToDecisionId: null,
            setAppealsModalScrollToDecisionId: vi.fn(),
            clearDecisionsModalBootState: vi.fn(),
            openDecisionsModalWithBoot: vi.fn(),
            forcedBringDecisionState: { approved: false },
            employeeForcedBringAwaitingPersonalOutcome: false,
            executionFeeInjected: false,
            setExecutionFeeInjected: vi.fn(),
            financialOrchestrator: {},
            isFinancialCenterExpanded: false,
            setIsFinancialCenterExpanded: vi.fn(),
            activeFinancialTab: 1,
            setActiveFinancialTab: vi.fn(),
            showExecutionFinancialHub: false,
            setShowExecutionFinancialHub: vi.fn(),
            financialHubAutoOpenMode: null,
            setFinancialHubAutoOpenMode: vi.fn(),
            financialHubSeizedMovableId: null,
            setFinancialHubSeizedMovableId: vi.fn(),
            financialHubSeizedPropertyId: null,
            setFinancialHubSeizedPropertyId: vi.fn(),
            openFinancialHubLedger: vi.fn(),
            thirdPartySeizuresUi: {},
            setThirdPartySeizuresUi: vi.fn(),
            applyThirdPartySeizuresFromPatch: vi.fn(),
            setExecutionReportPrompt: vi.fn(),
            setJudicialCustodianModalCtx: vi.fn(),
            setJudicialCustodianModalOpen: vi.fn(),
            showExecutionTrashModal: false,
            setShowExecutionTrashModal: vi.fn(),
            setPermanentDeleteTimelineId: vi.fn(),
        });

        useExecutionDashboardCoreFileMetadataBindingMock.mockReturnValue({
            claimType: 'مطالبة مالية',
            creditors: [],
            debtors: [{ name: 'مدين' }],
            totalAmount: 1000,
            debtAmount: '800',
            lawyerFeesAmount: '100',
            executionFee: '50',
            clientFeesAmount: '25',
            courtFees: '10',
            directorateFees: '5',
            initiator: 'creditor',
            docType: 'حكم',
            classification: 'financial',
            evictionCaseExpensesSum: 0,
            lawyerStartedPostNoticeExecution: false,
            evictionPremisesUseResolved: 'commercial',
        });

        useExecutionDashboardCoreFollowupDebtorPipelineMock.mockReturnValue({
            effectiveDebtors: [{ name: 'مدين' }],
            liabilityGroupTabsMode: false,
            activeLiabilityGroup: null,
            allDebtorRowsForLiability: [],
            activeWorkspaceDebtorForFollowup: null,
            primaryDebtorKeyResolved: 'debtor-1',
            effectiveFollowupDebtorEntry: null,
            activeDebtorNoticeScope: {},
            activeDebtorIsEmployee: false,
            activeDebtorIsDeceased: false,
            followupModalDebtorIsEmployee: false,
            followupModalSpecializationEffective: {
                hideFollowupSeizureRequestsTab: false,
                hideFollowupCoerciveTab: false,
            },
            activeDebtorEntityKind: 'person',
            isRepresentingDebtor: false,
            hideCoerciveTabsForDebtorAgent: false,
            followupSpecialization: { hideFollowupCoerciveTab: false },
            followupSpecializationEffective: {},
            showPersonalCoerciveFollowupTab: true,
            custodyRemovalClaimActive: false,
            employeeCoerciveDetentionRestricted: false,
            personalTabLockedForEmployee: false,
            unifiedSummonsTargetDebtorKey: 'debtor-1',
            assignmentWorkspaceCtx: { activeDebtorKey: 'debtor-1' },
            activeDebtorSolidary: null,
            allDebtorsUnified: [{ id: 'debtor-1' }],
            showGuarantorInSeizureFollowupTab: false,
            isPersonalStatusExecutionClaim: false,
            isAlimonyClaimType: false,
            followupSectionTabOrder: [],
            followupModalTabs: [],
            followupTabsRestricted: false,
            activeTimelineEventsDebtorScoped: [],
            timelineFilterOptions: [],
            clearThirdPartyFundsDraft: vi.fn(),
        });

        useExecutionDashboardCoreClaimFinancialLedgerPipelineMock.mockReturnValue({
            parsedCourtFees: 10,
            isNonFinancialClaim: false,
            isMaritalFurnitureClaim: false,
            maritalFurnitureItemsForFollowup: [],
            financialPrincipalAmount: 800,
            financialLawyerFeesAmount: 100,
            isEvictionExecutionModule: false,
            totalOwed: 900,
            debtorNotifiedForEvictionGrace: false,
            isAlimonyClaim: false,
            monetaryExecutionStrictPathFlag: false,
            monetaryStrictForSummoningEngine: false,
            remainingBalanceForSeizure: 900,
            settlementGuarantorGate: {},
            isPersonalStatusExecutionClaim: false,
            showGuarantorInSeizureFollowupTab: false,
            seizureMatrix: { hideSeizureTab: false },
        });

        useExecutionDashboardCoreGraceMasterEvictionPipelineMock.mockReturnValue({
            daysSinceNoticeCalculated: 3,
            isGracePeriodExpiredNow: false,
            isEvictionGraceEffectivelyExpired: false,
            isEvictionGraceExpiredNow: false,
            remaining: 100,
            unifiedCollectionApproved: false,
            statuteStatus: {},
            followupModalSpecializationEffectiveWithEarnerGate: {
                hidePersonalCoerciveFollowupTab: false,
                hideFollowupCoerciveTab: false,
            },
            followupSpecializationWithEarnerGate: {
                hidePersonalCoerciveFollowupTab: false,
                hideFollowupCoerciveTab: false,
            },
        });

        useExecutionDashboardCorePersistHandlerPipelineMock.mockReturnValue({
            debtorSummonsProfileBundle: {},
            subsequentNoticeFlow: {},
            persistExecutionMergeBinding: {},
            persistExecutionMerge: vi.fn(),
        });

        const boot = {
            executionStorageTick: 0,
            setExecutionStorageTick: vi.fn(),
            activeSubFileId: null,
            parentDossierId: 'parent-1',
            currentFileId: 'file-1',
            isInabaActive: false,
            inabaTargets: [],
            subFiles: [],
            activeTabId: 'file-1',
            setActiveTabId: vi.fn(),
            currentFile: null,
            childDossiers: [],
            isHistoricalMode: false,
            isUnifiedTabActive: false,
            unifiedTabId: '',
            executionData: {
                id: 'exec-1',
                specificDeliveryConvertedAmount: 500,
                specificDeliveryFinancialized: true,
            },
            parentExecutionFile: null,
            inabaCorrespondenceLog: [],
            viewExecutionData: { id: 'exec-1' },
            executionDataRef: { current: { id: 'exec-1' } },
            partyBadgesExecutionId: 'exec-1',
            decisionsStorageExecutionId: 'exec-1',
            executionAppealBanner: null,
            dossierFileKey: 'dossier-1',
            executionFileKey: 'file-key',
            dossierLifecycleRow: {},
            debtorSummonsMarkerLocal: null,
            setDebtorSummonsMarkerLocal: vi.fn(),
            isLoading: false,
            loadError: null,
            showExtraCreditors: false,
            setShowExtraCreditors: vi.fn(),
            showExtraDebtors: false,
            setShowExtraDebtors: vi.fn(),
            executionDashboardFileId: 'exec-1',
            modals: {
                showUnifiedExecutionModal: false,
                showUnifiedSummonsModal: false,
                showLedgerModal: false,
            },
            setExecutionModal: vi.fn(),
            isHeaderExpanded: false,
            toggleHeaderExpanded: vi.fn(),
            setShowNotesModal: vi.fn(),
            setShowDocumentsModal: vi.fn(),
            setShowDecisionsModal: vi.fn(),
            setShowTimelineModal: vi.fn(),
            setShowNotificationModal: vi.fn(),
            setShowCoerciveModal: vi.fn(),
            setShowPaymentModal: vi.fn(),
            setShowAppointmentModal: vi.fn(),
            setShowSeizedAssetsModal: vi.fn(),
            setShowPaymentCalculator: vi.fn(),
            setShowSettlementCalculator: vi.fn(),
            setShowPauseModal: vi.fn(),
            showDecisionsModal: false,
            showLinkedDossierTimeline: false,
            setShowLinkedDossierTimeline: vi.fn(),
            linkedDossierToView: null,
            setLinkedDossierToView: vi.fn(),
            showTransferFileNumberChangeModal: false,
            setShowTransferFileNumberChangeModal: vi.fn(),
            hasChildDossiers: false,
        };

        const { result } = renderHook(() =>
            useExecutionDashboardCorePipelinesChain({
                boot: boot as never,
                file: { id: 'file-1' } as never,
                executionId: 'exec-1',
                onUpdate: vi.fn(),
            }),
        );

        expect(useExecutionDashboardCoreWorkspacePipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                executionId: 'exec-1',
                executionDashboardFileId: 'exec-1',
                parentDossierId: 'parent-1',
            }),
        );
        expect(useExecutionDashboardCoreFollowupDebtorPipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                mergedTimelineEvents: [{ id: 't-1' }],
                activeCoerciveActions: ['salary'],
                dossierFileKey: 'dossier-1',
            }),
        );
        expect(useExecutionDashboardCoreClaimFinancialLedgerPipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                debtorNotificationDate: '2026-07-01',
                activeDebtorEntityKind: 'person',
                decisionsStorageExecutionId: 'exec-1',
            }),
        );
        expect(useExecutionDashboardCoreGraceMasterEvictionPipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                totalOwed: 900,
                followupOrchestrator: expect.objectContaining({
                    unifiedModalTab: 'correspondences',
                }),
            }),
        );
        expect(useExecutionDashboardCorePersistHandlerPipelineMock).toHaveBeenCalledWith(
            expect.objectContaining({
                remaining: 100,
                timelineEvents: [],
                executionData: expect.objectContaining({ id: 'exec-1' }),
            }),
        );
        expect(result.current.financialStatus).toEqual({
            label: 'فترة الإمهال القانوني',
            color: 'amber',
            pulse: false,
        });
        expect(result.current.specificDeliveryConvertedAmount).toBe(500);
        expect(result.current.specificDeliveryFinancialized).toBe(true);
    });
});
