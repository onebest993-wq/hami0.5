import React, { Suspense, lazy } from 'react';
import { markDashboardInteractiveOnce } from '@/app/bootstrap/dashboardInteractiveMark';
import type { LawyerDashboardShellProps } from './LawyerDashboardQuantumShell';

export type LawyerDashboardInnerProps = LawyerDashboardShellProps;

/**
 * قشرة TTFI رقيقة: mark فوري ثم runtime lazy.
 * بعد mark: تسخين Runtime + MainView + HomeTab فوراً لتقليص first-tab / الانتظار الظاهر.
 */
const LazyLawyerDashboardInnerRuntime = lazy(() =>
    import('./LawyerDashboardInnerRuntime').then((m) => ({
        default: m.LawyerDashboardInnerRuntime,
    })),
);

function warmPostInteractiveDashboardChunks(): void {
    /* HomeTab أولاً — أولوية شبكة لمسار first-tab */
    void import('./LawyerDashboardHomeTab');
    void import('./LawyerDashboardInnerRuntime');
    void import('./LawyerDashboardMainView');
}

/** يبدأ مع تقييم chunk اللوحة — قبل أول commit لـ Inner (بلا منافسة مع تحميل Gate). */
if (typeof window !== 'undefined') {
    warmPostInteractiveDashboardChunks();
}

export function LawyerDashboardInner(props: LawyerDashboardInnerProps) {
    markDashboardInteractiveOnce();
    warmPostInteractiveDashboardChunks();

    return (
        <Suspense
            fallback={
                <div
                    className="min-h-screen w-full bg-[#0a0f1c]"
                    data-testid="lawyer-inner-runtime-suspense"
                    aria-busy
                    aria-label="جاري فتح اللوحة"
                />
            }
        >
            <LazyLawyerDashboardInnerRuntime {...props} />
        </Suspense>
    );
}
