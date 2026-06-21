import React, { Suspense } from 'react';

import { lazyWithRetry, type LazyComponent } from '@/app/utils/lazy/lazyWithRetry';
import type { LawyerDashboardShellProps } from '@/app/components/lawyer/dashboard/LawyerDashboardQuantumShell';

const LawyerDashboardLazy = lazyWithRetry(() =>
    import('@/app/components/lawyer/LawyerDashboard').then((m) => ({
        default: m.LawyerDashboard as unknown as LazyComponent,
    })),
);

const LAWYER_SHELL_FALLBACK = (
    <div className="min-h-screen bg-[#000000] flex items-center justify-center">
        <div className="text-[#E6C673] text-sm font-bold animate-pulse">جاري التحميل...</div>
    </div>
);

/** Prod: lazy chunk — لا يُضمَّن في index (كان static import يضخّم المسار الحرج). */
export function LawyerDashboardGate(props: LawyerDashboardShellProps) {
    return (
        <Suspense fallback={LAWYER_SHELL_FALLBACK}>
            <LawyerDashboardLazy {...props} />
        </Suspense>
    );
}
