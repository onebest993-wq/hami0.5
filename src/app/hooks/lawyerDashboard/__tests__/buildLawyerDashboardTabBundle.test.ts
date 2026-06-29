import { describe, expect, it, vi, beforeEach } from 'vitest';
import { buildLawyerDashboardTabBundle } from '@/app/hooks/lawyerDashboard/buildLawyerDashboardTabBundle';

vi.mock('@/app/runtime/hubArchiveLoader', () => ({
    loadLawsuitArchiveHubModule: vi.fn(() => Promise.resolve([])),
    loadExecutionArchiveHubModule: vi.fn(() => Promise.resolve({})),
}));

function minimalTabBundleParams(
    overrides: Partial<Parameters<typeof buildLawyerDashboardTabBundle>[0]> = {},
) {
    return {
        user: { id: 'lawyer-1' },
        calendarUserId: 'lawyer-1',
        clusterScanSources: { ready: true, urgentCases: [], threadingTransactions: [] },
        calendarSearchFocus: null,
        onClearCalendarSearchFocus: vi.fn(),
        activeTab: 'home' as const,
        activeFile: null,
        archiveType: null,
        isCriminalDossierOpen: false,
        showSettings: false,
        homeLayoutEditMode: false,
        enterHomeLayoutEdit: vi.fn(),
        exitHomeLayoutEdit: vi.fn(),
        homeTabSessionKey: 1,
        homeHubCardSessionKey: 1,
        homeDockChromeSessionKey: 1,
        isNewCaseModalOpen: false,
        isNotepadOpen: false,
        showCommunity: false,
        showLawsuitsWorkspace: false,
        lawsuitsWorkspaceTab: 'civil' as const,
        showTransactions: false,
        showTasksManager: false,
        fieldTasksSheetOpen: false,
        showDocs: false,
        showGlobalSearch: false,
        showNotifications: false,
        notificationsUnreadCount: 0,
        pendingFieldTasksCount: 0,
        visibleAppAlerts: [],
        appAlertsLoading: false,
        appAlertsError: null,
        theme: { primary: '#E6C673', secondary: '#B8943F', bg: '#0A0F1C' },
        shapeClass: 'rounded-2xl',
        files: [],
        executionFiles: [],
        setActiveTab: vi.fn(),
        openProfileTab: vi.fn(),
        primeProfileTabMount: vi.fn(),
        primeSettingsShellMount: vi.fn(),
        openSettings: vi.fn(),
        openGlobalSearch: vi.fn(),
        primeGlobalSearchShellMount: vi.fn(),
        openNotifications: vi.fn(),
        primeNotificationPanelMount: vi.fn(),
        navigateWorkspaceRoute: vi.fn(),
        openSecretaryAlert: vi.fn(),
        dismissAppAlert: vi.fn(),
        handleAlertResolved: vi.fn(),
        setArchiveType: vi.fn(),
        openNormalNewCaseModal: vi.fn(),
        openCommunityTab: vi.fn(),
        setLawsuitsDossierSection: vi.fn(),
        setLawsuitsWorkspaceTab: vi.fn(),
        setShowLawsuitsWorkspace: vi.fn(),
        closeTransactionsHub: vi.fn(),
        openTransactionsHub: vi.fn(),
        primeTransactionsHubMount: vi.fn(),
        openFieldTasksSheet: vi.fn(),
        primeFieldTasksShellMount: vi.fn(),
        openScheduleTab: vi.fn(),
        primeScheduleTabMount: vi.fn(),
        scheduleTabSessionKey: 0,
        backToHomeFromSchedule: vi.fn(),
        openVaultModal: vi.fn(),
        primeVaultShellMount: vi.fn(),
        openNotepad: vi.fn(),
        closeNotepad: vi.fn(),
        primeNotepadShellMount: vi.fn(),
        handleSaveNote: vi.fn(),
        setActiveFile: vi.fn(),
        openCriminalCase: vi.fn(),
        openUrgentInLawsuitsWorkspace: vi.fn(),
        setTransactionsFocusId: vi.fn(),
        closeHubShellOverlays: vi.fn(),
        ...overrides,
    };
}

