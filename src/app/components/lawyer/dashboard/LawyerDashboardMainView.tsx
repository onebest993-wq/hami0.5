import React, { memo, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { LawyerDashboardOverlaysHost } from '@/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import { NotificationShell } from '@/app/components/lawyer/NotificationPanel/NotificationShell';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { bindFramePacingGuard } from '@/app/runtime/framePacingGuard';
import { bindBodyScrollLockReconcile } from '@/app/utils/bodyScrollLock';
import { ScheduleTabHost } from '@/app/components/lawyer/dashboard/schedule/ScheduleTabHost';
import { ProfileTabHost } from '@/app/components/lawyer/dashboard/profile/ProfileTabHost';
import { DashboardTabSurface } from '@/app/components/lawyer/dashboard/schedule/DashboardTabSurface';
import {
    useKeepAliveIdleRelease,
    getLatchedTabIdleReleaseMs,
} from '@/app/hooks/lawyerDashboard/useKeepAliveIdleRelease';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardHomeTab = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardHomeTab').then((m) => ({
        default: m.LawyerDashboardHomeTab as unknown as LazyComponent,
    })),
);

type LawyerDashboardMainViewProps = {
    model: Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;
};

function HomeTabSuspenseFallback() {
    return (
        <div
            className="absolute inset-x-0 top-[84px] z-[1] hami-shell-gutter-x pt-2"
            data-testid="lawyer-home-tab"
            aria-busy="true"
            aria-label="تحميل الرئيسية"
        >
            <div className="hami-shell-container w-full mx-auto space-y-3.5">
                <div className="w-full h-[52px] rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 animate-pulse" />
                <div className="w-full min-h-[280px] rounded-[1.625rem] border border-white/[0.06] bg-[#0D0D1A]/40 animate-pulse" />
            </div>
        </div>
    );
}

export const LawyerDashboardMainView = memo(function LawyerDashboardMainView({
    model,
}: LawyerDashboardMainViewProps) {
    const {
        shellProps,
        notificationPanel,
        headerProps,
        homeTabProps,
        scheduleTabProps,
        profileTab,
        tabStackHidden,
        overlaysHostProps,
    } = model;

    const unbindFrameGuardRef = useRef<(() => void) | null>(null);
    const [scheduleLatched, setScheduleLatched] = useState(false);
    const [profileLatched, setProfileLatched] = useState(false);

    const homeActive = homeTabProps.visible;
    const scheduleActive = scheduleTabProps.visible;
    const profileActive = profileTab.visible;
    const profileShouldMount = profileLatched || profileActive;

    useLayoutEffect(() => {
        if (profileActive) setProfileLatched(true);
    }, [profileActive]);

    useEffect(() => {
        if (scheduleActive) setScheduleLatched(true);
    }, [scheduleActive]);

    useKeepAliveIdleRelease(
        scheduleActive,
        () => setScheduleLatched(false),
        getLatchedTabIdleReleaseMs(),
    );

    useKeepAliveIdleRelease(
        profileActive,
        () => setProfileLatched(false),
        getLatchedTabIdleReleaseMs(),
    );

    useLayoutEffect(() => {
        markBootPhase('dashboard-interactive');
        reportBootTimeline();
        delete document.documentElement.dataset.hamiInitialBoot;
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        unbindFrameGuardRef.current = bindFramePacingGuard();
        const unbindScrollReconcile = bindBodyScrollLockReconcile();
        return () => {
            unbindFrameGuardRef.current?.();
            unbindFrameGuardRef.current = null;
            unbindScrollReconcile();
        };
    }, []);

    return (
        <div data-testid="lawyer-dashboard-ready">
            <LawyerDashboardShell {...shellProps}>
                <NotificationShell
                    isOpen={notificationPanel.isOpen}
                    panelSessionKey={notificationPanel.panelSessionKey}
                    userId={notificationPanel.userId}
                    onClose={notificationPanel.onClose}
                    onNavigate={notificationPanel.onNavigate}
                    onOpenPanel={notificationPanel.onOpenPanel}
                />

                <Header {...headerProps} />

                <div className={tabStackHidden ? 'hidden' : 'relative min-h-0'}>
                    <DashboardTabSurface active={homeActive} testId="lawyer-dashboard-home-surface">
                        <Suspense fallback={<HomeTabSuspenseFallback />}>
                            <LazyLawyerDashboardHomeTab {...homeTabProps} />
                        </Suspense>
                    </DashboardTabSurface>

                    {scheduleLatched ? (
                        <DashboardTabSurface
                            active={scheduleActive}
                            testId="lawyer-dashboard-schedule-surface"
                            className="block"
                        >
                            <ScheduleTabHost
                                key={`schedule-tab-${scheduleTabProps.scheduleTabSessionKey ?? 0}`}
                                {...scheduleTabProps}
                            />
                        </DashboardTabSurface>
                    ) : null}

                    {profileShouldMount ? (
                        <DashboardTabSurface active={profileActive} testId="lawyer-dashboard-profile-surface">
                            <ProfileTabHost
                                key={`lawyer-profile-tab-${profileTab.sessionKey}`}
                                {...profileTab}
                            />
                        </DashboardTabSurface>
                    ) : null}
                </div>

                <LawyerDashboardOverlaysHost {...overlaysHostProps} />
            </LawyerDashboardShell>
        </div>
    );
});
