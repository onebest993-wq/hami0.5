import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
const core = fs.readFileSync(corePath, 'utf8');

const FRAGMENT_KEYS = new Set([
    // followupTabAssemblyScopeFragment
    'executionDomainContext',
    'followupSpecialization',
    'followupSpecializationEffective',
    'showPersonalCoerciveFollowupTab',
    'showSalarySeizureInFollowupModal',
    'followupSalarySeizureLabel',
    'showEmployeeCompulsoryProceduresBanner',
    'activeFollowupDebtorKey',
    'personalTabUnlockByDebtor',
    'setPersonalTabUnlockByDebtor',
    'employeePersonalTabUnlockStorageKey',
    'custodyRemovalClaimActive',
    'employeeCoerciveDetentionRestricted',
    'modalEmployeeCoerciveDetentionRestricted',
    'modalShowPersonalCoerciveFollowupTab',
    'personalTabLockedForEmployee',
    'modalPersonalTabLockedForEmployee',
    'followupTabsRestricted',
    'followupSectionTabOrder',
    'followupModalTabs',
    'isFollowupTabActive',
    'openFollowupModalPersisted',
    'closeFollowupModalPersisted',
    'persistFollowupModalViewport',
    'goFollowupSectionTabByDelta',
    // runtimeBindingsScopeFragment
    'insertTimelineEventToSupabase',
    'syncSeizedAssets',
    'syncSeizureDrafts',
    'syncActiveCoerciveActions',
    'evictionExecutorWorkflow',
    'seizedAssetsModalExecutionId',
    'totalExecutionExpenses',
    'initialFileNumber',
    // notesTasksHandlersScopeFragment
    'handleAddTimelineEvent',
    'handleCompleteTask',
    'handleDeleteTask',
    'handleMemoFollowupClick',
    'handleSaveTask',
    'handleUpdateTask',
    'commitDossierNote',
]);

const flatStart = core.indexOf('groupExecutionDashboardCoreScopeBagInput({');
if (flatStart < 0) throw new Error('flat scope bag call not found');
const flatEnd = core.indexOf('        }),\n    );', flatStart);
if (flatEnd < 0) throw new Error('flat scope bag call end not found');

const flatBlock = core.slice(flatStart, flatEnd);
const keys = [...flatBlock.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((m) => m[1]);
const restKeys = keys.filter((k) => !FRAGMENT_KEYS.has(k));

if (restKeys.length + FRAGMENT_KEYS.size !== keys.length) {
    const missing = [...FRAGMENT_KEYS].filter((k) => !keys.includes(k));
    if (missing.length) console.warn('fragment keys not in flat list:', missing.join(', '));
}

const restLines = restKeys.map((k) => `            ${k},`).join('\n');

const newCall = `buildExecutionDashboardCoreScopeBagsFromFragments(
        followupTabAssemblyScopeFragment(followupTabAssembly),
        runtimeBindingsScopeFragment(scopeRuntimeBindings),
        notesTasksHandlersScopeFragment(notesTasksHandlers),
        {
${restLines}
        },
    )`;

const oldCallStart = core.indexOf('    } = buildExecutionDashboardCoreScopeBags(\n        groupExecutionDashboardCoreScopeBagInput({');
if (oldCallStart < 0) throw new Error('scope bag destructure not found');
const oldCallEnd = core.indexOf('        }),\n    );', oldCallStart) + '        }),\n    );'.length;

const newCore =
    core.slice(0, oldCallStart) +
    `    } = ${newCall}` +
    core.slice(oldCallEnd);

fs.writeFileSync(corePath, newCore, 'utf8');
console.log('generate-scope-bag-rest: OK');
console.log('rest keys:', restKeys.length, 'fragment keys:', FRAGMENT_KEYS.size);
console.log('core lines:', newCore.split('\n').length);
