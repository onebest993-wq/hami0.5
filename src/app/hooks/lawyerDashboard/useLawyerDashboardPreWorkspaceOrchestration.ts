import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { useLawyerDashboardOverlays } from '@/app/hooks/useLawyerDashboardOverlays';
import { useLawyerDashboardAppAlerts } from '@/app/hooks/useLawyerDashboardAppAlerts';
import { useLawyerDashboardAuth } from '@/app/hooks/lawyerDashboard/useLawyerDashboardAuth';
import type { LawyerDashboardWorkspaceProviderParams } from '@/app/hooks/lawyerDashboard/LawyerDashboardWorkspaceProvider';
import { useLawyerDashboardNotifications } from '@/app/hooks/lawyerDashboard/useLawyerDashboardNotifications';
import { useLawyerDashboardHomeTab } from '@/app/hooks/lawyerDashboard/useLawyerDashboardHomeTab';
import { useLawyerDashboardArchiveAndSyncRefs } from '@/app/hooks/lawyerDashboard/useLawyerDashboardArchiveAndSyncRefs';
import { useAuthSafe } from '@/app/context/authHooks';
import { useThemeStyles } from '@/app/components/lawyer/lawyerThemeStyles';
import { useCriminalDashboardBridge } from '@/app/components/lawyer/criminal-system/criminalDashboardBridge';
import {
    useLawyerSettingsAppearance,
    useLawyerSettingsData,
    useLawyerSettingsPerformance,
    useLawyerSettingsPushAllowed,
    useLawyerSettingsSecurity,
} from '@/app/context/lawyerSettings/lawyerSettingsHooks';
import { getQuantumPendingSnapshot } from '@/app/utils/quantumTasksMetrics';
import { useAppLock } from '@/app/hooks/useAppLock';
import { SETTINGS_SCHEMA_VERSION } from '@/app/services/settings/types';
import { LAWYER_SETTINGS_V2_DEFAULTS } from '@/app/services/settings/defaults';
import type { AppSettingsState } from '@/app/services/settings/types';
import { isCloudSyncBucketEnabled } from '@/app/services/settings/cloudSyncBucket';
import { resolveShellAuthUserId } from '@/app/services/auth/shellAuth';
import { closeOverlaysBeforeNotificationsOpen } from '@/app/services/notifications/notificationShellOrchestration';
import { closeOverlaysBeforeForumOpen } from '@/app/services/forum/forumShellOrchestration';
import { bindForumOpenIntent } from '@/app/runtime/forumOpenIntent';
import { closeOverlaysBeforeTransactionsOpen } from '@/app/services/transactions/transactionsShellOrchestration';
import { closeOverlaysBeforeSettingsOpen } from '@/app/services/settings/settingsShellOrchestration';
import {
    concealRepositoryWarmShell,
    REPOSITORY_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/repositoryInstantPaint';
import {
    concealFieldTasksWarmSheet,
    FIELD_TASKS_INSTANT_DISMISS_EVENT,
} from '@/app/runtime/fieldTasksInstantPaint';
import type { UseLawyerDashboardCoreParams } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore.types';
import type {
    DeferredFeatureBag,
    DeferredFieldTasks,
    DeferredPendingOp,
} from '@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces.types';
import {
    createDeferredFeatureStubs,
    deferredHandoffId,
    isDeferredPendingOpSatisfied,
    isFieldTasksDeferredOp,
    runDeferredPendingOp,
} from '@/app/components/lawyer/dashboard/createDeferredFeatureStubs';
import {
    createPreDockFeatureStubs,
    isPreDockPendingOpSatisfied,
    readPreDockEarlyArm,
    readRepositoryEarlyArm,
    runPreDockPendingOp,
} from '@/app/components/lawyer/dashboard/createPreDockFeatureStubs';
import {
    createBootChromeFeatureStubs,
    runBootChromePendingOp,
    coalesceBootChromePendingOp,
    bootChromePendingOpFamily,
    isBootChromeOpenOp,
    isBootChromePendingOpSatisfied,
    type BootChromePendingOp,
    type LawyerDashboardProfileFeature,
    type LawyerDashboardSettingsFeature,
} from '@/app/components/lawyer/dashboard/createBootChromeFeatureStubs';
import {
    clearShellHandoffPending,
    markShellHandoffPending,
} from '@/app/runtime/sectionShellHandoff';
import type {
    PreDockFeatureBag,
    PreDockLiveBag,
    PreDockPendingOp,
    PreDockRepository,
} from '@/app/components/lawyer/dashboard/LawyerDashboardPreDockFeatureSurfaces.types';
import {
    readInitialGlobalSearchSession,
    readInitialTransactionsSession,
} from '@/app/hooks/lawyerDashboard/lawyerDashboardNav';

function readDeferredEarlyArm(): boolean {
    if (typeof window === 'undefined') return false;
    if (readInitialTransactionsSession().open) return true;
    if (readInitialGlobalSearchSession().open) return true;
    return false;
}

export function useLawyerDashboardPreWorkspaceOrchestration({
    authUser: _authUserOverride,
    pendingFieldTasksCount: _pendingFieldTasksCount,
    quantumTasksFingerprint: _quantumTasksFingerprint,
    backgroundRuntimeEnabled,
}: Pick<
    UseLawyerDashboardCoreParams,
    'authUser' | 'pendingFieldTasksCount' | 'quantumTasksFingerprint' | 'backgroundRuntimeEnabled'
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
            notifications: LAWYER_SETTINGS_V2_DEFAULTS.notifications,
        };
    }, [appearance, securitySettings, dataSettings, performance]);
    const currentTheme = appearance.theme;
    const pushAllowed = useLawyerSettingsPushAllowed();
    const appLock = useAppLock(securitySettings);
    const localAutoSave = dataSettings.autoSave;
    const syncNotesOn = isCloudSyncBucketEnabled(settings, 'notes');
    const syncFilesOn = isCloudSyncBucketEnabled(settings, 'files');
    const syncExecutionOn = isCloudSyncBucketEnabled(settings, 'execution');

    const { user: authUser, isLoading: authHydrating } = useAuthSafe();
    const { user, authGate } = useLawyerDashboardAuth({
        authUser,
        authHydrating,
    });

    const shellAuthUserId = resolveShellAuthUserId(authUser?.id, user?.id);

    const notifications = useLawyerDashboardNotifications(shellAuthUserId, {
        backgroundRuntimeEnabled,
    });
    const appAlerts = useLawyerDashboardAppAlerts(user?.id);
    const archiveAndSync = useLawyerDashboardArchiveAndSyncRefs();

    const overlays = useLawyerDashboardOverlays({
        setArchiveType: archiveAndSync.setArchiveType,
        executionArchiveOpen: archiveAndSync.archiveType === 'execution',
        userId: shellAuthUserId,
    });

    const dashboardHome = useLawyerDashboardHomeTab({
        activeTab: overlays.activeTab,
    });

    const { theme, shapeClass } = useThemeStyles(currentTheme, appearance.shape);

    const [earlyArm] = useState(readDeferredEarlyArm);
    const [preDockEarlyArm] = useState(readPreDockEarlyArm);
    const [repositoryEarlyArm] = useState(readRepositoryEarlyArm);
    const [forceArm, setForceArm] = useState(false);
    const [fieldTasksForceArm, setFieldTasksForceArm] = useState(false);
    const [preDockForceArm, setPreDockForceArm] = useState(false);
    const [repositoryForceArm, setRepositoryForceArm] = useState(false);
    const pendingOpRef = useRef<DeferredPendingOp | null>(null) as MutableRefObject<DeferredPendingOp | null>;
    const preDockPendingOpRef = useRef<PreDockPendingOp | null>(null) as MutableRefObject<PreDockPendingOp | null>;
    const bootChromePendingOpRef = useRef<BootChromePendingOp | null>(
        null,
    ) as MutableRefObject<BootChromePendingOp | null>;
    const [liveBag, setLiveBag] = useState<DeferredFeatureBag | null>(null);
    const [liveFieldTasks, setLiveFieldTasks] = useState<DeferredFieldTasks | null>(null);
    const [livePreDock, setLivePreDock] = useState<PreDockLiveBag | null>(null);
    const [liveRepository, setLiveRepository] = useState<PreDockRepository | null>(null);
    const [bootChromeForceArm, setBootChromeForceArm] = useState(false);
    const [liveBootChrome, setLiveBootChrome] = useState<{
        settings: LawyerDashboardSettingsFeature;
        profile: LawyerDashboardProfileFeature;
    } | null>(null);

    const requestArm = useCallback((op: DeferredPendingOp) => {
        pendingOpRef.current = op;
        if (op) markShellHandoffPending(deferredHandoffId(op));
        if (isFieldTasksDeferredOp(op)) {
            setFieldTasksForceArm(true);
            return;
        }
        setForceArm(true);
    }, []);

    const clearDeferredPending = useCallback((op?: DeferredPendingOp) => {
        if (!op || pendingOpRef.current === op) {
            const current = pendingOpRef.current;
            if (current) clearShellHandoffPending(deferredHandoffId(current));
            pendingOpRef.current = null;
        }
    }, []);

    const requestPreDockArm = useCallback((op: PreDockPendingOp) => {
        preDockPendingOpRef.current = op;
        if (op) markShellHandoffPending(op);
        if (op === 'repository') {
            setRepositoryForceArm(true);
            return;
        }
        setPreDockForceArm(true);
    }, []);

    const clearPreDockPending = useCallback((op?: PreDockPendingOp) => {
        if (!op || preDockPendingOpRef.current === op) {
            const current = preDockPendingOpRef.current;
            if (current) clearShellHandoffPending(current);
            preDockPendingOpRef.current = null;
        }
    }, []);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onInstantDismiss = () => {
            clearPreDockPending('repository');
            concealRepositoryWarmShell();
        };
        window.addEventListener(REPOSITORY_INSTANT_DISMISS_EVENT, onInstantDismiss);
        return () => window.removeEventListener(REPOSITORY_INSTANT_DISMISS_EVENT, onInstantDismiss);
    }, [clearPreDockPending]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const onFieldTasksInstantDismiss = () => {
            clearDeferredPending('fieldTasks');
            concealFieldTasksWarmSheet();
        };
        window.addEventListener(FIELD_TASKS_INSTANT_DISMISS_EVENT, onFieldTasksInstantDismiss);
        return () =>
            window.removeEventListener(FIELD_TASKS_INSTANT_DISMISS_EVENT, onFieldTasksInstantDismiss);
    }, [clearDeferredPending]);

    const clearBootChromePending = useCallback((op?: BootChromePendingOp) => {
        if (!op) {
            const current = bootChromePendingOpRef.current;
            if (isBootChromeOpenOp(current)) clearShellHandoffPending(current);
            bootChromePendingOpRef.current = null;
            return;
        }
        const current = bootChromePendingOpRef.current;
        if (!current) return;
        if (bootChromePendingOpFamily(current) === bootChromePendingOpFamily(op)) {
            if (isBootChromeOpenOp(current)) clearShellHandoffPending(current);
            bootChromePendingOpRef.current = null;
        }
    }, []);

    const requestBootChromeArm = useCallback((op: BootChromePendingOp) => {
        bootChromePendingOpRef.current = coalesceBootChromePendingOp(
            bootChromePendingOpRef.current,
            op,
        );
        if (isBootChromeOpenOp(op)) markShellHandoffPending(op);
        setBootChromeForceArm(true);
        void import('@/app/components/lawyer/dashboard/LawyerDashboardSettingsProfileRuntime').catch(
            () => undefined,
        );
    }, []);

    const stubs = useMemo(() => createDeferredFeatureStubs(requestArm), [requestArm]);
    const deferredLive = liveBag ?? stubs;
    const bag: DeferredFeatureBag = {
        ...deferredLive,
        fieldTasks: liveFieldTasks ?? stubs.fieldTasks,
    };
    const preDockStubs = useMemo(
        () => createPreDockFeatureStubs(requestPreDockArm, clearPreDockPending),
        [requestPreDockArm, clearPreDockPending],
    );
    const bootChromeStubs = useMemo(
        () => createBootChromeFeatureStubs(requestBootChromeArm, clearBootChromePending),
        [requestBootChromeArm, clearBootChromePending],
    );
    const communityFeature = livePreDock?.community ?? preDockStubs.community;
    const scheduleFeature = livePreDock?.schedule ?? preDockStubs.schedule;
    const repositoryFeature = liveRepository ?? preDockStubs.repository;
    const settingsFeature = liveBootChrome?.settings ?? bootChromeStubs.settings;
    const profileFeature = liveBootChrome?.profile ?? bootChromeStubs.profile;

    const onSettingsProfileReady = useCallback(
        (next: {
            settings: LawyerDashboardSettingsFeature;
            profile: LawyerDashboardProfileFeature;
        }) => {
            setLiveBootChrome((prev) => {
                if (
                    prev &&
                    prev.settings.showSettings === next.settings.showSettings &&
                    prev.settings.settingsHostMounted === next.settings.settingsHostMounted &&
                    prev.settings.settingsSessionKey === next.settings.settingsSessionKey &&
                    prev.profile.profileOpenEpoch === next.profile.profileOpenEpoch &&
                    prev.profile.profileHostMounted === next.profile.profileHostMounted
                ) {
                    return prev;
                }
                return next;
            });
            const op = bootChromePendingOpRef.current;
            if (!op) return;
            if (op === 'settings-prime' || op === 'profile-prime') {
                bootChromePendingOpRef.current = null;
                runBootChromePendingOp(next, op);
                return;
            }
            if (isBootChromePendingOpSatisfied(next, op)) {
                bootChromePendingOpRef.current = null;
                if (isBootChromeOpenOp(op)) clearShellHandoffPending(op);
                return;
            }
            runBootChromePendingOp(next, op);
        },
        [],
    );

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
        setLiveBag(next);
        const op = pendingOpRef.current;
        if (!op || isFieldTasksDeferredOp(op)) return;
        if (isDeferredPendingOpSatisfied(next, op)) {
            pendingOpRef.current = null;
            clearShellHandoffPending(deferredHandoffId(op));
            return;
        }
        runDeferredPendingOp(next, op);
    }, [repositoryFeature]);

    const onFieldTasksReady = useCallback((next: DeferredFieldTasks) => {
        setLiveFieldTasks((prev) => (prev === next ? prev : next));
        const op = pendingOpRef.current;
        if (!isFieldTasksDeferredOp(op)) return;
        const merged: DeferredFeatureBag = {
            ...(liveBag ?? stubs),
            fieldTasks: next,
        };
        if (isDeferredPendingOpSatisfied(merged, op)) {
            pendingOpRef.current = null;
            clearShellHandoffPending(deferredHandoffId(op));
            return;
        }
        runDeferredPendingOp(merged, op);
    }, [liveBag, stubs]);

    const onPreDockFeaturesReady = useCallback((next: PreDockLiveBag) => {
        setLivePreDock(next);
        const op = preDockPendingOpRef.current;
        if (!op || op === 'repository') return;
        const bagForOp: PreDockFeatureBag = {
            community: next.community,
            schedule: next.schedule,
            repository: preDockStubs.repository,
        };
        if (isPreDockPendingOpSatisfied(bagForOp, op)) {
            preDockPendingOpRef.current = null;
            clearShellHandoffPending(op);
            return;
        }
        runPreDockPendingOp(bagForOp, op);
    }, [preDockStubs.repository]);

    const onRepositoryFeaturesReady = useCallback((next: PreDockRepository) => {
        setLiveRepository(next);
        const op = preDockPendingOpRef.current;
        if (op !== 'repository') return;
        if (next.isRepositoryOpen) {
            preDockPendingOpRef.current = null;
            clearShellHandoffPending(op);
            return;
        }
        next.openRepository();
    }, []);

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
    const notificationsOpenRef = useRef(notifications.showNotifications);
    notificationsOpenRef.current = notifications.showNotifications;

    const openNotifications = useCallback(() => {
        const closing = notificationsOpenRef.current;
        openNotificationsInnerRef.current();
        if (closing) return;
        queueMicrotask(() => closeOverlaysBeforeNotificationsOpen(productivityOverlayClosers));
    }, [productivityOverlayClosers]);

    const openCommunityTabInnerRef = useRef(communityFeature.openCommunityTab);
    openCommunityTabInnerRef.current = communityFeature.openCommunityTab;

    const openCommunityTab = useCallback(() => {
        openCommunityTabInnerRef.current();
        closeOverlaysBeforeForumOpen(productivityOverlayClosers);
    }, [productivityOverlayClosers]);

    useEffect(() => bindForumOpenIntent(openCommunityTab), [openCommunityTab]);

    const openTransactionsHubInnerRef = useRef(bag.transactions.openTransactionsHub);
    openTransactionsHubInnerRef.current = bag.transactions.openTransactionsHub;

    const openTransactionsHub = useCallback((focusId?: string) => {
        closeOverlaysBeforeTransactionsOpen(productivityOverlayClosers);
        openTransactionsHubInnerRef.current(focusId);
    }, [productivityOverlayClosers]);

    const openSettingsInnerRef = useRef(settingsFeature.openSettings);
    openSettingsInnerRef.current = settingsFeature.openSettings;

    const openSettings = useCallback(() => {
        openSettingsInnerRef.current();
        if (overlays.activeTab !== 'home') {
            overlays.setActiveTab('home');
        }
        queueMicrotask(() => {
            closeOverlaysBeforeSettingsOpen(productivityOverlayClosers);
        });
    }, [overlays, productivityOverlayClosers]);

    const selectCase = useCallback((caseId: string) => {
        void import('@/app/stores/caseStore')
            .then((m) => {
                m.useCaseStore.getState().selectCase(caseId);
            })
            .catch(() => undefined);
    }, []);
    const quantumPendingForField = useMemo(
        () => getQuantumPendingSnapshot(),
        [_quantumTasksFingerprint],
    );
    const quantumTasks = quantumPendingForField;

    const workspaceProviderParams = useMemo((): Omit<
        LawyerDashboardWorkspaceProviderParams,
        'localAutoSave' | 'backgroundRuntimeEnabled' | 'archiveType' | 'setArchiveType'
    > => ({
        user,
        authUserId: authUser?.id,
        refreshAppAlerts: appAlerts.refreshAppAlerts,
        showLawsuitsWorkspace: overlays.showLawsuitsWorkspace,
        criminalBridge,
        onOpenCriminalDashboard: overlays.openCriminalCase,
        bumpSearchIndex: () => bumpSearchIndexRef.current(),
        selectCase,
        closeNotepad: () => closeNotepadRef.current(),
    }), [
        appAlerts.refreshAppAlerts,
        authUser?.id,
        criminalBridge,
        overlays.openCriminalCase,
        overlays.showLawsuitsWorkspace,
        selectCase,
        user,
    ]);

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
        notifications,
        settingsFeature,
        profileFeature,
        appAlerts,
        archiveAndSync,
        overlays,
        communityFeature,
        scheduleFeature,
        repositoryFeature,
        dashboardHome,
        earlyArm,
        forceArm,
        fieldTasksForceArm,
        bag,
        onDeferredFeaturesReady,
        onFieldTasksReady,
        productivityOverlayClosers,
        openNotifications,
        openCommunityTab,
        openTransactionsHub,
        openSettings,
        selectCase,
        quantumPendingForField,
        quantumTasks,
        criminalBridge,
        localAutoSave,
        backgroundRuntimeEnabled,
        shellAuthUserId,
        workspaceProviderParams,
        preDockEarlyArm,
        preDockForceArm,
        onPreDockFeaturesReady,
        repositoryEarlyArm,
        repositoryForceArm,
        onRepositoryFeaturesReady,
        bootChromeForceArm,
        onSettingsProfileReady,
    };
}

export type LawyerDashboardPreWorkspaceOrchestration = ReturnType<
    typeof useLawyerDashboardPreWorkspaceOrchestration
>;
