import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import type { Decision } from '../types';
import {
    petitionGrantedAfterCassation,
    hubWithInferredAppealOrigin,
    resolveCassationFilerActor,
    isCreditorInitiatedExecutorRequest,
    isLawyerCassationNaqdResume,
    newEventId,
} from '../utils';
import { dispatchHeirSubstitutionOutcomeIfAny } from '../engine/decisionsEngineTypes';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsCassationMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        executionId,
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        reloadFromStorage,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
        setDecisionsHubTab,
        goToAppealsWithScroll,
    } = params;

    const applyCassationCourtDecision = React.useCallback(
        (decision: Decision, choice: 'rad_laheeza' | 'naqd') => {
            const petitionGranted = petitionGrantedAfterCassation(decision, choice);
            const labelAr: NonNullable<Decision['appealResult']> =
                choice === 'rad_laheeza' ? 'تصديق القرار' : 'نقض القرار';
            const origPetitionGranted =
                decision.appealBaseBranch === 'after_approval' ||
                (decision.appealBaseBranch == null &&
                    (decision.executorOutcome === 'approved' ||
                        decision.executorOutcome === 'alternative'));
            const appealWorkflowState =
                !petitionGranted && origPetitionGranted
                    ? ('REVOKED_BY_APPEAL' as const)
                    : petitionGranted
                      ? ('FINAL_ACCEPTED' as const)
                      : ('FINAL_REJECTED' as const);
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const hub = hubWithInferredAppealOrigin(decision);
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
            const cassationFiler = resolveCassationFilerActor(decision);
            const resolvedAppealPatch: Partial<Decision> = {
                appealPhase: null,
                appealStatus: 'final',
                appealResult: labelAr,
                appealMethod: 'tamyeez',
                appealActor: cassationFiler ?? decision.appealActor ?? null,
                status: petitionGranted ? 'accepted' : 'rejected',
                executorOutcome: petitionGranted ? 'approved' : 'rejected',
                appealWorkflowState,
                awaitingCassationEntryBy: null,
                grievanceRejectedAwaitingTamyeez: false,
                grievanceAcceptedAwaitingDebtorTamyeez: false,
                noAppealChosen: false,
            };

            /** عند نقض القرار: نقلب حالة الطلب الأصلي — إلا عند استئناف نفاذ طلب الدائن بعد تمييز المحامي */
            const isNaqd = choice === 'naqd';
            const srcId = decision.appealSourceDecisionId;
            const parentDecision =
                typeof srcId === 'string' && srcId.trim()
                    ? decisions.find((d) => d.id === srcId)
                    : decision;
            const hubParent = hubWithInferredAppealOrigin(parentDecision ?? decision);
            const targetExecutorOutcome = parentDecision?.executorOutcome ?? decision.executorOutcome;
            const previewPipe: Decision = { ...decision, ...resolvedAppealPatch };
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

            let next: Decision[];
            if (typeof srcId === 'string' && srcId.trim()) {
                const orig = decisions.find((d) => d.id === srcId);
                const mergedOriginal: Decision = {
                    ...(orig ?? decision),
                    ...resolvedAppealPatch,
                    ...(forceFlipParentRequestPatch ?? {}),
                    id: srcId,
                    activeAppealCopyId: null,
                    appealTimelineLogs: [
                        ...(Array.isArray(orig?.appealTimelineLogs) ? orig.appealTimelineLogs : []),
                        ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                    ],
                };
                next = decisions
                    .filter((d) => d.id !== decision.id)
                    .map((d) => (d.id === srcId ? mergedOriginal : d));
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

            setDecisions(next);
            persistDecisionsToStorage(next);
            queueMicrotask(() => dispatchDecisionsReload());
            const mergedRowId =
                typeof srcId === 'string' && srcId.trim() ? srcId : decision.id;
            const mergedRow = next.find((x) => x.id === mergedRowId);
            if (mergedRow) {
                dispatchHeirSubstitutionOutcomeIfAny(executionId, mergedRow);
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: next as unknown as Record<string, unknown>[],
                });
            }
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: `قرار محكمة التمييز: ${labelAr}`,
                description: [`القرار: ${decision.title}`, outcomeLine, `التوقيت: ${when}`].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, persistDecisionsToStorage]
    );

    return { applyCassationCourtDecision };
}
