import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type {
    SaveSeizedMovableInitInput,
    SaveSeizedPropertyInitInput,
} from './executionDashboardFollowupSeizureInits';
import {
    runSubmitMovableSeizureRequest,
    runSubmitPropertySeizureRequest,
} from './executionDashboardSeizureRequestSubmit';

export type UseExecutionDashboardFollowupSeizureHandlersParams = {
    decisionsStorageExecutionId: string | undefined;
    executionDataRef: MutableRefObject<ExecutionFile | null | undefined>;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    pushTimelineEvent: (ev: TimelineEvent) => void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    propertySeizureSubjectDraft: string;
    setPropertySeizureRequestModalOpen: Dispatch<SetStateAction<boolean>>;
    setPropertySeizureSubjectDraft: Dispatch<SetStateAction<string>>;
    movableSeizureSubjectDraft: string;
    setMovableSeizureRequestModalOpen: Dispatch<SetStateAction<boolean>>;
    setMovableSeizureSubjectDraft: Dispatch<SetStateAction<string>>;
};

export function adaptFollowupSeizureShowToast(
    showToast: (
        message: string,
        type?: 'success' | 'error' | 'warning' | 'info',
        opts?: unknown,
    ) => void,
): UseExecutionDashboardFollowupSeizureHandlersParams['showToast'] {
    return (message, type, opts) =>
        showToast(message, type as 'success' | 'error' | 'warning' | 'info' | undefined, opts);
}

export function useExecutionDashboardFollowupSeizureHandlers({
    decisionsStorageExecutionId,
    nextTimelineId,
    pushTimelineEvent,
    showToast,
    propertySeizureSubjectDraft,
    setPropertySeizureRequestModalOpen,
    setPropertySeizureSubjectDraft,
    movableSeizureSubjectDraft,
    setMovableSeizureRequestModalOpen,
    setMovableSeizureSubjectDraft,
}: UseExecutionDashboardFollowupSeizureHandlersParams) {
    const submitDeps = useCallback(
        () => ({
            exId: String(decisionsStorageExecutionId ?? '').trim(),
            nextTimelineId,
            pushTimelineEvent,
            showToast,
        }),
        [decisionsStorageExecutionId, nextTimelineId, pushTimelineEvent, showToast],
    );

    const submitPropertySeizureRequest = useCallback(() => {
        runSubmitPropertySeizureRequest(
            {
                subjectDraft: propertySeizureSubjectDraft,
                onSubmitted: () => {
                    setPropertySeizureRequestModalOpen(false);
                    setPropertySeizureSubjectDraft('');
                },
            },
            submitDeps(),
        );
    }, [
        propertySeizureSubjectDraft,
        setPropertySeizureRequestModalOpen,
        setPropertySeizureSubjectDraft,
        submitDeps,
    ]);

    const submitMovableSeizureRequest = useCallback(() => {
        runSubmitMovableSeizureRequest(
            {
                subjectDraft: movableSeizureSubjectDraft,
                onSubmitted: () => {
                    setMovableSeizureRequestModalOpen(false);
                    setMovableSeizureSubjectDraft('');
                },
            },
            submitDeps(),
        );
    }, [
        movableSeizureSubjectDraft,
        setMovableSeizureRequestModalOpen,
        setMovableSeizureSubjectDraft,
        submitDeps,
    ]);

    const saveSeizedPropertyInitForDecision = useCallback((_input: SaveSeizedPropertyInitInput) => {
        /* post-approve init retired */
    }, []);

    const saveSeizedMovableInitForDecision = useCallback((_input: SaveSeizedMovableInitInput) => {
        /* post-approve init retired */
    }, []);

    return {
        submitPropertySeizureRequest,
        submitMovableSeizureRequest,
        saveSeizedPropertyInitForDecision,
        saveSeizedMovableInitForDecision,
    };
}
