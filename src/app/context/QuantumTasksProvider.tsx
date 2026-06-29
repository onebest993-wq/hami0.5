import React, { useEffect, useMemo, useState } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readLatestDossierBackup } from '@/app/services/dossierPersistence/dossierBackupStore';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/hooks/useIncrementalCalendarSync';
import {
    QuantumTasksActionsContext,
    QuantumTasksContext,
    QuantumTasksDataContext,
} from '@/app/context/quantumTasksContext';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';
import { scheduleIdleWork } from '@/app/utils/scheduleIdleWork';
import { publishQuantumTasksMetrics } from '@/app/utils/quantumTasksMetrics';

export type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
export { QuantumTasksContext } from '@/app/context/quantumTasksContext';

/** Provider فقط — الـ hook في `useQuantumTasksContext.ts` لتوافق Fast Refresh */
export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const value = useQuantumTasks([]);
    const [storageHydrated, setStorageHydrated] = useState(false);

    const dataValue = useMemo(
        () => ({ tasks: value.tasks, pendingTasks: value.pendingTasks }),
        [value.tasks, value.pendingTasks],
    );

    const actionsValue = useMemo(
        () => ({
            addTask: value.addTask,
            addTaskFromVoice: value.addTaskFromVoice,
            addWeeklyLocationBundle: value.addWeeklyLocationBundle,
            addSnoozedBacklogTask: value.addSnoozedBacklogTask,
            updateTask: value.updateTask,
            deleteTask: value.deleteTask,
            completeTask: value.completeTask,
            reopenTask: value.reopenTask,
            toggleTaskFatalDeadline: value.toggleTaskFatalDeadline,
            toggleTaskPinnedToFieldCurtain: value.toggleTaskPinnedToFieldCurtain,
            setTaskLocation: value.setTaskLocation,
            addSubTask: value.addSubTask,
            toggleSubTaskComplete: value.toggleSubTaskComplete,
            setSubTaskLocation: value.setSubTaskLocation,
            addDocumentRequirement: value.addDocumentRequirement,
            toggleDocumentRequirement: value.toggleDocumentRequirement,
            addExpense: value.addExpense,
            setTasks: value.setTasks,
        }),
        [
            value.addTask,
            value.addTaskFromVoice,
            value.addWeeklyLocationBundle,
            value.addSnoozedBacklogTask,
            value.updateTask,
            value.deleteTask,
            value.completeTask,
            value.reopenTask,
            value.toggleTaskFatalDeadline,
            value.toggleTaskPinnedToFieldCurtain,
            value.setTaskLocation,
            value.addSubTask,
            value.toggleSubTaskComplete,
            value.setSubTaskLocation,
            value.addDocumentRequirement,
            value.toggleDocumentRequirement,
            value.addExpense,
            value.setTasks,
        ],
    );

    useEffect(() => {
        let cancelled = false;
        void (async () => {
            await SecureStoreService.ensurePersistedReady();
            let blob = await persistenceRepository.loadAsync<unknown>(QUANTUM_TASKS_STORAGE_KEY);
            if (!blob) {
                const backup = await readLatestDossierBackup('tasks');
                if (backup?.payload.length) {
                    blob = { tasks: backup.payload };
                    persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, blob);
                }
            }
            if (cancelled) return;
            const loaded = prepareAgendaTasks(deserializeQuantumTasks(blob), new Date(), {
                skipRetentionPurge: true,
            });
            value.setTasks(loaded);
            setStorageHydrated(true);
        })();
        return () => {
            cancelled = true;
        };
    }, [value.setTasks]);

    useEffect(() => {
        publishQuantumTasksMetrics(value.tasks, value.pendingTasks);
    }, [value.tasks, value.pendingTasks]);

    useEffect(() => {
        if (!storageHydrated) return;
        let cancelIdle: (() => void) | undefined;
        const timer = window.setTimeout(() => {
            cancelIdle = scheduleIdleWork(() => {
                persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(value.tasks));
                try {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
                    }
                } catch {
                    /* ignore */
                }
            }, 800);
        }, PERSIST_DEBOUNCE_MS.HEAVY);
        return () => {
            window.clearTimeout(timer);
            cancelIdle?.();
        };
    }, [value.tasks, storageHydrated]);

    return (
        <QuantumTasksActionsContext.Provider value={actionsValue}>
            <QuantumTasksDataContext.Provider value={dataValue}>
                <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>
            </QuantumTasksDataContext.Provider>
        </QuantumTasksActionsContext.Provider>
    );
}
