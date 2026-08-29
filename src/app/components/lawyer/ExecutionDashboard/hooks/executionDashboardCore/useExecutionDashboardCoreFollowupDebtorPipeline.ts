/** Phase C Slice 26 — debtor workspace + followup specialization + tab assembly */
import type { UseExecutionDashboardCoreFollowupDebtorPipelineInput } from './useExecutionDashboardCoreFollowupDebtorPipeline.types';
import { useMemo } from 'react';
import type { Debtor } from '@/app/types/execution';
import {
    executionTimelineVisibilityFromFollowup,
    resolveExecutionTimelineFilterOptions,
} from '@/app/utils/timelineCategoryFilter';
import { useExecutionDashboardDebtorWorkspaceContext } from './useExecutionDashboardDebtorWorkspaceContext';
import { useActiveDebtorProfile } from '../useActiveDebtorProfile';
import { useExecutionDashboardEmployeeAssignmentCoerciveState } from './useExecutionDashboardEmployeeAssignmentCoerciveState';
import { useFollowupModalSpecializationCluster } from './useFollowupModalSpecializationCluster';
import { useSeizureLogEntityData } from '../useSeizureLogEntityData';
import { useUnifiedSeizureLog } from '../useUnifiedSeizureLog';
import { useExecutionDashboardFollowupTabAssembly } from './useExecutionDashboardFollowupTabAssembly';
import { createDefaultFollowupSpecializationFlags } from '@/app/utils/followupSpecializationVisibility';
import { useDebtorScopedTimeline } from '../useDebtorScopedTimeline';
import { timelineEventBelongsToDebtorWorkspace } from '@/app/utils/timelineDebtorScope';
import { useFollowupDebtorEntityFlags } from './useFollowupDebtorEntityFlags';
import {
    useExecutionDashboardActiveTimelineFilterNormalize,
    useExecutionDashboardDebtorBrowserTabsClamp,
    useExecutionDashboardPartiesExtraPanelsReset,
    useExecutionDashboardUnifiedModalPersonalTabRedirect,
    useExecutionResidentialGraceClearedListener,
} from './useExecutionDashboardRuntimeSyncEffects';
import { assembleFollowupDebtorPipelineReturn } from './assembleFollowupDebtorPipelineReturn';

export function useExecutionDashboardCoreFollowupDebtorPipeline(p: UseExecutionDashboardCoreFollowupDebtorPipelineInput) {
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
        effectiveDebtors,
        allDebtorsUnified,
        debtorWorkspaceEntries,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved,
        effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx,
        assignmentWorkspaceCtx,
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

    const employeeAssignmentCoercive = useExecutionDashboardEmployeeAssignmentCoerciveState({
        executionData: p.executionData,
        assignmentWorkspaceActiveDebtorKey: assignmentWorkspaceCtx.activeDebtorKey,
        followupAssignmentWorkspaceActiveDebtorKey: followupAssignmentWorkspaceCtx.activeDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorIsEmployee,
        followupModalDebtorIsEmployee,
    });
    const { modalShowEmployeeAssignmentCoerciveBlock, employeeAssignmentPhaseForCoercive } =
        employeeAssignmentCoercive;

    const followupModalSpecializationCluster = useFollowupModalSpecializationCluster({
        executionData: p.executionData,
        claimType: p.claimType,
        debtorBrowserTabsMode,
        effectiveFollowupDebtorEntry,
        activeWorkspaceDebtorForFollowup,
        followupAssignmentWorkspaceActiveDebtorKey: followupAssignmentWorkspaceCtx.activeDebtorKey,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
    });
    const { followupModalSpecializationEffective } = followupModalSpecializationCluster;

    const seizureLogEntity = useSeizureLogEntityData({
        viewExecutionData: p.viewExecutionData,
        decisionsStorageExecutionId: p.decisionsStorageExecutionId,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
    });
    const { seizedMovablesForSeizureLog } = seizureLogEntity;

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

    const entityFlags = useFollowupDebtorEntityFlags({
        executionData: p.executionData,
        executionId: p.executionId,
        activeDebtorIsEmployee,
        debtorBrowserTabsMode,
        activeWorkspaceDebtorForFollowup,
        assignmentWorkspaceCtx,
        primaryDebtorWorkspaceKey,
    });
    const { activeDebtorIsLegalEntity, isRepresentingDebtor, hideCoerciveTabsForDebtorAgent } =
        entityFlags;

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
    const { followupSpecialization, modalShowPersonalCoerciveFollowupTab } = followupTabAssembly;

    const timelineFilterOptions = useMemo(
        () =>
            resolveExecutionTimelineFilterOptions(
                executionTimelineVisibilityFromFollowup({
                    ...(followupSpecialization ?? createDefaultFollowupSpecializationFlags()),
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

    return assembleFollowupDebtorPipelineReturn({
        debtorWorkspaceContext,
        activeDebtorIsEmployee,
        activeDebtorIsDeceased,
        followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased,
        modalKasabTerminationEmphasis,
        employeeAssignmentCoercive,
        followupModalSpecializationCluster,
        seizureLogEntity,
        unifiedSeizureLog,
        activeDebtorNameResolved,
        activeDebtorInitialWasEmployee,
        activeTimelineEventsDebtorScoped,
        timelineRadarPreviewLimit,
        entityFlags,
        followupTabAssembly,
        timelineFilterOptions,
    });
}
