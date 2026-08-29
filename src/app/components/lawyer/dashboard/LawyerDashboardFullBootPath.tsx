import React, { useEffect, useState } from 'react';
import { useAuthSafe } from '@/app/context/authHooks';
import { useRuntimePhase } from '@/app/runtime/runtimePhase';
import { CriminalDashboardBridgeLazyProvider } from '@/app/components/lawyer/criminal-system/criminalDashboardBridgeLazy';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { primeQuantumTasksBootMetrics } from '@/app/utils/primeQuantumTasksBootMetrics';
import { usePendingFieldTasksCountMetric, useQuantumTasksFingerprint } from '@/app/hooks/useQuantumTasksContext';
import { useLawyerDashboardPreWorkspaceOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration';
import { LawyerDashboardWorkspaceProvider } from '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider';
import { LawyerDashboardBootShellGate } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { LawyerDashboardFullOrchestrationHost } from '@/app/components/lawyer/dashboard/LawyerDashboardFullOrchestrationHost';
import { LawyerDashboardSettingsOverlayPortal } from '@/app/components/lawyer/dashboard/LawyerDashboardSettingsOverlayPortal';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

primeQuantumTasksBootMetrics();

export type LawyerDashboardFullBootPathProps = LawyerDashboardShellProps & {
    backgroundRuntimeEnabled: boolean;
    onMainViewReady?: () => void;
    /** أثناء تراكب طبقة أخرى لا تُرسم بوابة دخول ثانية */
    suppressAuthGate?: boolean;
};

/**
 * preWorkspace + workspace + orchestration + MainView — بلا منزل وهمي.
 * إعدادات: BootProvider + Ensure عند الفتح. مهام: prime metrics هنا، Provider عند الستارة.
 * جسر الجزائي: LazyProvider يدفع القيمة بلا إعادة تركيب المنزل.
 */
export function LawyerDashboardFullBootPath({
    backgroundRuntimeEnabled,
    onMainViewReady,
    suppressAuthGate = false,
    ...shellProps
}: LawyerDashboardFullBootPathProps) {
    const { user: authUser } = useAuthSafe();

    return (
        <LawyerDashboardFullBootPathRuntime
            authUser={authUser}
            backgroundRuntimeEnabled={backgroundRuntimeEnabled}
            onMainViewReady={onMainViewReady}
            suppressAuthGate={suppressAuthGate}
            {...shellProps}
        />
    );
}

function LawyerDashboardFullBootPathRuntime({
    backgroundRuntimeEnabled,
    onMainViewReady,
    suppressAuthGate = false,
    authUser,
    ...shellProps
}: LawyerDashboardFullBootPathProps & {
    authUser: ReturnType<typeof useAuthSafe>['user'];
}) {
    const runtimePhase = useRuntimePhase();
    const backgroundRuntime = runtimePhase !== 'boot' && backgroundRuntimeEnabled;
    const pendingFieldTasksCount = usePendingFieldTasksCountMetric();
    const quantumTasksFingerprint = useQuantumTasksFingerprint();
    const bridgeLawyerId = resolveCalendarUserId(authUser?.id ?? null);
    const [bridgeLive, setBridgeLive] = useState(false);
    useEffect(() => {
        setBridgeLive(true);
    }, []);

    return (
        <CriminalDashboardBridgeLazyProvider
            enabled={backgroundRuntime && bridgeLive}
            lawyerId={bridgeLawyerId}
        >
            <LawyerDashboardFullBootPathBody
                authUser={authUser}
                pendingFieldTasksCount={pendingFieldTasksCount}
                quantumTasksFingerprint={quantumTasksFingerprint}
                backgroundRuntimeEnabled={backgroundRuntime}
                onMainViewReady={onMainViewReady}
                suppressAuthGate={suppressAuthGate}
                {...shellProps}
            />
        </CriminalDashboardBridgeLazyProvider>
    );
}

function LawyerDashboardFullBootPathBody({
    backgroundRuntimeEnabled,
    onMainViewReady,
    suppressAuthGate = false,
    authUser,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
    ...shellProps
}: LawyerDashboardFullBootPathProps & {
    authUser: ReturnType<typeof useAuthSafe>['user'];
    pendingFieldTasksCount: number;
    quantumTasksFingerprint: string;
}) {
    const preWorkspace = useLawyerDashboardPreWorkspaceOrchestration({
        authUser,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
        backgroundRuntimeEnabled,
    });

    if (preWorkspace.authGate) {
        if (suppressAuthGate) return null;
        return <>{preWorkspace.authGate}</>;
    }

    if (!preWorkspace.user) {
        return <LawyerDashboardBootShellGate />;
    }

    const handleMainViewReady = () => {
        onMainViewReady?.();
    };

    const settingsFeature = preWorkspace.settingsFeature;

    return (
        <LawyerDashboardWorkspaceProvider
            enabled={backgroundRuntimeEnabled}
            localAutoSave={preWorkspace.localAutoSave}
            backgroundRuntimeEnabled={backgroundRuntimeEnabled}
            archiveType={preWorkspace.archiveAndSync.archiveType}
            setArchiveType={preWorkspace.archiveAndSync.setArchiveType}
            {...preWorkspace.workspaceProviderParams}
        >
            <div className="relative min-h-screen" data-hami-full-boot-paint-stack="">
                <div data-hami-main-view-layer="">
                    <LawyerDashboardFullOrchestrationHost
                        {...shellProps}
                        authUser={authUser}
                        pendingFieldTasksCount={pendingFieldTasksCount}
                        quantumTasksFingerprint={quantumTasksFingerprint}
                        backgroundRuntimeEnabled={backgroundRuntimeEnabled}
                        preWorkspace={preWorkspace}
                        onMainViewReady={handleMainViewReady}
                    />
                </div>
                <LawyerDashboardSettingsOverlayPortal
                    settingsFeature={settingsFeature}
                    userId={preWorkspace.user?.id ?? ''}
                    authUserId={preWorkspace.authUser?.id}
                    onLogout={shellProps.onLogout}
                />
            </div>
        </LawyerDashboardWorkspaceProvider>
    );
}
