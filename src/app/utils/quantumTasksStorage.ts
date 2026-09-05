import type { LegalTask } from '@/app/types/TaskEngine';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { countFieldDaySheetTasksLite } from '@/app/services/tasks/fieldCurtainDayCountLite';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { scheduleProtectedBackupFromRaw } from '@/app/services/dossierPersistence/protectedBackupService';
import {
    readSecureOrDrainLegacySync,
    writeSecureAndClearLegacySync,
} from '@/app/services/storage/readSecureOrDrainLegacySync';
import {
    deserializeQuantumTasks,
    readQuantumTasksRawFromDiskSync,
    serializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
} from '@/app/utils/quantumTasksStorageDeserialize';
import { publishQuantumTasksMetrics } from '@/app/utils/quantumTasksMetrics';

export {
    deserializeQuantumTasks,
    readQuantumTasksRawFromDiskSync,
    serializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
} from '@/app/utils/quantumTasksStorageDeserialize';

function pendingOf(tasks: LegalTask[]): LegalTask[] {
    return tasks.filter((t) => t.status === 'pending' || t.status === 'delegated');
}

function shouldRejectQuantumTasksWipe(incomingSerialized: string): boolean {
    const existing = readSecureOrDrainLegacySync(QUANTUM_TASKS_STORAGE_KEY);
    if (!existing?.trim()) return false;
    return shouldRejectDossierWipe(QUANTUM_TASKS_STORAGE_KEY, incomingSerialized, existing);
}

/** كاش تسخين — pointerdown يفرّغ تكلفة JSON.parse قبل فتح الستارة */
let warmDiskTasks: LegalTask[] | null = null;

export function invalidateQuantumTasksDiskWarmCache(): void {
    warmDiskTasks = null;
}

/** تسخين قراءة القرص قبل النقر — يستدعيه dock pointerDown */
export function warmQuantumTasksDiskRead(now = new Date()): LegalTask[] {
    if (warmDiskTasks) return warmDiskTasks;
    warmDiskTasks = readQuantumTasksFromDiskSyncUncached(now);
    return warmDiskTasks;
}

function readQuantumTasksFromDiskSyncUncached(_now = new Date()): LegalTask[] {
    const raw = readQuantumTasksRawFromDiskSync();
    if (!raw?.trim()) return [];
    try {
        const blob: unknown = JSON.parse(raw);
        return deserializeQuantumTasks(blob);
    } catch {
        return [];
    }
}

/** قراءة فورية عند الإقلاع — leftover localStorage بلا SecureStore على المسار البارد */
export function readQuantumTasksFromDiskSync(now = new Date()): LegalTask[] {
    if (warmDiskTasks) return warmDiskTasks;
    return warmQuantumTasksDiskRead(now);
}

/** عداد شارة الدوك — مهام مثبتة على الستارة فقط */
export function countPendingFieldTasks(pendingTasks: LegalTask[]): number {
    return countFieldDaySheetTasksLite(pendingTasks);
}

/** حفظ متزامن — SecureStore فوري ثم محو مرآة leftover؛ الكاش الدافئ يبقى لنفس الجلسة */
export function persistQuantumTasksSync(tasks: LegalTask[]): boolean {
    const blob = serializeQuantumTasks(tasks);
    const serialized = JSON.stringify(blob);
    if (shouldRejectQuantumTasksWipe(serialized)) return false;

    persistenceRepository.primeEntry(QUANTUM_TASKS_STORAGE_KEY, serialized, blob);
    writeSecureAndClearLegacySync(QUANTUM_TASKS_STORAGE_KEY, serialized);
    warmDiskTasks = tasks;
    publishQuantumTasksMetrics(tasks, pendingOf(tasks));
    return true;
}

function readPersistedQuantumTasksRaw(tasks: LegalTask[]): string {
    const fromSecure = readSecureOrDrainLegacySync(QUANTUM_TASKS_STORAGE_KEY);
    if (fromSecure?.trim()) return fromSecure;
    return JSON.stringify(serializeQuantumTasks(tasks));
}

/** IndexedDB + SecureStore async + نسخة احتياطية — بعد persistQuantumTasksSync */
export async function persistQuantumTasksBackground(tasks: LegalTask[]): Promise<void> {
    const serialized = readPersistedQuantumTasksRaw(tasks);
    scheduleProtectedBackupFromRaw(QUANTUM_TASKS_STORAGE_KEY, serialized);
    const { default: SecureStoreService } = await import('@/app/services/SecureStoreService');
    await SecureStoreService.setItem(QUANTUM_TASKS_STORAGE_KEY, serialized);
}
