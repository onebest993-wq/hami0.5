import { useEffect } from 'react';
import { uuidv4 } from '@/app/services/urgent-actions-db';
import { getActiveDate } from '@/app/utils/hearingDates';
import {
    isAdjournReasonValid,
    getPreDecisionSessionOutcome,
    isGrievancePleadingClosedSession,
    isPreDecisionCloseNotes,
    isPreDecisionNullifyNotes,
} from '../utils/hearingRules';
import {
    PRE_DECISION_OUTCOME_ADJOURN,
    PRE_DECISION_OUTCOME_CLOSE,
    PRE_DECISION_OUTCOME_NULLIFY,
} from '../constants/hearingOutcomes';
import { formatDateText, formatDateTimeText } from '../utils/formatters';
import { addDaysYmd, maxYmd } from '../utils/ymd';
import type {
    CaseHearing,
    CassationData,
    CassationDecision,
    ExpertModule,
    FileStatus,
    GrievanceData,
    GrievanceDecision,
    JudgeDecision,
    HearingStage,
} from '../types';

export type UseOrderFileLifecycleActionsArgs = {
    caseId: string | null;
    caseData: any;
    setCaseData: React.Dispatch<React.SetStateAction<any>>;
    onCaseUpdated?: (caseId: string, patch: Record<string, unknown>) => void;
    todayYmdValue: string;
    requestDateYmd: string;
    isFinalized: boolean;
    fileStatus: FileStatus;
    setFileStatus: React.Dispatch<React.SetStateAction<FileStatus>>;
    isSecretMode: boolean;
    setIsSecretMode: React.Dispatch<React.SetStateAction<boolean>>;
    hasIntervention: boolean;
    setHasIntervention: React.Dispatch<React.SetStateAction<boolean>>;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    setActiveLifecycleStep: React.Dispatch<React.SetStateAction<'judge' | 'execution' | 'grievance' | 'cassation' | null>>;
    judgeDecision: JudgeDecision;
    setJudgeDecision: React.Dispatch<React.SetStateAction<JudgeDecision>>;
    executionData: import('../types').ExecutionData;
    setExecutionData: React.Dispatch<React.SetStateAction<import('../types').ExecutionData>>;
    grievanceData: GrievanceData;
    setGrievanceData: React.Dispatch<React.SetStateAction<GrievanceData>>;
    phase2FirstHearingDate: string;
    setPhase2FirstHearingDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceLegalEndDate: string;
    setGrievanceLegalEndDate: React.Dispatch<React.SetStateAction<string>>;
    grievanceTimingConfirmed: boolean;
    setGrievanceTimingConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDetailsConfirmed: boolean;
    setGrievanceDetailsConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceExpiredConfirmed: boolean;
    setGrievanceExpiredConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
    grievanceDecision: GrievanceDecision;
    setGrievanceDecision: React.Dispatch<React.SetStateAction<GrievanceDecision>>;
    cassationData: CassationData;
    setCassationData: React.Dispatch<React.SetStateAction<CassationData>>;
    cassationDecision: CassationDecision;
    setCassationDecision: React.Dispatch<React.SetStateAction<CassationDecision>>;
    guaranteeSubmitted: boolean;
    setGuaranteeSubmitted: React.Dispatch<React.SetStateAction<boolean>>;
    guaranteeDetails: { amount: string; receiptNumber: string };
    hearings: CaseHearing[];
    setHearings: React.Dispatch<React.SetStateAction<CaseHearing[]>>;
    setPreDecisionClosed: React.Dispatch<React.SetStateAction<boolean>>;
    hearingDraft: {
        open: boolean;
        stage: HearingStage;
        outcome: 'adjourn' | 'close' | 'terminate';
        sessionDate: string;
        notes: string;
        nextSessionDate: string;
        decisionDate: string;
    };
    setHearingDraft: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['hearingDraft']>>;
    expertModule: ExpertModule;
    setExpertModule: React.Dispatch<React.SetStateAction<ExpertModule>>;
    registrationData: {
        receiptNumber: string;
        receiptDate: string;
        notificationMethod: string;
        notificationDate: string;
    };
    setRegistrationData: React.Dispatch<React.SetStateAction<UseOrderFileLifecycleActionsArgs['registrationData']>>;
    pendingRegistrationSyncRef: React.MutableRefObject<boolean>;
    editJudge: boolean;
    setEditJudge: React.Dispatch<React.SetStateAction<boolean>>;
    editExecution: boolean;
    setEditExecution: React.Dispatch<React.SetStateAction<boolean>>;
    editRejectionNotice: boolean;
    setEditRejectionNotice: React.Dispatch<React.SetStateAction<boolean>>;
    editGrievance: boolean;
    setEditGrievance: React.Dispatch<React.SetStateAction<boolean>>;
    editCassation: boolean;
    setEditCassation: React.Dispatch<React.SetStateAction<boolean>>;
    setJudgeError: React.Dispatch<React.SetStateAction<string | null>>;
    setExecutionError: React.Dispatch<React.SetStateAction<string | null>>;
    setRejectionNoticeError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceError: React.Dispatch<React.SetStateAction<string | null>>;
    setGrievanceDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationError: React.Dispatch<React.SetStateAction<string | null>>;
    setCassationDecisionError: React.Dispatch<React.SetStateAction<string | null>>;
    setHearingsError: React.Dispatch<React.SetStateAction<string | null>>;
    persistPatch: (patch: Record<string, unknown>) => void;
    flushPersistPatch: (patch: Record<string, unknown>) => Promise<void>;
    persistAndMerge: (patch: Record<string, unknown>) => void;
    appendCaseEvent: (message: string, kind?: import('../types').CaseEvent['kind']) => void;
    requestConfirm: (message: string) => Promise<boolean>;
    showGrievanceStep: boolean;
    showPreDecisionHearings: boolean;
    preDecisionTerminateExists: boolean;
    isIqrarContext: boolean;
    isStateOrder: boolean;
    isCaseTerminated: boolean;
    hasSessions: boolean;
    grievanceLegalEndDateChronologyError: string | null;
    grievanceExpiredCanClose: boolean;
    grievanceClosingHearingExists: boolean;
    grievanceFilingDateChronologyError: string | null;
    grievanceFirstHearingDateChronologyError: string | null;
    grievanceDecisionDateChronologyError: string | null;
    judgeDecisionDateChronologyError: string | null;
    cassationFilingDateChronologyError: string | null;
    cassationDecisionDateError: string | null;
    cassationFilingDetailsComplete: boolean;
    phase1NewSessionMinYmd: string;
    phase2NewSessionMinYmd: string;
    effectiveJudgeDecisionDate: string;
    effectiveRejectionNotificationDate: string;
    grievanceTimingGateReady: boolean;
    grievanceFilingMinYmd: string;
    grievanceFirstHearingMinYmd: string;
    oppositeRole: (role: 'client' | 'opponent') => 'client' | 'opponent';
};

