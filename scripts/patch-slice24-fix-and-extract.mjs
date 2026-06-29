import fs from 'fs';
import { execSync } from 'child_process';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';

const headCore = execSync(`git show HEAD:${corePath}`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const headExportIdx = headCore.indexOf('export function useExecutionDashboardCore');
if (headExportIdx < 0) throw new Error('HEAD export not found');
const headImports = headCore.slice(0, headExportIdx);

let core = fs.readFileSync(corePath, 'utf8');
const curExportIdx = core.indexOf('export function useExecutionDashboardCore');
if (curExportIdx < 0) throw new Error('current export not found');
const curBody = core.slice(curExportIdx);

// --- restore HEAD imports + slice 23/24 additions ---
const sliceImportLines = [
    "import { collectHandlerClusterContext } from './executionDashboardCore/collectHandlerClusterContext';",
    "import { pickHandlerClusterAssemblyHandlers, pickHandlerClusterRestExtras } from './executionDashboardCore/pickHandlerClusterAssemblyHandlers';",
    "import { collectScopeLocalBundleInput } from './executionDashboardCore/collectScopeLocalBundleInput';",
    "import { collectScopeRestBundleInput } from './executionDashboardCore/collectScopeRestBundleInput';",
    "import { buildHandlerClusterCoreInput } from './executionDashboardCore/buildHandlerClusterCoreInput';",
    "import { buildScopeLocalBundleGroups, buildScopeRestBundleGroups } from './executionDashboardCore/buildScopeBundleGroups';",
    "import { useExecutionDashboardCoreScopeAndChunk } from './executionDashboardCore/useExecutionDashboardCoreScopeAndChunk';",
    "import { useExecutionDashboardSeizureLedgerOutcomeEffects } from './executionDashboardCore/useExecutionDashboardSeizureLedgerOutcomeEffects';",
];

let imports = headImports;
for (const line of sliceImportLines) {
    const sym = line.match(/import \{ ([^}]+) \}/)?.[1]?.split(',')[0]?.trim();
    if (sym && !imports.includes(sym)) {
        imports += line + '\n';
    }
}

// Remove unused local/rest bundle builder imports if present in HEAD
imports = imports.replace(
    "import { buildExecutionDashboardCoreScopeLocalBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeLocalBundles';\n",
    '',
);
imports = imports.replace(
    "import { buildExecutionDashboardCoreScopeRestBundles } from './executionDashboardCore/buildExecutionDashboardCoreScopeRestBundles';\n",
    '',
);

core = imports + curBody;

// --- fix orchestrator prefix ONLY inside object literals passed to hooks ---
function fixOrchestratorObjectLiteralShorthands(source) {
    const hookObjRe = /(\.use[A-Za-z0-9_]+\(\{)([\s\S]*?)(\n\s*\}\);)/g;
    return source.replace(hookObjRe, (full, open, body, close) => {
        const fixedBody = body.replace(
            /^(\s+)(followupOrchestrator|coercionOrchestrator|seizureOrchestrator|dossierLifecyclePanel)\.([A-Za-z0-9_]+),\s*$/gm,
            '$1$3: $2.$3,',
        );
        return open + fixedBody + close;
    });
}

core = fixOrchestratorObjectLiteralShorthands(core);

