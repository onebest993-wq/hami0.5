import { createContext } from 'react';
import type { useQuantumTasks } from '@/app/hooks/useQuantumTasks';

export type QuantumTasksContextValue = ReturnType<typeof useQuantumTasks>;
export type QuantumTasksDataValue = Pick<QuantumTasksContextValue, 'tasks' | 'pendingTasks'> & {
    storageHydrated: boolean;
};
export type QuantumTasksActionsValue = Omit<QuantumTasksContextValue, 'tasks' | 'pendingTasks'> & {
    flushPersist: () => Promise<void>;
};

export const QuantumTasksContext = createContext<QuantumTasksContextValue | null>(null);
export const QuantumTasksDataContext = createContext<QuantumTasksDataValue | null>(null);
export const QuantumTasksActionsContext = createContext<QuantumTasksActionsValue | null>(null);
