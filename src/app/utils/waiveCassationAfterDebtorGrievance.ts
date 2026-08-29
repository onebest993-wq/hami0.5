import type { Decision } from '@/app/components/lawyer/DecisionsAndAppealsEngine/types';
import {
    appealPipelineRowForCard,
    buildWaiveCassationAfterDebtorGrievancePatch,
    buildWaiveLawyerCassationAfterGrievanceRejectedPatch,
    canWaiveCassationAfterDebtorGrievance,
    canWaiveLawyerAwaitingCassation,
    hubWithInferredAppealOrigin,
    resolveWaiveCassationBlockedReason,
    newEventId,
} from '@/app/components/lawyer/DecisionsAndAppealsEngine/utils';
import { applyEvictionAppealClosure } from '@/app/utils/evictionAppealSync';
import { applyPersonalCoerciveAppealClosure } from '@/app/utils/personalCoerciveAppealSync';
import { dispatchDecisionsReload, readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import { writeExecutorDecisionsUnionForExecution } from '@/app/utils/executionDecisionsNamespace';
import { readExecutionDataForDomainGate } from '@/app/utils/executionDomainIsolation';

export type WaiveCassationApplyResult = {
    ok: boolean;
    mergedRowId?: string;
    title?: string;
    message?: string;
};

function mergeWaiveCassationRows(input: {
    decisions: Decision[];
    row: Decision;
    hubRow: Decision;
    pipeline: Decision;
    resolvedAppealPatch: Partial<Decision>;
    outcomeLine: string;
}): { next: Decision[]; mergedRowId: string } {
    const { decisions, row, pipeline, resolvedAppealPatch, outcomeLine } = input;
    const logEntry = {
        id: newEventId(),
        at: new Date().toISOString(),
        message: outcomeLine,
        tone: 'slate' as const,
    };
    const srcId = pipeline.appealSourceDecisionId ?? row.appealSourceDecisionId;
    let next: Decision[];

    if (typeof srcId === 'string' && srcId.trim()) {
        const orig = decisions.find((d) => d.id === srcId);
        const mergedOriginal: Decision = {
            ...(orig ?? row),
            ...resolvedAppealPatch,
            id: srcId,
            activeAppealCopyId: null,
            appealTimelineLogs: [
                ...(Array.isArray(orig?.appealTimelineLogs) ? orig.appealTimelineLogs : []),
                ...(Array.isArray(pipeline.appealTimelineLogs) ? pipeline.appealTimelineLogs : []),
                logEntry,
            ],
        };
        next = decisions
            .filter((d) => d.id !== pipeline.id || pipeline.id === srcId)
            .map((d) => (d.id === srcId ? mergedOriginal : d));
    } else {
        next = decisions.map((d): Decision => {
            if (d.id !== row.id) return d;
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

    const mergedRowId = typeof srcId === 'string' && srcId.trim() ? srcId : row.id;
    return { next, mergedRowId };
}

function persistWaiveCassationMerge(input: {
    executionId: string;
    row: Decision;
    next: Decision[];
    mergedRowId: string;
    outcomeLine: string;
}): WaiveCassationApplyResult {
    const { executionId, row, next, mergedRowId, outcomeLine } = input;
    writeExecutorDecisionsUnionForExecution(
        executionId,
        next as unknown as Record<string, unknown>[],
        readExecutionDataForDomainGate(executionId)
    );
    dispatchDecisionsReload();

    const mergedRow = next.find((x) => x.id === mergedRowId);
    if (mergedRow) {
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

    return {
        ok: true,
        mergedRowId,
        title: String(row.title ?? 'قرار المنفذ'),
        message: outcomeLine,
    };
}

/** تطبيق «لا حاجة للتمييز» — قبول التظلم دون تمييز أو إغلاق مهلة التمييز بعد رد التظلم */
export function applyWaiveLawyerAwaitingCassationForExecution(input: {
    executionId: string | undefined;
    decisionId: string | undefined;
}): WaiveCassationApplyResult {
    const executionId = String(input.executionId ?? '').trim();
    const decisionId = String(input.decisionId ?? '').trim();
    if (!executionId || !decisionId) {
        return { ok: false, message: 'معرّف التنفيذ أو القرار غير صالح.' };
    }

    const decisions = readExecutorDecisionsArray(executionId) as unknown as Decision[];
    const row = decisions.find((d) => String(d.id ?? '').trim() === decisionId);
    if (!row) {
        return { ok: false, message: 'لم يُعثر على بطاقة القرار.' };
    }

    const hubRow = hubWithInferredAppealOrigin(row);
    if (!canWaiveLawyerAwaitingCassation(hubRow, decisions)) {
        return { ok: false, message: resolveWaiveCassationBlockedReason(hubRow, decisions) };
    }

    const pipeline = appealPipelineRowForCard(hubRow, decisions);
    const sealedAt = new Date().toISOString();
    const afterDebtorGrievance = canWaiveCassationAfterDebtorGrievance(hubRow, decisions);
    const resolvedAppealPatch = {
        ...(afterDebtorGrievance
            ? buildWaiveCassationAfterDebtorGrievancePatch(pipeline)
            : buildWaiveLawyerCassationAfterGrievanceRejectedPatch(pipeline)),
        requestCycleSuperseded: true,
        requestCycleSupersededAt: sealedAt,
        isArchived: true,
    };
    const outcomeLine = afterDebtorGrievance
        ? 'لا حاجة للتمييز — قُبل التظلم دون تمييز والطلب مُختوم.'
        : 'لا حاجة للتمييز — رُدّ التظلم دون تقديم تمييز وأُغلقت دورة الطلب.';

    const { next, mergedRowId } = mergeWaiveCassationRows({
        decisions,
        row,
        hubRow,
        pipeline,
        resolvedAppealPatch,
        outcomeLine,
    });
    return persistWaiveCassationMerge({ executionId, row, next, mergedRowId, outcomeLine });
}

/** تطبيق «لا حاجة للتمييز» مباشرة على التخزين — يعمل من المحضر دون فتح مركز القرارات */
export function applyWaiveCassationAfterDebtorGrievanceForExecution(input: {
    executionId: string | undefined;
    decisionId: string | undefined;
}): WaiveCassationApplyResult {
    return applyWaiveLawyerAwaitingCassationForExecution(input);
}