describe('buildLawyerDashboardTabBundle onOpenArchive', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('يفتح التنفيذ دون رمي خطأ ويغلق المعاملات/الدعاوى', () => {
        const setArchiveType = vi.fn();
        const setShowLawsuitsWorkspace = vi.fn();
        const closeTransactionsHub = vi.fn();
        const closeNotepad = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                setArchiveType,
                setShowLawsuitsWorkspace,
                closeTransactionsHub,
                closeNotepad,
            }),
        );

        expect(() => homeTabProps.onOpenArchive('execution')).not.toThrow();

        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(setShowLawsuitsWorkspace).toHaveBeenCalledWith(false);
        expect(closeTransactionsHub).toHaveBeenCalledTimes(1);
        expect(setArchiveType).toHaveBeenCalledWith('execution');
    });

    it('يفتح الدعاوى فوراً مع prefetch للـ hub module', () => {
        const setShowLawsuitsWorkspace = vi.fn();
        const setArchiveType = vi.fn();
        const setLawsuitsDossierSection = vi.fn();
        const setLawsuitsWorkspaceTab = vi.fn();
        const closeHubShellOverlays = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                setShowLawsuitsWorkspace,
                setArchiveType,
                setLawsuitsDossierSection,
                setLawsuitsWorkspaceTab,
                closeHubShellOverlays,
            }),
        );

        homeTabProps.onOpenArchive('lawsuit');

        expect(setArchiveType).toHaveBeenCalledWith(null);
        expect(setLawsuitsDossierSection).toHaveBeenCalledWith('all');
        expect(setLawsuitsWorkspaceTab).toHaveBeenCalledWith('civil');
        expect(setShowLawsuitsWorkspace).toHaveBeenCalledWith(true);
        expect(closeHubShellOverlays).not.toHaveBeenCalled();
    });

    it('يفتح المعاملات ويغلق overlays المعاملات', () => {
        const openTransactionsHub = vi.fn();
        const closeNotepad = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                openTransactionsHub,
                closeNotepad,
            }),
        );

        expect(() => homeTabProps.onOpenArchive('transaction')).not.toThrow();
        expect(closeNotepad).toHaveBeenCalledTimes(1);
        expect(openTransactionsHub).toHaveBeenCalledTimes(1);
    });

    it('يخفي الهيدر عند فتح مركز المعاملات', () => {
        const { headerProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({ showTransactions: true }),
        );
        expect(headerProps.shouldShow).toBe(false);
    });

    it('يبقي الهيدر ظاهراً عند فتح الإشعارات', () => {
        const { headerProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({ showNotifications: true }),
        );
        expect(headerProps.shouldShow).toBe(true);
    });

    it('يبقي الهيدر ظاهراً عند فتح البحث الشامل', () => {
        const { headerProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({ showGlobalSearch: true }),
        );
        expect(headerProps.shouldShow).toBe(true);
    });

    it('يوصّل prefetch الإعدادات عند pointer enter', () => {
        const primeSettingsShellMount = vi.fn();
        const { headerProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({ primeSettingsShellMount }),
        );

        headerProps.onSettingsPointerEnter?.();

        expect(primeSettingsShellMount).toHaveBeenCalledTimes(1);
    });

    it('يفتح المفكرة الكاملة ويضبط وضع القائمة', () => {
        const openNotepad = vi.fn();
        const primeNotepadShellMount = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                openNotepad,
                primeNotepadShellMount,
            }),
        );

        homeTabProps.onOpenFullNotepad();

        expect(primeNotepadShellMount).toHaveBeenCalledTimes(1);
        expect(openNotepad).toHaveBeenCalledWith({ mode: 'list' });
    });

    it('يفتح ستارة الميدان مع prime mount', () => {
        const openFieldTasksSheet = vi.fn();
        const primeFieldTasksShellMount = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                openFieldTasksSheet,
                primeFieldTasksShellMount,
            }),
        );

        homeTabProps.onOpenFieldTasksSheet();

        expect(primeFieldTasksShellMount).toHaveBeenCalledTimes(1);
        expect(openFieldTasksSheet).toHaveBeenCalledTimes(1);
    });

    it('يفتح التقويم مع prime mount', () => {
        const openScheduleTab = vi.fn();
        const primeScheduleTabMount = vi.fn();

        const { homeTabProps } = buildLawyerDashboardTabBundle(
            minimalTabBundleParams({
                openScheduleTab,
                primeScheduleTabMount,
            }),
        );

        homeTabProps.onOpenCalendar();

        expect(primeScheduleTabMount).toHaveBeenCalledTimes(1);
        expect(openScheduleTab).toHaveBeenCalledTimes(1);
    });
});
