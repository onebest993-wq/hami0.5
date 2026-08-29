import { formatDateText } from '../../utils/formatters';
import type { UseOrderFileLifecycleActionsArgs } from './types';
import { createHandleJudgeDecisionSubmit } from './createHandleJudgeDecisionSubmit';

type JudgeExtra = { focusStep: (step: 'judge' | 'execution' | 'grievance' | 'cassation') => void };

export function createJudgeActions(
    ctx: UseOrderFileLifecycleActionsArgs, extra: JudgeExtra,
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
        setJudgeDecision,
        executionData,
        setExecutionData,
        setGrievanceData,
        setPhase2FirstHearingDate,
        setGrievanceLegalEndDate,
        setGrievanceTimingConfirmed,
        setGrievanceDetailsConfirmed,
        setGrievanceDecision,
        setCassationData,
        setCassationDecision,
        guaranteeSubmitted,
        setGuaranteeSubmitted,
        guaranteeDetails,
        hearings,
        setEditJudge,
        setEditExecution,
        setEditRejectionNotice,
        setEditGrievance,
        setEditCassation,
        setJudgeError,
        setExecutionError,
        setRejectionNoticeError,
        persistPatch,
        flushPersistPatch,
        persistAndMerge,
        appendCaseEvent,
        requestConfirm,
        showGrievanceStep,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        isIqrarContext,
        isCaseTerminated,
        hasSessions,
        judgeDecisionDateChronologyError,
        defaultDeadlineDays,
        setGrievanceDecisionNotificationConfirmed,
        setGrievancePetitionNotificationDate,
        setGrievancePetitionNotificationConfirmed,
        grievanceData,
    } = ctx;

    const handleJudgeDecisionSubmit = createHandleJudgeDecisionSubmit(
        {
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
        },
        extra,
    );

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
        setIsSecretMode(false); // CRITICAL: Remove secret mode after execution
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
        setCaseData((prev) => ({ ...(prev || {}), ...patch }));
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
        setCaseData((prev) => ({ ...(prev || {}), ...patch }));
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
