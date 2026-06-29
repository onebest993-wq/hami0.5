import fs from 'fs';

const corePath = 'src/app/components/lawyer/ExecutionDashboard/hooks/useExecutionDashboardCore.ts';
let core = fs.readFileSync(corePath, 'utf8');

function replaceBetween(text, startMarker, endMarker, replacement, label) {
    const start = text.indexOf(startMarker);
    if (start < 0) throw new Error(`${label}: start not found`);
    const end = text.indexOf(endMarker, start);
    if (end < 0) throw new Error(`${label}: end not found`);
    return text.slice(0, start) + replacement + text.slice(end);
}

const newImports = `import { useExecutionDashboardPushTimelineEvent } from './executionDashboardCore/useExecutionDashboardPushTimelineEvent';
import { useExecutionDashboardPersistExecutionMerge } from './executionDashboardCore/useExecutionDashboardPersistExecutionMerge';
import { useExecutionDashboardExecutorApprovalActions } from './executionDashboardCore/useExecutionDashboardExecutorApprovalActions';`;

if (!core.includes('useExecutionDashboardPushTimelineEvent')) {
    core = core.replace(
        "import { useExecutionDashboardEvictionResidentialGraceHandlers } from './executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers';",
        `import { useExecutionDashboardEvictionResidentialGraceHandlers } from './executionDashboardCore/useExecutionDashboardEvictionResidentialGraceHandlers';
${newImports}`,
    );
}

const executorHook = `    const executorApprovalActions = useExecutionDashboardExecutorApprovalActions({
        executionData,
        executionId,
        file,
        currentFileId,
        isMaritalFurnitureClaim,
        nextTimelineId,
        timelineEventsRef,
        persistExecutionMergeRef,
        executionFileSnapshotRef,
        showToast,
        setShowDecisionsModal,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        setFollowupExpandProcedureKey,
        setCaseTasksPending,
        setTimelineEvents,
        setExecutionReportPrompt,
        setJudicialCustodianModalCtx,
        setJudicialCustodianModalOpen,
        setCaseNotesLog,
    });

`;

core = replaceBetween(
    core,
    '    const executorApprovalActions: ExecutorApprovalActions = useMemo(',
    '    const pushSeizureAuctionCalendarAppointment = useCallback(',
    executorHook,
    'executor hook',
);

const persistHook = `    const { persistExecutionMerge } = useExecutionDashboardPersistExecutionMerge({
        executionId,
        isUnifiedTabActive,
        unifiedTabId,
        onUpdate,
        executionDataRef,
        seizureDraftsByDecisionIdRef,
        setExecutionStorageTick,
    });

`;

core = replaceBetween(
    core,
    '    const persistExecutionMerge = useCallback(',
    '    persistExecutionMergeRef.current = persistExecutionMerge;',
    persistHook,
    'persist hook',
);

const pushHook = `    const { pushTimelineEvent } = useExecutionDashboardPushTimelineEvent({
        executionId,
        parentDossierId,
        executionDataRef,
        persistExecutionMerge,
        setTimelineEvents,
    });

`;

core = replaceBetween(
    core,
    '    const pushTimelineEvent = useCallback(',
    '    pushTimelineEventRef.current = pushTimelineEvent;',
    pushHook,
    'push hook',
);

// remove inline persistGuarantorFollowupDetails
core = replaceBetween(
    core,
    '    const persistGuarantorFollowupDetails = useCallback(',
    '    const {\n        applyDossierLifecycleToFileAndTimeline,',
    '    const {\n        applyDossierLifecycleToFileAndTimeline,',
    'remove persistGuarantor',
);

// voluntary period: add registerDebtor + extra params
core = core.replace(
    `    const {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
    } = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData,
        voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
    });`,
    `    const {
        handleDeclareEvictionVoluntaryPeriodEnd,
        handleDeclareNoticeVoluntaryPeriodEnd,
        registerDebtorVoluntaryAttendance,
    } = useExecutionDashboardVoluntaryPeriodHandlers({
        isEvictionExecutionModule,
        evictionGraceAnchorDate,
        executionData,
        voluntaryEndOptimistic,
        unifiedSummonsTargetDebtorKey,
        primaryDebtorKeyResolved,
        activeDebtorNoticeScope,
        debtorNotificationDate,
        noticeVoluntaryPeriodEndOptimistic,
        manualGraceCalendarExtra,
        nextTimelineId,
        persistExecutionMerge,
        showToast,
        setVoluntaryEndOptimistic,
        setNoticeVoluntaryPeriodEndOptimistic,
        setTimelineEvents,
        voluntaryAttendanceCount,
        summoningRound,
        setDebtorSummonsMarkerLocal,
        setDebtorAttendedVoluntarily,
        setActiveNoticeState,
        setVoluntaryAttendanceCount,
        setSummoningRound,
        setDebtorNotificationDate,
    });`,
);

// remove inline registerDebtorVoluntaryAttendance
core = replaceBetween(
    core,
    '    const registerDebtorVoluntaryAttendance = useCallback(() => {',
    '    const {\n        handleEmployeeAssignmentConfirm,',
    '    const {\n        handleEmployeeAssignmentConfirm,',
    'remove registerDebtor',
);

// full debtor summons destructure
core = core.replace(
    `    const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleDebtorEvasion,
    } = useExecutionDashboardDebtorSummonsCoerciveHandlers({`,
    `    const {
        clearDebtorSummonsMarker,
        terminateDebtorSummonsMarker,
        saveSummonsMarkerPurposeEdit,
        handleForcedAttendance,
        handleEarnerSecureForcedAttendance,
        handleRequestInvestigationFromForced,
        handleInvestigationDebtorShowed,
        handleInvestigationIssueMemo,
        handleConfirmSecuredAfterInvestigation,
        handleDebtorEvasion,
        applyEarnerFeeSmAction,
        resetEarnerFeeNotificationCycle,
        handleArrestWarrant,
    } = useExecutionDashboardDebtorSummonsCoerciveHandlers({`,
);

// guarantor hook: add persistGuarantor + extra params
core = core.replace(
    `    const {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
    } = useExecutionDashboardGuarantorFollowupHandlers({
        decisionsStorageExecutionId,
        executionData,
        executionId,
        assignmentWorkspaceCtx,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
    });`,
    `    const {
        requestFollowupSeizureDecision,
        handleGuarantorRequestFromFollowup,
        archiveAndClearGuarantor,
        requestGuarantorSeizure,
        persistGuarantorFollowupDetails,
    } = useExecutionDashboardGuarantorFollowupHandlers({
        decisionsStorageExecutionId,
        executionData,
        executionId,
        assignmentWorkspaceCtx,
        nextTimelineId,
        pushTimelineEvent,
        persistExecutionMerge,
        showToast,
        openGuarantorDetailsModal,
        openSeizureRequestsTabRef,
        setTimelineEvents,
        setShowCoerciveActionForm,
        setSeizureDetailCompletion,
        setShowUnifiedExecutionModal,
        setUnifiedModalTab,
        executionDataRef,
        persistExecutionMergeRef,
        guarantorDetailsDecisionId,
        setGuarantorDetailsDecisionId,
    });`,
);

// drop unused ExecutorApprovalActions type import if only used inline
core = core.replace(/\n    type ExecutorApprovalActions,\n/, '\n');

fs.writeFileSync(corePath, core, 'utf8');
console.log('patch-slice14-core: OK');
console.log('lines:', core.split('\n').length);
