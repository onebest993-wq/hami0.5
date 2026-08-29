import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type UseExecutionDashboardNotesTasksHandlersParams = {
    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    taskDueDate: string;
    taskStatus: string;
    editingTaskId: string | null;
    caseTasksPending: Array<{ id: string; title?: string; body?: string; dueDate?: string }>;
    caseNotesLogRef: MutableRefObject<Array<{ id: string; title: string; body: string; createdAt: string }>>;
    caseTasksPendingRef: MutableRefObject<
        Array<{ id: string; title: string; body: string; dueDate?: string; createdAt: string; steps?: unknown[] }>
    >;
    timelineEventsRef: MutableRefObject<TimelineEvent[]>;
    currentFileId: string;
    executionData: ExecutionFile | null | undefined;
    file: ExecutionFile | null | undefined;
    nextTimelineId: () => string;
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void;
    showToast: (message: string, type?: string, opts?: Record<string, unknown>) => void;
    pushTimelineEvent: (event: TimelineEvent) => void;
    moveCaseTaskToTrash: (taskId: string) => void;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteBody: Dispatch<SetStateAction<string>>;
    setIsTask: Dispatch<SetStateAction<boolean>>;
    setTaskDueDate: Dispatch<SetStateAction<string>>;
    setTaskStatus: Dispatch<SetStateAction<string>>;
    setEditingTaskId: Dispatch<SetStateAction<string | null>>;
    setEditingNoteId: Dispatch<SetStateAction<string | null>>;
    setCaseNotesLog: Dispatch<SetStateAction<Array<{ id: string; title: string; body: string; createdAt: string }>>>;
    setCaseTasksPending: Dispatch<
        SetStateAction<
            Array<{ id: string; title: string; body: string; dueDate?: string; createdAt: string; steps?: unknown[] }>
        >
    >;
    setTimelineEvents: Dispatch<SetStateAction<TimelineEvent[]>>;
    setShowNotesModal: (show: boolean) => void;
    openFollowupModalPersisted?: () => void;
    closeUnifiedSeizureLog?: () => void;
};
