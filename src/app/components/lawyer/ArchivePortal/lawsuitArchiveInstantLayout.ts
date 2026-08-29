/** منطقة تمرير موحّدة لمخزن الدعاوى — Instant shell + Chrome */
export const LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS =
    'flex-1 overflow-y-auto overscroll-y-contain touch-pan-y scrollbar-hide px-3.5 sm:px-4 lg:px-5 py-3 pb-[max(2rem,calc(5.25rem+env(safe-area-inset-bottom)))]';

const LAWSUIT_ARCHIVE_EMBEDDED_SCROLL_PADDING =
    'pb-[max(5rem,calc(4.25rem+env(safe-area-inset-bottom)))]';

export function lawsuitArchiveScrollRegionClass(embedded = false): string {
    return embedded
        ? `${LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS} ${LAWSUIT_ARCHIVE_EMBEDDED_SCROLL_PADDING}`
        : LAWSUIT_ARCHIVE_SCROLL_REGION_CLASS;
}
