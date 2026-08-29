/** معرّف قائمة النتائج (listbox) — يربط حقل الإدخال بالنتائج عبر aria-controls */
export const GLOBAL_SEARCH_LISTBOX_ID = 'global-search-listbox';

/** معرّف خيار نتيجة واحد بحسب ترتيبه المسطّح — لدلالات role="option" */
export function globalSearchOptionId(index: number): string {
    return `global-search-option-${index}`;
}
