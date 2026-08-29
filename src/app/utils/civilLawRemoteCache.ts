import { SecureAPIClient } from '@/app/services/SecureAPIClient';
import {
    CIVIL_LAW_CANONICAL_NAMES,
    resolveCivilLawCodeTypeFromName,
    type CivilLawCodeType,
} from '@/app/constants/iraqiLawCatalog';
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
const backgroundSyncInflight = new Set<CivilLawCodeType>();

function localCacheKey(tab: CivilLawCodeType): string {
    return `civil:${tab}`;
}

function hydrateFromDeviceStorage(tab: CivilLawCodeType): CivilLawArticle[] | null {
    const stored = readLegalReferenceCache<CivilLawArticle>(localCacheKey(tab));
    if (!stored || stored.length === 0) return null;
    cache.set(tab, stored);
    return stored;
}

async function fetchRemoteCivilLawArticles(tab: CivilLawCodeType): Promise<CivilLawArticle[] | null> {
    if (!canReachPublishedLawCatalog()) return null;
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

    if (!data || data.ok === false) return null;
    const rows = Array.isArray(data.items) ? data.items : [];
    const mapped = mapRowsToArticles(rows, tab);
    return mapped.length > 0 ? mapped : null;
}

function scheduleBackgroundCivilLawSync(tab: CivilLawCodeType): void {
    if (!canReachPublishedLawCatalog()) return;
    if (backgroundSyncInflight.has(tab) || !isLegalReferenceCacheStale(localCacheKey(tab))) return;
    backgroundSyncInflight.add(tab);

    scheduleIdleWork(
        () => {
            void (async () => {
                try {
                    const remote = await fetchRemoteCivilLawArticles(tab);
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
    if (Array.isArray(rows) && rows.length > 0) return true;
    return hydrateFromDeviceStorage(tab) != null;
}

export function getCachedCivilLawArticles(tab: CivilLawCodeType): CivilLawArticle[] | null {
    const memory = cache.get(tab);
    if (memory && memory.length > 0) return memory;
    return hydrateFromDeviceStorage(tab);
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
        const fromDevice = hydrateFromDeviceStorage(tab);
        if (fromDevice && fromDevice.length > 0) {
            scheduleBackgroundCivilLawSync(tab);
            return fromDevice;
        }

        const bundled = mapRowsToArticles(
            await loadBundledLawRows(CIVIL_LAW_CANONICAL_NAMES[tab]),
            tab,
        );
        if (bundled.length > 0) {
            cache.set(tab, bundled);
            writeLegalReferenceCache(localCacheKey(tab), bundled);
            scheduleBackgroundCivilLawSync(tab);
            return bundled;
        }

        try {
            const remote = await fetchRemoteCivilLawArticles(tab);
            if (remote && remote.length > 0) {
                cache.set(tab, remote);
                writeLegalReferenceCache(localCacheKey(tab), remote);
                return remote;
            }
        } catch {
            /* fall through */
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
        backgroundSyncInflight.delete(tab);
        clearLegalReferenceCache(localCacheKey(tab));
    } else {
        cache.clear();
        inflight.clear();
        backgroundSyncInflight.clear();
        for (const codeType of Object.keys(CIVIL_LAW_CANONICAL_NAMES) as CivilLawCodeType[]) {
            clearLegalReferenceCache(localCacheKey(codeType));
        }
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(CIVIL_LAW_CACHE_INVALIDATED_EVENT));
    }
}

if (typeof window !== 'undefined') {
    subscribeLawsCatalogChanged((lawName) => {
        const tab = resolveCivilLawCodeTypeFromName(lawName);
        if (tab) invalidateCivilLawRemoteCache(tab);
    });
}
