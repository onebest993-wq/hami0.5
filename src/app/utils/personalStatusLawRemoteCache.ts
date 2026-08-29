import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    PERSONAL_STATUS_LAW_CANONICAL_NAMES,
    resolvePersonalStatusLawCodeType,
    type PersonalStatusLawCodeType,
} from '@/app/constants/personalStatusLawCatalog';
import {
    extractArticleSortNumber,
    normalizeArabicDigits,
} from '@/app/utils/articleNumberRange';
import { loadBundledLawRows } from '@/app/utils/bundledIraqiLawLoader';
import {
    clearLegalReferenceCache,
    isLegalReferenceCacheStale,
    readLegalReferenceCache,
    writeLegalReferenceCache,
} from '@/app/utils/legalReferenceLocalCache';
import { canReachPublishedLawCatalog } from '@/app/services/settings/localOnlyGuard';
import { scheduleIdleWork } from '@/app/runtime/mobileRuntimePolicy';
import { subscribeLawsCatalogChanged } from '@/app/kernel/laws/lawCatalogSync';

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
const backgroundSyncInflight = new Set<PersonalStatusLawCodeType>();

function localCacheKey(tab: PersonalStatusLawCodeType): string {
    return `personal-status:${tab}`;
}

function hydrateFromDeviceStorage(tab: PersonalStatusLawCodeType): PersonalStatusLawArticle[] | null {
    const stored = readLegalReferenceCache<PersonalStatusLawArticle>(localCacheKey(tab));
    if (!stored || stored.length === 0) return null;
    cache.set(tab, stored);
    return stored;
}

async function fetchRemotePersonalStatusArticles(
    tab: PersonalStatusLawCodeType,
): Promise<PersonalStatusLawArticle[] | null> {
    if (!canReachPublishedLawCatalog()) return null;
    const lawName = PERSONAL_STATUS_LAW_CANONICAL_NAMES[tab];
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

    if (!data || data.ok === false) return null;
    const rows = Array.isArray(data.items) ? data.items : [];
    const mapped = mapRowsToArticles(rows, tab);
    return mapped.length > 0 ? mapped : null;
}

function scheduleBackgroundPersonalStatusSync(tab: PersonalStatusLawCodeType): void {
    if (!canReachPublishedLawCatalog()) return;
    if (backgroundSyncInflight.has(tab) || !isLegalReferenceCacheStale(localCacheKey(tab))) return;
    backgroundSyncInflight.add(tab);

    scheduleIdleWork(
        () => {
            void (async () => {
                try {
                    const remote = await fetchRemotePersonalStatusArticles(tab);
                    if (remote && remote.length > 0) {
                        cache.set(tab, remote);
                        writeLegalReferenceCache(localCacheKey(tab), remote);
                    }
                } catch {
                    /* keep local snapshot */
                } finally {
                    backgroundSyncInflight.delete(tab);
                }
            })();
        },
        { minDelayMs: 2_000, timeoutMs: 12_000 },
    );
}

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
    if (Array.isArray(rows) && rows.length > 0) return true;
    return hydrateFromDeviceStorage(tab) != null;
}

export function getCachedPersonalStatusLawArticles(
    tab: PersonalStatusLawCodeType,
): PersonalStatusLawArticle[] | null {
    const memory = cache.get(tab);
    if (memory && memory.length > 0) return memory;
    return hydrateFromDeviceStorage(tab);
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

        const fromDevice = hydrateFromDeviceStorage(tab);
        if (fromDevice && fromDevice.length > 0) {
            scheduleBackgroundPersonalStatusSync(tab);
            return fromDevice;
        }

        const bundled = mapRowsToArticles(await loadBundledLawRows(lawName), tab);
        if (bundled.length > 0) {
            cache.set(tab, bundled);
            writeLegalReferenceCache(localCacheKey(tab), bundled);
            scheduleBackgroundPersonalStatusSync(tab);
            return bundled;
        }

        try {
            const remote = await fetchRemotePersonalStatusArticles(tab);
            if (remote && remote.length > 0) {
                cache.set(tab, remote);
                writeLegalReferenceCache(localCacheKey(tab), remote);
                return remote;
            }
        } catch {
            /* fall through */
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
        backgroundSyncInflight.delete(tab);
        clearLegalReferenceCache(localCacheKey(tab));
    } else {
        cache.clear();
        inflight.clear();
        backgroundSyncInflight.clear();
        for (const codeType of Object.keys(PERSONAL_STATUS_LAW_CANONICAL_NAMES) as PersonalStatusLawCodeType[]) {
            clearLegalReferenceCache(localCacheKey(codeType));
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(PERSONAL_STATUS_LAW_CACHE_INVALIDATED_EVENT));
    }
}

if (typeof window !== 'undefined') {
    subscribeLawsCatalogChanged((lawName) => {
        const tab = resolvePersonalStatusLawCodeType(lawName);
        if (tab) invalidatePersonalStatusLawRemoteCache(tab);
    });
}
