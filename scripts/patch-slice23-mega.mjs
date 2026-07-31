import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

const coreKeys = JSON.parse(
    fs.readFileSync('scripts/handler-cluster-core-keys.json', 'utf8'),
);

function stripDestructureAndPrefix(source, varName) {
    const hookIdx = source.indexOf(`const ${varName} = `);
    if (hookIdx < 0) {
        console.warn('skip prefix', varName);
        return source;
    }
    const destructureStart = source.indexOf('const {', hookIdx);
    const destructureEnd = source.indexOf(`} = ${varName};`, destructureStart);
    if (destructureStart < 0 || destructureEnd < 0) return source;

    const block = source.slice(destructureStart, destructureEnd);
    const keys = [...block.matchAll(/\n\s+([A-Za-z0-9_]+),?\s*$/gm)].map((m) => m[1]);

    let before = source.slice(0, destructureStart);
    let after = source.slice(destructureEnd + `} = ${varName};`.length);

    keys.sort((a, b) => b.length - a.length);
    for (const key of keys) {
        const re = new RegExp(`(?<!(?:${varName})\\.)\\b${key}\\b`, 'g');
        after = after.replace(re, `${varName}.${key}`);
    }

    console.log('prefixed', varName, keys.length, 'keys');
    return before + after;
}

// Order: inner orchestrators first if nested - dossier before followup? no overlap issue
for (const v of ['followupOrchestrator', 'coercionOrchestrator', 'seizureOrchestrator', 'dossierLifecyclePanel']) {
    core = stripDestructureAndPrefix(core, v);
}

// Replace handler cluster ctx call
const hcStart = core.indexOf('    const handlerCluster = useExecutionDashboardCoreHandlerCluster({');
const hcEnd = core.indexOf('    });', hcStart) + '    });'.length;
if (hcStart < 0) throw new Error('handlerCluster call not found');

const coreShorthand = coreKeys.map((k) => `        ${k},`).join('\n');
const hcReplacement = `    const handlerClusterCore = {
${coreShorthand}
    };

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
    );`;

core = core.slice(0, hcStart) + hcReplacement + core.slice(hcEnd);

// Remove handler cluster destructure
const hcdStart = core.indexOf('    const {\n        firstActiveAppealDecisionId,');
const hcdEnd = core.indexOf('    } = handlerCluster;', hcdStart) + '    } = handlerCluster;'.length;
if (hcdStart >= 0 && hcdEnd > hcdStart) {
    core = core.slice(0, hcdStart) + core.slice(hcdEnd);
    console.log('removed handlerCluster destructure');
}

// Fix double-prefixed orchestrator from prefix pass on handlerCluster block (shouldn't happen)

// Replace scope from parts - extract and regroup local + rest
const sfpStart = core.indexOf('    } = buildExecutionDashboardCoreScopeFromParts({');
const sfpCallStart = core.lastIndexOf('    const {', sfpStart);
const sfpEnd = core.indexOf('    });', sfpStart) + '    });'.length;

const localStart = core.indexOf('        localBundleInput: {', sfpCallStart);
const localEnd = core.indexOf('        },', localStart) + '        },'.length;
const restStart = core.indexOf('        restBundleInput: {', localEnd);
const restEnd = core.indexOf('        },', restStart) + '        },'.length;
const asmStart = core.indexOf('        assemblyHandlers: {', sfpCallStart);
const asmEnd = core.indexOf('        },', asmStart) + '        },'.length;

const localBody = core.slice(localStart + '        localBundleInput: {'.length, localEnd - '        },'.length);
const restBody = core.slice(restStart + '        restBundleInput: {'.length, restEnd - '        },'.length);

function parseShorthandKeys(body) {
    return body
        .split('\n')
        .map((l) => l.trim().replace(/,$/, ''))
        .filter((l) => l && /^[A-Za-z0-9_]+$/.test(l));
}

const localKeys = parseShorthandKeys(localBody);
const restKeys = parseShorthandKeys(restBody);

