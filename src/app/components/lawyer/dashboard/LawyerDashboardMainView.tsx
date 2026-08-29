import React, {
    Suspense,
    memo,
    useEffect,
    useLayoutEffect,
    useState,
} from 'react';
import { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import {
    BOOT_REVEAL_DONE_EVENT,
    onBootContentReady,
    isDemoShellAuthBuild,
    isBootRevealDone,
} from '@/app/bootstrap/bootReveal';
import { onLawyerDashboardFirstTabOpen } from '@/app/bootstrap/lawyerDashboardFirstTabMark';
import { DashboardTabSurface } from '@/app/components/lawyer/dashboard/schedule/DashboardTabSurface';
import { ScheduleRadarPaintGate } from '@/app/components/lawyer/dashboard/schedule/ScheduleRadarPaintGate';
import { ProfilePagePaintGate } from '@/app/components/lawyer/dashboard/profile/ProfilePagePaintGate';
import type { FileData } from '@/app/components/lawyer/LawyerShared';
import { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import {
    isScheduleShellSnappedOpen,
    SCHEDULE_SHELL_SNAP_EVENT,
    type ScheduleShellSnapDetail,
} from '@/app/services/schedule/scheduleShellSnap';
import { useLawyerDashboardMainViewChrome } from '@/app/components/lawyer/dashboard/useLawyerDashboardMainViewChrome';
import { LawyerDashboardMainViewOverlayHosts } from '@/app/components/lawyer/dashboard/LawyerDashboardMainViewOverlayHosts';
import {
    LazyLawyerDashboardPostInteractiveRuntime,
    LazyLawyerDashboardDeferredFeatureSurfaces,
    LazyLawyerDashboardPreDockFeatureSurfaces,
    LazyLawyerDashboardNavigationIsland,
    LazyProfileTabHost,
    LazyScheduleTabHost,
    LazyNotificationShell,
} from '@/app/components/lawyer/dashboard/LawyerDashboardMainView.lazyEntries';

type LawyerDashboardMainViewProps = {
    model: Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;
};

/**
 * جذع لوحة المحامي — تبويبات حية + بوابات تركيب الطبقات.
 * تعريفات Lazy: `.lazyEntries` — JSX الطبقات: `OverlayHosts` — كروم Escape/inert: الخطاف.
 */
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
        preDockFeatureSurfacesProps,
        navigationSurfacesProps,
    } = model;

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

    /** منتدى/تقويم/مستودع — chunk كسول بعد first-tab-open (لا onBootContentReady) */
    const [preDockSurfacesMount, setPreDockSurfacesMount] = useState(
        () =>
            preDockFeatureSurfacesProps.earlyArm ||
            preDockFeatureSurfacesProps.forceArm,
    );
    useLayoutEffect(() => {
        if (preDockFeatureSurfacesProps.forceArm) setPreDockSurfacesMount(true);
    }, [preDockFeatureSurfacesProps.forceArm]);
    useEffect(() => {
        if (preDockSurfacesMount) return;
        return onLawyerDashboardFirstTabOpen(() => {
            queueMicrotask(() => setPreDockSurfacesMount(true));
        });
    }, [preDockSurfacesMount]);

    /* بايتات مخزن التنفيذ فور طلاء الشبكة — أثناء نافذة CSS، بلا تركيب Host */
    useEffect(() => {
        return onBootContentReady(() => {
            void import('@/app/runtime/hubArchiveAfterHomePaint')
                .then((m) => m.prefetchHubArchivesAfterHomePaint())
                .catch(() => undefined);
        });
    }, []);

    /* مداخل الطبقات بعد الكشف — لا تنافس بايتات المخزن أثناء uncover */
    useEffect(() => {
        let cancelWarm: (() => void) | undefined;
        const startWarm = () => {
            void import('@/app/runtime/overlayEntryChunks')
                .then((m) => {
                    cancelWarm = m.warmOverlayEntryChunks();
                })
                .catch(() => undefined);
        };
        if (isBootRevealDone()) {
            startWarm();
            return () => cancelWarm?.();
        }
        window.addEventListener(BOOT_REVEAL_DONE_EVENT, startWarm, { once: true });
        return () => {
            window.removeEventListener(BOOT_REVEAL_DONE_EVENT, startWarm);
            cancelWarm?.();
        };
    }, []);

    const scheduleActive = scheduleTabProps.visible;
    const [scheduleAttrOpen, setScheduleAttrOpen] = useState(() => isScheduleShellSnappedOpen());
    useLayoutEffect(() => {
        const onSnap = (event: Event) => {
            const detail = (event as CustomEvent<ScheduleShellSnapDetail>).detail;
            setScheduleAttrOpen(Boolean(detail?.open));
        };
        window.addEventListener(SCHEDULE_SHELL_SNAP_EVENT, onSnap);
        setScheduleAttrOpen(isScheduleShellSnappedOpen());
        return () => window.removeEventListener(SCHEDULE_SHELL_SNAP_EVENT, onSnap);
    }, []);
    /** ستارة html أو تبويب React — أيهما يكفي لقشرة InstantChrome وسطح قابل للرجوع */
    const schedulePaintOpen = scheduleActive || scheduleAttrOpen;
    /** visible يأتي من isLawyerDashboardHomeStackTab — يبقى صحيحاً تحت الملف */
    const homeActive = homeTabProps.visible;
    /** Host عند الفتح أو ستارة snap أو keepAlive بعد زيارة التبويب — ليس عند الإقلاع */
    const scheduleShouldMount = scheduleHostMounted || schedulePaintOpen;
    const profileActive = profileTab.visible;
    const profileShouldMount = profileHostMounted || profileActive;
    const communityLive =
        overlaysBundle.overlays.showCommunity || overlaysBundle.overlays.communityHostMounted;
    const repositoryLive =
        overlaysBundle.overlays.isNotepadOpen ||
        overlaysBundle.overlays.repositoryHostMounted;
    const transactionsLive = overlaysBundle.overlays.showTransactions;
    const fieldTasksSurfaceOpen =
        overlaysBundle.overlays.fieldTasksSheetOpen ||
        overlaysBundle.overlays.showTasksManager;
    const fieldTasksLive =
        fieldTasksSurfaceOpen ||
        overlaysBundle.overlays.fieldTasksHostMounted ||
        overlaysBundle.overlays.fieldTasksManagerHostMounted;
    const notificationsLive = Boolean(notificationPanel.userId);
    /* Host عند الفتح حتى الإغلاق — ليس فور الهوية */
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
            ? (overlaysBundle.dossier.activeFile as FileData)
            : null;

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

    const { tabStackInertRef, closeExecutionArchive, closeExecutionCreate, executionCreateCloseGuard } =
        useLawyerDashboardMainViewChrome({
        overlaysBundle,
        notificationPanel,
        profileActive,
        executionArchiveOpen,
        executionDossierLive,
        executionCreateLive,
        nonExecArchiveLive,
    });

    return (
        <LawyerDashboardShell {...shellProps}>
            {notificationsLive ? (
                <Suspense fallback={null}>
                    <LazyNotificationShell
                        isOpen={notificationPanel.isOpen}
                        hostMounted={notificationPanel.hostMounted ?? true}
                        userId={notificationPanel.userId}
                        onClose={notificationPanel.onClose}
                        onNavigate={notificationPanel.onNavigate}
                        onOpenPanel={notificationPanel.onOpenPanel}
                    />
                </Suspense>
            ) : null}

            <div data-hami-dashboard-underlay="">
                <Header {...headerProps} />

                <div
                    ref={tabStackInertRef}
                    data-hami-dashboard-tab-stack=""
                    className={tabStackHidden ? 'hidden' : 'absolute inset-0 z-[1]'}
                >
                    <DashboardTabSurface
                        active={homeActive}
                        homeStackCover
                        testId="lawyer-dashboard-home-surface"
                    >
                        <LawyerDashboardHomeTab announceBootReveal {...homeTabProps} />
                    </DashboardTabSurface>

                    {scheduleShouldMount ? (
                        <DashboardTabSurface
                            active={schedulePaintOpen}
                            preserveLayout
                            testId="lawyer-dashboard-schedule-surface"
                            className="block !bg-[#0A0F1C]"
                        >
                            <ScheduleRadarPaintGate
                                open={schedulePaintOpen}
                                onBack={scheduleTabProps.onBackToHome}
                            >
                                <LazyScheduleTabHost
                                    key={`schedule-tab-${scheduleTabProps.scheduleTabSessionKey ?? 0}`}
                                    {...scheduleTabProps}
                                    visible={schedulePaintOpen}
                                    keepAlive={scheduleHostMounted || schedulePaintOpen}
                                />
                            </ScheduleRadarPaintGate>
                        </DashboardTabSurface>
                    ) : null}

                    {profileShouldMount ? (
                        <DashboardTabSurface
                            active={profileActive}
                            preserveLayout
                            testId="lawyer-dashboard-profile-surface"
                            className="block"
                        >
                            <ProfilePagePaintGate
                                open={profileActive}
                                userId={notificationPanel.userId}
                                onBack={profileTab.onBack}
                            >
                                <Suspense fallback={null}>
                                    <LazyProfileTabHost
                                        {...profileTab}
                                        keepAlive={profileHostMounted}
                                    />
                                </Suspense>
                            </ProfilePagePaintGate>
                        </DashboardTabSurface>
                    ) : null}
                </div>
            </div>

            <LawyerDashboardMainViewOverlayHosts
                overlaysBundle={overlaysBundle}
                communityLive={communityLive}
                executionLive={executionLive}
                executionArchiveOpen={executionArchiveOpen}
                nonExecArchiveLive={nonExecArchiveLive}
                executionDossierOverlayLive={executionDossierOverlayLive}
                executionDossierLive={executionDossierLive}
                executionCreateLive={executionCreateLive}
                smartFileLive={smartFileLive}
                newCaseLive={newCaseLive}
                consolidationNavLive={consolidationNavLive}
                lawsuitsLive={lawsuitsLive}
                criminalLive={criminalLive}
                repositoryLive={repositoryLive}
                transactionsLive={transactionsLive}
                fieldTasksLive={fieldTasksLive}
                globalSearchLive={globalSearchLive}
                closeExecutionArchive={closeExecutionArchive}
                closeExecutionCreate={closeExecutionCreate}
                executionCreateCloseGuard={executionCreateCloseGuard}
            />

            {preDockSurfacesMount ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardPreDockFeatureSurfaces
                        {...preDockFeatureSurfacesProps}
                    />
                </Suspense>
            ) : null}

            {/* تنقّل اللوحة — لا يُحمَّل المقطع قبل first-tab (كان يتسابق مع طلاء المنزل) */}
            {preDockSurfacesMount ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardNavigationIsland {...navigationSurfacesProps} />
                </Suspense>
            ) : null}

            {postCriticalSurfacesMount ? (
                <>
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
