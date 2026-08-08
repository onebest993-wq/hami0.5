import type { ArchivePortalProps } from '@/app/types/common';
import { ArchivePortalLawsuitSurface } from './ArchivePortalLawsuitSurface';

/** نقطة دخول الدعاوى فقط — بلا سطح التنفيذ في نفس الـ chunk */
export function ArchivePortal(props: ArchivePortalProps) {
    return <ArchivePortalLawsuitSurface {...props} />;
}
