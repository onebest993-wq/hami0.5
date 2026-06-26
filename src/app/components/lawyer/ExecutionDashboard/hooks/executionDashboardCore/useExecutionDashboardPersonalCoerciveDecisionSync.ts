// @ts-nocheck
/** مزامنة قرارات الجبر الشخصي: منع سفر + إحضار جبري */
import { useEffect } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { readExecutorDecisionsArray } from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildForcedBringInFollowupEvents,
    hasApprovedPersonalCoerciveSubtype,
    shouldActivateTravelBanFromDecisions,
    timelineAlreadyHasForcedBringMemo,
    type ExecutorDecisionRowLite,
} from './executionDashboardPersonalCoerciveDecisionSync';

export type UseExecutionDashboardPersonalCoerciveDecisionSyncParams = {
    executionData: ExecutionFile | null | undefined;
    executionId: string | undefined;
    decisionsReloadEpoch: number;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    nextTimelineId: () => string;
};

export function useExecutionDashboardPersonalCoerciveDecisionSync({
    executionData,
    executionId,
    decisionsReloadEpoch,
    persistExecutionMerge,
    setTimelineEvents,
    nextTimelineId,
}: UseExecutionDashboardPersonalCoerciveDecisionSyncParams) {
    const exId = executionData?.id ?? executionId;

    useEffect(() => {
        if (!exId) return;
        const rows = readExecutorDecisionsArray(exId) as ExecutorDecisionRowLite[];
        if (
            shouldActivateTravelBanFromDecisions(rows, executionData?.debtor_travel_ban_active)
        ) {
            persistExecutionMerge({ debtor_travel_ban_active: true });
        }
    }, [
        decisionsReloadEpoch,
        exId,
        executionData?.debtor_travel_ban_active,
        persistExecutionMerge,
    ]);

    useEffect(() => {
        if (!exId) return;
        if (executionData?.forced_bring_in_personal_followup_logged) return;

        const rows = readExecutorDecisionsArray(exId) as ExecutorDecisionRowLite[];
        if (!hasApprovedPersonalCoerciveSubtype(rows, 'forced_bring_in')) return;

        setTimelineEvents((prev) => {
            if (timelineAlreadyHasForcedBringMemo(prev)) {
                queueMicrotask(() =>
                    persistExecutionMerge({ forced_bring_in_personal_followup_logged: true }),
                );
                return prev;
            }
            const followup = buildForcedBringInFollowupEvents(nextTimelineId);
            const next = [...followup, ...prev];
            queueMicrotask(() =>
                persistExecutionMerge({
                    timelineEvents: next,
                    forced_bring_in_personal_followup_logged: true,
                }),
            );
            return next;
        });
    }, [
        decisionsReloadEpoch,
        exId,
        executionData?.forced_bring_in_personal_followup_logged,
        nextTimelineId,
        persistExecutionMerge,
        setTimelineEvents,
    ]);
}
