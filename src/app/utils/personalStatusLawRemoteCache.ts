import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    PERSONAL_STATUS_LAW_CANONICAL_NAMES,
    type PersonalStatusLawCodeType,
} from '@/app/constants/personalStatusLawCatalog';
import {
    extractArticleSortNumber,
    normalizeArabicDigits,
} from '@/app/components/admin/lawStructure';
import { getBundledLawRows } from '@/app/utils/bundledIraqiLawLoader';

export type PersonalStatusLawArticle = {
    id: string;
    codeType: PersonalStatusLawCodeType;
    articleNumber: string;
    text: string;
    lawName: string;
    sortNumber: number;
};

export const PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT =
    'hami-personal-status-law-cache-invalidated';

type LawRow = {
    id?: string;
    law_name?: string;
    article_number?: string;
    content?: string;
};

const cache = new Map<PersonalStatusLawCodeType, PersonalStatusLawArticle[]>();
const inflight = new Map<PersonalStatusLawCodeType, Promise<PersonalStatusLawArticle[]>>();

function mapRowsToArticles(
    rows: LawRow[],
    codeType: PersonalStatusLawCodeType,
): PersonalStatusLawArticle[] {
    const lawName = PERSONAL_STATUS_LAW_CANONICAL_NAMES[codeType];
    const dedup = new Map<string, PersonalStatusLawArticle>();
    for (const row of rows) {
        if (String(row?.law_name ?? '').trim() !== lawName) continue;
        const articleNumber = String(row?.article_number ?? '').trim() || '—';
        const text = String(row?.content ?? '').trim() || '—';
        const sortNumber = extractArticleSortNumber(articleNumber);
        const key = normalizeArabicDigits(articleNumber);
        const mapped: PersonalStatusLawArticle = {
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

export function hasPersonalStatusLawArticlesCached(tab: PersonalStatusLawCodeType): boolean {
    const rows = cache.get(tab);
    return Array.isArray(rows) && rows.length > 0;
}

export function getCachedPersonalStatusLawArticles(
    tab: PersonalStatusLawCodeType,
): PersonalStatusLawArticle[] | null {
    return cache.get(tab) ?? null;
}

export function prefetchPersonalStatusLawArticles(
    tabs: readonly PersonalStatusLawCodeType[],
): void {
    for (const tab of tabs) {
        if (cache.has(tab) || inflight.has(tab)) continue;
        void loadPersonalStatusLawArticles(tab).catch(() => {});
    }
}

export async function loadPersonalStatusLawArticles(
    tab: PersonalStatusLawCodeType,
): Promise<PersonalStatusLawArticle[]> {
    const cached = cache.get(tab);
    if (cached && cached.length > 0) return cached;

    const pending = inflight.get(tab);
    if (pending) return pending;

    const promise = (async () => {
        const lawName = PERSONAL_STATUS_LAW_CANONICAL_NAMES[tab];
        try {
            const data = await SecureAPIClient.fetchSecure<{
                ok?: boolean;
                error?: string;
                details?: string;
                items?: LawRow[];
            }>('/api/laws/list', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ law_name: lawName }),
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

        const bundled = mapRowsToArticles(getBundledLawRows(lawName), tab);
        if (bundled.length > 0) {
            cache.set(tab, bundled);
            return bundled;
        }

        return [];
    })();

    inflight.set(tab, promise);
    try {
        return await promise;
    } finally {
        inflight.delete(tab);
    }
}

export function invalidatePersonalStatusLawRemoteCache(tab?: PersonalStatusLawCodeType): void {
    if (tab) {
        cache.delete(tab);
        inflight.delete(tab);
    } else {
        cache.clear();
        inflight.clear();
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT));
    }
}
