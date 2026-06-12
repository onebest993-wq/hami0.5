import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    appealPipelineRowForCard,
    hubWithInferredAppealOrigin,
    newEventId,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import {
    appealLawyerCassationAutoEntryDescription,
    resolveAppealUiPerspective,
    type AppealUiPerspective,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/appealUiLabels';
import { dispatchExecutionTimelineAppend } from '@/app/components/lawyer/ExecutionDashboard/utils/applyPersonalCoerciveExecutorOutcome';
import type { ExecutionFile } from '@/app/types/execution';
import { isExecutionAppealTerminal } from '@/app/utils/executionDecisionAppealActive';
import { dispatchDecisionsReload, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsArray } from '@/app/utils/executionDecisionsNamespace';

export type LawyerCassationEntryResult = {
    ok: boolean;
    message?: string;
    scrollDecisionId?: string;
    timelineTitle?: string;
    timelineDescription?: string;
};

function buildLawyerCassationPatch(): Partial<Decision> {
    return {
        noAppealChosen: false,
        appealActor: 'lawyer',
        appealMethod: 'tamyeez',
        appealWorkflowState: 'PENDING_APPEAL_LAWYER',
        appealStatus: 'tamyeez_filed',
        appealPhase: 'cassation',
        grievanceRejectedAwaitingTamyeez: false,
        grievanceAcceptedAwaitingDebtorTamyeez: false,
        awaitingCassationEntryBy: null,
    };
}

function transitionCassationOnStorage(
    decisions: Decision[],
    target: Decision,
    patch: Partial<Decision>,
    timelineDescription: string
): { next: Decision[]; scrollDecisionId: string } {
    const nowIso = new Date().toISOString();
    const logEntry = {
        id: newEventId(),
        at: nowIso,
        message: timelineDescription,
        tone: 'amber' as const,
    };

    const opensAppealCopy =
        !target.appealSourceDecisionId &&
        (patch.appealStatus === 'tadhallum_filed' || patch.appealStatus === 'tamyeez_filed');

    if (opensAppealCopy) {
        const linkedId = target.activeAppealCopyId;
        if (linkedId) {
            const linked = decisions.find((d) => d.id === linkedId);
            if (
                linked &&
                !isExecutionAppealTerminal(linked) &&
                String(linked.appealSourceDecisionId ?? '') === String(target.id)
            ) {
                const next = decisions.map((d) =>
                    d.id === linked.id
                        ? {
                              ...d,
                              ...patch,
                              appealTimelineLogs: [
                                  logEntry,
                                  ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                              ],
                          }
                        : d
                );
                return { next, scrollDecisionId: linked.id };
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
            ...patch,
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
            activeAppealCopyId: copyId,
            appealTimelineLogs: baseLogs,
        };
        const next = decisions.map((d) => (d.id === target.id ? cleanedOriginal : d)).concat([copy]);
        return { next, scrollDecisionId: copyId };
    }

    let next = decisions.map((d) =>
        d.id === target.id
            ? {
                  ...d,
                  ...patch,
                  appealTimelineLogs: [
                      logEntry,
                      ...(Array.isArray(d.appealTimelineLogs) ? d.appealTimelineLogs : []),
                  ],
              }
            : d
    );
    const merged = next.find((x) => x.id === target.id);
    if (merged?.appealSourceDecisionId && isExecutionAppealTerminal(merged)) {
        const src = merged.appealSourceDecisionId;
        next = next.map((d) => (d.id === src ? { ...d, activeAppealCopyId: null } : d));
    }
    return { next, scrollDecisionId: target.id };
}

/** تسجيل تمييز المحامي — يعمل من المحضر دون فتح مركز القرارات */
export function applyLawyerCassationEntryForExecution(input: {
    executionId: string | undefined;
    decisionId: string | undefined;
    appealPerspective?: AppealUiPerspective;
    executionData?: ExecutionFile | null;
    appendTimeline?: boolean;
}): LawyerCassationEntryResult {
    const executionId = String(input.executionId ?? '').trim();
    const decisionId = String(input.decisionId ?? '').trim();
    if (!executionId || !decisionId) {
        return { ok: false, message: 'معرّف التنفيذ أو القرار غير صالح.' };
    }

    const decisions = readExecutorDecisionsArray(executionId) as Decision[];
    const row = decisions.find((d) => String(d.id ?? '').trim() === decisionId);
    if (!row) {
        return { ok: false, message: 'لم يُعثر على بطاقة القرار.' };
    }

    const perspective =
        input.appealPerspective ?? resolveAppealUiPerspective(input.executionData ?? null);
    const pipeline = appealPipelineRowForCard(hubWithInferredAppealOrigin(row), decisions);

    if (pipeline.awaitingCassationEntryBy !== 'lawyer') {
        return { ok: false, message: 'لا توجد مهلة تمييز مفتوحة للمحامي على هذا الطلب.' };
    }
    if (pipeline.appealStatus === 'tamyeez_filed') {
        return {
            ok: false,
            message: 'تم تسجيل التمييز مسبقاً.',
            scrollDecisionId: pipeline.id,
        };
    }

    const patch = buildLawyerCassationPatch();
    const timelineTitle =
        perspective === 'debtor_agent' ? 'تمييز قرار المنفذ' : 'تمييز القرار';
    const timelineDescription = appealLawyerCassationAutoEntryDescription(perspective);

    const target = decisions.find((d) => d.id === pipeline.id) ?? pipeline;
    const hasMeaningfulChange = Object.entries(patch).some(([k, v]) => {
        const prevVal = (target as Record<string, unknown>)[k];
        if (Array.isArray(prevVal) || Array.isArray(v)) {
            return JSON.stringify(prevVal) !== JSON.stringify(v);
        }
        return prevVal !== v;
    });
    if (!hasMeaningfulChange) {
        return {
            ok: false,
            message: 'لا تغيير مطلوب — حالة التمييز محدّثة مسبقاً.',
            scrollDecisionId: pipeline.id,
        };
    }

    const { next, scrollDecisionId } = transitionCassationOnStorage(
        decisions,
        target,
        patch,
        timelineDescription
    );

    writeExecutorDecisionsArray(executionId, next as unknown as Record<string, unknown>[]);
    dispatchDecisionsReload();

    if (input.appendTimeline !== false) {
        const nowIso = new Date().toISOString();
        dispatchExecutionTimelineAppend({
            executionId,
            event: {
                date: nowIso.slice(0, 10),
                timestamp: nowIso,
                title: timelineTitle,
                description: timelineDescription,
                type: 'appeal',
                source: 'القرارات والطعون',
            },
        });
    }

    return {
        ok: true,
        scrollDecisionId,
        timelineTitle,
        timelineDescription,
        message: 'سُجِّل تمييز القرار — تابع مسار الطعن من سجل الطعون.',
    };
}

export function openDecisionsAppealsAfterCassation(input: {
    executionId: string;
    scrollDecisionId?: string;
}): void {
    try {
        window.dispatchEvent(
            new CustomEvent('hami-open-decisions-modal', {
                detail: {
                    executionId: input.executionId,
                    tab: 'appeals',
                    decisionId: input.scrollDecisionId,
                },
            })
        );
    } catch {
        /* ignore */
    }
}
