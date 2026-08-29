import { loadArchivePortalModule, prefetchExecutionArchiveContent } from '@/app/runtime/hubArchiveLoader';

/**
 * تسخين ArchivePortal عبر hub loader — عنق زجاجة فتح المخازن.
 * (كان اسمه caseOverlaysBoot تاريخياً بعد حذف CaseOverlays/Host)
 */
export function prefetchArchivePortalShell(): void {
    if (typeof window === 'undefined') return;
    void loadArchivePortalModule().catch(() => undefined);
}

export function prefetchArchivePortalForWorkspace(archiveId: 'execution' | 'lawsuit'): void {
    if (typeof window === 'undefined') return;
    void loadArchivePortalModule().catch(() => undefined);
    if (archiveId === 'execution') {
        prefetchExecutionArchiveContent();
        void import(
            '@/app/components/lawyer/dashboard/overlay-sections/LawyerDashboardExecutionOverlayEntry'
        ).catch(() => undefined);
    } else {
        void import('@/app/runtime/lawsuitsOverlayEntryLoader')
            .then((m) => m.prefetchLawsuitsOverlayEntry())
            .catch(() => undefined);
    }
}
