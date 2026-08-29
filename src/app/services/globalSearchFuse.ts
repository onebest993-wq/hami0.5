import type Fuse from 'fuse.js';
import type { IFuseOptions } from 'fuse.js';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { PERFORMANCE } from '@/app/utils/constants';
import { normalizeArabicSearch } from '@/app/services/search/normalizeArabicSearch';

type FuseInstance = Fuse<GlobalSearchEntry>;

let fuseModulePromise: Promise<{ default: typeof Fuse }> | null = null;

const fuseCache = new Map<string, FuseInstance>();
const MAX_FUSE_CACHE = 4;
/** يُرفَع عند تغيّر خيارات المحرك لإبطال كاش قديم */
const FUSE_ENGINE_REV = 6;
let appliedEngineRev = 0;

function normalizeSearchField(value: unknown): string {
    if (typeof value !== 'string') return '';
    return normalizeArabicSearch(value).toLowerCase();
}

function readPath(obj: GlobalSearchEntry, path: string | string[]): unknown {
    const parts = Array.isArray(path) ? path : String(path).split('.');
    let cur: unknown = obj;
    for (const part of parts) {
        if (cur == null || typeof cur !== 'object') return undefined;
        cur = (cur as Record<string, unknown>)[part];
    }
    return cur;
}

const FUSE_OPTIONS: IFuseOptions<GlobalSearchEntry> = {
    keys: [
        { name: 'title', weight: 3 },
        { name: 'subtitle', weight: 1.6 },
        { name: '_searchStr', weight: 1.5 },
        { name: 'snippet', weight: 0.6 },
    ],
    threshold: Math.min(PERFORMANCE.FUSE_THRESHOLD, 0.24),
    ignoreLocation: true,
    minMatchCharLength: PERFORMANCE.FUSE_MIN_MATCH_LENGTH,
    includeScore: true,
    shouldSort: true,
    findAllMatches: false,
    ignoreFieldNorm: false,
    useExtendedSearch: false,
    getFn(obj, path) {
        const raw = readPath(obj, path);
        if (Array.isArray(raw)) {
            return raw.map(normalizeSearchField).filter(Boolean);
        }
        return normalizeSearchField(raw);
    },
};

export function prefetchFuseModule(): void {
    if (typeof window === 'undefined') return;
    if (!fuseModulePromise) fuseModulePromise = import('fuse.js');
}

function trimFuseCache(): void {
    while (fuseCache.size > MAX_FUSE_CACHE) {
        const oldest = fuseCache.keys().next().value;
        if (oldest === undefined) break;
        fuseCache.delete(oldest);
    }
}

function ensureEngineRev(): void {
    if (appliedEngineRev === FUSE_ENGINE_REV) return;
    fuseCache.clear();
    appliedEngineRev = FUSE_ENGINE_REV;
}

const fuseDocsRef = new WeakMap<FuseInstance, readonly GlobalSearchEntry[]>();

export function getGlobalSearchFuseDocs(fuse: FuseInstance): readonly GlobalSearchEntry[] | null {
    return fuseDocsRef.get(fuse) ?? null;
}

export async function createGlobalSearchFuse(index: GlobalSearchEntry[]): Promise<FuseInstance> {
    if (!fuseModulePromise) fuseModulePromise = import('fuse.js');
    const mod = await fuseModulePromise;
    const fuse = new mod.default<GlobalSearchEntry>(index, FUSE_OPTIONS);
    fuseDocsRef.set(fuse, index);
    return fuse;
}

export async function getOrCreateGlobalSearchFuse(
    cacheKey: string,
    index: GlobalSearchEntry[],
): Promise<FuseInstance> {
    ensureEngineRev();
    const hit = fuseCache.get(cacheKey);
    if (hit) return hit;
    const fuse = await createGlobalSearchFuse(index);
    fuseCache.set(cacheKey, fuse);
    trimFuseCache();
    return fuse;
}

export function invalidateGlobalSearchFuseCache(): void {
    fuseCache.clear();
}

export function hasCachedGlobalSearchFuse(key: string): boolean {
    return fuseCache.has(key);
}

export function hasAnyCachedGlobalSearchFuse(): boolean {
    return fuseCache.size > 0;
}

export function getCachedGlobalSearchFuse(key: string): FuseInstance | null {
    return fuseCache.get(key) ?? null;
}

function lifecyclePenalty(lifecycle: GlobalSearchEntry['lifecycle']): number {
    if (lifecycle === 'active') return 0;
    if (lifecycle === 'archived') return 0.045;
    return 0.09;
}

function significantTokens(normalizedQuery: string): string[] {
    return normalizedQuery
        .split(/\s+/u)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 || /\d/u.test(t));
}

function fieldContainsAll(hay: string, tokens: string[]): boolean {
    return tokens.every((t) => hay.includes(t));
}

