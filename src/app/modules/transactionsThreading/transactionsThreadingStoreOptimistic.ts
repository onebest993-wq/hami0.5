import type { TransactionTask } from './types';
import { findTaskInState, upsertTaskMap } from './transactionsThreadingStoreMaps';

type TaskMap = Record<string, TransactionTask[]>;

export function createApplyOptimisticTask(opts: {
    getTaskMap: () => TaskMap;
    patchTaskMap: (updater: (map: TaskMap) => TaskMap) => void;
    syncThreadingToCalendar: () => void;
}) {
    return async (
        taskId: string,
        buildOptimistic: (prev: TransactionTask) => TransactionTask,
        run: () => Promise<TransactionTask>,
    ) => {
        const prev = findTaskInState(opts.getTaskMap(), taskId);
        if (prev) {
            opts.patchTaskMap((map) => upsertTaskMap(map, buildOptimistic(prev)));
        }
        try {
            const task = await run();
            opts.patchTaskMap((map) => upsertTaskMap(map, task));
            opts.syncThreadingToCalendar();
            return task;
        } catch (err) {
            if (prev) {
                opts.patchTaskMap((map) => upsertTaskMap(map, prev));
            }
            throw err;
        }
    };
}
