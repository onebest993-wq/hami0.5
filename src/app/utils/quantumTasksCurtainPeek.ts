import type { LegalTask } from '@/app/types/TaskEngine';
import {
    peekSecureOrLegacySync,
    readSecurePayloadWhenReady,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    readQuantumTasksRawFromDiskSync,
} from '@/app/utils/quantumTasksStorageDeserialize';
import {
    getQuantumPendingSnapshot,
    publishQuantumTasksMetrics,
} from '@/app/utils/quantumTasksMetrics';

export const FIELD_TASKS_CURTAIN_PEEK_READY_EVENT = 'hami:field-tasks-curtain-peek-ready';

function pendingOf(tasks: LegalTask[]): LegalTask[] {
    return tasks.filter((t) => t.status === 'pending' || t.status === 'delegated');
}

function publishFromRaw(raw: string): boolean {
    try {
        const tasks = deserializeQuantumTasks(JSON.parse(raw) as unknown);
        publishQuantumTasksMetrics(tasks, pendingOf(tasks));
        return true;
    } catch {
        return false;
    }
}

function notifyCurtainPeekReady(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new Event(FIELD_TASKS_CURTAIN_PEEK_READY_EVENT));
}

/**
 * لقطة ستارة عند اللمسة — leftover ثم كاش SecureStore.
 * ليست مسار أول إطار للمنزل (primeQuantumTasksBootMetrics يبقى بلا فكّ).
 */
export function publishFieldTasksCurtainPeekFromDiskSync(): boolean {
    if (getQuantumPendingSnapshot().length > 0) return true;
    let raw: string | null = null;
    try {
        raw = readQuantumTasksRawFromDiskSync();
    } catch {
        raw = null;
    }
    if (!raw?.trim()) {
        try {
            raw = peekSecureOrLegacySync(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            raw = null;
        }
    }
    if (!raw?.trim()) return false;
    return publishFromRaw(raw);
}

let peekInflight: Promise<void> | null = null;

/**
 * فكّ مفتاح المهام بعد أول إطار أو عند اللمسة إن كان الكاش unread.
 * ليست مسار أول إطار للمنزل (primeQuantumTasksBootMetrics يبقى بلا فكّ).
 */
export function scheduleFieldTasksCurtainPeekFromSecureStore(): void {
    if (typeof window === 'undefined') return;
    if (getQuantumPendingSnapshot().length > 0) return;
    if (peekInflight) return;
    peekInflight = readSecurePayloadWhenReady(QUANTUM_TASKS_STORAGE_KEY)
        .then((raw) => {
            if (getQuantumPendingSnapshot().length > 0) return;
            if (!raw?.trim()) return;
            publishFromRaw(raw);
        })
        .catch(() => undefined)
        .finally(() => {
            peekInflight = null;
            notifyCurtainPeekReady();
        });
}

export function resetFieldTasksCurtainPeekForTests(): void {
    peekInflight = null;
}