/**
 * ترتيب وفلترة نتائج Fuse:
 * - كل رمز مهم يجب أن يظهر (دقة)
 * - تعزيز التطابق التام/البادئة في العنوان وأرقام الإضبارة
 * - تقليل أولوية السلة/الأرشيف قليلاً دون إخفائهما
 */
export function rankGlobalSearchHits(
    query: string,
    fuseHits: Array<{ item: GlobalSearchEntry; score?: number }>,
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const nq = normalizeArabicSearch(query).toLowerCase().trim();
    if (!nq) return [];
    const tokens = significantTokens(nq);
    if (!tokens.length && nq.length < PERFORMANCE.MIN_SEARCH_LENGTH) return [];

    const required = tokens.length ? tokens : [nq];
    const hasDigits = /\d/u.test(nq);

    const ranked = fuseHits
        .map((hit) => {
            const item = hit.item;
            const hay = item._searchStr || '';
            const titleN = normalizeArabicSearch(item.title).toLowerCase();
            const subtitleN = normalizeArabicSearch(item.subtitle || '').toLowerCase();
            const snippetN = normalizeArabicSearch(item.snippet || '').toLowerCase();
            const blob = `${hay} ${titleN} ${subtitleN} ${snippetN}`;

            if (!fieldContainsAll(blob, required)) return null;

            let rank = hit.score ?? 0.45;

            if (titleN === nq) rank -= 0.55;
            else if (titleN.startsWith(nq) || nq.startsWith(titleN)) rank -= 0.4;
            else if (titleN.includes(nq)) rank -= 0.32;
            else if (fieldContainsAll(titleN, required)) rank -= 0.2;
            else if (fieldContainsAll(subtitleN, required)) rank -= 0.1;
            else if (hasDigits && (titleN.includes(nq) || hay.includes(nq))) rank -= 0.28;

            // تطابق رقم قضية/ملف داخل العنوان أقوى من تطابق عائم في النص
            if (hasDigits && titleN.includes(nq.replace(/\s+/gu, ''))) rank -= 0.08;

            rank += lifecyclePenalty(item.lifecycle);
            return { item, rank };
        })
        .filter((x): x is { item: GlobalSearchEntry; rank: number } => Boolean(x))
        .sort((a, b) => a.rank - b.rank);

    const seen = new Set<string>();
    const out: GlobalSearchEntry[] = [];
    for (const row of ranked) {
        if (seen.has(row.item.id)) continue;
        seen.add(row.item.id);
        out.push(row.item);
        if (out.length >= limit) break;
    }
    return out;
}

/**
 * مسح تطابق نصّي مباشر — شبكة أمان عندما يفوّت Fuse تطابقاً واضحاً.
 */
export function exactScanGlobalSearchHits(
    query: string,
    entries: readonly GlobalSearchEntry[],
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const nq = normalizeArabicSearch(query).toLowerCase().trim();
    if (!nq) return [];
    const tokens = significantTokens(nq);
    const required = tokens.length ? tokens : [nq];
    if (!required.length) return [];

    const hits = entries
        .map((item) => {
            const hay = item._searchStr || '';
            const titleN = normalizeArabicSearch(item.title).toLowerCase();
            const subtitleN = normalizeArabicSearch(item.subtitle || '').toLowerCase();
            const blob = `${hay} ${titleN} ${subtitleN}`;
            if (!fieldContainsAll(blob, required)) return null;
            let rank = 0.35;
            if (titleN === nq) rank = 0;
            else if (titleN.includes(nq)) rank = 0.08;
            else if (fieldContainsAll(titleN, required)) rank = 0.15;
            rank += lifecyclePenalty(item.lifecycle);
            return { item, rank };
        })
        .filter((x): x is { item: GlobalSearchEntry; rank: number } => Boolean(x))
        .sort((a, b) => a.rank - b.rank);

    const out: GlobalSearchEntry[] = [];
    const seen = new Set<string>();
    for (const row of hits) {
        if (seen.has(row.item.id)) continue;
        seen.add(row.item.id);
        out.push(row.item);
        if (out.length >= limit) break;
    }
    return out;
}

/** يدمج نتائج Fuse مع مسح مباشر عند نقص النتائج الواضحة */
export function mergeSearchHitLists(
    primary: GlobalSearchEntry[],
    fallback: GlobalSearchEntry[],
    limit = PERFORMANCE.MAX_SEARCH_RESULTS,
): GlobalSearchEntry[] {
    const seen = new Set(primary.map((e) => e.id));
    const out = [...primary];
    for (const e of fallback) {
        if (seen.has(e.id)) continue;
        seen.add(e.id);
        out.push(e);
        if (out.length >= limit) break;
    }
    return out;
}
