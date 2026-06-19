import React, { Suspense } from 'react';
import type { User } from '@supabase/supabase-js';
import { SafeView } from '@/app/components/shared/SafeView';
import { DashboardPatternOverlay } from '@/app/components/lawyer/DashboardPatternOverlay';
import { DashboardWallpaperLayer } from '@/app/components/lawyer/DashboardWallpaperLayer';
import { AppLockOverlay } from '@/app/components/lawyer/AppLockOverlay';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';
import type { AppearanceSettings } from '@/app/services/settings/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardBackgroundServices = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardBackgroundServices.tsx').then((m) => ({
        default: m.default as unknown as LazyComponent,
    })),
);

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
    unlockWithBiometric: () => void | Promise<void>;
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
    return (
        <SafeView
            data-hami-lawyer-dashboard=""
            className="min-h-screen w-full text-right pb-10 relative overflow-x-hidden font-sans transition-colors duration-500"
            style={dashboardSurfaceStyle}
            statusBarColor={statusBarColor}
        >
            <DashboardWallpaperLayer src={wallpaperSrc} enabled={hasWallpaper} />
            <DashboardPatternOverlay appearance={appearance} enabled={!hasWallpaper} />
            <div className="relative z-[1] min-h-screen">
                {backgroundRuntimeEnabled && calendarUserId ? (
                    <Suspense fallback={null}>
                        <LazyLawyerDashboardBackgroundServices
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
                            onNotesSynced={onNotesSynced}
                            onLawsuitFilesSynced={onLawsuitFilesSynced}
                            mergeNotesStores={mergeNotesStores}
                            syncExecutionFilesNowRef={syncExecutionFilesNowRef}
                            syncLawsuitFilesNowRef={syncLawsuitFilesNowRef}
                            syncNotesNowRef={syncNotesNowRef}
                            refreshAppAlertsRef={refreshAppAlertsRef}
                        />
                    </Suspense>
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
                {children}
            </div>
        </SafeView>
    );
}
