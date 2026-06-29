import fs from 'fs';

const CORE_ASSEMBLY_HANDLER_KEYS = [
    'followupTabAssembly', 'notesTasksHandlers', 'trashAndPinsHandlers', 'claimFinancials',
    'graceAndSummoning', 'ledgerSync', 'coerciveUiState', 'partyDeathHandlers',
    'employeeAssignmentHandlers', 'heirsNotificationHandlers', 'debtorSummonsCoerciveHandlers',
    'voluntaryPeriodHandlers', 'publicationNoticeHandlers', 'notifyDebtorHandler',
    'debtorEmploymentHandler', 'gracePeriodEndHandler', 'stayHandlers', 'dossierFollowupHandlers',
    'paymentHandlers', 'evictionResidentialGraceHandlers', 'evictionHeirsMemoHandlers',
    'policeAssistanceHandlers', 'breakInventoryHandlers', 'guarantorFollowupHandlers',
    'evictionFinancialHandlers', 'moduleExpenseHandlers', 'followupSeizureHandlers',
    'seizureAssetModalHandlers', 'thirdPartyReceiveHandlers', 'coerciveActionBridge',
    'coerciveActionHandlers', 'standaloneMarkHandlers', 'salarySeizurePatch',
    'thirdPartySeizureHandlers', 'realEstateSeizureHandlers', 'seizureReleaseHandlers',
    'followupSeizureTabs', 'persistExecutionMergeBinding', 'pushTimelineEventBinding',
    'pendingExecutorOpeners', 'appointmentHandler', 'parentDossierPersistence',
    'removeJudicialCustodianEntry', 'executorApprovalActions', 'otherPartyCreditorMirrorProps',
    'propertyInlineSaveCtx', 'salarySeizureTabRows', 'followupOrchestrator', 'seizureOrchestrator',
    'coercionOrchestrator', 'debtorWorkspaceContext', 'dossierLifecyclePanel', 'decisionsOrchestrator',
    'financialOrchestrator', 'partyEditWorkflow', 'unifiedSeizureLog', 'dossierLifecycleActions',
    'dossierMetaWorkflow', 'debtorSummonsProfileBundle', 'subsequentNoticeFlow',
];

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function parseShorthandKeys(body) {
    return body
        .split('\n')
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && /^[A-Za-z0-9_]+$/.test(l));
}

function extractBlock(text, startMarker, endMarker) {
    const start = text.indexOf(startMarker);
    if (start < 0) return null;
    const bodyStart = start + startMarker.length;
    const end = text.indexOf(endMarker, bodyStart);
    if (end < 0) return null;
    return { start, end: end + endMarker.length, body: text.slice(bodyStart, end) };
}

// --- fix invalid dependency array entries key: orchestrator.prop ---
core = core.replace(
    /(\}, \[\n)([\s\S]*?)(\n    \]\);)/g,
    (full, open, body, close) => {
        if (!/^\s+[A-Za-z0-9_]+:\s+(followup|coercion|seizure|dossier)/m.test(body)) {
            return full;
        }
        const fixed = body.replace(
            /^\s+([A-Za-z0-9_]+):\s+(followupOrchestrator|coercionOrchestrator|seizureOrchestrator|dossierLifecyclePanel)\.([A-Za-z0-9_]+),?\s*$/gm,
            '        $2.$3,',
        );
        return open + fixed + close;
    },
);

// --- handlerClusterCore -> pick from handlerRuntimeBag (same location) ---
const hcBlock = extractBlock(core, '    const handlerClusterCore = buildHandlerClusterCoreInput({\n', '\n    });');
if (!hcBlock) {
    console.error('handlerClusterCore block not found');
    process.exit(1);
}
const hcKeys = parseShorthandKeys(hcBlock.body);
const hcBagLines = hcKeys.map((k) => `        ${k},`).join('\n');
const hcReplacement = `    const handlerRuntimeBag = {
${hcBagLines}
    };

    const handlerClusterCore = buildHandlerClusterCoreInput(handlerRuntimeBag);`;
core = core.slice(0, hcBlock.start) + hcReplacement + core.slice(hcBlock.end);

// --- scope flats -> scopeRuntimeBag after specificDelivery ---
const localBlock = extractBlock(core, '        scopeLocalFlat: {\n', '\n        },');
const restBlock = extractBlock(core, '        scopeRestFlat: {\n', '\n        },');
if (!localBlock || !restBlock) {
    console.error('scope blocks not found');
    process.exit(1);
}
const localKeys = parseShorthandKeys(localBlock.body);
const restKeys = parseShorthandKeys(restBlock.body).filter((k) => k !== 'handlerClusterExtras');
const scopeKeys = [...new Set([...localKeys, ...restKeys, ...CORE_ASSEMBLY_HANDLER_KEYS])];
const scopeBagLines = scopeKeys.map((k) => `        ${k},`).join('\n');

