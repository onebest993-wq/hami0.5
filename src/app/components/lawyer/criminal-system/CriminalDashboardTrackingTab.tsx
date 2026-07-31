import React, { Suspense } from 'react';
import type { ProceduralNavTarget } from './proceduralContainersEngine';
import type { ProceduralItemLink } from './proceduralItemLink';
import { LazyRecursiveProceduralCanvas } from './criminalDashboardLazyRegistry';

type CriminalDashboardTrackingTabProps = {
    id: string;
    readOnly: boolean;
    onOpenLinkedRecord: (link: ProceduralItemLink) => void;
    navTarget: ProceduralNavTarget | null;
    onNavTargetHandled: () => void;
};

export function CriminalDashboardTrackingTab({
    id,
    readOnly,
    onOpenLinkedRecord,
    navTarget,
    onNavTargetHandled,
}: CriminalDashboardTrackingTabProps) {
    return (
        <div key="criminal-tab-tracking" className="flex flex-col w-full">
            <Suspense fallback={null}>
                <LazyRecursiveProceduralCanvas
                    key={`criminal-tab-tracking-canvas-${id}`}
                    caseId={id}
                    readOnly={readOnly}
                    onOpenLinkedRecord={onOpenLinkedRecord}
                    navTarget={navTarget}
                    onNavTargetHandled={onNavTargetHandled}
                />
            </Suspense>
        </div>
    );
}
