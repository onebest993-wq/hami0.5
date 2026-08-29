import React, { Suspense, useEffect, useLayoutEffect, useRef } from 'react';
import { LawyerDashboardMainView } from '@/app/components/lawyer/dashboard/LawyerDashboardMainView';
import { useLawyerDashboardCoreOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCoreOrchestration';
import type { LawyerDashboardPreWorkspaceOrchestration } from '@/app/hooks/lawyerDashboard/useLawyerDashboardPreWorkspaceOrchestration';
import { useLawyerDashboardCore } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { registerLawyerDashboardHeaderIntentHandler } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderIntentBridge';
import { requestHomeHubEntryOpen } from '@/app/services/alerts/homeHubEntryOpen';
import { useAfterFirstTabOpen } from '@/app/hooks/lawyerDashboard/useAfterFirstTabOpen';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';
import type { User } from '@supabase/supabase-js';

const LazySettingsProfileRuntime = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardSettingsProfileRuntime').then((m) => ({
        default: m.LawyerDashboardSettingsProfileRuntime as unknown as LazyComponent,
    })),
);

export type LawyerDashboardFullOrchestrationHostProps = LawyerDashboardShellProps & {
    authUser: User | null | undefined;
    pendingFieldTasksCount: number;
    quantumTasksFingerprint: string;
    backgroundRuntimeEnabled: boolean;
    preWorkspace: LawyerDashboardPreWorkspaceOrchestration;
    onMainViewReady: () => void;
};

/**
 * orchestration + MainView — مع FullBoot في مقطع واحد حتى يظهر المنزل دفعة واحدة.
 */
export function LawyerDashboardFullOrchestrationHost({
    authUser,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
    backgroundRuntimeEnabled,
    preWorkspace,
    onMainViewReady,
    ...shellProps
}: LawyerDashboardFullOrchestrationHostProps) {
    const afterFirstTabOpen = useAfterFirstTabOpen();
    const settingsProfileLive = afterFirstTabOpen || preWorkspace.bootChromeForceArm;

    const orchestration = useLawyerDashboardCoreOrchestration(preWorkspace, {
        onNavigateToCase: shellProps.onNavigateToCase,
        pendingFieldTasksCount,
    });
    const model = useLawyerDashboardCore({
        ...shellProps,
        authUser,
        pendingFieldTasksCount,
        quantumTasksFingerprint,
        backgroundRuntimeEnabled,
        orchestration,
    });
    const onReadyRef = useRef(onMainViewReady);
    onReadyRef.current = onMainViewReady;
    const readyNotifiedRef = useRef(false);

    useLayoutEffect(() => {
        if (model.status !== 'ready' || readyNotifiedRef.current) return;
        readyNotifiedRef.current = true;
        onReadyRef.current();
    }, [model]);

    useEffect(() => {
        if (model.status !== 'ready') {
            readyNotifiedRef.current = false;
            return;
        }
        return registerLawyerDashboardHeaderIntentHandler((intent) => {
            switch (intent) {
                case 'notifications':
                    orchestration.notifications.openNotifications();
                    break;
                case 'search':
                    orchestration.overlays.openGlobalSearch();
                    break;
                case 'settings':
                    orchestration.dashboardSettings.openSettings();
                    break;
                case 'profile':
                    orchestration.profileTab.openProfileTab();
                    break;
                case 'alerts':
                    requestHomeHubEntryOpen();
                    break;
                default:
                    break;
            }
        });
    }, [model.status, orchestration]);

    if (model.status === 'gate') return <>{model.node}</>;
    if (model.status === 'empty') return null;
    if (model.status !== 'ready') return null;

    return (
        <>
            {settingsProfileLive ? (
                <Suspense fallback={null}>
                    <LazySettingsProfileRuntime
                        shellAuthUserId={preWorkspace.shellAuthUserId}
                        activeTab={preWorkspace.overlays.activeTab}
                        setActiveTab={preWorkspace.overlays.setActiveTab}
                        setShowCommunity={preWorkspace.communityFeature.setShowCommunity}
                        onReady={preWorkspace.onSettingsProfileReady}
                    />
                </Suspense>
            ) : null}
            <LawyerDashboardMainView model={model} />
        </>
    );
}
