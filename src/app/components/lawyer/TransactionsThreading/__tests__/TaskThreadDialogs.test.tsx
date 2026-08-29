import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskThreadDialogs } from '../taskThread/TaskThreadDialogs';

vi.mock('@/app/hooks/useReduceMotion', () => ({ useReduceMotion: () => true }));

const baseState = {
    editOpen: false,
    editTitle: '',
    editDeadlineDate: '',
    deleteOpen: false,
    deleteTarget: null,
    deleteCount: 1,
    completeOpen: false,
    completeTarget: null,
    officialRef: '',
};

const baseActions = {
    setEditOpen: vi.fn(),
    setEditTitle: vi.fn(),
    setEditDeadlineDate: vi.fn(),
    resetEdit: vi.fn(),
    saveEdit: vi.fn(),
    setDeleteOpen: vi.fn(),
    resetDelete: vi.fn(),
    confirmDelete: vi.fn(),
    setCompleteOpen: vi.fn(),
    setOfficialRef: vi.fn(),
    resetComplete: vi.fn(),
    confirmComplete: vi.fn(),
};

describe('TaskThreadDialogs', () => {
    it('يعرض حوار التعديل فوراً داخل hub', () => {
        render(
            <TaskThreadDialogs
                state={{
                    ...baseState,
                    editOpen: true,
                    editTitle: 'مهمة اختبار',
                }}
                actions={baseActions}
            />,
        );

        const dialog = screen.getByTestId('task-thread-edit-dialog');
        expect(dialog).toHaveAttribute('data-state', 'open');
        expect(screen.getByText('تعديل المهمة')).toBeInTheDocument();
        expect(screen.getByDisplayValue('مهمة اختبار')).toBeInTheDocument();
    });

    it('يعرض حوار الحذف مع عنوان المهمة', () => {
        render(
            <TaskThreadDialogs
                state={{
                    ...baseState,
                    deleteOpen: true,
                    deleteTarget: {
                        id: 't1',
                        transactionId: 'tx-1',
                        title: 'مهمة للحذف',
                        status: 'pending',
                        parentTaskId: null,
                        deadline: null,
                        officialReference: null,
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                    },
                }}
                actions={baseActions}
            />,
        );

        expect(screen.getByTestId('task-thread-delete-dialog')).toHaveAttribute('data-state', 'open');
        expect(screen.getByText('مهمة للحذف')).toBeInTheDocument();
    });

    it('يستدعي confirmDelete عند التأكيد', () => {
        const confirmDelete = vi.fn();
        render(
            <TaskThreadDialogs
                state={{
                    ...baseState,
                    deleteOpen: true,
                    deleteTarget: {
                        id: 't1',
                        transactionId: 'tx-1',
                        title: 'x',
                        status: 'pending',
                        parentTaskId: null,
                        deadline: null,
                        officialReference: null,
                        createdAt: '2026-01-01T00:00:00.000Z',
                        updatedAt: '2026-01-01T00:00:00.000Z',
                    },
                }}
                actions={{ ...baseActions, confirmDelete }}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: 'حذف' }));
        expect(confirmDelete).toHaveBeenCalledTimes(1);
    });
});
