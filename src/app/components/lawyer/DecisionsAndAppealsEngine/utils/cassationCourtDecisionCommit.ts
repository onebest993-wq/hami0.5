import type { Decision } from '../types';
import type { AppealUiPerspective } from '../appealUiLabels';
import {
    petitionGrantedAfterCassation,
    hubWithInferredAppealOrigin,
    resolveCassationFilerActor,
    isCreditorInitiatedExecutorRequest,
    isLawyerCassationNaqdResume,
    newEventId,
} from '../utils';

export type CassationCourtChoice = 'rad_laheeza' | 'naqd';

export function buildCassationCourtDecisionNext(
    decisions: Decision[],
    decision: Decision,
    choice: CassationCourtChoice,
    appealPerspective: AppealUiPerspective
): { next: Decision[]; mergedRowId: string; labelAr: NonNullable<Decision['appealResult']>; outcomeLine: string } {
    const srcId = String(decision.appealSourceDecisionId ?? '').trim();
    const parentDecision = srcId ? (decisions.find((d) => d.id === srcId) ?? null) : null;
    const petitionRow: Decision = parentDecision
        ? {
              ...parentDecision,
              appealActor: decision.appealActor ?? parentDecision.appealActor,
              appealMethod: decision.appealMethod ?? parentDecision.appealMethod,
              appealStatus: decision.appealStatus ?? parentDecision.appealStatus,
              appealPhase: decision.appealPhase ?? parentDecision.appealPhase,
              appealBaseBranch: decision.appealBaseBranch ?? parentDecision.appealBaseBranch,
              appealResult: decision.appealResult ?? parentDecision.appealResult,
              tamyeezDecisionNumber:
                  decision.tamyeezDecisionNumber ?? parentDecision.tamyeezDecisionNumber,
              appealTimelineLogs: [
                  ...(Array.isArray(parentDecision.appealTimelineLogs)
                      ? parentDecision.appealTimelineLogs
                      : []),
                  ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
              ],
          }
        : decision;

    const petitionGranted = petitionGrantedAfterCassation(petitionRow, choice);
    const labelAr: NonNullable<Decision['appealResult']> =
        choice === 'rad_laheeza' ? 'تصديق القرار' : 'نقض القرار';
    const origPetitionGranted =
        petitionRow.appealBaseBranch === 'after_approval' ||
        (petitionRow.appealBaseBranch == null &&
            (petitionRow.executorOutcome === 'approved' ||
                petitionRow.executorOutcome === 'alternative'));
    const appealWorkflowState =
        !petitionGranted && origPetitionGranted
            ? ('REVOKED_BY_APPEAL' as const)
            : petitionGranted
              ? ('FINAL_ACCEPTED' as const)
              : ('FINAL_REJECTED' as const);
    const now = new Date().toISOString();
    const hub = hubWithInferredAppealOrigin(petitionRow);
    const creditorPartyRequest = isCreditorInitiatedExecutorRequest(hub);
    const outcomeLine = (() => {
        if (appealPerspective === 'debtor_agent') {
            if (creditorPartyRequest) {
                return petitionGranted
                    ? 'النتيجة: طلب الدائن غير مقبول نهائياً — لصالح موكّلك.'
                    : 'النتيجة: طلب الدائن مُثبَّت نهائياً — ضد موكّلك.';
            }
            return petitionGranted
                ? 'النتيجة: طلب موكّلك مقبول نهائياً وقُفل القرار.'
                : 'النتيجة: طلب موكّلك مرفوض نهائياً وقُفل القرار.';
        }
        if (!creditorPartyRequest) {
            return petitionGranted
                ? 'النتيجة: طلب المدين مقبول نهائياً وقُفل القرار.'
                : 'النتيجة: طلب المدين مرفوض نهائياً وقُفل القرار.';
        }
        return petitionGranted
            ? 'النتيجة: طلب الدائن/تنفيذ مقبول نهائياً وقُفل القرار.'
            : 'النتيجة: طلب الدائن/تنفيذ مرفوض نهائياً وقُفل القرار.';
    })();
    const cassationFiler = resolveCassationFilerActor(petitionRow);
    const tamyeezNum = String(
        decision.tamyeezDecisionNumber ?? parentDecision?.tamyeezDecisionNumber ?? ''
    ).trim();
    const resolvedAppealPatch: Partial<Decision> = {
        appealPhase: null,
        appealStatus: 'final',
        appealResult: labelAr,
        appealMethod: 'tamyeez',
        appealActor: cassationFiler ?? petitionRow.appealActor ?? null,
        status: petitionGranted ? 'accepted' : 'rejected',
        executorOutcome: petitionGranted ? 'approved' : 'rejected',
        appealWorkflowState,
        awaitingCassationEntryBy: null,
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        noAppealChosen: false,
        ...(tamyeezNum ? { tamyeezDecisionNumber: tamyeezNum } : {}),
    };

    const isNaqd = choice === 'naqd';
    const hubParent = hubWithInferredAppealOrigin(parentDecision ?? petitionRow);
    const targetExecutorOutcome = parentDecision?.executorOutcome ?? petitionRow.executorOutcome;
    const previewPipe: Decision = { ...petitionRow, ...resolvedAppealPatch };
    const lawyerNaqdResume =
        isNaqd && petitionGranted && isLawyerCassationNaqdResume(previewPipe, hubParent);
    const forceFlipParentRequestPatch: Partial<Decision> | null = isNaqd
        ? lawyerNaqdResume
            ? null
            : (() => {
                  if (
                      targetExecutorOutcome === 'approved' ||
                      targetExecutorOutcome === 'alternative'
                  ) {
                      return {
                          executorOutcome: 'rejected' as const,
                          status: 'rejected' as const,
                      };
                  }
                  if (targetExecutorOutcome === 'rejected') {
                      return {
                          executorOutcome: 'approved' as const,
                          status: 'accepted' as const,
                      };
                  }
                  return null;
              })()
        : null;

    const logEntry = {
        id: newEventId(),
        at: now,
        message: outcomeLine,
    tone: petitionGranted ? ('emerald' as const) : ('rose' as const),
    };

    let next: Decision[];
    if (srcId) {
        const baseParent = parentDecision ?? decisions.find((d) => d.id === srcId) ?? null;
        const mergedOriginal: Decision = {
            ...(baseParent ?? petitionRow),
            ...resolvedAppealPatch,
            ...(forceFlipParentRequestPatch ?? {}),
            id: srcId,
            activeAppealCopyId: null,
            appealTimelineLogs: [
                ...(Array.isArray(baseParent?.appealTimelineLogs) ? baseParent.appealTimelineLogs : []),
                ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                logEntry,
            ],
        };
        const withoutCopy = decisions.filter((d) => d.id !== decision.id);
        const parentExists = withoutCopy.some((d) => d.id === srcId);
        next = parentExists
            ? withoutCopy.map((d) => (d.id === srcId ? mergedOriginal : d))
            : [...withoutCopy, mergedOriginal];
    } else {
        next = decisions.map((d): Decision => {
            if (d.id !== decision.id) return d;
            return {
                ...d,
                ...resolvedAppealPatch,
                ...(forceFlipParentRequestPatch ?? {}),
            };
        });
    }

    const mergedRowId = srcId || decision.id;
    return { next, mergedRowId, labelAr, outcomeLine };
}
