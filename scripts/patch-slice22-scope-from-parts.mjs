import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

// Remove unused followupOrchestrator destructure keys (scope-only via fragment)
const unused = [
    'specialRequestTemplatePick',
    'inlineActionGateKey',
    'setInlineActionGateKey',
    'dossierActionModalOpen',
    'dossierActionModalType',
    'dossierActionModalSaving',
    'solidaryCoerciveActionPending',
    'alimonyBeneficiaryDeathModalOpen',
    'alimonyBeneficiaryDeathModalProfile',
    'heirSummonsDatePickerOpenByHeir',
    'setLawyerFeeDisburseMode',
    'policeAssistanceModalOpen',
    'followupExpandProcedureKey',
    'consumeFollowupExpandProcedure',
    'policeAssistanceRequestTitle',
    'policeAssistanceAgencyDraft',
    'summonsHubInitialMainTab',
    'setSummonsHubInitialMainTab',
    'setSummonsContextDebtorKey',
];

for (const key of unused) {
    core = core.replace(new RegExp(`\\n\\s+${key},`, 'g'), '');
}

// Replace scope assembly block with buildExecutionDashboardCoreScopeFromParts
const localStart = core.indexOf('    const scopeLocalBundles = buildExecutionDashboardCoreScopeLocalBundles({');
const bagsDestructure = core.indexOf('    const {\n        followupScopeBag,', localStart);
const bagsEnd = core.indexOf('    });', core.indexOf('...scopeRestBundles,', localStart)) + '    });'.length;

if (localStart < 0 || bagsDestructure < 0) {
    console.error('scope block not found');
    process.exit(1);
}

const localBlock = core.slice(localStart, core.indexOf('    const scopeRuntimeBindings =', localStart));
const restStart = core.indexOf('    const scopeRestBundles = buildExecutionDashboardCoreScopeRestBundles({', localStart);
const restEnd = core.indexOf('    });', restStart) + '    });'.length;
const restBlock = core.slice(restStart, restEnd);

const runtimeStart = core.indexOf('    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings({', localStart);
const runtimeEnd = core.indexOf('    } = scopeRuntimeBindings;', runtimeStart) + '    } = scopeRuntimeBindings;'.length;
const runtimeBlock = core.slice(runtimeStart, runtimeEnd);

const assemblyBlock = core.slice(bagsDestructure, bagsEnd);
const assemblyInnerStart = assemblyBlock.indexOf('buildExecutionDashboardCoreScopeBagAssembly({') + 'buildExecutionDashboardCoreScopeBagAssembly({'.length;
const assemblyInnerEnd = assemblyBlock.lastIndexOf('...scopeRestBundles,');
const assemblyHandlersBody = assemblyBlock.slice(assemblyInnerStart, assemblyInnerEnd).trim();

const localInputStart = localBlock.indexOf('{') + 1;
const localInputEnd = localBlock.lastIndexOf('});');
const localInputBody = localBlock.slice(localInputStart, localInputEnd);

const restInputStart = restBlock.indexOf('{') + 1;
const restInputEnd = restBlock.lastIndexOf('});');
const restInputBody = restBlock.slice(restInputStart, restInputEnd);

const replacement = `${runtimeBlock}

    const {
        followupScopeBag,
        coerciveScopeBag,
        decisionsSeizureEvictionScopeBag,
        workspaceScopeBag,
        timelineDossierScopeBag,
        financialScopeBag,
    } = buildExecutionDashboardCoreScopeFromParts({
        scopeRuntimeBindings,
        assemblyHandlers: {
${assemblyHandlersBody}
        },
        localBundleInput: {
${localInputBody}
        },
        restBundleInput: {
${restInputBody}
        },
    });`;

core = core.slice(0, localStart) + replacement + core.slice(bagsEnd);

if (!core.includes('buildExecutionDashboardCoreScopeFromParts')) {
    core = core.replace(
        "import { buildExecutionDashboardCoreScopeBagAssembly } from './executionDashboardCore/buildExecutionDashboardCoreScopeBagAssembly.generated';",
        `import { buildExecutionDashboardCoreScopeFromParts } from './executionDashboardCore/buildExecutionDashboardCoreScopeFromParts';`,
    );
    core = core.replace(
        "import { buildExecutionDashboardCoreScopeLocalBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeLocalBundles';\nimport { buildExecutionDashboardCoreScopeRestBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeRestBundles';",
        '',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice22-scope-from-parts: OK');
console.log('core lines:', core.split('\n').length);
