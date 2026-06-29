import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function parseBagKeys(block) {
    return block
        .split('\n')
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && /^[A-Za-z0-9_]+$/.test(l));
}

const handlerStart = core.indexOf('    const handlerRuntimeBag = {');
const handlerEnd = core.indexOf('    };', handlerStart) + '    };'.length;
const handlerBody = core.slice(handlerStart + '    const handlerRuntimeBag = {'.length, handlerEnd - '    };'.length);

const scopeStart = core.indexOf('    const scopeRuntimeBag = {');
const scopeEnd = core.indexOf('    };', scopeStart) + '    };'.length;
const scopeBody = core.slice(scopeStart + '    const scopeRuntimeBag = {'.length, scopeEnd - '    };'.length);

const handlerKeys = parseBagKeys(handlerBody);
const scopeKeys = parseBagKeys(scopeBody);
const allKeys = [...new Set([...handlerKeys, ...scopeKeys])];
const bagLines = allKeys.map((k) => `        ${k},`).join('\n');

// Remove handlerRuntimeBag block through handlerCluster );
const hcBlockStart = core.indexOf('    const handlerRuntimeBag = {');
const hcBlockEnd =
    core.indexOf('    );', core.indexOf('    const handlerCluster = useExecutionDashboardCoreHandlerCluster')) +
    '    );'.length;

// Remove scopeRuntimeBag block
const scopeBlockStart = core.indexOf('    const scopeRuntimeBag = {');
const scopeBlockEnd = scopeStart >= 0 ? scopeEnd : -1;

if (hcBlockStart < 0 || scopeBlockStart < 0) {
    console.error('bags not found');
    process.exit(1);
}

core = core.slice(0, hcBlockStart) + core.slice(hcBlockEnd);
// re-find scope after removal
const scopeStart2 = core.indexOf('    const scopeRuntimeBag = {');
const scopeEnd2 = core.indexOf('    };', scopeStart2) + '    };'.length;
core = core.slice(0, scopeStart2) + core.slice(scopeEnd2);

// Insert after specificDelivery block
const insertAt = core.indexOf('    const {\n        phoneBodyFingerprint,');
const mergedBlock = `
    const coreRuntimeVars = {
${bagLines}
    };

    const handlerClusterCore = buildHandlerClusterCoreInput(coreRuntimeVars);

    const handlerCluster = useExecutionDashboardCoreHandlerCluster(
        collectHandlerClusterContext({
            followupOrchestrator,
            seizureOrchestrator,
            coercionOrchestrator,
            dossierLifecyclePanel,
            claimFinancials,
            graceAndSummoning,
            debtorWorkspaceContext,
            subsequentNoticeFlow,
            followupTabAssembly,
            followupSeizureTabs,
            decisionsOrchestrator,
            core: handlerClusterCore,
        }),
    );

`;

core = core.slice(0, insertAt) + mergedBlock + core.slice(insertAt);

core = core.replace(
    'scopeLocalFlat: pickKeysFromRuntimeBag(scopeRuntimeBag, SCOPE_LOCAL_ALL_KEYS),',
    'scopeLocalFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_LOCAL_ALL_KEYS),',
);
core = core.replace(
    'scopeRestFlat: pickKeysFromRuntimeBag(scopeRuntimeBag, SCOPE_REST_ALL_KEYS),',
    'scopeRestFlat: pickKeysFromRuntimeBag(coreRuntimeVars, SCOPE_REST_ALL_KEYS),',
);
core = core.replace(
    '...pickCoreAssemblyHandlers(scopeRuntimeBag),',
    '...pickCoreAssemblyHandlers(coreRuntimeVars),',
);

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice26b OK, coreRuntimeVars keys:', allKeys.length);
console.log('core lines:', core.split('\n').length);