const specificEnd = core.indexOf('    const {\n        phoneBodyFingerprint,');
const specificStart = core.lastIndexOf('    const specificDeliveryConvertedAmount =', specificEnd);
if (specificStart < 0 || specificEnd <= specificStart) {
    console.error('specificDelivery block not found');
    process.exit(1);
}

const scopeBagInsert = `\n    const scopeRuntimeBag = {
${scopeBagLines}
    };\n`;
core = core.slice(0, specificEnd) + scopeBagInsert + core.slice(specificEnd);

core = core.replace(
    /        scopeLocalFlat: \{[\s\S]*?\n        \},/,
    '        scopeLocalFlat: pickKeysFromRuntimeBag(scopeRuntimeBag, SCOPE_LOCAL_ALL_KEYS),',
);
core = core.replace(
    /        scopeRestFlat: \{[\s\S]*?\n        \},/,
    '        scopeRestFlat: pickKeysFromRuntimeBag(scopeRuntimeBag, SCOPE_REST_ALL_KEYS),',
);

// assemblyHandlers
const asmStart = core.indexOf('        assemblyHandlers: {');
const asmEnd = core.indexOf('\n        },', asmStart) + '\n        },'.length;
const asmReplacement = `        assemblyHandlers: {
            ...pickHandlerClusterAssemblyHandlers(handlerCluster),
            ...pickCoreAssemblyHandlers(scopeRuntimeBag),
        },`;
core = core.slice(0, asmStart) + asmReplacement + core.slice(asmEnd);

// modalScopeInput
const modalStart = core.indexOf('        modalScopeInput: {');
const modalEnd = core.indexOf('\n        },', modalStart) + '\n        },'.length;
const modalReplacement = `        modalScopeInput: buildExecutionDashboardCoreModalScopeInput({
            modals,
            setExecutionModal,
            showLinkedDossierTimeline,
            showTransferFileNumberChangeModal,
            setShowDecisionsModal,
            setShowDocumentsModal,
            setShowTimelineModal,
            setShowCoerciveModal,
            setShowNotificationModal,
            setShowUnifiedSummonsModal,
            setShowPaymentModal,
            setShowSeizedAssetsModal,
            setShowNotesModal,
            setShowAppointmentModal,
            setShowPaymentCalculator,
            setShowSettlementCalculator,
            setShowPauseModal,
            setShowLedgerModal,
            setShowEditDossierMetaModal,
            setShowLinkedDossierTimeline,
            setShowTransferFileNumberChangeModal,
            setEditingNoteId,
            followupOrchestrator,
            seizureOrchestrator,
        }),`;
core = core.slice(0, modalStart) + modalReplacement + core.slice(modalEnd);

// chunkSetupInput
const chunkStart = core.indexOf('        chunkSetupInput: {');
const chunkEnd = core.indexOf('\n        },', core.indexOf('            chunkDataReady:', chunkStart)) + '\n        },'.length;
const chunkReplacement = `        chunkSetupInput: {
            fingerprintInput: buildExecutionDashboardCoreChunkFingerprint({
                executionId,
                activeTabId,
                activeFinancialTab,
                activeTimelineFilter,
                executionPaused,
                dossierLifecyclePanel,
                toastEpoch,
                unifiedLedgerRevision,
                followupOrchestrator,
                showUnifiedSeizureLogModal,
                timelineAccordionExpanded,
                isFinancialCenterExpanded,
                isHeaderExpanded,
                coercionOrchestrator,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
            }),
            chunkDataReady: Boolean(executionData),
        },`;
core = core.slice(0, chunkStart) + chunkReplacement + core.slice(chunkEnd);

// imports
const importLines = [
    "import { pickKeysFromRuntimeBag } from './executionDashboardCore/pickKeysFromRuntimeBag';",
    "import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';",
    "import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';",
    "import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';",
    "import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';",
];
for (const line of importLines) {
    const sym = line.match(/import \{ ([^}]+) \}/)?.[1]?.split(',')[0]?.trim();
    if (sym && !core.includes(`from './executionDashboardCore/pickKeysFromRuntimeBag'`) && line.includes('pickKeysFromRuntimeBag')) {
        core = core.replace(
            "import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';",
            line + "\nimport { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';",
        );
    } else if (sym && !core.includes(sym)) {
        core = core.replace(
            "import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';",
            line + "\nimport { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';",
        );
    }
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice25 OK');
console.log('handlerRuntimeBag keys:', hcKeys.length);
console.log('scopeRuntimeBag keys:', scopeKeys.length);
console.log('core lines:', core.split('\n').length);
