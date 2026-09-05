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

async function createGlobalSearchFuse(index: GlobalSearchEntry[]): Promise<FuseInstance> {
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

export {
    exactScanGlobalSearchHits,
    mergeSearchHitLists,
    rankGlobalSearchHits,
} from '@/app/services/globalSearchFuseRank';

