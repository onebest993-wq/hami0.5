import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, StandaloneExecutionMark } from '@/app/types/execution';
import { runSaveStandaloneExecutionMarkForDecision } from './executionDashboardStandaloneMarkSave';

export type UseExecutionDashboardStandaloneMarkHandlersParams = {
    standaloneExecutionMarksSnapshotRef: MutableRefObject<StandaloneExecutionMark[]>;
    setStandaloneExecutionMarks: Dispatch<SetStateAction<StandaloneExecutionMark[]>>;
    decisionsStorageExecutionId: string | undefined;
    executionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    getLocalTodayYmd: () => string;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (
        ev: import('@/app/types/execution').TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
};

export function useExecutionDashboardStandaloneMarkHandlers({
    standaloneExecutionMarksSnapshotRef,
    setStandaloneExecutionMarks,
    decisionsStorageExecutionId,
    executionId,
    executionDataRef,
    getLocalTodayYmd,
    nextTimelineId,
    persistExecutionMerge,
    pushTimelineEvent,
    showToast,
}: UseExecutionDashboardStandaloneMarkHandlersParams) {
    const saveStandaloneExecutionMarkForDecision = useCallback(
        (input: {
            decisionId: string;
            markType: string;
            targetEntity: string;
            markDetails: string;
            letterDetails: string;
        }) => {
            const exId = String(
                decisionsStorageExecutionId ?? executionDataRef.current?.id ?? executionId ?? '',
            ).trim();
            const nowIso = new Date().toISOString();
            const today = getLocalTodayYmd();

            runSaveStandaloneExecutionMarkForDecision({
                input,
                prevMarks: standaloneExecutionMarksSnapshotRef.current,
                exId,
                today,
                nowIso,
                nextTimelineId,
                persistExecutionMerge,
                pushTimelineEvent,
                showToast,
                onSaved: (nextMarks) => {
                    setStandaloneExecutionMarks(nextMarks);
                    standaloneExecutionMarksSnapshotRef.current = nextMarks;
                },
            });
        },
        [
            decisionsStorageExecutionId,
            executionDataRef,
            executionId,
            getLocalTodayYmd,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
            setStandaloneExecutionMarks,
            standaloneExecutionMarksSnapshotRef,
        ],
    );

    return { saveStandaloneExecutionMarkForDecision };
}
