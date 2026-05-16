import fs from 'fs';

const p = 'src/app/components/lawyer/Dashboard_Active_Order_File/ActiveOrderFileRoot.tsx';
const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);

const pathwayBlock = `
    const casePathway = useOrderFileCasePathway({
        caseData,
        fd,
        fileStatus,
        activeLifecycleStep,
        judgeDecision,
        grievanceDecision,
        hearings,
        preDecisionClosed,
    });
    const {
        shouldSkipExecutionStep,
        statusConfig,
        requestTypeText,
        resolvedWorkspaceRequestType,
        isIqrar,
        isIqrarContext,
        procedureDetailsForPopover,
        partyLabel,
        oppositeRole,
        isUrgentLawsuit,
        isOrderOnPetition,
        isStateOrder,
        isUrgentJustice,
        showGrievanceStep,
        grievanceStepNumber,
        cassationStepNumber,
        showInitialNotification,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
    } = casePathway;
`.trim();

const lifecycleBlock = `
    const lifecycleDerived = useOrderFileLifecycleDerived({
        caseData,
        judgeDecision,
        grievanceData,
        grievanceDecision,
        cassationData,
        cassationDecision,
        hearings,
        hearingDraft,
        expertModule,
        phase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        editGrievance,
        requestDateYmd,
        todayYmdValue,
        hasIntervention,
        isFinalized,
        isFinalityNoGrievance,
        defenderPhase2ReadOnly,
        showGrievanceStep,
        isIqrarContext,
        partyLabel,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
        showPreDecisionHearings,
    });

    const lifecycleActions = useOrderFileLifecycleActions({
        caseId,
        caseData,
        setCaseData,
        onCaseUpdated,
        todayYmdValue,
        requestDateYmd,
        isFinalized,
        fileStatus,
        setFileStatus,
        isSecretMode,
        setIsSecretMode,
        hasIntervention,
        setHasIntervention,
        activeLifecycleStep,
        setActiveLifecycleStep,
        judgeDecision,
        setJudgeDecision,
        executionData,
        setExecutionData,
        grievanceData,
        setGrievanceData,
        phase2FirstHearingDate,
        setPhase2FirstHearingDate,
        grievanceLegalEndDate,
        setGrievanceLegalEndDate,
        grievanceTimingConfirmed,
        setGrievanceTimingConfirmed,
        grievanceDetailsConfirmed,
        setGrievanceDetailsConfirmed,
        grievanceExpiredConfirmed,
        setGrievanceExpiredConfirmed,
        grievanceDecision,
        setGrievanceDecision,
        cassationData,
        setCassationData,
        cassationDecision,
        setCassationDecision,
        guaranteeSubmitted,
        setGuaranteeSubmitted,
        guaranteeDetails,
        hearings,
        setHearings,
        setPreDecisionClosed,
        hearingDraft,
        setHearingDraft,
        expertModule,
        setExpertModule,
        registrationData,
        setRegistrationData,
        pendingRegistrationSyncRef,
        editJudge,
        setEditJudge,
        editExecution,
        setEditExecution,
        editRejectionNotice,
        setEditRejectionNotice,
        editGrievance,
        setEditGrievance,
        editCassation,
        setEditCassation,
        setJudgeError,
        setExecutionError,
        setRejectionNoticeError,
        setGrievanceError,
        setGrievanceDecisionError,
        setCassationError,
        setCassationDecisionError,
        setHearingsError,
        persistPatch,
        flushPersistPatch,
        persistAndMerge,
        appendCaseEvent,
        requestConfirm,
        showGrievanceStep,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        isIqrarContext,
        isStateOrder,
        isCaseTerminated: lifecycleDerived.isCaseTerminated,
        hasSessions: lifecycleDerived.hasSessions,
        grievanceLegalEndDateChronologyError: lifecycleDerived.grievanceLegalEndDateChronologyError,
        grievanceExpiredCanClose: lifecycleDerived.grievanceExpiredCanClose,
        grievanceClosingHearingExists: lifecycleDerived.grievanceClosingHearingExists,
        grievanceFilingDateChronologyError: lifecycleDerived.grievanceFilingDateChronologyError,
        grievanceFirstHearingDateChronologyError: lifecycleDerived.grievanceFirstHearingDateChronologyError,
        grievanceDecisionDateChronologyError: lifecycleDerived.grievanceDecisionDateChronologyError,
        judgeDecisionDateChronologyError: lifecycleDerived.judgeDecisionDateChronologyError,
        cassationFilingDateChronologyError: lifecycleDerived.cassationFilingDateChronologyError,
        cassationDecisionDateError: lifecycleDerived.cassationDecisionDateError,
        cassationFilingDetailsComplete: lifecycleDerived.cassationFilingDetailsComplete,
        phase1NewSessionMinYmd: lifecycleDerived.phase1NewSessionMinYmd,
        phase2NewSessionMinYmd: lifecycleDerived.phase2NewSessionMinYmd,
        effectiveJudgeDecisionDate: lifecycleDerived.effectiveJudgeDecisionDate,
        effectiveRejectionNotificationDate: lifecycleDerived.effectiveRejectionNotificationDate,
        grievanceTimingGateReady: lifecycleDerived.grievanceTimingGateReady,
        grievanceFilingMinYmd: lifecycleDerived.grievanceFilingMinYmd,
        grievanceFirstHearingMinYmd: lifecycleDerived.grievanceFirstHearingMinYmd,
        oppositeRole,
    });

    const lifecyclePanelProps = buildLifecyclePanelProps({
        pathway: casePathway,
        derived: lifecycleDerived,
        actions: lifecycleActions,
        activeLifecycleStep,
        caseData,
        cassationData,
        cassationDecision,
        cassationDecisionError,
        cassationDecisionGateRef,
        cassationError,
        cassationExpiredConfirmed,
        cassationFilingGateRef,
        cassationRef,
        defenderPhase1ReadOnly,
        defenderPhase2ReadOnly,
        editCassation,
        editGrievance,
        editJudge,
        fileStatus,
        grievanceData,
        grievanceDecision,
        grievanceDecisionError,
        grievanceDecisionNotificationConfirmed,
        grievanceError,
        grievanceExpiredConfirmed,
        grievanceFinalGateRef,
        grievanceHearingsGateRef,
        grievanceLegalEndDate,
        grievanceOutcomeGateRef,
        grievanceRef,
        grievanceTimingConfirmed,
        guaranteeDetails,
        guaranteeGateActive,
        guaranteeSubmitted,
        hasIntervention,
        hearingDraft,
        hearingsError,
        isDefendantClient,
        isFinalityNoGrievance,
        isFinalityTerminatedRequest,
        isFinalized,
        judgeDecision,
        judgeError,
        phase2FirstHearingDate,
        setActiveLifecycleStep,
        setCassationData,
        setCassationDecision,
        setCassationExpiredConfirmed,
        setDecisionNotificationModalOpen,
        setEditCassation,
        setEditGrievance,
        setGrievanceData,
        setGrievanceDecision,
        setGrievanceDetailsConfirmed,
        setGrievanceExpiredConfirmed,
        setGrievanceLegalEndDate,
        setGuaranteeDetails,
        setGuaranteeSubmitted,
        setHearingDraft,
        setJudgeDecision,
        setPhase2FirstHearingDate,
    });
`.trim();

