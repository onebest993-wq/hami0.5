import type { TransactionTask } from '@/app/modules/transactionsThreading/types';

export type TaskThreadDialogState = {
    editOpen: boolean;
    editTitle: string;
    editDeadlineDate: string;
    deleteOpen: boolean;
    deleteTarget: TransactionTask | null;
    deleteCount: number;
    completeOpen: boolean;
    completeTarget: TransactionTask | null;
    officialRef: string;
};

export type TaskThreadDialogActions = {
    setEditOpen: (open: boolean) => void;
    setEditTitle: (value: string) => void;
    setEditDeadlineDate: (value: string) => void;
    resetEdit: () => void;
    saveEdit: () => void;
    setDeleteOpen: (open: boolean) => void;
    resetDelete: () => void;
    confirmDelete: () => void;
    setCompleteOpen: (open: boolean) => void;
    setOfficialRef: (value: string) => void;
    resetComplete: () => void;
    confirmComplete: () => void;
};
