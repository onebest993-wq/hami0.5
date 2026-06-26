// @ts-nocheck
import React, { Suspense } from 'react';
import {
    EXEC_OVERLAY_LAZY_FALLBACK,
    LazyExecutionSolidaryAndEvictionFollowupModalsContainer,
} from '@/app/components/lawyer/ExecutionDashboard/executionDashboardLazyShell';

export type ExecutionDashboardSolidaryEvictionOverlaysProps = Record<string, unknown>;

/** modals التضامن/إخلاء — chunk lazy منفصل */
export function ExecutionDashboardSolidaryEvictionOverlays(
    props: ExecutionDashboardSolidaryEvictionOverlaysProps,
) {
    const {
        showSolidaryCoerciveTargetModal,
        showEvictionExpenseModal,
        showEvictionLawyerFeeModal,
        showEvictionResidentialGraceModal,
    } = props;

    if (
        !showSolidaryCoerciveTargetModal &&
        !showEvictionExpenseModal &&
        !showEvictionLawyerFeeModal &&
        !showEvictionResidentialGraceModal
    ) {
        return null;
    }

    return (
        <Suspense fallback={EXEC_OVERLAY_LAZY_FALLBACK}>
            <LazyExecutionSolidaryAndEvictionFollowupModalsContainer {...props} />
        </Suspense>
    );
}
