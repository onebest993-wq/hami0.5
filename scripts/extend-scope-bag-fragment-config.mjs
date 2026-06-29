import fs from 'fs';

const orch = JSON.parse(fs.readFileSync('scripts/tmp-orch-keys.json', 'utf8'));
const wsKeys = [
    'allDebtorsUnified',
    'debtorWorkspaceEntries',
    'debtorBrowserTabsMode',
    'multiDebtorMode',
    'liabilityGroupTabsMode',
    'activeGroupEntries',
    'isSolidaryLiability',
    'primaryDebtorWorkspaceKey',
    'primaryDebtorKeyResolved',
    'showFollowupSolidaryDebtorTabs',
    'followupAssignmentWorkspaceCtx',
    'assignmentWorkspaceCtx',
    'unifiedSummonsTargetDebtorKey',
    'activeDebtorNoticeScope',
    'scopedSummonsMarker',
    'modalActiveDebtorNoticeScope',
    'debtorLiabilityGroups',
    'mergedTimelineEventsDebtorScoped',
    'mergedTimelineRadarPreviewLimit',
    'effectiveFollowupDebtorEntry',
];
const dlKeys = [
    'dossierLifecyclePanelOpen',
    'dossierLifecyclePanelPhase',
    'dossierLifecyclePopStyle',
    'dossierPendingStatus',
    'dossierReasonDraft',
    'dossierDateDraft',
];

const additions = [
    { fn: 'followupOrchestratorScopeFragment', var: 'followupOrchestrator', keys: orch.followup },
    { fn: 'seizureOrchestratorScopeFragment', var: 'seizureOrchestrator', keys: orch.seizure },
    { fn: 'coercionOrchestratorScopeFragment', var: 'coercionOrchestrator', keys: orch.coercion },
    { fn: 'debtorWorkspaceContextScopeFragment', var: 'debtorWorkspaceContext', keys: wsKeys },
    { fn: 'dossierLifecyclePanelScopeFragment', var: 'dossierLifecyclePanel', keys: dlKeys },
];

let cfg = fs.readFileSync('scripts/scope-bag-fragment-config.mjs', 'utf8');
for (const a of additions) {
    if (cfg.includes(a.fn)) {
        console.log('skip existing', a.fn);
        continue;
    }
    const block =
        `    {\n        fn: '${a.fn}',\n        var: '${a.var}',\n        keys: [\n` +
        a.keys.map((k) => `            '${k}',`).join('\n') +
        `\n        ],\n    },\n`;
    cfg = cfg.replace(
        '];\n\nexport const ALL_SCOPE_BAG_FRAGMENT_KEYS',
        block + '];\n\nexport const ALL_SCOPE_BAG_FRAGMENT_KEYS',
    );
    console.log('added', a.fn, a.keys.length);
}
fs.writeFileSync('scripts/scope-bag-fragment-config.mjs', cfg, 'utf8');
