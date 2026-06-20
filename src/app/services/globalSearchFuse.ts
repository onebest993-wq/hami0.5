// @ts-nocheck
import type Fuse from 'fuse.js';
import type { GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { PERFORMANCE } from '@/app/utils/constants';

let fuseModulePromise: Promise<typeof import('fuse.js')> | null = null;
const fuseCache = new Map<string, Fuse<GlobalSearchEntry>>();
const MAX_FUSE_CACHE = 4;

const FUSE_OPTIONS = {
    keys: [
        { name: 'title', weight: 2.5 },
        { name: 'subtitle', weight: 1.5 },
        { name: '_searchStr', weight: 1.2 },
        { name: 'snippet', weight: 0.8 },
    ],
    threshold: PERFORMANCE.FUSE_THRESHOLD,
    ignoreLocation: true,
    minMatchCharLength: 1,
} as const;

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

export async function createGlobalSearchFuse(index: GlobalSearchEntry[]): Promise<Fuse<GlobalSearchEntry>> {
    if (!fuseModulePromise) fuseModulePromise = import('fuse.js');
    const mod = await fuseModulePromise;
    return new mod.default(index, FUSE_OPTIONS);
}

export async function getOrCreateGlobalSearchFuse(
    cacheKey: string,
    index: GlobalSearchEntry[],
): Promise<Fuse<GlobalSearchEntry>> {
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
