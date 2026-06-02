import React, { useEffect, useMemo } from 'react';

import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/hooks/useIncrementalCalendarSync';
import { QuantumTasksContext } from '@/app/context/quantumTasksContext';

export type { QuantumTasksContextValue } from '@/app/context/quantumTasksContext';
export { QuantumTasksContext } from '@/app/context/quantumTasksContext';

/** Provider فقط — الـ hook في `useQuantumTasksContext.ts` لتوافق Fast Refresh */
export function QuantumTasksProvider({ children }: { children: React.ReactNode }) {
    const initial = useMemo(() => {
        const blob = persistenceRepository.load<unknown>(QUANTUM_TASKS_STORAGE_KEY);
        return deserializeQuantumTasks(blob);
    }, []);

    const value = useQuantumTasks(initial);

    useEffect(() => {
        persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(value.tasks));
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
            }
        } catch {
            /* ignore */
        }
    }, [value.tasks]);

    return <QuantumTasksContext.Provider value={value}>{children}</QuantumTasksContext.Provider>;
}
