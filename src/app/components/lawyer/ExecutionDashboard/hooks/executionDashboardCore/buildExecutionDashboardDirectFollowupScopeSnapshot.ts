import { isExecutionHandlerStubLeaf } from '../executionHandlerClusterStubs';

type Input = {
    scopeSources: Record<string, unknown>;
    scopeLocalFlat: Record<string, unknown>;
    scopeRestFlat: Record<string, unknown>;
    executionModalSetters: Record<string, unknown>;
};

const DOSSIER_FOLLOWUP_HANDLER_KEYS = [
    'runSpecialFollowupSubmit',
    'otherPartyTabSubmitHandler',
    'handleDossierAction',
    'openOtherPartyAppealsModal',
    'creditorOtherPartyTrackHandlers',
] as const;

/** معالجات تبويب الإجراءات الجبرية / الإخلاء — يجب أن تفضّل الحيّة على stub الجسر */
const COERCIVE_EVICTION_FOLLOWUP_HANDLER_KEYS = [
    'openEvictionResidentialGraceModal',
    'completeEvictionResidentialGrace',
    'appendEvictionProcedure',
    'appendEvictionExecutorRequest',
    'savePoliceAssistanceEntry',
    'openPoliceAssistanceDetailsForDecision',
    'saveBreakInventoryLedgerEntry',
    'finalizeBreakInventoryEntry',
    'saveMaritalFurnitureDeliveryInventoryEntry',
    'tryOpenPendingBreakInventoryLedger',
    'tryOpenPendingCustodianDetails',
    'saveJudicialCustodianEntry',
    'handleCoerciveAction',
    'saveCoerciveAction',
] as const;

function pickHandlerGroup(
    keys: readonly string[],
    scopeSources: Record<string, unknown>,
    rest: Record<string, unknown>,
    local: Record<string, unknown>,
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const key of keys) {
        out[key] = preferLiveHandler(scopeSources[key], rest[key], local[key]);
    }
    return out;
}

/** يفضّل المعالج الحقيقي على stub الجسر البارد */
function preferLiveHandler(...candidates: unknown[]): unknown {
    for (const candidate of candidates) {
        if (typeof candidate === 'function' && !isExecutionHandlerStubLeaf(candidate)) {
            return candidate;
        }
    }
    for (const candidate of candidates) {
        if (typeof candidate === 'function') return candidate;
    }
    return candidates.find((candidate) => candidate !== undefined && candidate !== null);
}

function pickDossierFollowupHandlers(
    scopeSources: Record<string, unknown>,
    rest: Record<string, unknown>,
    local: Record<string, unknown>,
): Record<string, unknown> {
    return pickHandlerGroup(DOSSIER_FOLLOWUP_HANDLER_KEYS, scopeSources, rest, local);
}

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
        openSeizureRequestsTab:
            preferLiveHandler(
                scopeSources.openSeizureRequestsTab,
                rest.openSeizureRequestsTab,
                local.openSeizureRequestsTab,
            ),
        ...pickDossierFollowupHandlers(scopeSources, rest, local),
        ...pickHandlerGroup(COERCIVE_EVICTION_FOLLOWUP_HANDLER_KEYS, scopeSources, rest, local),
    };
}
