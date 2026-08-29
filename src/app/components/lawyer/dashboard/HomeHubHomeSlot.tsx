import React, { Suspense, useEffect } from 'react';
import { HomeHubErrorBoundary } from '@/app/components/lawyer/dashboard/HomeHubErrorBoundary';
import { HomeHubCardSkeleton } from '@/app/components/lawyer/dashboard/HomeHubCardSkeleton';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import {
    getCachedLawyerHomeHubCard,
    loadLawyerHomeHubCardModule,
} from '@/app/runtime/homeHubCardLoader';
import type { HomeMainGridSlot } from '@/app/components/lawyer/dashboard/useHomeMainGridSlots';
import type { HomeTabContentModel } from '@/app/components/lawyer/dashboard/useHomeTabContentModel';
import {
    consumePendingHomeHubEntryOpen,
    subscribeHomeHubEntryOpen,
} from '@/app/services/alerts/homeHubEntryOpen';

const LazyLawyerHomeHubCard = lazyWithRetry(() =>
    loadLawyerHomeHubCardModule().then((m) => ({
        default: m.LawyerHomeHubCard as unknown as LazyComponent,
    })),
);

function shouldReduceHomeHubScrollMotion(): boolean {
    if (typeof document === 'undefined') return true;
    const root = document.documentElement;
    if (
        root.dataset.hamiReduceMotion === '1' ||
        root.dataset.hamiAnimations === '0' ||
        root.dataset.hamiLite === '1'
    ) {
        return true;
    }
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch {
        return false;
    }
}

function scrollHomeHubCardIntoView() {
    document
        .querySelector<HTMLElement>('[data-testid="home-hub-card"], [data-testid="home-hub-card-skeleton"]')
        ?.scrollIntoView({
            block: 'start',
            behavior: shouldReduceHomeHubScrollMotion() ? 'auto' : 'smooth',
        });
}

/**
 * فتحة البطاقة العلوية.
 * إن حُمّل المقطع تحت الغطاء: تركيب متزامن بلا هيكل. وإلا lazy مرة واحدة — بلا useState يُعيد mount.
 */
export function HomeHubHomeSlot({
    slot,
    model,
}: {
    slot: HomeMainGridSlot;
    model: HomeTabContentModel;
}) {
    const ov = slot.override;

    useEffect(() => {
        if (consumePendingHomeHubEntryOpen()) scrollHomeHubCardIntoView();
        return subscribeHomeHubEntryOpen(scrollHomeHubCardIntoView);
    }, []);

    useEffect(() => {
        void loadLawyerHomeHubCardModule();
    }, []);

    const hubProps = {
        lawyerId: model.calendarUserId,
        shellAuthUserId: model.dockAuthUserId,
        clusterScanSources: model.clusterScanSources,
        secretaryAlerts: model.secretaryAlerts,
        alertsLoading: model.alertsLoading,
        alertsError: model.alertsError,
        onNavigateRoute: model.onNavigateRoute,
        onOpenEntity: model.onOpenEntity,
        onDismissAlert: model.onDismissAlert,
        blockOverride: ov,
        themePrimary: model.themePrimary,
    };

    const CachedHub = getCachedLawyerHomeHubCard();
    const sizeClass =
        ov?.size === 'compact'
            ? 'hami-home-block-compact'
            : ov?.size === 'large'
              ? 'hami-home-block-large'
              : '';

    return (
        <HomeHubErrorBoundary>
            {CachedHub ? (
                <CachedHub {...hubProps} />
            ) : (
                <Suspense fallback={<HomeHubCardSkeleton className={sizeClass} />}>
                    <LazyLawyerHomeHubCard {...hubProps} />
                </Suspense>
            )}
        </HomeHubErrorBoundary>
    );
}
