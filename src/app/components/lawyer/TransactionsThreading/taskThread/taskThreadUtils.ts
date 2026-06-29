import { TransactionTaskStatus, type TransactionTask } from '@/app/modules/transactionsThreading/types';

export const EMPTY_TASKS: TransactionTask[] = [];

export const STATUS_CYCLE: TransactionTaskStatus[] = [
    TransactionTaskStatus.Pending,
    TransactionTaskStatus.InProgress,
    TransactionTaskStatus.Blocked,
    TransactionTaskStatus.Done,
];

export const CHILD_NEST_CLASS = 'mt-3 space-y-3 w-full border-r-2 border-[#2A4550]/50 pr-3';

export function emptyPathDismissKey(transactionId: string) {
    return `hami:tx:path-empty-dismiss:${transactionId}`;
}

export function nextTaskStatus(current: TransactionTaskStatus) {
    const idx = STATUS_CYCLE.indexOf(current);
    return STATUS_CYCLE[(idx + 1) % STATUS_CYCLE.length];
}

export function countTaskCascade(rootId: string, tasks: TransactionTask[]) {
    const childrenByParent = new Map<string, string[]>();
    for (const t of tasks) {
        if (!t.parentTaskId) continue;
        const arr = childrenByParent.get(t.parentTaskId) ?? [];
        arr.push(t.id);
        childrenByParent.set(t.parentTaskId, arr);
    }
    const visited = new Set<string>();
    const stack = [rootId];
    while (stack.length) {
        const id = stack.pop()!;
        if (visited.has(id)) continue;
        visited.add(id);
        for (const c of childrenByParent.get(id) ?? []) stack.push(c);
    }
    return visited.size;
}

export function computeTaskProgress(tasks: TransactionTask[]) {
    const total = tasks.length;
    const done = tasks.filter((t) => t.status === TransactionTaskStatus.Done).length;
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);
    return { total, done, percent };
}
