import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardBackgroundServices = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx').then((m) => ({
        default: m.default as unknown as LazyComponent,
    })),
);
import type { User } from '@supabase/supabase-js';
import { SafeView } from '@/app/components/shared/SafeView';
import { DashboardWallpaperLayer } from '@/app/components/lawyer/DashboardWallpaperLayer';
import { mergeLawyerDashboardShellCanvasStyle } from '@/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { ExecutionFile } from '@/app/types/execution';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AppearanceSettings } from '@/app/services/settings/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { LawyerDashboardBackgroundServicesProps } from '@/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices';
import { AppLockOverlay } from '@/app/components/lawyer/AppLockOverlay';
import { inertProps } from '@/app/utils/inertProps';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';

function DashboardBackgroundServices(props: LawyerDashboardBackgroundServicesProps) {
    return (
        <Suspense fallback={null}>
            <LazyLawyerDashboardBackgroundServices {...props} />
        </Suspense>
    );
}

export type LawyerDashboardShellProps = {
    dashboardSurfaceStyle: React.CSSProperties;
    statusBarColor: string;
    wallpaperSrc: string | null;
    hasWallpaper: boolean;
    appearance: AppearanceSettings;
    backgroundRuntimeEnabled: boolean;
    user: User;
    calendarUserId: string | null;
    syncNotesOn: boolean;
    syncFilesOn: boolean;
    syncExecutionOn: boolean;
    pushAllowed: boolean;
    files: FileData[];
    executionFiles: ExecutionFile[];
    criminalCasesForCluster: unknown[];
    globalNotes: GlobalNote[];
    fieldTasks: LegalTask[];
    onAlerts: (payload: {
        alerts: SecretaryAlert[];
        loading: boolean;
        error: string | null;
        refresh: () => void;
    }) => void;
    onNotesSynced: (merged: GlobalNote[]) => void;
    onLawsuitFilesSynced: (merged: FileData[]) => void;
    mergeNotesStores: (merged: GlobalNote[]) => void;
    syncExecutionFilesNowRef: React.MutableRefObject<() => void>;
    syncLawsuitFilesNowRef: React.MutableRefObject<() => void>;
    syncNotesNowRef: React.MutableRefObject<() => void>;
    refreshAppAlertsRef: React.MutableRefObject<() => void>;
    appLocked: boolean;
    appUnlocking: boolean;
    requiresBiometricToUnlock: boolean;
    unlockWithBiometric: () => Promise<boolean>;
    unlockContinue: () => void;
    onLogout: () => void;
    children: React.ReactNode;
};

export function LawyerDashboardShell({
    dashboardSurfaceStyle,
    statusBarColor,
    wallpaperSrc,
    hasWallpaper,
    appearance,
    backgroundRuntimeEnabled,
    user,
    calendarUserId,
    syncNotesOn,
    syncFilesOn,
    syncExecutionOn,
    pushAllowed,
    files,
    executionFiles,
    criminalCasesForCluster,
    globalNotes,
    fieldTasks,
    onAlerts,
    onNotesSynced,
    onLawsuitFilesSynced,
    mergeNotesStores,
    syncExecutionFilesNowRef,
    syncLawsuitFilesNowRef,
    syncNotesNowRef,
    refreshAppAlertsRef,
    appLocked,
    appUnlocking,
    requiresBiometricToUnlock,
    unlockWithBiometric,
    unlockContinue,
    onLogout,
    children,
}: LawyerDashboardShellProps) {
    const [backgroundServicesVisible, setBackgroundServicesVisible] = useState(false);

    useEffect(() => {
        if (!backgroundRuntimeEnabled || !calendarUserId || appLocked) {
            setBackgroundServicesVisible(false);
            return;
        }

        const isInitialHomeBoot =
            typeof document !== 'undefined' &&
            document.documentElement.dataset.hamiInitialBoot === '1';
        const isWarmSession =
            typeof document !== 'undefined' &&
            document.documentElement.dataset.hamiBootRevealed === '1';

        const cancelIdle = scheduleIdleWork(
            () => setBackgroundServicesVisible(true),
            {
                minDelayMs: isWarmSession
                    ? import.meta.env.DEV
                        ? 40
                        : 80
                    : isInitialHomeBoot
                      ? import.meta.env.DEV
                          ? 120
                          : 200
                      : import.meta.env.DEV
                        ? 200
                        : 400,
                timeoutMs: import.meta.env.DEV ? 4_000 : 12_000,
            },
        );

        return () => cancelIdle();
    }, [appLocked, backgroundRuntimeEnabled, calendarUserId]);

    const shellCanvasStyle = useMemo(
        () => mergeLawyerDashboardShellCanvasStyle(dashboardSurfaceStyle, appearance, false),
        [appearance, dashboardSurfaceStyle],
    );

    return (
        <SafeView
            data-testid="lawyer-dashboard-ready"
            data-hami-lawyer-dashboard=""
            data-hami-wallpaper={hasWallpaper ? '1' : '0'}
            className="min-h-screen w-full text-right pb-0 relative overflow-x-hidden font-sans"
            style={shellCanvasStyle}
            statusBarColor={statusBarColor}
        >
            <DashboardWallpaperLayer src={wallpaperSrc} enabled={hasWallpaper} />
            <div className="relative z-[1] min-h-screen">
                {backgroundServicesVisible && backgroundRuntimeEnabled && calendarUserId ? (
                    <DashboardBackgroundServices
                            user={user}
                            syncNotesOn={syncNotesOn}
                            syncFilesOn={syncFilesOn}
                            syncExecutionOn={syncExecutionOn}
                            pushAllowed={pushAllowed}
                            files={files}
                            executionFiles={executionFiles}
                            criminalCases={criminalCasesForCluster}
                            globalNotes={globalNotes}
                            fieldTasks={fieldTasks}
                            lawyerId={calendarUserId}
                            onAlerts={onAlerts}
                            onNotesSynced={onNotesSynced as LawyerDashboardBackgroundServicesProps['onNotesSynced']}
                            onLawsuitFilesSynced={onLawsuitFilesSynced}
                            mergeNotesStores={mergeNotesStores as LawyerDashboardBackgroundServicesProps['mergeNotesStores']}
                            syncExecutionFilesNowRef={syncExecutionFilesNowRef}
                            syncLawsuitFilesNowRef={syncLawsuitFilesNowRef}
                            syncNotesNowRef={syncNotesNowRef}
                            refreshAppAlertsRef={refreshAppAlertsRef}
                    />
                ) : null}
                {appLocked ? (
                    <AppLockOverlay
                        requiresBiometric={requiresBiometricToUnlock}
                        unlocking={appUnlocking}
                        onUnlockBiometric={unlockWithBiometric}
                        onUnlockContinue={unlockContinue}
                        onLogout={onLogout}
                    />
                ) : null}
                <div
                    className={appLocked ? 'pointer-events-none select-none' : undefined}
                    aria-hidden={appLocked || undefined}
                    {...inertProps(appLocked)}
                >
                    {children}
                </div>
            </div>
        </SafeView>
    );
}
