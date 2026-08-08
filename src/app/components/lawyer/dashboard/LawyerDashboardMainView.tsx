import React, {
    Suspense,
    memo,
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { markDashboardInteractiveOnce, markBootPhase } from '@/app/bootstrap/bootMetrics';
import { onBootContentReady, scheduleBootContentReadyAfterStyles, isDemoShellAuthBuild, isBootRevealDone, DASHBOARD_SHELL_PAINTED_EVENT } from '@/app/bootstrap/bootReveal';
import { ensureDeferredAppStylesLoaded } from '@/app/runtime/deferredAppStyles';
import { bindFramePacingGuard } from '@/app/runtime/framePacingGuard';
import { bindBodyScrollLockReconcile, useBodyScrollLock } from '@/app/utils/bodyScrollLock';
import { blurFocusWithin } from '@/app/utils/inertProps';
import { DashboardTabSurface } from '@/app/components/lawyer/dashboard/schedule/DashboardTabSurface';
import {
    ExecutionArchiveInstantChrome,
} from '@/app/components/lawyer/dashboard/ExecutionArchiveInstantChrome';
import { LawyerDashboardExecutionOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry';
import { LawyerDashboardExecutionDossierOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionDossierOverlayEntry';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import {
    EXECUTION_DOSSIER_PRIME_HOST_EVENT,
    type ExecutionDossierPrimeHostDetail,
} from '@/app/runtime/executionDossierPrimeHost';
import { useLawyerExecutionOverlayEscape } from '@/app/hooks/lawyerDashboard/useLawyerExecutionOverlayEscape';
import { useLawyerNonExecArchiveEscape } from '@/app/hooks/lawyerDashboard/useLawyerNonExecArchiveEscape';
import { LawyerDashboardSettingsOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSettingsOverlayEntry';
import { LawyerDashboardCommunityOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCommunityOverlayEntry';
import { LawyerDashboardTransactionsOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardTransactionsOverlayEntry';
import { LawyerDashboardFieldTasksOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardFieldTasksOverlayEntry';
import { LawyerDashboardRepositoryOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardRepositoryOverlayEntry';
import { LawyerDashboardLawsuitsOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardLawsuitsOverlayEntry';
import { LawyerDashboardSmartFileOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardSmartFileOverlayEntry';
import { LawyerDashboardGlobalSearchOverlayEntry } from '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardGlobalSearchOverlayEntry';
import { NotificationShell } from '@/app/components/lawyer/NotificationPanel/NotificationShell';
import { ProfileTabHost } from '@/app/components/lawyer/dashboard/profile/ProfileTabHost';
import { ScheduleTabHost } from '@/app/components/lawyer/dashboard/schedule/ScheduleTabHost';
import { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import { isProfileShellSnappedOpen } from '@/app/services/profile/profileShellSnap';
import { executeOverlaySnapClose } from '@/app/runtime/overlaySnapClose';

const LazyLawyerDashboardPostInteractiveRuntime = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardPostInteractiveRuntime').then((m) => ({
        default: m.LawyerDashboardPostInteractiveRuntime as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardDeferredFeatureSurfaces = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardDeferredFeatureSurfaces').then((m) => ({
        default: m.LawyerDashboardDeferredFeatureSurfaces as unknown as LazyComponent,
    })),
);

type LawyerDashboardMainViewProps = {
    model: Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;
};

/** نادر — لا يسحب motion/ConsolidationNavBar إلى stem البارد */
const LazyConsolidationNavOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardConsolidationNavOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardConsolidationNavOverlayEntry as unknown as LazyComponent,
    })),
);

const LazyNonExecArchiveOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNonExecArchiveOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNonExecArchiveOverlayEntry as unknown as LazyComponent,
    })),
);

const LazyExecutionCreateOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionCreateOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardExecutionCreateOverlayEntry as unknown as LazyComponent,
    })),
);

const LazyNewCaseOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardNewCaseOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardNewCaseOverlayEntry as unknown as LazyComponent,
    })),
);

const LazySparkShell = lazyWithRetry(() =>
    import('@/app/spark/ui/SparkShell').then((m) => ({
        default: m.SparkShell as unknown as LazyComponent,
    })),
);

const LazyCriminalOverlayEntry = lazyWithRetry(() =>
    import(
        '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardCriminalOverlayEntry'
    ).then((m) => ({
        default: m.LawyerDashboardCriminalOverlayEntry as unknown as LazyComponent,
    })),
);

