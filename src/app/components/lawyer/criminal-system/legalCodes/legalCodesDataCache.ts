import { supabase } from '@/app/lib/supabase-client';
import {
    CODE_TYPE_TO_LAW_NAME,
    mapAndDedupLawRows,
    type LegalCodeArticle,
    type LegalCodeType,
} from './legalCodesConstants';

const cache = new Map<LegalCodeType, LegalCodeArticle[]>();
const inflight = new Map<LegalCodeType, Promise<LegalCodeArticle[]>>();

export function getCachedLegalCodeArticles(tab: LegalCodeType): LegalCodeArticle[] | null {
    return cache.get(tab) ?? null;
}

export function getAllCachedLegalCodeArticles(): LegalCodeArticle[] {
    return Array.from(cache.values()).flat();
}

export function getCachedLegalCodeTypes(): LegalCodeType[] {
    return Array.from(cache.keys());
}

export function mergeLegalCodeArticlesForTab(
    prev: LegalCodeArticle[],
    tab: LegalCodeType,
    next: LegalCodeArticle[],
): LegalCodeArticle[] {
    return [...prev.filter((a) => a.codeType !== tab), ...next];
}

export async function loadLegalCodeArticles(tab: LegalCodeType): Promise<LegalCodeArticle[]> {
    const cached = cache.get(tab);
    if (cached) return cached;

    const pending = inflight.get(tab);
    if (pending) return pending;

    const promise = (async () => {
        const { data, error } = await supabase.functions.invoke<{
            ok?: boolean;
            error?: string;
            details?: string;
            items?: Array<{
                id?: string;
                law_name?: string;
                article_number?: string;
                content?: string;
            }>;
        }>('list-laws', { body: { law_name: CODE_TYPE_TO_LAW_NAME[tab] } });

        if (error) {
            throw new Error(error.message || 'تعذر تحميل متون القوانين.');
        }
        if (!data || data.ok === false) {
            throw new Error((data?.error || data?.details || 'تعذر تحميل متون القوانين.').trim());
        }

        const rows = Array.isArray(data.items) ? data.items : [];
        const mapped = mapAndDedupLawRows(rows, tab);
        cache.set(tab, mapped);
        return mapped;
    })();

    inflight.set(tab, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(tab);
    }
}

export function prefetchLegalCodeArticles(tabs: readonly LegalCodeType[]): void {
    for (const tab of tabs) {
        if (cache.has(tab) || inflight.has(tab)) continue;
        void loadLegalCodeArticles(tab).catch(() => {
            /* prefetch — errors handled when tab is opened */
        });
    }
}

/** يُستدعى بعد حقن/حذف مواد من لوحة الأدمن لضمان ظهور التحديث في LegalCodesTab. */
export function invalidateLegalCodeArticlesCache(tab?: LegalCodeType): void {
    if (tab) {
        cache.delete(tab);
        inflight.delete(tab);
        return;
    }
    cache.clear();
    inflight.clear();
}