export function useOrderFileLifecycleActions(args: UseOrderFileLifecycleActionsArgs) {
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
    } = args;

    const focusStep = (step: 'judge' | 'execution' | 'grievance' | 'cassation') => {
        setActiveLifecycleStep(step);
    };

    const toggleLifecycleStep = (step: 'judge' | 'execution' | 'grievance' | 'cassation') => {
        setActiveLifecycleStep((s) => (s === step ? null : step));
    };

    const registerOpponentIntervention = async () => {
        if (isFinalized || !isStateOrder || hasIntervention || isCaseTerminated) return;
        const ok = await requestConfirm(
            '⚠️ تحذير قانوني\n\nبتسجيل تدخل الخصم والتحويل إلى مسار وجاهي، يتحول سير الإضبارة إلى مرافعة أمام القاضي.\nلا يمكن التراجع عن هذا الإجراء لاحقاً.\n\nهل أنت متأكد من المتابعة؟',
        );
        if (!ok) return;
        setHasIntervention(true);
        const patch = { hasIntervention: true } as Record<string, unknown>;
        if (caseId) {
            await flushPersistPatch(patch);
            onCaseUpdated?.(caseId, patch);
        }
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
        appendCaseEvent('تحويل المسار إلى مرافعة وجاهية (تدخل الخصم أمام القاضي)', 'action');
    };

    const fastForwardToGrievance = () => {
        if (isFinalized) return;
        const decisionDate = todayYmdValue;
        setJudgeDecision({ decision: 'accepted', decisionDate, requiresGuarantee: false });
        setGuaranteeSubmitted(false);
        setFileStatus(showGrievanceStep ? 'executed' : 'cassation');
        setIsSecretMode(false);
        setEditJudge(false);
        const patch: Record<string, unknown> = {
            judgeDecision: 'accepted',
            judgeDecisionDate: decisionDate,
            requiresGuarantee: false,
            guaranteeSubmitted: false,
            guaranteeAmount: null,
            guaranteeReceiptNumber: null,
            legalState: showGrievanceStep ? 'Awaiting_Grievance' : 'Awaiting_Cassation',
        };
        void persistPatch(patch);
        if (caseId) onCaseUpdated?.(caseId, patch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
        appendCaseEvent(
            showGrievanceStep
                ? '⏩ تخطي خطوة قرار القاضي والدخول مباشرة إلى مرحلة التظلم (وكيل المطلوب ضده)'
                : '⏩ تخطي خطوة قرار القاضي والدخول مباشرة إلى الطعن التمييزي (وكيل المطلوب ضده)',
            'system',
        );
        focusStep(showGrievanceStep ? 'grievance' : 'cassation');
    };

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
                    '⚠️ تنبيه قانوني: تم تسجيل جلسة (إبطال الطلب). هل أنت متأكد من حفظ المرحلة وإغلاق الإضبارة نهائياً؟',
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
                '⚠️ تنبيه قانوني: هل أنت متأكد من حفظ القرار؟ بمجرد الحفظ لا يمكن تعديل هذه الخطوة وسيتم بناء المدد القانونية عليها.',
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
                    ? '⚠️ يجب إضافة جلسة تظلم واختيار (ختام المرافعة) قبل حفظ وإنهاء المرحلة.'
                    : '⚠️ لإدخال قرار التظلم، يجب إضافة جلسة جديدة واختيار (ختام المرافعة).',
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
                setGrievanceError('⏳ لا يمكن إغلاق مرحلة التظلم قبل انقضاء المدة المحددة.');
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
        };

        void persistPatch(patch);
        if (caseId) onCaseUpdated?.(caseId, patch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));

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
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
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
            grievanceData.rejectionNotificationDate || (caseData as any)?.notificationDate || '',
        ).trim();
        const patch: Record<string, unknown> = {
            grievanceLegalEndDate: endDateValue || null,
            legalState: 'Awaiting_Grievance',
        };
        if (notif) patch.rejectionNotificationDate = notif;
        void persistPatch(patch);
        if (caseId) onCaseUpdated?.(caseId, patch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
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

    const handleGrievanceDecisionSubmit = (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        if (isFinalized) return;
        setGrievanceDecisionError(null);
        if (!grievanceProceedingsClosed) {
            setGrievanceDecisionError('لا يمكن إدخال نتيجة التظلم قبل ختام المرافعة أو تثبيت ختام وتعيين يوم للقرار');
            return;
        }
        if (!grievanceDecision.decision || !grievanceDecision.decisionDate) {
            setGrievanceDecisionError('يرجى إدخال نتيجة التظلم وتاريخ القرار');
            return;
        }
        if (grievanceDecisionDateChronologyError) {
            setGrievanceDecisionError(grievanceDecisionDateChronologyError);
            return;
        }
        const patch: Record<string, unknown> = {
            grievanceDecision: grievanceDecision.decision,
            grievanceDecisionDate: grievanceDecision.decisionDate,
            legalState: 'Awaiting_Cassation',
        };
        void persistPatch(patch);
        if (caseId) onCaseUpdated?.(caseId, patch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
        setActiveLifecycleStep(null);
        appendCaseEvent(`نتيجة التظلم: ${grievanceDecision.decision} بتاريخ ${formatDateText(grievanceDecision.decisionDate)}`, 'action');
    };

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

    const clearJudgeDecision = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const ok = await requestConfirm('⚠️ تحذير: سيتم مسح بيانات القرار بالكامل. هل أنت متأكد؟');
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

    const clearGrievance = async (e?: React.SyntheticEvent) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        const ok = await requestConfirm('⚠️ تحذير: سيتم مسح كافة توقيتات وجلسات التظلم وإعادتك للبداية. هل أنت متأكد؟');
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

    const updatePhase2FirstHearingDate = (value: string) => {
        if (isFinalized) return;
        const y =
            String(value || '')
                .trim()
                .match(/^(\d{4}-\d{2}-\d{2})/)?.[1] ?? '';
        setPhase2FirstHearingDate(y);
        const p2Active = getActiveDate(
            hearings.filter((h) => h.stage === 'grievance'),
            y,
        );
        persistAndMerge({
            grievanceFirstHearingDate: y || null,
            phase2FirstHearingDate: y || null,
            grievanceSessionDate: p2Active || null,
        });
    };

    const updateHearings = (next: CaseHearing[]) => {
        setHearings(next);
        const p2Sessions = next.filter((h) => h.stage === 'grievance');
        const p2Active = getActiveDate(p2Sessions, phase2FirstHearingDate);
        persistAndMerge({
            hearings: next,
            grievanceSessionDate: p2Active || null,
        });
    };

    const updateExpertModule = (patch: Partial<ExpertModule>) => {
        const next = { ...expertModule, ...patch };
        setExpertModule(next);
        persistAndMerge({ expertModule: next });
    };

    const updateRegistrationData = (
        patch: Partial<{ receiptNumber: string; receiptDate: string; notificationMethod: string; notificationDate: string }>,
    ) => {
        pendingRegistrationSyncRef.current = true;
        setRegistrationData((prev) => ({ ...prev, ...patch }));
    };

    useEffect(() => {
        if (!pendingRegistrationSyncRef.current) return;
        pendingRegistrationSyncRef.current = false;
        const next = registrationData;
        persistAndMerge({
            feeReceiptNumber: next.receiptNumber || null,
            feeReceiptDate: next.receiptDate || null,
            initialNotificationMethod: next.notificationMethod || null,
            initialNotificationDate: next.notificationDate || null,
        });
    }, [registrationData]);

    const addHearing = () => {
        if (isFinalized) return;
        setHearingsError(null);
        const preDecisionAlreadyTerminated = hearings.some((h) => {
            if (h.stage !== 'pre_decision') return false;
            const outcome = getPreDecisionSessionOutcome(String(h.notes || ''), h.nextSessionDate);
            return (
                outcome === PRE_DECISION_OUTCOME_CLOSE ||
                outcome === PRE_DECISION_OUTCOME_NULLIFY ||
                outcome === 'إنهاء الطلب'
            );
        });
        if (hearingDraft.stage === 'pre_decision' && preDecisionAlreadyTerminated) {
            setHearingsError('تم إغلاق مسار الجلسات (ختام مرافعة أو إبطال). لا يمكن إضافة جلسات جديدة.');
            return;
        }
        if (!hearingDraft.sessionDate) {
            setHearingsError('يرجى إدخال تاريخ الجلسة');
            return;
        }
        if (hearingDraft.stage === 'grievance') {
            const filing = String(grievanceData.filingDate || '').trim();
            const session = String(hearingDraft.sessionDate || '').trim();
            if (filing && session && session < filing) {
                setHearingsError('⚠️ لا يمكن أن يكون تاريخ جلسة التظلم أقدم من تاريخ تقديم التظلم');
                return;
            }
            const minG = phase2NewSessionMinYmd;
            if (minG && session && session < minG) {
                setHearingsError('⚠️ تاريخ الجلسة يخالف الترتيب الزمني لمرحلة التظلم');
                return;
            }
        }
        if (hearingDraft.stage === 'pre_decision') {
            const session = String(hearingDraft.sessionDate || '').trim();
            const minP = phase1NewSessionMinYmd;
            if (minP && session && session < minP) {
                setHearingsError('⚠️ تاريخ الجلسة يخالف الترتيب الزمني لمرحلة ما قبل القرار');
                return;
            }
        }
        if (hearingDraft.outcome === 'adjourn') {
            if (!hearingDraft.nextSessionDate) {
                setHearingsError('يرجى إدخال موعد الجلسة القادمة');
                return;
            }
            if (String(hearingDraft.nextSessionDate || '').trim() < String(hearingDraft.sessionDate || '').trim()) {
                setHearingsError('⚠️ موعد الجلسة القادمة يجب أن يكون بعد/مساوٍ لتاريخ الجلسة');
                return;
            }
            const adjournReason = hearingDraft.notes.trim();
            if (!adjournReason) {
                setHearingsError('يرجى إدخال سبب التأجيل');
                return;
            }
            if (!isAdjournReasonValid(adjournReason)) {
                setHearingsError('سبب التأجيل يجب أن يحتوي على نص وليس أرقاماً فقط');
                return;
            }
        }

        const baseNotes = hearingDraft.notes.trim();
        const notes =
            hearingDraft.outcome === 'terminate'
                ? PRE_DECISION_OUTCOME_NULLIFY
                : hearingDraft.outcome === 'close'
                  ? PRE_DECISION_OUTCOME_CLOSE
                  : baseNotes;
        const item: CaseHearing = {
            id: uuidv4(),
            stage: hearingDraft.stage,
            sessionDate: hearingDraft.sessionDate,
            notes,
            nextSessionDate: hearingDraft.outcome === 'adjourn' ? hearingDraft.nextSessionDate : '',
            createdAt: new Date().toISOString(),
        };
        updateHearings([item, ...hearings]);
        setHearingDraft({
            open: false,
            stage: hearingDraft.stage,
            outcome: 'adjourn',
            sessionDate: '',
            notes: '',
            nextSessionDate: '',
            decisionDate: '',
        });
        if (hearingDraft.outcome === 'close' && hearingDraft.stage === 'pre_decision') {
            setPreDecisionClosed(true);
            persistAndMerge({ preDecisionClosed: true });
        }
        appendCaseEvent(
            hearingDraft.outcome === 'terminate'
                ? `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} (إبطال الطلب)`
                : hearingDraft.outcome === 'close'
                ? `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} (ختام المرافعة)`
                : `إضافة جلسة (${hearingDraft.stage === 'grievance' ? 'تظلم' : 'قبل القرار'}): ${formatDateText(item.sessionDate)} → ${formatDateText(item.nextSessionDate)}`,
            'action',
        );
    };

    const finalizeCase = (reason: 'cassation_decision' | 'expired' | 'no_grievance') => {
        if (!caseId) return;
        if (isFinalized) return;
        const archivedAt = new Date().toISOString();
        const archivedReason =
            reason === 'cassation_decision'
                ? 'انتهاء مرحلة التمييز'
                : reason === 'expired'
                  ? 'انقضاء المدة القانونية'
                  : 'عدم تقديم تظلم';
        const patch: Record<string, unknown> = {
            archived: true,
            archivedAt,
            archivedReason,
            phase: 'completed',
            status: 'completed',
            legalState: null,
            finalityReason: reason,
        };
        void persistPatch(patch);
        onCaseUpdated?.(caseId, patch);
        setCaseData((prev: any) => ({ ...(prev || {}), ...patch }));
        appendCaseEvent(
            reason === 'no_grievance'
                ? 'اكتسبت الإضبارة الدرجة القطعية لعدم تقديم تظلم'
                : reason === 'expired'
                  ? 'تمت أرشفة الإضبارة لانقضاء المدة القانونية'
                  : 'تمت أرشفة الإضبارة بعد صدور قرار التمييز',
            'system',
        );
        setActiveLifecycleStep(null);
        setEditJudge(false);
        setEditExecution(false);
        setEditRejectionNotice(false);
        setEditGrievance(false);
        setEditCassation(false);
    };

    return {
        focusStep,
        toggleLifecycleStep,
        registerOpponentIntervention,
        fastForwardToGrievance,
        handleJudgeDecisionSubmit,
        handleExecutionSubmit,
        handleRejectionNotificationSubmit,
        handleGrievanceSubmit,
        persistGrievanceOutcomeDraft,
        confirmGrievanceTiming,
        confirmGrievanceDetails,
        handleGrievanceDecisionSubmit,
        handleCassationPhaseSubmit,
        clearJudgeDecision,
        clearExecution,
        clearGrievance,
        clearCassation,
        updateHearings,
        updateExpertModule,
        updateRegistrationData,
        addHearing,
        updatePhase2FirstHearingDate,
        finalizeCase,
    };
}
