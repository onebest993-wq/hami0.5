/** Phase C Slice 25 — fingerprint لـ lazy chunk setup */
export function buildExecutionDashboardCoreChunkFingerprint(p: {
    executionId: string | undefined;
    activeTabId: string | number;
    activeFinancialTab: string | number;
    activeTimelineFilter: string;
    executionPaused: boolean;
    dossierLifecyclePanel: {
        dossierLifecyclePanelOpen: boolean;
        dossierLifecyclePanelPhase: unknown;
        dossierLifecyclePopStyle: unknown;
    };
    toastEpoch: number;
    unifiedLedgerRevision: number;
    executionStorageTick: number;
    financialPrincipalAmount: number;
    followupOrchestrator: { executionDebtorTabIndex: number };
    showUnifiedSeizureLogModal: boolean;
    timelineAccordionExpanded: boolean;
    isFinancialCenterExpanded: boolean;
    isHeaderExpanded: boolean;
    coercionOrchestrator: {
        debtorAttendedVoluntarily: boolean;
        voluntaryAttendanceCount: number;
    };
    noticeVoluntaryPeriodEndOptimistic: boolean;
    voluntaryEndOptimistic: boolean;
    notificationCount: number;
    showExecutionFinancialHub: boolean;
    showExecutionTrashModal: boolean;
    handlerClusterEpoch: number;
    decisionsReloadEpoch: number;
}) {
    const { dossierLifecyclePanel, followupOrchestrator, coercionOrchestrator } = p;
    return {
        executionId: p.executionId,
        activeTabId: p.activeTabId,
        activeFinancialTab: p.activeFinancialTab,
        activeTimelineFilter: p.activeTimelineFilter,
        executionPaused: p.executionPaused,
        dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
        dossierLifecyclePanelPhase: dossierLifecyclePanel.dossierLifecyclePanelPhase,
        dossierLifecyclePopStyle: dossierLifecyclePanel.dossierLifecyclePopStyle,
        toastEpoch: p.toastEpoch,
        dataRevision: p.unifiedLedgerRevision,
        executionStorageTick: p.executionStorageTick,
        financialPrincipalAmount: p.financialPrincipalAmount,
        executionDebtorTabIndex: followupOrchestrator.executionDebtorTabIndex,
        showUnifiedSeizureLogModal: p.showUnifiedSeizureLogModal,
        timelineAccordionExpanded: p.timelineAccordionExpanded,
        isFinancialCenterExpanded: p.isFinancialCenterExpanded,
        isHeaderExpanded: p.isHeaderExpanded,
        debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
        voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
        noticeVoluntaryPeriodEndOptimistic: p.noticeVoluntaryPeriodEndOptimistic,
        voluntaryEndOptimistic: p.voluntaryEndOptimistic,
        notificationCount: p.notificationCount,
        showExecutionFinancialHub: p.showExecutionFinancialHub,
        showExecutionTrashModal: p.showExecutionTrashModal,
        handlerClusterEpoch: p.handlerClusterEpoch,
        decisionsReloadEpoch: p.decisionsReloadEpoch,
    };
}
