import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useTasksManagerDialogActions } from '../useTasksManagerDialogActions';

function setup(reminderModalTaskId: string | null, reminderSnoozeCustom = '') {
    const updateTask = vi.fn();
    const setReminderModalTaskId = vi.fn();
    const setReminderSnoozeCustom = vi.fn();
    const setDeleteConfirmId = vi.fn();
    const setEditOpen = vi.fn();
    const setEditTaskId = vi.fn();
    const setEditSubTasks = vi.fn();
    const setHelpTaskId = vi.fn();
    const setHelpInboxOpen = vi.fn();

    const hook = renderHook(
        (props: { id: string | null; custom: string }) =>
            useTasksManagerDialogActions({
                reminderModalTaskId: props.id,
                reminderSnoozeCustom: props.custom,
                setReminderModalTaskId,
                setReminderSnoozeCustom,
                setDeleteConfirmId,
                setEditOpen,
                setEditTaskId,
                setEditSubTasks,
                setHelpTaskId,
                setHelpInboxOpen,
                updateTask,
            }),
        { initialProps: { id: reminderModalTaskId, custom: reminderSnoozeCustom } },
    );

    return {
        ...hook,
        updateTask,
        setReminderModalTaskId,
        setReminderSnoozeCustom,
        setDeleteConfirmId,
        setEditOpen,
        setEditTaskId,
        setEditSubTasks,
        setHelpTaskId,
        setHelpInboxOpen,
    };
}

describe('useTasksManagerDialogActions', () => {
    it('ينقل التذكير إلى يوم ويغلق الحوار', () => {
        const { result, updateTask, setReminderModalTaskId } = setup('task-1');
        const day = new Date(2026, 7, 31);
        act(() => {
            result.current.onReminderMoveToDay(day);
        });
        expect(updateTask).toHaveBeenCalledWith('task-1', { parsedDate: day, reminderAt: null });
        expect(setReminderModalTaskId).toHaveBeenCalledWith(null);
    });

    it('لا يحدّث إن لم يكن هناك تذكير مفتوح', () => {
        const { result, updateTask } = setup(null);
        act(() => {
            result.current.onReminderMoveToDay(new Date(2026, 7, 31));
        });
        expect(updateTask).not.toHaveBeenCalled();
    });

    it('يؤجّل بعدد أيام ثم يغلق', () => {
        const { result, updateTask, setReminderModalTaskId } = setup('task-2');
        act(() => {
            result.current.onReminderSnoozeDays(3);
        });
        const called = updateTask.mock.calls[0];
        expect(called?.[0]).toBe('task-2');
        expect(called?.[1]?.reminderAt).toBeInstanceOf(Date);
        expect(setReminderModalTaskId).toHaveBeenCalledWith(null);
    });

    it('يغلق التعديل ويفرغ المسودة', () => {
        const { result, setEditOpen, setEditTaskId, setEditSubTasks } = setup(null);
        act(() => {
            result.current.dismissEdit();
        });
        expect(setEditOpen).toHaveBeenCalledWith(false);
        expect(setEditTaskId).toHaveBeenCalledWith(null);
        expect(setEditSubTasks).toHaveBeenCalledWith([]);
    });
});
