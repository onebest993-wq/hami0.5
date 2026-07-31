import React, { lazy, Suspense, type ComponentProps, type ReactNode } from 'react';
import {
    DecisionCassationAppealsPanel as AppealSurfaceDecisionCassationAppealsPanel,
    DecisionInterventionCassationPanel as AppealSurfaceDecisionInterventionCassationPanel,
    RequestActionComponent as AppealSurfaceRequestActionComponent,
} from './criminalDashboardAppealSurfacePacks';

const LazyLawyerRequestCard = lazy(() =>
    import('./components/LawyerRequestCard').then((m) => ({
        default: m.LawyerRequestCard,
    })),
);

function LedgerPackSuspense({
    children,
    fallback = null,
}: {
    children: ReactNode;
    fallback?: ReactNode;
}) {
    return <Suspense fallback={fallback}>{children}</Suspense>;
}

export function LawyerRequestCard(props: ComponentProps<typeof LazyLawyerRequestCard>) {
    return (
        <LedgerPackSuspense>
            <LazyLawyerRequestCard {...props} />
        </LedgerPackSuspense>
    );
}

export function RequestActionComponent(props: ComponentProps<typeof AppealSurfaceRequestActionComponent>) {
    return <AppealSurfaceRequestActionComponent {...props} />;
}

export function DecisionCassationAppealsPanel(
    props: ComponentProps<typeof AppealSurfaceDecisionCassationAppealsPanel>,
) {
    return <AppealSurfaceDecisionCassationAppealsPanel {...props} />;
}

export function DecisionInterventionCassationPanel(
    props: ComponentProps<typeof AppealSurfaceDecisionInterventionCassationPanel>,
) {
    return <AppealSurfaceDecisionInterventionCassationPanel {...props} />;
}