const localGroups = {
    timeline: [
        'timelineAccordionExpanded', 'setTimelineAccordionExpanded', 'activeTimelineFilter', 'setActiveTimelineFilter',
        'timelineEvents', 'setTimelineEvents', 'timelineEditDraft', 'setTimelineEditDraft', 'timelineFilterOptions',
        'timelineDebtorMetadata', 'timelineRadarPreviewLimit', 'activeTimelineEvents', 'activeTimelineEventsDebtorScoped',
        'showOnlyActiveFileTimeline', 'setShowOnlyActiveFileTimeline', 'mergedTimelineEvents', 'mergeSimilarRecentTimelineEvent',
        'nextTimelineId', 'trashedCaseNotes', 'trashedCaseTasks', 'trashedTimelineEvents',
    ],
    execution: [
        'executionData', 'executionDataRef', 'executionId', 'viewExecutionData', 'currentFile', 'currentFileId', 'file',
        'fileNumber', 'fileYear', 'executionStatus', 'executionPaused', 'executionReportPrompt', 'executionAppealBanner',
        'executionMemoBadgePopoverOpen', 'onClose', 'onUpdate', 'activeSubFileId', 'docNumber', 'activeTabId', 'setActiveTabId',
        'childDossiers', 'subFiles', 'parentDossierId', 'parentExecutionFile', 'hasChildDossiers', 'visitChildNames',
        'linkedDossierToView', 'setLinkedDossierToView',
    ],
    seizure: [
        'seizedAssets', 'setSeizedAssets', 'seizureDraftsByDecisionId', 'setSeizureDraftsByDecisionId', 'seizureMatrix',
        'seizureMatrixLedgerParamsRef', 'seizureDetailCompletion', 'movableSeizureRegistryAssets', 'realEstateSeizureAssets',
        'realEstateSeizureRegistryAssets', 'salarySeizureRegistryAssets', 'thirdPartySeizureAssets', 'thirdPartySeizureRegistryAssets',
        'thirdPartySeizuresUi', 'setThirdPartySeizuresUi',
    ],
    notes: [
        'noteBody', 'setNoteBody', 'noteTitle', 'setNoteTitle', 'editingNoteId', 'editingAppointmentId', 'editingTaskId',
        'setEditingAppointmentId', 'setEditingTaskId', 'appointmentDateOnly', 'setAppointmentDateOnly', 'appointmentPurpose',
        'setAppointmentPurpose', 'setAppointmentTimeOptional', 'savedNotesSplit', 'savedNotesView', 'setSavedNotesView',
        'caseTasksPending', 'setCaseTasksPending', 'setIsTask', 'setTaskDueDate', 'setTaskStatus', 'isTask', 'dockPinnedNotes', 'dockPinnedTasks',
    ],
    financial: [
        'financialLedger', 'financialStatus', 'hasFinancialLedger', 'paidClientFees', 'paidCourtFees', 'paidDebt',
        'paidDirectorateFees', 'paymentAmount', 'paymentDate', 'setPaymentAmount', 'setPaymentDate', 'total_execution_expenses',
    ],
};

