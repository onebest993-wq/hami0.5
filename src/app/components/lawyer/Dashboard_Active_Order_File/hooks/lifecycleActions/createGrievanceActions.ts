import { formatDateText } from '../../utils/formatters';
import type { UseOrderFileLifecycleActionsArgs } from './types';
import type { FinalizeCaseReason } from './createFinalizeCase';

type GrievanceExtra = { finalizeCase: (reason: FinalizeCaseReason) => void };

export function createGrievanceActions(
    ctx: UseOrderFileLifecycleActionsArgs, extra: GrievanceExtra,
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

    const handleGrievanceSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (isFinalized) return;
    setGrievanceError(null);
    if (!judgeDecision.decision) return;
    if (!grievanceData.outcome) {
        setGrievanceError('يرجى تحديد حالة التظلم');
        return;
    }
    const notificationDateValue = String(grievanceData.rejectionNotificationDate || '').trim();
    const endDateValue = String(grievanceLegalEndDate || '').trim();
    if (grievanceLegalEndDateChronologyError) {
        setGrievanceError(grievanceLegalEndDateChronologyError);
        return;
    }
    if (grievanceData.outcome === 'expired' && !grievanceExpiredConfirmed) {
        setGrievanceError('يرجى تأكيد انقضاء المدة قبل إنهاء مرحلة التظلم');
        return;
    }
    if (grievanceData.outcome === 'filed' && (!grievanceDecision.decision || !grievanceDecision.decisionDate)) {
        setGrievanceError('يرجى إدخال نتيجة التظلم وتاريخ صدور القرار');
        return;
    }
    if (grievanceData.outcome === 'filed' && !grievanceClosingHearingExists) {
        const hasGrievanceHearings = hearings.some((h) => h.stage === 'grievance');
        setGrievanceError(
            !hasGrievanceHearings
                ? 'يجب إضافة جلسة تظلم واختيار (ختام المرافعة) قبل حفظ وإنهاء المرحلة.'
                : 'لإدخال قرار التظلم، يجب إضافة جلسة جديدة واختيار (ختام المرافعة).',
        );
        return;
    }
    if (grievanceData.outcome === 'filed') {
        if (grievanceFilingDateChronologyError) {
            setGrievanceError(grievanceFilingDateChronologyError);
            return;
        }
        if (grievanceFirstHearingDateChronologyError) {
            setGrievanceError(grievanceFirstHearingDateChronologyError);
            return;
        }
        if (grievanceDecisionDateChronologyError) {
            setGrievanceError(grievanceDecisionDateChronologyError);
            return;
        }
    }
    if (grievanceData.outcome === 'expired') {
        if (!endDateValue) {
            setGrievanceError('يرجى إدخال تاريخ انتهاء مدة التظلم القانونية');
            return;
        }
        if (!hasIntervention && !notificationDateValue) {
            setGrievanceError('يرجى إدخال تاريخ التبليغ بالقرار');
            return;
        }
        if (/^\d{4}-\d{2}-\d{2}$/.test(endDateValue) && todayYmdValue <= endDateValue) {
            setGrievanceError('لا يمكن إغلاق مرحلة التظلم قبل انقضاء المدة المحددة.');
            return;
        }
    }

    const patch: Record<string, unknown> = {
        rejectionNotificationDate: grievanceData.rejectionNotificationDate || null,
        grievanceLegalEndDate: endDateValue || null,
        grievanceOutcome: grievanceData.outcome,
        grievanceFilingDate: grievanceData.outcome === 'filed' ? grievanceData.filingDate : null,
        grievanceFirstHearingDate: grievanceData.outcome === 'filed' ? phase2FirstHearingDate || null : null,
        phase2FirstHearingDate: grievanceData.outcome === 'filed' ? phase2FirstHearingDate || null : null,
        grievanceSessionDate: grievanceData.outcome === 'filed' ? phase2ActiveDate || null : null,
        grievanceFiledBy: grievanceData.outcome === 'filed' ? computedGrievanceFiledBy : null,
        grievanceDecision: grievanceData.outcome === 'filed' ? grievanceDecision.decision : null,
        grievanceDecisionDate: grievanceData.outcome === 'filed' ? grievanceDecision.decisionDate : null,
        grievanceOutcomeDraft: null,
        legalState: grievanceData.outcome === 'filed' ? 'Awaiting_Cassation' : null,
        ...(grievanceData.outcome === 'filed' && grievanceDecision.decisionDate
            ? {
                  grievancePetitionNotificationDate: grievanceDecision.decisionDate,
                  notificationDate: grievanceDecision.decisionDate,
              }
            : {}),
    };

    void persistPatch(patch);
    if (caseId) onCaseUpdated?.(caseId, patch);
    setCaseData((prev) => ({ ...(prev || {}), ...patch }));

    if (grievanceData.outcome === 'filed') {
        appendCaseEvent(
            `تسجيل التظلم (${partyLabel(computedGrievanceFiledBy)}) بتاريخ ${formatDateText(grievanceData.filingDate)}، موعد الجلسة ${formatDateText(phase2ActiveDate)}، نتيجة التظلم: ${String(grievanceDecision.decision)} بتاريخ ${formatDateText(grievanceDecision.decisionDate)}`,
            'action',
        );
        setFileStatus('cassation');
        setActiveLifecycleStep(null);
        setEditGrievance(false);
    } else {
        appendCaseEvent('عدم تقديم تظلم واكتساب الدرجة القطعية', 'system');
        setActiveLifecycleStep(null);
        setEditGrievance(false);
        finalizeCase('no_grievance');
    }
};

