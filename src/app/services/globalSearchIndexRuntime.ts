import {
    type BuildGlobalSearchIndexInput,
    type GlobalSearchEntry,
} from '@/app/services/globalSearchIndex';
import { computeGlobalSearchIndexKey } from '@/app/services/globalSearchIndexPrepare';
import {
    buildGlobalSearchIndexOffThread,
    prefetchGlobalSearchIndexWorker,
} from '@/app/services/search/globalSearchIndexWorkerClient';

const indexCache = new Map<string, GlobalSearchEntry[]>();
const inflightByKey = new Map<string, Promise<GlobalSearchEntry[]>>();
const MAX_INDEX_CACHE = 4;
let cacheEpoch = 0;

function trimIndexCache(): void {
    while (indexCache.size > MAX_INDEX_CACHE) {
        const oldest = indexCache.keys().next().value;
        if (oldest === undefined) break;
        indexCache.delete(oldest);
    }
}

function buildOnIdleThread(input: BuildGlobalSearchIndexInput): Promise<GlobalSearchEntry[]> {
    return new Promise((resolve, reject) => {
        const run = () => {
            void buildGlobalSearchIndexOffThread(input).then(resolve, reject);
        };
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(run, { timeout: 160 });
        } else {
            setTimeout(run, 0);
        }
    });
}

/** بناء الفهرس مع كاش — Worker عند الإمكان، idle للتسخين، تفاعلي عند فتح البحث. */
export async function resolveGlobalSearchIndex(
    input: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle' = 'idle',
): Promise<GlobalSearchEntry[]> {
    const key = computeGlobalSearchIndexKey(input);
    const hit = indexCache.get(key);
    if (hit) return hit;

    const existing = inflightByKey.get(key);
    if (existing) return existing;

    const epoch = cacheEpoch;
    let promise: Promise<GlobalSearchEntry[]>;
    promise = (
        priority === 'interactive'
            ? buildGlobalSearchIndexOffThread(input)
            : buildOnIdleThread(input)
    )
        .then((index) => {
            if (epoch === cacheEpoch) {
                indexCache.set(key, index);
                trimIndexCache();
            }
            return index;
        })
        .finally(() => {
            if (inflightByKey.get(key) === promise) inflightByKey.delete(key);
        });

    inflightByKey.set(key, promise);
    return promise;
}

export function invalidateGlobalSearchIndexCache(): void {
    cacheEpoch += 1;
    indexCache.clear();
    inflightByKey.clear();
}

export function getCachedGlobalSearchIndex(key: string): GlobalSearchEntry[] | null {
    return indexCache.get(key) ?? null;
}

export { prefetchGlobalSearchIndexWorker };
