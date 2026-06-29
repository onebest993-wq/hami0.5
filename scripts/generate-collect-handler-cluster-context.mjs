import fs from 'fs';

const coreKeys = JSON.parse(
    fs.readFileSync('scripts/handler-cluster-core-keys.json', 'utf8'),
);

const outPath =
    'src/app/components/lawyer/ExecutionDashboard/hooks/executionDashboardCore/collectHandlerClusterContext.ts';

const ts = `// @ts-nocheck
/** Phase C Slice 23 — تجميع ctx لـ handler cluster من orchestrators + core */
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

export function collectHandlerClusterContext(spreads: HandlerClusterContextSpreads) {
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

/** مفاتي core المتبقية (مرجع للتوليد — ${coreKeys.length} key) */
export const HANDLER_CLUSTER_CORE_KEY_NAMES = ${JSON.stringify(coreKeys, null, 4)} as const;
`;

fs.writeFileSync(outPath, ts, 'utf8');
console.log('collectHandlerClusterContext.ts OK, core keys', coreKeys.length);
