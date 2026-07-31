import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';
import { useExecutionTrashAndPins } from '../useExecutionTrashAndPins';

type CaseNotesLog = NonNullable<ExecutionFile['caseNotesLog']>;
type CaseTasksPending = NonNullable<ExecutionFile['caseTasksPending']>;

type ShowToast = (
    message: string,
    type?: 'success' | 'error' | 'warning' | 'info',
) => void;

export type ExecutionDashboardTrashPinsClusterInput = {
    showExecutionTrashModal: boolean;
    setShowExecutionTrashModal: (open: boolean) => void;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    caseNotesLogRef: MutableRefObject<CaseNotesLog>;
    caseTasksPendingRef: MutableRefObject<CaseTasksPending>;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setCaseNotesLog: Dispatch<SetStateAction<CaseNotesLog>>;
    setCaseTasksPending: Dispatch<SetStateAction<CaseTasksPending>>;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    showToast: ShowToast;
    currentFileId: string;
    setPermanentDeleteTimelineId: Dispatch<SetStateAction<string | null>>;
};

export function useExecutionDashboardTrashPinsCluster(
    input: ExecutionDashboardTrashPinsClusterInput,
) {
    const trashAndPinsHandlers = useExecutionTrashAndPins({
        showExecutionTrashModal: input.showExecutionTrashModal,
        setShowExecutionTrashModal: input.setShowExecutionTrashModal,
        timelineEventsRef: input.timelineEventsRef,
        caseNotesLogRef: input.caseNotesLogRef,
        caseTasksPendingRef: input.caseTasksPendingRef,
        setTimelineEvents: input.setTimelineEvents,
        setCaseNotesLog: input.setCaseNotesLog,
        setCaseTasksPending: input.setCaseTasksPending,
        persistExecutionMerge: input.persistExecutionMerge,
        showToast: input.showToast,
        currentFileId: input.currentFileId,
        setPermanentDeleteTimelineId: input.setPermanentDeleteTimelineId,
    });

    return {
        trashAndPinsHandlers,
        ...trashAndPinsHandlers,
    };
}
