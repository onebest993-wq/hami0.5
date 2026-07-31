import { describe, expect, it } from 'vitest';
import { dashboardHeaderOverlayFingerprint, dashboardShellFingerprint } from '@/app/hooks/lawyerDashboard/dashboardViewFingerprint';
import { patchLawyerDashboardHeaderOverlayOpen } from '@/app/hooks/lawyerDashboard/patchLawyerDashboardHeaderOverlayOpen';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';

function baseReadyView(
    overrides: Partial<Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>> = {},
): Extract<LawyerDashboardCoreViewModel, { status: 'ready' }> {
    return {
        status: 'ready',
        shellProps: {} as never,
        notificationPanel: {
            isOpen: false,
            panelSessionKey: 0,
            userId: 'lawyer-1',
            onClose: () => undefined,
            onNavigate: (() => undefined) as never,
            onOpenPanel: () => undefined,
        },
        headerProps: {
            shouldShow: true,
            unreadCount: 0,
            onProfileClick: () => undefined,
            onSearchClick: () => undefined,
            onNotificationsClick: () => undefined,
            onSettingsClick: () => undefined,
        },
        homeTabProps: { visible: true, active: true } as never,
        scheduleTabProps: { visible: false, active: false } as never,
        profileTab: { visible: false, sessionKey: 0, onBack: () => undefined },
        tabStackHidden: false,
        scheduleHostMounted: false,
        profileHostMounted: false,
        overlaysBundle: {
            overlays: { showSettings: false, showGlobalSearch: false },
        } as never,
        postInteractiveRuntimeProps: {} as never,
        deferredFeatureSurfacesProps: {} as never,
        ...overrides,
    };
}

describe('dashboardShellFingerprint', () => {
    it('لا يتغيّر عند فتح الإعدادات فقط', () => {
        const base = {
            user: { id: 'u1' },
            theme: { primary: '#E6C673', bg: '#0A0F1C' },
            shapeClass: 'rounded',
            appLock: { locked: false },
            pendingFieldTasksCount: 0,
            overlays: {
                activeTab: 'home',
                homeLayoutEditMode: false,
                showCommunity: false,
                showLawsuitsWorkspace: false,
                lawsuitsWorkspaceTab: 'civil',
                lawsuitsDossierSection: 'all',
                showTransactions: false,
                showGlobalSearch: false,
                showDocs: false,
                fieldTasksSheetOpen: false,
                showTasksManager: false,
                isCriminalDossierOpen: false,
                isNotepadOpen: false,
            },
            workspace: {
                files: [],
                executionFiles: [],
                globalNotes: [],
                activeFile: null,
                isNewCaseModalOpen: false,
                isExecutionModalOpen: false,
            },
            appAlerts: { visibleAppAlerts: [], appAlertsLoading: false, appAlertsError: null },
            notifications: { notificationsUnreadCount: 0, showNotifications: false },
            archiveAndSync: { archiveType: null },
            dashboardSettings: { showSettings: false },
            settings: {
                appearance: { theme: 'dark', backgroundPreset: 'none', wallpaperStamp: 0 },
                performance: { litePerformance: 'auto' },
            },
            clusterScanSources: null,
        } as never;

        const closed = dashboardShellFingerprint(base);
        const open = dashboardShellFingerprint({
            ...base,
            dashboardSettings: { showSettings: true },
            notifications: { notificationsUnreadCount: 0, showNotifications: true },
            overlays: { ...base.overlays, showGlobalSearch: true },
        });
        expect(open).toBe(closed);
    });
});

describe('dashboardHeaderOverlayFingerprint', () => {
    it('يتغيّر عند فتح overlay الهيدر', () => {
        const base = {
            dashboardSettings: { showSettings: false },
            overlays: { showGlobalSearch: false },
            notifications: { showNotifications: false },
        } as never;
        const open = {
            dashboardSettings: { showSettings: true },
            overlays: { showGlobalSearch: true },
            notifications: { showNotifications: true },
        } as never;
        expect(dashboardHeaderOverlayFingerprint(open)).not.toBe(dashboardHeaderOverlayFingerprint(base));
    });
});

describe('patchLawyerDashboardHeaderOverlayOpen', () => {
    it('يبقي الهيدر ظاهراً مع الإعدادات بلا إعادة بناء كاملة', () => {
        const view = baseReadyView();
        const patched = patchLawyerDashboardHeaderOverlayOpen(view, {
            showSettings: true,
            showGlobalSearch: false,
            showNotifications: false,
            notificationsUnreadCount: 0,
            activeTab: 'home',
            tabStackMask: {
                isCriminalDossierOpen: false,
                archiveType: null,
                showLawsuitsWorkspace: false,
                showTransactions: false,
                isNotepadOpen: false,
                showSettings: true,
                showCommunity: false,
                activeFile: null,
                showDocs: false,
            },
            headerVisibility: {
                showSettings: true,
                isNewCaseModalOpen: false,
                isNotepadOpen: false,
                showCommunity: false,
                activeTab: 'home',
                activeFile: null,
                archiveType: null,
                showLawsuitsWorkspace: false,
                showTransactions: false,
                showTasksManager: false,
                showDocs: false,
                isCriminalDossierOpen: false,
            },
        });

        expect(patched.headerProps.shouldShow).toBe(true);
        expect(patched.overlaysBundle.overlays.showSettings).toBe(true);
        expect(patched.tabStackHidden).toBe(false);
        expect(patched.homeTabProps.active).toBe(true);
        expect(patched).not.toBe(view);
    });

    it('يحافظ على overlaysBundle عندما تتغير الإشعارات فقط', () => {
        const view = baseReadyView();
        const patched = patchLawyerDashboardHeaderOverlayOpen(view, {
            showSettings: false,
            showGlobalSearch: false,
            showNotifications: true,
            notificationsUnreadCount: 3,
            activeTab: 'home',
            tabStackMask: {
                isCriminalDossierOpen: false,
                archiveType: null,
                showLawsuitsWorkspace: false,
                showTransactions: false,
                isNotepadOpen: false,
                showSettings: false,
                showCommunity: false,
                activeFile: null,
                showDocs: false,
            },
            headerVisibility: {
                showSettings: false,
                isNewCaseModalOpen: false,
                isNotepadOpen: false,
                showCommunity: false,
                activeTab: 'home',
                activeFile: null,
                archiveType: null,
                showLawsuitsWorkspace: false,
                showTransactions: false,
                showTasksManager: false,
                showDocs: false,
                isCriminalDossierOpen: false,
            },
        });

        expect(patched.notificationPanel.isOpen).toBe(true);
        expect(patched.headerProps.unreadCount).toBe(3);
        expect(patched.overlaysBundle).toBe(view.overlaysBundle);
    });
});