const restGroups = {
    runtimeFns: ['getMilestoneTimelineSnapshot', 'todayYmd'],
    eviction: [
        'appendEvictionExecutorRequest', 'appendEvictionProcedure', 'evictionFullAddressField', 'evictionGraceBadgeInfo',
        'evictionGraceHidden', 'evictionGracePinned', 'evictionPremisesUseResolved', 'evictionProcedureLockHint',
        'evictionPropertyDistrict', 'evictionPropertyNumber', 'evictionPropertyTypeField', 'graceHiddenKey', 'gracePeriodEnded',
        'residentialGracePeriodSaved', 'residentialVacateDeadlineMaxIso',
        'toggleEvictionGracePinned', 'setEvictionGraceHidden',
    ],
    summons: [
        'setDebtorNotificationDate', 'setDebtorSummonsMarkerLocal', 'debtorNotificationDate', 'debtorSummonsMarkerLocal',
        'setSummonsMarkerPopoverOpen', 'setSummonsPurposeDraft', 'summonsMarkerPopoverOpen', 'summonsPurposeDraft', 'notificationCount',
        'noticeVoluntaryPeriodEndOptimistic', 'voluntaryEndOptimistic', 'dismissDebtorAbsenceBadge', 'syncRollingCalendarSessions',
    ],
    modals: [
        'activeCoerciveActions', 'setActiveCoerciveActions', 'saveCoerciveActionRef', 'setShowCoerciveActionForm', 'setShowCoerciveModal',
        'showCoerciveModal', 'showExecutionTrashModal', 'showExtraCreditors', 'showExtraDebtors',
        'showJudgmentMeta', 'showToast', 'setShowExecutionTrashModal', 'setShowExtraCreditors', 'setShowExtraDebtors',
        'setShowUnifiedSummonsModal', 'setIsPaused', 'setPauseReason', 'setManualGraceCalendarExtra',
    ],
    followupDerived: [
        'followupModalDebtorIsDeceased', 'followupModalDebtorIsEmployee', 'followupModalSpecializationEffectiveWithEarnerGate',
        'followupSpecializationWithEarnerGate', 'modalKasabTerminationEmphasis', 'modalResolvedEmployeeSummonsAssignment',
        'modalShowEmployeeAssignmentCoerciveBlock',
    ],
    claimDisplay: [
        'claimType', 'claimTypeArabicDisplay', 'classificationDisplay', 'headerFields', 'judgmentDateDisplay',
        'parentClaimTypeArabicDisplay', 'parentClassificationDisplay', 'parentHeaderFields', 'parentJudgmentDateDisplay',
        'parentShowJudgmentMeta', 'parsedClientFees', 'parsedCourtFees', 'parsedDirectorateFees', 'parsedLawyerFees',
        'partyBadgesExecutionId', 'initiator', 'appealPerspective', 'isPersonalStatusExecutionClaim', 'isRepresentingDebtor',
        'isUnifiedTabActive', 'hideCoerciveTabsForDebtorAgent', 'hideExecutiveDetentionJudgeCard', 'shouldShowGuarantorExternalHub',
        'kasabTerminationEmphasis', 'daysRemainingUntilDeadline',
    ],
    partyDeath: [
        'creditorDeathMenuLabel', 'creditorExtraMinorLabel', 'creditorExtraMinorNames', 'debtorDeathMenuLabel', 'debtorEmploymentToggleMenuLabel',
    ],
    debtorProfile: [
        'activeDebtorIsDeceased', 'activeDebtorIsEmployee', 'activeDebtorIsLegalEntity', 'debtorEvaded',
        'employeeForcedBringAwaitingPersonalOutcome', 'isDebtorRowEmployee',
    ],
    masterState: [
        'statusMetadata', 'forcedBringDecisionState', 'forcedAttendanceIssued', 'stayOfExecutionActive', 'statuteStatus',
        'standaloneExecutionMarks', 'unifiedCollectionApproved', 'isPaused', 'pauseReason', 'permanentDeleteTimelineId',
        'setPermanentDeleteTimelineId', 'isHistoricalMode', 'isAssignmentDeadlinePassed', 'activeGraceTasks',
        'policeAssistanceBadgeInfo', 'publicationNoticeDeadlineYmd',
    ],
    inaba: ['inabaCorrespondenceLog', 'inabaTargets', 'isInabaActive'],
    executor: [
        'executorScheduleContext', 'executorScheduleModalOpen', 'setExecutorScheduleContext', 'setExecutorScheduleModalOpen',
        'setExecutionStorageTick', 'setExecutionReportPrompt', 'setExecutionMemoBadgePopoverOpen',
    ],
    breakInv: [
        'breakInventoryFurnitureModalCtx', 'breakInventoryFurnitureModalOpen', 'setBreakInventoryFurnitureModalCtx', 'setBreakInventoryFurnitureModalOpen',
    ],
    judicial: [
        'judicialCustodianModalCtx', 'judicialCustodianModalOpen', 'setJudicialCustodianModalCtx', 'setJudicialCustodianModalOpen',
    ],
    financialAlimony: [
        'guarantorFollowupAwaitingDetailsSave', 'lawyerFeePayoutApproved', 'lawyerStartedPostNoticeExecution',
        'specificDeliveryConvertedAmount', 'specificDeliveryFinancialized', 'accumulatedAlimony', 'monthlyAlimony', 'alimonyBeneficiaryProfile',
    ],
    header: ['toggleHeaderExpanded', 'isHeaderExpanded'],
    runtimeConstants: ['useExecutionDashboardStore', 'voiceUserId', 'resolveCalendarUserId'],
    handlerClusterExtras: [
        'showResidentialEvictionGraceControl', 'showResidentialGraceEarlyEndRequest', 'residentialGraceAllowsFieldwork',
        'showBreakInventoryRequest', 'firstActiveAppealDecisionId',
    ],
};

