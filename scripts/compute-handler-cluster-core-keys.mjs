import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const ctxKeys = JSON.parse(fs.readFileSync('scripts/handler-cluster-ctx-keys.json', 'utf8'));
const core = fs.readFileSync(corePath, 'utf8');

function extractDestructureKeys(varName) {
    const end = core.indexOf(`} = ${varName};`);
    if (end < 0) return [];
    const start = core.lastIndexOf('const {', end);
    const block = core.slice(start, end);
    return [...block.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((m) => m[1]);
}

const spreadSources = {
    followupOrchestrator: extractDestructureKeys('followupOrchestrator'),
    seizureOrchestrator: extractDestructureKeys('seizureOrchestrator'),
    coercionOrchestrator: extractDestructureKeys('coercionOrchestrator'),
    dossierLifecyclePanel: extractDestructureKeys('dossierLifecyclePanel'),
    claimFinancials: extractDestructureKeys('claimFinancials'),
    graceAndSummoning: extractDestructureKeys('graceAndSummoning'),
    debtorWorkspaceContext: extractDestructureKeys('debtorWorkspaceContext'),
    subsequentNoticeFlow: extractDestructureKeys('subsequentNoticeFlow'),
    followupTabAssembly: extractDestructureKeys('followupTabAssembly'),
    followupSeizureTabs: extractDestructureKeys('followupSeizureTabs'),
    ledgerSync: extractDestructureKeys('ledgerSync'),
    decisionsOrchestrator: extractDestructureKeys('decisionsOrchestrator'),
};

const covered = new Set();
for (const [src, keys] of Object.entries(spreadSources)) {
    for (const k of keys) covered.add(k);
}

const coreOnly = ctxKeys.filter((k) => !covered.has(k));
const garbage = ['id', 'info', 'isArray', 'length', 'props', 'requestKind', 'residential', 'premisesUse', 'manuallyEndedAt', 'notificationDate', 'workflowKey', 'eviction_procedure', 'eviction_assets_tab_unlocked', 'eviction_residential_grace_manually_ended_at', 'residential_grace_early_end', 'debtor_absence_badge_dismissed', 'absenceBadgeDismissed'];
const coreKeys = coreOnly.filter((k) => !garbage.includes(k));

fs.writeFileSync('scripts/handler-cluster-core-keys.json', JSON.stringify(coreKeys, null, 2), 'utf8');
console.log('spread covered', covered.size, 'core-only', coreKeys.length, 'garbage dropped', coreOnly.length - coreKeys.length);
for (const [src, keys] of Object.entries(spreadSources)) {
    console.log(src, keys.length);
}
