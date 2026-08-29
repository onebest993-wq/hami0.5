import { useMemo } from 'react';
import { isIqrarRequest } from '@/app/domain/urgent/formPathwayConstants';
import { resolveProcedureCategory } from '@/app/domain/urgent/procedureCategory';
import { isPreDecisionNullifyNotes } from '../utils/hearingRules';

type UseOrderFileCasePathwayArgs = {
    caseData: Record<string, unknown> | null | undefined;
    fd: Record<string, unknown>;
    fileStatus: import('../types').FileStatus;
    activeLifecycleStep: 'judge' | 'execution' | 'grievance' | 'cassation' | null;
    judgeDecision: import('../types').JudgeDecision;
    grievanceDecision: import('../types').GrievanceDecision;
    hearings: import('../types').CaseHearing[];
    preDecisionClosed: boolean;
};

export function useOrderFileCasePathway({
    caseData,
    fd,
    fileStatus,
    activeLifecycleStep,
    judgeDecision,
    grievanceDecision,
    hearings,
    preDecisionClosed,
}: UseOrderFileCasePathwayArgs) {
    const shouldSkipExecutionStep = useMemo(() => {
        const procedureType = String(caseData?.type ?? fd?.type ?? '').trim();
        const t = String(caseData?.specificActionType ?? '').trim();
        if (procedureType === 'state_order') return true;
        return ['وضع إشارة', 'منع سفر', 'إيقاف', 'حجز'].some((k) => t.includes(k));
    }, [caseData?.specificActionType, caseData?.type, fd?.type]);

    // حالة الملف — نقطة لونية في الترويسة بلا إيموجي
    const getStatusConfig = (): { text: string; color: string } => {
        const finalized =
            !!caseData?.archived || caseData?.status === 'completed' || caseData?.phase === 'completed';
        if (finalized) {
            return { text: 'اكتسب الدرجة القطعية / منتهي', color: 'green' };
        }

        const cassationActive =
            caseData?.cassationOutcome === 'filed' ||
            !!caseData?.cassationDecision ||
            fileStatus === 'cassation' ||
            activeLifecycleStep === 'cassation';
        if (cassationActive) {
            return { text: 'في مرحلة الطعن التمييزي', color: 'purple' };
        }

        const localShowGrievanceStep = String(caseData?.type ?? fd?.type ?? '').trim() !== 'urgent_action';
        const grievanceActive =
            localShowGrievanceStep &&
            (caseData?.grievanceOutcome === 'filed' ||
                !!caseData?.grievanceDecision ||
                fileStatus === 'grievance' ||
                activeLifecycleStep === 'grievance');
        if (grievanceActive) {
            return { text: 'في مرحلة التظلم', color: 'purple' };
        }

        const executionActive =
            !shouldSkipExecutionStep &&
            (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') &&
            fileStatus === 'accepted';
        if (executionActive) {
            return { text: 'قيد المفاتحة والتبليغ', color: 'blue' };
        }

        if (preDecisionClosed && !judgeDecision.decision) {
            return { text: 'بانتظار النطق بالقرار', color: 'amber' };
        }

        const hasHearings = hearings.some((h) => h.stage === 'pre_decision');
        if (hasHearings && !preDecisionClosed) {
            return { text: 'قيد المرافعة', color: 'slate' };
        }

        return { text: 'قيد انتظار قرار القاضي', color: 'amber' };
    };

    const statusConfig = getStatusConfig();

    const requestTypeText = useMemo(() => {
        return String(caseData?.actionPath ?? caseData?.pathwayTitle ?? '').trim();
    }, [caseData?.actionPath, caseData?.pathwayTitle]);
    const resolvedWorkspaceRequestType = useMemo(() => {
        return String(caseData?.specificActionType ?? caseData?.actionPath ?? '').trim();
    }, [caseData?.specificActionType, caseData?.actionPath]);
    const isIqrar = useMemo(() => isIqrarRequest(resolvedWorkspaceRequestType), [resolvedWorkspaceRequestType]);
    const isIqrarContext = isIqrar;
    const procedureDetailsForPopover = useMemo(() => {
        const details = String(caseData?.procedureDetails ?? '').trim();
        const subject = String(caseData?.requestSubject ?? '').trim();
        if (isIqrarContext) return subject || details;
        return details || subject;
    }, [caseData, isIqrarContext]);

    const partyLabel = (role: 'client' | 'opponent' | null) => {
        if (isIqrarContext) {
            if (role === 'client') return 'المُقَر له (المستفيد طالب الإقرار)';
            if (role === 'opponent') return 'المُقِر (المعترف بالحق)';
        }
        if (role === 'client') return 'المستدعي';
        if (role === 'opponent') return 'المطلوب ضده';
        return '—';
    };
    const oppositeRole = (role: 'client' | 'opponent') => (role === 'client' ? 'opponent' : 'client');
    const isUrgentLawsuit = useMemo(() => {
        const t = requestTypeText;
        if (t.includes('قضاء مستعجل') || t.includes('القضاء المستعجل') || t.includes('دعوى مستعجلة') || t.includes('مستعجلة')) return true;
        return String(caseData?.type ?? '') === 'urgent_action';
    }, [caseData?.type, requestTypeText]);
    const isOrderOnPetition = useMemo(() => {
        if (isUrgentLawsuit) return false;
        const t = requestTypeText;
        if (t.includes('أمر ولائي') || t.includes('أمر على') || t.includes('عريضة') || t.includes('عرائض') || t.includes('أمر')) return true;
        return String(caseData?.type ?? '') === 'state_order';
    }, [caseData?.type, isUrgentLawsuit, requestTypeText]);
    const isStateOrder = useMemo(() => {
        return String(caseData?.type ?? fd?.type ?? '').trim() === 'state_order';
    }, [caseData?.type, fd?.type]);
    const isUrgentJustice = useMemo(() => {
        return isUrgentLawsuit || String(caseData?.type ?? '').trim() === 'urgent_justice';
    }, [caseData?.type, isUrgentLawsuit]);
    const procedureCategory = useMemo(
        () =>
            resolveProcedureCategory(
                (caseData as { procedureCategory?: string })?.procedureCategory,
                resolvedWorkspaceRequestType,
            ),
        [(caseData as { procedureCategory?: string })?.procedureCategory, resolvedWorkspaceRequestType],
    );
    const showGrievanceStep = procedureCategory === 'petition_orders' && !isIqrarContext;
    const grievanceStepNumber = 2;
    const cassationStepNumber = showGrievanceStep ? 3 : 2;
    const showInitialNotification = isUrgentLawsuit;
    /** Phase 42 — جلسات ما قبل القرار خاصة بالدعاوى المدنية فقط؛ الأوامر/الحجج تنتقل مباشرة لقرار القاضي */
    const showPreDecisionHearings = false;
    const preDecisionTerminateExists = useMemo(() => {
        return hearings.some((h) => h.stage === 'pre_decision' && isPreDecisionNullifyNotes(String(h.notes || '')));
    }, [hearings]);

    const computedGrievanceFiledBy = useMemo((): 'client' | 'opponent' | null => {
        if (judgeDecision.decision === 'rejected') return 'client';
        if (judgeDecision.decision === 'accepted' || judgeDecision.decision === 'partially_accepted') return 'opponent';
        return null;
    }, [judgeDecision.decision]);

    const computedCassationFiledBy = useMemo((): 'client' | 'opponent' | null => {
        if (!computedGrievanceFiledBy) return null;
        if (!showGrievanceStep) return computedGrievanceFiledBy;
        if (!grievanceDecision.decision) return null;
        if (grievanceDecision.decision === 'confirmed') return computedGrievanceFiledBy;
        return oppositeRole(computedGrievanceFiledBy);
    }, [computedGrievanceFiledBy, grievanceDecision.decision, showGrievanceStep, oppositeRole]);

    return {
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
        procedureCategory,
        showGrievanceStep,
        grievanceStepNumber,
        cassationStepNumber,
        showInitialNotification,
        showPreDecisionHearings,
        preDecisionTerminateExists,
        computedGrievanceFiledBy,
        computedCassationFiledBy,
    };
}
