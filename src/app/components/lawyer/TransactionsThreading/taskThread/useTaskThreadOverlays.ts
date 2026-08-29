import { useCallback, useEffect, useMemo, useState } from 'react';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';
import type { TransactionsDetailsEscapeSnapshot } from '../transactionsEscapeStack';
import type { TaskThreadDialogState } from './TaskThreadDialogs';

export function useTaskThreadOverlays({
    detailsActive,
    registerTaskEscapeCloser,
}: {
    detailsActive: boolean;
    registerTaskEscapeCloser?: (
        closer: ((patch: Partial<TransactionsDetailsEscapeSnapshot>) => void) | null,
    ) => void;
}) {
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
        if (detailsActive) return;
        resetEdit();
        resetDelete();
        resetComplete();
    }, [detailsActive, resetComplete, resetDelete, resetEdit]);

    const dialogState: TaskThreadDialogState = useMemo(
        () => ({
            editOpen,
            editTitle,
            editDeadlineDate,
            deleteOpen,
            deleteTarget,
            deleteCount,
            completeOpen,
            completeTarget,
            officialRef,
        }),
        [
            completeOpen,
            completeTarget,
            deleteCount,
            deleteOpen,
            deleteTarget,
            editDeadlineDate,
            editOpen,
            editTitle,
            officialRef,
        ],
    );

    const openEdit = useCallback((task: TransactionTask) => {
        setEditTarget(task);
        setEditTitle(task.title);
        setEditDeadlineDate(task.deadline ? task.deadline.slice(0, 10) : '');
        setEditOpen(true);
    }, []);

    const openDelete = useCallback((task: TransactionTask, cascadeCount: number) => {
        setDeleteTarget(task);
        setDeleteCount(cascadeCount);
        setDeleteOpen(true);
    }, []);

    const beginComplete = useCallback((task: TransactionTask) => {
        setCompleteTarget(task);
        setOfficialRef('');
        setCompleteOpen(true);
    }, []);

    return {
        completeOpen,
        completeTarget,
        officialRef,
        setOfficialRef,
        setCompleteOpen,
        setCompleteTarget,
        editOpen,
        editTarget,
        editTitle,
        editDeadlineDate,
        setEditOpen,
        setEditTitle,
        setEditDeadlineDate,
        deleteOpen,
        deleteTarget,
        deleteCount,
        setDeleteOpen,
        resetComplete,
        resetEdit,
        resetDelete,
        dialogState,
        openEdit,
        openDelete,
        beginComplete,
    };
}