function renderGroup(name, keys) {
    const lines = keys.map((k) => `                ${k},`).join('\n');
    return `            ${name}: {\n${lines}\n            },`;
}

const localGrouped = Object.entries(localGroups).map(([n, ks]) => renderGroup(n, ks)).join('\n');
const _restGrouped = Object.entries(restGroups).map(([n, ks]) => renderGroup(n, ks)).join('\n');

// Fix firstActiveAppealDecisionId - use handlerCluster in claimDisplay group
restGroups.claimDisplay = restGroups.claimDisplay.filter((k) => k !== 'firstActiveAppealDecisionId');
restGroups.handlerClusterExtras = ['firstActiveAppealDecisionId', ...restGroups.handlerClusterExtras.filter((k) => k !== 'firstActiveAppealDecisionId')];

const asmBody = core.slice(asmStart + '        assemblyHandlers: {'.length, asmEnd - '        },'.length);
// Remove duplicate scopeRuntimeBindings and ...scopeLocalBundles from asm - handle in new template
const asmLines = asmBody
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && l !== '...scopeLocalBundles,' && l !== 'scopeRuntimeBindings,');

const newScopeBlock = `    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings({
        isEvictionExecutionModule,
        executionData,
        executionId,
        file,
        executorApprovalActions,
        total_execution_expenses,
        setSeizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        activeCoerciveActions,
        setActiveCoerciveActions,
    });

    const {
        insertTimelineEventToSupabase,
        syncSeizedAssets,
        syncSeizureDrafts,
        syncActiveCoerciveActions,
        evictionExecutorWorkflow,
        seizedAssetsModalExecutionId,
        totalExecutionExpenses,
        initialFileNumber,
    } = scopeRuntimeBindings;

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
            ...pickHandlerClusterAssemblyHandlers(handlerCluster),
${asmLines.map((l) => `            ${l}`).join('\n')}
        },
        localBundleInput: collectScopeLocalBundleInput({
${localGrouped}
        }),
        restBundleInput: collectScopeRestBundleInput({
${Object.entries(restGroups).map(([n, ks]) => renderGroup(n, ks)).join('\n')}
            handlerClusterExtras: pickHandlerClusterRestExtras(handlerCluster),
        }),
    });`;

// Replace from scopeRuntimeBindings block through scope from parts end - find scopeLocalBundles duplicate
const scopeReplaceStart = core.indexOf('    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings({');
const scopeReplaceEnd = sfpEnd;

if (scopeReplaceStart >= 0) {
    core = core.slice(0, scopeReplaceStart) + newScopeBlock + core.slice(scopeReplaceEnd);
}

// Imports
const importAdds = `import { collectHandlerClusterContext } from './executionDashboardCore/collectHandlerClusterContext';
import { pickHandlerClusterAssemblyHandlers, pickHandlerClusterRestExtras } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';
import { collectScopeLocalBundleInput } from './executionDashboardCore/collectScopeLocalBundleInput';
import { collectScopeRestBundleInput } from './executionDashboardCore/collectScopeRestBundleInput';
`;
if (!core.includes('collectHandlerClusterContext')) {
    core = core.replace(
        "import { buildExecutionDashboardCoreScopeFromParts } from './executionDashboardCore/buildExecutionDashboardCoreScopeFromParts';",
        importAdds + "import { buildExecutionDashboardCoreScopeFromParts } from './executionDashboardCore/buildExecutionDashboardCoreScopeFromParts';",
    );
}

// Remove buildExecutionDashboardCoreScopeLocalBundles import if unused
if (!core.includes('buildExecutionDashboardCoreScopeLocalBundles(')) {
    core = core.replace(
        "import { buildExecutionDashboardCoreScopeLocalBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeLocalBundles';\n",
        '',
    );
    core = core.replace(
        "import { buildExecutionDashboardCoreScopeRestBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeRestBundles';\n",
        '',
    );
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice23-mega: OK');
console.log('core lines:', core.split('\n').length);
console.log('local keys grouped', localKeys.length, 'rest keys grouped', restKeys.length);
