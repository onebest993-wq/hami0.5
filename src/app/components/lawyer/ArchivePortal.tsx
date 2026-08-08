import React, { lazy, Suspense } from 'react';
import type { ArchivePortalProps } from '@/app/types/common';
import { ArchivePortalLawsuitSurface } from './ArchivePortal/ArchivePortalLawsuitSurface';

const LazyArchivePortalExecutionSurface = lazy(() =>
    import('./ArchivePortal/ArchivePortalExecutionSurface').then((m) => ({
        default: m.ArchivePortalExecutionSurface,
    })),
);

export type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';

/**
 * بوابة الأرشيف — الدعاوى sync؛ التنفيذ lazy في chunk منفصل.
 */
export function ArchivePortal(props: ArchivePortalProps) {
    if (props.type === 'executions') {
        return (
            <Suspense fallback={null}>
                <LazyArchivePortalExecutionSurface {...props} />
            </Suspense>
        );
    }
    return <ArchivePortalLawsuitSurface {...props} />;
}
