export type HandlerClusterContextSpreads = {
    followupOrchestrator: Record<string, unknown>;
    seizureOrchestrator: Record<string, unknown>;
    coercionOrchestrator: Record<string, unknown>;
    dossierLifecyclePanel: Record<string, unknown>;
    claimFinancials: Record<string, unknown>;
    graceAndSummoning: Record<string, unknown>;
    debtorWorkspaceContext: Record<string, unknown>;
    subsequentNoticeFlow: Record<string, unknown>;
    followupTabAssembly: Record<string, unknown>;
    followupSeizureTabs: Record<string, unknown>;
    decisionsOrchestrator: Record<string, unknown>;
    core: Record<string, unknown>;
};

export function collectFullHandlerClusterContext(
    spreads: HandlerClusterContextSpreads,
): Record<string, unknown> {
    return {
        ...spreads.core,
        ...spreads.followupOrchestrator,
        ...spreads.seizureOrchestrator,
        ...spreads.coercionOrchestrator,
        ...spreads.dossierLifecyclePanel,
        ...spreads.claimFinancials,
        ...spreads.graceAndSummoning,
        ...spreads.debtorWorkspaceContext,
        ...spreads.subsequentNoticeFlow,
        ...spreads.followupTabAssembly,
        ...spreads.followupSeizureTabs,
        ...spreads.decisionsOrchestrator,
    };
}

export function pickHandlerClusterKeys(
    bags: ReadonlyArray<Record<string, unknown>>,
    keys: readonly string[],
): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    for (const bag of bags) {
        if (!bag || typeof bag !== 'object') continue;
        for (const key of keys) {
            if (key in bag) out[key] = bag[key];
        }
    }
    return out;
}

export function handlerClusterSourceBags(
    spreads: HandlerClusterContextSpreads,
): ReadonlyArray<Record<string, unknown>> {
    return [
        spreads.core,
        spreads.followupOrchestrator,
        spreads.seizureOrchestrator,
        spreads.coercionOrchestrator,
        spreads.dossierLifecyclePanel,
        spreads.claimFinancials,
        spreads.graceAndSummoning,
        spreads.debtorWorkspaceContext,
        spreads.subsequentNoticeFlow,
        spreads.followupTabAssembly,
        spreads.followupSeizureTabs,
        spreads.decisionsOrchestrator,
    ];
}

/**
 * يقرأ قيمة من input الجسور دون تسطيح كامل — input هو bag-of-bags
 * (followupOrchestrator/…/core) وليس سياقاً مسطّحاً، لذا الوصول المباشر
 * input.someFlag يعيد undefined دائماً. الأسبقية توافق collectFullHandlerClusterContext
 * (الحقيبة اللاحقة تتغلّب على السابقة).
 */
export function readHandlerClusterContextValue(
    input: Record<string, unknown>,
    key: string,
): unknown {
    if (key in input) return input[key];
    let out: unknown;
    for (const bag of handlerClusterSourceBags(input as HandlerClusterContextSpreads)) {
        if (bag && typeof bag === 'object' && key in bag) {
            out = bag[key];
        }
    }
    return out;
}
