import { useContext } from 'react';
import {
    QuantumTasksContext,
    type QuantumTasksContextValue,
} from '@/app/context/quantumTasksContext';

export function useQuantumTasksContext(): QuantumTasksContextValue {
    const ctx = useContext(QuantumTasksContext);
    if (!ctx) {
        throw new Error('useQuantumTasksContext must be used within QuantumTasksProvider');
    }
    return ctx;
}
