/** Phase C Slice 26 — debtor workspace + followup specialization + tab assembly */
import { useMemo, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile, Debtor } from '@/app/types/execution';
import type { ExecutionFollowupOrchestratorSlice } from '../../orchestrators/executionFollowupOrchestratorTypes';
import type { ExecutionDashboardCoreWorkspacePipelineValue } from './executionDashboardCoreWorkspacePipelineTypes';
import type { ExecutionDashboardCoreBootPipelineValue } from './executionDashboardCoreBootPipelineTypes';
import type { DebtorEntityKind } from '@/app/utils/debtorEntityKindUtils';
import { resolveDebtorEntityKind, isLegalEntityDebtorKind } from '@/app/utils/debtorEntityKindUtils';
import { isLawyerRepresentingDebtor } from '@/app/utils/debtorAgentRepresentationUtils';
import { resolveFollowupFlagsForDebtorContext } from '@/app/utils/executionDomainIsolation';
import { applyDebtorDeathFollowupOverlay } from '@/app/utils/partyDeathFollowupOverlay';
import {
    executionTimelineVisibilityFromFollowup,
    resolveExecutionTimelineFilterOptions,
} from '@/app/utils/timelineCategoryFilter';
import { useExecutionDashboardDebtorWorkspaceContext } from './useExecutionDashboardDebtorWorkspaceContext';
import { useActiveDebtorProfile } from '../useActiveDebtorProfile';
import { useExecutionDashboardEmployeeAssignmentCoerciveState } from './useExecutionDashboardEmployeeAssignmentCoerciveState';
import { useSeizureLogEntityData } from '../useSeizureLogEntityData';
import { useUnifiedSeizureLog } from '../useUnifiedSeizureLog';
import { useExecutionDashboardFollowupTabAssembly } from './useExecutionDashboardFollowupTabAssembly';
import { useDebtorScopedTimeline } from '../useDebtorScopedTimeline';
import { timelineEventBelongsToDebtorWorkspace } from '@/app/utils/timelineDebtorScope';
import {
    useExecutionDashboardActiveTimelineFilterNormalize,
    useExecutionDashboardDebtorBrowserTabsClamp,
    useExecutionDashboardPartiesExtraPanelsReset,
    useExecutionDashboardUnifiedModalPersonalTabRedirect,
    useExecutionResidentialGraceClearedListener,
} from './useExecutionDashboardRuntimeSyncEffects';

