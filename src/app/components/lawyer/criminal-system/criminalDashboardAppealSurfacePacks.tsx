import React, { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';

const loadAppealSurfaceModule = () => import('./criminalDashboardAppealSurfaceModule');

const LazyDecisionCardAppealFooter = lazy(() =>
    loadAppealSurfaceModule().then((m) => ({
        default: m.DecisionCardAppealFooter,
    })),
);

const LazyRequestActionComponent = lazy(() =>
    loadAppealSurfaceModule().then((m) => ({
        default: m.RequestActionComponent,
    })),
);

const LazyDecisionCassationAppealsPanel = lazy(() =>
    loadAppealSurfaceModule().then((m) => ({
        default: m.DecisionCassationAppealsPanel,
    })),
);

const LazyDecisionInterventionCassationPanel = lazy(() =>
    loadAppealSurfaceModule().then((m) => ({
        default: m.DecisionInterventionCassationPanel,
    })),
);

function AppealSurfaceSuspense({
    children,
    fallback = null,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function DecisionCardAppealFooter(props: ComponentProps<typeof LazyDecisionCardAppealFooter>) {
    return (
        <AppealSurfaceSuspense>
            <LazyDecisionCardAppealFooter {...props} />
        </AppealSurfaceSuspense>
    );
}

export function RequestActionComponent(props: ComponentProps<typeof LazyRequestActionComponent>) {
    return (
        <AppealSurfaceSuspense>
            <LazyRequestActionComponent {...props} />
        </AppealSurfaceSuspense>
    );
}

export function DecisionCassationAppealsPanel(
    props: ComponentProps<typeof LazyDecisionCassationAppealsPanel>,
) {
    return (
        <AppealSurfaceSuspense>
            <LazyDecisionCassationAppealsPanel {...props} />
        </AppealSurfaceSuspense>
    );
}

export function DecisionInterventionCassationPanel(
    props: ComponentProps<typeof LazyDecisionInterventionCassationPanel>,
) {
    return (
        <AppealSurfaceSuspense>
            <LazyDecisionInterventionCassationPanel {...props} />
        </AppealSurfaceSuspense>
    );
}
