import type { UseOrderFileLifecycleActionsArgs } from './types';

export function createNavigationActions(ctx: UseOrderFileLifecycleActionsArgs) {
    const {
        setActiveLifecycleStep,
        isFinalized,
        isStateOrder,
        hasIntervention,
        isCaseTerminated,
        requestConfirm,
        caseId,
        flushPersistPatch,
        onCaseUpdated,
        setHasIntervention,
        setCaseData,
        appendCaseEvent,
        todayYmdValue,
        setJudgeDecision,
        setGuaranteeSubmitted,
        setFileStatus,
        showGrievanceStep,
        setIsSecretMode,
        setEditJudge,
        persistPatch,
    } = ctx;

    const focusStep = (step: 'judge' | 'execution' | 'grievance' | 'cassation') => {
    setActiveLifecycleStep(step);
};

const toggleLifecycleStep = (step: 'judge' | 'execution' | 'grievance' | 'cassation') => {
    setActiveLifecycleStep((s) => (s === step ? null : step));
};

const registerOpponentIntervention = async () => {
    if (isFinalized || !isStateOrder || hasIntervention || isCaseTerminated) return;
    const ok = await requestConfirm(
        'تحذير قانوني\n\nبتسجيل تدخل الخصم والتحويل إلى مسار وجاهي، يتحول سير الإضبارة إلى مرافعة أمام القاضي.\nلا يمكن التراجع عن هذا الإجراء لاحقاً.\n\nهل أنت متأكد من المتابعة؟',
    );
    if (!ok) return;
    setHasIntervention(true);
    const patch = { hasIntervention: true } as Record<string, unknown>;
    if (caseId) {
        await flushPersistPatch(patch);
        onCaseUpdated?.(caseId, patch);
    }
    setCaseData((prev) => ({ ...(prev || {}), ...patch }));
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
    setCaseData((prev) => ({ ...(prev || {}), ...patch }));
    appendCaseEvent(
        showGrievanceStep
            ? 'تخطي خطوة قرار القاضي والدخول مباشرة إلى مرحلة التظلم (وكيل المطلوب ضده)'
            : 'تخطي خطوة قرار القاضي والدخول مباشرة إلى الطعن التمييزي (وكيل المطلوب ضده)',
        'system',
    );
    focusStep(showGrievanceStep ? 'grievance' : 'cassation');
};

    return {
        focusStep,
        toggleLifecycleStep,
        registerOpponentIntervention,
        fastForwardToGrievance,
    };
}
