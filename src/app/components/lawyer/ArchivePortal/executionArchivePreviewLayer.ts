export const EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID = 'execution-archive-preview-layer';

export function hasExecutionArchivePreviewLayer(): boolean {
    if (typeof document === 'undefined') return false;
    return Boolean(
        document.querySelector(`[data-testid="${EXECUTION_ARCHIVE_PREVIEW_LAYER_TEST_ID}"]`),
    );
}

/** غطاء المعاينة — نفس هندسة النافذة الحية حتى أثناء Suspense. */
export const EXECUTION_ARCHIVE_PREVIEW_OVERLAY_CLASS =
    'fixed inset-0 z-[120] flex items-center justify-center bg-black/85 overscroll-none ps-[max(1rem,env(safe-area-inset-left))] pe-[max(1rem,env(safe-area-inset-right))] pt-[max(16px,env(safe-area-inset-top))] pb-[max(16px,env(safe-area-inset-bottom))] font-["Tajawal"]';

export const EXECUTION_ARCHIVE_PREVIEW_PANEL_CLASS =
    'bg-[#0B1120] border border-[#E6C673]/28 rounded-xl w-full max-w-lg max-h-[88vh] overflow-hidden flex flex-col';
