/** Phase C Slice 23 — تجميع rest bundle input من مجموعات */
export function collectScopeRestBundleInput(g: {
    runtimeFns: Record<string, unknown>;
    eviction: Record<string, unknown>;
    summons: Record<string, unknown>;
    decisions?: Record<string, unknown>;
    modals: Record<string, unknown>;
    followupDerived: Record<string, unknown>;
    claimDisplay: Record<string, unknown>;
    partyDeath: Record<string, unknown>;
    debtorProfile: Record<string, unknown>;
    masterState: Record<string, unknown>;
    inaba: Record<string, unknown>;
    executor: Record<string, unknown>;
    breakInv: Record<string, unknown>;
    judicial: Record<string, unknown>;
    financialAlimony: Record<string, unknown>;
    header: Record<string, unknown>;
    runtimeConstants: Record<string, unknown>;
    handlerClusterExtras: Record<string, unknown>;
    followupScopeBag?: Record<string, unknown>;
    coerciveScopeBag?: Record<string, unknown>;
    decisionsSeizureEvictionScopeBag?: Record<string, unknown>;
    workspaceScopeBag?: Record<string, unknown>;
    timelineDossierScopeBag?: Record<string, unknown>;
    financialScopeBag?: Record<string, unknown>;
}) {
    return {
        ...g.runtimeFns,
        ...g.eviction,
        ...g.summons,
        ...(g.decisions ?? {}),
        ...g.modals,
        ...g.followupDerived,
        ...g.claimDisplay,
        ...g.partyDeath,
        ...g.debtorProfile,
        ...g.masterState,
        ...g.inaba,
        ...g.executor,
        ...g.breakInv,
        ...g.judicial,
        ...g.financialAlimony,
        ...g.header,
        ...g.runtimeConstants,
        ...g.handlerClusterExtras,
        ...(g.followupScopeBag ?? {}),
        followupScopeBag: g.followupScopeBag,
        coerciveScopeBag: g.coerciveScopeBag,
        decisionsSeizureEvictionScopeBag: g.decisionsSeizureEvictionScopeBag,
        workspaceScopeBag: g.workspaceScopeBag,
        timelineDossierScopeBag: g.timelineDossierScopeBag,
        financialScopeBag: g.financialScopeBag,
    };
}
