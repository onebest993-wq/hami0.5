import React, { useEffect } from 'react';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    applyWaiveInitialAppealForExecution,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import type { Decision } from '../types';
import { newEventId, canWaiveLawyerAwaitingCassation } from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsWaiveAppealMutations(params: DecisionsAppealsMutationsCoreParams) {
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

    const applyWaiveCassationAfterDebtorGrievance = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveLawyerAwaitingCassation(decision, decisions)) return;
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId,
                decisionId: decision.id,
            });
            if (!result.ok) return;
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            reloadFromStorage();
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'لا حاجة للتمييز',
                description: [
                    `القرار: ${decision.title}`,
                    result.message ?? 'قُبل التظلم دون تمييز — انتهت دورة الطلب.',
                    `التوقيت: ${when}`,
                ].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [decisions, executionId, onTimelineUpdate, reloadFromStorage]
    );

    const applyWaiveInitialAppeal = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveInitialAppeal(decision, decisions, appealPerspective)) return;
            const result = applyWaiveInitialAppealForExecution({
                executionId,
                decisionId: decision.id,
                appealPerspective,
            });
            if (!result.ok) return;
            const now = new Date().toISOString();
            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            reloadFromStorage();
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'لا حاجة للطعن',
                description: [
                    `القرار: ${decision.title}`,
                    result.message ?? 'قُبل قرار المنفذ دون طعن — أُغلقت دورة الطلب.',
                    `التوقيت: ${when}`,
                ].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [appealPerspective, decisions, executionId, onTimelineUpdate, reloadFromStorage]
    );

    useEffect(() => {
        const handler = (e: Event) => {
            const detail = (e as CustomEvent<{ executionId?: string; decisionId?: string }>).detail;
            if (executionId && detail?.executionId && detail.executionId !== executionId) return;
            const decisionId = String(detail?.decisionId || '').trim();
            if (!decisionId) return;
            const row = decisions.find((d) => d.id === decisionId);
            if (!row) return;
            applyWaiveCassationAfterDebtorGrievance(row);
        };
        window.addEventListener('hami-waive-cassation-for-decision', handler as EventListener);
        return () => window.removeEventListener('hami-waive-cassation-for-decision', handler as EventListener);
    }, [applyWaiveCassationAfterDebtorGrievance, decisions, executionId]);

    return { applyWaiveCassationAfterDebtorGrievance, applyWaiveInitialAppeal };
}
