import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function replaceBlock(startMarker, endMarker, replacement) {
    const start = core.indexOf(startMarker);
    const end = core.indexOf(endMarker, start);
    if (start < 0 || end <= start) {
        console.error('block not found', { startMarker: startMarker.slice(0, 60), endMarker: endMarker.slice(0, 60), start, end });
        process.exit(1);
    }
    core = core.slice(0, start) + replacement + core.slice(end);
}

if (!core.includes('useExecutionDashboardCoreFileMetadataBinding')) {
    core = core.replace(
        "import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';",
        `import { buildExecutionDashboardCoreRuntimeVars } from './executionDashboardCore/buildExecutionDashboardCoreRuntimeVars';
import { useExecutionDashboardCoreFileMetadataBinding } from './executionDashboardCore/useExecutionDashboardCoreFileMetadataBinding';
import { useExecutionDashboardCoreFollowupDebtorPipeline } from './executionDashboardCore/useExecutionDashboardCoreFollowupDebtorPipeline';
import { useExecutionDashboardCoreClaimFinancialLedgerPipeline } from './executionDashboardCore/useExecutionDashboardCoreClaimFinancialLedgerPipeline';
import { useExecutionDashboardCoreHandlerCluster } from './executionDashboardCore/useExecutionDashboardCoreHandlerCluster';
import { pickCoreAssemblyHandlers } from './executionDashboardCore/pickCoreAssemblyHandlers';
import { buildExecutionDashboardCoreModalScopeInput } from './executionDashboardCore/buildExecutionDashboardCoreModalScopeInput';
import { buildExecutionDashboardCoreChunkFingerprint } from './executionDashboardCore/buildExecutionDashboardCoreChunkFingerprint';
import { SCOPE_LOCAL_ALL_KEYS, SCOPE_REST_ALL_KEYS } from './executionDashboardCore/buildScopeBundleGroups';
import { useExecutionDashboardCoreScopeRuntimeBindings } from './executionDashboardCore/useExecutionDashboardCoreScopeRuntimeBindings';`,
    );
}

const metadataReplacement = `    const fileMetadataBinding = useExecutionDashboardCoreFileMetadataBinding({
        executionData,
        viewExecutionData,
        parentExecutionFile,
        followupOrchestrator,
        activeCoerciveActions,
        activeTimelineEvents,
    });

    const {
        directorate,
        fileNumber,
        fileYear,
        executionNumber,
        executionYear,
        executionType,
        docType,
        docNumber,
        claimType,
        judgmentDate,
        classification,
        creditors,
        debtors,
        totalAmount,
        debtAmount,
        lawyerFeesAmount,
        executionFee,
        clientFeesAmount,
        courtFees,
        directorateFees,
        monthlyAlimony,
        alimony,
        accumulatedAlimony,
        initiator,
        representedParty,
        daysSinceNotice,
        isAlimonyCase,
        lastPaymentDate,
        shariaDeedNumber,
        shariaRegisterNumber,
        shariaIssueDate,
        shariaIssuingCourt,
        chequeBankName,
        chequeIssueDate,
        chequeNumber,
        status,
        createdAt,
        includesSleepover,
        visitationChildrenNames,
        custodyWardNames,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        visitChildNames,
        custodyWardNamesList,
        evictionPremisesUseResolved,
        evictionCaseExpensesSum,
        creditorExtraMinorNames,
        creditorExtraMinorLabel,
        classificationDisplay,
        claimTypeArabicDisplay,
        lawyerStartedPostNoticeExecution,
        judgmentDateDisplay,
        headerFields,
        showJudgmentMeta,
        parentHeaderFields,
        parentClassificationDisplay,
        parentClaimTypeArabicDisplay,
        parentJudgmentDateDisplay,
        parentShowJudgmentMeta,
    } = fileMetadataBinding;

`;

replaceBlock(
    '    // ===========================\n    // OMNIBUS 1:1 DATA BINDING - ZERO DATA LOSS',
    '    // ===========================\n    // Financial debug logging removed from render path for performance',
    metadataReplacement,
);

// showDecisionsModal for persist pipeline
if (!core.includes('showDecisionsModal,\n        setCaseTasksPending,\n        setTimelineEvents,\n        setExecutionReportPrompt')) {
    core = core.replace(
        `        setShowDecisionsModal,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,`,
        `        setShowDecisionsModal,
        showDecisionsModal,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,`,
    );
}

// READY_FOR_COERCIVE runtime constant
core = core.replace(
    '        EVICTION_WORKFLOW_BY_ACTION_ID,\n        READY_FOR_COERCIVE,',
    "        EVICTION_WORKFLOW_BY_ACTION_ID,\n        READY_FOR_COERCIVE: 'READY_FOR_COERCIVE',",
);

// Merge file metadata into runtime vars spread
core = core.replace(
    `        ...persistHandlerPipeline,
        EVICTION_WORKFLOW_BY_ACTION_ID,`,
    `        ...persistHandlerPipeline,
        ...fileMetadataBinding,
        EVICTION_WORKFLOW_BY_ACTION_ID,`,
);

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice28 applied, lines:', core.split('\n').length);
