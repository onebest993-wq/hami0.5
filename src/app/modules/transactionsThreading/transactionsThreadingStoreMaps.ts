import type { Transaction, TransactionDocument, TransactionTask } from './types';

function transactionIdentityKey(t: Transaction): string {
    return [
        t.id,
        t.updatedAt,
        t.status,
        t.title,
        t.clientName,
        t.targetDepartment,
        t.archivedAt ?? '',
        t.deletedAt ?? '',
    ].join('\0');
}

function taskIdentityKey(t: TransactionTask): string {
    return [
        t.id,
        t.status,
        t.title,
        t.deadline ?? '',
        t.completedAt ?? '',
        t.parentTaskId ?? '',
        t.officialReference ?? '',
    ].join('\0');
}

function documentIdentityKey(d: TransactionDocument): string {
    return [d.id, d.title, d.uploadedAt, d.ownerTag].join('\0');
}

export function transactionListUnchanged(prev: Transaction[], next: Transaction[]): boolean {
    if (prev === next) return true;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
        if (transactionIdentityKey(prev[i]) !== transactionIdentityKey(next[i])) return false;
    }
    return true;
}

export function taskListUnchanged(prev: TransactionTask[] | undefined, next: TransactionTask[]): boolean {
    if (prev === next) return true;
    if (!prev) return next.length === 0;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
        if (taskIdentityKey(prev[i]) !== taskIdentityKey(next[i])) return false;
    }
    return true;
}

export function documentListUnchanged(
    prev: TransactionDocument[] | undefined,
    next: TransactionDocument[],
): boolean {
    if (prev === next) return true;
    if (!prev) return next.length === 0;
    if (prev.length !== next.length) return false;
    for (let i = 0; i < prev.length; i++) {
        if (documentIdentityKey(prev[i]) !== documentIdentityKey(next[i])) return false;
    }
    return true;
}

export function findTaskInState(
    tasksByTransactionId: Record<string, TransactionTask[]>,
    taskId: string,
): TransactionTask | undefined {
    for (const list of Object.values(tasksByTransactionId)) {
        const found = list.find((t) => t.id === taskId);
        if (found) return found;
    }
    return undefined;
}

export function upsertTaskMap(
    map: Record<string, TransactionTask[]>,
    task: TransactionTask,
): Record<string, TransactionTask[]> {
    const list = map[task.transactionId] ?? [];
    const idx = list.findIndex((t) => t.id === task.id);
    const next = idx === -1 ? [...list, task] : list.map((t, i) => (i === idx ? task : t));
    return { ...map, [task.transactionId]: next };
}

export function removeTasksFromMap(
    map: Record<string, TransactionTask[]>,
    transactionId: string,
    ids: Set<string>,
): Record<string, TransactionTask[]> {
    return {
        ...map,
        [transactionId]: (map[transactionId] ?? []).filter((t) => !ids.has(t.id)),
    };
}

export function upsertDocumentMap(
    map: Record<string, TransactionDocument[]>,
    doc: TransactionDocument,
): Record<string, TransactionDocument[]> {
    const list = map[doc.transactionId] ?? [];
    const idx = list.findIndex((d) => d.id === doc.id);
    const next = idx === -1 ? [...list, doc] : list.map((d, i) => (i === idx ? doc : d));
    return { ...map, [doc.transactionId]: next };
}

export function collectTaskCascadeIds(taskId: string, tasks: TransactionTask[]): Set<string> {
    const childrenByParent = new Map<string, string[]>();
    for (const t of tasks) {
        if (!t.parentTaskId) continue;
        const arr = childrenByParent.get(t.parentTaskId) ?? [];
        arr.push(t.id);
        childrenByParent.set(t.parentTaskId, arr);
    }
    const toDelete = new Set<string>();
    const stack = [taskId];
    while (stack.length) {
        const id = stack.pop()!;
        if (toDelete.has(id)) continue;
        toDelete.add(id);
        for (const k of childrenByParent.get(id) ?? []) stack.push(k);
    }
    return toDelete;
}
