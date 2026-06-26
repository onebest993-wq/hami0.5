import {
    patchExecutorDecisionRow,
    patchExecutorDecisionRowEverywhere,
} from '@/app/utils/executorSeizureDecisionQueue';
import type { TimelineEvent } from '@/app/types/execution';
import type { StandaloneExecutionMark } from '@/app/types/execution';
import {
    buildStandaloneExecutionMarkRow,
    buildStandaloneMarkDecisionPatch,
    buildStandaloneMarkSavedTimelineEvent,
    type SaveStandaloneMarkInput,
} from './executionDashboardStandaloneMarkMutations';

export type RunSaveStandaloneExecutionMarkParams = {
    input: SaveStandaloneMarkInput;
    prevMarks: StandaloneExecutionMark[];
    exId: string;
    today: string;
    nowIso: string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (
        ev: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    onSaved: (nextMarks: StandaloneExecutionMark[]) => void;
};

export function runSaveStandaloneExecutionMarkForDecision({
    input,
    prevMarks,
    exId,
    today,
    nowIso,
    nextTimelineId,
    persistExecutionMerge,
    pushTimelineEvent,
    showToast,
    onSaved,
}: RunSaveStandaloneExecutionMarkParams): void {
    const decisionId = String(input.decisionId || '').trim();
    const markType = String(input.markType || '').trim();
    const targetEntity = String(input.targetEntity || '').trim();
    const markDetails = String(input.markDetails || '').trim();

    if (!decisionId) {
        showToast('معرّف القرار غير متوفر.', 'warning');
        return;
    }
    if (!markType || !targetEntity || !markDetails) {
        showToast('أكمل نوع الشارة والجهة المستهدفة وتفاصيل القيد.', 'warning');
        return;
    }
    if (!exId || exId === 'undefined') {
        showToast('معرّف ملف التنفيذ غير متوفر.', 'warning');
        return;
    }

    const { nextRow, nextMarks } = buildStandaloneExecutionMarkRow(input, prevMarks, nowIso);
    onSaved(nextMarks);

    const decisionPatch = buildStandaloneMarkDecisionPatch(nextRow, nowIso);
    persistExecutionMerge({ standaloneExecutionMarks: nextMarks });
    patchExecutorDecisionRow(exId, decisionId, decisionPatch);
    patchExecutorDecisionRowEverywhere(decisionId, decisionPatch);

    pushTimelineEvent(buildStandaloneMarkSavedTimelineEvent(nextRow, today, nowIso, nextTimelineId), {
        mergePatch: { standaloneExecutionMarks: nextMarks },
    });

    try {
        window.dispatchEvent(
            new CustomEvent('hami-execution-decision-outcome', {
                detail: {
                    executionId: exId,
                    decisionId,
                    outcome: 'approved',
                    requestKind: 'seizure',
                },
            }),
        );
    } catch {
        /* ignore */
    }

    showToast('تم حفظ الشارة التنفيذية وربطها بالسجل', 'success');
}