// --- fix invalid modal scope keys ---
const modalFixes = [
    [
        /followupOrchestrator\.showEvictionExpenseModal: modals\.followupOrchestrator\.showEvictionExpenseModal,/g,
        'showEvictionExpenseModal: modals.showEvictionExpenseModal,',
    ],
    [
        /followupOrchestrator\.showEvictionLawyerFeeModal: modals\.followupOrchestrator\.showEvictionLawyerFeeModal,/g,
        'showEvictionLawyerFeeModal: modals.showEvictionLawyerFeeModal,',
    ],
    [
        /followupOrchestrator\.showEvictionResidentialGraceModal: modals\.followupOrchestrator\.showEvictionResidentialGraceModal,/g,
        'showEvictionResidentialGraceModal: modals.showEvictionResidentialGraceModal,',
    ],
    [
        /seizureOrchestrator\.showGuarantorDetailsModal: modals\.seizureOrchestrator\.showGuarantorDetailsModal,/g,
        'showGuarantorDetailsModal: modals.showGuarantorDetailsModal,',
    ],
    [
        /followupOrchestrator\.showHeirsNotificationModal: modals\.followupOrchestrator\.showHeirsNotificationModal,/g,
        'showHeirsNotificationModal: modals.showHeirsNotificationModal,',
    ],
    [
        /seizureOrchestrator\.showRealEstateSeizureModal: modals\.seizureOrchestrator\.showRealEstateSeizureModal,/g,
        'showRealEstateSeizureModal: modals.showRealEstateSeizureModal,',
    ],
    [
        /followupOrchestrator\.showSolidaryCoerciveTargetModal: modals\.followupOrchestrator\.showSolidaryCoerciveTargetModal,/g,
        'showSolidaryCoerciveTargetModal: modals.showSolidaryCoerciveTargetModal,',
    ],
    [
        /followupOrchestrator\.showStayOfExecutionModal: modals\.followupOrchestrator\.showStayOfExecutionModal,/g,
        'showStayOfExecutionModal: modals.showStayOfExecutionModal,',
    ],
    [
        /setShowUnifiedExecutionModal: followupOrchestrator\.setShowUnifiedExecutionModal,/g,
        'setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,',
    ],
    [
        /setShowEvictionExpenseModal: followupOrchestrator\.setShowEvictionExpenseModal,/g,
        'setShowEvictionExpenseModal: followupOrchestrator.setShowEvictionExpenseModal,',
    ],
    [
        /setShowEvictionLawyerFeeModal: followupOrchestrator\.setShowEvictionLawyerFeeModal,/g,
        'setShowEvictionLawyerFeeModal: followupOrchestrator.setShowEvictionLawyerFeeModal,',
    ],
    [
        /setShowEvictionResidentialGraceModal: followupOrchestrator\.setShowEvictionResidentialGraceModal,/g,
        'setShowEvictionResidentialGraceModal: followupOrchestrator.setShowEvictionResidentialGraceModal,',
    ],
    [
        /setShowGuarantorDetailsModal: seizureOrchestrator\.setShowGuarantorDetailsModal,/g,
        'setShowGuarantorDetailsModal: seizureOrchestrator.setShowGuarantorDetailsModal,',
    ],
    [
        /setShowHeirsNotificationModal: followupOrchestrator\.setShowHeirsNotificationModal,/g,
        'setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,',
    ],
    [
        /setShowRealEstateSeizureModal: seizureOrchestrator\.setShowRealEstateSeizureModal,/g,
        'setShowRealEstateSeizureModal: seizureOrchestrator.setShowRealEstateSeizureModal,',
    ],
    [
        /setShowSolidaryCoerciveTargetModal: followupOrchestrator\.setShowSolidaryCoerciveTargetModal,/g,
        'setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,',
    ],
    [
        /setShowStayOfExecutionModal: followupOrchestrator\.setShowStayOfExecutionModal,/g,
        'setShowStayOfExecutionModal: followupOrchestrator.setShowStayOfExecutionModal,',
    ],
];
for (const [re, rep] of modalFixes) core = core.replace(re, rep);

// parentExecutionFile bug
core = core.replace(
    'parentExecutionFile?.followupOrchestrator.evictionCaseExpenses',
    'parentExecutionFile?.evictionCaseExpenses',
);
core = core.replace(
    'parentExecutionFile.followupOrchestrator.evictionCaseExpenses',
    'parentExecutionFile.evictionCaseExpenses',
);

// remove garbage keys from handlerClusterCore object
const garbageKeys = ['some', 'string', 'success', 'trim', 'unknown', 'useLayoutEffect'];
for (const g of garbageKeys) {
    core = core.replace(new RegExp(`\\n        ${g},`, 'g'), '\n');
}

// remove duplicate handlerClusterExtras block (keep pickHandlerClusterRestExtras only)
core = core.replace(
    /            handlerClusterExtras: \{\n                firstActiveAppealDecisionId,\n                showResidentialEvictionGraceControl,\n                showResidentialGraceEarlyEndRequest,\n                residentialGraceAllowsFieldwork,\n                showBreakInventoryRequest,\n            },\n            handlerClusterExtras: pickHandlerClusterRestExtras\(handlerCluster\),/,
    '            handlerClusterExtras: pickHandlerClusterRestExtras(handlerCluster),',
);

