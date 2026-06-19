import React, { Suspense } from 'react';
import { LawyerDashboardShell } from '@/app/components/lawyer/dashboard/LawyerDashboardShell';
import { LawyerDashboardOverlaysHost } from '@/app/components/lawyer/dashboard/LawyerDashboardOverlaysHost';
import { LawyerDashboardHomeTab } from '@/app/components/lawyer/dashboard/LawyerDashboardHomeTab';
import { LawyerDashboardScheduleTab } from '@/app/components/lawyer/dashboard/LawyerDashboardScheduleTab';
import { LawyerDashboardProfileTab } from '@/app/components/lawyer/dashboard/LawyerDashboardProfileTab';
import { Header } from '@/app/components/lawyer/LawyerDashboardParts/components/Header';
import { NOTIFICATION_PANEL_FALLBACK } from '@/app/components/lawyer/LawyerDashboardParts/constants';
import {
    prefetchGlobalSearchOverlay,
    prefetchNotificationPanel,
    prefetchRoyalLawyerProfile,
    LazyNotificationPanel,
} from '@/app/utils/lazyComponents';
import type { LawyerDashboardCoreViewModel } from '@/app/hooks/lawyerDashboard/useLawyerDashboardCore';

type LawyerDashboardMainViewProps = {
    model: Extract<LawyerDashboardCoreViewModel, { status: 'ready' }>;
};

export function LawyerDashboardMainView({ model }: LawyerDashboardMainViewProps) {
    const {
        shellProps,
        notificationPanel,
        headerProps,
        homeTabProps,
        scheduleTabProps,
        profileTabVisible,
        onProfileBack,
        tabStackHidden,
        overlaysHostProps,
    } = model;

    return (
        <LawyerDashboardShell {...shellProps}>
            {notificationPanel.mounted && (
                <Suspense fallback={notificationPanel.isOpen ? NOTIFICATION_PANEL_FALLBACK : null}>
                    <LazyNotificationPanel
                        isOpen={notificationPanel.isOpen}
                        onClose={notificationPanel.onClose}
                        userId={notificationPanel.userId}
                        onNavigate={notificationPanel.onNavigate}
                    />
                </Suspense>
            )}

            <Header
                {...headerProps}
                onProfilePointerEnter={() => prefetchRoyalLawyerProfile()}
                onSearchPointerEnter={() => prefetchGlobalSearchOverlay()}
                onNotificationsPointerEnter={() => prefetchNotificationPanel()}
            />

            <div className={tabStackHidden ? 'hidden' : 'flex-1 relative min-h-screen'}>
                <LawyerDashboardHomeTab {...homeTabProps} />
                <LawyerDashboardScheduleTab {...scheduleTabProps} />
                <LawyerDashboardProfileTab visible={profileTabVisible} onBack={onProfileBack} />
            </div>

            <LawyerDashboardOverlaysHost {...overlaysHostProps} />
        </LawyerDashboardShell>
    );
}
