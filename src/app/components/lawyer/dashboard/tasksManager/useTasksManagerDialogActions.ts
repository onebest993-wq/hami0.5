import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import { snoozeAfterDays, dateFromYmdInput } from './utils';
import type { EditSubTaskDraft } from './TasksManagerModalFields';

export type TasksManagerDialogActionsInput = {
    reminderModalTaskId: string | null;
    reminderSnoozeCustom: string;
    setReminderModalTaskId: Dispatch<SetStateAction<string | null>>;
    setReminderSnoozeCustom: Dispatch<SetStateAction<string>>;
    setDeleteConfirmId: Dispatch<SetStateAction<string | null>>;
    setEditOpen: Dispatch<SetStateAction<boolean>>;
    setEditTaskId: Dispatch<SetStateAction<string | null>>;
    setEditSubTasks: Dispatch<SetStateAction<EditSubTaskDraft[]>>;
    setHelpTaskId: Dispatch<SetStateAction<string | null>>;
    setHelpInboxOpen: Dispatch<SetStateAction<boolean>>;
    updateTask: (id: string, patch: Partial<LegalTask>) => void;
};

export function useTasksManagerDialogActions({
    reminderModalTaskId,
    reminderSnoozeCustom,
    setReminderModalTaskId,
    setReminderSnoozeCustom,
    setDeleteConfirmId,
    setEditOpen,
    setEditTaskId,
    setEditSubTasks,
    setHelpTaskId,
    setHelpInboxOpen,
    updateTask,
}: TasksManagerDialogActionsInput) {
    const dismissDelete = useCallback(() => {
        setDeleteConfirmId(null);
    }, [setDeleteConfirmId]);

    const dismissEdit = useCallback(() => {
        setEditOpen(false);
        setEditTaskId(null);
        setEditSubTasks([]);
    }, [setEditOpen, setEditTaskId, setEditSubTasks]);

    const onEditOpenChange = useCallback(
        (open: boolean) => {
            if (!open) dismissEdit();
        },
        [dismissEdit],
    );

    const onEditSubTaskChange = useCallback(
        (subId: string, patch: Partial<Pick<EditSubTaskDraft, 'title' | 'location'>>) => {
            setEditSubTasks((prev) => prev.map((st) => (st.id === subId ? { ...st, ...patch } : st)));
        },
        [setEditSubTasks],
    );

    const onRemoveEditSubTask = useCallback(
        (subId: string) => {
            setEditSubTasks((prev) => prev.filter((st) => st.id !== subId));
        },
        [setEditSubTasks],
    );

    const dismissReminder = useCallback(() => {
        setReminderModalTaskId(null);
    }, [setReminderModalTaskId]);

    const onReminderMoveToDay = useCallback(
        (dayDate: Date) => {
            if (!reminderModalTaskId) return;
            updateTask(reminderModalTaskId, { parsedDate: dayDate, reminderAt: null });
            setReminderModalTaskId(null);
        },
        [reminderModalTaskId, updateTask, setReminderModalTaskId],
    );

    const onReminderSnoozeDays = useCallback(
        (days: number) => {
            if (!reminderModalTaskId) return;
            updateTask(reminderModalTaskId, { reminderAt: snoozeAfterDays(days) });
            setReminderModalTaskId(null);
        },
        [reminderModalTaskId, updateTask, setReminderModalTaskId],
    );

    const onReminderSnoozeCustomDate = useCallback(() => {
        if (!reminderModalTaskId || !reminderSnoozeCustom) return;
        const parsed = dateFromYmdInput(reminderSnoozeCustom);
        if (!parsed) return;
        updateTask(reminderModalTaskId, { reminderAt: parsed });
        setReminderSnoozeCustom('');
        setReminderModalTaskId(null);
    }, [
        reminderModalTaskId,
        reminderSnoozeCustom,
        updateTask,
        setReminderSnoozeCustom,
        setReminderModalTaskId,
    ]);

    const closeHelpModal = useCallback(() => {
        setHelpTaskId(null);
    }, [setHelpTaskId]);

    const closeHelpInbox = useCallback(() => {
        setHelpInboxOpen(false);
    }, [setHelpInboxOpen]);

    return {
        dismissDelete,
        dismissEdit,
        onEditOpenChange,
        onEditSubTaskChange,
        onRemoveEditSubTask,
        dismissReminder,
        onReminderMoveToDay,
        onReminderSnoozeDays,
        onReminderSnoozeCustomDate,
        closeHelpModal,
        closeHelpInbox,
    };
}
