import {
    buildGlobalSearchIndex,
    type BuildGlobalSearchIndexInput,
    type GlobalSearchEntry,
} from '@/app/services/globalSearchIndex';
import { computeGlobalSearchIndexKey } from '@/app/services/globalSearchIndexPrepare';

const indexCache = new Map<string, GlobalSearchEntry[]>();
const MAX_INDEX_CACHE = 4;

function trimIndexCache(): void {
    while (indexCache.size > MAX_INDEX_CACHE) {
        const oldest = indexCache.keys().next().value;
        if (oldest === undefined) break;
        indexCache.delete(oldest);
    }
}

function buildOnIdleThread(input: BuildGlobalSearchIndexInput): Promise<GlobalSearchEntry[]> {
    return new Promise((resolve) => {
        const run = () => resolve(buildGlobalSearchIndex(input));
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(run, { timeout: 160 });
        } else {
            setTimeout(run, 0);
        }
    });
}

/** بناء الفهرس مع كاش — يُؤجَّل عبر idle callback لتفادي حجب الواجهة. */
export async function resolveGlobalSearchIndex(input: BuildGlobalSearchIndexInput): Promise<GlobalSearchEntry[]> {
    const key = computeGlobalSearchIndexKey(input);
    const hit = indexCache.get(key);
    if (hit) return hit;

    const index = await buildOnIdleThread(input);
    indexCache.set(key, index);
    trimIndexCache();
    return index;
}

export function invalidateGlobalSearchIndexCache(): void {
    indexCache.clear();
}

export function getCachedGlobalSearchIndex(key: string): GlobalSearchEntry[] | null {
    return indexCache.get(key) ?? null;
}

export function prefetchGlobalSearchIndexWorker(): void {
    /* محجوز — Worker غير متاح بسبب expo-secure-store في شجرة الاستيراد */
}