const part1 = lines.slice(0, 276);
const part2 = lines.slice(1373, 1403);
const part3 = lines.slice(1418, 1579);
let part4 = lines.slice(2341);

part4 = part4.map((line) => {
    if (line.includes('decisionNotificationQuickLogMinYmd')) {
        return line.replace('decisionNotificationQuickLogMinYmd', 'lifecycleDerived.decisionNotificationQuickLogMinYmd');
    }
    if (line.includes('nextHearingDate: String(nextHearingDate')) {
        return line.replace('nextHearingDate', 'lifecycleDerived.nextHearingDate');
    }
    if (line.includes('reportDueSoon,')) {
        return line.replace('reportDueSoon', 'lifecycleDerived.reportDueSoon');
    }
    if (line.includes('archiveSummaryText,')) {
        return line.replace('archiveSummaryText', 'lifecycleDerived.archiveSummaryText');
    }
    return line;
});

const importInsert = `import { useOrderFileCasePathway } from './hooks/useOrderFileCasePathway';
import { useOrderFileLifecycleDerived } from './hooks/useOrderFileLifecycleDerived';
import { useOrderFileLifecycleActions } from './hooks/useOrderFileLifecycleActions';
import { buildLifecyclePanelProps } from './layout/buildLifecyclePanelProps';`;

const outLines = [...part1];
const importLineIdx = outLines.findIndex((l) => l.includes("from './hooks/useOrderFileHydrate'"));
if (importLineIdx >= 0) {
    outLines.splice(importLineIdx + 1, 0, importInsert);
} else {
    outLines.unshift(importInsert);
}

outLines.push(...pathwayBlock.split('\n'));
outLines.push(...part2);
outLines.push(...part3);
outLines.push(...lifecycleBlock.split('\n'));
outLines.push(...part4);

fs.writeFileSync(p, outLines.join('\n'));
console.log('ActiveOrderFileRoot wired:', outLines.length, 'lines');
