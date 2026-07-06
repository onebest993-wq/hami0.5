import React, { Suspense } from 'react';
import type { LawyerDashboardOverlaysHostProps } from '../lawyerDashboardOverlaysHostBundles';
import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';

const LazyLawyerDashboardCriminalOverlayEntry = lazyWithRetry(() =>
    import('./LawyerDashboardCriminalOverlayEntry').then((m) => ({
        default: m.LawyerDashboardCriminalOverlayEntry as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardGlobalSearchOverlayEntry = lazyWithRetry(() =>
    import('./LawyerDashboardGlobalSearchOverlayEntry').then((m) => ({
        default: m.LawyerDashboardGlobalSearchOverlayEntry as unknown as LazyComponent,
    })),
);

const LazyLawyerDashboardCommunityOverlayEntry = lazyWithRetry(() =>
    import('./LawyerDashboardCommunityOverlayEntry').then((m) => ({
        default: m.LawyerDashboardCommunityOverlayEntry as unknown as LazyComponent,
    })),
);

export function LawyerDashboardDiscoveryOverlays({
    shell,
    data,
    overlays,
    criminalBridge,
    nav,
}: Pick<
    LawyerDashboardOverlaysHostProps,
    'shell' | 'data' | 'overlays' | 'criminalBridge' | 'nav'
>) {
    const { showGlobalSearch, criminalDashboardCaseId, showCommunity } = overlays;

    return (
        <>
            {criminalDashboardCaseId ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardCriminalOverlayEntry
                        overlays={overlays}
                        criminalBridge={criminalBridge}
                    />
                </Suspense>
            ) : null}

            {showGlobalSearch ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardGlobalSearchOverlayEntry
                        shell={shell}
                        data={data}
                        overlays={overlays}
                        nav={nav}
                    />
                </Suspense>
            ) : null}

            {showCommunity ? (
                <Suspense fallback={null}>
                    <LazyLawyerDashboardCommunityOverlayEntry shell={shell} overlays={overlays} />
                </Suspense>
            ) : null}
        </>
    );
}