export const LawyerDashboardMainView = memo(function LawyerDashboardMainView({
    model,
}: LawyerDashboardMainViewProps) {
    const {
        shellProps,
        notificationPanel,
        headerProps,
        homeTabProps,
        scheduleTabProps,
        scheduleHostMounted,
        profileHostMounted,
        profileTab,
        tabStackHidden,
        overlaysBundle,
        postInteractiveRuntimeProps,
        deferredFeatureSurfacesProps,
    } = model;

    const unbindFrameGuardRef = useRef<(() => void) | null>(null);

    const homeActive = homeTabProps.visible;
    /** لا تحميل chunk الأسطر المؤجلة/post-interactive قبل content-ready — إلا جلسة مستعادة/فتح فوري */
    const [postCriticalSurfacesMount, setPostCriticalSurfacesMount] = useState(
        () =>
            deferredFeatureSurfacesProps.earlyArm ||
            deferredFeatureSurfacesProps.forceArm ||
            isDemoShellAuthBuild() ||
            isBootRevealDone(),
    );
    useEffect(() => {
        if (deferredFeatureSurfacesProps.forceArm) setPostCriticalSurfacesMount(true);
    }, [deferredFeatureSurfacesProps.forceArm]);
    useEffect(() => {
        if (postCriticalSurfacesMount) return;
        return onBootContentReady(() => setPostCriticalSurfacesMount(true));
    }, [postCriticalSurfacesMount]);

    const scheduleActive = scheduleTabProps.visible;
    /** مثل المستودع: Host مركّب مبكراً أو عند الفتح/الاستعادة */
    const scheduleShouldMount = scheduleHostMounted || scheduleActive;
    const profileActive = profileTab.visible;
    const profileShouldMount = profileHostMounted || profileActive;
    const communityLive =
        overlaysBundle.overlays.showCommunity || overlaysBundle.overlays.communityHostMounted;
    const repositoryLive =
        overlaysBundle.overlays.isNotepadOpen ||
        overlaysBundle.overlays.repositoryHostMounted;
    const transactionsLive =
        overlaysBundle.overlays.showTransactions ||
        overlaysBundle.overlays.transactionsHostMounted;
    const fieldTasksSurfaceOpen =
        overlaysBundle.overlays.fieldTasksSheetOpen ||
        overlaysBundle.overlays.showTasksManager;
    const fieldTasksLive =
        fieldTasksSurfaceOpen ||
        overlaysBundle.overlays.fieldTasksHostMounted ||
        overlaysBundle.overlays.fieldTasksManagerHostMounted;
    const settingsLive =
        overlaysBundle.overlays.showSettings || overlaysBundle.overlays.settingsHostMounted;
    const notificationsLive =
        notificationPanel.isOpen ||
        (Boolean(notificationPanel.hostMounted) && Boolean(notificationPanel.userId));
    /* مثل الإعدادات: hostMounted يُركّب Entry دافئاً قبل أول فتح */
    const globalSearchLive =
        overlaysBundle.overlays.showGlobalSearch ||
        overlaysBundle.overlays.searchHostMounted;

    const smartFileLive =
        Boolean(overlaysBundle.dossier.activeFile) &&
        overlaysBundle.dossier.activeFile?.type !== 'execution';

    /** مخزن التنفيذ — keep-alive مثل الدعاوى/المعاملات: مركّب مخفي بعد التسليح؛ الفتح = إظهار */
    const executionArchiveOpen = overlaysBundle.archive.archiveType === 'execution';
    const executionLive =
        (executionArchiveOpen || Boolean(overlaysBundle.overlays.executionArchiveHostMounted)) &&
        !smartFileLive;
    const nonExecArchiveLive = Boolean(
        overlaysBundle.archive.archiveType &&
            overlaysBundle.archive.archiveType !== 'execution',
    );
    const executionDossierLive =
        overlaysBundle.dossier.activeFile?.type === 'execution'
            ? overlaysBundle.dossier.activeFile
            : null;

    /** تسليح hover فقط — تسخين chunks بلا تركيب بوابة مخفية (كانت تومض عند فتح الدعوى) */
    useEffect(() => {
        const onPrime = (event: Event) => {
            const detail = (event as CustomEvent<ExecutionDossierPrimeHostDetail>).detail;
            const raw = detail?.file;
            if (!raw || typeof raw !== 'object') return;
            if ((raw as { type?: unknown }).type !== 'execution') return;
            void import('@/app/runtime/executionWorkspaceWarm')
                .then((m) => m.warmExecutionDossier('intent'))
                .catch(() => undefined);
        };
        window.addEventListener(EXECUTION_DOSSIER_PRIME_HOST_EVENT, onPrime);
        return () => window.removeEventListener(EXECUTION_DOSSIER_PRIME_HOST_EVENT, onPrime);
    }, []);

    const executionDossierOverlayLive = Boolean(executionDossierLive) && !smartFileLive;
    const executionCreateLive = overlaysBundle.executionCreate.isExecutionModalOpen;
    const newCaseLive = overlaysBundle.newCase.isNewCaseModalOpen;
    const consolidationNavLive =
        Boolean(overlaysBundle.dossier.consolidationSpawnNav) ||
        Boolean(overlaysBundle.dossier.caseLinkNav);
    const lawsuitsLive =
        overlaysBundle.overlays.showLawsuitsWorkspace ||
        Boolean(overlaysBundle.overlays.lawsuitsHostMounted);
    const criminalLive = Boolean(overlaysBundle.overlays.criminalDashboardCaseId);

    const closeExecutionArchive = useCallback(
        () =>
            executeOverlaySnapClose({
                commit: () => overlaysBundle.archive.setArchiveType(null),
            }),
        [overlaysBundle.archive],
    );
    const closeExecutionDossier = useCallback(
        () =>
            executeOverlaySnapClose({
                commit: () => overlaysBundle.dossier.setActiveFile(null),
            }),
        [overlaysBundle.dossier],
    );
    const closeExecutionCreate = useCallback(() => {
        executeOverlaySnapClose({
            commit: () => {
                overlaysBundle.executionCreate.setIsExecutionModalOpen(false);
                overlaysBundle.archive.setArchiveType('execution');
            },
        });
    }, [overlaysBundle.archive, overlaysBundle.executionCreate]);

    useLawyerExecutionOverlayEscape({
        archiveOpen: executionArchiveOpen,
        executionFileOpen: Boolean(executionDossierLive),
        executionCreateOpen: executionCreateLive,
        onCloseArchive: closeExecutionArchive,
        onCloseExecutionFile: closeExecutionDossier,
        onCloseExecutionCreate: closeExecutionCreate,
    });

    const closeNonExecArchive = useCallback(
        () =>
            executeOverlaySnapClose({
                commit: () => overlaysBundle.archive.setArchiveType(null),
            }),
        [overlaysBundle.archive],
    );
    useLawyerNonExecArchiveEscape({
        archiveOpen: nonExecArchiveLive,
        onCloseArchive: closeNonExecArchive,
    });

    useBodyScrollLock(true);

    useLayoutEffect(() => {
        markBootPhase('dashboard-main-view');
        try {
            window.dispatchEvent(new Event(DASHBOARD_SHELL_PAINTED_EVENT));
        } catch {
            /* ignore */
        }

        markDashboardInteractiveOnce();
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        unbindFrameGuardRef.current = bindFramePacingGuard();
        const unbindScrollReconcile = bindBodyScrollLockReconcile();

        /* كشف الإقلاع حتى لو التبويب المستعاد ليس الرئيسية (ملف/تقويم) */
        const cancelReady = scheduleBootContentReadyAfterStyles(ensureDeferredAppStylesLoaded, {
            maxWaitMs: isDemoShellAuthBuild() ? 800 : 8_000,
            stylesDeferMs: 0,
        });

        return () => {
            cancelReady();
            unbindFrameGuardRef.current?.();
            unbindFrameGuardRef.current = null;
            unbindScrollReconcile();
        };
    }, []);

    const settingsOpen = Boolean(overlaysBundle.overlays.showSettings);
    const notificationsOpen = Boolean(notificationPanel.isOpen);
    const profileSurfaceActive =
        profileActive || (typeof document !== 'undefined' && isProfileShellSnappedOpen());
    const underlayInert = (settingsOpen || notificationsOpen) && !profileSurfaceActive;
    const underlayRef = useRef<HTMLDivElement | null>(null);

    /* لا تسخين ArchivePortal/FileGrid على interactive — فقط hover/open بعد الكشف */

    useLayoutEffect(() => {
        const el = underlayRef.current;
        if (!el) return;
        // inert عبر DOM — بلا تمرير props يعيد توافق شجرة المنزل داخل flushSync
        if (underlayInert) {
            blurFocusWithin(el);
            el.setAttribute('inert', '');
        } else {
            el.removeAttribute('inert');
        }
    }, [underlayInert]);

    return (
        <LawyerDashboardShell {...shellProps}>
            {notificationsLive ? (
                <NotificationShell
                    isOpen={notificationPanel.isOpen}
                    hostMounted={notificationPanel.hostMounted ?? true}
                    panelSessionKey={notificationPanel.panelSessionKey}
                    userId={notificationPanel.userId}
                    onClose={notificationPanel.onClose}
                    onNavigate={notificationPanel.onNavigate}
                    onOpenPanel={notificationPanel.onOpenPanel}
                />
            ) : null}

            <div ref={underlayRef} data-hami-dashboard-underlay="">
                <Header {...headerProps} />

                <div className={tabStackHidden ? 'hidden' : 'absolute inset-0 z-[1]'}>
                    <DashboardTabSurface
                        active={homeActive}
                        homeStackCover
                        testId="lawyer-dashboard-home-surface"
                    >
                        <LawyerDashboardHomeTab {...homeTabProps} />
                    </DashboardTabSurface>

                    {scheduleShouldMount ? (
                        <DashboardTabSurface
                            active={scheduleActive}
                            preserveLayout
                            testId="lawyer-dashboard-schedule-surface"
                            className="block !bg-[#121212]"
                        >
                            <ScheduleTabHost
                                key={`schedule-tab-${scheduleTabProps.scheduleTabSessionKey ?? 0}`}
                                {...scheduleTabProps}
                                keepAlive={scheduleHostMounted}
                            />
                        </DashboardTabSurface>
                    ) : null}

                    {profileShouldMount ? (
                        <DashboardTabSurface
                            active={profileActive}
                            preserveLayout
                            testId="lawyer-dashboard-profile-surface"
                            className="block"
                        >
                            <ProfileTabHost
                                {...profileTab}
                                keepAlive={profileHostMounted}
                            />
                        </DashboardTabSurface>
                    ) : null}
                </div>
            </div>

            {/* منتدى الزملاء — Entry sync مثل الإعدادات؛ Host دافئ = فتح بلا Suspense/هيكل */}
            {communityLive ? (
                <LawyerDashboardCommunityOverlayEntry
                    shell={overlaysBundle.shell}
                    overlays={overlaysBundle.overlays}
                />
            ) : null}

            {/* مخزن التنفيذ — Entry sync + InstantChrome keep-alive (فتح فوري بلا Suspense/هيكل) */}
            {executionLive ? (
                <ExecutionArchiveInstantChrome
                    open={executionArchiveOpen}
                    onClose={closeExecutionArchive}
                >
                    <LawyerDashboardExecutionOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        archive={overlaysBundle.archive}
                        executionCreate={overlaysBundle.executionCreate}
                    />
                </ExecutionArchiveInstantChrome>
            ) : null}

            {/* أرشيف غير التنفيذ + طلبات العملاء */}
            {nonExecArchiveLive ? (
                <Suspense fallback={null}>
                    <LazyNonExecArchiveOverlayEntry
                        shell={overlaysBundle.shell}
                        data={overlaysBundle.data}
                        archive={overlaysBundle.archive}
                        newCase={overlaysBundle.newCase}
                    />
                </Suspense>
            ) : null}

            {/* إضبارة التنفيذ — تُركَّب فقط عند الفتح الفعلي (لا keep-alive DOM) */}
            {executionDossierOverlayLive && executionDossierLive ? (
                <LawyerDashboardExecutionDossierOverlayEntry
                    dossier={overlaysBundle.dossier}
                    archive={overlaysBundle.archive}
                    file={executionDossierLive as FileData}
                    open
                />
            ) : null}

            {/* إنشاء تنفيذ */}
            {executionCreateLive ? (
                <Suspense fallback={null}>
                    <LazyExecutionCreateOverlayEntry
                        archive={overlaysBundle.archive}
                        executionCreate={overlaysBundle.executionCreate}
                    />
                </Suspense>
            ) : null}

            {/* إضبارة الدعوى SmartFile — Entry متزامن (بلا Suspense مزدوج يومض إطار التنفيذ) */}
            {smartFileLive ? (
                <LawyerDashboardSmartFileOverlayEntry
                    shell={overlaysBundle.shell}
                    data={overlaysBundle.data}
                    dossier={overlaysBundle.dossier}
                    overlays={overlaysBundle.overlays}
                    newCase={overlaysBundle.newCase}
                    nav={overlaysBundle.nav}
                    archive={overlaysBundle.archive}
                />
            ) : null}

            {/* دعوى جديدة */}
            {newCaseLive ? (
                <Suspense fallback={null}>
                    <LazyNewCaseOverlayEntry
                        overlays={overlaysBundle.overlays}
                        newCase={overlaysBundle.newCase}
                        dossier={overlaysBundle.dossier}
                    />
                </Suspense>
            ) : null}

            {/* شريط توحيد/ربط الدعاوى — lazy (مسار نادر؛ لا يثقل stem) */}
            {consolidationNavLive ? (
                <Suspense fallback={null}>
                    <LazyConsolidationNavOverlayEntry dossier={overlaysBundle.dossier} />
                </Suspense>
            ) : null}

            {/* مساحة الدعاوى — Entry sync مثل المستودع؛ Host lazy داخل Entry مع InstantChrome */}
            {lawsuitsLive ? (
                <LawyerDashboardLawsuitsOverlayEntry
                    shell={overlaysBundle.shell}
                    data={overlaysBundle.data}
                    overlays={overlaysBundle.overlays}
                    archive={overlaysBundle.archive}
                    criminalBridge={overlaysBundle.criminalBridge}
                    newCase={overlaysBundle.newCase}
                />
            ) : null}

            {/* الإضبارة الجنائية */}
            {criminalLive ? (
                <Suspense fallback={null}>
                    <LazyCriminalOverlayEntry
                        overlays={overlaysBundle.overlays}
                        criminalBridge={overlaysBundle.criminalBridge}
                    />
                </Suspense>
            ) : null}

            {/* المستودع الذكي — Entry sync مثل الإعدادات/المعاملات؛ Host دافئ؛ بلا Suspense على المسار السعيد */}
            {repositoryLive ? (
                <LawyerDashboardRepositoryOverlayEntry
                    shell={overlaysBundle.shell}
                    data={overlaysBundle.data}
                    overlays={overlaysBundle.overlays}
                    notepad={overlaysBundle.notepad}
                    dossier={overlaysBundle.dossier}
                />
            ) : null}

            {/* مركز المعاملات — Entry sync مثل الإعدادات؛ Host دافئ؛ بلا Suspense/InstantShell على المسار السعيد */}
            {transactionsLive ? (
                <LawyerDashboardTransactionsOverlayEntry
                    shell={overlaysBundle.shell}
                    overlays={overlaysBundle.overlays}
                />
            ) : null}

            {/* مهام الميدان + الأجندة — Entry sync مثل المعاملات؛ Host دافئ؛ chunk الستارة يُسخَّن مسبقاً */}
            {fieldTasksLive ? (
                <LawyerDashboardFieldTasksOverlayEntry
                    data={overlaysBundle.data}
                    overlays={overlaysBundle.overlays}
                />
            ) : null}

            {/* الإعدادات — Entry sync في stem؛ Host دافئ من orchestration؛ الفتح = CSS بلا Suspense */}
            {settingsLive ? (
                <LawyerDashboardSettingsOverlayEntry
                    shell={overlaysBundle.shell}
                    overlays={overlaysBundle.overlays}
                />
            ) : null}

            {/* البحث الشامل — قشرة فورية فقط عند الفتح؛ التسخين الصامت بلا InstantShell مفتوح */}
            {globalSearchLive ? (
                <LawyerDashboardGlobalSearchOverlayEntry
                    shell={overlaysBundle.shell}
                    data={overlaysBundle.data}
                    overlays={overlaysBundle.overlays}
                    nav={overlaysBundle.nav}
                />
            ) : null}

            {postCriticalSurfacesMount ? (
                <>
                    <Suspense fallback={null}>
                        <LazySparkShell
                            clusterScanSources={homeTabProps.clusterScanSources}
                            onNavigateRoute={homeTabProps.onNavigateRoute}
                            hidden={tabStackHidden}
                        />
                    </Suspense>

                    <Suspense fallback={null}>
                        <LazyLawyerDashboardDeferredFeatureSurfaces
                            {...deferredFeatureSurfacesProps}
                        />
                    </Suspense>

                    <Suspense fallback={null}>
                        <LazyLawyerDashboardPostInteractiveRuntime
                            {...postInteractiveRuntimeProps}
                        />
                    </Suspense>
                </>
            ) : null}
        </LawyerDashboardShell>
    );
});
