import type { Dispatch, SetStateAction } from 'react';
import type { ExecutionFile, TimelineEvent } from '@/app/types/execution';

export type CaseNoteLogRow = NonNullable<ExecutionFile['caseNotesLog']>[number];
export type CaseTaskPending = NonNullable<ExecutionFile['caseTasksPending']>[number];
export type CaseTaskStep = NonNullable<CaseTaskPending['steps']>[number];

export interface ExecutionNotesAndAppointmentModalsProps {
    showNotesModal: boolean;
    onCloseNotesModal: () => void;
    setNoteTitle: Dispatch<SetStateAction<string>>;
    setNoteBody: Dispatch<SetStateAction<string>>;
    setIsTask: Dispatch<SetStateAction<boolean>>;
    setTaskDueDate: Dispatch<SetStateAction<string>>;
    setTaskStatus: Dispatch<SetStateAction<'pending' | 'done'>>;
    setEditingTaskId: Dispatch<SetStateAction<string | null>>;
    setSavedNotesView: Dispatch<SetStateAction<'notes' | 'tasks_done'>>;
    moveCaseNoteToTrash: (id: string) => void;
    savedNotesSplit: { notes: CaseNoteLogRow[]; doneTasks: CaseNoteLogRow[] };
    savedNotesView: 'notes' | 'tasks_done';
    toggleCaseNotePin: (id: string) => void;
    toggleCaseTaskPin: (id: string) => void;

    decisionsStorageExecutionId: string;

    showToast: (
        message: string,
        type: 'success' | 'error' | 'warning' | 'info'
    ) => void;

    noteTitle: string;
    noteBody: string;
    isTask: boolean;
    editingTaskId: string | null;
    commitDossierNote: (payload: { title: string; bodyHtml: string; noteId?: string }) => void | Promise<void>;
    voiceUserId?: string;
    editingNoteId?: string | null;
    setEditingNoteId?: Dispatch<SetStateAction<string | null>>;

    showAppointmentModal: boolean;
    onCloseAppointmentModal: () => void;
    setEditingAppointmentId: Dispatch<SetStateAction<string | null>>;
    setAppointmentPurpose: Dispatch<SetStateAction<string>>;
    setAppointmentDateOnly: Dispatch<SetStateAction<string>>;
    setAppointmentTimeOptional: Dispatch<SetStateAction<string>>;
    editingAppointmentId: string | null;
    appointmentPurpose: string;
    appointmentDateOnly: string;
    handleSaveAppointment: () => void;
    timelineEvents: TimelineEvent[];
    todayYmd: string;
    moveTimelineEventToTrash: (ev: TimelineEvent) => void;

    /** Task Management */
    caseTasksPending: CaseTaskPending[];
    handleSaveTask: (taskData: {
        title: string;
        body: string;
        dueDate: string;
        steps?: CaseTaskStep[];
    }) => void;
    handleUpdateTask: (taskId: string, updates: Partial<CaseTaskPending>) => void;
    handleDeleteTask: (taskId: string) => void;
    handleCompleteTask: (taskId: string) => void;
    handleAddTimelineEvent: (event: { title: string; body?: string }) => void;
}
