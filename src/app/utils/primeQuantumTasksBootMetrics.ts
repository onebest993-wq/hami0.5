import type { LegalTask } from '@/app/types/TaskEngine';
import {
    deserializeQuantumTasks,
    readQuantumTasksRawFromDiskSync,
} from '@/app/utils/quantumTasksStorageDeserialize';
import {
    publishQuantumTasksMetrics,
    resetQuantumTasksMetricsMemory,
    seedPendingFieldCountFromSnapshot,
} from '@/app/utils/quantumTasksMetrics';
import { peekBootSessionUserIdSync } from '@/boot/peekBootSessionUserId';
import { peekDashboardFrame1Snapshot } from '@/app/bootstrap/dashboardFrame1Snapshot';

function pendingOf(tasks: LegalTask[]): LegalTask[] {
    return tasks.filter((t) => t.status === 'pending' || t.status === 'delegated');
}

/**
 * شارة الدوك عند أول رسم FullBoot — deserialize فقط، بلا خطاف المهام الكامل.
 * الـ Provider يُركَّب عند فتح ستارة الميدان ويعيد النشر بعد تدوير الأجندة.
 */
export function primeQuantumTasksBootMetrics(): void {
    const raw = readQuantumTasksRawFromDiskSync();
    if (!raw?.trim()) {
        resetQuantumTasksMetricsMemory();
        const snap = peekDashboardFrame1Snapshot(peekBootSessionUserIdSync());
        if (snap && snap.pendingFieldTasksCount > 0) {
            seedPendingFieldCountFromSnapshot(snap.pendingFieldTasksCount);
        }
        return;
    }
    try {
        const tasks = deserializeQuantumTasks(JSON.parse(raw) as unknown);
        publishQuantumTasksMetrics(tasks, pendingOf(tasks));
    } catch {
        publishQuantumTasksMetrics([], []);
    }
}
