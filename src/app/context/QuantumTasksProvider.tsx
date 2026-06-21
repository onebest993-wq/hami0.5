import React, { useEffect, useState } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import SecureStoreService from '@/app/services/SecureStoreService';
import { readLatestDossierBackup } from '@/app/services/dossierPersistence/dossierBackupStore';
import { prepareAgendaTasks } from '@/app/components/lawyer/dashboard/tasksManager/utils';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/hooks/useIncrementalCalendarSync';
import { QuantumTasksContext } from '@/app/context/quantumTasksContext';
import { PERSIST_DEBOUNCE_MS } from '@/app/utils/constants';

export type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
export { QuantumTasksContext } from '@/app/context/quantumTasksContext';

/** Provider فقط — الـ hook في `useQuantumTasksContext.ts` لتوافق Fast Refresh */
export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const [storageHydrated, setStorageHydrated] = useState(false);
    const value = useQuantumTasks([]);

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
        if (!storageHydrated) return;
        const timer = window.setTimeout(() => {
            persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(value.tasks));
            try {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
                }
            } catch {
                /* ignore */
            }
        }, PERSIST_DEBOUNCE_MS.HEAVY);
        return () => window.clearTimeout(timer);
    }, [value.tasks, storageHydrated]);

    return <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>;
}
