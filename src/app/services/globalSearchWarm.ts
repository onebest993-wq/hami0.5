import { useCaseStore } from '@/app/stores/caseStore';
import {
    bumpGlobalSearchWarmSeq,
    getGlobalSearchLastWarmKey,
    getGlobalSearchWarmSeq,
    resetGlobalSearchWarmState,
    setGlobalSearchLastWarmKey,
} from '@/app/services/globalSearchWarmState';
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

export { resetGlobalSearchWarmState };

function scheduleIdle(task: () => void, timeoutMs: number): void {
    if (typeof requestIdleCallback !== 'undefined') {
        requestIdleCallback(task, { timeout: timeoutMs });
    } else {
        setTimeout(task, Math.min(timeoutMs, 2000));
    }
}

function isWarmSeqStale(seq: number): boolean {
    return seq !== getGlobalSearchWarmSeq();
}

export function isGlobalSearchPipelineWarm(input: WarmGlobalSearchInput, profileLine: string, extrasLoaded: boolean): boolean {
    if (!input.userId) return false;
    const prepared = prepareGlobalSearchIndexInput({
        ...input,
        profileLine,
        cases: useCaseStore.getState().cases,
        extras: extrasLoaded ? getCachedGlobalSearchExtras(input.userId) ?? undefined : undefined,
    });
    const key = computeGlobalSearchIndexKey(prepared);
    return Boolean(getCachedGlobalSearchIndex(key) && hasCachedGlobalSearchFuse(key));
}

async function warmCoreIndex(
    input: WarmGlobalSearchInput,
    seq: number,
    priority: 'interactive' | 'idle',
): Promise<string | null> {
    const profileLine = input.userId ? await resolveProfileLine(input.userId).catch(() => '') : '';
    if (isWarmSeqStale(seq)) return null;

    const prepared = prepareGlobalSearchIndexInput({
        ...input,
        profileLine,
        cases: useCaseStore.getState().cases,
    });
    const key = computeGlobalSearchIndexKey(prepared);
    if (hasCachedGlobalSearchFuse(key)) return key;

    const index = await resolveGlobalSearchIndex(prepared, priority);
    if (isWarmSeqStale(seq)) return null;
    getOrCreateGlobalSearchFuse(key, index);
    return key;
}

async function warmFullIndex(
    input: WarmGlobalSearchInput,
    seq: number,
    priority: 'interactive' | 'idle',
): Promise<void> {
    const uid = input.userId;
    if (!uid) return;

    let extras = getCachedGlobalSearchExtras(uid);
    if (!extras) {
        extras = await loadGlobalSearchExtras(uid).catch(() => null);
    }
    if (isWarmSeqStale(seq) || !extras) return;

    const profileLine = await resolveProfileLine(uid).catch(() => '');
    if (isWarmSeqStale(seq)) return;

    const prepared = prepareGlobalSearchIndexInput({
        ...input,
        profileLine,
        cases: useCaseStore.getState().cases,
        extras,
    });
    const key = computeGlobalSearchIndexKey(prepared);

    if (
        getGlobalSearchLastWarmKey() === key &&
        getCachedGlobalSearchIndex(key) &&
        hasCachedGlobalSearchFuse(key)
    ) {
        return;
    }

    const index = await resolveGlobalSearchIndex(prepared, priority);
    if (isWarmSeqStale(seq)) return;
    getOrCreateGlobalSearchFuse(key, index);
    setGlobalSearchLastWarmKey(key);
}

/** تسخين: فهرس أساسي فوراً (دعاوى/ملاحظات) ثم extras → فهرس كامل. */
export function warmGlobalSearchPipeline(input: WarmGlobalSearchInput, immediate = false): void {
    if (typeof window === 'undefined') return;

    const seq = bumpGlobalSearchWarmSeq();
    const priority = immediate ? 'interactive' : 'idle';
    const idleTimeout = immediate ? 0 : import.meta.env.DEV ? 3_500 : 2_000;

    const run = () => {
        if (isWarmSeqStale(seq)) return;
        void warmCoreIndex(input, seq, priority)
            .catch(() => {
                /* تسخين اختياري */
            })
            .then(() => {
                if (isWarmSeqStale(seq)) return;
                return warmFullIndex(input, seq, priority);
            })
            .catch(() => {
                /* تسخين اختياري */
            });
    };

    if (immediate) {
        run();
    } else {
        scheduleIdle(run, idleTimeout);
    }
}
