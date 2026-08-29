import { memo } from 'react';
import type { TransactionTask, TransactionTaskNode } from '@/app/modules/transactionsThreading/types';
import { TaskNodeCard } from '../TaskNodeCard';
import { CHILD_NEST_CLASS } from './taskThreadUtils';

export type TaskNodeActionHandlers = {
    onToggleStatus: (task: TransactionTask) => void;
    onAddSubTask: (task: TransactionTask) => void;
    onEdit: (task: TransactionTask) => void;
    onDelete: (task: TransactionTask) => void;
    onSetTaskStatus: (task: TransactionTask, status: TransactionTask['status']) => void;
    readOnly?: boolean;
};

export const TaskThreadNodeRenderer = memo(function TaskThreadNodeRenderer({
    node,
    depth,
    index,
    siblingsCount,
    taskNumber,
    handlers,
}: {
    node: TransactionTaskNode;
    depth: number;
    index: number;
    siblingsCount: number;
    taskNumber: string;
    handlers: TaskNodeActionHandlers;
}) {
    void index;
    void siblingsCount;
    const { onToggleStatus, onAddSubTask, onEdit, onDelete, onSetTaskStatus, readOnly } = handlers;

    return (
        <div className="w-full min-w-0">
            <TaskNodeCard
                task={node}
                taskNumber={taskNumber}
                depth={depth}
                onToggleStatus={onToggleStatus}
                onAddSubTask={onAddSubTask}
                onEdit={onEdit}
                onDelete={onDelete}
                onSetTaskStatus={onSetTaskStatus}
                readOnly={readOnly}
            />

            {node.children.length > 0 ? (
                <div className={CHILD_NEST_CLASS}>
                    {node.children.map((child, i) => (
                        <TaskThreadNodeRenderer
                            key={child.id}
                            node={child}
                            depth={depth + 1}
                            index={i}
                            siblingsCount={node.children.length}
                            taskNumber={`${taskNumber}.${i + 1}`}
                            handlers={handlers}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
});
