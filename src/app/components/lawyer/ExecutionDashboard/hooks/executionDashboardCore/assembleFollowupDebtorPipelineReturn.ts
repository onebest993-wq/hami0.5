import type { useExecutionDashboardDebtorWorkspaceContext } from './useExecutionDashboardDebtorWorkspaceContext';
import type { useExecutionDashboardEmployeeAssignmentCoerciveState } from './useExecutionDashboardEmployeeAssignmentCoerciveState';
import type { useFollowupModalSpecializationCluster } from './useFollowupModalSpecializationCluster';
import type { useSeizureLogEntityData } from '../useSeizureLogEntityData';
import type { useUnifiedSeizureLog } from '../useUnifiedSeizureLog';
import type { useFollowupDebtorEntityFlags } from './useFollowupDebtorEntityFlags';
import type { useExecutionDashboardFollowupTabAssembly } from './useExecutionDashboardFollowupTabAssembly';

export type AssembleFollowupDebtorPipelineReturnInput = {
    debtorWorkspaceContext: ReturnType<typeof useExecutionDashboardDebtorWorkspaceContext>;
    activeDebtorIsEmployee: boolean;
    activeDebtorIsDeceased: boolean;
    followupModalDebtorIsEmployee: boolean;
    followupModalDebtorIsDeceased: boolean;
    modalKasabTerminationEmphasis: boolean;
    employeeAssignmentCoercive: ReturnType<
        typeof useExecutionDashboardEmployeeAssignmentCoerciveState
    >;
    followupModalSpecializationCluster: ReturnType<typeof useFollowupModalSpecializationCluster>;
    seizureLogEntity: ReturnType<typeof useSeizureLogEntityData>;
    unifiedSeizureLog: ReturnType<typeof useUnifiedSeizureLog>;
    activeDebtorNameResolved: string;
    activeDebtorInitialWasEmployee: boolean | undefined;
    activeTimelineEventsDebtorScoped: ReturnType<
        typeof import('../useDebtorScopedTimeline').useDebtorScopedTimeline
    >['activeTimelineEventsDebtorScoped'];
    timelineRadarPreviewLimit: number;
    entityFlags: ReturnType<typeof useFollowupDebtorEntityFlags>;
    followupTabAssembly: ReturnType<typeof useExecutionDashboardFollowupTabAssembly>;
    timelineFilterOptions: unknown;
};

