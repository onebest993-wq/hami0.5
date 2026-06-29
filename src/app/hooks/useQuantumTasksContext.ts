import { useContext, useSyncExternalStore } from 'react';
import type { LegalTask } from '@/app/types/TaskEngine';
import {
    QuantumTasksActionsContext,
    QuantumTasksContext,
    QuantumTasksDataContext,
    type QuantumTasksActionsValue,
    type QuantumTasksContextValue,
    type QuantumTasksDataValue,
} from '@/app/context/quantumTasksContext';
import {
    getPendingFieldTasksCountSnapshot,
    getQuantumPendingSnapshot,
    getQuantumTasksFingerprint,
    getQuantumTasksSnapshot,
    subscribePendingFieldTasksCount,
    subscribeQuantumTasksFingerprint,
} from '@/app/utils/quantumTasksMetrics';

export function useQuantumTasksContext(): QuantumTasksContextValue {
    const ctx = useContext(QuantumTasksContext);
    if (!ctx) {
        throw new Error('useQuantumTasksContext must be used within QuantumTasksProvider');
    }
    return ctx;
}

export function useQuantumTasksData(): QuantumTasksDataValue {
    const ctx = useContext(QuantumTasksDataContext);
    if (!ctx) {
        throw new Error('useQuantumTasksData must be used within QuantumTasksProvider');
    }
    return ctx;
}

export function useQuantumTasksActions(): QuantumTasksActionsValue {
    const ctx = useContext(QuantumTasksActionsContext);
    if (!ctx) {
        throw new Error('useQuantumTasksActions must be used within QuantumTasksProvider');
    }
    return ctx;
}

/** شارة الدوك — لا يُعيد رسم الشجرة إلا عند تغيّر العدد */
export function usePendingFieldTasksCountMetric(): number {
    return useSyncExternalStore(
        subscribePendingFieldTasksCount,
        getPendingFieldTasksCountSnapshot,
        getPendingFieldTasksCountSnapshot,
    );
}

/** بصمة المهام المعلّقة — للتقويم/التنبيهات دون اشتراك بكل تحديث مرجع */
export function useQuantumTasksFingerprint(): string {
    return useSyncExternalStore(
        subscribeQuantumTasksFingerprint,
        getQuantumTasksFingerprint,
        getQuantumTasksFingerprint,
    );
}

export function useQuantumPendingSnapshot(): LegalTask[] {
    useQuantumTasksFingerprint();
    return getQuantumPendingSnapshot();
}

export function useQuantumTasksSnapshot(): LegalTask[] {
    useQuantumTasksFingerprint();
    return getQuantumTasksSnapshot();
}

export { getQuantumPendingSnapshot, getQuantumTasksSnapshot };
