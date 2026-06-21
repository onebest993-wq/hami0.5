import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { useQuantumTasksContext } from '@/app/hooks/useQuantumTasksContext';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { LawyerDashboardMainView } from './LawyerDashboardMainView';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps;

export function LawyerDashboardInner(props: LawyerDashboardInnerProps) {
    const runtimePhase = useRuntimePhase();
    const backgroundRuntimeEnabled = runtimePhase !== 'boot';
    const { user: authUser } = useAuth();
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
    const quantum = useQuantumTasksContext();
    const model = useLawyerDashboardCore({ ...shellProps, quantum, backgroundRuntimeEnabled });

    if (model.status === 'gate') return <>{model.node}</>;
    if (model.status === 'empty') return null;

    return <LawyerDashboardMainView model={model} />;
}
