/**
 * مؤشر الانشغال في رأس البحث — يظهر فقط عند وجود نص واستعلام جارٍ.
 * التثري الخلفي للفهرس (isEnrichingIndex) لا يُظهر spinner في الحقل الفارغ.
 */
export function isSearchHeaderBusy(
    query: string,
    isSearching: boolean,
    isLoadingIndex: boolean,
): boolean {
    if (!query.trim()) return false;
    return isSearching || isLoadingIndex;
}
