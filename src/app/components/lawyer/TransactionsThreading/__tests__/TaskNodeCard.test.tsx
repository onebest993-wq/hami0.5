import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TaskNodeCard } from '@/app/components/lawyer/TransactionsThreading/TaskNodeCard';
import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

const task: TransactionTask = {
    id: 't1',
    transactionId: 'tx-1',
    title: '┘à╪▒╪د╪ش╪╣╪ر ╪د┘╪»╪د╪خ╪▒╪ر',
    status: TransactionTaskStatus.InProgress,
    parentTaskId: null,
    notes: null,
    deadline: null,
    officialReference: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    completedAt: null,
};

describe('TaskNodeCard ظ¤ ╪ح┘â┘à╪د┘ ╪╣┘┘ë ╪د┘╪ذ╪╖╪د┘é╪ر', () => {
    it('┘è╪╣╪▒╪╢ ╪▓╪▒ ╪ح┘â┘à╪د┘ ┘ê┘è╪│╪ز╪»╪╣┘è onComplete ╪»┘ê┘ ┘╪ز╪ص ╪ص┘ê╪د╪▒', () => {
        const onComplete = vi.fn();
        render(
            <TaskNodeCard
                task={task}
                taskNumber="1"
                depth={0}
                onToggleStatus={vi.fn()}
                onComplete={onComplete}
                onAddSubTask={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        fireEvent.click(screen.getByTestId('task-complete-t1'));
        expect(onComplete).toHaveBeenCalledWith(task);
        expect(screen.queryByText('╪ح┘â┘à╪د┘ ╪د┘┘à┘ç┘à╪ر')).not.toBeInTheDocument();
    });

    it('┘è╪│╪ز╪ذ╪»┘ ╪▓╪▒ ╪د┘╪ح┘â┘à╪د┘ ╪ذ╪┤╪د╪▒╪ر ┘à┘╪ش╪▓╪ر ╪╣┘╪» ╪د┘â╪ز┘à╪د┘ ╪د┘┘à┘ç┘à╪ر', () => {
        render(
            <TaskNodeCard
                task={{ ...task, status: TransactionTaskStatus.Done }}
                taskNumber="1"
                depth={0}
                onToggleStatus={vi.fn()}
                onComplete={vi.fn()}
                onAddSubTask={vi.fn()}
                onEdit={vi.fn()}
                onDelete={vi.fn()}
            />,
        );

        expect(screen.queryByTestId('task-complete-t1')).not.toBeInTheDocument();
        expect(screen.getByTestId('task-reopen-t1')).toBeInTheDocument();
    });
});
