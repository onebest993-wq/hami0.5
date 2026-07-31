import type { LegalTask } from '@/app/types/TaskEngine';
import { countFieldDaySheetTasksLite } from '@/app/services/tasks/fieldCurtainDayCountLite';

type Listener = () => void;

let tasksSnapshot: LegalTask[] = [];
let pendingSnapshot: LegalTask[] = [];
let pendingFieldCount = 0;
let tasksFingerprint = '';

const countListeners = new Set<Listener>();
const fingerprintListeners = new Set<Listener>();

function buildTasksFingerprint(tasks: LegalTask[]): string {
    return tasks
        .map((t) => {
            const ymd = t.parsedDate?.toISOString().slice(0, 10) ?? '';
            const rem = t.reminderAt?.toISOString().slice(0, 10) ?? '';
            const done = t.completedAt?.getTime() ?? '';
            const subs = t.subTasks.map((s) => `${s.id}:${s.isCompleted ? 1 : 0}`).join(',');
            const loc = t.location ?? '';
            return `${t.id}:${t.status}:${ymd}:${rem}:${t.pinnedToFieldCurtain ? 1 : 0}:${done}:${loc}:${subs}:${t.title}`;
        })
        .sort()
        .join('|');
}

function notifyCountListeners(): void {
    for (const listener of countListeners) listener();
}

function notifyFingerprintListeners(): void {
    for (const listener of fingerprintListeners) listener();
}

/** يُستدعى من QuantumTasksProvider عند كل تحديث للمهام */
export function publishQuantumTasksMetrics(tasks: LegalTask[], pending: LegalTask[]): void {
    tasksSnapshot = tasks;
    pendingSnapshot = pending;

    const nextFingerprint = buildTasksFingerprint(pending);
    const nextCount = countFieldDaySheetTasksLite(pending, new Date());

    const fingerprintChanged = nextFingerprint !== tasksFingerprint;
    const countChanged = nextCount !== pendingFieldCount;

    tasksFingerprint = nextFingerprint;
    pendingFieldCount = nextCount;

    if (countChanged) notifyCountListeners();
    if (fingerprintChanged) notifyFingerprintListeners();
}

export function getQuantumTasksSnapshot(): LegalTask[] {
    return tasksSnapshot;
}

export function getQuantumPendingSnapshot(): LegalTask[] {
    return pendingSnapshot;
}

export function getPendingFieldTasksCountSnapshot(): number {
    return pendingFieldCount;
}

export function getQuantumTasksFingerprint(): string {
    return tasksFingerprint;
}

export function subscribePendingFieldTasksCount(listener: Listener): () => void {
    countListeners.add(listener);
    return () => countListeners.delete(listener);
}

export function subscribeQuantumTasksFingerprint(listener: Listener): () => void {
    fingerprintListeners.add(listener);
    return () => fingerprintListeners.delete(listener);
}