const persistGrievanceOutcomeDraft = (next: 'filed' | 'expired') => {
    if (isFinalized) return;
    setGrievanceData((prev) => ({ ...prev, outcome: next }));
    const patch: Record<string, unknown> = { grievanceOutcomeDraft: next };
    void persistPatch(patch);
    if (caseId) onCaseUpdated?.(caseId, patch);
    setCaseData((prev) => ({ ...(prev || {}), ...patch }));
};

const confirmGrievanceTiming = async () => {
    if (grievanceWizardInputsLocked) return;
    if (!grievanceTimingGateReady) {
        setGrievanceError(
            hasIntervention
                ? 'يرجى تحديد تاريخ انتهاء مدة التظلم القانونية قبل المتابعة'
                : 'يرجى تأكيد تاريخ التبليغ وتحديد تاريخ انتهاء مدة التظلم قبل المتابعة',
        );
        return;
    }
    const ok = await requestConfirm(
        'هل أنت متأكد من تواريخ التبليغ وانتهاء مدة التظلم؟\nيرجى مراجعة البيانات قبل الانتقال للخطوة التالية.',
    );
    if (!ok) return;
    setGrievanceError(null);
    setGrievanceTimingConfirmed(true);
    const endDateValue = String(grievanceLegalEndDate || '').trim();
    const notif = String(
        grievanceData.rejectionNotificationDate || caseData?.notificationDate || '',
    ).trim();
    const patch: Record<string, unknown> = {
        grievanceLegalEndDate: endDateValue || null,
        legalState: 'Awaiting_Grievance',
    };
    if (notif) patch.rejectionNotificationDate = notif;
    void persistPatch(patch);
    if (caseId) onCaseUpdated?.(caseId, patch);
    setCaseData((prev) => ({ ...(prev || {}), ...patch }));
    appendCaseEvent(
        `تثبيت التوقيت القانوني للتظلم — التبليغ: ${formatDateText(notif) || '—'} | الانتهاء: ${formatDateText(endDateValue) || '—'}`,
        'action',
    );
};

