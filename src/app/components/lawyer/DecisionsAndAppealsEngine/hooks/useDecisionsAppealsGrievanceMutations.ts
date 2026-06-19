import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import type { Decision } from '../types';
import {
    buildGrievanceResolutionPatch,
    grievancePetitionGranted,
    hubWithInferredAppealOrigin,
    isCreditorInitiatedExecutorRequest,
} from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsGrievanceMutations(params: DecisionsAppealsMutationsCoreParams) {
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

    const applyGrievanceCourtOutcome = React.useCallback(
        (decision: Decision, grievanceAccepted: boolean) => {
            const resolvedAppealPatch = buildGrievanceResolutionPatch(
                decision,
                grievanceAccepted,
                decisions
            );
            const granted = grievancePetitionGranted(decision, grievanceAccepted);
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            const title = grievanceAccepted ? 'قبول التظلم' : 'رد التظلم';
            const hubGrievance = hubWithInferredAppealOrigin(decision);
            const creditorPartyGrievance = isCreditorInitiatedExecutorRequest(hubGrievance);
            const outcomeLine = (() => {
                if (appealPerspective === 'debtor_agent') {
                    if (grievanceAccepted && granted) {
                        return resolvedAppealPatch.awaitingCassationEntryBy
                            ? creditorPartyGrievance
                                ? 'النتيجة: قُبل تظلم موكّلنا — الطلب مغلق مؤقتاً بانتظار تمييز الدائن.'
                                : 'النتيجة: قُبل تظلم موكّلنا — يتاح للدائن التمييز قبل البت النهائي.'
                            : 'النتيجة: قُبل تظلم موكّلنا — القرار أصبح نافذاً وفق مسار الطعن.';
                    }
                    if (!grievanceAccepted) {
                        return resolvedAppealPatch.appealStatus === 'final'
                            ? creditorPartyGrievance
                                ? 'النتيجة: رُد تظلم موكّلنا — الطلب لصالح الدائن.'
                                : 'النتيجة: رُد التظلم — بقي القرار الأصلي نافذاً.'
                            : creditorPartyGrievance
                              ? 'النتيجة: رُد تظلم موكّلنا — يمكن للدائن التمييز ضمن المهلة.'
                              : 'النتيجة: رُد التظلم — يبقى القرار مرفوضاً ويمكن التمييز ضمن المهلة.';
                    }
                }
                if (granted) {
                    return resolvedAppealPatch.awaitingCassationEntryBy
                        ? 'النتيجة: قُبل التظلم — يتاح للطرف الآخر التمييز قبل نفاذ القرار نهائياً.'
                        : 'النتيجة: قُبل التظلم — القرار أصبح نافذاً وفق مسار الطعن.';
                }
                return resolvedAppealPatch.appealStatus === 'final'
                    ? 'النتيجة: رُد التظلم — بقي القرار الأصلي نافذاً.'
                    : 'النتيجة: رُد التظلم — يبقى القرار مرفوضاً ويمكن التمييز ضمن المهلة.';
            })();
            const srcId = decision.appealSourceDecisionId;
            const logEntry = {
                id: newEventId(),
                at: now,
                message: outcomeLine,
                tone: (granted ? 'emerald' : 'rose') as 'emerald' | 'rose',
            };

            let next: Decision[];
            if (typeof srcId === 'string' && srcId.trim()) {
                const orig = decisions.find((d) => d.id === srcId);
                const mergedOriginal: Decision = {
                    ...(orig ?? decision),
                    ...resolvedAppealPatch,
                    id: srcId,
                    activeAppealCopyId:
                        resolvedAppealPatch.appealStatus === 'final' ? null : orig?.activeAppealCopyId ?? null,
                    appealTimelineLogs: [
                        ...(Array.isArray(orig?.appealTimelineLogs) ? orig.appealTimelineLogs : []),
                        ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                        logEntry,
                    ],
                };
                if (resolvedAppealPatch.appealStatus === 'final') {
                    next = decisions
                        .filter((d) => d.id !== decision.id)
                        .map((d) => (d.id === srcId ? mergedOriginal : d));
                } else {
                    const mergedCopy: Decision = {
                        ...decision,
                        ...resolvedAppealPatch,
                        appealTimelineLogs: [
                            ...(Array.isArray(decision.appealTimelineLogs) ? decision.appealTimelineLogs : []),
                            logEntry,
                        ],
                    };
                    next = decisions.map((d) => {
                        if (d.id === srcId) {
                            return {
                                ...mergedOriginal,
                                activeAppealCopyId: decision.id,
                            };
                        }
                        if (d.id === decision.id) return mergedCopy;
                        return d;
                    });
                }
            } else {
                next = decisions.map((d): Decision => {
                    if (d.id !== decision.id) return d;
                    return {
                        ...d,
                        ...resolvedAppealPatch,
                        appealTimelineLogs: [
                            ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                            logEntry,
                        ],
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
                if (resolvedAppealPatch.appealStatus === 'final') {
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
            }
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title,
                description: [`القرار: ${decision.title}`, outcomeLine, `التوقيت: ${when}`].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            if (resolvedAppealPatch.appealStatus === 'final') {
                queueMicrotask(() => setDecisionsHubTab('previous'));
            } else if (!granted) {
                queueMicrotask(() => {
                    setDecisionsHubTab('appeals');
                    setAppealsScrollTargetId(
                        typeof srcId === 'string' && srcId.trim() ? decision.id : mergedRowId
                    );
                });
            }
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, persistDecisionsToStorage]
    );

    return { applyGrievanceCourtOutcome };
}
