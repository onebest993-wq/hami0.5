import { memo } from 'react';
import type { TransactionTask } from '@/app/modules/transactionsThreading/types';
import type { TransactionsDetailsEscapeSnapshot } from './transactionsEscapeStack';
import { TaskThreadDialogs } from './taskThread/TaskThreadDialogs';
import { TaskThreadNodeRenderer } from './taskThread/TaskThreadNodeRenderer';
import { TaskThreadPathEmptyHint } from './taskThread/TaskThreadPathEmptyHint';
import { TaskThreadProgressPanel } from './taskThread/TaskThreadProgressPanel';
import { useTaskThreadController } from './taskThread/useTaskThreadController';

export const TaskThreadView = memo(function TaskThreadView({
    transactionId,
    onRequestAddTask,
    onImportFromMyTemplates,
    readOnly,
    onTaskEscapeSnapshotChange,
    registerTaskEscapeCloser,
}: {
    transactionId: string;
    onRequestAddTask: (parent: TransactionTask | null) => void;
    onImportFromMyTemplates?: () => void;
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
    const { tree, progress, nodeHandlers, dialogState, dialogActions } = useTaskThreadController({
        transactionId,
        onRequestAddTask,
        readOnly,
        onTaskEscapeSnapshotChange,
        registerTaskEscapeCloser,
    });

    return (
        <div dir="rtl" className="py-4 space-y-4 pb-4 w-full max-w-full">
            <TaskThreadProgressPanel done={progress.done} total={progress.total} percent={progress.percent} />

            {tree.length === 0 ? (
                <TaskThreadPathEmptyHint
                    transactionId={transactionId}
                    onImportFromMyTemplates={onImportFromMyTemplates}
                    readOnly={readOnly}
                />
            ) : (
                <div className="space-y-3 w-full">
                    {tree.map((node, i) => (
                        <TaskThreadNodeRenderer
                            key={node.id}
                            node={node}
                            depth={0}
                            index={i}
                            siblingsCount={tree.length}
                            taskNumber={String(i + 1)}
                            handlers={nodeHandlers}
                        />
                    ))}
                </div>
            )}

            <TaskThreadDialogs state={dialogState} actions={dialogActions} />
        </div>
    );
});
