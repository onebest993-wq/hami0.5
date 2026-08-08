import { useCallback, useMemo, useRef, useState } from 'react';
import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';
import { useLawyerDashboardAppAlerts } from '@/app/hooks/useLawyerDashboardAppAlerts';
import { useLawyerDashboardNavigation } from '@/app/hooks/useLawyerDashboardNavigation';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';
import { useLawyerDashboardWorkspace } from '@/app/hooks/lawyerDashboard/useLawyerDashboardWorkspace';
import { useLawyerDashboardNotifications } from '@/app/hooks/lawyerDashboard/useLawyerDashboardNotifications';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';
import { useLawyerDashboardCalendarClusterLite } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCalendarClusterLite';
import { useVaultDocsForClusterScan } from '@/app/workspace/useVaultDocsForClusterScan';
import { useCalendarEventsForClusterScan } from '@/app/workspace/useCalendarEventsForClusterScan';
import { useLawyerDashboardArchiveAndSyncRefs } from '@/app/hooks/lawyerDashboard/useLawyerDashboardArchiveAndSyncRefs';
import { useLawyerDashboardSettings } from '@/app/hooks/lawyerDashboard/useLawyerDashboardSettings';
import { useLawyerDashboardCommunity } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCommunity';
import { useLawyerDashboardScheduleTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardScheduleTab';
import { useLawyerDashboardRepository } from '@/app/hooks/lawyerDashboard/useLawyerDashboardRepository';
import { useAuthSafe } from '@/app/context/AuthContext';
import { useCaseStore } from '@/app/stores/caseStore';
import { useThemeStyles } from '@/app/components/lawyer/lawyerThemeStyles';
import { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsData,
    useLawyerSettingsPerformance,
    useLawyerSettingsPushAllowed,
    useLawyerSettingsSecurity,
} from '@/app/context/LawyerSettingsContext';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { useAppLock } from '@/app/hooks/useAppLock';
import { SETTINGS_SCHEMA_VERSION } from '@/app/services/settings/types';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';
import { isCloudSyncBucketEnabled } from '@/app/services/settings/settingsRuntime';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { closeOverlaysBeforeNotificationsOpen } from '@/app/services/notifications/notificationShellOrchestration';
import { returnToLawyerHomeDashboard } from '@/app/hooks/lawyerDashboard/lawyerDashboardReturnHome';
import { closeOverlaysBeforeForumOpen } from '@/app/services/forum/forumShellOrchestration';
import { closeOverlaysBeforeTransactionsOpen } from '@/app/services/transactions/transactionsShellOrchestration';
import { closeOverlaysBeforeSettingsOpen } from '@/app/services/settings/settingsShellOrchestration';
import { closeOverlaysBeforeGlobalSearchOpen } from '@/app/services/search/globalSearchShellOrchestration';
import { closeOverlaysBeforeProfileOpen } from '@/app/services/profile/profileShellOrchestration';
import { coerceExecutionFilePreserveId } from '@/app/components/lawyer/LawyerDashboardParts/utils';
import type { ExecutionFile as DashboardExecutionFile } from '@/app/components/lawyer/LawyerDashboardParts/types';
import type { UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';
import type { ClusterScanSources } from '@/app/workspace/clusterScanSources.types';
import { resolveCalendarUserId } from '@/app/services/calendar/bridge/lite';
import type {
    DeferredFeatureBag,
    DeferredPendingOp,
    LawyerDashboardDeferredFeatureSurfacesProps,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import {
    createDeferredFeatureStubs,
    runDeferredPendingOp,
} from '@/app/components/lawyer/dashboard/createDeferredFeatureStubs';
import {
    readInitialCommunityOpen,
    readInitialFieldTasksSession,
    readInitialGlobalSearchSession,
    readInitialLawyerTab,
    readInitialRepositorySession,
    readInitialTransactionsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

const EMPTY_CRIMINAL_CASES_FOR_CLUSTER: unknown[] = [];

function clusterScanSourcesSame(a: ClusterScanSources, b: ClusterScanSources): boolean {
    return (
        a.ready === b.ready &&
        a.lawsuitFiles === b.lawsuitFiles &&
        a.executionFiles === b.executionFiles &&
        a.criminalCases === b.criminalCases &&
        a.urgentCases === b.urgentCases &&
        a.threadingTransactions === b.threadingTransactions &&
        a.threadingTasks === b.threadingTasks &&
        a.notes === b.notes &&
        a.fieldTasks === b.fieldTasks &&
        a.vaultDocs === b.vaultDocs &&
        a.calendarEvents === b.calendarEvents
    );
}

function readDeferredEarlyArm(): boolean {
    if (typeof window === 'undefined') return false;
    if (readInitialCommunityOpen()) return true;
    if (readInitialTransactionsSession().open) return true;
    if (readInitialFieldTasksSession().open) return true;
    if (readInitialGlobalSearchSession().open) return true;
    if (readInitialRepositorySession().open) return true;
    const tab = readInitialLawyerTab();
    return tab === 'schedule';
}

export function useLawyerDashboardCoreOrchestration({
    authUser: _authUserOverride,
    onNavigateToCase,
    pendingFieldTasksCount,
    quantumTasksFingerprint,
    backgroundRuntimeEnabled,
}: Pick<
    UseLawyerDashboardCoreParams,
    | 'authUser'
    | 'onNavigateToCase'
    | 'pendingFieldTasksCount'
    | 'quantumTasksFingerprint'
    | 'backgroundRuntimeEnabled'
>) {
    const criminalBridge = useCriminalDashboardBridge();
    const appearance = useLawyerSettingsAppearance();
    const dataSettings = useLawyerSettingsData();
    const securitySettings = useLawyerSettingsSecurity();
    const performance = useLawyerSettingsPerformance();
    /** بدون homeLayout — HomeTab يقرأ الشريحة مباشرة؛ يمنع إعادة رسم LD عند تعديل الرصيف */
    const settings = useMemo((): AppSettingsState => {
        return {
            version: SETTINGS_SCHEMA_VERSION,
            appearance,
            security: securitySettings,
            data: dataSettings,
            performance,
            homeLayout: LAWYER_SETTINGS_V2_DEFAULTS.homeLayout,
        };
    }, [appearance, securitySettings, dataSettings, performance]);
    const currentTheme = appearance.theme;
    const pushAllowed = useLawyerSettingsPushAllowed();
    const appLock = useAppLock(securitySettings);
    const localAutoSave = dataSettings.autoSave;
    const syncNotesOn = isCloudSyncBucketEnabled(settings, 'notes');
    const syncFilesOn = isCloudSyncBucketEnabled(settings, 'files');
    const syncExecutionOn = isCloudSyncBucketEnabled(settings, 'execution');

    const { user: authUser } = useAuthSafe();
    const { user, authGate } = useLawyerDashboardAuth({
        authUser,
    });

    const shellAuthUserId = resolveShellAuthUserId(authUser?.id, user?.id);

    const notifications = useLawyerDashboardNotifications(shellAuthUserId, {
        backgroundRuntimeEnabled,
    });
    /** حي دائماً — ليس داخل الجزيرة المؤجّلة (كان requestArm يُسبّب تأخير الدخول) */
    const settingsFeature = useLawyerDashboardSettings(shellAuthUserId);
    const appAlerts = useLawyerDashboardAppAlerts(user?.id);
    const archiveAndSync = useLawyerDashboardArchiveAndSyncRefs();

    const overlays = useLawyerDashboardOverlays({
        setArchiveType: archiveAndSync.setArchiveType,
        executionArchiveOpen: archiveAndSync.archiveType === 'execution',
    });

    /** حي دائماً — مثل الإعدادات؛ إلغاء انتظار أول فتح للمنتدى بسبب stubs/deferred */
    const communityFeature = useLawyerDashboardCommunity({
        userId: shellAuthUserId,
        activeTab: overlays.activeTab,
    });

    /** حي دائماً — التقويم في الدوك؛ stubs كانت تؤخّر أول flushSync بانتظار الجزيرة المؤجّلة */
    const scheduleFeature = useLawyerDashboardScheduleTab({
        userId: shellAuthUserId,
        activeTab: overlays.activeTab,
        setActiveTab: overlays.setActiveTab,
    });

    /** حي دائماً — المستودع في الدوك؛ stubs كانت تؤخّر أول فتح بانتظار الجزيرة المؤجّلة */
    const repositoryFeature = useLawyerDashboardRepository({
        userId: shellAuthUserId,
    });

    const dashboardHome = useLawyerDashboardHomeTab({
        activeTab: overlays.activeTab,
    });

    const { theme, shapeClass } = useThemeStyles(currentTheme, appearance.shape);

    const [earlyArm] = useState(readDeferredEarlyArm);
    const [forceArm, setForceArm] = useState(false);
    const pendingOpRef = useRef<DeferredPendingOp>(null);
    const [liveBag, setLiveBag] = useState<DeferredFeatureBag | null>(null);

    const requestArm = useCallback((op: DeferredPendingOp) => {
        pendingOpRef.current = op;
        setForceArm(true);
    }, []);

    const stubs = useMemo(() => createDeferredFeatureStubs(requestArm), [requestArm]);
    const bag = liveBag ?? stubs;

    const bumpSearchIndexRef = useRef<() => void>(() => undefined);
    const closeNotepadRef = useRef<() => void>(() => undefined);
    bumpSearchIndexRef.current = () => {
        bag.globalSearch.bumpSearchIndex();
    };
    closeNotepadRef.current = () => {
        repositoryFeature.closeRepository();
    };

    const onDeferredFeaturesReady = useCallback((next: DeferredFeatureBag) => {
        bumpSearchIndexRef.current = () => {
            next.globalSearch.bumpSearchIndex();
        };
        closeNotepadRef.current = () => {
            repositoryFeature.closeRepository();
        };
        setLiveBag((prev) => {
            if (prev === null) {
                const op = pendingOpRef.current;
                pendingOpRef.current = null;
                if (op) {
                    queueMicrotask(() => runDeferredPendingOp(next, op));
                }
            }
            return next;
        });
    }, [repositoryFeature]);

    const productivityOverlayClosers = useMemo(
        () => ({
            closeGlobalSearch: () => bag.globalSearch.closeGlobalSearch(),
            closeSettings: () => settingsFeature.closeSettings(),
            closeVault: () => repositoryFeature.closeRepository(),
            closeNotepad: () => repositoryFeature.closeRepository(),
            closeTransactionsHub: () => bag.transactions.closeTransactionsHub(),
            closeNotifications: () => notifications.closeNotifications(),
            closeCommunity: () => communityFeature.closeCommunity(),
        }),
        [bag, communityFeature, notifications, repositoryFeature, settingsFeature],
    );

    const openNotificationsInnerRef = useRef(notifications.openNotifications);
    openNotificationsInnerRef.current = notifications.openNotifications;

    const openNotifications = useCallback(() => {
        closeOverlaysBeforeNotificationsOpen(productivityOverlayClosers);
        openNotificationsInnerRef.current();
    }, [productivityOverlayClosers]);

    const openCommunityTabInnerRef = useRef(communityFeature.openCommunityTab);
    openCommunityTabInnerRef.current = communityFeature.openCommunityTab;

    const openCommunityTab = useCallback(() => {
        closeOverlaysBeforeForumOpen(productivityOverlayClosers);
        openCommunityTabInnerRef.current();
    }, [productivityOverlayClosers]);

    const openTransactionsHubInnerRef = useRef(bag.transactions.openTransactionsHub);
    openTransactionsHubInnerRef.current = bag.transactions.openTransactionsHub;

    const openTransactionsHub = useCallback((focusId?: string) => {
        closeOverlaysBeforeTransactionsOpen(productivityOverlayClosers);
        openTransactionsHubInnerRef.current(focusId);
    }, [productivityOverlayClosers]);

    const openSettingsInnerRef = useRef(settingsFeature.openSettings);
    openSettingsInnerRef.current = settingsFeature.openSettings;

    const openSettings = useCallback(() => {
        // افتح أولاً — لا تؤخّر القشرة خلف إغلاق overlays / setActiveTab
        openSettingsInnerRef.current();
        if (overlays.activeTab !== 'home') {
            overlays.setActiveTab('home');
        }
        queueMicrotask(() => {
            closeOverlaysBeforeSettingsOpen(productivityOverlayClosers);
        });
    }, [overlays, productivityOverlayClosers]);

    const hydrateCasesFromLawsuitFiles = useCaseStore((s) => s.hydrateCasesFromLawsuitFiles);
    const selectCase = useCaseStore((s) => s.selectCase);
    const storeCases = useCaseStore((s) => s.cases);
    const quantumPendingForField = useMemo(
        () => getQuantumPendingSnapshot(),
        [quantumTasksFingerprint],
    );
    const quantumTasks = quantumPendingForField;

    const workspace = useLawyerDashboardWorkspace({
        localAutoSave,
        backgroundRuntimeEnabled,
        user,
        authUserId: authUser?.id,
        refreshAppAlerts: appAlerts.refreshAppAlerts,
        showLawsuitsWorkspace: overlays.showLawsuitsWorkspace,
        archiveType: archiveAndSync.archiveType,
        setArchiveType: archiveAndSync.setArchiveType,
        criminalBridge,
        onOpenCriminalDashboard: overlays.openCriminalCase,
        bumpSearchIndex: () => bumpSearchIndexRef.current(),
        selectCase,
        closeNotepad: () => closeNotepadRef.current(),
    });

    const dashboardExecutionFiles = useMemo<DashboardExecutionFile[]>(
        () =>
            (Array.isArray(workspace.executionFiles) ? workspace.executionFiles : []).map((file) =>
                coerceExecutionFilePreserveId(file),
            ),
        [workspace.executionFiles],
    );

    const navigation = useLawyerDashboardNavigation({
        userId: shellAuthUserId,
        files: workspace.files,
        executionFiles: dashboardExecutionFiles,
        setActiveTab: overlays.setActiveTab,
        setShowCommunity: communityFeature.setShowCommunity,
        setCommunityDeepLink: communityFeature.setCommunityDeepLink,
        setArchiveType: archiveAndSync.setArchiveType,
        setActiveFile: workspace.setActiveFile,
        setShowNotifications: notifications.closeNotifications,
        openNotepad: repositoryFeature.openNotepad,
        setTransactionsFocusId: bag.transactions.setTransactionsFocusId,
        openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
        openVaultModal: repositoryFeature.openVaultModal,
        openTransactionsHub: openTransactionsHub,
        openCommunityTab,
        openFieldTasksSheet: bag.fieldTasks.openFieldTasksSheet,
        openCriminalCase: overlays.openCriminalCase,
        openTasksManager: bag.fieldTasks.openTasksManager,
        openScheduleTab: scheduleFeature.openScheduleTab,
        openRepository: repositoryFeature.openRepository,
    });

    const criminalCasesForCluster = criminalBridge.ready
        ? criminalBridge.criminalCases
        : EMPTY_CRIMINAL_CASES_FOR_CLUSTER;
    const vaultDocsForCluster = useVaultDocsForClusterScan(
        resolveCalendarUserId(user?.id ?? authUser?.id ?? null),
        backgroundRuntimeEnabled,
    );
    const calendarEventsForCluster = useCalendarEventsForClusterScan(
        resolveCalendarUserId(user?.id ?? authUser?.id ?? null),
        backgroundRuntimeEnabled,
    );
    const { calendarUserId, clusterScanSources: liteClusterScanSources } =
        useLawyerDashboardCalendarClusterLite({
            enabled: backgroundRuntimeEnabled,
            userId: user?.id,
            authUserId: authUser?.id,
            files: workspace.files,
            executionFiles: dashboardExecutionFiles,
            globalNotes: workspace.globalNotes,
            quantumTasks,
            criminalCasesForCluster,
            vaultDocs: vaultDocsForCluster,
            calendarEvents: calendarEventsForCluster,
        });
    const [hydratedClusterScanSources, setHydratedClusterScanSources] =
        useState<ClusterScanSources | null>(null);
    const onClusterScanSources = useCallback((sources: ClusterScanSources) => {
        setHydratedClusterScanSources((prev) =>
            prev && clusterScanSourcesSame(prev, sources) ? prev : sources,
        );
    }, []);
    const clusterScanSources = hydratedClusterScanSources ?? liteClusterScanSources;

    const pendingFieldTasksCountResolved = pendingFieldTasksCount;

    const openGlobalSearchInnerRef = useRef(bag.globalSearch.openGlobalSearch);
    openGlobalSearchInnerRef.current = bag.globalSearch.openGlobalSearch;

    const openGlobalSearch = useCallback(
        (seed = '') => {
            const querySeed = typeof seed === 'string' ? seed : '';
            closeOverlaysBeforeGlobalSearchOpen(productivityOverlayClosers);
            openGlobalSearchInnerRef.current(querySeed);
        },
        [productivityOverlayClosers],
    );

    const openProfileTabInnerRef = useRef(bag.profile.openProfileTab);
    openProfileTabInnerRef.current = bag.profile.openProfileTab;

    const openProfileTab = useCallback(() => {
        // افتح أولاً — لا تؤخّر التبويب خلف إغلاق overlays (نفس معيار الإعدادات)
        openProfileTabInnerRef.current();
        queueMicrotask(() => {
            closeOverlaysBeforeProfileOpen(productivityOverlayClosers);
        });
    }, [productivityOverlayClosers]);

    const closeHubShellOverlays = useCallback(() => {
        overlays.closeHubShellOverlays();
        bag.transactions.closeTransactionsHub();
        repositoryFeature.closeRepository();
        bag.globalSearch.closeGlobalSearch();
    }, [bag.globalSearch, bag.transactions, overlays, repositoryFeature]);

    const exitToHomeDashboard = useCallback(() => {
        returnToLawyerHomeDashboard({
            setActiveTab: overlays.setActiveTab,
            closeHubShellOverlays,
            exitCriminalDossierToHome: overlays.exitCriminalDossierToHome,
        });
    }, [closeHubShellOverlays, overlays]);

    const deferredFeatureSurfacesProps = useMemo((): LawyerDashboardDeferredFeatureSurfacesProps => {
        return {
            earlyArm,
            forceArm,
            params: {
                userId: shellAuthUserId,
                activeTab: overlays.activeTab,
                setActiveTab: overlays.setActiveTab,
                setArchiveType: archiveAndSync.setArchiveType,
                setShowLawsuitsWorkspace: overlays.setShowLawsuitsWorkspace,
                files: workspace.files,
                executionFiles: dashboardExecutionFiles,
                openNotifications,
                openCommunityTab,
                setShowCommunity: communityFeature.setShowCommunity,
                closeCommunity: communityFeature.closeCommunity,
                setCommunityDeepLink: communityFeature.setCommunityDeepLink,
                openTransactionsHub,
                openProfileTab,
                closeSettings: settingsFeature.closeSettings,
                openScheduleTab: scheduleFeature.openScheduleTab,
                openNotepad: repositoryFeature.openNotepad,
                openVaultModal: repositoryFeature.openVaultModal,
                openUrgentInLawsuitsWorkspace: overlays.openUrgentInLawsuitsWorkspace,
                openCriminalCase: overlays.openCriminalCase,
                setActiveFile: workspace.setActiveFile,
                selectCase,
                onNavigateToCase,
            },
            onReady: onDeferredFeaturesReady,
        };
    }, [
        archiveAndSync.setArchiveType,
        communityFeature.closeCommunity,
        communityFeature.setCommunityDeepLink,
        communityFeature.setShowCommunity,
        dashboardExecutionFiles,
        earlyArm,
        forceArm,
        onDeferredFeaturesReady,
        onNavigateToCase,
        openCommunityTab,
        openNotifications,
        openProfileTab,
        openTransactionsHub,
        scheduleFeature.openScheduleTab,
        settingsFeature.closeSettings,
        repositoryFeature.openNotepad,
        repositoryFeature.openVaultModal,
        overlays.activeTab,
        overlays.openCriminalCase,
        overlays.openUrgentInLawsuitsWorkspace,
        overlays.setActiveTab,
        overlays.setShowLawsuitsWorkspace,
        selectCase,
        shellAuthUserId,
        workspace.files,
        workspace.setActiveFile,
    ]);

    const dashboardCommunity = { ...communityFeature, openCommunityTab };
    const dashboardSettings = { ...settingsFeature, openSettings };
    const dashboardTransactions = { ...bag.transactions, openTransactionsHub };
    const dashboardRepository = repositoryFeature;
    const dashboardGlobalSearch = bag.globalSearch;
    const dashboardFieldTasks = bag.fieldTasks;
    const dashboardSchedule = scheduleFeature;
    const profileTab = bag.profile;
    const globalSearchNav = bag.globalSearchNav;

    return {
        authGate,
        user,
        authUser,
        settings,
        theme,
        shapeClass,
        pushAllowed,
        syncNotesOn,
        syncFilesOn,
        syncExecutionOn,
        appLock,
        notifications: { ...notifications, openNotifications },
        profileTab,
        dashboardSettings,
        dashboardTransactions,
        dashboardRepository,
        dashboardGlobalSearch,
        dashboardFieldTasks,
        dashboardSchedule,
        dashboardCommunity,
        dashboardHome,
        appAlerts,
        archiveAndSync,
        overlays: {
            ...overlays,
            ...dashboardSettings,
            ...dashboardTransactions,
            ...dashboardRepository,
            ...dashboardGlobalSearch,
            ...dashboardFieldTasks,
            ...dashboardSchedule,
            ...dashboardCommunity,
            openTransactionsHub,
            openCommunityTab,
            ...dashboardHome,
            openGlobalSearch,
            openSettings,
            openProfileTab,
            closeHubShellOverlays,
            exitToHomeDashboard,
        },
        workspace,
        navigation,
        calendarUserId,
        clusterScanSources,
        onClusterScanSources,
        criminalCasesForCluster,
        criminalBridge,
        globalSearchNav,
        quantumPendingForField,
        pendingFieldTasksCount: pendingFieldTasksCountResolved,
        storeCases,
        hydrateCasesFromLawsuitFiles,
        dashboardExecutionFiles,
        deferredFeatureSurfacesProps,
    };
}
