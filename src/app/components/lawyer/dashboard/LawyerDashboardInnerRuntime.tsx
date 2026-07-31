import React, { Suspense, useEffect, useState } from 'react';
import { useAuthSafe } from '@/app/context/AuthContext';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import {
    CriminalDashboardBridgeProvider,
} from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { LawyerSettingsProvider } from '@/app/context/LawyerSettingsContext';
import { QuantumTasksProvider } from '@/app/context/QuantumTasksProvider';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { usePendingFieldTasksCountMetric, useQuantumTasksFingerprint } from '@/app/hooks/useQuantumTasksContext';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

export type LawyerDashboardInnerRuntimeProps = LawyerDashboardShellProps;

/** يبدأ مع تقييم Runtime — يطوي انتظار MainView بعد mark */
const lawyerDashboardMainViewPromise = import('./LawyerDashboardMainView').then((m) => ({
    default: m.LawyerDashboardMainView as unknown as LazyComponent,
}));

const LazyLawyerDashboardMainView = lazyWithRetry(() => lawyerDashboardMainViewPromise);

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

    return (
        <Suspense
            fallback={
                <div
                    className="min-h-screen w-full bg-[#0a0f1c]"
                    data-testid="lawyer-main-view-suspense"
                    aria-busy
                    aria-label="جاري فتح اللوحة"
                />
            }
        >
            <LazyLawyerDashboardMainView model={model} />
        </Suspense>
    );
}
