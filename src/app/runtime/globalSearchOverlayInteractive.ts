/** يُبثّ عندما تكون طبقة البحث والحقل جاهزين للتفاعل (بعد layout + paint). */
export const GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT = 'hami:global-search-overlay-interactive';

export function dispatchGlobalSearchOverlayInteractive(): void {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent(GLOBAL_SEARCH_OVERLAY_INTERACTIVE_EVENT));
}
