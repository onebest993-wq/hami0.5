import React from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { dispatchDecisionsReload } from '@/app/utils/executorSeizureDecisionQueue';
import { isExecutionAppealTerminal } from '@/app/utils/executionDecisionAppealActive';
import type { Decision } from '../types';
import { newEventId, appealGrievanceFilingClockPatch, resolveUnderlyingDecisionHub } from '../utils';
import type { DecisionsAppealsMutationsCoreParams } from './decisionsAppealsMutationsTypes';

export function useDecisionsAppealsTransitionWorkflow(params: DecisionsAppealsMutationsCoreParams) {
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

    const transitionAppealWorkflow = React.useCallback(
        (
            decision: Decision,
            patch: Partial<Decision>,
            timelineTitle: string,
            timelineDescription: string,
            tone: 'emerald' | 'rose' | 'amber' | 'slate'
        ) => {
            const nowIso = new Date().toISOString();
            const logEntry = {
                id: newEventId(),
                at: nowIso,
                message: timelineDescription,
                tone,
            };
            const target = decisions.find((d) => d.id === decision.id);
            if (!target) return;
            const appealHub = resolveUnderlyingDecisionHub(target, decisions);
            if (
                target.manualExecutorLedgerEntry === true ||
                appealHub.manualExecutorLedgerEntry === true
            ) {
                return;
            }
            const hasMeaningfulChange = Object.entries(patch).some(([k, v]) => {
                const prevVal = (target as any)[k];
                if (Array.isArray(prevVal) || Array.isArray(v)) {
                    return JSON.stringify(prevVal) !== JSON.stringify(v);
                }
                return prevVal !== v;
            });
            if (!hasMeaningfulChange) return;

            const opensAppealCopy =
                !target.appealSourceDecisionId &&
                (patch.appealStatus === 'tadhallum_filed' || patch.appealStatus === 'tamyeez_filed');
            const grievanceClockPatch =
                patch.appealStatus === 'tadhallum_filed' || patch.appealMethod === 'tadhallum'
                    ? appealGrievanceFilingClockPatch()
                    : {};
            const mergedPatch = { ...patch, ...grievanceClockPatch };

            if (opensAppealCopy) {
                /** إن وُجدت بالفعل نسخة طعن للأصل (مثلاً بعد تظلم) لا نُنشئ نسخة ثانية — ندمج التمييز فيها */
                const linkedId = target.activeAppealCopyId;
                if (linkedId) {
                    const linked = decisions.find((d) => d.id === linkedId);
                    if (
                        linked &&
                        !isExecutionAppealTerminal(linked) &&
                        String(linked.appealSourceDecisionId ?? '') === String(target.id)
                    ) {
                        const nextLinked = decisions.map((d) =>
                            d.id === linked.id
                                ? {
                                      ...d,
                                      ...mergedPatch,
                                      appealTimelineLogs: [
                                          logEntry,
                                          ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                                      ],
                                  }
                                : d
                        );
                        setDecisions(nextLinked);
                        persistDecisionsToStorage(nextLinked);
                        queueMicrotask(() => dispatchDecisionsReload());
                        const appealOpenSnap = getMilestoneTimelineSnapshot?.();
                        onTimelineUpdate({
                            id: newEventId(),
                            date: nowIso.slice(0, 10),
                            timestamp: nowIso,
                            title: timelineTitle,
                            description: timelineDescription,
                            type: 'appeal',
                            source: 'القرارات والطعون',
                            ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
                        });
                        goToAppealsWithScroll(linked.id);
                        return;
                    }
                }
                const copyId = `appeal_copy_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
                const baseLogs = Array.isArray(target.appealTimelineLogs) ? target.appealTimelineLogs : [];
                const {
                    appealSourceDecisionId: _dropSrc,
                    activeAppealCopyId: _dropAct,
                    ...restTarget
                } = target;
                const copy: Decision = {
                    ...restTarget,
                    id: copyId,
                    appealSourceDecisionId: target.id,
                    ...mergedPatch,
                    appealTimelineLogs: [logEntry, ...baseLogs],
                };
                const cleanedOriginal: Decision = {
                    ...target,
                    appealActor: null,
                    appealMethod: null,
                    appealPhase: null,
                    appealWorkflowState: 'NONE',
                    appealStatus: 'pending',
                    appealResult: undefined,
                    awaitingCassationEntryBy: null,
                    grievanceRejectedAwaitingTamyeez: false,
                    grievanceAcceptedAwaitingDebtorTamyeez: false,
                    manualGrievanceAppellants: undefined,
                    manualCassationAppellants: undefined,
                    activeAppealCopyId: copyId,
                    appealTimelineLogs: baseLogs,
                };
                const next = decisions.map((d) => (d.id === target.id ? cleanedOriginal : d)).concat([copy]);
                // كانت نتيجة التثبيت مُهملة كلياً: تُفتح نسخة الطعن على الشاشة
                // ويُسجَّل حدث «فتح طعن» في الخط الزمني وقد لا يُكتب شيء.
                const persistedOpen = persistDecisionsToStorage(next);
                if (!persistedOpen) {
                    SmartToast.error('تعذّر فتح الطعن — أعد المحاولة');
                    return;
                }
                setDecisions(persistedOpen);
                queueMicrotask(() => dispatchDecisionsReload());
                const appealOpenSnap = getMilestoneTimelineSnapshot?.();
                onTimelineUpdate({
                    id: newEventId(),
                    date: nowIso.slice(0, 10),
                    timestamp: nowIso,
                    title: timelineTitle,
                    description: timelineDescription,
                    type: 'appeal',
                    source: 'القرارات والطعون',
                    ...(appealOpenSnap !== undefined ? { snapshot: appealOpenSnap } : {}),
                });
                goToAppealsWithScroll(copyId);
                return;
            }

            let next = decisions.map((d) =>
                d.id === decision.id
                    ? {
                          ...d,
                          ...mergedPatch,
                          appealTimelineLogs: [
                              logEntry,
                              ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                          ],
                      }
                    : d
            );
            const merged = next.find((x) => x.id === decision.id);
            if (merged?.appealSourceDecisionId && isExecutionAppealTerminal(merged)) {
                const src = merged.appealSourceDecisionId;
                next = next.map((d) =>
                    d.id === src ? { ...d, activeAppealCopyId: null } : d
                );
            }
            const persistedTransition = persistDecisionsToStorage(next);
            if (!persistedTransition) {
                SmartToast.error('تعذّر حفظ انتقال الطعن — أعد المحاولة');
                return;
            }
            setDecisions(persistedTransition);
            queueMicrotask(() => dispatchDecisionsReload());
            onTimelineUpdate({
                id: newEventId(),
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: timelineTitle,
                description: timelineDescription,
                type: 'appeal',
                source: 'القرارات والطعون',
            });
        },
        [decisions, goToAppealsWithScroll, getMilestoneTimelineSnapshot, onTimelineUpdate, persistDecisionsToStorage]
    );

    /** تسجيل طعن على قرار منفذ من البطاقة — مرحلة + طاعن (أو أكثر) */
    return { transitionAppealWorkflow };
}
