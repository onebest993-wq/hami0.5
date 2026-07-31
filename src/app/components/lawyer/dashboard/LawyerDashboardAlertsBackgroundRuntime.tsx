import { useEffect, useRef, type MutableRefObject } from 'react';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { LegalTask } from '@/app/types/TaskEngine';
import { useAppAlerts } from '@/app/hooks/useAppAlerts';

type AlertNoteLike = {
    id: string | number;
    title?: string;
    body?: string;
    isPinned?: boolean;
    date?: string;
    apptDate?: string;
    reminder_at?: string;
};

export type LawyerDashboardAlertsBackgroundRuntimeProps = {
    lawyerId: string;
    files: FileData[];
    executionFiles: unknown[];
    criminalCases: unknown[];
    globalNotes: unknown[];
    fieldTasks: LegalTask[];
    onAlerts: (payload: {
        alerts: SecretaryAlert[];
        loading: boolean;
        error: string | null;
        refresh: () => void;
    }) => void;
    refreshAppAlertsRef: MutableRefObject<() => void>;
    refreshAlertsLightRef: MutableRefObject<() => void>;
};

export function LawyerDashboardAlertsBackgroundRuntime({
    lawyerId,
    files,
    executionFiles,
    criminalCases,
    globalNotes,
    fieldTasks,
    onAlerts,
    refreshAppAlertsRef,
    refreshAlertsLightRef,
}: LawyerDashboardAlertsBackgroundRuntimeProps) {
    const { alerts, loading, error, refresh, refreshLight } = useAppAlerts({
        lawyerId,
        files,
        executionFiles,
        criminalCases,
        notes: globalNotes as AlertNoteLike[],
        fieldTasks,
        deferUntilIdle: true,
    });

    const onAlertsRef = useRef(onAlerts);
    onAlertsRef.current = onAlerts;
    const lastAlertsPayloadRef = useRef<{
        alerts: SecretaryAlert[];
        loading: boolean;
        error: string | null;
    } | null>(null);

    useEffect(() => {
        const prev = lastAlertsPayloadRef.current;
        if (
            prev &&
            prev.loading === loading &&
            prev.error === error &&
            prev.alerts.length === alerts.length &&
            prev.alerts.every((a, i) => a.id === alerts[i]?.id)
        ) {
            return;
        }
        lastAlertsPayloadRef.current = { alerts, loading, error };
        onAlertsRef.current({ alerts, loading, error, refresh });
    }, [alerts, error, loading, refresh]);

    refreshAppAlertsRef.current = () => void refresh();
    refreshAlertsLightRef.current = () => void refreshLight();

    return null;
}
