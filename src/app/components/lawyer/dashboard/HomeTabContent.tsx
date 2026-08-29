import React, { Suspense } from 'react';
import { HomeMainGrid } from '@/app/components/lawyer/dashboard/HomeMainGrid';
import { LawyerHomeAmbient } from './LawyerHomeAmbient';
import { isBootRevealDone } from '@/app/bootstrap/bootReveal';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { LawyerDashboardHomeTabProps } from './lawyerDashboardHomeTab.types';
import { useHomeTabContentModel } from './useHomeTabContentModel';
import { HomeTabWidgetSlot } from './HomeTabWidgetSlot';

const LazyHomeForumSignalsIsland = lazyWithRetry(() =>
    import('./HomeForumSignalsIsland').then((m) => ({
        default: m.default as unknown as LazyComponent,
    })),
);

const LazyCommandCenterOverlays = lazyWithRetry(() =>
    import('@/app/components/lawyer/dashboard/CommandCenterOverlays').then((m) => ({
        default: m.CommandCenterOverlays as unknown as LazyComponent,
    })),
);

export function HomeTabContent(props: LawyerDashboardHomeTabProps) {
    const model = useHomeTabContentModel(props);

    return (
        <div
            className="hami-home-page-column relative isolate"
            data-testid="lawyer-home-tab-content"
        >
            <LawyerHomeAmbient wallpaperActive={model.hasWallpaper} />
            {model.lazyIslandsReady && isBootRevealDone() && model.forumSignalsEnabled ? (
                <Suspense fallback={null}>
                    <LazyHomeForumSignalsIsland
                        userId={model.userId}
                        enabled={model.forumSignalsEnabled}
                        onUnreadCount={model.onForumUnreadCount}
                    />
                </Suspense>
            ) : null}
            {model.lazyIslandsReady && isBootRevealDone() ? (
                <Suspense fallback={null}>
                    <LazyCommandCenterOverlays
                        userId={model.dockAuthUserId}
                        actions={model.dockActions}
                        onNavigateRoute={model.onNavigateRoute}
                    />
                </Suspense>
            ) : null}
            <HomeMainGrid
                visible={model.visible}
                slots={model.slots}
                announcePaint={model.announceBootReveal}
                renderSlot={(slot) => <HomeTabWidgetSlot slot={slot} model={model} />}
            />
        </div>
    );
}