// --- replace outcome effects block ---
const outcomeStart = core.indexOf('    useThirdPartyFundsReceivedOutcome({');
const outcomeEnd = core.indexOf('    const ledgerSync = useExecutionDashboardLedgerSync({');
if (outcomeStart >= 0 && outcomeEnd > outcomeStart) {
    const outcomeReplacement = `    useExecutionDashboardSeizureLedgerOutcomeEffects({
        executionDataRef,
        executionDataId: executionData?.id,
        executionId,
        decisionsStorageExecutionId,
        setThirdPartySeizuresUi,
        clearThirdPartyFundsDraft,
        getLedgerParams: () => seizureMatrixLedgerParamsRef.current,
        setTimelineEvents,
        nextTimelineId,
        persistExecutionMergeRef,
        onLedgerRevision: () => setUnifiedLedgerRevision((v) => v + 1),
        showToast,
        applyThirdPartySeizuresFromPatch,
        pushTimelineEventRef,
        seizureMatrixLedgerParamsRef,
        focusSeizurePropertyInlineRef,
        focusSeizureMovableInlineRef,
        focusSeizureThirdPartyInlineRef,
        focusSeizureNoticeInlineRef,
        openSeizureRequestsTabRef: followupOrchestrator.openSeizureRequestsTabRef,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
        setUnifiedLedgerRevision,
        setEvictionAssetsTabUnlocked: followupOrchestrator.setEvictionAssetsTabUnlocked,
        seizedAssetsSnapshotRef,
        setSeizedAssets,
        setFinancialHubAutoOpenMode,
        setFinancialHubSeizedMovableId,
        setFinancialHubSeizedPropertyId,
        openFinancialHubLedger,
    });

`;
    core = core.slice(0, outcomeStart) + outcomeReplacement + core.slice(outcomeEnd);
    console.log('extracted seizure ledger outcome effects');
}

// --- handlerClusterCore -> buildHandlerClusterCoreInput ---
core = core.replace(
    '    const handlerClusterCore = {',
    '    const handlerClusterCore = buildHandlerClusterCoreInput({',
);
core = core.replace(
    /(\n    \};\n\n    const handlerCluster = useExecutionDashboardCoreHandlerCluster)/,
    '\n    });\n\n    const handlerCluster = useExecutionDashboardCoreHandlerCluster',
);

function flattenGroupedObjectLiteral(body) {
    const keys = [];
    for (const line of body.split('\n')) {
        const t = line.trim().replace(/,$/, '');
        if (!t || t.startsWith('//')) continue;
        if (t.endsWith(': {')) continue;
        if (t === '},' || t === '}') continue;
        if (/^[A-Za-z0-9_]+: /.test(t)) {
            keys.push(t.split(':')[0].trim());
            continue;
        }
        if (/^[A-Za-z0-9_]+$/.test(t)) keys.push(t);
    }
    return keys;
}

function extractGroupBody(text, marker) {
    const start = text.indexOf(marker);
    if (start < 0) return '';
    const bodyStart = start + marker.length;
    const end = text.indexOf('\n        }),', bodyStart);
    return text.slice(bodyStart, end);
}

