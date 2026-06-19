import React from 'react';
import { useAuth } from '@/app/context/AuthContext';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { resolveCalendarUserId } from '@/app/services/calendarBridge';
import type { QuantumTasksContextValue } from '@/app/context/QuantumTasksContext';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { LawyerDashboardMainView } from './LawyerDashboardMainView';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps & {
    quantum: QuantumTasksContextValue;
};

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
    const model = useLawyerDashboardCore({ ...shellProps, backgroundRuntimeEnabled });

    if (model.status === 'gate') return <>{model.node}</>;
    if (model.status === 'empty') return null;

    return <LawyerDashboardMainView model={model} />;
}
