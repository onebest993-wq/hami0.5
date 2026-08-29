import React, { Suspense } from 'react';
import { LazyCriminalDashboardTrackingTab } from './criminalDashboardLazyRegistry';
import { CriminalDashboardLazySurfaceFallback } from './criminalDashboardRuntimeShells';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import type { CriminalDashboardDossierBodyProps } from './criminalDashboardDossierBodyProps';

/**
 * تبويب التتبع الإجرائي — مستخرَج من CriminalDashboardDossierBody.
 */
export function CriminalDossierTrackingPanel(props: CriminalDashboardDossierBodyProps) {
    const {
        id,
        isTimelineArchiveReadOnly,
        isDashboardReadOnly,
        isInvestigationMaterialReadOnly,
        openProceduralLinkedRecord,
        proceduralNavTarget,
        setProceduralNavTarget,
    } = props;

    return (
        <div
            key="criminal-tab-tracking"
            data-testid={CRIMINAL_DOSSIER_TEST_IDS.trackingPanel}
            className="flex flex-col w-full"
        >
            <Suspense fallback={<CriminalDashboardLazySurfaceFallback minHeightClass="min-h-[240px]" />}>
                <LazyCriminalDashboardTrackingTab
                    id={id}
                    readOnly={
                        isTimelineArchiveReadOnly ||
                        isDashboardReadOnly ||
                        isInvestigationMaterialReadOnly
                    }
                    onOpenLinkedRecord={openProceduralLinkedRecord}
                    navTarget={proceduralNavTarget}
                    onNavTargetHandled={() => setProceduralNavTarget(null)}
                />
            </Suspense>
        </div>
    );
}
