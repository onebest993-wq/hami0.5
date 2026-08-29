import React from 'react';

/** هيكل خفيف بكل testids القياس — داخل boot-runtime chunk.
 * بلا scroll-root/page-column عمداً: تضخيم الجذع يثقل المسار الحرج قبل Minimal.
 */
function LawyerDashboardHomeTabBootSkeleton(): React.ReactElement {
    return (
        <div
            className="hami-home-main-zone relative z-[1] hami-shell-gutter-x hami-home-main-zone-pad min-h-[40vh]"
            data-testid="home-main-zone"
            aria-busy="true"
            aria-label="جاري تحميل الصفحة الرئيسية"
        >
            <div data-testid="home-bottom-chrome" className="hami-home-bottom-chrome" aria-hidden />
        </div>
    );
}

/**
 * جسر Suspense فقط — بلا first-tab/interactive/lawyer-dashboard-ready
 * حتى لا تُعلَن الجاهزية قبل طلاء Minimal للمنزل.
 */
export function LawyerDashboardStemInstantBridge(): React.ReactElement {
    return (
        <div
            className="min-h-screen w-full hami-board-canvas-bg"
            data-testid="lawyer-dashboard-stem"
            aria-busy="true"
            aria-label="تهيئة لوحة المحامي"
        >
            <div className="absolute inset-0 z-[1]" data-testid="lawyer-dashboard-home-surface">
                <LawyerDashboardHomeTabBootSkeleton />
            </div>
        </div>
    );
}
