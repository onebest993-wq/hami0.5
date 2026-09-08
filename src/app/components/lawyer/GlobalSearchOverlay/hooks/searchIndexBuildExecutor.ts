import type Fuse from 'fuse.js';
import type { BuildGlobalSearchIndexInput, GlobalSearchEntry } from '@/app/services/globalSearchIndex';
import { getCachedGlobalSearchIndex, resolveGlobalSearchIndex } from '@/app/services/globalSearchIndexRuntime';
import {
    getCachedGlobalSearchFuse,
    getOrCreateGlobalSearchFuse,
} from '@/app/services/globalSearchFuse';
import { isLitePerformanceActive } from '@/app/runtime/devicePerformanceTier';
import { getLawyerSettingsSnapshot } from '@/app/services/settings/settingsSnapshot';
import {
    planSearchIndexBuild,
    type SearchIndexBuildStep,
} from '@/app/components/lawyer/GlobalSearchOverlay/hooks/searchIndexBuildPlan';

export function resolveSearchIndexPriority(overlayOpen: boolean): 'interactive' | 'idle' {
    if (!overlayOpen) return 'idle';
    try {
        const s = getLawyerSettingsSnapshot();
        if (isLitePerformanceActive(s.performance.litePerformance)) return 'idle';
    } catch {
        /* ignore */
    }
    return 'interactive';
}

export async function resolveFuseForKey(
    cacheKey: string,
    input: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
    signal?: AbortSignal,
): Promise<Fuse<GlobalSearchEntry>> {
    const cachedFuse = getCachedGlobalSearchFuse(cacheKey);
    if (cachedFuse) return cachedFuse;

    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }

    const cachedIndex = getCachedGlobalSearchIndex(cacheKey);
    const index = cachedIndex ?? (await resolveGlobalSearchIndex(input, priority, signal));
    if (signal?.aborted) {
        throw new DOMException('Aborted', 'AbortError');
    }
    return getOrCreateGlobalSearchFuse(cacheKey, index);
}

type SearchIndexBuildSnapshot = {
    overlayOpen: boolean;
    cacheKey: string;
    activeKey: string | null;
    hasFuseInState: boolean;
};

type SearchIndexBuildCallbacks = {
    applyFuse: (fuse: Fuse<GlobalSearchEntry>, key: string) => void;
    clearFuse: () => void;
    setBuilding: (building: boolean) => void;
    isCancelled: () => boolean;
    resolveFuse: (
        key: string,
        input: BuildGlobalSearchIndexInput,
        priority: 'interactive' | 'idle',
        signal?: AbortSignal,
    ) => Promise<Fuse<GlobalSearchEntry>>;
    signal?: AbortSignal;
};

function isCancelledOrAborted(callbacks: SearchIndexBuildCallbacks): boolean {
    if (callbacks.signal?.aborted) return true;
    return callbacks.isCancelled();
}

async function executeSearchIndexStep(
    step: SearchIndexBuildStep,
    cacheKey: string,
    preparedInput: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
    callbacks: SearchIndexBuildCallbacks,
): Promise<boolean> {
    const { applyFuse, resolveFuse, signal } = callbacks;

    if (isCancelledOrAborted(callbacks)) return false;

    if (step.type === 'apply-cached') {
        const hit = getCachedGlobalSearchFuse(step.cacheKey);
        if (hit && !isCancelledOrAborted(callbacks)) {
            applyFuse(hit, step.cacheKey);
        }
        return true;
    }

    try {
        if (isCancelledOrAborted(callbacks)) return false;
        const instance = await resolveFuse(cacheKey, preparedInput, priority, signal);
        if (!isCancelledOrAborted(callbacks)) applyFuse(instance, cacheKey);
        return true;
    } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return false;
        return false;
    }
}

/** ينفّذ خطة بناء الفهرس — راجع searchIndexBuildPlan.ts للمخطّط البصري. */
export async function runSearchIndexBuild(
    snapshot: SearchIndexBuildSnapshot,
    preparedInput: BuildGlobalSearchIndexInput,
    priority: 'interactive' | 'idle',
    callbacks: SearchIndexBuildCallbacks,
): Promise<void> {
    const { clearFuse, setBuilding } = callbacks;
    if (isCancelledOrAborted(callbacks)) {
        setBuilding(false);
        return;
    }

    const plan = planSearchIndexBuild({
        overlayOpen: snapshot.overlayOpen,
        cacheKey: snapshot.cacheKey,
        activeKey: snapshot.activeKey,
        hasCachedIndex: Boolean(getCachedGlobalSearchFuse(snapshot.cacheKey)),
    });

    if (!plan.steps.length) {
        if (!isCancelledOrAborted(callbacks)) setBuilding(false);
        return;
    }

    if (!isCancelledOrAborted(callbacks)) setBuilding(plan.showsBuildingIndicator);

    for (const step of plan.steps) {
        if (isCancelledOrAborted(callbacks)) return;

        const ok = await executeSearchIndexStep(
            step,
            snapshot.cacheKey,
            preparedInput,
            priority,
            callbacks,
        );

        if (step.type === 'build' && !ok && !snapshot.hasFuseInState) {
            if (!isCancelledOrAborted(callbacks)) clearFuse();
        }
    }

    if (!isCancelledOrAborted(callbacks)) setBuilding(false);
}
