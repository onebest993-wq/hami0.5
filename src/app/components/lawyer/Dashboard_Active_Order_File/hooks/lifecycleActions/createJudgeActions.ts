import { uuidv4 } from '@/app/services/urgent-actions-db';
import { formatDateText, formatDateTimeText } from '../../utils/formatters';
import type { CaseHearing, FileStatus } from '../../types';
import type { UseOrderFileLifecycleActionsArgs } from './types';

type JudgeExtra = { focusStep: (step: 'judge' | 'execution' | 'grievance' | 'cassation') => void };

export function createJudgeActions(
    ctx: UseOrderFileLifecycleActionsArgs, extra: JudgeExtra,
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
    const { focusStep } = extra;

    const handleJudgeDecisionSubmit = async (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (isFinalized) return;
    try {
        setJudgeError(null);
        if (preDecisionTerminateExists) {
            const ok = await requestConfirm(
                'تم تسجيل جلسة إبطال الطلب. هل أنت متأكد من حفظ المرحلة وإغلاق الإضبارة نهائياً؟',
            );
            if (!ok) return;

            const safeHearings = Array.isArray(hearings) ? hearings : [];
            const hearingsPayload = safeHearings
                .map((h: any) => {
                    if (!h || typeof h !== 'object') return null;
                    const stage = h.stage === 'pre_decision' || h.stage === 'grievance' ? h.stage : null;
                    if (!stage) return null;
                    return {
                        id: typeof h.id === 'string' ? h.id : uuidv4(),
                        stage,
                        sessionDate: typeof h.sessionDate === 'string' ? h.sessionDate : '',
                        notes: typeof h.notes === 'string' ? h.notes : '',
                        nextSessionDate: typeof h.nextSessionDate === 'string' ? h.nextSessionDate : '',
                        createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
                    } satisfies CaseHearing;
                })
                .filter(Boolean) as CaseHearing[];

            const archivedAt = new Date().toISOString();
            const patch = {
                hearings: hearingsPayload,
                judgeDecision: null,
                judgeDecisionDate: null,
                requiresGuarantee: false,
                guaranteeSubmitted: false,
                guaranteeAmount: null,
                guaranteeReceiptNumber: null,
                legalState: null,
                archived: true,
                archivedAt,
                phase: 'completed',
                status: 'completed',
                finalityReason: 'terminated_request',
            } as Record<string, unknown>;

            if (caseId) {
                await flushPersistPatch(patch);
                onCaseUpdated?.(caseId, patch);
            }
            setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
            setActiveLifecycleStep(null);
            setEditJudge(false);
            setEditExecution(false);
            setEditRejectionNotice(false);
            setEditGrievance(false);
            setEditCassation(false);
            appendCaseEvent(`تم إبطال الطلب وإغلاق الإضبارة نهائياً بتاريخ ${formatDateTimeText(archivedAt)}`, 'system');
            return;
        }
        if (showPreDecisionHearings && hasSessions && !isCaseTerminated) {
            setJudgeError('⚠️ لا يمكن إدخال قرار القاضي قبل ختام المرافعة أو إبطال الطلب.');
            return;
        }
        const decisionDateValue = String(judgeDecision.decisionDate || '').trim();

        if (isIqrarContext) {
            if (judgeDecision.decision !== 'accepted' || !decisionDateValue) {
                setJudgeError('يرجى تأكيد إصدار حجة الإقرار وتحديد تاريخ المصادقة');
                return;
            }
            if (judgeDecisionDateChronologyError) {
                setJudgeError(judgeDecisionDateChronologyError);
                return;
            }
            const okIqrar = await requestConfirm(
                'هل أنت متأكد من تثبيت إصدار حجة الإقرار ومصادقتها؟ لا يمكن التراجع بعد الحفظ.',
            );
            if (!okIqrar) return;

            const archivedAt = new Date().toISOString();
            const patch = {
                judgeDecision: 'accepted',
                judgeDecisionDate: decisionDateValue,
                requiresGuarantee: false,
                guaranteeSubmitted: false,
                guaranteeAmount: null,
                guaranteeReceiptNumber: null,
                hearings: [],
                legalState: 'Iqrar_Authenticated',
                iqrarDeedAuthenticated: true,
                archived: true,
                archivedAt,
                archivedReason: 'iqrar_authenticated',
                finalityReason: 'iqrar_authenticated',
                phase: 'completed',
                status: 'completed',
            } as Record<string, unknown>;

            if (caseId) {
                await flushPersistPatch(patch);
                onCaseUpdated?.(caseId, patch);
            }
            setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
            setFileStatus('accepted');
            setIsSecretMode(false);
            setActiveLifecycleStep(null);
            appendCaseEvent(
                `تم إصدار حجة الإقرار والمصادقة عليها بتاريخ ${formatDateText(decisionDateValue)}`,
                'action',
            );
            appendCaseEvent(`تم أرشفة إضبارة الإقرار بتاريخ ${formatDateTimeText(archivedAt)}`, 'system');
            setEditJudge(false);
            return;
        }

        if (!judgeDecision.decision || !decisionDateValue) {
            setJudgeError('يرجى ملء جميع الحقول المطلوبة');
            return;
        }
        if (judgeDecisionDateChronologyError) {
            setJudgeError(judgeDecisionDateChronologyError);
            return;
        }
        const ok = await requestConfirm(
            'هل أنت متأكد من حفظ القرار؟ بمجرد الحفظ لا يمكن تعديل هذه الخطوة وسيتم بناء المدد القانونية عليها.',
        );
        if (!ok) return;

        let nextStatus: FileStatus = fileStatus;
        let nextStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null = activeLifecycleStep;
        let nextSecretMode = isSecretMode;

        if (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') {
            if (judgeDecision.requiresGuarantee) {
                const amount = String(guaranteeDetails?.amount || '').trim();
                if (!amount) {
                    setJudgeError('يرجى إدخال مبلغ الكفالة قبل حفظ القرار');
                    return;
                }
            }
            if (judgeDecision.requiresGuarantee && !guaranteeSubmitted) {
                nextStatus = 'accepted';
                nextStep = null;
            } else if (!showGrievanceStep) {
                nextStatus = 'cassation';
                nextSecretMode = false;
                nextStep = 'cassation';
            } else {
                nextStatus = 'executed';
                nextSecretMode = false;
                nextStep = 'grievance';
            }
        } else {
            nextStatus = showGrievanceStep ? 'rejected' : 'cassation';
            nextStep = showGrievanceStep ? 'grievance' : 'cassation';
        }

        const safeHearings = Array.isArray(hearings) ? hearings : [];
        const hearingsPayload = safeHearings
            .map((h: any) => {
                if (!h || typeof h !== 'object') return null;
                const stage = h.stage === 'pre_decision' || h.stage === 'grievance' ? h.stage : null;
                if (!stage) return null;
                return {
                    id: typeof h.id === 'string' ? h.id : uuidv4(),
                    stage,
                    sessionDate: typeof h.sessionDate === 'string' ? h.sessionDate : '',
                    notes: typeof h.notes === 'string' ? h.notes : '',
                    nextSessionDate: typeof h.nextSessionDate === 'string' ? h.nextSessionDate : '',
                    createdAt: typeof h.createdAt === 'string' ? h.createdAt : new Date().toISOString(),
                } satisfies CaseHearing;
            })
            .filter(Boolean) as CaseHearing[];

        const patch = {
            judgeDecision: judgeDecision.decision,
            judgeDecisionDate: decisionDateValue,
            requiresGuarantee: !!judgeDecision.requiresGuarantee,
            guaranteeSubmitted: judgeDecision.requiresGuarantee ? !!guaranteeSubmitted : false,
            guaranteeAmount: judgeDecision.requiresGuarantee ? String(guaranteeDetails?.amount || '').trim() : null,
            guaranteeReceiptNumber: judgeDecision.requiresGuarantee ? String(guaranteeDetails?.receiptNumber || '').trim() : null,
            hearings: hearingsPayload,
            legalState: showGrievanceStep ? 'Awaiting_Grievance' : 'Awaiting_Cassation',
        } as Record<string, unknown>;

        if (caseId) {
            await flushPersistPatch(patch);
            onCaseUpdated?.(caseId, patch);
        }
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));

        setFileStatus(nextStatus);
        setIsSecretMode(nextSecretMode);
        setActiveLifecycleStep(nextStep);

        if (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') {
            const guaranteePart = judgeDecision.requiresGuarantee
                ? `، كفالة: ${String(guaranteeDetails?.amount || '').trim() || '—'}${
                      guaranteeSubmitted ? '، مودعة' : '، غير مودعة'
                  }`
                : '';
            appendCaseEvent(
                `قرار القاضي: ${judgeDecision.decision === 'partially_accepted' ? 'إجابة جزئية' : 'قبول'} بتاريخ ${formatDateText(decisionDateValue)}${guaranteePart}`,
                'action',
            );
        } else if (judgeDecision.decision === 'rejected') {
            appendCaseEvent(`قرار القاضي: رفض بتاريخ ${formatDateText(decisionDateValue)}`, 'action');
        }
        setEditJudge(false);
    } catch (err) {
        const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
        setJudgeError(`حدث خطأ أثناء حفظ القرار: ${msg}`);
    }
};

const handleExecutionSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    setExecutionError(null);
    if ((judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') && judgeDecision.requiresGuarantee && !guaranteeSubmitted) {
        setExecutionError('مغلق: لا يمكن البدء بإجراءات المفاتحة والتبليغ قبل إيداع الكفالة الضامنة');
        return;
    }
    if (!executionData.executionDate || !executionData.notificationDate || !executionData.authority || !executionData.deadlineDays || executionData.deadlineDays < 1) {
        setExecutionError('يرجى إكمال إجراءات المفاتحة والتبليغ: تاريخ التسليم، تاريخ التبليغ، الجهة المخاطبة، والمدة القانونية');
        return;
    }

    setFileStatus('executed');
    setIsSecretMode(false); // 🔥 CRITICAL: Remove secret mode after execution
    setActiveLifecycleStep('grievance');

    const patch = {
        executionDate: executionData.executionDate,
        authority: executionData.authority,
        notificationDate: executionData.notificationDate,
        deadlineDays: executionData.deadlineDays,
        legalState: 'Awaiting_Grievance',
    } as Record<string, unknown>;
    void persistPatch(patch);
    if (caseId) onCaseUpdated?.(caseId, patch);
    setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
    appendCaseEvent(
        `إجراءات المفاتحة/التبليغ: تبليغ بتاريخ ${formatDateText(executionData.notificationDate)}، مدة ${executionData.deadlineDays} يوم، جهة ${String(executionData.authority || '').trim() || '—'}`,
        'action',
    );
    setEditExecution(false);
};

