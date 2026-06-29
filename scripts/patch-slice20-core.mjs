import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function wrapObjectHookDestructured(coreText, varName, hookPattern) {
    if (coreText.includes(`const ${varName} = ${hookPattern}`)) return coreText;
    const idx = coreText.indexOf(`} = ${hookPattern}(`);
    if (idx < 0) {
        console.warn(`patch-slice20: ${hookPattern} destructure not found`);
        return coreText;
    }
    const openBrace = coreText.lastIndexOf('const {', idx);
    const destructure = coreText.slice(openBrace, idx + 1);
    const hookStart = coreText.indexOf(`${hookPattern}(`, idx - 400);
    const hookEnd = coreText.indexOf('});', hookStart) + 3;
    if (hookStart < 0 || hookEnd < 3) return coreText;
    const hookCall = coreText.slice(hookStart, hookEnd);
    const replacement = `const ${varName} = ${hookCall}\n\n${destructure} = ${varName};\n\n`;
    return coreText.slice(0, openBrace) + replacement + coreText.slice(hookEnd);
}

function wrapPositionalHookDestructured(coreText, varName, hookPattern) {
    if (coreText.includes(`const ${varName} = ${hookPattern}`)) return coreText;
    const idx = coreText.indexOf(`} = ${hookPattern}(`);
    if (idx < 0) {
        console.warn(`patch-slice20: ${hookPattern} destructure not found`);
        return coreText;
    }
    const openBrace = coreText.lastIndexOf('const {', idx);
    const destructure = coreText.slice(openBrace, idx + 1);
    const hookStart = coreText.indexOf(`${hookPattern}(`, idx - 400);
    let depth = 0;
    let hookEnd = -1;
    for (let i = hookStart; i < coreText.length; i++) {
        const ch = coreText[i];
        if (ch === '(') depth++;
        else if (ch === ')') {
            depth--;
            if (depth === 0) {
                hookEnd = i + 1;
                if (coreText[hookEnd] === ';') hookEnd++;
                break;
            }
        }
    }
    if (hookStart < 0 || hookEnd < 0) return coreText;
    const hookCall = coreText.slice(hookStart, hookEnd);
    const replacement = `const ${varName} = ${hookCall}\n\n${destructure} = ${varName};\n\n`;
    return coreText.slice(0, openBrace) + replacement + coreText.slice(hookEnd);
}

core = wrapObjectHookDestructured(core, 'financialOrchestrator', 'useExecutionFinancialOrchestrator');
core = wrapObjectHookDestructured(core, 'partyEditWorkflow', 'usePartyEditWorkflow');
core = wrapObjectHookDestructured(core, 'unifiedSeizureLog', 'useUnifiedSeizureLog');
core = wrapObjectHookDestructured(
    core,
    'dossierLifecycleActions',
    'useExecutionDossierLifecycleActionsOrchestrator',
);
core = wrapPositionalHookDestructured(core, 'dossierMetaWorkflow', 'useDossierMeta');
core = wrapPositionalHookDestructured(core, 'debtorSummonsProfileBundle', 'useDebtorSummonsProfile');
core = wrapPositionalHookDestructured(core, 'subsequentNoticeFlow', 'useSubsequentNoticeFlow');

const bundlesMarker = '    const scopeRuntimeBindings = useExecutionDashboardCoreScopeRuntimeBindings({';
if (!core.includes('const timelineUiBundle = {')) {
    const bundleBlock = `    const timelineUiBundle = {
        timelineAccordionExpanded,
        setTimelineAccordionExpanded,
        activeTimelineFilter,
        setActiveTimelineFilter,
        timelineEvents,
        setTimelineEvents,
        timelineEditDraft,
        setTimelineEditDraft,
        timelineFilterOptions,
        timelineDebtorMetadata,
        timelineRadarPreviewLimit,
        activeTimelineEvents,
        activeTimelineEventsDebtorScoped,
        showOnlyActiveFileTimeline,
        setShowOnlyActiveFileTimeline,
        mergedTimelineEvents,
        mergeSimilarRecentTimelineEvent,
        nextTimelineId,
        trashedCaseNotes,
        trashedCaseTasks,
        trashedTimelineEvents,
    };

    const executionFileContext = {
        executionData,
        executionDataRef,
        executionId,
        viewExecutionData,
        currentFile,
        currentFileId,
        file,
        fileNumber,
        fileYear,
        executionStatus,
        executionPaused,
        executionReportPrompt,
        executionAppealBanner,
        executionMemoBadgePopoverOpen,
        onClose,
        onUpdate,
        activeSubFileId,
        docNumber,
        activeTabId,
        setActiveTabId,
        childDossiers,
        subFiles,
        parentDossierId,
        parentExecutionFile,
        hasChildDossiers,
        visitChildNames,
        linkedDossierToView,
        setLinkedDossierToView,
    };

    const seizureStateBundle = {
        seizedAssets,
        setSeizedAssets,
        seizureDraftsByDecisionId,
        setSeizureDraftsByDecisionId,
        seizureMatrix,
        seizureMatrixLedgerParamsRef,
        seizureDetailCompletion,
        movableSeizureRegistryAssets,
        realEstateSeizureAssets,
        realEstateSeizureRegistryAssets,
        salarySeizureRegistryAssets,
        thirdPartySeizureAssets,
        thirdPartySeizureRegistryAssets,
        thirdPartySeizuresUi,
        setThirdPartySeizuresUi,
    };

    const notesAppointmentUi = {
        noteBody,
        setNoteBody,
        noteTitle,
        setNoteTitle,
        editingNoteId,
        editingAppointmentId,
        editingTaskId,
        setEditingAppointmentId,
        setEditingTaskId,
        appointmentDateOnly,
        setAppointmentDateOnly,
        appointmentPurpose,
        setAppointmentPurpose,
        setAppointmentTimeOptional,
        savedNotesSplit,
        savedNotesView,
        setSavedNotesView,
        caseTasksPending,
        setCaseTasksPending,
        setIsTask,
        setTaskDueDate,
        setTaskStatus,
        isTask,
        dockPinnedNotes,
        dockPinnedTasks,
    };

    const financialLedgerStateBundle = {
        financialLedger,
        financialStatus,
        hasFinancialLedger,
        paidClientFees,
        paidCourtFees,
        paidDebt,
        paidDirectorateFees,
        paymentAmount,
        paymentDate,
        setPaymentAmount,
        setPaymentDate,
        total_execution_expenses,
    };

`;
    core = core.replace(bundlesMarker, bundleBlock + bundlesMarker);
}

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice20-core: OK');
console.log('core lines:', core.split('\n').length);
