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
    detailsActive = true,
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
    detailsActive?: boolean;
}) {
    const { tree, progress, nodeHandlers, dialogState, dialogActions } = useTaskThreadController({
        transactionId,
        onRequestAddTask,
        readOnly,
        onTaskEscapeSnapshotChange,
        registerTaskEscapeCloser,
        detailsActive,
    });

    return (
        <div dir="rtl" className="py-3 space-y-2.5 pb-4 w-full max-w-full">
            <TaskThreadProgressPanel done={progress.done} total={progress.total} percent={progress.percent} />

            {tree.length === 0 ? (
                <TaskThreadPathEmptyHint
                    transactionId={transactionId}
                    onImportFromMyTemplates={onImportFromMyTemplates}
                    readOnly={readOnly}
                />
            ) : (
                <div className="space-y-2 w-full">
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

            {(dialogState.editOpen || dialogState.deleteOpen || dialogState.completeOpen) ? (
                <TaskThreadDialogs state={dialogState} actions={dialogActions} />
            ) : null}
        </div>
    );
});
