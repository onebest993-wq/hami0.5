type Input = {
    scopeSources: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    executionModalSetters: Record<string, unknown>;
};

export function buildExecutionDashboardDirectFollowupScopeSnapshot({
    scopeSources,
    scopeLocalFlat,
    scopeRestFlat,
    executionModalSetters,
}: Input): Record<string, unknown> {
    const local = scopeLocalFlat as Record<string, unknown>;
    const rest = scopeRestFlat as Record<string, unknown>;

    return {
        ...scopeSources,
        unifiedModalTab: local.unifiedModalTab ?? rest.unifiedModalTab ?? scopeSources.unifiedModalTab,
        setUnifiedModalTab:
            local.setUnifiedModalTab ??
            rest.setUnifiedModalTab ??
            scopeSources.setUnifiedModalTab,
        showUnifiedExecutionModal:
            local.showUnifiedExecutionModal ??
            rest.showUnifiedExecutionModal ??
            scopeSources.showUnifiedExecutionModal,
        setShowUnifiedExecutionModal:
            executionModalSetters.setShowUnifiedExecutionModal ??
            local.setShowUnifiedExecutionModal ??
            rest.setShowUnifiedExecutionModal ??
            scopeSources.setShowUnifiedExecutionModal,
        closeFollowupModalPersisted:
            rest.closeFollowupModalPersisted ??
            local.closeFollowupModalPersisted ??
            scopeSources.closeFollowupModalPersisted,
        persistFollowupModalViewport:
            rest.persistFollowupModalViewport ??
            local.persistFollowupModalViewport ??
            scopeSources.persistFollowupModalViewport,
        goFollowupSectionTabByDelta:
            rest.goFollowupSectionTabByDelta ??
            local.goFollowupSectionTabByDelta ??
            scopeSources.goFollowupSectionTabByDelta,
        effectiveFollowupModalTabs: Array.isArray(rest.effectiveFollowupModalTabs)
            ? rest.effectiveFollowupModalTabs
            : Array.isArray(local.effectiveFollowupModalTabs)
              ? local.effectiveFollowupModalTabs
              : scopeSources.effectiveFollowupModalTabs,
        executionDebtorTabIndex:
            local.executionDebtorTabIndex ??
            rest.executionDebtorTabIndex ??
            scopeSources.executionDebtorTabIndex,
        setExecutionDebtorTabIndex:
            local.setExecutionDebtorTabIndex ??
            rest.setExecutionDebtorTabIndex ??
            scopeSources.setExecutionDebtorTabIndex,
        followupSolidaryDebtorIndex:
            local.followupSolidaryDebtorIndex ??
            rest.followupSolidaryDebtorIndex ??
            scopeSources.followupSolidaryDebtorIndex,
        setFollowupSolidaryDebtorIndex:
            local.setFollowupSolidaryDebtorIndex ??
            rest.setFollowupSolidaryDebtorIndex ??
            scopeSources.setFollowupSolidaryDebtorIndex,
        runSpecialFollowupSubmit:
            rest.runSpecialFollowupSubmit ??
            local.runSpecialFollowupSubmit ??
            scopeSources.runSpecialFollowupSubmit,
        openSeizureRequestsTab:
            rest.openSeizureRequestsTab ??
            local.openSeizureRequestsTab ??
            scopeSources.openSeizureRequestsTab,
    };
}