export function useExecutionDashboardCoreFollowupDebtorPipeline(p: {
    executionData: ExecutionFile | null | undefined;
    viewExecutionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsStorageExecutionId: string;
    decisionsReloadEpoch: number;
    claimType: string;
    creditors: ExecutionFile['creditors'];
    debtors: ExecutionFile['debtors'];
    mergedTimelineEvents: ExecutionDashboardCoreWorkspacePipelineValue['mergedTimelineEvents'];
    activeTimelineEvents: ExecutionDashboardCoreWorkspacePipelineValue['activeTimelineEvents'];
    activeCoerciveActions: ExecutionDashboardCoreWorkspacePipelineValue['activeCoerciveActions'];
    realEstateSeizureRegistryAssets: ExecutionDashboardCoreWorkspacePipelineValue['realEstateSeizureRegistryAssets'];
    salarySeizureRegistryAssets: ExecutionDashboardCoreWorkspacePipelineValue['salarySeizureRegistryAssets'];
    movableSeizureRegistryAssets: ExecutionDashboardCoreWorkspacePipelineValue['movableSeizureRegistryAssets'];
    thirdPartySeizureRegistryAssets: ExecutionDashboardCoreWorkspacePipelineValue['thirdPartySeizureRegistryAssets'];
    thirdPartySeizuresUi: ExecutionDashboardCoreWorkspacePipelineValue['thirdPartySeizuresUi'];
    showToast: ExecutionDashboardCoreWorkspacePipelineValue['showToast'];
    showUnifiedExecutionModal: boolean;
    dossierFileKey: string;
    executionFileKey: string;
    setShowDecisionsModal: (show: boolean) => void;
    showDecisionsModal: boolean;
    setActiveTimelineFilter: Dispatch<SetStateAction<string>>;
    setShowExtraCreditors: (v: boolean) => void;
    setShowExtraDebtors: (v: boolean) => void;
    caseTasksPendingRef: ExecutionDashboardCoreWorkspacePipelineValue['caseTasksPendingRef'];
    setCaseTasksPending: ExecutionDashboardCoreWorkspacePipelineValue['setCaseTasksPending'];
    setTimelineEvents: ExecutionDashboardCoreWorkspacePipelineValue['setTimelineEvents'];
    persistExecutionMergeRef: ExecutionDashboardCoreWorkspacePipelineValue['persistExecutionMergeRef'];
    setNotificationCount: React.Dispatch<React.SetStateAction<number>>;
    setDebtorSummonsMarkerLocal: ExecutionDashboardCoreBootPipelineValue['setDebtorSummonsMarkerLocal'];
    pushTimelineEventRef: ExecutionDashboardCoreWorkspacePipelineValue['pushTimelineEventRef'];
    nextTimelineId: ExecutionDashboardCoreWorkspacePipelineValue['nextTimelineId'];
    followupOrchestrator: ExecutionFollowupOrchestratorSlice;
}) {
    const debtorWorkspaceContext = useExecutionDashboardDebtorWorkspaceContext({
        executionData: p.executionData,
        creditors: p.creditors,
        debtors: p.debtors,
        executionDebtorTabIndex: p.followupOrchestrator.executionDebtorTabIndex,
        setExecutionDebtorTabIndex: p.followupOrchestrator.setExecutionDebtorTabIndex,
        followupSolidaryDebtorIndex: p.followupOrchestrator.followupSolidaryDebtorIndex,
        setFollowupSolidaryDebtorIndex: p.followupOrchestrator.setFollowupSolidaryDebtorIndex,
        mergedTimelineEvents: p.mergedTimelineEvents,
        summonsContextDebtorKey: p.followupOrchestrator.summonsContextDebtorKey,
        setNotificationCount: p.setNotificationCount,
        setDebtorSummonsMarkerLocal: p.setDebtorSummonsMarkerLocal,
    });

    const {
        effectiveCreditors,
        effectiveDebtors,
        allDebtorsUnified,
        resolveDebtorSolidaryFlag,
        allDebtorsSolidary,
        isSolidaryLiability,
        debtorWorkspaceEntries,
        creditorWorkspaceEntries,
        creditorNamesTextList,
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
        liabilityGroupTabsMode,
        multiDebtorMode,
        debtorBrowserTabsMode,
        activeLiabilityGroup,
        activeGroupEntries,
        activeLiabilityGroupId,
        allDebtorRowsForLiability,
        activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved,
        showFollowupSolidaryDebtorTabs,
        effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        assignmentWorkspaceCtx,
        unifiedSummonsTargetDebtorKey,
        activeDebtorNoticeScope,
        scopedNotificationCount,
        scopedSummonsMarker,
        followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope,
    } = debtorWorkspaceContext;

    const { activeDebtorIsEmployee, activeDebtorIsDeceased } = useActiveDebtorProfile(
        p.executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        effectiveDebtors,
    );

    const {
        activeDebtorIsEmployee: followupActiveDebtorIsEmployee,
        activeDebtorIsDeceased: followupActiveDebtorIsDeceased,
    } = useActiveDebtorProfile(
        p.executionData,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        effectiveDebtors,
    );

    const followupModalDebtorIsEmployee = debtorBrowserTabsMode
        ? followupActiveDebtorIsEmployee
        : activeDebtorIsEmployee;
    const followupModalDebtorIsDeceased = debtorBrowserTabsMode
        ? followupActiveDebtorIsDeceased
        : activeDebtorIsDeceased;
    const modalKasabTerminationEmphasis = !followupModalDebtorIsEmployee;

    const {
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        employeeAssignmentPhaseForCoercive,
        employeeUnlocksPersonalCoerciveFromAssignment,
    } = useExecutionDashboardEmployeeAssignmentCoerciveState({
        executionData: p.executionData,
        assignmentWorkspaceActiveDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
        followupAssignmentWorkspaceActiveDebtorKey: followupAssignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorIsEmployee,
        followupModalDebtorIsEmployee,
    });

    const followupModalEntityKind = useMemo((): DebtorEntityKind => {
        const prim = p.executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        const entry = effectiveFollowupDebtorEntry ?? activeWorkspaceDebtorForFollowup;
        if (debtorBrowserTabsMode && entry) {
            if (!entry.isPrimary) {
                const ad = p.executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === entry.key,
                );
                debtor = (ad ?? entry.d) as Debtor | Record<string, unknown>;
            } else {
                debtor = prim ?? entry.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData: p.executionData,
            debtor,
            debtorKey: followupAssignmentWorkspaceCtx.activeDebtorKey,
        });
    }, [
        p.executionData,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        followupAssignmentWorkspaceCtx.activeDebtorKey,
    ]);

    const followupModalSpecialization = useMemo(
        () =>
            resolveFollowupFlagsForDebtorContext(
                p.executionData as Record<string, unknown> | null | undefined,
                {
                    isEmployeeDebtor: followupModalDebtorIsEmployee,
                    fallbackClaimType: p.claimType,
                    debtorEntityKind: followupModalEntityKind,
                },
            ),
        [p.executionData, followupModalDebtorIsEmployee, p.claimType, followupModalEntityKind],
    );

    const followupModalSpecializationEffective = useMemo(
        () =>
            applyDebtorDeathFollowupOverlay(
                followupModalSpecialization,
                Boolean(followupModalDebtorIsDeceased),
            ),
        [followupModalSpecialization, followupModalDebtorIsDeceased],
    );

    const { seizedPropertiesForSeizureLog, seizedMovablesForSeizureLog, seizureLogExecutorDecisions } =
        useSeizureLogEntityData({
            viewExecutionData: p.viewExecutionData,
            decisionsStorageExecutionId: p.decisionsStorageExecutionId,
            decisionsReloadEpoch: p.decisionsReloadEpoch,
        });

    const unifiedSeizureLog = useUnifiedSeizureLog({
        viewExecutionData: p.viewExecutionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        executionId: p.executionId,
        activeDebtorIsDeceased,
        realEstateSeizureRegistryAssets: p.realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets: p.salarySeizureRegistryAssets,
        movableSeizureRegistryAssets: p.movableSeizureRegistryAssets,
        seizedMovablesForSeizureLog,
        thirdPartySeizureRegistryAssets: p.thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi: p.thirdPartySeizuresUi,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
        showToast: p.showToast,
    });

    const {
        showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        unifiedSeizureLogTab,
        setUnifiedSeizureLogTab,
        unifiedSeizureLogEntries,
        unifiedSeizureTabCounts,
        hasUnifiedSeizureLogContent,
        openUnifiedSeizureLog,
        thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft,
    } = unifiedSeizureLog;

    const activeDebtorNameResolved = useMemo(() => {
        const row = allDebtorsUnified[p.followupOrchestrator.executionDebtorTabIndex];
        return String(row?.name || p.debtors?.[0]?.name || 'المدين').trim();
    }, [allDebtorsUnified, p.followupOrchestrator.executionDebtorTabIndex, p.debtors]);

    const activeDebtorInitialWasEmployee = useMemo(() => {
        if (!p.executionData) return undefined;
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (activeWorkspaceDebtorForFollowup.isPrimary) {
                const prim = p.executionData.debtors?.[0] as Debtor | undefined;
                return typeof prim?.employmentInitialWasEmployee === 'boolean'
                    ? prim.employmentInitialWasEmployee
                    : undefined;
            }
            const ad = p.executionData.party_multiplicity?.additionalDebtors?.find(
                (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key,
            );
            return ad && typeof ad.employmentInitialWasEmployee === 'boolean'
                ? ad.employmentInitialWasEmployee
                : undefined;
        }
        const prim = p.executionData.debtors?.[0] as Debtor | undefined;
        return typeof prim?.employmentInitialWasEmployee === 'boolean'
            ? prim.employmentInitialWasEmployee
            : undefined;
    }, [p.executionData, debtorBrowserTabsMode, activeWorkspaceDebtorForFollowup]);

    const { activeTimelineEventsDebtorScoped, timelineRadarPreviewLimit } = useDebtorScopedTimeline(
        p.activeTimelineEvents,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        timelineEventBelongsToDebtorWorkspace,
    );

    const kasabTerminationEmphasis = !activeDebtorIsEmployee;

    const activeFollowupDebtorKeyForEntity = String(
        assignmentWorkspaceCtx.activeDebtorKey ?? primaryDebtorWorkspaceKey ?? p.executionId ?? '',
    );
    const activeDebtorEntityKind = useMemo((): DebtorEntityKind => {
        const prim = p.executionData?.debtors?.[0] as Debtor | undefined;
        let debtor: Debtor | Record<string, unknown> | undefined = prim;
        if (debtorBrowserTabsMode && activeWorkspaceDebtorForFollowup) {
            if (!activeWorkspaceDebtorForFollowup.isPrimary) {
                const ad = p.executionData?.party_multiplicity?.additionalDebtors?.find(
                    (a) => String(a.id) === activeWorkspaceDebtorForFollowup.key,
                );
                debtor = (ad ?? activeWorkspaceDebtorForFollowup.d) as Debtor | Record<string, unknown>;
            } else {
                debtor = prim ?? activeWorkspaceDebtorForFollowup.d;
            }
        }
        return resolveDebtorEntityKind({
            executionData: p.executionData,
            debtor,
            debtorKey: activeFollowupDebtorKeyForEntity,
        });
    }, [
        p.executionData,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        activeFollowupDebtorKeyForEntity,
    ]);

    const activeDebtorIsLegalEntity = isLegalEntityDebtorKind(activeDebtorEntityKind);
    const isRepresentingDebtor = useMemo(
        () => isLawyerRepresentingDebtor(p.executionData),
        [p.executionData],
    );
    const appealPerspective = isRepresentingDebtor ? 'debtor_agent' : 'creditor_agent';
    const hideCoerciveTabsForDebtorAgent = isRepresentingDebtor && !activeDebtorIsLegalEntity;

    const followupTabAssembly = useExecutionDashboardFollowupTabAssembly({
        executionData: p.executionData,
        viewExecutionData: p.viewExecutionData,
        executionId: p.executionId,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        claimType: p.claimType,
        activeDebtorIsDeceased,
        activeDebtorIsLegalEntity,
        activeDebtorIsEmployee,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        followupModalSpecializationEffective,
        modalShowEmployeeAssignmentCoerciveBlock,
        followupAssignmentWorkspaceCtx,
        primaryDebtorWorkspaceKey,
        employeeAssignmentPhaseForCoercive,
        employeeCompulsoryBannerDismissed: p.followupOrchestrator.employeeCompulsoryBannerDismissed,
        setEmployeeCompulsoryBannerDismissed: p.followupOrchestrator.setEmployeeCompulsoryBannerDismissed,
        showUnifiedExecutionModal: p.showUnifiedExecutionModal,
        unifiedModalTab: p.followupOrchestrator.unifiedModalTab,
        setUnifiedModalTab: p.followupOrchestrator.setUnifiedModalTab,
        dossierFileKey: p.dossierFileKey,
        setShowUnifiedExecutionModal: p.followupOrchestrator.setShowUnifiedExecutionModal,
        followupModalBodyScrollRef: p.followupOrchestrator.followupModalBodyScrollRef,
        followupModalSectionTabsRef: p.followupOrchestrator.followupModalSectionTabsRef,
        followupModalOpenGenerationRef: p.followupOrchestrator.followupModalOpenGenerationRef,
        seizureMatrixRef: p.followupOrchestrator.seizureMatrixRef,
        openSeizureRequestsTabRef: p.followupOrchestrator.openSeizureRequestsTabRef,
        hideCoerciveTabsForDebtorAgent,
    });

    const {
        executionDomainContext,
        followupSpecialization,
        followupSpecializationEffective,
        showPersonalCoerciveFollowupTab,
        showSalarySeizureInFollowupModal,
        followupSalarySeizureLabel,
        showEmployeeCompulsoryProceduresBanner,
        activeFollowupDebtorKey,
        personalTabUnlockByDebtor,
        setPersonalTabUnlockByDebtor,
        employeePersonalTabUnlockStorageKey,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        modalEmployeeCoerciveDetentionRestricted,
        modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        modalPersonalTabLockedForEmployee,
        followupTabsRestricted,
        followupSectionTabOrder,
        followupModalTabs,
        isFollowupTabActive,
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
    } = followupTabAssembly;

    const timelineFilterOptions = useMemo(
        () =>
            resolveExecutionTimelineFilterOptions(
                executionTimelineVisibilityFromFollowup({
                    ...followupSpecialization,
                    showOtherPartyTimelineTab: isRepresentingDebtor,
                    hideCoerciveTimelineTab: hideCoerciveTabsForDebtorAgent,
                }),
            ),
        [followupSpecialization, isRepresentingDebtor, hideCoerciveTabsForDebtorAgent],
    );

    useExecutionDashboardActiveTimelineFilterNormalize(timelineFilterOptions, p.setActiveTimelineFilter);

    useExecutionDashboardUnifiedModalPersonalTabRedirect({
        showUnifiedExecutionModal: p.showUnifiedExecutionModal,
        modalShowPersonalCoerciveFollowupTab,
        unifiedModalTab: p.followupOrchestrator.unifiedModalTab,
        hideFollowupSeizureRequestsTab: followupModalSpecializationEffective.hideFollowupSeizureRequestsTab,
        hideFollowupCoerciveTab: followupModalSpecializationEffective.hideFollowupCoerciveTab,
        followupSolidaryDebtorIndex: p.followupOrchestrator.followupSolidaryDebtorIndex,
        executionDebtorTabIndex: p.followupOrchestrator.executionDebtorTabIndex,
        setUnifiedModalTab: p.followupOrchestrator.setUnifiedModalTab,
    });

    useExecutionDashboardDebtorBrowserTabsClamp({
        debtorBrowserTabsMode,
        debtorWorkspaceEntryCount: debtorWorkspaceEntries.length,
        setExecutionDebtorTabIndex: p.followupOrchestrator.setExecutionDebtorTabIndex,
    });

    useExecutionDashboardPartiesExtraPanelsReset(
        p.executionFileKey,
        p.setShowExtraCreditors,
        p.setShowExtraDebtors,
    );

    useExecutionResidentialGraceClearedListener({
        executionDataId: p.executionData?.id,
        executionId: p.executionId,
        setEvictionVacateDeadlineLocal: p.followupOrchestrator.setEvictionVacateDeadlineLocal,
        setEvictionVacateDraft: p.followupOrchestrator.setEvictionVacateDraft,
        setEvictionResidentialGracePeriodStart: p.followupOrchestrator.setEvictionResidentialGracePeriodStart,
        setEvictionResidentialGraceManuallyEndedAt: p.followupOrchestrator.setEvictionResidentialGraceManuallyEndedAt,
        setEvictionExecutorVacateGrantApproved: p.followupOrchestrator.setEvictionExecutorVacateGrantApproved,
        setGraceModalAllowResave: p.followupOrchestrator.setGraceModalAllowResave,
        caseTasksPendingRef: p.caseTasksPendingRef,
        setCaseTasksPending: p.setCaseTasksPending,
        setTimelineEvents: p.setTimelineEvents,
        persistExecutionMergeRef: p.persistExecutionMergeRef,
    });

    return {
        debtorWorkspaceContext,
        effectiveCreditors,
        effectiveDebtors,
        allDebtorsUnified,
        resolveDebtorSolidaryFlag,
        allDebtorsSolidary,
        isSolidaryLiability,
        debtorWorkspaceEntries,
        creditorWorkspaceEntries,
        creditorNamesTextList,
        perDebtorSolidarySplitMode,
        debtorLiabilityGroups,
        liabilityGroupTabsMode,
        multiDebtorMode,
        debtorBrowserTabsMode,
        activeLiabilityGroup,
        activeGroupEntries,
        activeLiabilityGroupId,
        allDebtorRowsForLiability,
        activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved,
        showFollowupSolidaryDebtorTabs,
        effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx,
        mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit,
        assignmentWorkspaceCtx,
        unifiedSummonsTargetDebtorKey,
        activeDebtorNoticeScope,
        scopedNotificationCount,
        scopedSummonsMarker,
        followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        modalKasabTerminationEmphasis,
        modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock,
        employeeAssignmentPhaseForCoercive,
        employeeUnlocksPersonalCoerciveFromAssignment,
        followupModalEntityKind,
        followupModalSpecialization,
        followupModalSpecializationEffective,
        seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog,
        seizureLogExecutorDecisions,
        unifiedSeizureLog,
        showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog,
        unifiedSeizureLogTab,
        setUnifiedSeizureLogTab,
        unifiedSeizureLogEntries,
        unifiedSeizureTabCounts,
        hasUnifiedSeizureLogContent,
        openUnifiedSeizureLog,
        thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft,
        activeDebtorNameResolved,
        activeDebtorInitialWasEmployee,
        activeTimelineEventsDebtorScoped,
        timelineRadarPreviewLimit,
        kasabTerminationEmphasis,
        activeDebtorEntityKind,
        activeDebtorIsLegalEntity,
        isRepresentingDebtor,
        appealPerspective,
        hideCoerciveTabsForDebtorAgent,
        followupTabAssembly,
        executionDomainContext,
        followupSpecialization,
        followupSpecializationEffective,
        showPersonalCoerciveFollowupTab,
        showSalarySeizureInFollowupModal,
        followupSalarySeizureLabel,
        showEmployeeCompulsoryProceduresBanner,
        activeFollowupDebtorKey,
        personalTabUnlockByDebtor,
        setPersonalTabUnlockByDebtor,
        employeePersonalTabUnlockStorageKey,
        custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted,
        modalEmployeeCoerciveDetentionRestricted,
        modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee,
        modalPersonalTabLockedForEmployee,
        followupTabsRestricted,
        followupSectionTabOrder,
        followupModalTabs,
        isFollowupTabActive,
        openFollowupModalPersisted,
        closeFollowupModalPersisted,
        persistFollowupModalViewport,
        goFollowupSectionTabByDelta,
        timelineFilterOptions,
    };
}
