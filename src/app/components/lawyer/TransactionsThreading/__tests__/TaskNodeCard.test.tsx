import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskNodeCard } from '@/app/components/lawyer/TransactionsThreading/TaskNodeCard';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

const task: TransactionTask = {
    id: 't1',
    transactionId: 'tx-1',
    title: 'مراجعة الظاهرة',
    status: TransactionTaskStatus.InProgress,
    parentTaskId: null,
    notes: null,
    deadline: null,
    officialReference: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
};

describe('TaskNodeCard', () => {
    it('يعرض العنوان ويستدعي onToggleStatus عند النقر', () => {
        const onToggleStatus = vi.fn();
        render(
            <TaskNodeCard
                task={task}
                taskNumber="1"
                depth={0}
                onToggleStatus={onToggleStatus}
                onAddSubTask={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onSetTaskStatus={vi.fn()}
            />,
        );

        expect(screen.getByText('مراجعة الظاهرة')).toBeInTheDocument();
        fireEvent.click(screen.getByText('مراجعة الظاهرة'));
        expect(onToggleStatus).toHaveBeenCalledWith(task);
    });

    it('يستدعي onAddSubTask من زر المتفرع', () => {
        const onAddSubTask = vi.fn();
        render(
            <TaskNodeCard
                task={task}
                taskNumber="1"
                depth={0}
                onToggleStatus={vi.fn()}
                onAddSubTask={onAddSubTask}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onSetTaskStatus={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByRole('button', { name: /متفرع/ }));
        expect(onAddSubTask).toHaveBeenCalledWith(task);
    });

    it('يعرض حالة المنجز دون أزرار إجراءات عند القراءة فقط', () => {
        render(
            <TaskNodeCard
                task={{ ...task, status: TransactionTaskStatus.Done }}
                taskNumber="1"
                depth={0}
                onToggleStatus={vi.fn()}
                onAddSubTask={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onSetTaskStatus={vi.fn()}
                readOnly
            />,
        );

        expect(screen.getByText('منجز')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /متفرع/ })).not.toBeInTheDocument();
        expect(screen.queryByLabelText('خيارات المهمة')).not.toBeInTheDocument();
    });

    it('Space على البطاقة يمنع التمرير ويستدعي تبديل الحالة', () => {
        const onToggleStatus = vi.fn();
        render(
            <TaskNodeCard
                task={task}
                taskNumber="1"
                depth={0}
                onToggleStatus={onToggleStatus}
                onAddSubTask={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
                onSetTaskStatus={vi.fn()}
            />,
        );

        const card = screen.getByText('مراجعة الظاهرة').closest('[role="button"]');
        expect(card).toBeTruthy();
        fireEvent.keyDown(card as HTMLElement, { key: ' ' });
        expect(onToggleStatus).toHaveBeenCalledWith(task);
    });
});
