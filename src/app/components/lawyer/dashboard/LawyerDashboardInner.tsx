import React from 'react';
import { useAuthSafe } from '@/app/context/AuthContext';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { LawyerDashboardMainView } from './LawyerDashboardMainView';
import { usePendingFieldTasksCountMetric, useQuantumTasksFingerprint } from '@/app/hooks/useQuantumTasksContext';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps;

export function LawyerDashboardInner(props: LawyerDashboardInnerProps) {
    const runtimePhase = useRuntimePhase();
    const backgroundRuntimeEnabled = runtimePhase !== 'boot';
    const { user: authUser } = useAuthSafe();
    const bridgeLawyerId = resolveCalendarUserId(authUser?.id ?? null);

    return (
        <CriminalDashboardBridgeProvider enabled={backgroundRuntimeEnabled} lawyerId={bridgeLawyerId}>
            <LawyerDashboardCore {...props} backgroundRuntimeEnabled={backgroundRuntimeEnabled} />
        </CriminalDashboardBridgeProvider>
    );
}

function LawyerDashboardCore({
    backgroundRuntimeEnabled,
    ...shellProps
}: LawyerDashboardInnerProps & { backgroundRuntimeEnabled: boolean }) {
    const pendingFieldTasksCount = usePendingFieldTasksCountMetric();
    const quantumTasksFingerprint = useQuantumTasksFingerprint();
    const model = useLawyerDashboardCore({
        ...shellProps,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
        backgroundRuntimeEnabled,
    });

    if (model.status === 'gate') return <>{model.node}</>;
    if (model.status === 'empty') return null;

    return <LawyerDashboardMainView model={model} />;
}
