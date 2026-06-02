import { createContext } from 'react';
import type { useQuantumTasks } from '@/app/hooks/useQuantumTasks';

export type QuantumTasksContextValue = ReturnType<typeof useQuantumTasks>;

export const QuantumTasksContext = createContext<QuantumTasksContextValue | null>(null);