const handleRejectionNotificationSubmit = (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    if (isFinalized) return;
    setRejectionNoticeError(null);
    if (!grievanceData.rejectionNotificationDate) {
        setRejectionNoticeError('يرجى إدخال تاريخ التبليغ بقرار الرفض');
        return;
    }
    const patch: Record<string, unknown> = {
        rejectionNotificationDate: grievanceData.rejectionNotificationDate,
        legalState: 'Awaiting_Grievance',
    };
    void persistPatch(patch);
    if (caseId) onCaseUpdated?.(caseId, patch);
    setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
    setActiveLifecycleStep('grievance');
    appendCaseEvent(`تثبيت تبليغ الرفض بتاريخ ${formatDateText(grievanceData.rejectionNotificationDate)}`, 'action');
    setEditRejectionNotice(false);
};

const clearJudgeDecision = async (e?: React.SyntheticEvent) => {
    if (e) {
        e.preventDefault();
        e.stopPropagation();
    }
    const ok = await requestConfirm('سيتم مسح بيانات القرار بالكامل. هل أنت متأكد؟');
    if (!ok) return;
    setJudgeDecision({ decision: null, decisionDate: '', requiresGuarantee: false });
    setExecutionData((prev) => ({ ...prev, executionDate: '', notificationDate: '', authority: '', notes: '', deadlineDays: defaultDeadlineDays }));
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
    setGuaranteeSubmitted(false);
    setFileStatus('pending');
    setActiveLifecycleStep('judge');
    const patch: Record<string, unknown> = {
        judgeDecision: null,
        judgeDecisionDate: null,
        requiresGuarantee: null,
        guaranteeSubmitted: null,
        executionDate: null,
        authority: null,
        notificationDate: null,
        deadlineDays: null,
        rejectionNotificationDate: null,
        grievancePetitionNotificationDate: null,
        grievanceLegalEndDate: null,
        grievanceOutcome: null,
        grievanceFilingDate: null,
        firstHearingDate: null,
        grievanceFirstHearingDate: null,
        phase2FirstHearingDate: null,
        grievanceSessionDate: null,
        grievanceFiledBy: null,
        grievanceDecision: null,
        grievanceDecisionDate: null,
        cassationOutcome: null,
        cassationFiledBy: null,
        cassationFilingDate: null,
        cassationFileNumber: null,
        cassationDecision: null,
        cassationDecisionDate: null,
        legalState: null,
    };
    persistAndMerge(patch);
    appendCaseEvent('تم مسح بيانات قرار القاضي وما بعده', 'action');
};

const clearExecution = () => {
    setExecutionData((prev) => ({ ...prev, executionDate: '', notificationDate: '', authority: '', notes: '', deadlineDays: defaultDeadlineDays }));
    if (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') setFileStatus('accepted');
    setActiveLifecycleStep('execution');
    const patch: Record<string, unknown> = {
        executionDate: null,
        authority: null,
        notificationDate: null,
        deadlineDays: null,
        legalState: 'Awaiting_Grievance',
    };
    persistAndMerge(patch);
    appendCaseEvent('تم مسح بيانات المفاتحة والتبليغ', 'action');
};

    return {
        handleJudgeDecisionSubmit,
        handleExecutionSubmit,
        handleRejectionNotificationSubmit,
        clearJudgeDecision,
        clearExecution,
        
        
        
    };
}