const confirmGrievanceDetails = async () => {
    if (grievanceWizardInputsLocked || !grievanceTimingConfirmed || grievanceData.outcome !== 'filed') return;
    if (!String(grievanceData.filingDate || '').trim()) {
        setGrievanceError('يرجى إدخال تاريخ تقديم التظلم');
        return;
    }
    const p2Ymd = String(phase2FirstHearingDate || '')
        .trim()
        .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
    if (!p2Ymd) {
        setGrievanceError('يرجى إدخال تاريخ جلسة التظلم الأولى');
        return;
    }
    if (grievanceFilingDateChronologyError) {
        setGrievanceError(grievanceFilingDateChronologyError);
        return;
    }
    if (grievanceFirstHearingDateChronologyError) {
        setGrievanceError(grievanceFirstHearingDateChronologyError);
        return;
    }
    const ok = await requestConfirm(
        'يرجى التأكد من بيانات التظلم (تاريخ التقديم ومقدّم التظلم) قبل الانتقال إلى جلسات المرافعة.\nهل تريد المتابعة؟',
    );
    if (!ok) return;
    setGrievanceError(null);
    setGrievanceDetailsConfirmed(true);
    setGrievanceData((prev) => ({ ...prev, outcome: 'filed' }));
    const patch: Record<string, unknown> = {
        grievanceOutcome: 'filed',
        grievanceDetailsConfirmed: true,
        grievanceFilingDate: grievanceData.filingDate,
        grievanceFiledBy: computedGrievanceFiledBy,
        grievanceOutcomeDraft: 'filed',
        grievanceFirstHearingDate: p2Ymd || null,
        phase2FirstHearingDate: p2Ymd || null,
        grievanceSessionDate: phase2ActiveDate || null,
    };
    persistAndMerge(patch);
    await flushPersistPatch(patch);
    appendCaseEvent(
        `تثبيت بيانات التظلم — ${partyLabel(computedGrievanceFiledBy)} بتاريخ ${formatDateText(grievanceData.filingDate)}`,
        'action',
    );
};

const clearGrievance = async (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const ok = await requestConfirm('تحذير: سيتم مسح كافة توقيتات وجلسات التظلم وإعادتك للبداية. هل أنت متأكد؟');
    if (!ok) return;
    const nextHearings = hearings.filter((h) => h.stage !== 'grievance');
    setHearings(nextHearings);
    setHearingDraft({ open: false, stage: 'grievance', outcome: 'adjourn', sessionDate: '', notes: '', nextSessionDate: '', decisionDate: '' });
    setGrievanceData({ rejectionNotificationDate: '', outcome: '', filingDate: '' });
    setPhase2FirstHearingDate('');
    setGrievanceDecisionNotificationConfirmed(false);
    setGrievancePetitionNotificationDate('');
    setGrievancePetitionNotificationConfirmed(false);
    setGrievanceLegalEndDate('');
    setGrievanceTimingConfirmed(false);
    setGrievanceDetailsConfirmed(false);
    setGrievanceDecision({ decision: null, decisionDate: '' });
    setCassationData({ filedBy: null, outcome: '', filingDate: '', fileNumber: '' });
    setCassationDecision({ decision: null, decisionDate: '' });
    if (judgeDecision.decision === 'rejected') setFileStatus('rejected');
    else setFileStatus('executed');
    setActiveLifecycleStep('grievance');
    const patch: Record<string, unknown> = {
        hearings: nextHearings,
        grievanceOutcome: null,
        grievanceOutcomeDraft: null,
        grievanceFilingDate: null,
        grievanceFirstHearingDate: null,
        phase2FirstHearingDate: null,
        grievanceSessionDate: null,
        grievanceFiledBy: null,
        grievanceDecision: null,
        grievanceDecisionDate: null,
        rejectionNotificationDate: null,
        grievancePetitionNotificationDate: null,
        grievanceLegalEndDate: null,
        cassationOutcome: null,
        cassationFiledBy: null,
        cassationFilingDate: null,
        cassationFileNumber: null,
        cassationDecision: null,
        cassationDecisionDate: null,
        legalState: 'Awaiting_Grievance',
    };
    persistAndMerge(patch);
    appendCaseEvent('تم مسح بيانات التظلم والنتيجة وما بعده', 'action');
};

    return {
        handleGrievanceSubmit,
        persistGrievanceOutcomeDraft,
        confirmGrievanceTiming,
        confirmGrievanceDetails,
        clearGrievance,
    };
}
