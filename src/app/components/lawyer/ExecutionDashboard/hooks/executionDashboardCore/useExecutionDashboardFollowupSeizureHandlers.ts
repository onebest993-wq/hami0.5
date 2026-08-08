import { useCallback, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { resolveDecisionsStorageExecutionId } from '@/app/components/lawyer/DecisionsAndAppealsEngine/engine/resolveDecisionsStorageExecutionId';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import {
    runSaveSeizedMovableInitForDecision,
    runSaveSeizedPropertyInitForDecision,
    type SaveSeizedMovableInitInput,
    type SaveSeizedPropertyInitInput,
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

export function useExecutionDashboardFollowupSeizureHandlers({
    decisionsStorageExecutionId,
    executionDataRef,
    nextTimelineId,
    persistExecutionMerge,
    pushTimelineEvent,
    showToast,
    propertySeizureSubjectDraft,
    setPropertySeizureRequestModalOpen,
    setPropertySeizureSubjectDraft,
    movableSeizureSubjectDraft,
    setMovableSeizureRequestModalOpen,
    setMovableSeizureSubjectDraft,
}: UseExecutionDashboardFollowupSeizureHandlersParams) {
    const seizureInitDeps = useCallback(
        () => {
            const data = executionDataRef.current as ExecutionFile | null | undefined;
            const raw = String(decisionsStorageExecutionId ?? '').trim();
            const resolved = resolveDecisionsStorageExecutionId(
                raw || undefined,
                data as Record<string, unknown> | undefined,
            );
            const exId =
                resolved !== 'default'
                    ? resolved
                    : String(raw || data?.id || '').trim();
            return {
                exId,
                executionDataRef,
                nextTimelineId,
                persistExecutionMerge,
                pushTimelineEvent,
                showToast,
            };
        },
        [
            decisionsStorageExecutionId,
            executionDataRef,
            nextTimelineId,
            persistExecutionMerge,
            pushTimelineEvent,
            showToast,
        ],
    );

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

    const saveSeizedPropertyInitForDecision = useCallback(
        (input: SaveSeizedPropertyInitInput) => {
            runSaveSeizedPropertyInitForDecision(input, seizureInitDeps());
        },
        [seizureInitDeps],
    );

    const saveSeizedMovableInitForDecision = useCallback(
        (input: SaveSeizedMovableInitInput) => {
            runSaveSeizedMovableInitForDecision(input, seizureInitDeps());
        },
        [seizureInitDeps],
    );

    return {
        submitPropertySeizureRequest,
        submitMovableSeizureRequest,
        saveSeizedPropertyInitForDecision,
        saveSeizedMovableInitForDecision,
    };
}
