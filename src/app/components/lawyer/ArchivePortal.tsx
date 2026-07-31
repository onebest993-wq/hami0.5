import type { ArchivePortalProps } from '@/app/types/common';
import { ArchivePortalLawsuitSurface } from './ArchivePortal/ArchivePortalLawsuitSurface';
import { ArchivePortalExecutionSurface } from './ArchivePortal/ArchivePortalExecutionSurface';

export type { LooseArchiveFile, StageWithCaseMeta, ComputedSmartStatus, ArchiveEnrichedRow } from './ArchivePortal/types';

/**
 * مسار التنفيذ sync داخل chunk الـ Portal — بلا Suspense داخلي بعد اعتماد الموديول.
 */
export function ArchivePortal(props: ArchivePortalProps) {
    if (props.type === 'executions') {
        return <ArchivePortalExecutionSurface {...props} />;
    }
    return <ArchivePortalLawsuitSurface {...props} />;
}
