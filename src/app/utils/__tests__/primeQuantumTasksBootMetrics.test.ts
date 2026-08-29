import { afterEach, describe, expect, it } from 'vitest';
import { QUANTUM_TASKS_STORAGE_KEY } from '@/app/utils/quantumTasksStorageKey';
import { primeQuantumTasksBootMetrics } from '@/app/utils/primeQuantumTasksBootMetrics';
import {
    getPendingFieldTasksCountSnapshot,
    getQuantumPendingSnapshot,
    publishQuantumTasksMetrics,
} from '@/app/utils/quantumTasksMetrics';
import { resetDashboardFrame1SnapshotForTests } from '@/app/bootstrap/dashboardFrame1Snapshot';

describe('primeQuantumTasksBootMetrics', () => {
    afterEach(() => {
        publishQuantumTasksMetrics([], []);
        resetDashboardFrame1SnapshotForTests();
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
    });

    it('ينشر قائمة فارغة عند غياب التخزين', () => {
        try {
            localStorage.removeItem(QUANTUM_TASKS_STORAGE_KEY);
        } catch {
            /* ignore */
        }
        primeQuantumTasksBootMetrics();
        expect(getQuantumPendingSnapshot()).toEqual([]);
        expect(getPendingFieldTasksCountSnapshot()).toBe(0);
    });

    it('ينشر المهام المعلّقة من localStorage بلا prepareAgenda', () => {
        localStorage.setItem(
            QUANTUM_TASKS_STORAGE_KEY,
            JSON.stringify({
                tasks: [
                    {
                        id: 't1',
                        rawText: 'مهمة',
                        title: 'مهمة ميدان',
                        status: 'pending',
                        pinnedToFieldCurtain: true,
                        parsedDate: new Date().toISOString(),
                    },
                    {
                        id: 't2',
                        rawText: 'منجزة',
                        title: 'منجزة',
                        status: 'completed',
                        completedAt: new Date().toISOString(),
                    },
                ],
            }),
        );
        primeQuantumTasksBootMetrics();
        expect(getQuantumPendingSnapshot().map((t) => t.id)).toEqual(['t1']);
        expect(getPendingFieldTasksCountSnapshot()).toBeGreaterThan(0);
    });
});
