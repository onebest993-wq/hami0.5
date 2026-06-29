import React, { useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { applyLawyerCassationEntryForExecution } from '@/app/utils/lawyerCassationEntry';
import type { Decision } from '../types';
import type { ManualAppealAppellantActor } from '../utils';
import {
    newEventId,
    buildExecutorSideAppealCommitPatch,
    executorSideAppealTimelineMessage,
    EXECUTOR_QUEUE_REQUEST_KINDS,
    resolveHarmedPartyAppealActor,
    resolveUnderlyingDecisionHub,
} from '../utils';
import {
    appealInitialCassationTimeline,
    appealInitialGrievanceTimeline,
} from '../appealUiLabels';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';


export type AppealEntryMutationsParams = DecisionsAppealsMutationsCoreParams & {
    transitionAppealWorkflow: (
        decision: Decision,
        patch: Partial<Decision>,
        timelineTitle: string,
        timelineDescription: string,
        tone: 'emerald' | 'rose' | 'amber' | 'slate',
    ) => void;
};

export function useDecisionsAppealsAppealEntryMutations(params: AppealEntryMutationsParams) {
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
        transitionAppealWorkflow,
    } = params;

    const commitExecutorSideAppealEntry = React.useCallback(
        (
            decision: Decision,
            stage: 'grievance' | 'cassation',
            appellants: ManualAppealAppellantActor[],
        ) => {
            if (appellants.length === 0) {
                SmartToast.error('اختر طرفاً واحداً على الأقل');
                return;
            }
            const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
            if (
                decision.manualExecutorLedgerEntry === true ||
                appealHub.manualExecutorLedgerEntry === true
            ) {
                return;
            }
            if (
                appealHub.requestKind &&
                EXECUTOR_QUEUE_REQUEST_KINDS.includes(appealHub.requestKind)
            ) {
                return;
            }
            const patch = buildExecutorSideAppealCommitPatch(stage, appellants);
            const timelineTitle = stage === 'grievance' ? 'تسجيل تظلم' : 'تسجيل تمييز';
            const timelineDescription = executorSideAppealTimelineMessage(
                stage,
                appellants,
                appealPerspective,
            );
            transitionAppealWorkflow(decision, patch, timelineTitle, timelineDescription, 'amber');
        },
        [appealPerspective, decisions, transitionAppealWorkflow],
    );

    const commitQueueRequestAppealEntry = React.useCallback(
        (decision: Decision, stage: 'grievance' | 'cassation') => {
            const appealHub = resolveUnderlyingDecisionHub(decision, decisions);
            if (
                !appealHub.requestKind ||
                !EXECUTOR_QUEUE_REQUEST_KINDS.includes(appealHub.requestKind)
            ) {
                return;
            }
            const actor = resolveHarmedPartyAppealActor(decision, appealPerspective);
            if (!actor) return;
            const cassationOnly = decision.cassationOnlyAppeal === true;
            if (stage === 'grievance' && cassationOnly) return;

            const patch =
                stage === 'grievance'
                    ? {
                          noAppealChosen: false,
                          appealActor: actor,
                          appealMethod: 'tadhallum' as const,
                          appealWorkflowState:
                              actor === 'debtor'
                                  ? ('PENDING_APPEAL_DEBTOR' as const)
                                  : ('PENDING_APPEAL_LAWYER' as const),
                          appealStatus: 'tadhallum_filed' as const,
                          appealPhase: 'grievance' as const,
                      }
                    : {
                          noAppealChosen: false,
                          appealActor: actor,
                          appealMethod: 'tamyeez' as const,
                          appealWorkflowState:
                              actor === 'debtor'
                                  ? ('PENDING_APPEAL_DEBTOR' as const)
                                  : ('PENDING_APPEAL_LAWYER' as const),
                          appealStatus: 'tamyeez_filed' as const,
                          appealPhase: 'cassation' as const,
                      };

            const timelineTitle = stage === 'grievance' ? 'تسجيل تظلم' : 'تسجيل تمييز';
            const timelineDescription =
                stage === 'grievance'
                    ? appealInitialGrievanceTimeline(appealPerspective, actor)
                    : appealInitialCassationTimeline(appealPerspective, actor);
            transitionAppealWorkflow(
                decision,
                patch,
                timelineTitle,
                timelineDescription,
                'amber',
            );
        },
        [appealPerspective, decisions, transitionAppealWorkflow],
    );

    const applyLawyerCassationEntry = React.useCallback(
        (decision: Decision) => {
            const result = applyLawyerCassationEntryForExecution({
                executionId,
                decisionId: decision.id,
                appealPerspective,
                appendTimeline: false,
            });
            if (!result.ok) return;
            reloadFromStorage();
            const nowIso = new Date().toISOString();
            const appealOpenSnap = getMilestoneTimelineSnapshot?.();
            onTimelineUpdate({
                id: newEventId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: result.timelineTitle ?? 'تمييز القرار',
                description: result.timelineDescription ?? '',
                type: 'appeal',
                source: 'القرارات والطعون',
                ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
            });
            queueMicrotask(() =>
                goToAppealsWithScroll(result.scrollDecisionId ?? decision.id),
            );
        },
        [
            appealPerspective,
            executionId,
            getMilestoneTimelineSnapshot,
            goToAppealsWithScroll,
            onTimelineUpdate,
            reloadFromStorage,
        ],
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string; decisionId?: string }>).detail;
            if (executionId && detail?.executionId && detail.executionId !== executionId) return;
            const decisionId = String(detail?.decisionId || '').trim();
            if (!decisionId) return;
            const row = decisions.find((d) => d.id === decisionId);
            if (!row) return;
            applyLawyerCassationEntry(row);
        };
        window.addEventListener('hami-start-cassation-for-decision', handler as EventListener);
        return () => window.removeEventListener('hami-start-cassation-for-decision', handler as EventListener);
    }, [applyLawyerCassationEntry, decisions, executionId]);

    return { commitExecutorSideAppealEntry, commitQueueRequestAppealEntry, applyLawyerCassationEntry };
}
