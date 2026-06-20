import type { ComponentProps, CSSProperties, MutableRefObject, ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import type { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import type { GlobalNote, ExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { AppearanceSettings } from '@/app/services/settings/types';
import type { LegalTask } from '@/app/types/TaskEngine';
import type { SecretaryAlert } from '@/app/services/SecretaryOrchestrator';

export type LawyerDashboardShellPropsWithoutChildren = Omit<
    ComponentProps<typeof LawyerDashboardShell>,
    'children'
>;

export type BuildLawyerDashboardShellPropsParams = {
    dashboardSurfaceStyle: CSSProperties;
    statusBarColor: string;
    wallpaperSrc: string | null;
    hasWallpaper: boolean;
    appearance: AppearanceSettings;
    backgroundRuntimeEnabled: boolean;
    user: User;
    calendarUserId: string;
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
    syncExecutionFilesNowRef: MutableRefObject<() => void>;
    syncLawsuitFilesNowRef: MutableRefObject<() => void>;
    syncNotesNowRef: MutableRefObject<() => void>;
    refreshAppAlertsRef: MutableRefObject<() => void>;
    appLocked: boolean;
    appUnlocking: boolean;
    requiresBiometricToUnlock: boolean;
    unlockWithBiometric: () => Promise<boolean>;
    unlockContinue: () => void;
    onLogout: () => void;
};

export function buildLawyerDashboardShellProps(
    params: BuildLawyerDashboardShellPropsParams,
): LawyerDashboardShellPropsWithoutChildren {
    return {
        dashboardSurfaceStyle: params.dashboardSurfaceStyle,
        statusBarColor: params.statusBarColor,
        wallpaperSrc: params.wallpaperSrc,
        hasWallpaper: params.hasWallpaper,
        appearance: params.appearance,
        backgroundRuntimeEnabled: params.backgroundRuntimeEnabled,
        user: params.user,
        calendarUserId: params.calendarUserId,
        syncNotesOn: params.syncNotesOn,
        syncFilesOn: params.syncFilesOn,
        syncExecutionOn: params.syncExecutionOn,
        pushAllowed: params.pushAllowed,
        files: params.files,
        executionFiles: params.executionFiles,
        criminalCasesForCluster: params.criminalCasesForCluster,
        globalNotes: params.globalNotes,
        fieldTasks: params.fieldTasks,
        onAlerts: params.onAlerts,
        onNotesSynced: params.onNotesSynced,
        onLawsuitFilesSynced: params.onLawsuitFilesSynced,
        mergeNotesStores: params.mergeNotesStores,
        syncExecutionFilesNowRef: params.syncExecutionFilesNowRef,
        syncLawsuitFilesNowRef: params.syncLawsuitFilesNowRef,
        syncNotesNowRef: params.syncNotesNowRef,
        refreshAppAlertsRef: params.refreshAppAlertsRef,
        appLocked: params.appLocked,
        appUnlocking: params.appUnlocking,
        requiresBiometricToUnlock: params.requiresBiometricToUnlock,
        unlockWithBiometric: params.unlockWithBiometric,
        unlockContinue: params.unlockContinue,
        onLogout: params.onLogout,
    };
}
