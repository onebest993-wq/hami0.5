/**
 * مزامنة كتالوج القوانين بين المقر ولوحة المحامي.
 * المصدر: قاعدة iraqi_laws. الحدث تحسين لنفس الجلسة — إن لم تكن لوحة المحامي محمّلة يُجلب من الخادم عند الفتح.
 */
export const HAMI_LAWS_CATALOG_CHANGED_EVENT = 'hami-laws-catalog-changed';

export type LawsCatalogChangedDetail = {
    lawName: string;
};

export function dispatchLawsCatalogChanged(lawName: string): void {
    if (typeof window === 'undefined') return;
    const name = String(lawName ?? '').trim();
    if (!name) return;
    window.dispatchEvent(
        new CustomEvent<LawsCatalogChangedDetail>(HAMI_LAWS_CATALOG_CHANGED_EVENT, {
            detail: { lawName: name },
        }),
    );
}

export function subscribeLawsCatalogChanged(handler: (lawName: string) => void): () => void {
    if (typeof window === 'undefined') return () => undefined;
    const onEvent = (event: Event) => {
        const name = String((event as CustomEvent<LawsCatalogChangedDetail>).detail?.lawName ?? '').trim();
        if (name) handler(name);
    };
    window.addEventListener(HAMI_LAWS_CATALOG_CHANGED_EVENT, onEvent);
    return () => window.removeEventListener(HAMI_LAWS_CATALOG_CHANGED_EVENT, onEvent);
}