export function assembleFollowupDebtorPipelineReturn(p: AssembleFollowupDebtorPipelineReturnInput) {
    const d = p.debtorWorkspaceContext;
    const c = p.employeeAssignmentCoercive;
    const spec = p.followupModalSpecializationCluster;
    const s = p.seizureLogEntity;
    const u = p.unifiedSeizureLog;
    const e = p.entityFlags;
    const t = p.followupTabAssembly;
    return {
        debtorWorkspaceContext: d,
        effectiveCreditors: d.effectiveCreditors,
        effectiveDebtors: d.effectiveDebtors,
        allDebtorsUnified: d.allDebtorsUnified,
        resolveDebtorSolidaryFlag: d.resolveDebtorSolidaryFlag,
        allDebtorsSolidary: d.allDebtorsSolidary,
        isSolidaryLiability: d.isSolidaryLiability,
        debtorWorkspaceEntries: d.debtorWorkspaceEntries,
        creditorWorkspaceEntries: d.creditorWorkspaceEntries,
        creditorNamesTextList: d.creditorNamesTextList,
        perDebtorSolidarySplitMode: d.perDebtorSolidarySplitMode,
        debtorLiabilityGroups: d.debtorLiabilityGroups,
        liabilityGroupTabsMode: d.liabilityGroupTabsMode,
        multiDebtorMode: d.multiDebtorMode,
        debtorBrowserTabsMode: d.debtorBrowserTabsMode,
        activeLiabilityGroup: d.activeLiabilityGroup,
        activeGroupEntries: d.activeGroupEntries,
        activeLiabilityGroupId: d.activeLiabilityGroupId,
        allDebtorRowsForLiability: d.allDebtorRowsForLiability,
        activeDebtorSolidary: d.activeDebtorSolidary,
        activeWorkspaceDebtorForFollowup: d.activeWorkspaceDebtorForFollowup,
        primaryDebtorWorkspaceKey: d.primaryDebtorWorkspaceKey,
        primaryDebtorKeyResolved: d.primaryDebtorKeyResolved,
        showFollowupSolidaryDebtorTabs: d.showFollowupSolidaryDebtorTabs,
        effectiveFollowupDebtorEntry: d.effectiveFollowupDebtorEntry,
        followupAssignmentWorkspaceCtx: d.followupAssignmentWorkspaceCtx,
        mergedTimelineEventsDebtorScoped: d.mergedTimelineEventsDebtorScoped,
        mergedTimelineRadarPreviewLimit: d.mergedTimelineRadarPreviewLimit,
        assignmentWorkspaceCtx: d.assignmentWorkspaceCtx,
        unifiedSummonsTargetDebtorKey: d.unifiedSummonsTargetDebtorKey,
        activeDebtorNoticeScope: d.activeDebtorNoticeScope,
        scopedNotificationCount: d.scopedNotificationCount,
        scopedSummonsMarker: d.scopedSummonsMarker,
        followupActiveDebtorNoticeScope: d.followupActiveDebtorNoticeScope,
        modalActiveDebtorNoticeScope: d.modalActiveDebtorNoticeScope,
        activeDebtorIsEmployee: p.activeDebtorIsEmployee,
        activeDebtorIsDeceased: p.activeDebtorIsDeceased,
        followupModalDebtorIsEmployee: p.followupModalDebtorIsEmployee,
        followupModalDebtorIsDeceased: p.followupModalDebtorIsDeceased,
        modalKasabTerminationEmphasis: p.modalKasabTerminationEmphasis,
        modalResolvedEmployeeSummonsAssignment: c.modalResolvedEmployeeSummonsAssignment,
        modalShowEmployeeAssignmentCoerciveBlock: c.modalShowEmployeeAssignmentCoerciveBlock,
        employeeAssignmentPhaseForCoercive: c.employeeAssignmentPhaseForCoercive,
        employeeUnlocksPersonalCoerciveFromAssignment: c.employeeUnlocksPersonalCoerciveFromAssignment,
        followupModalEntityKind: spec.followupModalEntityKind,
        followupModalSpecialization: spec.followupModalSpecialization,
        followupModalSpecializationEffective: spec.followupModalSpecializationEffective,
        seizedPropertiesForSeizureLog: s.seizedPropertiesForSeizureLog,
        seizedMovablesForSeizureLog: s.seizedMovablesForSeizureLog,
        seizureLogExecutorDecisions: s.seizureLogExecutorDecisions,
        unifiedSeizureLog: u,
        showUnifiedSeizureLogModal: u.showUnifiedSeizureLogModal,
        closeUnifiedSeizureLog: u.closeUnifiedSeizureLog,
        unifiedSeizureLogTab: u.unifiedSeizureLogTab,
        setUnifiedSeizureLogTab: u.setUnifiedSeizureLogTab,
        unifiedSeizureLogEntries: u.unifiedSeizureLogEntries,
        unifiedSeizureTabCounts: u.unifiedSeizureTabCounts,
        hasUnifiedSeizureLogContent: u.hasUnifiedSeizureLogContent,
        openUnifiedSeizureLog: u.openUnifiedSeizureLog,
        thirdPartyFundsDraftById: u.thirdPartyFundsDraftById,
        setThirdPartyFundsDraftById: u.setThirdPartyFundsDraftById,
        clearThirdPartyFundsDraft: u.clearThirdPartyFundsDraft,
        activeDebtorNameResolved: p.activeDebtorNameResolved,
        activeDebtorInitialWasEmployee: p.activeDebtorInitialWasEmployee,
        activeTimelineEventsDebtorScoped: p.activeTimelineEventsDebtorScoped,
        timelineRadarPreviewLimit: p.timelineRadarPreviewLimit,
        kasabTerminationEmphasis: e.kasabTerminationEmphasis,
        activeDebtorEntityKind: e.activeDebtorEntityKind,
        activeDebtorIsLegalEntity: e.activeDebtorIsLegalEntity,
        isRepresentingDebtor: e.isRepresentingDebtor,
        appealPerspective: e.appealPerspective,
        hideCoerciveTabsForDebtorAgent: e.hideCoerciveTabsForDebtorAgent,
        followupTabAssembly: t,
        executionDomainContext: t.executionDomainContext,
        followupSpecialization: t.followupSpecialization,
        followupSpecializationEffective: t.followupSpecializationEffective,
        showPersonalCoerciveFollowupTab: t.showPersonalCoerciveFollowupTab,
        showSalarySeizureInFollowupModal: t.showSalarySeizureInFollowupModal,
        followupSalarySeizureLabel: t.followupSalarySeizureLabel,
        showEmployeeCompulsoryProceduresBanner: t.showEmployeeCompulsoryProceduresBanner,
        activeFollowupDebtorKey: t.activeFollowupDebtorKey,
        personalTabUnlockByDebtor: t.personalTabUnlockByDebtor,
        setPersonalTabUnlockByDebtor: t.setPersonalTabUnlockByDebtor,
        employeePersonalTabUnlockStorageKey: t.employeePersonalTabUnlockStorageKey,
        custodyRemovalClaimActive: t.custodyRemovalClaimActive,
        employeeCoerciveDetentionRestricted: t.employeeCoerciveDetentionRestricted,
        modalEmployeeCoerciveDetentionRestricted: t.modalEmployeeCoerciveDetentionRestricted,
        modalShowPersonalCoerciveFollowupTab: t.modalShowPersonalCoerciveFollowupTab,
        personalTabLockedForEmployee: t.personalTabLockedForEmployee,
        modalPersonalTabLockedForEmployee: t.modalPersonalTabLockedForEmployee,
        followupTabsRestricted: t.followupTabsRestricted,
        followupSectionTabOrder: t.followupSectionTabOrder,
        followupModalTabs: t.followupModalTabs,
        isFollowupTabActive: t.isFollowupTabActive,
        openFollowupModalPersisted: t.openFollowupModalPersisted,
        closeFollowupModalPersisted: t.closeFollowupModalPersisted,
        persistFollowupModalViewport: t.persistFollowupModalViewport,
        goFollowupSectionTabByDelta: t.goFollowupSectionTabByDelta,
        timelineFilterOptions: p.timelineFilterOptions,
    };
}
