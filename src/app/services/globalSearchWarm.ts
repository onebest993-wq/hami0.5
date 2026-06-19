import { useCaseStore } from '@/app/stores/caseStore';
import {
    getCachedGlobalSearchExtras,
    loadGlobalSearchExtras,
} from '@/app/services/globalSearchLoad';
import {
    computeGlobalSearchIndexKey,
    prepareGlobalSearchIndexInput,
    type GlobalSearchIndexSource,
} from '@/app/services/globalSearchIndexPrepare';
import {
    getCachedGlobalSearchIndex,
    resolveGlobalSearchIndex,
} from '@/app/services/globalSearchIndexRuntime';
import { getOrCreateGlobalSearchFuse, hasCachedGlobalSearchFuse } from '@/app/services/globalSearchFuse';
import { resolveProfileLine } from '@/app/services/globalSearchProfileCache';

export type WarmGlobalSearchInput = Omit<GlobalSearchIndexSource, 'cases' | 'extras' | 'profileLine'>;

let warmSeq = 0;
let lastWarmKey: string | null = null;

function scheduleIdle(task: () => void, timeoutMs: number): void {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(task, { timeout: timeoutMs });
    } else {
        setTimeout(task, Math.min(timeoutMs, 2000));
    }
}

export function resetGlobalSearchWarmState(): void {
    warmSeq += 1;
    lastWarmKey = null;
}

export function isGlobalSearchPipelineWarm(input: WarmGlobalSearchInput, profileLine: string, extrasLoaded: boolean): boolean {
    if (!extrasLoaded || !input.userId) return false;
    const prepared = prepareGlobalSearchIndexInput({
        ...input,
        profileLine,
        cases: useCaseStore.getState().cases,
        extras: getCachedGlobalSearchExtras(input.userId) ?? undefined,
    });
    const key = computeGlobalSearchIndexKey(prepared);
    return Boolean(getCachedGlobalSearchIndex(key) && hasCachedGlobalSearchFuse(key));
}

/** تسخين كامل: extras → profile → index idle → Fuse — لأول فتح فوري للبحث. */
export function warmGlobalSearchPipeline(input: WarmGlobalSearchInput): void {
    if (typeof window === 'undefined') return;

    const seq = ++warmSeq;
    const uid = input.userId;
    const idleTimeout = import.meta.env.DEV ? 3_500 : 2_000;

    void (async () => {
        let extras = uid ? getCachedGlobalSearchExtras(uid) : null;
        if (!extras && uid) {
            extras = await loadGlobalSearchExtras(uid).catch(() => null);
        }
        if (seq !== warmSeq || !extras) return;

        const profileLine = await resolveProfileLine(uid);
        if (seq !== warmSeq) return;

        const prepared = prepareGlobalSearchIndexInput({
            ...input,
            profileLine,
            cases: useCaseStore.getState().cases,
            extras,
        });
        const key = computeGlobalSearchIndexKey(prepared);

        if (lastWarmKey === key && getCachedGlobalSearchIndex(key) && hasCachedGlobalSearchFuse(key)) {
            return;
        }

        scheduleIdle(() => {
            if (seq !== warmSeq) return;
            void resolveGlobalSearchIndex(prepared)
                .then((index) => getOrCreateGlobalSearchFuse(key, index))
                .then(() => {
                    if (seq === warmSeq) lastWarmKey = key;
                })
                .catch(() => {
                    /* تسخين اختياري */
                });
        }, idleTimeout);
    })();
}
