import type { ComponentProps, CSSProperties } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { createNavigationStubs } from '@/app/components/lawyer/dashboard/createNavigationStubs';
import { buildLawyerDashboardSurface } from '@/app/hooks/lawyerDashboard/lawyerDashboardSurfaceUtils';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import { createEmptyClusterScanSources } from '@/app/workspace/clusterScanSourcesLite';
import type { ThemeKey, ShapeKey } from '@/app/components/lawyer/LawyerShared';
import { requestLawyerDashboardHeaderIntent } from '@/app/hooks/lawyerDashboard/lawyerDashboardHeaderIntentBridge';
import { seedBootLaunchFrame1 } from '@/app/bootstrap/BootLaunchOrchestrator';

const noop = () => undefined;
const noopRef = { current: noop };

export type LawyerDashboardUltraMinimalHomeFirstPaintModel = {
    shellProps: Omit<LawyerDashboardShellProps, 'children'>;
    headerProps: ComponentProps<typeof Header>;
    homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab>;
};

/**
 * أول paint للوحة — يزرع الشارات من كاش محلي sync (لا أصفار وهمية تسبب CLS بعد الكشف).
 */
export function buildLawyerDashboardUltraMinimalHomeFirstPaintModel(opts: {
    user: User;
    authUserId?: string | null;
    theme: (typeof import('@/app/components/lawyer/LawyerShared').THEMES)[ThemeKey];
    shapeClass: (typeof import('@/app/components/lawyer/LawyerShared').SHAPES)[ShapeKey];
    appearance: LawyerDashboardShellProps['appearance'];
    pendingFieldTasksCount: number;
    backgroundRuntimeEnabled: boolean;
    onLogout: () => void;
}): LawyerDashboardUltraMinimalHomeFirstPaintModel {
    const frame1 = seedBootLaunchFrame1();
    const nav = createNavigationStubs();
    const { wallpaperSrc, hasWallpaper, dashboardSurfaceStyle } = buildLawyerDashboardSurface({
        appearance: opts.appearance,
        themeBg: opts.theme.bg,
    });
    const calendarUserId = resolveCalendarUserId(opts.authUserId ?? opts.user.id ?? null);
    const clusterScanSources = createEmptyClusterScanSources();

    const shellProps: Omit<LawyerDashboardShellProps, 'children'> = {
        dashboardSurfaceStyle: dashboardSurfaceStyle as CSSProperties,
        statusBarColor: opts.theme.bg,
        wallpaperSrc: wallpaperSrc ?? null,
        hasWallpaper,
        appearance: opts.appearance,
        backgroundRuntimeEnabled: opts.backgroundRuntimeEnabled,
        user: opts.user,
        calendarUserId,
        syncNotesOn: false,
        syncFilesOn: false,
        syncExecutionOn: false,
        pushAllowed: false,
        files: [],
        executionFiles: [],
        criminalCasesForCluster: [],
        globalNotes: [],
        fieldTasks: [],
        onAlerts: noop,
        onNotesSynced: noop,
        onLawsuitFilesSynced: noop,
        mergeNotesStores: noop,
        syncExecutionFilesNowRef: noopRef,
        syncLawsuitFilesNowRef: noopRef,
        syncNotesNowRef: noopRef,
        refreshAppAlertsRef: noopRef,
        appLocked: false,
        appUnlocking: false,
        requiresBiometricToUnlock: false,
        unlockWithBiometric: async () => false,
        unlockContinue: noop,
        onLogout: opts.onLogout,
    };

    const headerProps: ComponentProps<typeof Header> = {
        shouldShow: true,
        unreadCount: frame1.unreadCount,
        onSearchClick: () => requestLawyerDashboardHeaderIntent('search'),
        onNotificationsClick: () => requestLawyerDashboardHeaderIntent('notifications'),
        onSettingsClick: () => requestLawyerDashboardHeaderIntent('settings'),
    };

    const homeTabProps: ComponentProps<typeof LawyerDashboardHomeTab> = {
        visible: true,
        calendarUserId,
        clusterScanSources,
        secretaryAlerts: frame1.secretaryAlerts,
        alertsLoading: false,
        alertsError: null,
        onNavigateRoute: nav.navigateWorkspaceRoute,
        onOpenEntity: nav.openSecretaryAlert,
        onDismissAlert: noop,
        onAlertResolved: noop,
        onOpenCommunity: noop,
        onOpenProfile: () => requestLawyerDashboardHeaderIntent('profile'),
        onPrimeProfile: noop,
        onPrimeProfilePress: noop,
        userMetadata: opts.user.user_metadata as Record<string, unknown> | undefined,
        theme: opts.theme,
        onOpenArchive: noop,
        userId: opts.user.id ?? '',
        shellAuthUserId: calendarUserId,
        onOpenCalendar: noop,
        onOpenFieldTasksSheet: noop,
        pendingFieldTasksCount:
            opts.pendingFieldTasksCount > 0
                ? opts.pendingFieldTasksCount
                : frame1.pendingFieldTasksCount,
        onOpenFullNotepad: noop,
        onOpenVault: noop,
        onAddNote: noop,
    };

    return { shellProps, headerProps, homeTabProps };
}
