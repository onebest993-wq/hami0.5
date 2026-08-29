// ✅ SECURITY FIX: Using persistenceRepository.load() instead of .get() - v2.0.2-20260306
import React, { Suspense, lazy } from 'react';
import { LawyerDashboardStemInstantBridge } from '@/app/bootstrap/LawyerDashboardStemInstantBridge';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';
import {
    getLawyerDashboardInnerSync,
    loadLawyerDashboardInner,
} from '@/app/runtime/lawyerDashboardInnerLoader';

const LazyLawyerDashboardInner = lazy(() =>
    loadLawyerDashboardInner().then((m) => ({
        default: m.LawyerDashboardInner,
    })),
);

function LawyerDashboardInnerEntry(props: LawyerDashboardShellProps) {
    const sync = getLawyerDashboardInnerSync();
    if (sync) return <sync.LawyerDashboardInner {...props} />;
    return (
        <Suspense fallback={<LawyerDashboardStemInstantBridge />}>
            <LazyLawyerDashboardInner {...props} />
        </Suspense>
    );
}

/**
 * جذع كسول: يتجاوز Suspense إن سُخِّن Inner من t=0. TTFI بعد paint الشبكة.
 */
export const LawyerDashboard = React.memo(function LawyerDashboard(props: LawyerDashboardShellProps) {
    return <LawyerDashboardInnerEntry {...props} />;
});
