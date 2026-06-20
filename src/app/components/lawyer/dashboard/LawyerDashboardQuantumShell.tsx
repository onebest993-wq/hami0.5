// @ts-nocheck
import React, { useEffect, useMemo } from 'react';
import { persistenceRepository } from '@/app/infrastructure/persistence/LocalStorageRepository';
import { QuantumTasksContext } from '@/app/context/QuantumTasksContext';
import { useQuantumTasks } from '@/app/hooks/useQuantumTasks';
import {
    deserializeQuantumTasks,
    QUANTUM_TASKS_STORAGE_KEY,
    serializeQuantumTasks,
} from '@/app/utils/quantumTasksStorage';
import { QUANTUM_TASKS_CHANGED_EVENT } from '@/app/hooks/useIncrementalCalendarSync';
import { LawyerDashboardInner } from './LawyerDashboardInner';

export type LawyerDashboardShellProps = {
    onLogout: () => void;
    onOpenProfile?: () => void;
    onNavigateToCase?: (caseId: string) => void;
    onAppNavigate?: (target: 'privacy' | 'support' | 'settings') => void;
};

function LawyerDashboardQuantumShell(props: LawyerDashboardShellProps) {
    const initial = useMemo(() => {
        const blob = persistenceRepository.load<unknown>(QUANTUM_TASKS_STORAGE_KEY);
        return deserializeQuantumTasks(blob);
    }, []);

    const quantum = useQuantumTasks(initial);

    useEffect(() => {
        persistenceRepository.save(QUANTUM_TASKS_STORAGE_KEY, serializeQuantumTasks(quantum.tasks));
        try {
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent(QUANTUM_TASKS_CHANGED_EVENT));
            }
        } catch {
            /* ignore */
        }
    }, [quantum.tasks]);

    return (
        <QuantumTasksContext.Provider value={quantum}>
            <LawyerDashboardInner {...props} quantum={quantum} />
        </QuantumTasksContext.Provider>
    );
}

export { LawyerDashboardQuantumShell };
