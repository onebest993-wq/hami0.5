import type { UseOrderFileLifecycleActionsArgs } from './types';

export type FinalizeCaseReason = 'cassation_decision' | 'expired' | 'no_grievance';

export function createFinalizeCase(ctx: UseOrderFileLifecycleActionsArgs) {
    const {
        caseId,
        isFinalized,
        persistPatch,
        onCaseUpdated,
        setCaseData,
        appendCaseEvent,
        setActiveLifecycleStep,
        setEditJudge,
        setEditExecution,
        setEditRejectionNotice,
        setEditGrievance,
        setEditCassation,
    } = ctx;

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

    return finalizeCase;
}
