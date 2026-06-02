import { cassationDecisionText, formatDateText } from '../../utils/formatters';
import type { UseOrderFileLifecycleActionsArgs } from './types';
import type { FinalizeCaseReason } from './createFinalizeCase';

type CassationExtra = { finalizeCase: (reason: FinalizeCaseReason) => void };

export function createCassationActions(
    ctx: UseOrderFileLifecycleActionsArgs, extra: CassationExtra,
) {
    const {
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
        setEditExecution,
        setEditRejectionNotice,
        editGrievance,
        setEditGrievance,
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
        isCaseTerminated,
        hasSessions,
        grievanceLegalEndDateChronologyError,
        grievanceExpiredCanClose,
        grievanceClosingHearingExists,
        grievanceFilingDateChronologyError,
        grievanceFirstHearingDateChronologyError,
        grievanceDecisionDateChronologyError,
        judgeDecisionDateChronologyError,
        cassationFilingDateChronologyError,
        cassationDecisionDateError,
        cassationFilingDetailsComplete,
        phase1NewSessionMinYmd,
        phase2NewSessionMinYmd,
        effectiveJudgeDecisionDate,
        effectiveRejectionNotificationDate,
        grievanceTimingGateReady,
        grievanceFilingMinYmd,
        grievanceFirstHearingMinYmd,
        oppositeRole,
        partyLabel,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
        phase2ActiveDate,
        grievanceWizardInputsLocked,
        grievanceProceedingsClosed,
        cassationExpiredCanClose,
        cassationExpiredConfirmed,
        defaultDeadlineDays,
        setGrievanceDecisionNotificationConfirmed,
        setGrievancePetitionNotificationDate,
        setGrievancePetitionNotificationConfirmed,
        
    } = ctx;
    const { finalizeCase } = extra;

    const handleCassationPhaseSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (isFinalized) return;
    setCassationError(null);
    setCassationDecisionError(null);
    if (!cassationData.outcome) {
        setCassationError('يرجى تحديد حالة الطعن التمييزي');
        return;
    }

    if (cassationData.outcome === 'expired') {
        if (!cassationExpiredCanClose) {
            setCassationError('⏳ لا يمكن تثبيت الانقضاء قبل تجاوز تاريخ انتهاء مدة الطعن القانونية.');
            return;
        }
        if (!cassationExpiredConfirmed) {
            setCassationError('يرجى تأكيد انقضاء المدة قبل إنهاء المرحلة');
            return;
        }
        const expiredPatch: Record<string, unknown> = {
            cassationOutcome: 'expired',
            cassationFiledBy: null,
            cassationFilingDate: null,
            cassationFileNumber: null,
            cassationDecision: null,
            cassationDecisionDate: null,
            legalState: null,
        };
        void persistPatch(expiredPatch);
        if (caseId) onCaseUpdated?.(caseId, expiredPatch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...expiredPatch }));
        appendCaseEvent('انقضاء مدة الطعن التمييزي دون تقديم', 'system');
        setActiveLifecycleStep(null);
        setEditCassation(false);
        finalizeCase('expired');
        return;
    }

    if (!computedCassationFiledBy || !cassationData.filingDate || !cassationData.fileNumber) {
        setCassationError('يرجى ملء بيانات الطعن التمييزي');
        return;
    }
    if (!cassationDecision.decision || !cassationDecision.decisionDate) {
        setCassationDecisionError('يرجى إدخال نتيجة التمييز وتاريخ القرار');
        return;
    }
    if (cassationFilingDateChronologyError) {
        setCassationError(cassationFilingDateChronologyError);
        return;
    }
    const filing = String(cassationData.filingDate || '').trim();
    const decisionDate = String(cassationDecision.decisionDate || '').trim();
    if (filing && decisionDate && decisionDate < filing) {
        setCassationDecisionError('⚠️ تاريخ قرار التمييز يجب أن يكون بعد/مساوٍ لتاريخ تقديم الطعن');
        return;
    }

    const filedPatch: Record<string, unknown> = {
        cassationOutcome: 'filed',
        cassationFiledBy: computedCassationFiledBy,
        cassationFilingDate: cassationData.filingDate,
        cassationFileNumber: cassationData.fileNumber,
        cassationDecision: cassationDecision.decision,
        cassationDecisionDate: cassationDecision.decisionDate,
        legalState: null,
    };
    void persistPatch(filedPatch);
    if (caseId) onCaseUpdated?.(caseId, filedPatch);
    setCaseData((prev: any) => ({ ...(prev || {}), ...filedPatch }));
    appendCaseEvent(
        `تسجيل الطعن التمييزي (${partyLabel(computedCassationFiledBy)}) بتاريخ ${formatDateText(cassationData.filingDate)}، رقم ${String(cassationData.fileNumber || '').trim() || '—'}`,
        'action',
    );
    appendCaseEvent(
        `نتيجة التمييز: ${cassationDecisionText(cassationDecision.decision)} بتاريخ ${formatDateText(cassationDecision.decisionDate)}`,
        'action',
    );
    setFileStatus('cassation');
    setActiveLifecycleStep(null);
    setEditCassation(false);
    finalizeCase('cassation_decision');
};

const clearCassation = () => {
    setCassationData({ filedBy: null, outcome: '', filingDate: '', fileNumber: '' });
    setCassationDecision({ decision: null, decisionDate: '' });
    setFileStatus('grievance');
    setActiveLifecycleStep('cassation');
    const patch: Record<string, unknown> = {
        cassationOutcome: null,
        cassationFiledBy: null,
        cassationFilingDate: null,
        cassationFileNumber: null,
        cassationDecision: null,
        cassationDecisionDate: null,
        legalState: 'Awaiting_Cassation',
    };
    persistAndMerge(patch);
    appendCaseEvent('تم مسح بيانات الطعن التمييزي ونتيجته', 'action');
};

    return {
        
        
        handleCassationPhaseSubmit,
        clearCassation,
        
    };
}
