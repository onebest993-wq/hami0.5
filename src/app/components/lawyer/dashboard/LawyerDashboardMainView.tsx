import React, { memo, Suspense, useLayoutEffect, useRef } from 'react';
import { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { LawyerDashboardOverlaysHost } from '@/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import { NotificationShell } from '@/app/components/lawyer/NotificationPanel/NotificationShell';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';
import { markBootPhase, reportBootTimeline } from '@/app/bootstrap/bootMetrics';
import { removeStaticBootShell } from '@/app/bootstrap/bootStaticShell';
import { bindFramePacingGuard } from '@/app/runtime/framePacingGuard';
import { ScheduleTabFallback, LawyerProfileTabLoadingFallback } from '@/app/components/lawyer/LawyerDashboardParts/LazyFallback';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardHomeTab = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardHomeTab').then((m) => ({
        default: m.LawyerDashboardHomeTab as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardScheduleTab = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab').then((m) => ({
        default: m.LawyerDashboardScheduleTab as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardProfileTab = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/LawyerDashboardProfileTab').then((m) => ({
        default: m.LawyerDashboardProfileTab as unknown as LazyComponent,
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

    useLayoutEffect(() => {
        markBootPhase('dashboard-interactive');
        reportBootTimeline();
        removeStaticBootShell();
        delete document.documentElement.dataset.hamiInitialBoot;
        window.dispatchEvent(new Event('hami:dashboard-interactive'));
        unbindFrameGuardRef.current = bindFramePacingGuard();
        return () => {
            unbindFrameGuardRef.current?.();
            unbindFrameGuardRef.current = null;
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
                {homeTabProps.visible ? (
                    <Suspense fallback={<HomeTabSuspenseFallback />}>
                        <LazyLawyerDashboardHomeTab {...homeTabProps} />
                    </Suspense>
                ) : null}
                {scheduleTabProps.visible ? (
                    <Suspense fallback={ScheduleTabFallback}>
                        <LazyLawyerDashboardScheduleTab {...scheduleTabProps} />
                    </Suspense>
                ) : null}
                {profileTab.visible ? (
                    <Suspense fallback={<LawyerProfileTabLoadingFallback onBack={profileTab.onBack} />}>
                        <LazyLawyerDashboardProfileTab {...profileTab} />
                    </Suspense>
                ) : null}
            </div>

            <LawyerDashboardOverlaysHost {...overlaysHostProps} />
        </LawyerDashboardShell>
        </div>
    );
});
