import React, { useEffect } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { applyWaiveCassationAfterDebtorGrievanceForExecution } from '@/app/utils/waiveCassationAfterDebtorGrievance';
import {
    buildWaiveInitialAppealPatch,
    canWaiveFavorableExecutorOutcome,
    canWaiveInitialAppeal,
} from '@/app/utils/waiveInitialAppeal';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
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
        getMilestoneTimelineSnapshot: _getMilestoneTimelineSnapshot,
        setDecisionsHubTab,
        goToAppealsWithScroll: _goToAppealsWithScroll,
    } = params;

    const applyWaiveCassationAfterDebtorGrievance = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveLawyerAwaitingCassation(decision, decisions)) {
                SmartToast.error('لا يمكن إتمام الاستغناء عن التمييز في هذه الحالة.');
                return;
            }
            const result = applyWaiveCassationAfterDebtorGrievanceForExecution({
                executionId,
                decisionId: decision.id,
            });
            if (!result.ok) {
                SmartToast.error(result.message ?? 'تعذّر تسجيل الاستغناء عن التمييز.');
                return;
            }
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
        [decisions, executionId, onTimelineUpdate, reloadFromStorage, setDecisionsHubTab]
    );

    const applyWaiveInitialAppeal = React.useCallback(
        (decision: Decision) => {
            if (!canWaiveInitialAppeal(decision, decisions, appealPerspective)) {
                SmartToast.error('لا يمكن إتمام الاستغناء عن الطعن في هذه الحالة.');
                return;
            }

            const favorable = canWaiveFavorableExecutorOutcome(decision, appealPerspective);
            const patch = buildWaiveInitialAppealPatch(decision, { favorable });
            const outcomeLine = favorable
                ? 'لا حاجة للطعن — القرار لمصلحتنا وأُغلقت دورة الطلب دون انتظار مهلة الطرف الآخر.'
                : appealPerspective === 'debtor_agent'
                  ? 'لا حاجة للطعن — قُبل قرار المنفذ دون تظلم أو تمييز من موكّلنا وأُغلقت المهلة.'
                  : 'لا حاجة للطعن — قُبل قرار المنفذ دون تقديم تظلم أو تمييز وأُغلقت دورة الطلب.';
            const now = new Date().toISOString();
            const logEntry = {
                id: newEventId(),
                at: now,
                message: outcomeLine,
                tone: 'slate' as const,
            };

            const next = decisions.map((d): Decision => {
                if (d.id !== decision.id) return d;
                return {
                    ...d,
                    ...patch,
                    appealTimelineLogs: [
                        ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                        logEntry,
                    ],
                };
            });

            // نفس مسار التظلم — يحلّ معرّف التخزين الصحيح (لا يكتب على executionId الخاطئ بصمت)
            setDecisions(next);
            const persisted = persistDecisionsToStorage(next);
            if (!persisted) {
                SmartToast.error('تعذّر حفظ الاستغناء عن الطعن. أعد المحاولة.');
                return;
            }
            queueMicrotask(() => dispatchDecisionsReload());

            const mergedRow = persisted.find((x) => x.id === decision.id) ?? next.find((x) => x.id === decision.id);
            if (mergedRow) {
                applyPersonalCoerciveAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: persisted as unknown as Record<string, unknown>[],
                });
                applyEvictionAppealClosure({
                    executionId,
                    row: mergedRow as unknown as Record<string, unknown>,
                    allDecisions: persisted as unknown as Record<string, unknown>[],
                });
            }

            const when = new Date(now).toLocaleString('ar-IQ', {
                dateStyle: 'medium',
                timeStyle: 'short',
            });
            onTimelineUpdate({
                id: newEventId(),
                date: now.slice(0, 10),
                timestamp: now,
                title: 'لا حاجة للطعن',
                description: [
                    `القرار: ${decision.title}`,
                    outcomeLine,
                    `التوقيت: ${when}`,
                ].join('\n'),
                type: 'appeal',
                source: 'القرارات والطعون',
            });
            SmartToast.success(outcomeLine);
            queueMicrotask(() => setDecisionsHubTab('archive'));
        },
        [
            appealPerspective,
            decisions,
            executionId,
            onTimelineUpdate,
            persistDecisionsToStorage,
            setDecisions,
            setDecisionsHubTab,
        ]
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
