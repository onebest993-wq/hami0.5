import { useCallback, useEffect, useMemo } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import type { TransactionsDetailsEscapeSnapshot } from '../transactionsEscapeStack';
import type { TaskNodeActionHandlers } from './TaskThreadNodeRenderer';
import type { TaskThreadDialogActions } from './TaskThreadDialogs';
import { useTaskThreadOverlays } from './useTaskThreadOverlays';
import {
    EMPTY_TASKS,
    computeTaskProgress,
    countTaskCascade,
    emptyPathDismissKey,
    nextTaskStatus,
} from './taskThreadUtils';

export function useTaskThreadController({
    transactionId,
    onRequestAddTask,
    readOnly,
    onTaskEscapeSnapshotChange,
    registerTaskEscapeCloser,
    detailsActive = true,
}: {
    transactionId: string;
    onRequestAddTask: (parent: TransactionTask | null) => void;
    readOnly?: boolean;
    onTaskEscapeSnapshotChange?: (
        snapshot: Pick<
            TransactionsDetailsEscapeSnapshot,
            'taskCompleteOpen' | 'taskEditOpen' | 'taskDeleteOpen'
        >,
    ) => void;
    registerTaskEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
    detailsActive?: boolean;
}) {
    const updateTaskStatus = useTransactionsThreadingStore((s) => s.updateTaskStatus);
    const completeTask = useTransactionsThreadingStore((s) => s.completeTask);
    const updateTask = useTransactionsThreadingStore((s) => s.updateTask);
    const deleteTaskCascade = useTransactionsThreadingStore((s) => s.deleteTaskCascade);
    const tasks = useTransactionsThreadingStore((s) => s.tasksByTransactionId[transactionId] ?? EMPTY_TASKS);

    const overlays = useTaskThreadOverlays({
        detailsActive,
        registerTaskEscapeCloser,
    });
    const {
        completeOpen,
        completeTarget,
        officialRef,
        setOfficialRef,
        setCompleteOpen,
        setCompleteTarget,
        editTarget,
        editTitle,
        editDeadlineDate,
        setEditOpen,
        setEditTitle,
        setEditDeadlineDate,
        deleteTarget,
        setDeleteOpen,
        resetComplete,
        resetEdit,
        resetDelete,
        dialogState,
        openEdit,
        openDelete: openDeleteOverlay,
        beginComplete,
    } = overlays;

    useEffect(() => {
        onTaskEscapeSnapshotChange?.({
            taskCompleteOpen: completeOpen,
            taskEditOpen: overlays.editOpen,
            taskDeleteOpen: overlays.deleteOpen,
        });
    }, [completeOpen, overlays.deleteOpen, overlays.editOpen, onTaskEscapeSnapshotChange]);

    const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
    const progress = useMemo(() => computeTaskProgress(tasks), [tasks]);

    useEffect(() => {
        if (tree.length === 0) return;
        if (typeof window === 'undefined') return;
        localStorage.removeItem(emptyPathDismissKey(transactionId));
    }, [tree.length, transactionId]);

    const applyTaskStatus = useCallback(
        async (task: TransactionTask, next: TransactionTaskStatus) => {
            if (readOnly) return;
            if (next === TransactionTaskStatus.Done && task.status !== TransactionTaskStatus.Done) {
                beginComplete(task);
                return;
            }
            try {
                await updateTaskStatus(task.id, next);
            } catch {
                SmartToast.error('تعذر تحديث حالة المهمة — حاول مرة أخرى');
            }
        },
        [beginComplete, readOnly, updateTaskStatus],
    );

    const onToggleStatus = useCallback(
        async (task: TransactionTask) => {
            await applyTaskStatus(task, nextTaskStatus(task.status));
        },
        [applyTaskStatus],
    );

    const confirmComplete = useCallback(async () => {
        if (!completeTarget) return;
        const target = completeTarget;
        const taskId = completeTarget.id;
        const ref = officialRef;
        resetComplete();
        try {
            await completeTask(taskId, ref);
            SmartToast.success('تم إكمال المهمة');
        } catch {
            SmartToast.error('تعذر إكمال المهمة — حاول مرة أخرى');
            setCompleteTarget(target);
            setOfficialRef(ref);
            setCompleteOpen(true);
        }
    }, [completeTarget, completeTask, officialRef, resetComplete]);

    const saveEdit = useCallback(async () => {
        if (!editTarget) return;
        const title = editTitle.trim();
        if (!title) return;
        const deadlineIso = editDeadlineDate ? new Date(`${editDeadlineDate}T00:00:00`).toISOString() : null;
        try {
            await updateTask(editTarget.id, { title, deadline: deadlineIso });
            resetEdit();
            SmartToast.success('تم تحديث المهمة');
        } catch {
            SmartToast.error('تعذر تحديث المهمة — حاول مرة أخرى');
        }
    }, [editDeadlineDate, editTarget, editTitle, resetEdit, updateTask]);

    const openDelete = useCallback(
        (task: TransactionTask) => {
            openDeleteOverlay(task, countTaskCascade(task.id, tasks));
        },
        [openDeleteOverlay, tasks],
    );

    const onSetTaskStatus = useCallback(
        async (task: TransactionTask, status: TransactionTaskStatus) => {
            await applyTaskStatus(task, status);
        },
        [applyTaskStatus],
    );

    const confirmDelete = useCallback(async () => {
        if (!deleteTarget) return;
        const taskId = deleteTarget.id;
        resetDelete();
        try {
            await deleteTaskCascade(taskId);
            SmartToast.success('تم حذف المهمة');
        } catch {
            SmartToast.error('تعذر حذف المهمة — حاول مرة أخرى');
        }
    }, [deleteTarget, deleteTaskCascade, resetDelete]);

    const nodeHandlers: TaskNodeActionHandlers = useMemo(
        () => ({
            onToggleStatus,
            onAddSubTask: onRequestAddTask,
            onEdit: openEdit,
            onDelete: openDelete,
            onSetTaskStatus,
            readOnly,
        }),
        [onRequestAddTask, onSetTaskStatus, onToggleStatus, openDelete, openEdit, readOnly],
    );

    const dialogActions: TaskThreadDialogActions = useMemo(
        () => ({
            setEditOpen,
            setEditTitle,
            setEditDeadlineDate,
            resetEdit,
            saveEdit,
            setDeleteOpen,
            resetDelete,
            confirmDelete,
            setCompleteOpen,
            setOfficialRef,
            resetComplete,
            confirmComplete,
        }),
        [confirmComplete, confirmDelete, resetComplete, resetDelete, resetEdit, saveEdit],
    );

    return { tree, progress, nodeHandlers, dialogState, dialogActions };
}
