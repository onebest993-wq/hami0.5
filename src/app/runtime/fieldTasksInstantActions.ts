export const FIELD_TASKS_INSTANT_COMPLETE_EVENT = 'hami:field-tasks-instant-complete';
export const FIELD_TASKS_INSTANT_MANAGE_EVENT = 'hami:field-tasks-instant-manage';

const completeQueued = new Set<string>();
let manageQueued = false;

export function requestFieldTasksInstantComplete(taskId: string): void {
    const id = String(taskId ?? '').trim();
    if (!id) return;
    completeQueued.add(id);
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(FIELD_TASKS_INSTANT_COMPLETE_EVENT, { detail: { taskId: id } }));
}

export function drainFieldTasksInstantCompleteQueue(): string[] {
    const ids = [...completeQueued];
    completeQueued.clear();
    return ids;
}

export function requestFieldTasksInstantManage(): void {
    manageQueued = true;
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(FIELD_TASKS_INSTANT_MANAGE_EVENT));
}

export function takeFieldTasksInstantManageQueued(): boolean {
    const next = manageQueued;
    manageQueued = false;
    return next;
}
