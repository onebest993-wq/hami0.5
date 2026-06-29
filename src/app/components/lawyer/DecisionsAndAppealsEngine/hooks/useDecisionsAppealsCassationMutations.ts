import React from 'react';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import type { Decision } from '../types';
import { dispatchHeirSubstitutionOutcomeIfAny } from '../engine/decisionsEngineTypes';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { buildCassationCourtDecisionNext } from '../utils/cassationCourtDecisionCommit';
import { newEventId } from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsCassationMutations(params: DecisionsAppealsMutationsCoreParams) {
    const {
        executionId,
        decisions,
        setDecisions,
        persistDecisionsToStorage,
        appealPerspective,
        onTimelineUpdate,
        getMilestoneTimelineSnapshot,
    } = params;

    const applyCassationCourtDecision = React.useCallback(
        (decision: Decision, choice: 'rad_laheeza' | 'naqd') => {
            const { next, mergedRowId, labelAr, outcomeLine } = buildCassationCourtDecisionNext(
                decisions,
                decision,
                choice,
                appealPerspective
            );
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });

            setDecisions(next);
            const removedIds = decisions
                .filter((d) => !next.some((n) => n.id === d.id))
                .map((d) => d.id);
            persistDecisionsToStorage(
                next,
                removedIds.length > 0 ? { removedIds } : undefined
            );
            queueMicrotask(() => dispatchDecisionsReload());

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
        [appealPerspective, decisions, executionId, onTimelineUpdate, persistDecisionsToStorage, setDecisions]
    );

    return { applyCassationCourtDecision };
}
