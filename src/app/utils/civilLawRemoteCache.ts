import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    CIVIL_LAW_CANONICAL_NAMES,
    type CivilLawCodeType,
} from '@/app/constants/iraqiLawCatalog';
import {
    extractArticleSortNumber,
    normalizeArabicDigits,
} from '@/app/components/admin/lawStructure';
import { loadBundledLawRows } from '@/app/utils/bundledIraqiLawLoader';

export type CivilLawArticle = {
    id: string;
    codeType: CivilLawCodeType;
    articleNumber: string;
    text: string;
    lawName: string;
    sortNumber: number;
};

export const CIVIL_LAW_CACHE_INVALIDATED_EVENT = 'hami-civil-law-cache-invalidated';

type LawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
};

const cache = new Map<CivilLawCodeType, CivilLawArticle[]>();
const inflight = new Map<CivilLawCodeType, Promise<CivilLawArticle[]>>();

function mapRowsToArticles(rows: LawRow[], codeType: CivilLawCodeType): CivilLawArticle[] {
    const lawName = CIVIL_LAW_CANONICAL_NAMES[codeType];
    const dedup = new Map<string, CivilLawArticle>();
    for (const row of rows) {
        if (String(row?.law_name ?? '').trim() !== lawName) continue;
        const articleNumber = String(row?.article_number ?? '').trim() || '—';
        const text = String(row?.content ?? '').trim() || '—';
        const sortNumber = extractArticleSortNumber(articleNumber);
        const key = normalizeArabicDigits(articleNumber);
        const mapped: CivilLawArticle = {
            id: String(row?.id ?? `${lawName}-${articleNumber}`),
            codeType,
            articleNumber,
            text,
            lawName,
            sortNumber: sortNumber ?? Number.MAX_SAFE_INTEGER,
        };
        const prev = dedup.get(key);
        if (!prev || mapped.text.length > prev.text.length) {
            dedup.set(key, mapped);
        }
    }
    return Array.from(dedup.values()).sort((a, b) => a.sortNumber - b.sortNumber);
}

export function hasCivilLawArticlesCached(tab: CivilLawCodeType): boolean {
    const rows = cache.get(tab);
    return Array.isArray(rows) && rows.length > 0;
}

export function getCachedCivilLawArticles(tab: CivilLawCodeType): CivilLawArticle[] | null {
    return cache.get(tab) ?? null;
}

export function prefetchCivilLawArticles(tabs: readonly CivilLawCodeType[]): void {
    for (const tab of tabs) {
        if (cache.has(tab) || inflight.has(tab)) continue;
        void loadCivilLawArticles(tab).catch(() => {});
    }
}

export async function loadCivilLawArticles(tab: CivilLawCodeType): Promise<CivilLawArticle[]> {
    const cached = cache.get(tab);
    if (cached) return cached;

    const pending = inflight.get(tab);
    if (pending) return pending;

    const promise = (async () => {
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                error?: string;
                details?: string;
                items?: LawRow[];
            }>('/api/laws/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ law_name: CIVIL_LAW_CANONICAL_NAMES[tab] }),
            });

            if (data && data.ok !== false) {
                const rows = Array.isArray(data.items) ? data.items : [];
                const mapped = mapRowsToArticles(rows, tab);
                if (mapped.length > 0) {
                    cache.set(tab, mapped);
                    return mapped;
                }
            }
        } catch {
            /* fallback to bundled project files */
        }

        const bundled = mapRowsToArticles(
            await loadBundledLawRows(CIVIL_LAW_CANONICAL_NAMES[tab]),
            tab,
        );
        if (bundled.length > 0) {
            cache.set(tab, bundled);
            return bundled;
        }

        throw new Error('تعذر تحميل المواد القانونية من الخادم أو من ملفات المشروع.');
    })();

    inflight.set(tab, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(tab);
    }
}

export function invalidateCivilLawRemoteCache(tab?: CivilLawCodeType): void {
    if (tab) {
        cache.delete(tab);
        inflight.delete(tab);
    } else {
        cache.clear();
        inflight.clear();
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CIVIL_LAW_CACHE_INVALIDATED_EVENT));
    }
}
