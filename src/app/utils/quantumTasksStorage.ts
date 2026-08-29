import type { LegalTask } from '@/app/types/TaskEngine';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { countFieldDaySheetTasksLite } from '@/app/services/tasks/fieldCurtainDayCountLite';
import { shouldRejectDossierWipe } from '@/app/services/dossierPersistence/dossierWipeGuard';
import { scheduleProtectedBackupFromRaw } from '@/app/services/dossierPersistence/protectedBackupService';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
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

export {
    deserializeQuantumTasks,
    readQuantumTasksRawFromDiskSync,
    serializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
} from '@/app/utils/quantumTasksStorageDeserialize';

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

function readQuantumTasksFromDiskSyncUncached(now = new Date()): LegalTask[] {
    const raw = readQuantumTasksRawFromDiskSync();
    if (!raw?.trim()) return [];
    try {
        const blob: unknown = JSON.parse(raw);
        return prepareAgendaTasks(deserializeQuantumTasks(blob), now, { skipRetentionPurge: true });
    } catch {
        return [];
    }
}

/** قراءة فورية عند الإقلاع — localStorage أولاً (يبقى بعد F5) */
export function readQuantumTasksFromDiskSync(now = new Date()): LegalTask[] {
    if (warmDiskTasks) return warmDiskTasks;
    return warmQuantumTasksDiskRead(now);
}

/** عداد شارة الدوك — مهام مثبتة على الستارة فقط */
export function countPendingFieldTasks(pendingTasks: LegalTask[]): number {
    return countFieldDaySheetTasksLite(pendingTasks);
}

/** حفظ متزامن — SecureStore فوري ثم محو مرآة localStorage (قراءة الستارة تبقى leftover) */
export function persistQuantumTasksSync(tasks: LegalTask[]): boolean {
    const blob = serializeQuantumTasks(tasks);
    const serialized = JSON.stringify(blob);
    if (shouldRejectQuantumTasksWipe(serialized)) return false;

    persistenceRepository.primeEntry(QUANTUM_TASKS_STORAGE_KEY, serialized, blob);
    writeSecureAndClearLegacySync(QUANTUM_TASKS_STORAGE_KEY, serialized);
    invalidateQuantumTasksDiskWarmCache();
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

/** حفظ كامل — sync فوري + IndexedDB + نسخة احتياطية */
export async function persistQuantumTasksImmediate(tasks: LegalTask[]): Promise<void> {
    if (!persistQuantumTasksSync(tasks)) return;
    await persistQuantumTasksBackground(tasks);
}
