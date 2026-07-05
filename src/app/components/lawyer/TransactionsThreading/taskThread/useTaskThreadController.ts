import { useCallback, useEffect, useMemo, useState } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useTransactionsThreadingStore } from '@/app/modules/transactionsThreading/store';
import { buildTaskTree } from '@/app/modules/transactionsThreading/service';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';
import type { TransactionsDetailsEscapeSnapshot } from '../transactionsEscapeStack';
import type { TaskNodeActionHandlers } from './TaskThreadNodeRenderer';
import type { TaskThreadDialogActions, TaskThreadDialogState } from './TaskThreadDialogs';
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
}) {
    const refreshTransactionData = useTransactionsThreadingStore((s) => s.refreshTransactionData);
    const updateTaskStatus = useTransactionsThreadingStore((s) => s.updateTaskStatus);
    const completeTask = useTransactionsThreadingStore((s) => s.completeTask);
    const updateTask = useTransactionsThreadingStore((s) => s.updateTask);
    const deleteTaskCascade = useTransactionsThreadingStore((s) => s.deleteTaskCascade);
    const tasks = useTransactionsThreadingStore((s) => s.tasksByTransactionId[transactionId] ?? EMPTY_TASKS);

    const [completeOpen, setCompleteOpen] = useState(false);
    const [completeTarget, setCompleteTarget] = useState<TransactionTask | null>(null);
    const [officialRef, setOfficialRef] = useState('');
    const [editOpen, setEditOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<TransactionTask | null>(null);
    const [editTitle, setEditTitle] = useState('');
    const [editDeadlineDate, setEditDeadlineDate] = useState('');
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<TransactionTask | null>(null);
    const [deleteCount, setDeleteCount] = useState(1);

    const resetComplete = useCallback(() => {
        setCompleteOpen(false);
        setCompleteTarget(null);
        setOfficialRef('');
    }, []);

    const resetEdit = useCallback(() => {
        setEditOpen(false);
        setEditTarget(null);
        setEditTitle('');
        setEditDeadlineDate('');
    }, []);

    const resetDelete = useCallback(() => {
        setDeleteOpen(false);
        setDeleteTarget(null);
        setDeleteCount(1);
    }, []);

    const closeTaskOverlay = useCallback(
        (patch: Partial<TransactionsDetailsEscapeSnapshot>) => {
            if (patch.taskCompleteOpen === false) resetComplete();
            if (patch.taskEditOpen === false) resetEdit();
            if (patch.taskDeleteOpen === false) resetDelete();
        },
        [resetComplete, resetDelete, resetEdit],
    );

    useEffect(() => {
        registerTaskEscapeCloser?.(closeTaskOverlay);
        return () => registerTaskEscapeCloser?.(null);
    }, [closeTaskOverlay, registerTaskEscapeCloser]);

    useEffect(() => {
        onTaskEscapeSnapshotChange?.({
            taskCompleteOpen: completeOpen,
            taskEditOpen: editOpen,
            taskDeleteOpen: deleteOpen,
        });
    }, [completeOpen, editOpen, deleteOpen, onTaskEscapeSnapshotChange]);

    useEffect(() => {
        refreshTransactionData(transactionId);
    }, [refreshTransactionData, transactionId]);

    const tree = useMemo(() => buildTaskTree(tasks), [tasks]);
    const progress = useMemo(() => computeTaskProgress(tasks), [tasks]);

    useEffect(() => {
        if (tree.length === 0) return;
        if (typeof window === 'undefined') return;
        localStorage.removeItem(emptyPathDismissKey(transactionId));
    }, [tree.length, transactionId]);

    const onToggleStatus = useCallback(
        async (task: TransactionTask) => {
            if (readOnly) return;
            const next = nextTaskStatus(task.status);
            if (next === TransactionTaskStatus.Done && task.status !== TransactionTaskStatus.Done) {
                setCompleteTarget(task);
                setOfficialRef('');
                setCompleteOpen(true);
                return;
            }
            await updateTaskStatus(task.id, next);
        },
        [readOnly, updateTaskStatus],
    );

    const confirmComplete = useCallback(async () => {
        if (!completeTarget) return;
        const taskId = completeTarget.id;
        const ref = officialRef;
        resetComplete();
        try {
            await completeTask(taskId, ref);
            SmartToast.success('تم إكمال المهمة');
        } catch {
            SmartToast.error('تعذر إكمال المهمة — حاول مرة أخرى');
        }
    }, [completeTarget, completeTask, officialRef, resetComplete]);

    const openEdit = useCallback((task: TransactionTask) => {
        setEditTarget(task);
        setEditTitle(task.title);
        setEditDeadlineDate(task.deadline ? task.deadline.slice(0, 10) : '');
        setEditOpen(true);
    }, []);

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
            setDeleteTarget(task);
            setDeleteCount(countTaskCascade(task.id, tasks));
            setDeleteOpen(true);
        },
        [tasks],
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
            readOnly,
        }),
        [onRequestAddTask, onToggleStatus, openDelete, openEdit, readOnly],
    );

    const dialogState: TaskThreadDialogState = {
        editOpen,
        editTarget,
        editTitle,
        editDeadlineDate,
        deleteOpen,
        deleteTarget,
        deleteCount,
        completeOpen,
        completeTarget,
        officialRef,
    };

    const dialogActions: TaskThreadDialogActions = {
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
    };

    return { tree, progress, nodeHandlers, dialogState, dialogActions };
}
