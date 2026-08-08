import React, { useEffect, useState } from 'react';
import { useAuthSafe } from '@/app/context/AuthContext';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { QuantumTasksProvider } from '@/app/context/QuantumTasksProvider';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { LawyerDashboardMainView } from './LawyerDashboardMainView';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { usePendingFieldTasksCountMetric, useQuantumTasksFingerprint } from '@/app/hooks/useQuantumTasksContext';

export type LawyerDashboardInnerRuntimeProps = LawyerDashboardShellProps;

/**
 * Runtime اللوحة بعد interactive mark —
 * LawyerSettings + QuantumTasks + Bridge + orchestration + MainView.
 */
export function LawyerDashboardInnerRuntime(props: LawyerDashboardInnerRuntimeProps) {
    return (
        <LawyerSettingsProvider>
            <QuantumTasksProvider>
                <LawyerDashboardInnerRuntimeBody {...props} />
            </QuantumTasksProvider>
        </LawyerSettingsProvider>
    );
}

function LawyerDashboardInnerRuntimeBody(props: LawyerDashboardInnerRuntimeProps) {
    const runtimePhase = useRuntimePhase();
    const backgroundRuntimeEnabled = runtimePhase !== 'boot';
    const { user: authUser } = useAuthSafe();
    const bridgeLawyerId = resolveCalendarUserId(authUser?.id ?? null);
    /** إطار أول للوحة بـ STUB — تحميل الجسر الجنائي لا ينافس أول paint للمنزل. */
    const [bridgeLive, setBridgeLive] = useState(false);
    useEffect(() => {
        setBridgeLive(true);
    }, []);

    return (
        <CriminalDashboardBridgeProvider
            enabled={backgroundRuntimeEnabled && bridgeLive}
            lawyerId={bridgeLawyerId}
        >
            <LawyerDashboardCore
                {...props}
                authUser={authUser}
                backgroundRuntimeEnabled={backgroundRuntimeEnabled}
            />
        </CriminalDashboardBridgeProvider>
    );
}

function LawyerDashboardCore({
    authUser,
    backgroundRuntimeEnabled,
    ...shellProps
}: LawyerDashboardInnerRuntimeProps & {
    authUser: ReturnType<typeof useAuthSafe>['user'];
    backgroundRuntimeEnabled: boolean;
}) {
    const pendingFieldTasksCount = usePendingFieldTasksCountMetric();
    const quantumTasksFingerprint = useQuantumTasksFingerprint();
    const model = useLawyerDashboardCore({
        ...shellProps,
        authUser,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
        backgroundRuntimeEnabled,
    });

    if (model.status === 'gate') return <>{model.node}</>;
    if (model.status === 'empty') return null;

    return <LawyerDashboardMainView model={model} />;
}