// --- extract scope+modal+chunk to useExecutionDashboardCoreScopeAndChunk ---
const scopeStart = core.indexOf('    const specificDeliveryConvertedAmount =');
const scopeEnd = core.indexOf('    return {\n        isLoading,');
if (scopeStart >= 0 && scopeEnd > scopeStart) {
    const scopeBlock = core.slice(scopeStart, scopeEnd);
    const localBody = extractGroupBody(scopeBlock, 'localBundleInput: collectScopeLocalBundleInput({');
    const restBody = extractGroupBody(scopeBlock, 'restBundleInput: collectScopeRestBundleInput({');
    const localKeys = flattenGroupedObjectLiteral(localBody);
    const restKeys = flattenGroupedObjectLiteral(restBody);

    const asmStart = scopeBlock.indexOf('assemblyHandlers: {');
    const asmEnd = scopeBlock.indexOf('\n        },', asmStart);
    let asmBody = scopeBlock.slice(asmStart + 'assemblyHandlers: {'.length, asmEnd);
    asmBody = asmBody
        .split('\n')
        .filter((l) => !l.includes('pickHandlerClusterAssemblyHandlers'))
        .join('\n');

    const localFlat = localKeys.map((k) => `            ${k},`).join('\n');
    const restFlat = restKeys.map((k) => `            ${k},`).join('\n');

    const scopeReplacement = `    const specificDeliveryConvertedAmount =
        (executionData as { specificDeliveryConvertedAmount?: number | null } | null | undefined)
            ?.specificDeliveryConvertedAmount ?? null;
    const specificDeliveryFinancialized = Boolean(
        (executionData as { specificDeliveryFinancialized?: boolean } | null | undefined)
            ?.specificDeliveryFinancialized,
    );

    const {
        phoneBodyFingerprint,
        phoneBodyReady,
        shellOverlaysReady,
        chunkScopeRef,
    } = useExecutionDashboardCoreScopeAndChunk({
        specificDeliveryConvertedAmount,
        specificDeliveryFinancialized,
        scopeRuntimeInput: {
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
        },
        handlerCluster,
        assemblyHandlers: {${asmBody}
        },
        scopeLocalFlat: {
${localFlat}
        },
        scopeRestFlat: {
${restFlat}
        },
        modalScopeInput: {
            modals,
            setExecutionModal,
            showUnifiedExecutionModal: modals.showUnifiedExecutionModal,
            showDecisionsModal: modals.showDecisionsModal,
            showDocumentsModal: modals.showDocumentsModal,
            showTimelineModal: modals.showTimelineModal,
            showCoerciveModal: modals.showCoerciveModal,
            showNotificationModal: modals.showNotificationModal,
            showUnifiedSummonsModal: modals.showUnifiedSummonsModal,
            showPaymentModal: modals.showPaymentModal,
            showSeizedAssetsModal: modals.showSeizedAssetsModal,
            showNotesModal: modals.showNotesModal,
            showAppointmentModal: modals.showAppointmentModal,
            showPaymentCalculator: modals.showPaymentCalculator,
            showSettlementCalculator: modals.showSettlementCalculator,
            showPauseModal: modals.showPauseModal,
            showLedgerModal: modals.showLedgerModal,
            showEditDossierMetaModal: modals.showEditDossierMetaModal,
            showEvictionExpenseModal: modals.showEvictionExpenseModal,
            showEvictionLawyerFeeModal: modals.showEvictionLawyerFeeModal,
            showEvictionResidentialGraceModal: modals.showEvictionResidentialGraceModal,
            showGuarantorDetailsModal: modals.showGuarantorDetailsModal,
            showHeirsNotificationModal: modals.showHeirsNotificationModal,
            showLinkedDossierTimeline,
            showRealEstateSeizureModal: modals.showRealEstateSeizureModal,
            showSolidaryCoerciveTargetModal: modals.showSolidaryCoerciveTargetModal,
            showStayOfExecutionModal: modals.showStayOfExecutionModal,
            showTransferFileNumberChangeModal,
            setShowUnifiedExecutionModal: followupOrchestrator.setShowUnifiedExecutionModal,
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
            setShowEvictionExpenseModal: followupOrchestrator.setShowEvictionExpenseModal,
            setShowEvictionLawyerFeeModal: followupOrchestrator.setShowEvictionLawyerFeeModal,
            setShowEvictionResidentialGraceModal: followupOrchestrator.setShowEvictionResidentialGraceModal,
            setShowGuarantorDetailsModal: seizureOrchestrator.setShowGuarantorDetailsModal,
            setShowHeirsNotificationModal: followupOrchestrator.setShowHeirsNotificationModal,
            setShowLinkedDossierTimeline,
            setShowRealEstateSeizureModal: seizureOrchestrator.setShowRealEstateSeizureModal,
            setShowSolidaryCoerciveTargetModal: followupOrchestrator.setShowSolidaryCoerciveTargetModal,
            setShowStayOfExecutionModal: followupOrchestrator.setShowStayOfExecutionModal,
            setShowTransferFileNumberChangeModal,
            setEditingNoteId,
        },
        chunkSetupInput: {
            fingerprintInput: {
                executionId,
                activeTabId,
                activeFinancialTab,
                activeTimelineFilter,
                executionPaused,
                dossierLifecyclePanelOpen: dossierLifecyclePanel.dossierLifecyclePanelOpen,
                dossierLifecyclePanelPhase: dossierLifecyclePanel.dossierLifecyclePanelPhase,
                dossierLifecyclePopStyle: dossierLifecyclePanel.dossierLifecyclePopStyle,
                toastEpoch,
                dataRevision: unifiedLedgerRevision,
                executionDebtorTabIndex: followupOrchestrator.executionDebtorTabIndex,
                showUnifiedSeizureLogModal,
                timelineAccordionExpanded,
                isFinancialCenterExpanded,
                isHeaderExpanded,
                debtorAttendedVoluntarily: coercionOrchestrator.debtorAttendedVoluntarily,
                voluntaryAttendanceCount: coercionOrchestrator.voluntaryAttendanceCount,
                noticeVoluntaryPeriodEndOptimistic,
                voluntaryEndOptimistic,
                notificationCount,
                showExecutionFinancialHub,
            },
            chunkDataReady: Boolean(executionData),
        },
    });

`;
    core = core.slice(0, scopeStart) + scopeReplacement + core.slice(scopeEnd);
    console.log('extracted scope+modal+chunk hook, local keys', localKeys.length, 'rest keys', restKeys.length);
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice24 complete, core lines:', core.split('\n').length);
