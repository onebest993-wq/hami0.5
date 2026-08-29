import React, { Suspense } from 'react';
import { LazyLegalCodesTab } from './criminalDashboardLazyRegistry';
import { CriminalDashboardLazySurfaceFallback } from './criminalDashboardRuntimeShells';

/**
 * لوحة تبويب القوانين — مستخرَجة حرفياً من CriminalDashboardDossierBody.
 * التبويبات الكسولة المطلوبة في الاختبارات البنيوية تبقى في المضيف.
 */
export function CriminalDossierLegalCodesPanel({ showJuvenileLawTab }: { showJuvenileLawTab: boolean }) {
    return (
        <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[200px]" />}>
            <LazyLegalCodesTab showJuvenileLawTab={showJuvenileLawTab} />
        </Suspense>
    );
}
