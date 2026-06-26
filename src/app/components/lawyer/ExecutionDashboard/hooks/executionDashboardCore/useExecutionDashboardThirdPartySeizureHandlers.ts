import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, ThirdPartySeizure, TimelineEvent } from '@/app/types/execution';
import {
    runSaveThirdPartySeizureForDecision,
    type SaveThirdPartySeizureInput,
} from './executionDashboardThirdPartySeizureSave';

export type UseExecutionDashboardThirdPartySeizureHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    getLocalTodayYmd: () => string;
    nextTimelineId: () => string;
    pushTimelineEvent: (
        ev: TimelineEvent,
        opts?: { mergePatch?: Record<string, unknown> },
    ) => void;
    showToast: (message: string, type?: string) => void;
    setThirdPartySeizuresUi: Dispatch<SetStateAction<ThirdPartySeizure[]>>;
};

export function useExecutionDashboardThirdPartySeizureHandlers({
    decisionsStorageExecutionId,
    executionDataRef,
    getLocalTodayYmd,
    nextTimelineId,
    pushTimelineEvent,
    showToast,
    setThirdPartySeizuresUi,
}: UseExecutionDashboardThirdPartySeizureHandlersParams) {
    const saveThirdPartySeizureForDecision = useCallback(
        (input: SaveThirdPartySeizureInput) => {
            runSaveThirdPartySeizureForDecision({
                input,
                decisionsStorageExecutionId,
                executionDataRef,
                getLocalTodayYmd,
                nextTimelineId,
                pushTimelineEvent,
                showToast,
                onSeizuresUpdated: setThirdPartySeizuresUi,
            });
        },
        [
            decisionsStorageExecutionId,
            executionDataRef,
            getLocalTodayYmd,
            nextTimelineId,
            pushTimelineEvent,
            setThirdPartySeizuresUi,
            showToast,
        ],
    );

    return { saveThirdPartySeizureForDecision };
}
