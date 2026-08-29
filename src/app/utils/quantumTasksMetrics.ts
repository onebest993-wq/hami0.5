import type { LegalTask } from '@/app/types/TaskEngine';
import { countFieldDaySheetTasksLite } from '@/app/services/tasks/fieldCurtainDayCountLite';
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { patchDashboardFrame1Snapshot } from '@/app/bootstrap/dashboardFrame1Snapshot';

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
            const ymd = t.parsedDate?.getTime() ?? '';
            const rem = t.reminderAt?.getTime() ?? '';
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
    if (countChanged) {
        patchDashboardFrame1Snapshot(peekBootSessionUserIdSync(), {
            pendingFieldTasksCount: nextCount,
        });
    }
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

/** شارة من لقطة الإقلاع إن لم تُقرأ المهام من القرص بعد */
export function seedPendingFieldCountFromSnapshot(count: number): void {
    if (pendingFieldCount > 0) return;
    const next = Number.isFinite(count) ? Math.max(0, Math.floor(count)) : 0;
    if (next <= 0 || next === pendingFieldCount) return;
    pendingFieldCount = next;
    notifyCountListeners();
}

/** بلا نشر على القرص — غياب ملف المهام لا يصفّر لقطة الإقلاع */
export function resetQuantumTasksMetricsMemory(): void {
    tasksSnapshot = [];
    pendingSnapshot = [];
    pendingFieldCount = 0;
    tasksFingerprint = '';
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
