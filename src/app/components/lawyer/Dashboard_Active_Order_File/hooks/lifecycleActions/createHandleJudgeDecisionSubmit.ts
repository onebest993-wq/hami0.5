import { formatDateText, formatDateTimeText } from '../../utils/formatters';
import type { FileStatus } from '../../types';
import type { UseOrderFileLifecycleActionsArgs } from './types';
import { buildNormalizedJudgeHearingsPayload } from './buildNormalizedJudgeHearingsPayload';

type JudgeExtra = { focusStep: (step: 'judge' | 'execution' | 'grievance' | 'cassation') => void };

type JudgeDecisionSubmitCtx = Pick<
    UseOrderFileLifecycleActionsArgs,
    | 'caseId'
    | 'setCaseData'
    | 'onCaseUpdated'
    | 'isFinalized'
    | 'fileStatus'
    | 'setFileStatus'
    | 'isSecretMode'
    | 'setIsSecretMode'
    | 'activeLifecycleStep'
    | 'setActiveLifecycleStep'
    | 'judgeDecision'
    | 'guaranteeSubmitted'
    | 'guaranteeDetails'
    | 'hearings'
    | 'setEditJudge'
    | 'setEditExecution'
    | 'setEditRejectionNotice'
    | 'setEditGrievance'
    | 'setEditCassation'
    | 'setJudgeError'
    | 'flushPersistPatch'
    | 'appendCaseEvent'
    | 'requestConfirm'
    | 'showGrievanceStep'
    | 'showPreDecisionHearings'
    | 'preDecisionTerminateExists'
    | 'isIqrarContext'
    | 'isCaseTerminated'
    | 'hasSessions'
    | 'judgeDecisionDateChronologyError'
>;

export function createHandleJudgeDecisionSubmit(
    ctx: JudgeDecisionSubmitCtx,
    _extra: JudgeExtra,
) {
    const {
        caseId,
        setCaseData,
        onCaseUpdated,
        isFinalized,
        fileStatus,
        setFileStatus,
        isSecretMode,
        setIsSecretMode,
        activeLifecycleStep,
        setActiveLifecycleStep,
        judgeDecision,
        guaranteeSubmitted,
        guaranteeDetails,
        hearings,
        setEditJudge,
        setEditExecution,
        setEditRejectionNotice,
        setEditGrievance,
        setEditCassation,
        setJudgeError,
        flushPersistPatch,
        appendCaseEvent,
        requestConfirm,
        showGrievanceStep,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        isIqrarContext,
        isCaseTerminated,
        hasSessions,
        judgeDecisionDateChronologyError,
    } = ctx;

    return async (e?: React.SyntheticEvent) => {
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

                const hearingsPayload = buildNormalizedJudgeHearingsPayload(hearings);
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
                setCaseData((prev) => ({ ...(prev || {}), ...patch }));
                setActiveLifecycleStep(null);
                setEditJudge(false);
                setEditExecution(false);
                setEditRejectionNotice(false);
                setEditGrievance(false);
                setEditCassation(false);
                appendCaseEvent(
                    `تم إبطال الطلب وإغلاق الإضبارة نهائياً بتاريخ ${formatDateTimeText(archivedAt)}`,
                    'system',
                );
                return;
            }
            if (showPreDecisionHearings && hasSessions && !isCaseTerminated) {
                setJudgeError('لا يمكن إدخال قرار القاضي قبل ختام المرافعة أو إبطال الطلب.');
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
                setCaseData((prev) => ({ ...(prev || {}), ...patch }));
                setFileStatus('accepted');
                setIsSecretMode(false);
                setActiveLifecycleStep(null);
                appendCaseEvent(
                    `تم إصدار حجة الإقرار والمصادقة عليها بتاريخ ${formatDateText(decisionDateValue)}`,
                    'action',
                );
                appendCaseEvent(
                    `تم أرشفة إضبارة الإقرار بتاريخ ${formatDateTimeText(archivedAt)}`,
                    'system',
                );
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

            const hearingsPayload = buildNormalizedJudgeHearingsPayload(hearings);

            const patch = {
                judgeDecision: judgeDecision.decision,
                judgeDecisionDate: decisionDateValue,
                requiresGuarantee: !!judgeDecision.requiresGuarantee,
                guaranteeSubmitted: judgeDecision.requiresGuarantee ? !!guaranteeSubmitted : false,
                guaranteeAmount: judgeDecision.requiresGuarantee
                    ? String(guaranteeDetails?.amount || '').trim()
                    : null,
                guaranteeReceiptNumber: judgeDecision.requiresGuarantee
                    ? String(guaranteeDetails?.receiptNumber || '').trim()
                    : null,
                hearings: hearingsPayload,
                legalState: showGrievanceStep ? 'Awaiting_Grievance' : 'Awaiting_Cassation',
            } as Record<string, unknown>;

            if (caseId) {
                await flushPersistPatch(patch);
                onCaseUpdated?.(caseId, patch);
            }
            setCaseData((prev) => ({ ...(prev || {}), ...patch }));

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
                appendCaseEvent(
                    `قرار القاضي: رفض بتاريخ ${formatDateText(decisionDateValue)}`,
                    'action',
                );
            }
            setEditJudge(false);
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'خطأ غير معروف';
            setJudgeError(`حدث خطأ أثناء حفظ القرار: ${msg}`);
        }
    };
}
